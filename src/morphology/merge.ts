/**
 * Pass 2 — fuse morphemes into the units a learner thinks in.
 *
 * Lindera is morphologically correct and pedagogically useless on its own:
 * 来た comes back as 来 + た, 勉強している as 勉強 + し + て + いる. Nobody wants
 * a card for た.
 *
 * Each merged token keeps both halves — the surface for display, the head's
 * dictionary form for matching against Anki. That split is the whole point:
 * without it, 来た never matches the 来る card you already have.
 */

export interface Morpheme {
  surface: string;
  /** IPADIC 活用形 — 命令形, 未然ウ接続, 仮定形 … */
  conjForm?: string;
  /** IPADIC 品詞 — 動詞, 名詞, 助動詞, … */
  pos?: string;
  /** IPADIC 品詞細分類1 — サ変接続, 非自立, 接尾, … */
  pos1?: string;
  /** IPADIC 基本形 */
  lemma?: string;
  /** IPADIC 読み, katakana */
  reading?: string;
}

/** One way to look a token up, with what the analyser knows about it. */
export interface LookupKey {
  key: string;
  /** Reading of `key`, in katakana — tells 私【わたし】 from 私【あたし】. */
  reading?: string;
  /** IPADIC "品詞,細分類1" — tells この the determiner from この the numeral. */
  pos?: string;
}

/** One dictionary word a written form stands for. */
export interface LexiconEntry {
  /** The dictionary's headword. */
  word: string;
  /** Its reading, in hiragana. */
  reading: string;
  /** Its first sense's JMdict part of speech codes. */
  pos?: string[];
}

/**
 * What the dictionary says a written form reads as, most likely first — or
 * undefined when it has no such word. Supplied by whoever holds the
 * dictionary; merging never waits on it, and without it merely knows less.
 */
export type Lexicon = (form: string) => LexiconEntry[] | undefined;

export interface MergedToken {
  surface: string;
  lemma?: string;
  reading?: string;
  pos?: string;
  /** The morphemes this was built from, for the inflection trace. */
  parts: string[];
  /** What the endings do, in order — "conditional", "past", "polite". */
  inflections: string[];
  content: boolean;
  /** Reading of the lemma, when the analysis pins it down. */
  lemmaReading?: string;
  /** Dictionary keys to try, best first. */
  lookup: LookupKey[];
}

/**
 * What each ending contributes.
 *
 * The merge pass already decides which morphemes are endings; naming them is
 * nearly free from there, and it is the difference between showing a learner
 * 行け + ば and telling them it is a conditional. Keyed by dictionary form,
 * since that is what the analyser reports regardless of how it is written.
 */
const GRAMMAR: Record<string, string> = {
  // tense and politeness
  た: 'past', だ: 'past', ます: 'polite', です: 'polite',
  // negation
  ない: 'negative', ぬ: 'negative', ん: 'negative', ず: 'negative',
  まい: 'negative intent',
  // conditionals
  ば: 'conditional', たら: 'conditional', なら: 'conditional',
  と: 'whenever',
  // voice
  れる: 'passive or potential', られる: 'passive or potential',
  せる: 'causative', させる: 'causative',
  // desire and inclination
  たい: 'want to', たがる: 'seems to want to',
  // evidentiality
  そう: 'seems', よう: 'seems', みたい: 'seems like',
  らしい: 'apparently', べき: 'ought to', はず: 'supposed to',
  つもり: 'intends to', かもしれない: 'might',
  // connective
  て: 'te-form', で: 'te-form', たり: 'listing', だり: 'listing',
  ながら: 'while', つつ: 'while', ので: 'because', のに: 'even though',
  ため: 'in order to', ように: 'so that',
  // helper verbs
  いる: 'ongoing', おる: 'ongoing', ある: 'resulting state',
  しまう: 'completely, or regrettably',
  おく: 'in advance', みる: 'try doing',
  いく: 'going forward', くる: 'coming to be',
  もらう: 'receive the favour', くれる: 'someone does for me',
  あげる: 'do for someone', やる: 'do for someone',
  // spoken contractions, which subtitles are full of
  てる: 'ongoing', でる: 'ongoing', とく: 'in advance', どく: 'in advance',
  ちゃう: 'completely, or regrettably', じゃう: 'completely, or regrettably',
  ちまう: 'completely, or regrettably', じまう: 'completely, or regrettably',
  く: 'going forward',
  なきゃ: 'must', なくちゃ: 'must', ちゃ: 'must not',
};

/**
 * Endings whose surface says more than their dictionary form.
 *
 * たら and なら are the 仮定形 of た and だ, so by dictionary form they read
 * as "past"; なきゃ is a form of ない, which reads as "negative". Each is
 * really a conditional or an obligation, and the surface is what says so.
 */
const SURFACE_GRAMMAR: Record<string, string> = {
  たら: 'conditional', だら: 'conditional', なら: 'conditional',
  なきゃ: 'must', なくちゃ: 'must',
};

/**
 * Forms carried by the conjugation itself rather than by a separate morpheme.
 *
 * An imperative or a volitional has no ending to look up — 行け and 行こう are
 * inflections of 行く with nothing appended — so they are invisible to a table
 * keyed on morphemes. IPADIC records them in 活用形, which is why that column
 * is now read.
 */
function fromConjugation(m: Morpheme): string | null {
  const f = m.conjForm ?? '';
  if (f.startsWith('命令')) return 'imperative';
  if (f === '未然ウ接続') return 'volitional';
  if (f === '仮定形') return null;   // the ば that follows already says so
  return null;
}

function grammarOf(morphemes: Morpheme[]): string[] {
  const out: string[] = [];

  for (const [i, m] of morphemes.entries()) {
    // The head is the word itself, not an ending — but its own conjugation
    // still carries meaning when nothing follows it.
    if (i > 0) {
      let label = SURFACE_GRAMMAR[m.surface] ?? GRAMMAR[m.lemma ?? m.surface] ?? GRAMMAR[m.surface];
      // 食べなくちゃ: なく + ちゃ is an obligation, not a negative and a ban.
      if ((m.surface === 'ちゃ' || m.surface === 'じゃ') && morphemes[i - 1]?.surface === 'なく') {
        const neg = out.lastIndexOf('negative');
        if (neg >= 0) out.splice(neg, 1);
        label = 'must';
      }
      if (label && !out.includes(label)) out.push(label);
    }
    const conj = fromConjugation(m);
    if (conj && !out.includes(conj)) out.push(conj);
  }

  return out;
}

const AUX_VERBS = new Set(['いる', 'ある', 'おく', 'しまう', 'みる', 'いく', 'くる', 'もらう', 'くれる', 'あげる']);

/**
 * Spoken contractions of て + helper. IPADIC emits them as 非自立 verbs with
 * no て in front — 食べ + てる, 行っ + ちゃう, 見 + とく — so the helper-verb
 * rule, which waits for て, never saw them.
 */
const CONTRACTIONS = new Set(['てる', 'でる', 'ちゃう', 'じゃう', 'ちまう', 'じまう', 'とく', 'どく']);

/**
 * Conjunctive particles that are part of a verb's conjugation, not separate
 * words: て/で (te-form), ば (conditional), たり/だり (representative listing),
 * ちゃ/じゃ (contracted ては/では).
 *
 * The rest of 接続助詞 join *clauses* rather than inflect a verb — が, から,
 * ので, のに, けれど, し. Attaching those would swallow the remainder of the
 * sentence into one token, so the list is a whitelist rather than a category.
 */
const CONJUGATIONAL_PARTICLES = new Set(['て', 'で', 'ば', 'たり', 'だり', 'ちゃ', 'じゃ']);
const FUNCTION_POS = new Set(['助詞', '助動詞', '記号', 'フィラー']);

/*
 * ござる — the polite "to be" of ございます — is a word, though IPADIC files it
 * as an auxiliary after an interjection or a copula: ありがとう + ござい + まし
 * + た, こちら + で + ござい + ます. As an auxiliary it was grammar: never
 * underlined or looked up, and ありがとうございました lost the entry JMdict
 * has for it. So it joins the interjection, or the で, into one expression,
 * and on its own it is a verb.
 */
const isGozaru = (m: Morpheme): boolean => m.lemma === 'ござる';
const isCopulaDe = (m: Morpheme | undefined): boolean => m?.surface === 'で' && m.lemma === 'だ';
/** Function words — but not ござる, whatever IPADIC calls it. */
const functional = (m: Morpheme | undefined): boolean =>
  Boolean(m && FUNCTION_POS.has(m.pos ?? '') && !isGozaru(m));

/**
 * Is this group inflecting a verb or adjective?
 *
 * The head alone is not enough: 勉強 heads a noun group until する attaches to
 * it, after which the whole thing conjugates like a verb.
 */
function isVerbal(group: Morpheme[]): boolean {
  const head = group[0];
  if (head?.pos === '動詞' || head?.pos === '形容詞') return true;
  // ござる conjugates — ございました — whatever IPADIC calls it.
  return group.some((m) => m.pos === '動詞' || isGozaru(m));
}

/** Does `cur` continue the word this `group` started? */
function attaches(group: Morpheme[], cur: Morpheme): boolean {
  const prev = group[group.length - 1]!;

  // ありがとう + ござい, で + ござい: the set phrases ございます makes.
  if (isGozaru(cur) && (prev.pos === '感動詞' || isCopulaDe(prev))) return true;

  /*
   * Auxiliaries inflect verbs and adjectives — 食べ+まし+た, 来+た, 高+かっ+た —
   * and there the auxiliary is part of the conjugation.
   *
   * After a noun it is not. ワールド + です is a noun and a copula: two words a
   * learner looks up separately, and です is not an inflection of ワールド.
   */
  if (cur.pos === '助動詞') return isVerbal(group);

  /*
   * 勉強 + する / 勉強 + し — and only する. Any verb used to qualify, so when
   * speech dropped a particle, 勉強(を)頑張って became one word looked up as
   * 勉強する, and 頑張る could not be reached at all.
   */
  if (cur.pos === '動詞' && cur.lemma === 'する' && prev.pos === '名詞' && prev.pos1 === 'サ変接続') return true;

  // し+て+いる, うまくいけ+ば, 行っ+たり — endings, not words.
  if (
    cur.pos === '助詞' &&
    cur.pos1 === '接続助詞' &&
    CONJUGATIONAL_PARTICLES.has(cur.surface) &&
    isVerbal(group)
  ) {
    return true;
  }

  /*
   * 補助動詞 — helper verbs — only ever follow the て-form: 持って+いく,
   * して+しまう. Without that requirement いく attached to anything before it,
   * so うまく + いけ merged and the group took the adjective's dictionary form:
   * hovering うまくいけば produced 上手い.
   */
  if (
    cur.pos === '動詞' &&
    (cur.pos1 === '非自立' || AUX_VERBS.has(cur.lemma ?? '')) &&
    (prev.surface === 'て' || prev.surface === 'で')
  ) {
    return true;
  }

  // 知っ + てる, し + ちゃっ + た: the contraction already contains its て.
  if (cur.pos === '動詞' && cur.pos1 === '非自立' && CONTRACTIONS.has(cur.lemma ?? '') && isVerbal(group)) {
    return true;
  }

  // 二 + 十 + 歳: IPADIC gives each figure of a numeral its own morpheme.
  if (cur.pos1 === '数' && prev.pos1 === '数') return true;

  // 先生 + 方, 私 + たち, 3 + 人
  if (cur.pos1 === '接尾') return true;

  // お + 金, ご + 飯, 第 + 3 — but never a prefix swallowing a particle.
  if (prev.pos === '接頭詞' && !FUNCTION_POS.has(cur.pos ?? '')) return true;

  return false;
}

/**
 * Corrections to the analyser's own choices, applied before merging.
 *
 * 行っ is both 行く and 行う in IPADIC's eyes, and it picks 行う often enough
 * — 昨日行ったよ — to read "went" as "carried out", with ruby おこなった.
 * In speech it is 行く far more often than not.
 */
function normalise(m: Morpheme): Morpheme {
  if (m.lemma === '行う' && m.surface.startsWith('行っ')) {
    return { ...m, lemma: '行く', reading: `イ${m.surface.slice(1).replace(/っ/g, 'ッ')}` };
  }
  return m;
}

function groups(morphemes: Morpheme[]): Morpheme[][] {
  const out: Morpheme[][] = [];
  let group: Morpheme[] = [];
  for (const m of morphemes.map(normalise)) {
    // Never let a trailing particle start absorbing things — except the で
    // of でございます, which ござる joins, and a group ござる is part of.
    const opens = !functional(group[0]) || group.some(isGozaru) || (group.length === 1 && isCopulaDe(group[0]) && isGozaru(m));
    if (group.length && opens && attaches(group, m)) {
      group.push(m);
    } else {
      if (group.length) out.push(group);
      group = [m];
    }
  }
  if (group.length) out.push(group);
  return out;
}

/* ── Readings and lemmas ─────────────────────────────────────────── */

const KANA_ONLY = /^[ぁ-ゖァ-ヺー・ゝゞヽヾ]*$/;
const toKatakana = (s: string): string =>
  s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

const posOf = (m: Morpheme): string | undefined => (m.pos ? (m.pos1 ? `${m.pos},${m.pos1}` : m.pos) : undefined);

/**
 * The reading of a morpheme's dictionary form, from the reading of its
 * inflected one: 行っ read イッ is 行く read イク, 開い read ヒライ is 開く
 * read ヒラク. What lets a lookup of 開く pick ひらく rather than あく.
 */
function lemmaReadingOf(m: Morpheme): string | undefined {
  const { surface, lemma, reading } = m;
  if (!lemma || !reading) return undefined;
  if (lemma === surface) return reading;
  if (KANA_ONLY.test(lemma)) return toKatakana(lemma);
  if (lemma === '来る') return 'クル';   // 来 reads キ or コ; the verb is クル
  let n = 0;
  while (n < surface.length && n < lemma.length && surface[n] === lemma[n]) n++;
  const tail = surface.slice(n);
  const lemmaTail = lemma.slice(n);
  if (!n || !KANA_ONLY.test(tail) || !KANA_ONLY.test(lemmaTail)) return undefined;
  const kanaTail = toKatakana(tail);
  if (!reading.endsWith(kanaTail)) return undefined;
  return reading.slice(0, reading.length - kanaTail.length) + toKatakana(lemmaTail);
}

const FULL_WIDTH = (s: string): string =>
  s.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));

const KANJI_DIGITS = '〇一二三四五六七八九';

/** 2 → 二, 10 → 十, 24 → 二十四. Only up to 99, where JMdict has compounds. */
function kanjiNumerals(s: string): string | null {
  let ok = true;
  const out = s.replace(/[0-9０-９]+/g, (run) => {
    const n = Number(run.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)));
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      ok = false;
      return run;
    }
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return (tens ? `${tens > 1 ? KANJI_DIGITS[tens] : ''}十` : '') + (ones ? KANJI_DIGITS[ones] : '');
  });
  return ok && out !== s ? out : null;
}

/** Spellings to try for a run of morphemes, and whether each was converted. */
function variants(raw: string, numeric: boolean): Array<[string, boolean]> {
  const out: Array<[string, boolean]> = [[raw, false]];
  if (numeric) {
    // JMdict files some compounds under full-width figures: １０分 is its own
    // entry, "ten minutes", where 十分 is also "enough".
    const wide = FULL_WIDTH(raw);
    if (wide !== raw) out.push([wide, true]);
    const kanji = kanjiNumerals(raw);
    if (kanji) out.push([kanji, true]);
  }
  return out.filter(([form]) => !KANA_ONLY.test(form));
}

/** Where a word could lie inside a noun group, longest first. */
function spans(group: Morpheme[]): Array<{ i: number; j: number; numeric: boolean }> {
  const core = Math.max(0, group.findIndex((m) => m.pos !== '接頭詞'));
  const numeric = group.some((m) => m.pos1 === '数');
  const out: Array<{ i: number; j: number; numeric: boolean }> = [];
  for (let j = group.length - 1; j >= core; j--) {
    for (const i of core > 0 ? [0, core] : [0]) {
      if (j > i) out.push({ i, j, numeric });
    }
  }
  return out;
}

const join = (group: Morpheme[], i: number, j: number): string =>
  group.slice(i, j + 1).map((m) => m.surface).join('');

/** Counter-like senses: 十分 as "ten minutes" is a noun; as "enough" it is not. */
const NOUNISH = new Set(['n', 'num', 'ctr', 'n-adv', 'n-t', 'n-suf', 'suf']);

interface Found {
  i: number;
  j: number;
  form: string;
  /** Present when the form reads exactly one way. */
  entry?: LexiconEntry;
}

/**
 * The longest run of the group the dictionary knows as one word.
 *
 * A converted spelling only counts when it is unambiguous: 2人 is certainly
 * 二人【ふたり】, but 1日 is いちにち or ついたち, and a guess there would put
 * the wrong reading over it. A form found as written but with several readings
 * still names the word; it just does not get a reading.
 *
 * `seen` collects the ambiguous spellings passed over on the way, which are
 * still worth looking up: 一日 says more about 1日 than 日 alone does.
 */
function resolve(group: Morpheme[], lexicon: Lexicon | undefined, seen: string[]): Found | null {
  if (!lexicon) return null;
  for (const { i, j, numeric } of spans(group)) {
    for (const [form, converted] of variants(join(group, i, j), numeric)) {
      const hits = lexicon(form)?.filter((e) => !numeric || !e.pos || e.pos.some((p) => NOUNISH.has(p)));
      if (!hits?.length) continue;
      if (hits.length === 1) return { i, j, form, entry: hits[0] };
      if (!converted) return { i, j, form };
      seen.push(form);
    }
  }
  return null;
}

/** Katakana reading of the whole group, given one for the run i..j. */
function around(group: Morpheme[], i: number, j: number, inner: string): string | undefined {
  const outside = [...group.slice(0, i), ...group.slice(j + 1)];
  if (outside.some((m) => !m.reading)) return undefined;
  return (
    group.slice(0, i).map((m) => m.reading).join('') +
    inner +
    group.slice(j + 1).map((m) => m.reading).join('')
  );
}

function lookupKeys(...keys: Array<[string | undefined, string | undefined, string | undefined]>): LookupKey[] {
  const out: LookupKey[] = [];
  for (const [key, reading, pos] of keys) {
    if (!key || out.some((k) => k.key === key)) continue;
    out.push({ key, ...(reading ? { reading } : {}), ...(pos ? { pos } : {}) });
  }
  return out;
}

/*
 * Potential verbs. IPADIC lists 保てる, 会える, 帰れる as verbs of their own,
 * each its own dictionary form, but JMdict files nearly all of them under the
 * godan verb they come from: it has 保つ and no 保てる. So the potential is
 * undone — the e-row kana before る goes back to the u-row — and the
 * dictionary has to agree that what comes out is a godan verb of that row.
 * れる also takes the spoken potential that drops ら, 見れる and 来れる, back
 * to an ichidan or くる verb.
 */
const POTENTIAL: Record<string, { kana: string; reading: string; classes: string[] }> = {
  え: { kana: 'う', reading: 'ウ', classes: ['v5u', 'v5u-s'] },
  け: { kana: 'く', reading: 'ク', classes: ['v5k', 'v5k-s'] },
  げ: { kana: 'ぐ', reading: 'グ', classes: ['v5g'] },
  せ: { kana: 'す', reading: 'ス', classes: ['v5s'] },
  て: { kana: 'つ', reading: 'ツ', classes: ['v5t'] },
  ね: { kana: 'ぬ', reading: 'ヌ', classes: ['v5n'] },
  べ: { kana: 'ぶ', reading: 'ブ', classes: ['v5b'] },
  め: { kana: 'む', reading: 'ム', classes: ['v5m'] },
  れ: { kana: 'る', reading: 'ル', classes: ['v5r', 'v5r-i', 'v1', 'vk'] },
};

interface Potential {
  word: string;
  reading?: string;
  /** JMdict conjugation classes the word must have for this to be its potential. */
  classes: string[];
}

/** The verb a potential-shaped verb would be the potential of: 保てる → 保つ. */
function potentialOf(m: Morpheme, lemmaReading: string | undefined): Potential | undefined {
  const lemma = m.lemma;
  if (m.pos !== '動詞' || m.pos1 !== '自立' || !lemma || lemma.length < 3 || !lemma.endsWith('る')) return undefined;
  const row = POTENTIAL[lemma[lemma.length - 2]!];
  if (!row) return undefined;
  const word = lemma.slice(0, -2) + row.kana;
  const reading = word === '来る' ? 'クル'
    : lemmaReading?.endsWith('ル') ? lemmaReading.slice(0, -2) + row.reading : undefined;
  return { word, reading, classes: row.classes };
}

/** The dictionary has `p.word` as a verb of the right class, and nothing under the potential itself. */
function confirmed(p: Potential, lemma: string, lexicon: Lexicon | undefined): boolean {
  if (!lexicon || lexicon(lemma)?.length) return false;
  return Boolean(lexicon(p.word)?.some((e) => e.pos?.some((code) => p.classes.includes(code))));
}

/*
 * Kanji nouns the analyser split but the dictionary has whole. IPADIC knows
 * 灯篭 and not 灯籠, so 灯籠 comes back as 灯 + 籠, read あかり and かご;
 * JMdict has it, read とうろう. A run of kanji nouns with a lone kanji among
 * them is asked about whole, and joined where the dictionary has the word —
 * with the dictionary's reading, since the parts' readings are what went
 * wrong. Names and numbers stay out: 田中 + 家 is not a compound to look for.
 */
const KANJI_ONLY = /^[\u4E00-\u9FFF\u3400-\u4DBF々〆ヶ]+$/u;
const COMPOUND_POS1 = new Set(['一般', '接尾', 'サ変接続', '形容動詞語幹', '副詞可能']);
/** Characters, at most: 石灯籠, 灯籠流し are as long as it is worth reaching. */
const COMPOUND_MAX = 4;

function compoundable(m: Morpheme): boolean {
  return m.pos === '名詞' && COMPOUND_POS1.has(m.pos1 ?? '') && KANJI_ONLY.test(m.surface);
}

/** The run i..j, written out, if it could be a compound split apart: else undefined. */
function compoundAt(morphemes: Morpheme[], i: number, j: number): string | undefined {
  const run = morphemes.slice(i, j + 1);
  if (run.length < 2 || !run.every(compoundable) || !run.some((m) => m.surface.length === 1)) return undefined;
  const form = run.map((m) => m.surface).join('');
  return form.length <= COMPOUND_MAX ? form : undefined;
}

/** Every run worth asking the dictionary about whole. */
function compoundQueries(morphemes: Morpheme[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < morphemes.length; i++) {
    for (let j = i + 1; j < morphemes.length && j < i + COMPOUND_MAX; j++) {
      const form = compoundAt(morphemes, i, j);
      if (form) out.push(form);
    }
  }
  return out;
}

/** The morphemes, with each compound the dictionary has put back together — the longest it has. */
function joinCompounds(morphemes: Morpheme[], lexicon: Lexicon | undefined): Morpheme[] {
  if (!lexicon) return morphemes;
  const out: Morpheme[] = [];
  for (let i = 0; i < morphemes.length;) {
    let joined: Morpheme | undefined;
    let next = i + 1;
    for (let j = Math.min(morphemes.length - 1, i + COMPOUND_MAX - 1); j > i && !joined; j--) {
      const form = compoundAt(morphemes, i, j);
      const hits = form ? lexicon(form) : undefined;
      if (!form || !hits?.length) continue;
      // One reading, or none: 一日 is いちにち or ついたち, and guessing is worse than not saying.
      const readings = new Set(hits.map((h) => h.reading));
      joined = {
        surface: form, lemma: form, pos: '名詞', pos1: '一般',
        reading: readings.size === 1 ? toKatakana(hits[0]!.reading) : undefined,
      };
      next = j + 1;
    }
    out.push(joined ?? morphemes[i]!);
    i = next;
  }
  return out;
}

/**
 * A verb stem made a noun by a noun suffix: 食べ + 放題, 使い + 方. Not the
 * voice endings — させる, られる are suffixes too in IPADIC, but verbs.
 */
function nounSuffixed(group: Morpheme[]): boolean {
  const last = group[group.length - 1];
  return group.length > 1 && last?.pos === '名詞' && last.pos1 === '接尾';
}

/**
 * Written forms merging would like the dictionary's view of: noun groups
 * built from a prefix, a number, or suffixes, whose word — and whose reading
 * — the morphemes alone cannot give. Ask for these, then merge with the
 * answers.
 */
export function lexiconQueries(morphemes: Morpheme[]): string[] {
  const out = new Set<string>(compoundQueries(morphemes));
  for (const group of groups(morphemes)) {
    // 保てる: whether the dictionary has it, and whether it has 保つ.
    const potential = group[0] ? potentialOf(group[0], undefined) : undefined;
    if (potential && group[0]?.lemma) out.add(group[0].lemma).add(potential.word);
    if (group.length < 2) continue;
    if (isVerbal(group)) {
      // 食べ + 放題, 使い + 方: a verb stem made into a noun by a suffix.
      if (nounSuffixed(group)) {
        for (const [form] of variants(join(group, 0, group.length - 1), false)) out.add(form);
      }
      continue;
    }
    for (const { i, j, numeric } of spans(group)) {
      for (const [form] of variants(join(group, i, j), numeric)) out.add(form);
    }
  }
  return [...out];
}

function merge(group: Morpheme[], lexicon: Lexicon | undefined): MergedToken {
  const head = group[0]!;
  // A prefix is never the word: お金 is not a kind of お.
  const at = Math.max(0, group.findIndex((m) => m.pos !== '接頭詞'));
  const lead = group[at]!;
  const surface = group.map((m) => m.surface).join('');
  const reading = group.every((m) => m.reading) ? group.map((m) => m.reading).join('') : undefined;
  const common = {
    surface,
    parts: group.map((m) => m.surface),
    inflections: grammarOf(group),
    // A group is vocabulary if its head is, even when the tail is grammar.
    content: head.pos ? !functional(head) || group.some(isGozaru) : true,
  };

  /*
   * ございます and what it makes: ありがとう + ございました is ありがとうございます,
   * で + ございます is でございます — both expressions JMdict has — and ござい +
   * ます on its own is ござる.
   */
  const g = group.findIndex(isGozaru);
  if (g >= 0) {
    const before = group.slice(0, g);
    const lemma = before.length ? `${before.map((m) => m.surface).join('')}ございます` : 'ござる';
    const lemmaReading = before.length
      ? before.every((m) => m.reading) ? `${before.map((m) => m.reading).join('')}ゴザイマス` : undefined
      : 'ゴザル';
    return {
      ...common, content: true, lemma, reading, pos: before.length ? '表現' : '動詞', lemmaReading,
      lookup: lookupKeys(
        [lemma, lemmaReading, undefined],
        [surface, reading, undefined],
        // Failing the expression, the word it was built on.
        [before[0]?.lemma ?? before[0]?.surface, before[0]?.reading, before[0] ? posOf(before[0]) : undefined],
        ['ござる', 'ゴザル', '動詞'],
      ),
    };
  }

  // A サ変 noun's dictionary form is the noun plus する, not the noun alone —
  // but JMdict files it under the noun, so that is the next key to try.
  const next = group[at + 1];
  if (lead.pos === '名詞' && lead.pos1 === 'サ変接続' && next?.pos === '動詞' && next.lemma === 'する') {
    const lemma = `${lead.surface}する`;
    const lemmaReading = lead.reading ? `${lead.reading}スル` : undefined;
    return {
      ...common, lemma, reading, pos: lead.pos, lemmaReading,
      lookup: lookupKeys([lemma, lemmaReading, '動詞'], [lead.surface, lead.reading, posOf(lead)]),
    };
  }

  if (isVerbal(group)) {
    if (nounSuffixed(group)) {
      const hits = lexicon?.(surface);
      if (hits?.length === 1) {
        const entry = hits[0]!;
        const r = toKatakana(entry.reading);
        return {
          ...common, lemma: entry.word, reading: r, pos: '名詞', lemmaReading: r,
          lookup: lookupKeys([entry.word, r, '名詞'], [lead.lemma, lemmaReadingOf(lead), posOf(lead)]),
        };
      }
    }
    const lemma = lead.lemma ?? lead.surface;
    const lemmaReading = lemmaReadingOf(lead);
    const potential = potentialOf(lead, lemmaReading);
    if (potential && confirmed(potential, lemma, lexicon)) {
      // The word is 保つ — what a card is made for, and what status matches.
      return {
        ...common,
        inflections: ['potential', ...common.inflections.filter((g) => g !== 'potential')],
        lemma: potential.word, reading, pos: lead.pos, lemmaReading: potential.reading,
        lookup: lookupKeys(
          [potential.word, potential.reading, posOf(lead)],
          [lemma, lemmaReading, posOf(lead)],
          [surface, reading, posOf(lead)],
        ),
      };
    }
    return {
      ...common, lemma, reading, pos: lead.pos, lemmaReading,
      lookup: lookupKeys(
        [lemma, lemmaReading, posOf(lead)],
        [surface, reading, posOf(lead)],
        // Without the dictionary's word on it, 保てる may still be 保つ.
        [potential?.word, potential?.reading, posOf(lead)],
      ),
    };
  }

  if (group.length === 1) {
    const lemma = head.lemma ?? head.surface;
    const lemmaReading = lemmaReadingOf(head);
    // IPADIC keeps some honorific nouns whole — お待ち — where JMdict has
    // only the noun beneath the prefix.
    const bare = /^[おご][一-鿿]/.test(lemma) ? lemma.slice(1) : undefined;
    return {
      ...common, lemma, reading, pos: head.pos, lemmaReading,
      lookup: lookupKeys(
        [lemma, lemmaReading, posOf(head)],
        [surface, reading, posOf(head)],
        [bare, bare && lemmaReading ? lemmaReading.slice(1) : undefined, posOf(head)],
      ),
    };
  }

  /*
   * A noun group: prefix, number, suffixes. Its word is whatever the
   * dictionary knows — お寿司 or else 寿司, 運転手 out of 運転手さん, 一人 —
   * and so is its reading. Gluing the morphemes' readings together is wrong
   * exactly where it matters: 一人 is not いちにん, 一回 not いちかい, 先生方
   * not せんせいかた.
   */
  const numeric = group.some((m) => m.pos1 === '数');
  const ambiguous: string[] = [];
  const found = resolve(group, lexicon, ambiguous);
  const counter = numeric ? [...group].reverse().find((m) => m.pos1 === '接尾') : undefined;
  const coreLemma = lead.lemma ?? lead.surface;

  let lemma: string;
  let tokenReading: string | undefined;
  let lemmaReading: string | undefined;
  if (found?.entry) {
    lemma = found.entry.word;
    lemmaReading = toKatakana(found.entry.reading);
    tokenReading = around(group, found.i, found.j, lemmaReading) ?? (numeric ? undefined : reading);
  } else if (found) {
    lemma = found.form;
    tokenReading = numeric ? undefined : reading;
  } else {
    // Unknown to the dictionary, or it has not loaded: a number keeps its
    // surface and loses its reading rather than wearing a wrong one; anything
    // else is looked up by its noun.
    lemma = numeric ? surface : coreLemma;
    tokenReading = numeric ? undefined : reading;
    lemmaReading = numeric ? undefined : lemmaReadingOf(lead);
  }

  return {
    ...common,
    lemma,
    reading: tokenReading,
    pos: lead.pos,
    lemmaReading,
    lookup: lookupKeys(
      [lemma, lemmaReading, posOf(lead)],
      [surface, tokenReading, posOf(lead)],
      ...ambiguous.map((form): [string, undefined, string | undefined] => [form, undefined, posOf(lead)]),
      // 3匹 has no entry of its own, but 匹 does, and says what it counts —
      // which is more than the number does.
      [counter?.lemma ?? counter?.surface, counter?.reading, counter ? posOf(counter) : undefined],
      [coreLemma, lemmaReadingOf(lead), posOf(lead)],
    ),
  };
}

export function mergeMorphemes(morphemes: Morpheme[], lexicon?: Lexicon): MergedToken[] {
  return groups(joinCompounds(morphemes, lexicon)).map((group) => merge(group, lexicon));
}
