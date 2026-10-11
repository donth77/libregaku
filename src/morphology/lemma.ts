import { LineCache } from './analyser';
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
];

/**
 * Words the dictionary uses that an ending's label elsewhere already means
 * something else by: a Spanish conditional is a mood ("would speak"), where
 * the Japanese one is an "if". Each gets a label of its own, so a
 * translation can name the two differently.
 */
const RENAMED: Record<string, string> = { conditional: 'conditional-mood' };

/** One reading of a form as a label: the dictionary's words for it, in its order. */
const labelOf = (tags: readonly string[], renamed: Readonly<Record<string, string>> = {}): string =>
  tags.join(' ').split(/\s+/).filter(Boolean)
    .map((w) => w.split('/').map((x) => renamed[x] ?? RENAMED[x] ?? x).join('/')).join(' ');

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
   * The pronouns that name who does a verb, each with the person and number
   * the verb after it is in: je is "first-person singular". A form that can be
   * read as two persons — connaissais is je and tu — is read as the one the
   * pronoun before it says. A pronoun that is more than one person (sie) is left out.
   */
  subjects?: Readonly<Record<string, string>>;
  /** Little words that may come between the pronoun and its verb: je ne connaissais, je le connaissais. */
  between?: readonly string[];
}

const NO_HINTS: LemmaHints = { first: [], common: [], auxiliaries: [] };

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
    const label = labelOf(way.tags, hints.renamed);
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
  if (kind.includes('pron')) return 'verb';
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
      content: !(info?.kind ?? []).some((k) => NOT_VOCABULARY.has(k)),
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
  readonly #words: IntlSegmenter;
  readonly #cache = new LineCache();

  /**
   * `prepare` reshapes the browser's words before the dictionary is asked, for
   * a language that writes two words as one (French: l'eau); `fold` writes a
   * word as the dictionary does.
   */
  constructor(
    locale: string, hints?: LemmaHints,
    opts: { prepare?: (tokens: Token[]) => Token[]; fold?: (surface: string) => string } = {},
  ) {
    this.#locale = locale;
    this.#hints = hints;
    this.#prepare = opts.prepare ?? ((tokens) => tokens);
    this.#fold = opts.fold ?? ((surface) => surface);
    this.#words = new IntlSegmenter(locale);
  }

  async segment(text: string): Promise<Token[]> {
    const hit = this.#cache.get(text);
    if (hit) return hit;
    const tokens = this.#prepare(this.#words.segment(text));
    const asked = new Set<string>();
    for (const t of tokens) {
      if (t.punct) continue;
      const key = this.#fold(t.surface);
      asked.add(key);
      asked.add(key.toLocaleLowerCase(this.#locale));
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
    const out = lemmaTokens(tokens, res.forms, this.#locale, this.#hints, this.#fold);
    this.#cache.set(text, out);
    return out;
  }

  ruby(surface: string): RubySegment[] {
    return [{ text: surface }];
  }
}
