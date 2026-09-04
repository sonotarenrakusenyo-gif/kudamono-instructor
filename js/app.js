/**
 * 果物インストラクター 認定試験対策テキスト — アプリケーション
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'fruit-instructor-bookmarks';
  let bookmarks = loadBookmarks();
  let currentView = { type: 'home' };

  // ===== DOM refs =====
  const pageContainer = document.getElementById('page-container');
  const tocNav = document.getElementById('toc-nav');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const mainContent = document.querySelector('.main-content');
  const reviewCount = document.getElementById('review-count');

  // ===== Bookmarks =====
  function loadBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveBookmarks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    updateReviewCount();
    renderToc();
  }

  function toggleBookmark(sectionId) {
    const idx = bookmarks.indexOf(sectionId);
    if (idx >= 0) bookmarks.splice(idx, 1);
    else bookmarks.push(sectionId);
    saveBookmarks();
  }

  function isBookmarked(sectionId) {
    return bookmarks.includes(sectionId);
  }

  function updateReviewCount() {
    reviewCount.textContent = bookmarks.length;
  }

  function findSection(sectionId) {
    for (const ch of TEXTBOOK.chapters) {
      const sec = ch.sections.find(s => s.id === sectionId);
      if (sec) return { chapter: ch, section: sec };
    }
    return null;
  }

  // ===== Navigation =====
  function navigate(view) {
    currentView = view;
    window.scrollTo(0, 0);

    if (view.type === 'home') renderHome();
    else if (view.type === 'chapter') renderChapter(view.chapterId);
    else if (view.type === 'section') renderSection(view.chapterId, view.sectionId);
    else if (view.type === 'review') renderReview();

    updateTocActive();
    closeSidebarMobile();
  }

  function navigateToHash() {
    const hash = location.hash.slice(1);
    if (!hash) { navigate({ type: 'home' }); return; }

    if (hash === 'review') { navigate({ type: 'review' }); return; }

    const parts = hash.split('/');
    if (parts.length === 2) {
      navigate({ type: 'section', chapterId: parts[0], sectionId: parts[1] });
    } else {
      navigate({ type: 'chapter', chapterId: parts[0] });
    }
  }

  function setHash(view) {
    let hash = '';
    if (view.type === 'chapter') hash = view.chapterId;
    else if (view.type === 'section') hash = `${view.chapterId}/${view.sectionId}`;
    else if (view.type === 'review') hash = 'review';
    if (location.hash !== `#${hash}`) location.hash = hash;
  }

  // ===== Render: Home =====
  function renderHome() {
    setHash({ type: 'home' });
    const totalSections = TEXTBOOK.chapters.reduce((n, ch) => n + ch.sections.length, 0);

    pageContainer.innerHTML = `
      <div class="home-hero">
        <h1>${TEXTBOOK.title}</h1>
        <p>${TEXTBOOK.subtitle}</p>
        <div class="home-stats">
          <div class="home-stat">
            <span class="home-stat-num">${TEXTBOOK.chapters.length}</span>
            <span class="home-stat-label">章</span>
          </div>
          <div class="home-stat">
            <span class="home-stat-num">${totalSections}</span>
            <span class="home-stat-label">項目</span>
          </div>
          <div class="home-stat">
            <span class="home-stat-num">${bookmarks.length}</span>
            <span class="home-stat-label">復習リスト</span>
          </div>
        </div>
      </div>
      <div class="chapter-grid">
        ${TEXTBOOK.chapters.map(ch => `
          <div class="chapter-card" data-chapter="${ch.id}">
            <div class="chapter-card-icon">${ch.icon}</div>
            <div class="chapter-card-num">${ch.badge ? `<span class="chapter-badge">${ch.badge}</span> ` : ''}第${ch.number}章</div>
            <div class="chapter-card-title">${fgPlain(ch.title)}</div>
            <div class="chapter-card-meta">${ch.sections.length}項目</div>
          </div>
        `).join('')}
      </div>
    `;

    pageContainer.querySelectorAll('.chapter-card').forEach(card => {
      card.addEventListener('click', () => {
        navigate({ type: 'chapter', chapterId: card.dataset.chapter });
      });
    });
  }

  // ===== Render: Chapter =====
  function renderChapter(chapterId) {
    const ch = TEXTBOOK.chapters.find(c => c.id === chapterId);
    if (!ch) return renderHome();
    setHash({ type: 'chapter', chapterId });

    pageContainer.innerHTML = `
      <div class="chapter-header">
        <span class="chapter-header-badge">${ch.icon} 第${ch.number}章${ch.badge ? ` <span class="chapter-badge-inline">${ch.badge}</span>` : ''}</span>
        <h1>${fgPlain(ch.title)}</h1>
      </div>
      <div class="chapter-toc">
        <h3>📋 この章の目次</h3>
        <ul class="chapter-toc-list">
          ${ch.sections.map((sec, i) => `
            <li>
              <a href="#" data-section="${sec.id}">
                <span>${ch.number}-${i + 1}.</span> ${fgPlain(sec.title)}
                ${sec.tags ? sec.tags.map(t => `<span class="tag tag-${tagClass(t)}">${t}</span>`).join('') : ''}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
      ${ch.sections.map((sec, i) => renderSectionBlock(ch, sec, i)).join('')}
      <div class="section-nav">
        <a class="nav-btn" href="#" data-nav="home">🏠 トップに戻る</a>
        ${getAdjacentChapter(chapterId, -1)}
        ${getAdjacentChapter(chapterId, 1)}
      </div>
    `;

    bindSectionEvents(ch);
    bindNavEvents();
  }

  // ===== Render: Single Section =====
  function renderSection(chapterId, sectionId) {
    const ch = TEXTBOOK.chapters.find(c => c.id === chapterId);
    if (!ch) return renderHome();
    const secIdx = ch.sections.findIndex(s => s.id === sectionId);
    if (secIdx < 0) return renderChapter(chapterId);
    const sec = ch.sections[secIdx];
    setHash({ type: 'section', chapterId, sectionId });

    pageContainer.innerHTML = `
      <div class="chapter-header">
        <span class="chapter-header-badge">${ch.icon} 第${ch.number}章${ch.badge ? ` <span class="chapter-badge-inline">${ch.badge}</span>` : ''}</span>
        <h1>${fgPlain(ch.title)}</h1>
      </div>
      ${renderSectionBlock(ch, sec, secIdx)}
      <div class="section-nav">
        <a class="nav-btn" href="#" data-nav="chapter" data-chapter="${chapterId}">📖 第${ch.number}章に戻る</a>
        ${secIdx > 0 ? `<a class="nav-btn" href="#" data-nav="section" data-chapter="${chapterId}" data-section="${ch.sections[secIdx - 1].id}">← 前の項目</a>` : ''}
        ${secIdx < ch.sections.length - 1 ? `<a class="nav-btn" href="#" data-nav="section" data-chapter="${chapterId}" data-section="${ch.sections[secIdx + 1].id}">次の項目 →</a>` : ''}
      </div>
    `;

    bindSectionEvents(ch);
    bindNavEvents();
  }

  function renderSectionBlock(ch, sec, idx) {
    const bookmarked = isBookmarked(sec.id);
    return `
      <article class="section-block" id="${sec.id}">
        <div class="section-header">
          <div class="section-title-wrap">
            <div class="section-number">${ch.number}-${idx + 1}</div>
            <h2 class="section-title">${fgPlain(sec.title)}</h2>
            ${sec.tags ? `<div class="section-tags">${sec.tags.map(t => `<span class="tag tag-${tagClass(t)}">${t}</span>`).join('')}</div>` : ''}
          </div>
          <button class="bookmark-btn ${bookmarked ? 'active' : ''}" data-bookmark="${sec.id}" aria-label="復習リストに追加">
            ${bookmarked ? '⭐ 復習中' : '☆ 復習リストに追加'}
          </button>
        </div>
        <div class="section-content">
          ${sec.blocks.map(renderBlock).join('')}
        </div>
        <div class="section-nav">
          <a class="nav-btn" href="#" data-nav="chapter" data-chapter="${ch.id}">📖 第${ch.number}章に戻る</a>
          ${idx > 0 ? `<a class="nav-btn" href="#" data-nav="section" data-chapter="${ch.id}" data-section="${ch.sections[idx - 1].id}">← 前へ</a>` : ''}
          ${idx < ch.sections.length - 1 ? `<a class="nav-btn" href="#" data-nav="section" data-chapter="${ch.id}" data-section="${ch.sections[idx + 1].id}">次へ →</a>` : ''}
        </div>
      </article>
    `;
  }

  // ===== Render: Review =====
  function renderReview() {
    setHash({ type: 'review' });

    if (bookmarks.length === 0) {
      pageContainer.innerHTML = `
        <div class="review-page">
          <h1>⭐ 復習リスト</h1>
          <div class="review-empty">
            <div class="review-empty-icon">📭</div>
            <p>復習リストは空です。</p>
            <p>各項目の「☆ 復習リストに追加」ボタンを押すと、<br>ここに追加されます。</p>
            <br>
            <a class="nav-btn" href="#" data-nav="home">🏠 トップに戻る</a>
          </div>
        </div>
      `;
      bindNavEvents();
      return;
    }

    const items = bookmarks.map(id => {
      const found = findSection(id);
      if (!found) return '';
      return `
        <li class="review-item" data-chapter="${found.chapter.id}" data-section="${id}">
          <div class="review-item-info">
            <div class="review-item-chapter">第${found.chapter.number}章 ${fgPlain(found.chapter.title)}</div>
            <div class="review-item-title">${fgPlain(found.section.title)}</div>
          </div>
          <button class="review-remove" data-remove="${id}" aria-label="復習リストから削除">✕</button>
        </li>
      `;
    }).join('');

    pageContainer.innerHTML = `
      <div class="review-page">
        <h1>⭐ 復習リスト（${bookmarks.length}件）</h1>
        <p style="color:var(--color-text-muted);margin-bottom:1.5rem;font-size:0.9rem;">復習したい項目をタップして内容を確認しましょう。</p>
        <ul class="review-list">${items}</ul>
        <div class="section-nav" style="margin-top:2rem;border-top:none;padding-top:0;">
          <a class="nav-btn" href="#" data-nav="home">🏠 トップに戻る</a>
        </div>
      </div>
    `;

    pageContainer.querySelectorAll('.review-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.review-remove')) return;
        navigate({ type: 'section', chapterId: item.dataset.chapter, sectionId: item.dataset.section });
      });
    });

    pageContainer.querySelectorAll('.review-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmark(btn.dataset.remove);
        renderReview();
      });
    });

    bindNavEvents();
  }

  // ===== Block Renderers =====
  function renderBlock(block) {
    switch (block.type) {
      case 'lead': return `<p class="block-lead">${fg(block.text)}</p>`;
      case 'paragraph': return `<p class="block-paragraph">${fg(block.text)}</p>`;
      case 'callout':
        return `<div class="callout callout-${block.variant}"><div class="callout-title">${fgPlain(block.title)}</div><div class="callout-text">${fg(block.text)}</div></div>`;
      case 'compare':
        return `<h3 class="block-title">${fgPlain(block.title)}</h3><div class="compare-grid">${block.items.map(item => `
          <div class="compare-card ${item.color}">
            <div class="compare-label">${fgPlain(item.label)}</div>
            <div class="compare-sublabel">${fgPlain(item.sublabel)}</div>
            <ul>${item.points.map(p => `<li>${fg(p)}</li>`).join('')}</ul>
          </div>`).join('')}</div>`;
      case 'table':
        return `<h3 class="block-title">${fgPlain(block.title)}</h3>
          <div class="data-table-wrap"><table class="data-table ${block.highlight ? 'highlight' : ''}">
            <thead><tr>${block.headers.map(h => `<th>${fgPlain(h)}</th>`).join('')}</tr></thead>
            <tbody>${block.rows.map(row => `<tr>${row.map(cell => `<td>${fg(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div>`;
      case 'chart': {
        const max = Math.max(...block.items.map(i => i.value));
        return `<h3 class="block-title">${fgPlain(block.title)}</h3><div class="bar-chart">
          ${block.items.map(item => `
            <div class="bar-item">
              <span class="bar-label">${fgPlain(item.label)}</span>
              <div class="bar-track"><div class="bar-fill" style="width:${(item.value / max * 100).toFixed(1)}%"></div></div>
              <span class="bar-value">${item.value}${block.unit || ''}</span>
              ${item.note ? `<span class="bar-note">${fg(item.note)}</span>` : ''}
            </div>`).join('')}
        </div>`;
      }
      case 'cards':
        return `${block.title ? `<h3 class="block-title">${fgPlain(block.title)}</h3>` : ''}<div class="info-cards">${block.items.map(card => `
          <div class="info-card ${card.color}">
            <div class="info-card-icon">${card.icon}</div>
            <div class="info-card-title">${fgPlain(card.title)}</div>
            <ul class="info-card-effects">${card.effects.map(e => `<li>${fg(e)}</li>`).join('')}</ul>
            ${card.sources ? `<div class="info-card-sources">${fg(card.sources)}</div>` : ''}
          </div>`).join('')}</div>`;
      case 'timeline':
        return `<div class="timeline">${block.items.map((item, i) => `
          <div class="timeline-item">
            <div class="timeline-dot ${item.color}">${i + 1}</div>
            <div class="timeline-content">
              <div class="timeline-era">${fgPlain(item.era)}</div>
              <div class="timeline-text">${fg(item.content)}</div>
            </div>
          </div>`).join('')}</div>`;
      case 'calendar':
        return `<div class="season-calendar">
          <span class="season-badge ${block.season}">${block.season}</span>
          ${block.months.map(m => `
            <div class="month-block">
              <div class="month-label">${m.month}月</div>
              <div class="month-fruits">${m.fruits.map(f => `<span class="fruit-tag">${fgPlain(f)}</span>`).join('')}</div>
            </div>`).join('')}
        </div>`;
      case 'ranking':
        return `<div class="ranking-grid">${block.items.map(item => `
          <div class="ranking-card">
            <div class="ranking-fruit">🍎 ${fgPlain(item.fruit)}</div>
            <div class="ranking-ranks">
              ${item.rank1 ? `<span class="rank-badge gold">🥇 ${fg(item.rank1)}</span>` : ''}
              ${item.rank2 ? `<span class="rank-badge">🥈 ${fg(item.rank2)}</span>` : ''}
              ${item.rank3 ? `<span class="rank-badge">🥉 ${fg(item.rank3)}</span>` : ''}
            </div>
            ${item.varieties ? `<div class="ranking-varieties">品種：${fg(item.varieties)}</div>` : ''}
          </div>`).join('')}</div>`;
      case 'diagram':
        return `<h3 class="block-title">${fgPlain(block.title)}</h3>${fg(block.svg)}`;
      case 'list':
        const tag = block.ordered ? 'ol' : 'ul';
        return `<h3 class="block-title">${fgPlain(block.title)}</h3><${tag} class="block-list">${block.items.map(i => `<li>${fg(i)}</li>`).join('')}</${tag}>`;
      default: return '';
    }
  }

  // ===== TOC =====
  function renderToc() {
    tocNav.innerHTML = `
      <button class="toc-chapter-btn" data-nav="home" style="margin-bottom:0.5rem;">🏠 トップページ</button>
      ${TEXTBOOK.chapters.map(ch => `
        <div class="toc-chapter">
          <button class="toc-chapter-btn" data-chapter="${ch.id}">
            ${ch.icon} 第${ch.number}章${ch.badge ? ' ★' : ''}
          </button>
          <ul class="toc-sections">
            ${ch.sections.map(sec => `
              <li>
                <a class="toc-section-link ${isBookmarked(sec.id) ? 'bookmarked' : ''}" data-chapter="${ch.id}" data-section="${sec.id}">
                  ${fgPlain(sec.title.length > 22 ? sec.title.slice(0, 22) + '…' : sec.title)}
                  <span class="review-star">⭐</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('')}
    `;

    tocNav.querySelector('[data-nav="home"]').addEventListener('click', () => navigate({ type: 'home' }));

    tocNav.querySelectorAll('.toc-chapter-btn[data-chapter]').forEach(btn => {
      btn.addEventListener('click', () => navigate({ type: 'chapter', chapterId: btn.dataset.chapter }));
    });

    tocNav.querySelectorAll('.toc-section-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate({ type: 'section', chapterId: link.dataset.chapter, sectionId: link.dataset.section });
      });
    });
  }

  function updateTocActive() {
    tocNav.querySelectorAll('.toc-chapter-btn, .toc-section-link').forEach(el => el.classList.remove('active'));

    if (currentView.type === 'home') {
      tocNav.querySelector('[data-nav="home"]')?.classList.add('active');
    } else if (currentView.type === 'chapter') {
      tocNav.querySelector(`.toc-chapter-btn[data-chapter="${currentView.chapterId}"]`)?.classList.add('active');
    } else if (currentView.type === 'section') {
      tocNav.querySelector(`.toc-chapter-btn[data-chapter="${currentView.chapterId}"]`)?.classList.add('active');
      tocNav.querySelector(`.toc-section-link[data-section="${currentView.sectionId}"]`)?.classList.add('active');
    }
  }

  // ===== Event Binding =====
  function bindSectionEvents(ch) {
    pageContainer.querySelectorAll('[data-bookmark]').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleBookmark(btn.dataset.bookmark);
        const active = isBookmarked(btn.dataset.bookmark);
        btn.classList.toggle('active', active);
        btn.innerHTML = active ? '⭐ 復習中' : '☆ 復習リストに追加';
      });
    });

    pageContainer.querySelectorAll('.chapter-toc-list a[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const el = document.getElementById(link.dataset.section);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function bindNavEvents() {
    pageContainer.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const nav = el.dataset.nav;
        if (nav === 'home') navigate({ type: 'home' });
        else if (nav === 'chapter') navigate({ type: 'chapter', chapterId: el.dataset.chapter });
        else if (nav === 'section') navigate({ type: 'section', chapterId: el.dataset.chapter, sectionId: el.dataset.section });
      });
    });
  }

  function getAdjacentChapter(chapterId, dir) {
    const idx = TEXTBOOK.chapters.findIndex(c => c.id === chapterId);
    const adj = TEXTBOOK.chapters[idx + dir];
    if (!adj) return '';
    const label = dir < 0 ? `← 第${adj.number}章` : `第${adj.number}章 →`;
    return `<a class="nav-btn" href="#" data-nav="chapter" data-chapter="${adj.id}">${label}</a>`;
  }

  // ===== Sidebar mobile =====
  function openSidebarMobile() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('open');
  }

  function closeSidebarMobile() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('open');
  }

  document.getElementById('menu-toggle').addEventListener('click', openSidebarMobile);
  document.getElementById('sidebar-close').addEventListener('click', closeSidebarMobile);
  sidebarOverlay.addEventListener('click', closeSidebarMobile);
  document.getElementById('review-btn').addEventListener('click', () => navigate({ type: 'review' }));

  // ===== Helpers =====
  function tagClass(tag) {
    if (tag === '必須') return 'required';
    if (tag === '重要') return 'important';
    if (tag === '試験頻出') return 'exam';
    return 'important';
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /** プレーンテキスト：エスケープ後に専門用語ふりがな */
  function fgPlain(str) {
    if (str == null) return '';
    return applyFurigana(esc(String(str)));
  }

  /** HTML を含むテキスト：ふりがなのみ付与 */
  function fg(str) {
    if (str == null) return '';
    return applyFurigana(String(str));
  }

  // ===== Init =====
  window.addEventListener('hashchange', navigateToHash);
  renderToc();
  updateReviewCount();
  navigateToHash();
})();
