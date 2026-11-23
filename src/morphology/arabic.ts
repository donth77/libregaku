import type { Attached, AttachedRules, Forms, LemmaHints } from './lemma';

/**
 * Arabic, as Wiktionary's table of forms reads it (lemma.ts), with what is
 * written onto a word taken off.
 *
 * The dictionary's keys are written without vowels, as subtitles mostly are:
 * كتاب, not كِتَاب. A line that has some is read without them.
 *
 * Arabic writes the little words of a sentence onto the word they go with.
 * وبكتابه is و "and", ب "with", كتاب "book" and ه "his": one word on screen,
 * and the dictionary has كتاب. In front, in this order, may come أ (a
 * question), و or ف ("and", "so"), then one of ب, ل and ك ("with", "for",
 * "like") or س (the future, before a verb), then ال ("the"). Behind come the
 * pronouns: ي "my" or "me", ك "your" or "you", ه "his" or "him", and the
 * rest. ل and ال together are written لل, and a word in ة writes it ت before
 * a pronoun (مدرسة, مدرستي), as على and the others in ى write it ي (عليه).
 */

/** Vowel marks, shadda, sukun, tanwin, the dagger alif, Quranic marks and the stretch (tatweel). */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;

/**
 * A word as the dictionary's keys write it: without its vowels. A hamza on
 * its letter stays (أ, ؤ, ئ). The Persian ی and ک, which a Persian keyboard
 * types for the Arabic letters, are read as those.
 */
export function foldArabic(word: string): string {
  return word.normalize('NFC').replace(MARKS, '').replace(/ی/g, 'ي').replace(/ک/g, 'ك');
}

export const ARABIC: LemmaHints = {
  /*
   * The commonest verbs, whose forms are those verbs before anything else they are: كنت is "I was", not a form
   * of كنى; أعط is "give!", though the dictionary says more of عط, "to tear"; تعرف "you know", not "to get
   * acquainted"; يمكن "it is possible", of أمكن and not مكن.
   */
  first: [
    'كان', 'ليس', 'أعطى', 'أمكن', 'أحب', 'وجد', 'أراد', 'استطاع', 'قال', 'عرف', 'رأى', 'جاء', 'أتى', 'أخذ', 'أخبر', 'أصبح', 'فعل',
    'ذهب', 'أعجب', 'وجب', 'عاش', 'درس',
  ],
  common: [],
  // Words before they are a short form of one of those: أقل "less", نقل "to move", فعلا "indeed", جد "grandfather".
  keep: ['أقل', 'نقل', 'فعلا', 'جد'],
  noVerbAfterPronoun: true,
  auxiliaries: [],
  // The pronouns standing alone. Those written onto a word are said on its card.
  grammar: ['أنا', 'أنت', 'هو', 'هي', 'نحن', 'أنتم', 'أنتن', 'أنتما', 'هم', 'هن', 'هما'],
  // The case is a word's last vowel, which subtitles do not write: الكتابُ, الكتابَ and الكتابِ look the same.
  omit: ['nominative', 'accusative', 'genitive', 'genitive/accusative', 'nominative/genitive/accusative', 'nominative/genitive',
    'triptote', 'diptote', 'informal', 'invariable', 'sound-form', 'broken-form', 'ar-infl-a', 'ar-infl-in', 'ar-infl-ah',
    'ar-infl-an-maksura', 'ar-infl-an-alef', 'ar-infl-awna'],
};

/** What may be written in front of a word, in this order, and what each adds (src/i18n/en/grammar.ts). */
const QUESTION: readonly [string, string] = ['أ', 'question'];
const CONJUNCTIONS: ReadonlyArray<readonly [string, string]> = [['و', 'attached-and'], ['ف', 'attached-so']];
const PREPOSITIONS: ReadonlyArray<readonly [string, string]> = [['ب', 'attached-with'], ['ل', 'attached-for'], ['ك', 'attached-like']];
const FUTURE: readonly [string, string] = ['س', 'future'];
/** What a verb in the present starts with, which is what س goes before. */
const PRESENT = /^[يتأآن]/;
const ARTICLE = 'ال';

/**
 * Behind a word: the pronouns, longest first so كم is not read as ك. Each
 * with what it says on a noun (whose it is) and on a verb or a preposition
 * (who it is done to): كتابي "my book", يحبني "loves me", لي "for me".
 */
const PRONOUNS: ReadonlyArray<readonly [string, string, string]> = [
  ['كما', 'attached-your', 'attached-you'],
  ['هما', 'attached-their', 'attached-them'],
  ['كم', 'attached-your', 'attached-you'],
  ['كن', 'attached-your', 'attached-you'],
  ['هم', 'attached-their', 'attached-them'],
  ['هن', 'attached-their', 'attached-them'],
  ['ها', 'attached-her', 'attached-her-object'],
  ['نا', 'attached-our', 'attached-us'],
  ['ني', 'attached-me', 'attached-me'],
  ['ك', 'attached-your', 'attached-you'],
  ['ه', 'attached-his', 'attached-him'],
  ['ي', 'attached-my', 'attached-me'],
];

/** The shortest a word is with everything taken off it. */
const SHORTEST = 2;

/**
 * Little words no pronoun is written onto: ياني is a name, not يا and ني. عل, "perhaps", takes one only after
 * ل (لعلي), and علي is على and ي.
 */
const NO_PRONOUN = new Set(['يا', 'لا', 'ما', 'هل', 'قد', 'لم', 'لن', 'ثم', 'أو', 'بل', 'كي', 'حتى', 'إذا', 'لو', 'عل']);

/** One way of reading a word as a shorter one with pieces written onto it. */
export interface Clitics extends Attached {
  /** The key is spelt otherwise than the line spells it: إلى for الى. */
  respelt?: boolean;
  /** The key is so spelt only if it is a little word: على as علي before a pronoun. */
  ifLittle?: boolean;
}

/**
 * How the word itself is spelt where a pronoun follows it: مدرست of مدرسة, علي of على, ترا of ترى, كتبو of
 * كتبوا, أصدقائ of أصدقاء.
 */
function unjoined(stem: string, pronoun: string): Array<{ key: string; ifLittle?: boolean }> {
  const out: Array<{ key: string; ifLittle?: boolean }> = [{ key: stem }];
  // على and ي are written علي (عليّ): the word's last letter and the pronoun are one.
  if (pronoun === 'ي') out.push({ key: `${stem}ى`, ifLittle: true });
  // A noun takes ني no more than it takes ة written ت: وعدتني is وعدت, "you promised", and ني.
  if (stem.endsWith('ت') && pronoun !== 'ني') out.push({ key: `${stem.slice(0, -1)}ة` });
  if (stem.endsWith('ي')) out.push({ key: `${stem.slice(0, -1)}ى`, ifLittle: true });
  if (stem.endsWith('ا')) out.push({ key: `${stem.slice(0, -1)}ى` });
  if (stem.endsWith('آ')) out.push({ key: `${stem.slice(0, -1)}أى` });
  if (stem.endsWith('و')) out.push({ key: `${stem}ا` });
  if (stem.endsWith('ئ') || stem.endsWith('ؤ')) out.push({ key: `${stem.slice(0, -1)}ء` });
  return out;
}

/**
 * Other ways a word is written, for one the dictionary has nothing for:
 * subtitles leave off the hamza (الى, انت) or add one where none is written
 * (إسم), end a word in ي or ه where the dictionary writes ى or ة (فى,
 * العربيه), and write the accusative's alif on a word the dictionary lists
 * without it (مسبقا, of مسبق).
 */
function respellings(word: string): string[] {
  const out: string[] = [];
  const first = word[0] ?? '';
  const rest = word.slice(1);
  if (first === 'ا') out.push(`أ${rest}`, `إ${rest}`, `آ${rest}`);
  if (first === 'أ' || first === 'إ') out.push(`ا${rest}`);
  for (const w of [word, ...out]) {
    if (w.endsWith('ي')) out.push(`${w.slice(0, -1)}ى`);
    if (w.endsWith('ى')) out.push(`${w.slice(0, -1)}ي`);
    if (w.endsWith('ه')) out.push(`${w.slice(0, -1)}ة`);
  }
  if (word.length > SHORTEST + 1 && word.endsWith('ا') && !word.endsWith('وا')) out.push(word.slice(0, -1));
  // شئ for شيء; and an adjective's feminine the dictionary lists only as the masculine: خائبة, خائب.
  if (word.endsWith('ئ')) out.push(`${word.slice(0, -1)}يء`);
  if (word.length > SHORTEST + 1 && word.endsWith('ة')) out.push(word.slice(0, -1));
  return [...new Set(out)].filter((w) => w !== word);
}

/**
 * The words an Arabic word may be with what is written onto it taken off,
 * fewest pieces first: بإمكانك is ب, إمكان and ك. Each is a key to ask the
 * dictionary for, with the pieces as written. The word as written is among
 * them only respelt (respellings); as written, it is asked about first, as
 * any word is.
 */
export function arabicClitics(word: string): Clitics[] {
  const w = foldArabic(word);
  const out: Clitics[] = [];
  const same = (a: Clitics, b: Clitics): boolean => a.key === b.key && a.parts.join('|') === b.parts.join('|');
  const add = (c: Clitics, alone = false): void => {
    if (!alone && c.key.length < SHORTEST) return;
    if (c.after && NO_PRONOUN.has(c.key)) return;
    if (!out.some((o) => same(o, c))) out.push(c);
  };
  const fronts: Array<{ pieces: string[]; labels: string[]; rest: string; asked: boolean }> = [];
  for (const [q, qLabel] of [['', ''] as const, QUESTION]) {
    if (!w.startsWith(q)) continue;
    for (const [conj, conjLabel] of [['', ''] as const, ...CONJUNCTIONS]) {
      const afterConj = w.slice(q.length);
      if (!afterConj.startsWith(conj)) continue;
      for (const [prep, prepLabel] of [['', ''] as const, ...PREPOSITIONS, FUTURE]) {
        const rest = afterConj.slice(conj.length);
        if (!rest.startsWith(prep)) continue;
        if (prep === FUTURE[0] && !PRESENT.test(rest.slice(prep.length))) continue;
        fronts.push({
          pieces: [q, conj, prep].filter(Boolean), labels: [qLabel, conjLabel, prepLabel].filter(Boolean), rest: rest.slice(prep.length), asked: Boolean(q),
        });
      }
    }
  }
  for (const { pieces: front, labels: adds, rest, asked } of fronts) {
    const prep = front.at(-1) ?? '';
    // After س, a verb in the present: سأذهب is ذهب's, not أذهب, "to make go".
    const future = prep === FUTURE[0] ? { formOf: 'non-past' } : {};
    if (front.length && rest.length >= SHORTEST) add({ key: rest, parts: [...front, rest], adds, ...future });
    // ال, or the ل left of it after ل: للبيت is ل, ل and بيت. Asked with it (البيت, a form the dictionary lists) and without.
    const article = prep === FUTURE[0] ? '' : prep === 'ل' && rest.startsWith('ل') && !rest.startsWith(ARTICLE) ? 'ل' : rest.startsWith(ARTICLE) ? ARTICLE : '';
    if (article) {
      const noun = rest.slice(article.length);
      if (noun.length >= SHORTEST) {
        add({ key: `${ARTICLE}${noun}`, parts: [...front, article, noun], adds });
        add({ key: noun, parts: [...front, article, noun], adds: [...adds, 'definite'] });
      }
      continue;
    }
    for (const pronoun of PRONOUNS) {
      const [end] = pronoun;
      if (!rest.endsWith(end)) continue;
      const stem = rest.slice(0, -end.length);
      // لي, بك, لنا: the preposition and its pronoun, and nothing else.
      if (!stem && !asked && (prep === 'ب' || prep === 'ل')) {
        add({ key: prep, parts: [...front, end], adds: adds.slice(0, -1), after: [pronoun[2], pronoun[2]] }, true);
      }
      if (stem.length < SHORTEST) continue;
      for (const { key, ifLittle } of unjoined(stem, end)) {
        add({ key, parts: [...front, stem, end], adds, after: [pronoun[1], pronoun[2]], ...(ifLittle ? { ifLittle } : {}), ...future });
      }
    }
  }
  // Each spelt as the dictionary may spell it, after every way as the line spells it: ب and الى is بإلى.
  const respelt: Clitics[] = [{ key: w, parts: [w], adds: [] }, ...out].flatMap((c) => respellings(c.key).map((key) => ({ ...c, key, respelt: true })));
  for (const c of respelt) if (!out.some((o) => same(o, c))) out.push(c);
  const pieces = (c: Clitics): number => c.parts.length;
  return out.sort((a, b) => pieces(a) - pieces(b));
}

/** Kinds of word with a fixed stock, which a pronoun is written onto: لي, عليه, أنه, معك. */
const LITTLE = new Set(['prep', 'conj', 'ptcl', 'pron', 'det', 'prep-phrase']);
/** Kinds of entry that are no word to read a line's word as: ان, a suffix; a letter's name. */
const NO_WORD = new Set(['suf', 'pref', 'char', 'r']);

/**
 * Which reading of an Arabic word to take, given what the dictionary has for
 * the word as written and for every key `arabicClitics` gave: null to read it
 * as written.
 *
 * A word the dictionary has nothing for is read the way with the fewest
 * pieces; of those, a little word in the middle first (بذلك is ب and ذلك, not
 * بذل and ك), then a word the dictionary has in its own right over a form of
 * one, then a spelling as the line has it over one respelt.
 *
 * A word it has is read as it is, except where it is a pronoun on a little
 * word and the word as written is no little word itself: لي is "for me",
 * not a verb, لك "for you", not varnish, and أنه "that he", though the
 * dictionary lists each as a form of some rare verb. ذلك and لكن are little
 * words in their own right and stay so.
 */
export function chooseClitics(word: string, forms: Forms): Clitics | null {
  const w = foldArabic(word);
  const has = (key: string): boolean => {
    const info = forms[key];
    return Boolean(info && ((info.word && (info.kind ?? []).some((k) => !NO_WORD.has(k))) || info.of.some((o) => (o.senses ?? 0) > 0)));
  };
  const little = (key: string): boolean => (forms[key]?.kind ?? []).some((k) => LITTLE.has(k));
  const verbal = (key: string): boolean => Boolean(forms[key]?.kind?.includes('v') || forms[key]?.of.some((o) => o.pos === 'v'));
  // ني, "me", goes on a verb, or on من, عن and the like: جيراني is جيران and ي, not جيرا and ني.
  const fits = (c: Clitics): boolean => (!c.ifLittle || little(c.key)) && (c.parts.at(-1) !== 'ني' || verbal(c.key) || little(c.key));
  const options = arabicClitics(w).filter((c) => has(c.key) && fits(c));
  if (!options.length) return null;
  // Spelt as the line has it; fewest pieces; a little word or an adverb in the middle (أهناك is أ and هناك); no
  // question (أبيه is أبي and ه, not أ and بيه); a word in its own right.
  const adverb = (key: string): boolean => Boolean(forms[key]?.kind?.includes('adv'));
  const score = (c: Clitics): number[] => [
    c.respelt ? 1 : 0, c.parts.length, little(c.key) || adverb(c.key) ? 0 : 1, c.adds[0] === QUESTION[1] ? 1 : 0,
    forms[c.key]?.word ? 0 : 1,
  ];
  const ranked = options
    .map((c, at) => ({ c, s: [...score(c), at] }))
    .sort((a, b) => {
      for (let i = 0; i < a.s.length; i++) {
        const d = (a.s[i] ?? 0) - (b.s[i] ?? 0);
        if (d) return d;
      }
      return 0;
    })
    .map((x) => x.c);
  if (!has(w)) return ranked[0] ?? null;
  if (little(w)) return null;
  return ranked.find((c) => c.after && !c.respelt && !c.adds.length && little(c.key)) ?? null;
}

/**
 * The pieces of a word as the line writes it, vowels and all, for pieces of
 * the word as the dictionary does: بِكِتَابِهِ in ب, كتاب and ه is بِ, كِتَابِ and هِ.
 */
export function writtenPieces(surface: string, pieces: readonly string[]): string[] {
  const out: string[] = pieces.map(() => '');
  let piece = 0;
  let left = (pieces[0] ?? '').length;
  for (const ch of surface.normalize('NFC')) {
    const letter = foldArabic(ch);
    if (letter && left === 0 && piece < pieces.length - 1) {
      piece++;
      left = (pieces[piece] ?? '').length;
    }
    out[piece] += ch;
    if (letter) left -= letter.length;
  }
  return out;
}

/** Arabic's little words, for the segmenter (AttachedRules in lemma.ts). */
export const ARABIC_ATTACHED: AttachedRules = { split: arabicClitics, choose: chooseClitics, written: writtenPieces };

/** Every label a reading of an Arabic word gives the pieces written onto it, each named in the interface (src/i18n/en/grammar.ts). */
export const ARABIC_LABELS: readonly string[] = [...new Set([
  QUESTION[1], ...CONJUNCTIONS.map(([, l]) => l), ...PREPOSITIONS.map(([, l]) => l), FUTURE[1], 'definite',
  ...PRONOUNS.flatMap(([, noun, other]) => [noun, other]),
])];
