/**
 * JMdict, as published by jmdict-simplified.
 *
 * Entries are stored once and indexed by every written and read form, because
 * a lookup arrives as whatever the analyser produced — 食べる from a lemma, but
 * 御飯 or ごはん from a surface. One store, many keys.
 */

export interface RawWord {
  id: string;
  kanji?: Array<{ text: string; common?: boolean; tags?: string[] }>;
  kana?: Array<{ text: string; common?: boolean; tags?: string[]; appliesToKanji?: string[] }>;
  sense?: Array<{
    partOfSpeech?: string[];
    misc?: string[];
    gloss?: Array<{ text: string; lang?: string }>;
  }>;
}

/** One spelling of an entry, and what JMdict says about that spelling alone. */
export interface Form {
  text: string;
  /** Kana rather than kanji. */
  kana: boolean;
  /** JMdict's priority markers put this particular spelling in common use. */
  common: boolean;
  /** Rare, search-only, irregular or outdated — findable, never shown. */
  rare?: boolean;
}

export interface Entry {
  id: string;
  /**
   * The language its meanings are in, where that is not the dictionary's
   * usual one: set on an entry from a dictionary in the learner's own
   * language (settings.ts, ownDictionaryOf), so the card marks it up as such.
   */
  lang?: string;
  /** Preferred written form — the spelling people actually see. */
  word: string;
  /** Preferred reading, when the headword is kanji. */
  reading?: string;
  common: boolean;
  senses: Array<{ pos: string[]; glosses: string[]; misc?: string[] }>;
  /**
   * Every spelling, kanji first then kana, each with its own commonness.
   * What ranking reads: a rare spelling of a common word is still rare. Local
   * entries only; remote ones do not carry it.
   */
  forms?: Form[];
  /** JMdict marks the word as usually written in kana, so `word` is kana. */
  uk?: boolean;
  /** The kanji spelling behind a kana headword, for display beside it. */
  kanji?: string;
  /**
   * What kind of word it is, for the card to say under the headword, as the
   * dictionary's own codes: ['v', 'n', 'masc'] for a word that is a verb and
   * a masculine noun. For a dictionary whose entry gathers several parts of
   * speech; without it the card names the first sense's.
   */
  kind?: string[];
  /**
   * The headword in the language's other script, where it has two: the
   * traditional form of a simplified Chinese word, or the reverse.
   */
  alt?: string;
}

/**
 * Spellings that must never become the headword.
 *
 * rK/rk rare, sK/sk search-only, iK/ik irregular, oK/ok outdated, io irregular
 * okurigana. JMdict keeps them so a lookup can find the entry; nobody should
 * be shown 迚も for とても, or have a card made under it.
 */
const IRREGULAR = new Set(['rK', 'rk', 'sK', 'sk', 'iK', 'ik', 'oK', 'ok', 'io']);

const isIrregular = (tags?: string[]): boolean => Boolean(tags?.some((t) => IRREGULAR.has(t)));

/** Every form this entry should be findable by — rare ones included. */
export function keysFor(w: RawWord): string[] {
  const keys = new Set<string>();
  for (const k of w.kanji ?? []) if (k.text) keys.add(k.text);
  for (const k of w.kana ?? []) if (k.text) keys.add(k.text);
  return [...keys];
}

/**
 * Usually written in kana: 'uk' on the first sense, or on most of them.
 *
 * The first sense is what a learner meets; "most" catches entries whose later
 * senses carry the tag and whose first one simply does not repeat it.
 */
function usuallyKana(w: RawWord): boolean {
  const senses = w.sense ?? [];
  if (!senses.length) return false;
  if (senses[0]?.misc?.includes('uk')) return true;
  return senses.filter((s) => s.misc?.includes('uk')).length * 2 > senses.length;
}

/**
 * `lang` is the JMdict three-letter code of the edition being read. A
 * single-language edition tags its glosses with it, so filtering on the wrong
 * one silently produces entries with no definitions at all.
 */
export function toEntry(w: RawWord, lang = 'eng'): Entry | null {
  const senses = (w.sense ?? [])
    .map((s) => ({
      pos: s.partOfSpeech ?? [],
      glosses: (s.gloss ?? []).filter((g) => !g.lang || g.lang === lang).map((g) => g.text),
      misc: s.misc?.length ? s.misc : undefined,
    }))
    .filter((s) => s.glosses.length);

  if (!senses.length) return null;

  const kanji = (w.kanji ?? []).filter((k) => k.text);
  const kana = (w.kana ?? []).filter((k) => k.text);

  // Prefer a regular spelling; fall back to whatever exists rather than
  // dropping an entry whose every spelling happens to be tagged.
  const writtenKanji = kanji.find((k) => !isIrregular(k.tags));
  const writtenKana = kana.find((k) => !isIrregular(k.tags)) ?? kana[0];

  // Kana is the headword when JMdict says so, or when every kanji spelling is
  // one nobody uses: 為る is not how anyone writes する.
  const uk = usuallyKana(w) || (!writtenKanji && Boolean(writtenKana));
  const headKanji = uk ? undefined : (writtenKanji ?? kanji[0]);
  const word = headKanji?.text ?? writtenKana?.text;
  if (!word) return null;

  // The reading that belongs to the headword, not merely the first listed.
  const reading = headKanji
    ? (kana.find(
        (k) =>
          !isIrregular(k.tags) &&
          (!k.appliesToKanji || k.appliesToKanji.includes('*') || k.appliesToKanji.includes(headKanji.text)),
      ) ?? writtenKana)?.text
    : undefined;

  const forms: Form[] = [
    ...kanji.map((k) => ({ text: k.text, kana: false, common: Boolean(k.common), rare: isIrregular(k.tags) || undefined })),
    ...kana.map((k) => ({ text: k.text, kana: true, common: Boolean(k.common), rare: isIrregular(k.tags) || undefined })),
  ];

  return {
    id: w.id,
    word,
    reading,
    common: Boolean(kanji.some((k) => k.common) || kana.some((k) => k.common)),
    senses,
    forms,
    uk: uk || undefined,
    kanji: uk && writtenKanji ? writtenKanji.text : undefined,
  };
}

/** What the analyser knows about the text being looked up. */
export interface RankHint {
  /** Its reading, in either kana. Decides between homographs: 私 read わたし. */
  reading?: string;
  /**
   * Its part of speech, as the analyser names it: "名詞,代名詞", "動詞", "助詞".
   * Decides between entries that share a spelling but not a role: この the
   * determiner, not この the rare reading of 九.
   */
  pos?: string;
}

const hira = (s: string): string =>
  s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

const KANA_ONLY = /^[ぁ-ゖァ-ヺー・ゝゞヽヾ]+$/;

/**
 * How well a JMdict part-of-speech code fits the analyser's: 2 for the code
 * that names the same thing, 1 for one that plausibly covers it, 0 for none.
 *
 * Graded rather than yes/no because IPADIC is finer than JMdict in places:
 * 今日 is 名詞,副詞可能 — a temporal noun — and should beat 京, a plain noun
 * that happens to share the reading きょう.
 */
function fitFor(pos?: string): ((code: string) => number) | null {
  if (!pos) return null;
  const [p, p1] = pos.split(',');
  const fit = (exact: string[], loose: string[] = []) => (c: string) =>
    exact.includes(c) ? 2 : loose.includes(c) ? 1 : 0;
  switch (p) {
    case '名詞':
      switch (p1) {
        case '代名詞': return fit(['pn'], ['n']);
        case '数': return fit(['num'], ['n', 'ctr']);
        case '形容動詞語幹': return fit(['adj-na'], ['n', 'adj-no']);
        case 'ナイ形容詞語幹': return fit(['adj-i'], ['n']);
        case '副詞可能': return fit(['n-adv', 'n-t', 'adv'], ['n']);
        case '接尾': return fit(['suf', 'n-suf', 'ctr'], ['n']);
        case 'サ変接続': return fit(['vs'], ['n']);
        // こと, はず, ため, よう: grammatical nouns JMdict files under several.
        case '非自立': return fit(['n', 'aux', 'n-adv', 'adj-na'], ['n-suf', 'suf', 'adv', 'prt', 'exp']);
        default: return fit(['n'], ['n-adv', 'n-t', 'n-suf', 'pn', 'adj-no', 'num', 'ctr', 'adj-na', 'vs']);
      }
    case '動詞': return (c) => (/^v(1|5|k|z|2|4|n|r|s-)/.test(c) ? 2 : c === 'aux-v' ? 1 : 0);
    case '形容詞': return fit(['adj-i', 'adj-ix'], ['aux-adj']);
    case '副詞': return fit(['adv', 'adv-to'], ['n-adv']);
    case '連体詞': return fit(['adj-pn'], ['adj-f']);
    case '接続詞': return fit(['conj']);
    case '感動詞': case 'フィラー': return fit(['int']);
    case '助詞': return fit(['prt']);
    case '助動詞': return fit(['aux', 'aux-v', 'aux-adj', 'cop']);
    case '接頭詞': return fit(['pref', 'n-pref']);
    default: return null;
  }
}

/**
 * Rank the entries found under one key, most likely first.
 *
 * JMdict has no frequency data, so this orders by what it does say, in turn:
 *
 *  1. The key is one of the entry's spellings (remote results are fuzzy).
 *  2. The analyser's reading, for keys with kanji: 私 read わたし, not あたし.
 *  3. The analyser's part of speech: この the determiner, not the rare
 *     reading of 九; 何 the pronoun for なん, not 難.
 *  4. That spelling, specifically, is common: 時 before the rare とき "please
 *     do", 此方 before 忽地 for こっち.
 *  5. The key is how the entry is normally written — its regular kanji, or
 *     for kana keys its first reading. いう is 言う's reading and only a
 *     variant of 結う's.
 *  6. For kana keys, a word written in kana: 又 over 股 for また, the particle
 *     は over 派.
 *  7. More senses: a word with many uses is the more general one. 事 over 琴.
 *  8. JMdict's sequence number, only so the order is stable.
 *
 * Checked against the most frequent kana words in OpenSubtitles: 208 of 223
 * resolve to their everyday entry from the key alone and 214 with the
 * analyser's hints, where the old order managed 171.
 */
export function rank(entries: Entry[], key: string, hint: RankHint = {}): Entry[] {
  const kanaKey = KANA_ONLY.test(key);
  const hKey = hira(key);
  const hintReading = hint.reading ? hira(hint.reading) : undefined;
  const fit = fitFor(hint.pos);

  const score = (e: Entry): number[] => {
    const forms = e.forms;
    const matched = forms?.find((f) => f.text === key) ?? forms?.find((f) => f.kana && hira(f.text) === hKey);
    const exact = forms ? Boolean(matched) : e.word === key || e.reading === key;

    const readingMatch =
      !kanaKey && hintReading
        ? Number(
            (forms?.some((f) => f.kana && hira(f.text) === hintReading) ?? false) ||
              (e.reading !== undefined && hira(e.reading) === hintReading) ||
              hira(e.word) === hintReading,
          )
        : 0;

    const pos = fit ? Math.max(0, ...e.senses.flatMap((s) => s.pos.map(fit))) : 0;

    const common = Number(matched ? matched.common : e.common);

    let usual: number;
    if (!forms) usual = Number(e.word === key || e.reading === key);
    else if (kanaKey) {
      const primaryKana = forms.find((f) => f.kana && !f.rare);
      usual = Number(e.word === key || (primaryKana !== undefined && hira(primaryKana.text) === hKey));
    } else usual = Number(Boolean(matched && !matched.rare));

    const written = Number(kanaKey && e.word === key);

    return [Number(exact), readingMatch, pos, common, usual, written, e.senses.length];
  };

  const scored = entries.map((e) => ({ e, s: score(e) }));
  scored.sort((a, b) => {
    for (let i = 0; i < a.s.length; i++) {
      const d = (b.s[i] ?? 0) - (a.s[i] ?? 0);
      if (d) return d;
    }
    const ai = Number(a.e.id);
    const bi = Number(b.e.id);
    if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
    return a.e.id.localeCompare(b.e.id);
  });
  return scored.map((x) => x.e);
}

/**
 * Readings of one written form, as the dictionary has them.
 *
 * For callers that need to know whether a spelling reads one way or several —
 * 一人 is only ひとり, 一日 is いちにち or ついたち — without choosing between
 * homographs they have no context for. Rare spellings do not count.
 */
export function readingsOf(entries: Entry[], form: string): string[] {
  const out: string[] = [];
  for (const e of entries) {
    const f = e.forms?.find((x) => x.text === form && !x.kana);
    if (e.forms && (!f || f.rare)) continue;
    const r = e.reading ?? (e.uk ? e.word : undefined);
    if (r && !out.includes(r)) out.push(r);
  }
  return out;
}
