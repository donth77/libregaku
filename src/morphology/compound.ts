import type { FormInfo, Forms } from './lemma';

/**
 * Words made of two words, which German makes without end: Riesenschlange is
 * Riese and Schlange, and no dictionary lists them all. A word the dictionary
 * has nothing for is cut in two where both halves are words it has, and the
 * card shows both.
 *
 * Two parts, the last of them the word the whole is a kind of. What goes
 * between them in the writing (Arbeit-s-zimmer, Hund-e-hütte) is allowed for.
 * Longer ones (Donaudampfschiff) are left whole.
 */

export interface CompoundRules {
  /** The shortest a part can be: a split into pieces of a letter or two finds a word in anything. */
  minPart: number;
  /** What a compound may put between its parts. */
  links: readonly string[];
}

/** The two parts of a compound: each as it is written in the word and as the dictionary has it. */
export interface Compound {
  parts: [string, string];
  /** The dictionary's word for each part. */
  lemmas: [string, string];
}

const capital = (w: string): string => w.charAt(0).toUpperCase() + w.slice(1);

/** Every way a part may be written in the dictionary: as written, in lower case, with a capital. */
const spellings = (part: string): string[] => [...new Set([part, part.toLowerCase(), capital(part.toLowerCase())])];

/** Where a word may be cut, as the pieces on each side of the cut. */
function cuts(word: string, rules: CompoundRules): Array<[left: string, right: string]> {
  const out: Array<[string, string]> = [];
  for (let i = rules.minPart; i <= word.length - rules.minPart; i++) out.push([word.slice(0, i), word.slice(i)]);
  return out;
}

/** What a left part may be in the dictionary: itself, or itself without what links it to the next. */
function leftKeys(left: string, rules: CompoundRules): string[] {
  const bare = rules.links
    .filter((link) => left.length - link.length >= rules.minPart && left.toLowerCase().endsWith(link))
    .map((link) => left.slice(0, left.length - link.length));
  return [...new Set([left, ...bare].flatMap(spellings))];
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

const isFunction = (info: FormInfo | undefined): boolean => Boolean(info?.kind?.length && info.kind.every((k) => FUNCTION_WORDS.has(k)));

/**
 * The best way to cut a word in two, or null where there is none. Both parts
 * must be words the dictionary has, the last a word in its own right and
 * neither a little word of grammar. The longest last part wins: it is the
 * one that says what the whole is.
 */
export function splitCompound(word: string, forms: Forms, rules: CompoundRules): Compound | null {
  let best: { score: number; compound: Compound } | null = null;
  for (const [left, right] of cuts(word, rules)) {
    // The head is the last part: a word, or a form of one, as in Gruppen-sitzungen. In the case the whole is written in.
    const shout = word.charAt(0) === word.charAt(0).toUpperCase();
    const heads = spellings(right).filter((k) => lemmaIn(forms[k], k) && !isFunction(forms[k]));
    const head = (shout ? heads.sort((a, b) => Number(b === capital(b)) - Number(a === capital(a))) : heads)[0];
    const headLemma = head ? lemmaIn(forms[head], head) : null;
    if (!head || !headLemma) continue;
    for (const key of leftKeys(left, rules)) {
      const info = forms[key];
      const lemma = lemmaIn(info, key);
      if (!lemma || isFunction(info)) continue;
      const linked = key.length < left.length ? 1 : 0;
      // The head says what the word is, so the longest head wins; then the longer modifier, and no linking letter
      // if it can be done without. Written as it is in the word beats another case of it (Riesen, not riesen).
      const score = right.length * 100 + key.length * 10 - linked * 5 + (key === left ? 3 : key === capital(key) ? 2 : 0);
      if (!best || score > best.score) best = { score, compound: { parts: [left, right], lemmas: [lemma, headLemma] } };
    }
  }
  return best?.compound ?? null;
}
