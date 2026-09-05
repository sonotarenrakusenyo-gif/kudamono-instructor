/**
 * 果物インストラクター試験対策 — 専門用語ふりがな辞書
 * 日常語・果物名・品種名・一般的な栄養素名は意図的に除外
 */
const FURIGANA_TERMS = [
  ['非クライマクテリック型', 'ひくらいまくてりっくがた'],
  ['クライマクテリック型', 'くらいまくてりっくがた'],
  ['タンパク質分解酵素', 'たんぱくしつぶんかいこうそ'],
  ['草本性食用植物', 'そうほんせいしょくようしょくぶつ'],
  ['木本性食用植物', 'もくほんせいしょくようしょくぶつ'],
  ['水溶性食物繊維', 'すいようせいしょくもつせんい'],
  ['非クライマクテリック', 'ひくらいまくてりっく'],
  ['クライマクテリック', 'くらいまくてりっく'],
  ['植物学的', 'しょくぶつがくてき'],
  ['園芸学的', 'えんげいがくてき'],
  ['果実的野菜', 'かじつてきやさい'],
  ['自家結実性', 'じかけつじつせい'],
  ['他家結実性', 'たかけつじつせい'],
  ['有袋栽培', 'ゆうたいさいばい'],
  ['転換期間', 'てんかんきかん'],
  ['隔年結果', 'かくねんけっか'],
  ['結実性', 'けつじつせい'],
  ['木本植物', 'もくほんしょくぶつ'],
  ['草本植物', 'そうほんしょくぶつ'],
  ['内果皮', 'ないかひ'],
  ['中果皮', 'ちゅうかひ'],
  ['外果皮', 'がいかひ'],
  ['仁果類', 'じんかるい'],
  ['核果類', 'かくかるい'],
  ['漿果類', 'しょうかるい'],
  ['柑橘類', 'かんきつるい'],
  ['殻果類', 'かっかるい'],
  ['木本性', 'もくほんせい'],
  ['草本性', 'そうほんせい'],
  ['亜熱帯', 'あねったい'],
  ['極早生', 'きょくそうせい'],
  ['雌雄異株', 'しゅういしゅ'],
  ['真果', 'しんか'],
  ['偽果', 'ぎか'],
  ['子房', 'しぼう'],
  ['花托', 'かたく'],
  ['花嚢', 'かのう'],
  ['萼', 'がく'],
  ['園芸学', 'えんげいがく'],
  ['追熟', 'ついじゅく'],
  ['褐変', 'かっぺん'],
  ['剪定', 'せんてい'],
  ['摘蕾', 'てきらい'],
  ['摘花', 'てっか'],
  ['摘果', 'てきか'],
  ['袋かけ', 'ふくろがけ'],
  ['受粉樹', 'じゅふんじゅ'],
  ['受粉', 'じゅふん'],
  ['結実', 'けつじつ'],
  ['樹勢', 'じゅせい'],
  ['樹冠', 'じゅかん'],
  ['萌芽', 'ほうが'],
  ['休眠期', 'きゅうみんき'],
  ['肥大', 'ひだい'],
  ['圃場', 'ほじょう'],
  ['石細胞', 'せきさいぼう'],
  ['水分活性', 'すいぶんかっせい'],
  ['果頂部', 'かちょうぶ'],
  ['花落ち', 'はなおち'],
  ['可食部', 'かしょくぶ'],
  ['完熟', 'かんじゅく'],
  ['緻密', 'ちみつ'],
  ['芳醇', 'ほうじゅん'],
  ['促成', 'そくせい'],
  ['露地', 'ろち'],
  ['油胞', 'ゆほう'],
  ['扁平', 'へんぺい'],
  ['交配', 'こうはい'],
  ['晩生', 'ばんせい'],
  ['早生', 'わせ'],
  ['中生', 'ちゅうせい'],
  ['内皮', 'ないひ'],
  ['外皮', 'がいひ'],
  ['柔肉', 'じゅうにく'],
  ['果粉', 'かふん'],
  ['比重', 'ひじゅう'],
  ['収れん', 'しゅうれん'],
  ['隔年', 'かくねん'],
  ['病害虫', 'びょうがいちゅう'],
  ['日持ち', 'ひもち'],
  ['ゲル化', 'ゲルか']
];

const FURIGANA_DICT = Object.fromEntries(FURIGANA_TERMS);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 「剪定（せんてい）」のように辞書と一致する括弧付き読み → ruby に統一（括弧は削除）
 */
function convertExplicitReadings(text) {
  return text.replace(
    /([一-龥々〆ヵヶ]+(?:[・ー／/][一-龥々〆ヵヶ]+)*)(?:（|\()([ぁ-んーゔ゙゚]+)(?:）|\))/g,
    (match, term, reading) => {
      if (FURIGANA_DICT[term] === reading) {
        return `<ruby>${term}<rt>${reading}</rt></ruby>`;
      }
      return match;
    }
  );
}

/**
 * 重なりを避けて最長一致でふりがなを付与（極早生 vs 早生 など）
 */
function applyDictionaryFurigana(text) {
  const matches = [];

  for (const [term, reading] of FURIGANA_TERMS) {
    const regex = new RegExp(`${escapeRegExp(term)}(?![（(])`, 'g');
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + term.length,
        term,
        reading,
        len: term.length
      });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.len - a.len);

  const selected = [];
  let lastEnd = 0;
  for (const item of matches) {
    if (item.start >= lastEnd) {
      selected.push(item);
      lastEnd = item.end;
    }
  }

  selected.sort((a, b) => b.start - a.start);

  let result = text;
  for (const item of selected) {
    result =
      result.slice(0, item.start) +
      `<ruby>${item.term}<rt>${item.reading}</rt></ruby>` +
      result.slice(item.end);
  }

  return result;
}

/**
 * テキスト内の専門用語に ruby ふりがなを付与
 */
function applyFurigana(text) {
  if (!text || typeof text !== 'string') return text;

  const segments = text.split(/(<ruby[\s\S]*?<\/ruby>|<[^>]+>)/g);

  return segments
    .map((segment) => {
      if (/^<ruby[\s\S]*<\/ruby>$/.test(segment) || /^<[^>]+>$/.test(segment)) {
        return segment;
      }

      const withExplicit = convertExplicitReadings(segment);
      const subparts = withExplicit.split(/(<ruby[\s\S]*?<\/ruby>)/g);

      return subparts
        .map((part) => (/^<ruby[\s\S]*<\/ruby>$/.test(part) ? part : applyDictionaryFurigana(part)))
        .join('');
    })
    .join('');
}
