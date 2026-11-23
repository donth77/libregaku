import type { Attached, AttachedRules, Forms, LemmaHints } from './lemma';

/**
 * Turkish, read by its suffixes.
 *
 * A Turkish word is a stem and a chain of suffixes, each with one job:
 * ev-ler-imiz-den is "house", plural, "our", "from". Wiktionary's table of
 * forms (lemma.ts) lists millions of them and says which word each is a form
 * of, which is what finds the stem, but its descriptions of them are often
 * the next row's (geliyorum, "I am coming", is filed as third-person), and it
 * stops where a sentence goes on: gerektiğini, olmadığını and değildi are in
 * no table. So the chain is read here, from the end inwards, and the
 * dictionary is asked whether what is left is a word: ev, or gel- as gelmek.
 * The card names each suffix.
 *
 * The suffixes are written as Turkish grammars write them: A is a or e, I one
 * of ı i u ü (vowel harmony), D d or t, C c or ç, K k or ğ (before a vowel).
 * Each suffix has a place in the chain, and a suffix nearer the end is read
 * first. Harmony is not checked: a chain the dictionary has no stem for is no
 * reading, and one that finds a stem is ranked against the others
 * (chooseTurkish).
 */

export const TURKISH: LemmaHints = {
  // The commonest verbs: biliyor is bilmek, "to know", before bilemek, "to whet".
  first: ['olmak', 'etmek', 'yapmak', 'demek', 'gitmek', 'gelmek', 'istemek', 'bilmek', 'görmek', 'vermek', 'almak'],
  common: [],
  auxiliaries: [],
  // The personal pronouns. Turkish has no articles.
  grammar: ['ben', 'sen', 'o', 'biz', 'siz', 'onlar'],
  // A pronoun leads to no verb: ben öğrenciyim, "I am a student".
  noVerbAfterPronoun: true,
};

/** Where in the chain a suffix goes, from the stem outwards. */
const enum Place {
  Voice = 1,
  Mood = 2,
  /** What a verb ends in: a tense, a participle, or a converb. */
  Verb = 3,
  Derived = 4,
  Plural = 5,
  Possessive = 6,
  Case = 7,
  /** -(y)lA, which also follows a genitive: benimle, onunla. */
  With = 8,
  Ki = 9,
  Copula = 10,
  Person = 11,
}

/** What a suffix makes of the word before it, for what may come after it. */
type Role =
  /** It makes a noun of a verb (geldiği, gelmek, gelen): a noun's suffixes may follow. */
  | 'nominal'
  /** It ends a verb's statement (geliyor, geldi): only a person or the copula follows. */
  | 'finite'
  /** It joins the verb to the next (gelip, gelince): nothing follows. */
  | 'converb'
  /** Anything else. */
  | 'plain';

interface Suffix {
  /** As grammars write it: DIK, (y)AcAK. Each spelling the letters stand for is read. */
  form: string;
  /** The interface's names for what it does (src/i18n/en/grammar.ts), in order. */
  labels: readonly string[];
  place: Place;
  /** It goes on a verb. */
  verbal?: boolean;
  role?: Role;
  /** Only straight after a suffix with one of these labels: gelirdim's m after the past, not after the present. */
  after?: readonly string[];
}

const S = (form: string, labels: readonly string[], place: Place, more: Partial<Suffix> = {}): Suffix => ({ form, labels, place, ...more });
const V = (form: string, labels: readonly string[], place: Place, role: Role = 'plain'): Suffix => S(form, labels, place, { verbal: true, role });

const FIRST_SG = ['first-person singular'];
const SECOND_SG = ['second-person singular'];
const FIRST_PL = ['first-person plural'];
const SECOND_PL = ['second-person plural'];
const THIRD_PL = ['third-person plural'];
/** The endings after the past and the conditional: geldim, gelsen. */
const SHORT_PERSON = ['past', 'conditional'];

const SUFFIXES: readonly Suffix[] = [
  // Who: geliyorum, öğrenciyim; geldim, gelsek; geldiler.
  S('(y)Im', FIRST_SG, Place.Person),
  S('sIn', SECOND_SG, Place.Person),
  S('(y)Iz', FIRST_PL, Place.Person),
  S('sInIz', SECOND_PL, Place.Person),
  S('lAr', THIRD_PL, Place.Person),
  S('m', FIRST_SG, Place.Person, { after: SHORT_PERSON }),
  S('n', SECOND_SG, Place.Person, { after: SHORT_PERSON }),
  S('k', FIRST_PL, Place.Person, { after: SHORT_PERSON }),
  S('nIz', SECOND_PL, Place.Person, { after: SHORT_PERSON }),

  // The copula, on a noun or after a tense: değildi, nereliydi, zordur, yaşındayken.
  S('(y)DI', ['past'], Place.Copula),
  S('(y)mIş', ['apparently'], Place.Copula),
  S('(y)sA', ['conditional'], Place.Copula),
  S('DIr', ['assertive'], Place.Copula),
  S('(y)ken', ['while'], Place.Copula),

  // The one that is: sonraki, dünyadaki, arasındaki.
  S('ki', ['that-is'], Place.Ki),

  // Case; after a possessive in -(s)I, with n: evini, arasında.
  S('(y)I', ['accusative-case'], Place.Case),
  S('nI', ['accusative-case'], Place.Case),
  S('(y)A', ['dative-case'], Place.Case),
  S('nA', ['dative-case'], Place.Case),
  S('DA', ['locative'], Place.Case),
  S('nDA', ['locative'], Place.Case),
  S('DAn', ['ablative'], Place.Case),
  S('nDAn', ['ablative'], Place.Case),
  S('(n)In', ['genitive'], Place.Case),
  S('(y)lA', ['instrumental'], Place.With),

  // Whose: evim, evin, evi, evimiz, eviniz, evleri.
  S('(I)m', ['attached-my'], Place.Possessive),
  S('(I)n', ['attached-your'], Place.Possessive),
  S('(s)I', ['attached-its'], Place.Possessive),
  S('(I)mIz', ['attached-our'], Place.Possessive),
  S('(I)nIz', ['attached-your'], Place.Possessive),
  S('lArI', ['attached-their'], Place.Possessive),

  S('lAr', ['plural'], Place.Plural),

  // A noun made of a noun: nereli, "from where"; şekersiz, "without sugar".
  S('lI', ['having'], Place.Derived),
  S('sIz', ['without'], Place.Derived),

  // A verb made a noun: geldiği, geleceği, gelen, gelme, gelmek.
  V('DIK', ['noun form'], Place.Verb, 'nominal'),
  V('(y)AcAK', ['future'], Place.Verb, 'nominal'),
  V('(y)An', ['modifier'], Place.Verb, 'nominal'),
  V('mA', ['noun form'], Place.Verb, 'nominal'),
  V('mAK', ['infinitive'], Place.Verb, 'nominal'),
  V('mAyAcAK', ['negative', 'future'], Place.Verb, 'nominal'),
  // A verb joined to the next: gelip, gelerek, gelince, gelmeden.
  V('(y)Ip', ['and'], Place.Verb, 'converb'),
  V('(y)ArAk', ['gerund'], Place.Verb, 'converb'),
  V('(y)IncA', ['when'], Place.Verb, 'converb'),
  V('mAdAn', ['without'], Place.Verb, 'converb'),
  // What a verb says: geliyor, gelecek, gelmiş, geldi, gelir, gelmez, gelse, gelmeli, gelelim.
  V('Iyor', ['ongoing'], Place.Verb, 'finite'),
  // After a stem in ı, i, u or ü: okuyor, yürüyor.
  V('yor', ['ongoing'], Place.Verb, 'finite'),
  V('(y)AmIyor', ['negative', 'potential', 'ongoing'], Place.Verb, 'finite'),
  V('mIyor', ['negative', 'ongoing'], Place.Verb, 'finite'),
  V('(y)AcAK', ['future'], Place.Verb, 'finite'),
  V('mAyAcAK', ['negative', 'future'], Place.Verb, 'finite'),
  V('mIş', ['apparently'], Place.Verb, 'finite'),
  V('DI', ['past'], Place.Verb, 'finite'),
  V('Ar', ['habitual'], Place.Verb, 'finite'),
  V('Ir', ['habitual'], Place.Verb, 'finite'),
  V('r', ['habitual'], Place.Verb, 'finite'),
  V('mAz', ['negative', 'habitual'], Place.Verb, 'finite'),
  V('mAm', ['negative', 'habitual', ...FIRST_SG], Place.Verb, 'finite'),
  V('mAyIz', ['negative', 'habitual', ...FIRST_PL], Place.Verb, 'finite'),
  V('sA', ['conditional'], Place.Verb, 'finite'),
  V('mAlI', ['must'], Place.Verb, 'finite'),
  V('(y)AlIm', ["let's"], Place.Verb, 'finite'),

  // Can, and cannot: gelebilir, gelemez.
  V('(y)Abil', ['potential'], Place.Mood),
  V('(y)AmA', ['negative', 'potential'], Place.Mood),
  V('mA', ['negative'], Place.Mood),

  // Done to it: yapıldı, okundu.
  V('Il', ['passive'], Place.Voice),
  V('In', ['passive'], Place.Voice),
];

const LETTERS: Record<string, readonly string[]> = {
  A: ['a', 'e'], I: ['ı', 'i', 'u', 'ü'], D: ['d', 't'], C: ['c', 'ç'], K: ['k', 'ğ'],
};

/** Every spelling of a suffix: (y)AcAK is acak, ecek, yacak, yecek, acağ, eceğ… */
function spellings(form: string): string[] {
  const optional = /^\((\p{L})\)/u.exec(form);
  const rest = optional ? form.slice(optional[0].length) : form;
  let out = [''];
  for (const ch of rest) {
    const choices = LETTERS[ch] ?? [ch];
    out = out.flatMap((s) => choices.map((c) => s + c));
  }
  // An optional letter is spelt as any other: the (I) of (I)mIz is ı, i, u or ü.
  return optional ? [...out, ...(LETTERS[optional[1]!] ?? [optional[1]!]).flatMap((c) => out.map((s) => c + s))] : out;
}

/** Each suffix with its spellings, longest first, so that -lArI is tried before -I; by the letter each ends in. */
const SPELT: ReadonlyMap<string, ReadonlyArray<{ suffix: Suffix; text: string }>> = (() => {
  const all = SUFFIXES
    .flatMap((suffix) => spellings(suffix.form).map((text) => ({ suffix, text })))
    .sort((a, b) => b.text.length - a.text.length);
  const by = new Map<string, Array<{ suffix: Suffix; text: string }>>();
  for (const s of all) by.set(s.text.at(-1) ?? '', [...(by.get(s.text.at(-1) ?? '') ?? []), s]);
  return by;
})();

const VOWELS = /[aeıioöuü]/;
const BACK = /[aıou]/;
const LAST_VOWEL = /[aeıioöuü](?=[^aeıioöuü]*$)/;

/** One reading of a word: what is left of it, and the suffixes taken off, from the stem outwards. */
export interface Reading {
  stem: string;
  suffixes: Array<{ suffix: Suffix; text: string }>;
}

/** The most suffixes a word is read with, the most readings kept of one word, and the most steps taken to find them. */
const DEEPEST = 7;
const MOST = 200;
const STEPS = 3000;

/**
 * Whether a chain of suffixes, from the stem outwards, is one Turkish puts together. `complete`: the chain
 * starts at the stem, so a suffix that must follow another (the m of değildim, after the past) has it.
 */
function wellFormed(chain: Reading['suffixes'], complete = true): boolean {
  let ended: Role | undefined;
  let verbal = false;
  for (const [i, { suffix }] of chain.entries()) {
    // After a tense, only who and the copula; after a converb, nothing.
    if (ended === 'converb') return false;
    if (ended === 'finite' && suffix.place < Place.Copula) return false;
    if (suffix.verbal && i > 0 && !chain[i - 1]!.suffix.verbal) return false;
    if (suffix.verbal) verbal = true;
    if (suffix.after && (complete || i > 0) && !(chain[i - 1]?.suffix.labels.some((l) => suffix.after!.includes(l)))) return false;
    if (suffix.place === Place.Verb) ended = suffix.role;
  }
  // A verb's voice or mood says nothing by itself: gelebil is no word, and okulda no passive of okumak.
  return !verbal || chain.some((s) => s.suffix.place === Place.Verb);
}

/**
 * Every way of reading a word as a stem and suffixes Turkish puts together,
 * the word itself first. Nothing here knows which stems are words.
 */
export function turkishReadings(word: string): Reading[] {
  const out: Reading[] = [{ stem: word, suffixes: [] }];
  let steps = 0;
  const walk = (rest: string, below: number, chain: Reading['suffixes']): void => {
    if (out.length >= MOST || chain.length >= DEEPEST) return;
    for (const spelt of SPELT.get(rest.at(-1) ?? '') ?? []) {
      if (spelt.suffix.place >= below || !rest.endsWith(spelt.text) || rest.length - spelt.text.length < 1) continue;
      if (++steps > STEPS) return;
      const stem = rest.slice(0, -spelt.text.length);
      // A stem has a vowel, but for de- and ye- before -Iyor: diyor, yiyor.
      if (!VOWELS.test(stem) && !(spelt.suffix.labels.includes('ongoing') && stem.length === 1)) continue;
      const next = [spelt, ...chain];
      if (!wellFormed(next, false)) continue;
      if (wellFormed(next)) out.push({ stem, suffixes: next });
      walk(stem, spelt.suffix.place, next);
    }
  };
  walk(word, Place.Person + 1, []);
  // The same letters may be two readings: geldi is gel- and the past, and et-ti etmek's past or et, "meat", and "was".
  const same = (a: Reading, b: Reading): boolean =>
    a.stem === b.stem && a.suffixes.length === b.suffixes.length && a.suffixes.every((s, i) => s.suffix === b.suffixes[i]?.suffix && s.text === b.suffixes[i]?.text);
  return out.filter((r, i) => out.findIndex((o) => same(o, r)) === i);
}

/** The dictionary form a stem is looked up as: a verb's with -mak or -mek, by its last vowel. */
const infinitive = (stem: string): string => `${stem}${BACK.test(LAST_VOWEL.exec(stem)?.[0] ?? 'a') ? 'mak' : 'mek'}`;

/**
 * The stems a stem may stand for. A stem's last p, ç, t or k is written b,
 * c, d or ğ before a vowel (kitabı, gidiyor); a verb's last a or e is ı, i,
 * u or ü before -Iyor (bekliyor is bekle-, diyor de-).
 */
function stemsOf(r: Reading): string[] {
  const first = r.suffixes[0]?.text ?? '';
  const out = [r.stem];
  if (VOWELS.test(first[0] ?? '')) {
    const soft: Record<string, string> = { b: 'p', c: 'ç', d: 't', ğ: 'k', g: 'k' };
    const last = r.stem.at(-1) ?? '';
    if (soft[last]) out.push(r.stem.slice(0, -1) + soft[last]);
  }
  if (r.suffixes[0]?.suffix.labels.includes('ongoing') && /^[ıiuü]/.test(first)) {
    out.push(`${r.stem}a`, `${r.stem}e`);
  }
  return out;
}

/** One reading of a word, as the keys to ask the dictionary about. */
export interface TurkishAttached extends Attached {
  /** How many letters are the stem as written. */
  stemLength: number;
  /** The suffixes taken off, from the stem outwards. */
  suffixes: readonly Suffix[];
}

const APOSTROPHE = /['’]/;

/**
 * What a word may be: for each reading of it (turkishReadings), each stem it
 * may stand for as the dictionary keys it — a verb's infinitive where the
 * suffixes are a verb's — with the suffixes named. A name with its suffixes
 * after an apostrophe (Ankara'da, Tom'un) is the name.
 */
export function turkishSplits(word: string): TurkishAttached[] {
  const apostrophe = APOSTROPHE.exec(word);
  if (apostrophe) {
    const name = word.slice(0, apostrophe.index);
    const after = word.slice(apostrophe.index + 1).toLocaleLowerCase('tr');
    // Read on the name, whose vowels the suffixes follow.
    const stem = name.toLocaleLowerCase('tr');
    const chain = turkishReadings(`${stem}${after}`).find((r) => r.stem === stem && r.suffixes.every((s) => !s.suffix.verbal));
    return name
      ? [{
        key: name, parts: [name, after], adds: chain?.suffixes.flatMap((s) => s.suffix.labels) ?? [], stemLength: name.length,
        suffixes: chain?.suffixes.map((s) => s.suffix) ?? [],
      }]
      : [];
  }
  const lower = word.toLocaleLowerCase('tr');
  const out: TurkishAttached[] = [];
  for (const r of turkishReadings(lower)) {
    if (!r.suffixes.length) continue;
    const verbal = r.suffixes[0]!.suffix.verbal;
    // A place or a people the dictionary writes with a capital: Fransaya is Fransa, Almancamı Almanca. Not a short
    // one, which is as often a name with nothing on it: Maria, Jane.
    const cased = word.slice(0, r.stem.length);
    const capital = !verbal && cased !== r.stem && cased.toLocaleLowerCase('tr') === r.stem && cased.length >= CAPITALISED;
    const stems = [...stemsOf(r), ...(capital ? [cased] : [])];
    for (const stem of stems) {
      out.push({
        key: verbal ? infinitive(stem) : stem,
        parts: [r.stem, ...r.suffixes.map((s) => s.text)],
        adds: r.suffixes.flatMap((s) => s.suffix.labels),
        stemLength: r.stem.length,
        suffixes: r.suffixes.map((s) => s.suffix),
      });
    }
  }
  return out;
}

/**
 * Which reading of a Turkish word to take, once the dictionary has answered
 * for the word and every key turkishSplits gave: null for the word as it
 * is, with nothing to name.
 *
 * A word the dictionary has in its own right is that word: gerçekten,
 * "really", is no ablative of gerçek. A word its table lists as a form of
 * some word is that word, and the reading of it that leads there names its
 * suffixes: evde is ev, and "locative". A word in neither is read the way
 * whose stem the dictionary has: the longest stem first (kalemim is kalem
 * and "my", not kal- and two endings), a verb where the same letters are
 * read both ways (etti is etmek's past, not et, "meat", and "was"), then the
 * fewest suffixes. A stem that is itself a form of a shorter one is read
 * through to it, as below.
 */
export function chooseTurkish(word: string, forms: Forms, opening = true): TurkishAttached | null {
  const splits = turkishSplits(word);
  if (APOSTROPHE.test(word)) return splits[0] ?? null;
  const lower = word.toLocaleLowerCase('tr');
  const here = forms[lower] ?? forms[word];
  if (here?.word) return null;
  // A capital inside a sentence is a name's: Dan is no form of da.
  if (!here && !opening && lower !== word) return null;
  const has = (key: string): boolean => !NOT_STEMS.has(key) && Boolean(forms[key]?.word || forms[key]?.of.some((o) => (o.senses ?? 0) > 0));
  const verbal = (s: TurkishAttached): boolean => s.key !== s.parts[0] && /m[ae]k$/.test(s.key) && !forms[s.parts.join('')]?.word;
  /**
   * A plural before the present of a verb made with -lA from the same noun: çiçekler is "flowers", not "it
   * flowers"; but başlar "it begins", of a verb said far more than baş, "head", is said in the plural.
   */
  const lAr = (s: TurkishAttached): boolean => {
    const plain = s.adds.length === 1 && s.adds[0] === 'habitual' && /l[ae]m[ae]k$/.test(s.key);
    return plain && !SAID_MORE.has(s.key) && splits.some((o) => o.adds.join() === 'plural' && has(o.key) && `${o.key}l` === s.parts[0]!.slice(0, -1));
  };
  /**
   * A stem the table lists as a form of a word another reading reaches with a shorter stem is read through to
   * that word where that word is a verb (gelmedi is gelmek, "negative", "past", and not gelme, "coming", and
   * "was"), or where both are little words (kimin is kim and "of", though kimi, "some", is a word). A noun is
   * not: adamı is adam, though the table lists adam as ada and "my".
   */
  const found = splits.filter((s) => has(s.key));
  const little = (key: string): boolean => (forms[key]?.kind ?? []).some((k) => LITTLE.has(k));
  /** The reading a stem is read through to, if it is, and why: both little words, a verb, or a stem only a form. */
  const to = (s: TurkishAttached): { reading: TurkishAttached; why: 'little' | 'verb' | 'form' } | undefined => {
    if (OWN_STEMS.has(s.key)) return undefined;
    const of = forms[s.key]?.of.map((o) => o.lemma) ?? [];
    const shorter = found.filter((o) => o.stemLength < s.stemLength && of.includes(o.key));
    const pair = little(s.key) ? shorter.find((o) => little(o.key)) : undefined;
    if (pair) return { reading: pair, why: 'little' };
    // Through a verb's negative, tense or -mA, not a participle a noun is made with: alanında is alan, "field",
    // and gelecekte gelecek, "the future".
    const verb = shorter.find((o) => verbal(o) && !NOUN_MAKING.has(o.suffixes[inside(o, s.stemLength)]!));
    if (verb) return { reading: verb, why: 'verb' };
    // A stem that is only a form is read through to the word it is a form of, the one the dictionary says most
    // of: yolunu is yol, "your", not yolun, whose word the table leaves to a guess (yolmak, "to pluck").
    if (forms[s.key]?.word) return undefined;
    const word = shorter
      .filter((o) => forms[o.key]?.word)
      .sort((a, b) => (forms[b.key]?.senses ?? 0) - (forms[a.key]?.senses ?? 0) || b.key.length - a.key.length)[0];
    return word ? { reading: word, why: 'form' } : undefined;
  };
  // Little words read through are read so before any other reading: kimin is kim and "of", not kimi and "your".
  const targets = new Set(found.map(to).filter((t) => t?.why === 'little').map((t) => t!.reading));
  // Each reading as it is ranked. A stem only a form stands for its word, ranked where the stem was: onunla is o,
  // "of", "with", where onun is, before onu and "your"; birini is still biri and "acc.", not bir and two endings.
  const entries = found
    .filter((s) => !lAr(s) && !ABLE.test(s.key))
    .flatMap((s) => {
      const t = to(s);
      if (!t) return [{ s, length: s.stemLength }];
      return t.why === 'form' ? [{ s: t.reading, length: s.stemLength }] : [];
    });
  const ranked = entries
    .map((e, at) => ({ ...e, at }))
    .sort((a, b) =>
      (targets.has(b.s) ? 1 : 0) - (targets.has(a.s) ? 1 : 0)
      || b.length - a.length
      || (verbal(b.s) ? 1 : 0) - (verbal(a.s) ? 1 : 0)
      || a.s.adds.length - b.s.adds.length
      || a.at - b.at)
    .map((x) => x.s);
  // vardı is var and "was", "there was", before it is varmak's "arrived".
  const there = ranked.find((s) => THERE_IS.has(s.key));
  if (there) return there;
  if (here) {
    // One of the commonest verbs is that verb, whatever the table says: it files biliyorsun under bilemek alone.
    // Not through a passive: görünüyor is görünmek, "to seem", not görmek.
    const common = ranked.find((s) => (TURKISH.first as readonly string[]).includes(s.key) && !s.adds.includes('passive'));
    if (common) return common;
    // The table says what it is a form of, and a reading of it leads to one of those: etti is etmek's past, and
    // no more et, "meat", and "was", than adamı is ada, "island", and two endings.
    const of = new Set(here.of.map((o) => o.lemma));
    const leads = (key: string): boolean => of.has(key) || Boolean(forms[key]?.of.some((o) => of.has(o.lemma)));
    return ranked.find((s) => leads(s.key)) ?? null;
  }
  return ranked[0] ?? null;
}

/** The participles nouns are made with: alan, "field"; gelecek, "the future". */
const NOUN_MAKING: ReadonlySet<Suffix> = new Set(SUFFIXES.filter((s) => s.role === 'nominal' && /^(?:(y)AcAK|(y)An)$/.test(s.form)));

/** The fewest letters a stem is tried with a capital in. */
const CAPITALISED = 5;

/** Which of a reading's suffixes ends the first `length` letters of the word: the last suffix of a shorter stem. */
function inside(s: TurkishAttached, length: number): number {
  let at = s.parts[0]!.length;
  for (let i = 1; i < s.parts.length; i++) {
    at += s.parts[i]!.length;
    if (at >= length) return i - 1;
  }
  return s.parts.length - 2;
}

/** Words read as themselves inside a longer word, though the table lists them as a form of a shorter one: birini is biri, "someone", not bir. */
const OWN_STEMS = new Set(['biri', 'birisi']);

/** A verb with "can" made one: alabilmek is almak and -Abil, which is read as a suffix. */
const ABLE = /[ae]bilmek$/;

/** Kinds of word with a fixed stock. */
const LITTLE = new Set(['pron', 'det', 'adv', 'ptcl', 'conj', 'postp', 'intj']);

/** Verbs in -lAmAk said more than the noun they are made from is said in the plural: başlar, anlar, bekler. */
const SAID_MORE = new Set(['başlamak', 'anlamak', 'beklemek', 'söylemek', 'dinlemek', 'izlemek', 'hazırlamak', 'temizlemek']);

/** "There is" and "there is not", read with the copula before any verb they are spelt like (vardı, varsa). */
const THERE_IS = new Set(['var', 'yok']);

/**
 * Words of their own that are something else inside a longer word: olmadığını is "that it is not", of olmak, and
 * neydi "what was", of ne, though olmadık, "unheard of", and ney, "a reed flute", are words; işten is "from
 * work", not işte, "here it is"; bu yüzden "for this reason", not yüzde, "percent"; ondan "from him", not on,
 * "ten", and bunu "this", not bun, "distress". Each by its count on Tatoeba.
 */
const NOT_STEMS = new Set(['olmadık', 'ney', 'işte', 'yüzde', 'gözde', 'mis', 'on', 'bun', 'şun']);

/** The pieces as the line writes them: the stem as written, its first letter in its own case, then the suffixes. */
export function turkishPieces(surface: string, parts: readonly string[]): string[] {
  const out: string[] = [];
  let at = 0;
  for (const part of parts) {
    out.push(surface.slice(at, at + part.length));
    at += part.length;
    // The apostrophe stays with what comes after it.
    if (APOSTROPHE.test(surface[at] ?? '')) at++;
  }
  return out;
}

/**
 * A word as the dictionary may also key it: without the circumflex, which subtitles mostly leave off (şikayet,
 * imkansız) and the dictionary writes (şikâyet, imkânsız). The dictionary keeps each word under this key as well.
 */
export function foldTurkish(word: string): string {
  return word.replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').replace(/Â/g, 'A').replace(/Î/g, 'İ').replace(/Û/g, 'U');
}

/** Turkish's suffixes, for the segmenter (AttachedRules in lemma.ts). */
export const TURKISH_SUFFIXES: AttachedRules = { split: turkishSplits, choose: chooseTurkish, written: turkishPieces };

/** Every label the suffixes are named with: each named in the interface (src/i18n/en/grammar.ts), whole or word by word. */
export const TURKISH_LABELS: readonly string[] = [...new Set(SUFFIXES.flatMap((s) => s.labels))];
