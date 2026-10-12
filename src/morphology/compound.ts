import type { FormInfo, Forms } from './lemma';

/**
 * Words made of two words, which German makes without end: Riesenschlange is
 * Riese and Schlange, and no dictionary lists them all. A word the dictionary
 * has nothing for is cut in two where both halves are words it has, and the
 * card shows both.
 *
 * The last part is the word the whole is a kind of. What goes between parts
 * in the writing (Arbeit-s-zimmer, Hund-e-hütte) is allowed for. A first part
 * may itself be a compound (Donau-dampf-schiff), once; longer are left whole.
 */

export interface CompoundRules {
  /** The shortest a part can be: a split into pieces of a letter or two finds a word in anything. */
  minPart: number;
  /** What a compound may put between its parts. */
  links: readonly string[];
  /**
   * Little first parts allowed below `minPart`, written whole: ab, an, vor. A verb
   * with a prefix (abspeichern) is a compound of this kind, and no word is the
   * prefix's own.
   */
  prefixes?: readonly string[];
  /**
   * What a last part looks like when it is the ending of a participle and not a word: German
   * treibendes is not treib + endes. Only a first part that is a noun makes it a compound
   * again (Wochen + ende).
   */
  endings?: RegExp;
  /** What an adjective takes after it: knorpelig, knorpeligen. The dictionary lists some of them only. */
  adjectiveEndings?: readonly string[];
  /** What makes a verb's infinitive its present participle: German wackeln, wackelnd. */
  participle?: string;
  /** The prefixes a verb takes and parts with in a sentence: abspeichern, speichert ab. Longest first where one starts another. */
  verbPrefixes?: readonly string[];
  /** What goes between such a prefix and the verb for "to": ab-zu-speichern. */
  infinitiveMarker?: string;
  /** Endings that make a word of another, each a dictionary entry of its own with a hyphen before it: Knorpel, knorpel-ig. */
  suffixes?: readonly string[];
}

/** A word that is one of the dictionary's, in a form it does not list: the word, and what the form is of it. */
export interface Derived {
  lemma: string;
  /** The form's name, in the words the dictionary uses of forms it does list. */
  label?: string;
}

/** The parts of a compound, the last being what the whole is a kind of: each as it is written in the word and as the dictionary has it. */
export interface Compound {
  parts: string[];
  /** The dictionary's word for each part. */
  lemmas: string[];
}

const capital = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

/** The spellings a piece of a word may have in the dictionary. */
export const spellingsOf = (piece: string): string[] => [...new Set([piece, piece.toLowerCase(), capital(piece.toLowerCase())])];

/** Every way a part may be written in the dictionary: as written, in lower case, with a capital. */
const spellings = (part: string): string[] => [...new Set([part, part.toLowerCase(), capital(part.toLowerCase())])];

/** Where a word may be cut, as the pieces on each side of the cut. */
function cuts(word: string, rules: CompoundRules): Array<[left: string, right: string]> {
  const out: Array<[string, string]> = [];
  for (let i = 2; i <= word.length - rules.minPart; i++) {
    const left = word.slice(0, i);
    if (i >= rules.minPart || rules.prefixes?.includes(left.toLowerCase())) out.push([left, word.slice(i)]);
  }
  return out;
}

/** What a left part may be in the dictionary: itself, or itself without what links it to the next. */
function leftKeys(left: string, rules: CompoundRules): string[] {
  if (left.length < rules.minPart) return spellings(left).filter((k) => k === left.toLowerCase());
  const bare = rules.links
    .filter((link) => left.length - link.length >= rules.minPart && left.toLowerCase().endsWith(link))
    .map((link) => left.slice(0, left.length - link.length));
  return [...new Set([left, ...bare].flatMap(spellings))];
}

/** What an unknown word may be an adjective with an ending on: the spellings to ask about. */
export function stemKeys(word: string, rules: CompoundRules): string[] {
  const keys = new Set<string>();
  for (const ending of rules.adjectiveEndings ?? []) {
    if (word.length - ending.length >= rules.minPart && word.toLowerCase().endsWith(ending)) {
      keys.add(word.slice(0, word.length - ending.length).toLowerCase());
    }
  }
  return [...keys];
}

/**
 * The word an unknown one is a form of, by the adjective's ending on it:
 * pummeligen is pummelig. A participle takes the same endings, so geschrittenen
 * is schreiten's, and befallene the verb befallen's own.
 */
export function adjectiveStem(word: string, forms: Forms, rules: CompoundRules): Derived | null {
  // The longest ending first: -en before -e.
  for (const key of stemKeys(word, rules).sort((a, b) => a.length - b.length)) {
    const info = forms[key];
    if (info?.word && info.kind?.includes('adj')) return { lemma: key };
    const participle = info?.of.find((o) => o.pos === 'v' && (o.senses ?? 0) > 0 && o.tags.some((t) => /participle/.test(t)));
    // Which participle it is, as the dictionary says: wackelnd is the present one, geschritten the past.
    if (participle) return { lemma: participle.lemma, label: participle.tags.find((t) => /participle/.test(t)) ?? 'participle' };
    if (info?.word && info.kind?.includes('v')) return { lemma: key, label: 'past participle' };
  }
  return null;
}

/** The spellings to ask the dictionary about to find out whether a word is a compound. */
export function compoundKeys(word: string, rules: CompoundRules): string[] {
  const keys = new Set<string>();
  for (const [left, right] of cuts(word, rules)) {
    for (const k of leftKeys(left, rules)) keys.add(k);
    for (const k of spellings(right)) keys.add(k);
  }
  return [...keys];
}

/** The spellings to ask about for a word whose first part is a compound: those of each first part the last part leaves behind. */
export function deeperKeys(word: string, forms: Forms, rules: CompoundRules): string[] {
  const keys = new Set<string>();
  for (const [left, right] of cuts(word, rules)) {
    if (left.length < rules.minPart * 2) continue;
    if (!spellings(right).some((k) => lemmaIn(forms[k], k) && !isFunction(forms[k]))) continue;
    for (const k of compoundKeys(left, rules)) keys.add(k);
  }
  return [...keys];
}

/** How much the dictionary says of the word a form is, or of the form itself where it is a word. */
const weight = (info: FormInfo | undefined): number =>
  info?.word ? info.senses ?? 1 : Math.max(0, ...(info?.of ?? []).filter((o) => !/\s/.test(o.lemma)).map((o) => o.senses ?? 0));

/** The fewest letters a last part may have. */
const MIN_HEAD = 4;

/** Kinds of word that make no part of a compound: der, und, mit. */
const FUNCTION_WORDS = new Set(['artic', 'prep', 'conj', 'pron', 'det', 'contr', 'ptcl', 'intj', 'num']);

/**
 * The word a form is, as the dictionary has it: itself where it is a word,
 * else the word it is a form of. Riesen is a form of Riese and of Ries; the
 * one the dictionary says most of is the one meant.
 */
function lemmaIn(info: FormInfo | undefined, key: string): string | null {
  if (!info) return null;
  if (info.word) return key;
  const real = info.of.filter((o) => (o.senses ?? 0) > 0 && !/\s/.test(o.lemma));
  return real.sort((a, b) => (b.senses ?? 0) - (a.senses ?? 0))[0]?.lemma ?? null;
}

/**
 * The dictionary's word for one piece of a written word, where it has one: Alpha, version. The
 * spelling it says most of: Version, not version.
 */
export function wordOf(piece: string, forms: Forms): string | null {
  const keys = spellings(piece).filter((k) => lemmaIn(forms[k], k));
  const best = keys.sort((a, b) => weight(forms[b]) - weight(forms[a]))[0];
  return best ? lemmaIn(forms[best], best) : null;
}

const isFunction = (info: FormInfo | undefined): boolean => Boolean(info?.kind?.length && info.kind.every((k) => FUNCTION_WORDS.has(k)));

/** Whether the first part is a noun, in any of the spellings it may have. */
const isNoun = (forms: Forms, keys: readonly string[]): boolean =>
  keys.some((k) => forms[k]?.kind?.some((c) => c === 'n' || c === 'name') || forms[k]?.of.some((o) => o.pos === 'n'));

/**
 * The best way to cut a word in two, or null where there is none. Both parts
 * must be words the dictionary has, the last a word in its own right and
 * neither a little word of grammar. The longest last part wins: it is the
 * one that says what the whole is.
 */
export function splitCompound(word: string, forms: Forms, rules: CompoundRules, depth = 2): Compound | null {
  let best: { score: number; compound: Compound } | null = null;
  for (const [left, right] of cuts(word, rules)) {
    // The head is the last part: a word, or a form of one, as in Gruppen-sitzungen. In the case the whole is written in.
    // A last part of three letters is more often the ending of a word (treibendes: des) than a word.
    if (right.length < MIN_HEAD) continue;
    // The spelling the dictionary says most of: Kokosschalen is Schale (a shell) and not schal (stale), walnussgroßes
    // is groß and not Großes. Where it says as much of both, a noun compound has a capital and the rest do not.
    const heads = spellings(right).filter((k) => lemmaIn(forms[k], k) && !isFunction(forms[k]));
    const shout = word.charAt(0) === word.charAt(0).toUpperCase();
    const head = heads.sort((a, b) =>
      weight(forms[b]) - weight(forms[a])
      || Number(shout ? b === capital(b) : b === right) - Number(shout ? a === capital(a) : a === right))[0];
    const headLemma = head ? lemmaIn(forms[head], head) : null;
    if (!head || !headLemma) continue;
    // A participle's ending, not a word: treib-endes. Unless the part before it is a noun: Wochen-ende.
    const participle = Boolean(rules.endings?.test(right.toLowerCase()));
    // A first part that is a compound of its own: one part more, and worth less than a first part the dictionary has.
    const inner = depth > 1 && left.length >= rules.minPart * 2 && !participle ? splitCompound(left, forms, rules, depth - 1) : null;
    if (inner) {
      const score = right.length * 100 - 40;
      if (!best || score > best.score) {
        best = { score, compound: { parts: [...inner.parts, right], lemmas: [...inner.lemmas, headLemma] } };
      }
    }
    for (const key of leftKeys(left, rules)) {
      const info = forms[key];
      const lemma = lemmaIn(info, key);
      // A little prefix is a preposition or adverb as a word of its own, and is one part of the verb all the same.
      if (!lemma || (isFunction(info) && left.length >= rules.minPart)) continue;
      if (participle && !isNoun(forms, leftKeys(left, rules))) continue;
      const linked = key.length < left.length ? 1 : 0;
      // The head says what the word is, so the longest head wins; then the longer modifier, and no linking letter
      // if it can be done without. Written as it is in the word beats another case of it (Riesen, not riesen).
      const score = right.length * 100 + key.length * 10 - linked * 5 + (key === left ? 3 : key === capital(key) ? 2 : 0);
      if (!best || score > best.score) best = { score, compound: { parts: [left, right], lemmas: [lemma, headLemma] } };
    }
  }
  return best?.compound ?? null;
}

/* ── Forms the dictionary does not list ──────────────────────────── */

/** A word in lower case, as it is and without each ending an adjective takes: the longest left first. */
function stems(word: string, rules: CompoundRules): string[] {
  const lower = word.toLowerCase();
  const cut = (rules.adjectiveEndings ?? [])
    .filter((e) => lower.endsWith(e) && lower.length - e.length >= rules.minPart)
    .map((e) => lower.slice(0, lower.length - e.length));
  return [...new Set([lower, ...cut])].sort((a, b) => b.length - a.length);
}

const isVerb = (info: FormInfo | undefined): boolean => Boolean(info?.word && info.kind?.includes('v'));

/** The verbs a word may be the present participle of, to ask about: wackelnden is wackeln's. */
function participleVerbs(word: string, rules: CompoundRules): string[] {
  const mark = rules.participle;
  if (!mark) return [];
  return stems(word, rules).filter((s) => s.endsWith(mark)).map((s) => s.slice(0, s.length - mark.length));
}

/** The verb an unknown word is the present participle of: wackelnden, treibendes. */
export function participleOf(word: string, forms: Forms, rules: CompoundRules): Derived | null {
  const verb = participleVerbs(word, rules).find((v) => isVerb(forms[v]));
  return verb ? { lemma: verb, label: 'present participle' } : null;
}

/** The prefixes a word starts with, each with what follows it. */
function prefixed(word: string, rules: CompoundRules): Array<{ prefix: string; rest: string }> {
  const lower = word.toLowerCase();
  return (rules.verbPrefixes ?? [])
    .filter((p) => lower.startsWith(p) && lower.length - p.length >= rules.minPart)
    .map((prefix) => ({ prefix, rest: lower.slice(prefix.length) }));
}

/** What follows a prefix, read as a verb: the verb, and what form of it this is. */
function verbIn(rest: string, forms: Forms, rules: CompoundRules): { verb: string; label?: string } | null {
  const marker = rules.infinitiveMarker;
  // ab-zu-speichern: the "to" form.
  if (marker && rest.startsWith(marker) && isVerb(forms[rest.slice(marker.length)])) {
    return { verb: rest.slice(marker.length), label: 'infinitive' };
  }
  const ways = (stem: string): FormInfo['of'] =>
    (forms[stem]?.of ?? []).filter((o) => o.pos === 'v' && (o.senses ?? 0) > 0 && !/\s/.test(o.lemma));
  const whole = stems(rest, rules)[0] ?? rest;
  if (isVerb(forms[whole])) return { verb: whole };
  // As it stands, a form of the verb: kriegten. A case and a gender are an adjective's, and say nothing of the verb.
  const direct = ways(whole).find((o) => !o.tags.some((t) => /nominative|accusative|dative|genitive/.test(t)));
  if (direct) return { verb: direct.lemma, ...(direct.tags[0] ? { label: direct.tags[0] } : {}) };
  // With an adjective's ending on it, only a participle: geschrieben-en. Setz-er is not a verb's form.
  for (const stem of stems(rest, rules)) {
    const participle = ways(stem).find((o) => o.tags.some((t) => /participle/.test(t)));
    if (participle) return { verb: participle.lemma, label: participle.tags.find((t) => /participle/.test(t)) ?? 'participle' };
  }
  return null;
}

/**
 * A verb with a prefix, in a form the dictionary does not list: abzuspeichern,
 * festgeschriebenen, aufkriegten. The verb with its prefix where the dictionary
 * has it (abspeichern), and the prefix and the verb apart where it has not.
 */
export function prefixVerb(word: string, forms: Forms, rules: CompoundRules): (Derived & { parts?: Compound }) | null {
  for (const { prefix, rest } of prefixed(word, rules)) {
    const found = verbIn(rest, forms, rules);
    if (!found) continue;
    const joined = prefix + found.verb;
    const label = found.label ? { label: found.label } : {};
    if (isVerb(forms[joined])) return { lemma: joined, ...label };
    return { lemma: joined, ...label, parts: { parts: [word.slice(0, prefix.length), word.slice(prefix.length)], lemmas: [prefix, found.verb] } };
  }
  return null;
}

/** A word made with a suffix from a word the dictionary has: knorpelig is Knorpel and -ig. */
export function derivedOf(word: string, forms: Forms, rules: CompoundRules): Compound | null {
  for (const stem of stems(word, rules)) {
    for (const suffix of rules.suffixes ?? []) {
      if (!stem.endsWith(suffix) || stem.length - suffix.length < rules.minPart || !forms[`-${suffix}`]?.word) continue;
      const base = stem.slice(0, stem.length - suffix.length);
      const key = spellings(base).sort((a, b) => weight(forms[b]) - weight(forms[a])).find((k) => lemmaIn(forms[k], k) && !isFunction(forms[k]));
      const lemma = key ? lemmaIn(forms[key], key) : null;
      if (lemma) return { parts: [word.slice(0, base.length), word.slice(base.length)], lemmas: [lemma, `-${suffix}`] };
    }
  }
  return null;
}

/** Every spelling to ask about to read an unknown word as a form or a derivation of a known one. */
export function formKeys(word: string, rules: CompoundRules): string[] {
  const keys = new Set<string>(participleVerbs(word, rules));
  for (const { rest } of prefixed(word, rules)) {
    for (const stem of stems(rest, rules)) keys.add(stem);
    const marker = rules.infinitiveMarker;
    if (marker && rest.startsWith(marker)) keys.add(rest.slice(marker.length));
  }
  for (const stem of stems(word, rules)) {
    for (const suffix of rules.suffixes ?? []) {
      if (!stem.endsWith(suffix) || stem.length - suffix.length < rules.minPart) continue;
      keys.add(`-${suffix}`);
      for (const k of spellings(stem.slice(0, stem.length - suffix.length))) keys.add(k);
    }
  }
  return [...keys];
}

/** The verb with its prefix, to ask about once the verb is known: abspeichern. */
export function joinedKeys(word: string, forms: Forms, rules: CompoundRules): string[] {
  return prefixed(word, rules).flatMap(({ prefix, rest }) => {
    const found = verbIn(rest, forms, rules);
    return found ? [prefix + found.verb] : [];
  });
}
