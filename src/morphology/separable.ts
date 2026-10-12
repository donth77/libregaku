import type { CompoundRules } from './compound';
import type { Forms } from './lemma';
import type { Token } from './types';

/**
 * German verbs that come apart: gehen with weg is weggehen, and in "Ich gehe
 * jetzt weg" the two are at opposite ends of the clause. The dictionary has the
 * verb whole, and the line has its prefix last in the clause, by itself.
 *
 * Only where the dictionary has the two together as a verb, and the prefix is
 * the last word of its clause, which is where a separated prefix always is.
 * "Ich komme aus Berlin" has aus before its noun, and is left alone.
 */

/** Prefixes that are as often a preposition with its own noun after it, or part of a verb that does not come apart. */
const NOT_SEPARATED = new Set(['um', 'zu', 'bei', 'unter', 'über', 'durch']);

/** Marks that end a clause. */
const CLAUSE_END = /[.!?;:,—–\n]/;

interface Pair {
  /** Where the verb and its prefix are in the line. */
  verb: number;
  prefix: number;
  /** The verb with its prefix, as the dictionary would have it. */
  key: string;
}

/** The words of each clause: their places in the line. */
function clauses(tokens: readonly Token[]): number[][] {
  const out: number[][] = [[]];
  tokens.forEach((t, i) => {
    if (t.punct) {
      if (CLAUSE_END.test(t.surface) && out[out.length - 1]!.length) out.push([]);
    } else {
      out[out.length - 1]!.push(i);
    }
  });
  return out.filter((c) => c.length > 1);
}

/** Each way a clause's last word and an earlier one may be a verb and its prefix. */
function pairs(tokens: readonly Token[], rules: CompoundRules): Pair[] {
  const prefixes = new Set((rules.verbPrefixes ?? []).filter((p) => !NOT_SEPARATED.has(p)));
  const found: Pair[] = [];
  for (const clause of clauses(tokens)) {
    const last = clause[clause.length - 1]!;
    const prefix = tokens[last]!.surface.toLowerCase();
    if (!prefixes.has(prefix)) continue;
    // The first words of the clause: the verb is among them, and the nearer ones are likelier.
    for (const at of clause.slice(0, 4)) {
      const lemma = tokens[at]!.lemma;
      if (at !== last && lemma) found.push({ verb: at, prefix: last, key: prefix + lemma.toLowerCase() });
    }
  }
  return found;
}

/** The spellings to ask the dictionary about to find out which of a line's words are separated verbs. */
export function separableKeys(tokens: readonly Token[], rules: CompoundRules): string[] {
  return [...new Set(pairs(tokens, rules).map((p) => p.key))];
}

/** The line with each separated verb and its prefix read as the verb: gehe and weg are weggehen. */
export function joinSeparable(tokens: Token[], forms: Forms, rules: CompoundRules): Token[] {
  const done = new Set<number>();
  const out = tokens.slice();
  for (const { verb, prefix, key } of pairs(tokens, rules)) {
    if (done.has(verb) || done.has(prefix) || !forms[key]?.word || !forms[key]?.kind?.includes('v')) continue;
    done.add(verb);
    done.add(prefix);
    const v = tokens[verb]!;
    const p = tokens[prefix]!;
    out[verb] = {
      ...v, lemma: key, lookup: [{ key }, ...(v.lookup ?? [])], parts: [v.surface, p.surface],
      inflections: v.inflections ?? [],
    };
    // The prefix is part of the verb, not a word of its own: looked up as the verb, and not counted as one to learn.
    out[prefix] = { ...p, lemma: key, lookup: [{ key }], content: false };
  }
  return out;
}
