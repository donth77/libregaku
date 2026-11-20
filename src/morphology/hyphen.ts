import { spellingsOf, wordOf } from './compound';
import type { Forms } from './lemma';
import type { Token } from './types';

/**
 * Words written with hyphens: peut-être, grand-mère, week-end, arc-en-ciel.
 * The browser cuts a word at each hyphen, so a line has peut, -, être, and
 * the dictionary has peut-être as one word. Where the dictionary has the
 * whole, the pieces are put back together.
 *
 * Only words the dictionary has are joined. A question put as a verb and its
 * pronoun (veux-tu, dis-moi) is two words and stays two, each a word to learn.
 */

const HYPHENS = new Set(['-', '‐', '‑']);

/** A hyphenated run of words with no space in it: where it starts and ends in the tokens, and how many. */
interface Run {
  from: number;
  to: number;
}

/** Every maximal run: word, hyphen, word, and so on, written close together. */
function runs(tokens: readonly Token[]): Run[] {
  const out: Run[] = [];
  const word = (t: Token | undefined): boolean => Boolean(t && !t.punct);
  const hyphen = (t: Token | undefined): boolean => Boolean(t?.punct && HYPHENS.has(t.surface));
  for (let i = 0; i < tokens.length; i++) {
    if (!word(tokens[i])) continue;
    let j = i;
    // Each of the three written against the next, with no space.
    const joined = (k: number): boolean => tokens[k]?.end === tokens[k + 1]?.start;
    while (hyphen(tokens[j + 1]) && word(tokens[j + 2]) && joined(j) && joined(j + 1)) j += 2;
    if (j > i) out.push({ from: i, to: j });
    i = Math.max(i, j);
  }
  return out;
}

/** The ways each run may be joined: the whole of it, and shorter stretches of it, longest first. */
function stretches(tokens: readonly Token[], run: Run): Array<{ from: number; to: number; text: string }> {
  const out: Array<{ from: number; to: number; text: string }> = [];
  for (let from = run.from; from < run.to; from += 2) {
    for (let to = run.to; to > from; to -= 2) {
      const text = tokens.slice(from, to + 1).map((t) => t.surface).join('');
      // Verb, -t-, pronoun: a-t-il is a, t and il.
      if (!/-t-/i.test(text)) out.push({ from, to, text });
    }
  }
  return out;
}

/** The spellings to ask the dictionary about to find out which hyphenated words it has, and the pieces of the rest. */
export function hyphenKeys(tokens: readonly Token[], fold: (s: string) => string, locale?: string): string[] {
  const keys = new Set<string>();
  for (const run of runs(tokens)) {
    for (const s of stretches(tokens, run)) {
      keys.add(fold(s.text));
      keys.add(fold(s.text).toLocaleLowerCase(locale));
    }
    for (let i = run.from; i <= run.to; i += 2) for (const k of spellingsOf(fold(tokens[i]!.surface))) keys.add(k);
  }
  return [...keys];
}

/**
 * The line with each hyphenated word the dictionary has made one token. One it has not is
 * made one too where its parts are words it has (Alpha-Version: Alpha and Version), unless one
 * of them is a word that stands apart: French veux-tu is veux and tu, whatever the dictionary says.
 * `apart` says which.
 */
export function joinHyphenated(
  tokens: Token[], forms: Forms, fold: (s: string) => string, locale?: string, apart?: RegExp,
): Token[] {
  const joins = new Map<number, { to: number; text: string; parts?: string[]; lemmas?: string[] }>();
  for (const run of runs(tokens)) {
    let at = run.from;
    while (at < run.to) {
      const found = stretches(tokens, { from: at, to: run.to }).find((s) => {
        const key = fold(s.text);
        // A word the dictionary has, or a form of one (grands-mères, ajudá-lo) where no piece of it stands apart:
        // savez-vous is listed as a form too, and a question's verb and pronoun stay two words.
        const asForm = !apart || !s.text.split(/[-‐‑]/).some((piece) => apart.test(piece.toLowerCase()));
        const known = (info: Forms[string] | undefined): boolean => Boolean(info?.word || (asForm && info?.of.length));
        return known(forms[key]) || known(forms[key.toLocaleLowerCase(locale)]);
      });
      if (found) {
        joins.set(found.from, { to: found.to, text: found.text });
        at = found.to + 2;
      } else {
        at += 2;
      }
    }
    // None of it is a word the dictionary has: a compound of words it has.
    if (apart && ![...joins.keys()].some((k) => k >= run.from && k <= run.to)) {
      const pieces = tokens.filter((_, i) => i >= run.from && i <= run.to && (i - run.from) % 2 === 0).map((t) => t.surface);
      const lemmas = pieces.map((p) => wordOf(fold(p), forms));
      const usable = pieces.every((p) => /^\p{L}/u.test(p) && !apart.test(p.toLowerCase())) && lemmas.at(-1) !== null && pieces.length <= 4;
      if (usable) {
        joins.set(run.from, {
          to: run.to, text: tokens.slice(run.from, run.to + 1).map((t) => t.surface).join(''),
          parts: pieces, lemmas: lemmas.map((l, i) => l ?? pieces[i]!),
        });
      }
    }
  }
  if (!joins.size) return tokens;
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const join = joins.get(i);
    const t = tokens[i]!;
    if (!join) {
      out.push(t);
      continue;
    }
    out.push({
      ...t, surface: join.text, end: tokens[join.to]!.end,
      ...(join.lemmas ? { parts: join.parts, compound: join.lemmas, lookup: join.lemmas.slice().reverse().map((key) => ({ key })) } : {}),
    });
    i = join.to;
  }
  return out;
}
