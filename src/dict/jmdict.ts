/**
 * JMdict, as published by jmdict-simplified.
 *
 * Entries are stored once and indexed by every written and read form, because
 * a lookup arrives as whatever the analyser produced — 食べる from a lemma, but
 * 御飯 or ごはん from a surface. One store, many keys.
 */
import { KANA_VERBS } from './kana-verbs';

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
  /**
   * The analyser's name for the word, in kanji, where it is written in kana:
   * 側 for そば. Decides between entries nothing else tells apart, そば beside
   * and そば the noodles.
   */
  spelling?: string;
  /**
   * How the verb conjugates, as the analyser names it: "五段・ラ行", "一段".
   * Decides between verbs that share a kana spelling and conjugate
   * differently: いる the 五段 verb is 要る, to need, not 居る, to be.
   */
  conj?: string;
  /**
   * What a verb in kana follows in the line: a noun and its particle,
   * ピアノ|を, a noun alone, 年|, or nothing that says, ''. Says which verb it
   * is, by what Tatoeba writes there in kanji (kana-verbs.ts): 弾く for ひく
   * after ピアノ|を, and 付く for つく after nothing. Weighed after how the
   * verb conjugates, which says more where the line's form decides it.
   */
  follows?: string;
  /**
   * The analyser's name for a spelling, where it can be asked. Its names are
   * coarser than the dictionary's entries — 奢る, to treat, and 驕る, to be
   * proud, are both 驕る to it — so an entry is the word named only if the
   * analyser gives one of its own spellings that name, and `spelling` is not
   * used without this.
   */
  names?: (form: string) => string | undefined;
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
/** JMdict's codes for the verbs that conjugate as IPADIC says one does: 五段・ラ行 is v5r, 一段 v1, 下二・ア行 v2a-s. */
function conjugatesAs(conj?: string): RegExp | null {
  if (!conj) return null;
  if (conj.startsWith('一段')) return /^v1/;
  const row = /^五段・(.)行/.exec(conj)?.[1];
  if (row) {
    const code = ({ カ: 'k', ガ: 'g', サ: 's', タ: 't', ナ: 'n', バ: 'b', マ: 'm', ラ: 'r|aru', ワ: 'u' } as Record<string, string>)[row];
    return code ? new RegExp(`^v5(${code})`) : null;
  }
  if (conj.startsWith('サ変')) return /^v[sz]/;
  if (conj.startsWith('カ変')) return /^vk/;
  if (/^[上下]二/.test(conj)) return /^v2/;
  if (conj.startsWith('四段')) return /^v4/;
  return null;
}

function fitFor(pos?: string, conj?: string): ((code: string) => number) | null {
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
        // A suffix reading first: たび as 度, "each time", before 足袋, socks.
        case '非自立':
          return (c) => (c === 'n-suf' || c === 'suf' ? 3 : ['n', 'aux', 'n-adv', 'adj-na'].includes(c) ? 2 : ['adv', 'prt', 'exp'].includes(c) ? 1 : 0);
        default: return fit(['n'], ['n-adv', 'n-t', 'n-suf', 'pn', 'adj-no', 'num', 'ctr', 'adj-na', 'vs']);
      }
    case '動詞': {
      // A verb that conjugates as this one does, before the other verbs of the spelling.
      const same = conjugatesAs(conj);
      return (c) => (same?.test(c) ? 3 : /^v(1|5|k|z|2|4|n|r|s-)/.test(c) ? 2 : c === 'aux-v' ? 1 : 0);
    }
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
 *     reading of 九; 何 the pronoun for なん, not 難. And for a verb, how it
 *     conjugates: いら in いらない is 要る, a 五段 verb, not 居る. Then, for a
 *     verb in kana, the verb the words before it say it is: ピアノをひく is
 *     弾く (kana-verbs.ts).
 *  4. That spelling, specifically, is common: 時 before the rare とき "please
 *     do", 此方 before 忽地 for こっち.
 *  5. The key is how the entry is normally written — its regular kanji, or
 *     for kana keys its first reading. いう is 言う's reading and only a
 *     variant of 結う's.
 *  6. For kana keys, a word written in kana: 又 over 股 for また, the particle
 *     は over 派.
 *  7. The analyser's own name for the word, where it has one: そば is 側,
 *     beside, in a line UniDic reads so, and 蕎麦 otherwise. Last of what is
 *     known about the word, since it is right less often than the rest: one
 *     kana word in fourteen has two entries level to here.
 *  8. More senses: a word with many uses is the more general one. 事 over 琴.
 *  9. JMdict's sequence number, only so the order is stable.
 *
 * Checked against the most frequent kana words in OpenSubtitles: 208 of 223
 * resolve to their everyday entry from the key alone and 214 with the
 * analyser's hints, where the old order managed 171.
 */
export function rank(entries: Entry[], key: string, hint: RankHint = {}): Entry[] {
  const score = scoring(key, hint);
  const scored = entries.map((e) => ({ e, s: score(e) }));
  scored.sort((a, b) => {
    const d = ahead(a.s, b.s);
    if (d) return -d;
    const ai = Number(a.e.id);
    const bi = Number(b.e.id);
    if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
    return a.e.id.localeCompare(b.e.id);
  });
  return scored.map((x) => x.e);
}

/** How far the first score is ahead of the second, at the first thing they differ in: above zero, ahead. */
function ahead(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** What rank() weighs for each entry under a key, in the order it weighs it. */
function scoring(key: string, hint: RankHint): (e: Entry) => number[] {
  const kanaKey = KANA_ONLY.test(key);
  const hKey = hira(key);
  const hintReading = hint.reading ? hira(hint.reading) : undefined;
  const fit = fitFor(hint.pos, hint.conj);
  const verb = hint.pos?.startsWith('動詞') === true;
  // The verb what it follows says a verb in kana is, or what it most often is.
  const follows = verb ? hint.follows : undefined;
  const meant = follows === undefined ? undefined : KANA_VERBS[key]?.after?.[follows] ?? KANA_VERBS[key]?.usual;

  return (e: Entry): number[] => {
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

    const names = hint.spelling ? hint.names : undefined;
    const spelled = Number(Boolean(names && forms?.some((f) => !f.kana && names(f.text) === hint.spelling)));
    // A verb the analyser names, one of the entry's common spellings exactly, before the rest: 得る, not 売る,
    // for うる. Only the verbs spelled() names, whose names were never wrong in Tatoeba.
    const named = Number(Boolean(names && verb && forms?.some((f) => !f.kana && f.common && f.text === hint.spelling)));
    const told = Number(Boolean(meant && forms?.some((f) => !f.kana && f.text === meant)));
    if (verb) return [Number(exact), readingMatch, pos, told, named, spelled, common, usual, written, e.senses.length];

    return [Number(exact), readingMatch, pos, common, usual, written, spelled, e.senses.length];
  };
}

/**
 * Readings of one written form, as the dictionary has them.
 *
 * For callers that need to know whether a spelling reads one way or several —
 * 一人 is only ひとり, 一日 is いちにち or ついたち — without choosing between
 * homographs they have no context for. Rare spellings do not count, unless
 * the form is never anything else and only writes more of the word in kana
 * (spellsOut): 落ちつける, こみ合う and さし上げる are JMdict's search-only
 * spellings of 落ち着ける, 混み合う and 差し上げる, and are still those words,
 * where skipping them had the merge read 落ち着く able to be done, こむ and
 * さす. 行ける is a search-only spelling too, of いける, "to be good", and is
 * still 行く able to be done: いける has no kanji of its own to write out.
 */
export function readingsOf(entries: Entry[], form: string): string[] {
  // A word written in katakana, ワンシーン, is its own reading: there is no other spelling to read.
  const katakana = /^[ァ-ヺー・]+$/.test(form);
  const readings = (rareToo: boolean): string[] => {
    const out: string[] = [];
    for (const e of entries) {
      const f = e.forms?.find((x) => x.text === form && (katakana || !x.kana));
      if (e.forms && (!f || (f.rare && !(rareToo && spellsOut(e, form))))) continue;
      const r = katakana ? form : e.reading ?? (e.uk ? e.word : undefined);
      if (r && !out.includes(r)) out.push(r);
    }
    return out;
  };
  const usual = readings(false);
  return usual.length ? usual : readings(true);
}

const KANJI = /[㐀-䶿一-鿿々]/u;
const KANA = /[ぁ-ゖァ-ヺー・]/u;
/** Numbers, which the merge reads as numbers and counters, as extra-words.ts leaves them to it. */
const NUMERAL = /[〇一二三四五六七八九十百千万億兆0-9０-９]/u;

/**
 * A spelling that writes in kana some of what one of the entry's usual kanji
 * spellings writes: every character of it that is not kana is in that one.
 * Never a number: 四脚 is 四つ足's search-only spelling, and is four chairs, よんきゃく, in 椅子が4脚.
 */
function spellsOut(e: Entry, spelling: string): boolean {
  if (NUMERAL.test(spelling)) return false;
  const kept = [...spelling].filter((c) => !KANA.test(c));
  return kept.some((c) => KANJI.test(c)) && Boolean(e.forms?.some((g) => !g.kana && !g.rare && kept.every((c) => g.text.includes(c))));
}

/** One dictionary word a written form stands for. */
export interface FormReading {
  /** The entry's headword. */
  word: string;
  /** Its reading, in hiragana. */
  reading: string;
  /** The entry's first sense's part-of-speech codes. */
  pos?: string[];
  /** JMdict marks the entry as a word in common use. */
  common?: boolean;
  /** JMdict marks the word as usually written in kana: つらい, where 辛い is more often からい. */
  kana?: boolean;
  /**
   * On the first word only: rank() puts it above the next for a reason — it is the
   * commoner, or has the more uses — and not by where the two stand in JMdict's
   * file. 後 read あと leads のち; 実 read じつ and み are level.
   */
  leads?: boolean;
}

/**
 * The words a written form stands for, most likely first, from the entries
 * found under it: one for each reading the form has. What the tokenizer asks
 * the dictionary (lexicon() in store.ts).
 */
export function wordsFor(entries: Entry[], form: string): FormReading[] {
  const ranked = rank(entries, form);
  const of = (reading: string): Entry | undefined => ranked.find((e) => (e.reading ?? (e.uk ? e.word : undefined)) === reading);
  const score = scoring(form, {});
  return readingsOf(ranked, form).map((reading, i, all) => {
    const entry = of(reading);
    const next = i === 0 && all[1] !== undefined ? of(all[1]) : undefined;
    const leads = i === 0 && entry !== undefined && (!next || ahead(score(entry), score(next)) > 0);
    return {
      word: entry?.word ?? form, reading, pos: entry?.senses[0]?.pos,
      ...(entry?.common ? { common: true } : {}), ...(entry?.uk ? { kana: true } : {}), ...(leads ? { leads: true } : {}),
    };
  });
}
