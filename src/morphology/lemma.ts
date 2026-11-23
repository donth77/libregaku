import { LineCache } from './analyser';
import {
  adjectiveStem, compoundKeys, deeperKeys, derivedOf, formKeys, joinedKeys, participleOf, prefixVerb, splitCompound, stemKeys,
  type CompoundRules,
} from './compound';
import { hyphenKeys, joinHyphenated } from './hyphen';
import { joinSeparable, separableKeys } from './separable';
import { IntlSegmenter } from './intl';
import type { RubySegment, Segmenter, Token } from './types';

/**
 * Tier 1 — a language written with spaces, whose words inflect.
 *
 * Finding the words is the browser's job (Intl.Segmenter). Finding each one's
 * dictionary form is the dictionary's: Wiktionary lists every inflected form
 * with the word it is a form of, so hablábamos resolves to hablar with no
 * analyser at all. The table lives with the dictionary, in the offscreen
 * document; this asks it once for a whole line.
 */

/** What the dictionary knows of a written form (FormInfo in src/dict/store.ts). */
export interface FormInfo {
  /** It is a headword in its own right. */
  word: boolean;
  /** How many meanings it has as one: the nearest thing the dictionary has to how common it is. */
  senses?: number;
  /** What kinds of word it is, in the dictionary's codes: n, v, prep. */
  kind?: string[];
  /** What it is a form of, where it is one, each with how many meanings that word has. */
  of: Array<{ lemma: string; tags: string[]; pos?: string; senses?: number; spellingOf?: string[] }>;
}

export type Forms = Record<string, FormInfo>;

/** What the offscreen document answers a 'dict-forms' with. */
interface FormsAnswer {
  ok?: boolean;
  forms?: Forms;
}

/**
 * Relations that say how a spelling stands to another, not how a word
 * inflects: fue is listed as an old spelling of fué as well as a form of ir
 * and ser, and a learner hovering fue wants the verb.
 */
const SPELLING = new Set([
  'alt-of', 'alternative', 'archaic', 'obsolete', 'dated', 'misspelling', 'nonstandard', 'rare',
  'pronunciation-spelling', 'eye-dialect', 'informal', 'superseded', 'uncommon', 'dialectal',
  // Italian i, the article, is filed as the lower case of I, the letter, as well as a form of il.
  'lowercase',
]);

const isSpelling = (tags: readonly string[]): boolean => tags.length > 0 && tags.every((t) => SPELLING.has(t));

/**
 * The words Wiktionary describes a form with, that the interface has names
 * for (src/i18n/en/grammar.ts): each reading of a form is a run of them, and
 * a word not listed here — a rare one, or prose — shows as the dictionary
 * wrote it.
 */
export const FORM_LABELS: readonly string[] = [
  'or',
  'first-person', 'second-person', 'third-person', 'singular', 'plural', 'masculine', 'feminine',
  'present', 'preterite', 'imperfect', 'imperfect-se', 'future', 'conditional-mood', 'past',
  'indicative', 'subjunctive', 'imperative', 'negative', 'infinitive', 'gerund', 'participle',
  'formal', 'informal', 'with-tú', 'with-vos', 'vos-form', 'voseo', 'second-person-semantically',
  'accusative', 'dative', 'object-first-person', 'object-second-person', 'object-third-person',
  'object-singular', 'object-plural', 'diminutive', 'augmentative', 'superlative', 'alternative', 'alt-of',
  // French and German: the cases are renamed by the hints (LemmaHints.renamed), since accusative and dative above are Spanish pronouns.
  'nominative', 'genitive', 'accusative-case', 'dative-case', 'neuter', 'definite', 'indefinite', 'comparative',
  'strong', 'weak', 'mixed', 'without-article', 'reflexive',
  // Arabic.
  'non-past', 'dual', 'jussive', 'construct',
];

/**
 * Words the dictionary uses that an ending's label elsewhere already means
 * something else by: a Spanish conditional is a mood ("would speak"), where
 * the Japanese one is an "if". Each gets a label of its own, so a
 * translation can name the two differently.
 */
const RENAMED: Record<string, string> = { conditional: 'conditional-mood' };

/** One reading of a form as a label: the dictionary's words for it, in its order. */
const labelOf = (tags: readonly string[], renamed: Readonly<Record<string, string>> = {}, omit: readonly string[] = []): string =>
  tags.join(' ').split(/\s+/).filter(Boolean)
    // The dictionary runs choices together: "strong/weak/mixed" is three, each one to leave off.
    .map((w) => w.split('/').filter((x) => !omit.includes(x)).map((x) => renamed[x] ?? RENAMED[x] ?? x).join('/'))
    .filter(Boolean).join(' ');

/**
 * The readings one label holds. The dictionary runs two together with
 * slashes — "first/third-person singular imperfect indicative" is the first
 * person and the third — and a card says each on its own: the n-th reading
 * takes the n-th choice wherever there is one.
 */
function readings(label: string): string[] {
  const words = label.split(' ').map((w) => w.split('/'));
  const n = Math.max(1, ...words.map((choices) => choices.length));
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const reading = words.map((choices) => {
      const word = choices[Math.min(k, choices.length - 1)] ?? '';
      // "first/third-person": the ending belongs to both.
      const ending = /-person$/.exec(choices[choices.length - 1] ?? '')?.[0];
      return ending && !word.endsWith(ending) ? word + ending : word;
    }).join(' ');
    if (!out.includes(reading)) out.push(reading);
  }
  return out;
}

/** The same reading whatever order its words come in: "indicative preterite", "preterite indicative". */
const sameAs = (label: string): string => label.split(' ').sort().join(' ');

/** A word's dictionary form, and what the form on screen is of it. */
export interface Lemma {
  lemma: string;
  /**
   * What the ending says, one label for each way the form can be read:
   * "first-person plural imperfect indicative". Then "or ser", for another
   * word it may be a form of. Each word of a label is named in the interface
   * language where it has a name (grammarLabel, src/i18n).
   */
  inflections: string[];
  /** Dictionary keys to try, best first. */
  lookup: string[];
}

/** How many ways of reading one form the card names. */
const NAMED = 2;

/**
 * What a language's forms need said of them that its dictionary does not
 * say. The dictionary lists what a form can be and never how often it is
 * each; for a handful of verbs that settles it.
 */
export interface LemmaHints {
  /**
   * Verbs so common that a conjugated form of one is the verb, even where it
   * is also a noun: era is "was" before it is "era", son "are" before
   * "sound". In order of preference, where a form belongs to two: fue is ser
   * before ir.
   */
  first: readonly string[];
  /**
   * Other verbs to prefer, most common first: over a rarer verb a form
   * belongs to just as well (creo is creer, "I believe", before crear, "I
   * create"), and over a noun of the same spelling that is seldom meant
   * (mira is "look!" before it is "a gunsight").
   */
  common: readonly string[];
  /**
   * Verbs a participle follows: in ha pasado and he hecho the second word
   * is the verb, not the noun or adjective it also is.
   */
  auxiliaries: readonly string[];
  /**
   * Words the dictionary describes a form with that mean something else here
   * than the interface's name for them: Spanish accusative is a pronoun's, "with
   * a direct object"; German's is a case. Each is given a label of its own.
   */
  renamed?: Readonly<Record<string, string>>;
  /**
   * The articles and personal pronouns, in the forms the dictionary has them as
   * (lemmas): the words the Underline articles and pronouns setting is about.
   */
  grammar?: readonly string[];
  /**
   * Words that are themselves before they are a form of a common verb: French
   * puis is "then" far more often than "I can". Only on counted evidence.
   */
  keep?: readonly string[];
  /**
   * Words of a form's description a learner has no use for, left off the card:
   * with them, the one reading "accusative singular masculine" is three, strong,
   * weak and mixed, which differ only in which article goes before the word.
   */
  omit?: readonly string[];
  /**
   * The pronouns that name who does a verb, each with the person and number
   * the verb after it is in: je is "first-person singular". A form that can be
   * read as two persons — connaissais is je and tu — is read as the one the
   * pronoun before it says. A pronoun that is more than one person (sie) is left out.
   */
  subjects?: Readonly<Record<string, string>>;
  /** Little words that may come between the pronoun and its verb: je ne connaissais, je le connaissais. */
  between?: readonly string[];
  /**
   * A pronoun leads to no verb: a language that says "he a student", with no verb at all (Arabic هو طالب), where
   * reading the word after a pronoun as a verb makes كل, "all", a form of أكل, "to eat".
   */
  noVerbAfterPronoun?: boolean;
}

const NO_HINTS: LemmaHints = { first: [], common: [], auxiliaries: [] };

/** A word an unknown one may be by its ending, and what the ending makes of it, in the dictionary's words for forms. */
export interface Ending {
  key: string;
  label?: string;
}

/**
 * A word with little words written onto it, read as the word in the middle: Arabic وبكتابه is و, ب, كتاب and ه
 * (arabic.ts). The labels are the interface's names for what each piece adds (src/i18n/en/grammar.ts).
 */
export interface Attached {
  /** The dictionary key of the word in the middle. */
  key: string;
  /** The word in pieces, as the dictionary's keys write them. */
  parts: string[];
  /** What the pieces other than the word add, in order: "attached-and", "definite"; "locative". */
  adds: string[];
  /** What the piece behind adds, if there is one: on a noun (whose it is), and on any other word (who it is done to). */
  after?: readonly [string, string];
  /** A word the one in the middle must be read as a form of, by the dictionary's words for it: after Arabic س, "non-past". */
  formOf?: string;
}

/** How a language that writes little words onto others is read (Attached). */
export interface AttachedRules {
  /** The ways a word may be read without them, each a key to ask the dictionary for. */
  split(word: string): Attached[];
  /**
   * Which way to read it, once the dictionary has answered for the word and those keys: null for the word as
   * written. `opening`: it opens a sentence, so a capital says nothing of it.
   */
  choose(word: string, forms: Forms, opening: boolean): Attached | null;
  /** The pieces as the line writes them, vowels and all. */
  written(surface: string, parts: readonly string[]): string[];
}

/**
 * Kinds of word a language has a fixed stock of: como, para, entre, una, nada.
 * A form that is one of these is that word nearly every time it is said,
 * whatever verb it also happens to be a form of.
 */
const CLOSED = new Set(['prep', 'conj', 'artic', 'det', 'pron', 'contr', 'ptcl', 'adv', 'num']);
/** Kinds that name or describe a thing — what follows "the" or "my". */
const NOMINAL = new Set(['n', 'np', 'ns', 'adj', 'name', 'num']);
/** Kinds after which a noun is expected: el, una, mi, tres. */
const BEFORE_NOUN = new Set(['artic', 'det', 'num']);
/** Kinds nobody makes a card for: el, la, un, del, al. Looked up like any word, never counted as one to learn. */
const NOT_VOCABULARY = new Set(['artic', 'contr']);
/**
 * A word of grammar and not of vocabulary: an article or a contraction, whatever
 * else it is spelt like (la is also a note), or a word of the language's own
 * list of articles and personal pronouns (LemmaHints.grammar). The list and not
 * the dictionary's labels: it calls tu a particle as well, ce a determiner, and
 * alles and quelqu'un pronouns, so going by them left je skipped and tu not.
 */
export function grammatical(kind: readonly string[], words: readonly string[], hints?: LemmaHints): boolean {
  if (kind.some((k) => NOT_VOCABULARY.has(k))) return true;
  const list = hints?.grammar;
  return Boolean(list && words.some((w) => list.includes(w.toLocaleLowerCase())));
}

/**
 * A reading with a person in it is a conjugated verb: "third-person
 * singular present indicative". The dictionary runs two readings together
 * with a slash — "first/third-person singular imperfect" — so a slash ends
 * a word as a space does.
 */
const PERSON = /(?:^|[ /])(?:first|second|third)-person(?:[ /]|$)/;
const MOOD = /(?:^|[ /])(?:subjunctive|imperative)(?:[ /]|$)/;
const PARTICIPLE = /(?:^|[ /])participle(?:[ /]|$)/;
const NONFINITE = /(?:^|[ /])(?:participle|gerund|infinitive)(?:[ /]|$)/;

/**
 * How ordinary a way of being a form is, 3 to 1: a plain statement (habla,
 * casas) before a participle or gerund, and those before a wish or a
 * command — vive is "lives" before it is "may he cheer", and cosas "things"
 * before "may you sew".
 */
function ordinary(label: string): number {
  if (MOOD.test(label)) return 1;
  if (NONFINITE.test(label)) return 2;
  return 3;
}

/** One word a form may be, and how it would be that word. */
interface Candidate {
  lemma: string;
  /** The form is this word itself, not a form of it. */
  self: boolean;
  /** How much the dictionary says of the word: its meanings. */
  weight: number;
  nominal: boolean;
  verbal: boolean;
  /** The ways the form is an inflection of it, each as a label, in the dictionary's order. */
  said: string[];
  /** The ways it is only another spelling of it: fue for fué. */
  spelt: string[];
  /** Where it stood in the dictionary's order. */
  at: number;
  /** The words this one is only another way of writing: connaitre, of connaître. */
  variantOf: string[];
}

/**
 * Which kind of word the one before leads to expect: a noun after "mi", a
 * verb after "se" — and 'article' after a word that is an article and
 * nothing else (el, un, una), which a noun follows without doubt. la, lo,
 * los and las are articles and also the pronouns before a verb (lo he
 * visto, la ve), so they lead to a noun only as "mi" does. After a form of
 * haber comes a participle.
 */
export type Expecting = 'article' | 'noun' | 'verb' | 'participle' | undefined;

/** The best of some candidates by a list of measures, each breaking ties in the one before; higher is better. */
function best(of: Candidate[], ...measures: Array<(c: Candidate) => number>): Candidate | undefined {
  return [...of].sort((a, b) => {
    for (const m of measures) {
      const d = m(b) - m(a);
      if (d) return d;
    }
    return a.at - b.at;
  })[0];
}

/**
 * The dictionary form of one word, from what the table says of it.
 *
 * Spanish forms are often two words at once — casa is "house" and "marries",
 * era "was" and "era", es "is" and the plural of the letter e — and the
 * dictionary has no count of how often each is meant. So, in turn:
 *
 *  1. After an article — el, un, una — a noun stays itself: el vino, una
 *     era, el son.
 *  2. A conjugated form of one of the language's commonest verbs is that
 *     verb (`hints.first`): es, era, son, he, van. A participle is left out
 *     of this — estados is "states" — and a wish or command gives way to a
 *     word of rule 3: fuera is "outside" before "were it".
 *  3. A word of a kind the language has a fixed stock of stays itself: como
 *     is "as" before it is "I eat", entre "between" before "may he enter".
 *  4. What the word before leads to expect: after se or me a verb (se
 *     casa), after mi or los a noun. And before all of these, after a form
 *     of haber, a participle: ha pasado, he visto.
 *  5. A word that is also a conjugated form of a common verb, and seldom
 *     meant as the noun, is the verb (`hints.common`): mira, espera, llama.
 *  6. A word in its own right stays itself: casa, cuenta, trabajo.
 *  7. Of the words it is a form of: an inflection before a respelling, the
 *     plainest reading first (cosas is "things" before "may you sew"), then
 *     the most direct (niñas is the plural of niña before the feminine
 *     plural of niño), then the more common word where the hints say, then
 *     the one the dictionary says more about.
 *
 * Whatever is chosen, the card names the others ("or ser"), and they stay a
 * lookup away. A capital is tried as written, then in lower case, except
 * where it says nothing: the first word of a sentence, or a line all in
 * capitals.
 */
export function lemmaOf(
  surface: string,
  forms: Forms,
  opts: { first?: boolean; locale?: string; expecting?: Expecting; hints?: LemmaHints; person?: string } = {},
): Lemma {
  const hints = opts.hints ?? NO_HINTS;
  const lower = surface.toLocaleLowerCase(opts.locale);
  const shouted = surface.length > 1 && surface === surface.toLocaleUpperCase(opts.locale);
  const spellings = lower === surface ? [surface] : opts.first || shouted ? [lower, surface] : [surface, lower];
  const form = spellings.find((s) => forms[s]);
  const info = form ? forms[form] : undefined;
  if (!form || !info) return { lemma: surface, inflections: [], lookup: [surface] };

  // Each word once, in the dictionary's order. A saying the form happens to
  // stand in — "al pan, pan, y al vino, vino" — is not a word it is a form of.
  const ways = info.of.filter((o) => !/\s/.test(o.lemma));
  const candidates: Candidate[] = [];
  if (info.word) {
    const kind = info.kind ?? [];
    candidates.push({
      lemma: form, self: true, weight: info.senses ?? 1, said: [], spelt: [], at: 0, variantOf: [],
      nominal: kind.some((k) => NOMINAL.has(k)), verbal: kind.includes('v'),
    });
  }
  for (const way of ways) {
    if (way.lemma === form) continue;
    let c = candidates.find((x) => !x.self && x.lemma === way.lemma);
    if (!c) {
      c = {
        lemma: way.lemma, self: false, weight: way.senses ?? 1, said: [], spelt: [], nominal: false, verbal: false,
        at: candidates.length, variantOf: way.spellingOf ?? [],
      };
      candidates.push(c);
    }
    c.nominal ||= NOMINAL.has(way.pos ?? '');
    c.verbal ||= way.pos === 'v';
    const label = labelOf(way.tags, hints.renamed, hints.omit);
    const into = isSpelling(way.tags) ? c.spelt : c.said;
    if (label && !into.includes(label)) into.push(label);
  }
  // A "word" the dictionary has no entry for — her, an old form of haber — is no candidate beside one it has.
  const real = candidates.filter((c) => c.weight > 0);
  const pool = real.length ? real : candidates;
  const self = pool.find((c) => c.self);
  const others = pool.filter((c) => !c.self);

  const plainest = (c: Candidate): number => Math.max(0, ...c.said.map(ordinary));
  // Fewest words to say it: "plural" before "plural feminine".
  const direct = (c: Candidate): number => -Math.min(99, ...c.said.map((s) => s.split(' ').length));
  const rank = (list: readonly string[]) => (c: Candidate): number => {
    const i = list.indexOf(c.lemma);
    return i < 0 ? -1 : list.length - i;
  };
  const closest = (of: Candidate[]): Candidate | undefined =>
    best(of, (c) => Number(c.said.length > 0), plainest, direct, rank(hints.common), (c) => c.weight);
  /** The forms of a verb that are it at work: conjugated, or a gerund — not a participle, which is as often a noun. */
  const working = (c: Candidate): string[] => c.said.filter((s) => (PERSON.test(s) || NONFINITE.test(s)) && !PARTICIPLE.test(s));
  /** The commonest verbs the form is a working form of, best first — plainly so when `plainly`. */
  const commonest = (list: readonly string[], plainly: boolean): Candidate | undefined =>
    best(
      others.filter((c) => list.includes(c.lemma) && working(c).some((s) => !plainly || ordinary(s) > 1)),
      (c) => Math.max(0, ...working(c).map(ordinary)), rank(list),
    );
  const closed = self && (info.kind ?? []).some((k) => CLOSED.has(k)) ? self : undefined;

  const chosen =
    // ha visto, he hecho: after haber, the participle — visto is ver's, before it is "I dress".
    (opts.expecting === 'participle'
      ? best(others.filter((c) => c.said.some((s) => PARTICIPLE.test(s))), rank(hints.first), rank(hints.common), (c) => c.weight)
      : undefined) ??
    // 1. el vino, una era.
    (opts.expecting === 'article' && self?.nominal ? self : undefined) ??
    // 2. es, era, son: a form of ser, haber, ir — unless it is only a wish or a command and a word like "outside" besides.
    (hints.keep?.includes(form) ? self : undefined) ??
    commonest(hints.first, Boolean(closed)) ??
    // 3. como, para, entre.
    closed ??
    // 4. se casa, ha pasado; los estados.
    // (A word that is itself a verb stays so: German wir tun is tun, not a form of tunen.)
    (opts.expecting === 'verb' ? (self?.verbal ? self : closest(pool.filter((c) => c.verbal && !c.self))) : undefined) ??
    (opts.expecting === 'article' || opts.expecting === 'noun'
      ? (self?.nominal ? self : closest(others.filter((c) => c.nominal)))
      : undefined) ??
    // 5. mira, espera, llama.
    (self ? commonest(hints.common, false) : undefined) ??
    // 6. casa, cuenta, trabajo.
    self ??
    // 7. cosas, niñas, creo.
    closest(others);
  if (!chosen) return { lemma: form, inflections: [], lookup: [form] };

  const rest = pool.filter((c) => c !== chosen).map((c) => c.lemma);
  const lookup = [...new Set([chosen.lemma, ...rest, ...candidates.map((c) => c.lemma), form])];
  if (chosen.self) return { lemma: form, inflections: [], lookup };

  // Each reading once, the plainest first: "present/preterite" beside "present" and "preterite" says nothing new.
  const said: string[] = [];
  for (const reading of (chosen.said.length ? chosen.said : chosen.spelt).flatMap(readings)) {
    if (!said.some((s) => sameAs(s) === sameAs(reading))) said.push(reading);
  }
  // After a pronoun, the reading in its person: je connaissais is first-person, though tu connaissais is the same word.
  const person = opts.person?.split(' ') ?? [];
  const inPerson = person.length ? said.filter((r) => person.every((w) => r.split(' ').includes(w))) : said;
  const inflections = (inPerson.length ? inPerson : said).sort((a, b) => ordinary(b) - ordinary(a)).slice(0, NAMED);
  // A word that is only another way of writing the chosen one is no other word to name.
  const named = rest.filter((name) => !pool.find((c) => c.lemma === name)?.variantOf.includes(chosen.lemma));
  for (const other of named.slice(0, NAMED)) inflections.push(`or ${other}`);
  return { lemma: chosen.lemma, inflections, lookup };
}

/** What a word leads the next one to be: a noun after an article, a verb after a pronoun, a participle after an auxiliary. */
function leads(lemma: string, info: FormInfo | undefined, hints: LemmaHints): Expecting {
  if (hints.auxiliaries.includes(lemma)) return 'participle';
  const kind = info?.kind ?? [];
  if (kind.includes('artic') && !kind.includes('pron')) return 'article';
  if (kind.some((k) => BEFORE_NOUN.has(k))) return 'noun';
  if (kind.includes('pron') && !hints.noVerbAfterPronoun) return 'verb';
  return undefined;
}

/** Ends a sentence, or opens one: the word after it is capitalised whatever it is. */
const BREAK = /[.!?¡¿…:;«»"“”—–\n]\s*$/;
const DIGITS = /^[\d.,]+$/;

/**
 * Boundaries from the browser, dictionary forms from `forms`. Its own
 * function so the choice of lemma can be tested without a dictionary.
 */
export function lemmaTokens(
  tokens: Token[], forms: Forms, locale?: string, hints?: LemmaHints, fold: (surface: string) => string = (s) => s,
  /** Count articles and pronouns as words to learn (the Underline articles and pronouns setting). */
  grammarCounts = false,
): Token[] {
  let first = true;
  let expecting: Expecting;
  /** Who the pronoun before says does the verb, until a word that is neither. */
  let subject: string | undefined;
  return tokens.map((t) => {
    if (t.punct) {
      if (BREAK.test(t.surface)) first = true;
      // Only a space leaves two words next to each other.
      if (t.surface.trim()) {
        expecting = undefined;
        subject = undefined;
      }
      return t;
    }
    const word = fold(t.surface).toLocaleLowerCase(locale);
    const says = hints?.subjects?.[word];
    // The person is the first pronoun's: il nous connaissait is "il", and nous is what he knew.
    const person = subject;
    if (says && !subject) subject = says;
    else if (!hints?.between?.includes(word)) subject = undefined;
    const opening = first;
    first = false;
    if (DIGITS.test(t.surface)) {
      expecting = 'noun';   // tres casas, 3 casas
      return { ...t, content: false };
    }
    // The dictionary writes l' one way; a line may write it another.
    const key = fold(t.surface);
    const found = lemmaOf(key, forms, { first: opening, locale, expecting, hints, ...(person && !says ? { person } : {}) });
    const info = forms[found.lemma];
    expecting = leads(found.lemma, info, hints ?? NO_HINTS);
    return {
      ...t,
      // As Japanese particles are: drawn and looked up, never underlined as new.
      content: grammarCounts || !grammatical(info?.kind ?? [], [found.lemma, key], hints),
      lemma: found.lemma,
      lookup: found.lookup.map((key) => ({ key })),
      // The card's trace reads "hablábamos → hablar"; a word in its own form has none.
      ...(found.lemma !== key && found.inflections.length
        ? { parts: [t.surface], inflections: found.inflections }
        : {}),
    };
  });
}

export class LemmaSegmenter implements Segmenter {
  readonly tier = 1 as const;
  readonly hasLemma = true;

  readonly #locale: string;
  readonly #hints: LemmaHints | undefined;
  readonly #prepare: (tokens: Token[]) => Token[];
  readonly #fold: (surface: string) => string;
  readonly #grammarCounts: () => boolean;
  readonly #compounds: CompoundRules | undefined;
  readonly #joinHyphens: boolean | { apart: RegExp };
  readonly #endings: ((word: string) => Ending[]) | undefined;
  readonly #respell: ((word: string) => string) | undefined;
  readonly #attached: AttachedRules | undefined;
  /** What the lines kept were analysed with: a change of the setting starts them over. */
  #counted = false;
  readonly #words: IntlSegmenter;
  #cache = new LineCache();

  /**
   * `prepare` reshapes the browser's words before the dictionary is asked, for
   * a language that writes two words as one (French: l'eau); `fold` writes a
   * word as the dictionary does.
   */
  constructor(
    locale: string, hints?: LemmaHints,
    opts: {
      prepare?: (tokens: Token[]) => Token[];
      fold?: (surface: string) => string;
      /** Whether articles and pronouns count as words to learn, asked at each line: a setting. */
      grammarCounts?: () => boolean;
      /** Cut a word the dictionary lacks into the words it has (compound.ts). */
      compounds?: CompoundRules;
      /**
       * Put back together a hyphenated word the dictionary has, and one it has not that is made of words
       * it has, except where a part matches this (hyphen.ts). `true` joins only the first kind.
       */
      joinHyphens?: boolean | { apart: RegExp };
      /**
       * For a word the dictionary has nothing for, the words it may be by its ending, each tried in turn: Hindi
       * आइए is आना, "come, please". The first the dictionary has is the word.
       */
      endings?: (word: string) => Ending[];
      /**
       * Another key to find a word by, where the dictionary has nothing under it as it is written: Hindi writes
       * one word several ways (foldHindi), and the dictionary keeps each word under the key as well.
       */
      respell?: (word: string) => string;
      /** Little words written onto a word, read off it: Arabic و, ب and ال in front, its pronouns behind (Attached). */
      attached?: AttachedRules;
    } = {},
  ) {
    this.#locale = locale;
    this.#hints = hints;
    this.#prepare = opts.prepare ?? ((tokens) => tokens);
    this.#fold = opts.fold ?? ((surface) => surface);
    this.#grammarCounts = opts.grammarCounts ?? (() => false);
    this.#compounds = opts.compounds;
    this.#joinHyphens = opts.joinHyphens ?? false;
    this.#endings = opts.endings;
    this.#respell = opts.respell;
    this.#attached = opts.attached;
    this.#words = new IntlSegmenter(locale);
  }

  async segment(text: string): Promise<Token[]> {
    const counts = this.#grammarCounts();
    if (counts !== this.#counted) {
      this.#counted = counts;
      this.#cache = new LineCache();
    }
    const hit = this.#cache.get(text);
    if (hit) return hit;
    let tokens = this.#prepare(this.#words.segment(text));
    const asked = new Set<string>();
    if (this.#joinHyphens) for (const k of hyphenKeys(tokens, this.#fold, this.#locale)) asked.add(k);
    for (const t of tokens) {
      if (t.punct) continue;
      const key = this.#fold(t.surface);
      asked.add(key);
      asked.add(key.toLocaleLowerCase(this.#locale));
      if (this.#respell) asked.add(this.#respell(key));
    }
    if (!asked.size) return tokens;

    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'dict-forms',
      forms: [...asked],
    })) as FormsAnswer | undefined;
    // The dictionary is still coming: boundaries for now, and not kept, so
    // the line gains its dictionary forms once the table is in.
    if (!res?.ok || !res.forms) return tokens;
    if (this.#joinHyphens) {
      tokens = joinHyphenated(tokens, res.forms, this.#fold, this.#locale, this.#joinHyphens === true ? undefined : this.#joinHyphens.apart);
    }
    const { forms, look } = this.#respell ? await this.#respelt(tokens, res.forms, this.#respell) : { forms: res.forms, look: this.#fold };
    let out = lemmaTokens(tokens, forms, this.#locale, this.#hints, look, counts);
    if (this.#compounds) out = await this.#cutCompounds(out, forms, this.#compounds);
    if (this.#compounds?.verbPrefixes) out = await this.#joinSeparated(out, this.#compounds);
    if (this.#endings) out = await this.#byEnding(out, forms, this.#endings, look);
    if (this.#attached) out = await this.#unattached(out, forms, this.#attached, counts);
    this.#cache.set(text, out);
    return out;
  }

  /**
   * Where the dictionary has nothing for a word as it is written, the word its other key (`respell`) leads to.
   * A key the dictionary keeps as another spelling of one word is read as that word, which is asked about in
   * turn: बिलकुल is बिल्कुल. A key that is only forms' is read as those forms. A word the dictionary has as
   * written is read as written, whatever else shares its key: पत्नी is "wife", though its key is also a form's.
   */
  async #respelt(tokens: Token[], forms: Forms, respell: (word: string) => string): Promise<{ forms: Forms; look: (surface: string) => string }> {
    const known = (key: string): boolean => Boolean(forms[key] || forms[key.toLocaleLowerCase(this.#locale)]);
    const spelling = (key: string): string => {
      if (known(key)) return key;
      const other = respell(key);
      const info = forms[other];
      // Nothing under the key either: the word as written, not the key, which is no spelling of anything.
      if (!info) return key;
      return info.of.find((o) => o.tags.length === 1 && o.tags[0] === 'alternative' && (o.senses ?? 0) > 0)?.lemma ?? other;
    };
    const wanted = new Set<string>();
    for (const t of tokens) {
      if (t.punct) continue;
      const word = spelling(this.#fold(t.surface));
      if (!forms[word]) wanted.add(word);
    }
    let all = forms;
    if (wanted.size) {
      const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-forms', forms: [...wanted].slice(0, 400) })) as
        | FormsAnswer | undefined;
      if (res?.ok && res.forms) all = { ...forms, ...res.forms };
    }
    return { forms: all, look: (surface) => spelling(this.#fold(surface)) };
  }

  /** Words the dictionary has nothing for, read as the word their ending says they are a form of, where it has that one. */
  async #byEnding(tokens: Token[], forms: Forms, endings: (word: string) => Ending[], look: (surface: string) => string): Promise<Token[]> {
    const lower = (s: string): string => look(s).toLocaleLowerCase(this.#locale);
    const tries = new Map<Token, Ending[]>();
    for (const t of tokens) {
      if (t.punct || forms[look(t.surface)] || forms[lower(t.surface)]) continue;
      const list = endings(this.#fold(t.surface));
      // As written, and by the other key: मुसकुराइए is मुस्कुराना.
      if (list.length) tries.set(t, this.#respell ? list.flatMap((e) => [e, { ...e, key: this.#respell!(e.key) }]) : list);
    }
    if (!tries.size) return tokens;
    const keys = [...new Set([...tries.values()].flatMap((list) => list.map((e) => e.key)))];
    const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-forms', forms: keys.slice(0, 400) })) as
      | FormsAnswer | undefined;
    const known = res?.ok ? res.forms : undefined;
    if (!known) return tokens;
    // The word under a key: itself, or the word it is a form or another spelling of (a Hindi key, foldHindi).
    const wordAt = (key: string): string | undefined => {
      const info = known[key];
      return info?.word ? key : info?.of.find((o) => (o.senses ?? 0) > 0)?.lemma;
    };
    return tokens.map((t) => {
      for (const e of tries.get(t) ?? []) {
        const lemma = wordAt(e.key);
        if (lemma) return { ...t, lemma, lookup: [{ key: lemma }], ...(e.label ? { inflections: [e.label] } : {}) };
      }
      return t;
    });
  }

  /**
   * Each word read without the little words written onto it, where the language's rules (AttachedRules) say to:
   * the word in the middle is the lemma, looked up and matched to cards, and the card names what the rest add.
   */
  async #unattached(tokens: Token[], forms: Forms, rules: AttachedRules, counts: boolean): Promise<Token[]> {
    const keys = new Set<string>();
    for (const t of tokens) if (!t.punct) for (const c of rules.split(t.surface)) if (!forms[c.key]) keys.add(c.key);
    const known: Forms = { ...forms };
    const asked = [...keys];
    for (let i = 0; i < asked.length; i += ASKED_AT_ONCE) {
      const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-forms', forms: asked.slice(i, i + ASKED_AT_ONCE) })) as
        | FormsAnswer | undefined;
      if (!res?.ok || !res.forms) return tokens;
      Object.assign(known, res.forms);
    }
    let opening = true;
    return tokens.map((t) => {
      if (t.punct) {
        if (BREAK.test(t.surface)) opening = true;
        return t;
      }
      const first = opening;
      opening = false;
      const c = rules.choose(t.surface, known, first);
      if (!c) return t;
      // Only its forms of that kind, where it has some: سأذهب is a form of ذهب, though أذهب is a word too.
      const as = c.formOf ? known[c.key]?.of.filter((o) => o.tags.some((t) => t.split(' ').includes(c.formOf!))) ?? [] : [];
      const read = as.length ? { ...known, [c.key]: { ...known[c.key]!, word: false, of: as } } : known;
      const found = lemmaOf(c.key, read, { locale: this.#locale, hints: this.#hints });
      const info = known[c.key];
      // What the word is, for what the pronoun behind it says: a noun's owner, or whoever a verb or preposition is about.
      const kind = found.lemma === c.key ? info?.kind?.[0] : info?.of.find((o) => o.lemma === found.lemma)?.pos;
      const after = c.after ? [NOMINAL.has(kind ?? '') ? c.after[0] : c.after[1]] : [];
      const lemmaKind = known[found.lemma]?.kind ?? (found.lemma === c.key ? info?.kind : undefined) ?? [];
      return {
        ...t,
        content: counts || !grammatical(lemmaKind, [found.lemma], this.#hints),
        lemma: found.lemma,
        lookup: found.lookup.map((key) => ({ key })),
        parts: rules.written(t.surface, c.parts),
        inflections: [...c.adds, ...after, ...found.inflections],
      };
    });
  }

  /** A verb and its prefix at the other end of the clause, read as the one verb the dictionary has: gehe ... weg. */
  async #joinSeparated(tokens: Token[], rules: CompoundRules): Promise<Token[]> {
    const keys = separableKeys(tokens, rules);
    if (!keys.length) return tokens;
    const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-forms', forms: keys.slice(0, 400) })) as
      | FormsAnswer | undefined;
    return res?.ok && res.forms ? joinSeparable(tokens, res.forms, rules) : tokens;
  }

  /** Words the dictionary has nothing for, cut in two where both halves are words it has. */
  async #cutCompounds(tokens: Token[], forms: Forms, rules: CompoundRules): Promise<Token[]> {
    const lower = (s: string): string => this.#fold(s).toLocaleLowerCase(this.#locale);
    const unknown = tokens.filter((t) =>
      !t.punct && /^\p{L}+$/u.test(t.surface) && t.surface.length >= rules.minPart * 2
      && !forms[this.#fold(t.surface)] && !forms[lower(t.surface)]);
    if (!unknown.length) return tokens;
    const asked = new Set<string>();
    for (const t of unknown.slice(0, COMPOUNDS_PER_LINE)) {
      for (const k of compoundKeys(t.surface, rules)) asked.add(k);
      for (const k of stemKeys(t.surface, rules)) asked.add(k);
      for (const k of formKeys(t.surface, rules)) asked.add(k);
    }
    const ask = async (keys: Iterable<string>): Promise<Forms | null> => {
      const res = (await chrome.runtime.sendMessage({
        target: 'offscreen', type: 'dict-forms', forms: [...keys].slice(0, 400),
      })) as FormsAnswer | undefined;
      return res?.ok && res.forms ? res.forms : null;
    };
    const known = await ask(asked);
    if (!known) return tokens;
    // Longer ones (Donaudampfschiff): the first part, itself a compound, needs its own parts asked about.
    const lacking = unknown.slice(0, COMPOUNDS_PER_LINE).filter((t) => !splitCompound(t.surface, known, rules, 1));
    const deeper = new Set(lacking.flatMap((t) => deeperKeys(t.surface, known, rules)));
    // And the verb with its prefix, which can only be asked about once the verb is known.
    for (const t of unknown.slice(0, COMPOUNDS_PER_LINE)) for (const k of joinedKeys(t.surface, known, rules)) deeper.add(k);
    if (deeper.size) Object.assign(known, (await ask(deeper)) ?? {});
    return tokens.map((t) => {
      if (!unknown.includes(t)) return t;
      // An adjective with an ending the dictionary has not listed: knorpeligen, of knorpelig.
      const stem = adjectiveStem(t.surface, known, rules);
      if (stem) {
        return { ...t, lemma: stem.lemma, lookup: [{ key: stem.lemma }], parts: [t.surface], ...(stem.label ? { inflections: [stem.label] } : {}) };
      }
      const parted = (c: { parts: string[]; lemmas: string[] }): Token =>
        ({ ...t, parts: [...c.parts], compound: c.lemmas, lookup: c.lemmas.slice().reverse().map((key) => ({ key })) });
      // A form the dictionary does not list of a verb it has: wackelnden, abzuspeichern.
      const verb: ReturnType<typeof prefixVerb> = participleOf(t.surface, known, rules) ?? prefixVerb(t.surface, known, rules);
      if (verb?.parts) return parted(verb.parts);
      if (verb) {
        return { ...t, lemma: verb.lemma, lookup: [{ key: verb.lemma }], parts: [t.surface], ...(verb.label ? { inflections: [verb.label] } : {}) };
      }
      const cut = splitCompound(t.surface, known, rules) ?? derivedOf(t.surface, known, rules);
      if (!cut) return t;
      return { ...t, parts: [...cut.parts], compound: cut.lemmas, lookup: cut.lemmas.slice().reverse().map((key) => ({ key })) };
    });
  }

  ruby(surface: string): RubySegment[] {
    return [{ text: surface }];
  }
}

/** How many keys one message to the dictionary asks about. */
const ASKED_AT_ONCE = 400;

/** How many words of one line are tried for a compound: a line of names is not a line of compounds. */
const COMPOUNDS_PER_LINE = 4;
