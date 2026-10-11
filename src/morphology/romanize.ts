/**
 * Kana and Hangul in Latin letters, for searching: "demo" finds でも, "hangeul"
 * finds 한글. Anything else is left as it is.
 *
 * Japanese is Hepburn, which is what most learners type; Korean is the Revised
 * Romanization of the letters as written, with no sound changes between
 * syllables, since a search is of the spelling. Neither is for showing to
 * anyone: looseRoman() folds the spellings people type differently together.
 */

/* ── Japanese ──────────────────────────────────────────────────── */

const KANA: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'i', ゑ: 'e', を: 'o', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o', ゔ: 'vu',
};

/** A kana and a small ya, yu, yo (or a small vowel, in loanwords): one syllable. */
const DIGRAPH: Record<string, string> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo', ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho', じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho', ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo', ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo', ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo', りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  しぇ: 'she', じぇ: 'je', ちぇ: 'che', てぃ: 'ti', でぃ: 'di', とぅ: 'tu', どぅ: 'du',
  ふぁ: 'fa', ふぃ: 'fi', ふぇ: 'fe', ふぉ: 'fo', うぃ: 'wi', うぇ: 'we', うぉ: 'wo',
  ゔぁ: 'va', ゔぃ: 'vi', ゔぇ: 've', ゔぉ: 'vo', つぁ: 'tsa', つぃ: 'tsi', つぇ: 'tse', つぉ: 'tso',
  いぇ: 'ye', くぁ: 'kwa', くぃ: 'kwi', くぇ: 'kwe', くぉ: 'kwo', ぐぁ: 'gwa',
};

const HIRAGANA_FROM_KATAKANA = /[ァ-ヶ]/g;

function japanese(text: string): string {
  // Katakana read as hiragana: the same sounds. ー stays, and lengthens what is before it.
  const s = text.replace(HIRAGANA_FROM_KATAKANA, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  let out = '';
  let doubled = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i] as string;
    if (c === 'っ') {
      doubled = true;
      continue;
    }
    let roman: string | undefined = DIGRAPH[s.slice(i, i + 2)];
    if (roman) i++;
    else if (c === 'ー') roman = out.match(/[aiueo]$/)?.[0] ?? '';
    else roman = KANA[c];
    if (roman === undefined) {
      out += c;
      doubled = false;
      continue;
    }
    if (doubled && /^[a-z]/.test(roman)) out += roman.startsWith('ch') ? 't' : (roman[0] as string);
    doubled = false;
    out += roman;
  }
  return out;
}

/* ── Korean ────────────────────────────────────────────────────── */

const INITIAL = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const VOWEL = [
  'a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i',
];
const FINAL = [
  '', 'k', 'k', 'ks', 'n', 'nj', 'nh', 't', 'l', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng',
  't', 't', 'k', 't', 'p', 't',
];

function hangul(text: string): string {
  return text.replace(/[가-힣]/g, (c) => {
    const n = c.charCodeAt(0) - 0xac00;
    return (INITIAL[Math.floor(n / 588)] ?? '') + (VOWEL[Math.floor((n % 588) / 28)] ?? '') + (FINAL[n % 28] ?? '');
  });
}

/* ── Together ──────────────────────────────────────────────────── */

const KANA_OR_HANGUL = /[ぁ-ゖァ-ヺー가-힣]/;

/** Whether `text` has any kana or Hangul, which is to say anything to romanize. */
export function hasRomanizable(text: string): boolean {
  return KANA_OR_HANGUL.test(text);
}

/** The kana and Hangul in `text` in Latin letters; the rest as it was. */
export function romanize(text: string): string {
  return hangul(japanese(text));
}

/**
 * Romanization with the differences people type folded away: Hepburn and
 * Nihon-shiki (shi and si, tsu and tu, fu and hu, ji and zi, sha and sya),
 * long vowels written or not (ou, oo, ō, o), and tch for tt (matcha, mattya). Both what is searched and what is typed go through it.
 */
export function looseRoman(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/sh(?=i)/g, 's').replace(/sh/g, 'sy')
    .replace(/ch(?=i)/g, 't').replace(/ch/g, 'ty')
    .replace(/ts(?=u)/g, 't')
    .replace(/j(?=i)/g, 'z').replace(/j/g, 'zy')
    .replace(/fu/g, 'hu')
    .replace(/o[ou]/g, 'o').replace(/uu/g, 'u')
    .replace(/['’-]/g, '');
}
