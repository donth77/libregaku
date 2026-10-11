import type { Entry } from './jmdict';
import { readTable } from './sqlite';

/**
 * WikDict (wikdict.com): bilingual dictionaries made from Wiktionary, by way of
 * DBnary, under CC BY-SA. A file is one pair, every word of the first language
 * with its equivalents in the second, as SQLite. Only the `translation` table is
 * read, and of it only what WikDict itself marks good: the rest are matches
 * made the other way round, one word in a file for each, and often wrong.
 *
 * What a row gives is equivalents, not explanations: tout is "todos | todo",
 * not a sentence about it. They are the meanings a card shows.
 */

/** Where one pair is kept: the first language's words explained in the second's. */
export function wikdictUrl(target: string, native: string): string {
  return `https://download.wikdict.com/dictionaries/sqlite/2/${target}-${native}.sqlite3`;
}

/**
 * The part of speech a row's entry id names, in the source Wiktionary's own
 * language, as the dictionary's codes (wty.ts): "fra/tout__adv__1" is adv,
 * "spa/casa__sustantivo_femenino__1" a feminine noun. Left to the dictionary's
 * own word where nothing here knows it, so the card says what it was given.
 */
const PARTS: Array<[RegExp, string[]]> = [
  [/^(sustantivo_masculino|sustantivo_masculino_y_femenino)/, ['n', 'masc']],
  [/^(sustantivo_femenino|sustantivo_femenino_y_masculino)/, ['n', 'fem']],
  [/^(nompr|nom_de_famille|prénom|patronyme|eigenname|sustantivo_propio|name|nome_proprio|nome_próprio)/, ['name']],
  [/^(nom|substantiv|sustantivo|noun|nome|sostantivo|substantivo)/, ['n']],
  [/^(verb|verbo|verbe)/, ['v']],
  [/^(adjectif_numéral|numerale|numeral)/, ['num']],
  [/^(adj|adjetivo|adjektiv|adjectiv|aggettivo)/, ['adj']],
  [/^(adv|adverb|adverbio)/, ['adv']],
  [/^(pronom|pronoun|.*pronomen|pronome|pronombre)/, ['pron']],
  [/^(préposition|präposition|preposición|preposição|preposizione|prep)/, ['prep']],
  [/^(conjonction|konjunktion|subjunktion|conjunción|conjunção|congiunzione|conj)/, ['conj']],
  [/^(interjection|interjektion|interjección|interjeição|interiezione|grußformel|onomatopée)/, ['intj']],
  [/^(locution|redewendung|wortverbindung|phrase|idiom|expression|locução|espressione)/, ['phrase']],
  [/^(proverbe|sprichwort|refrán|provérbio|proverbio|proverb)/, ['prov']],
  [/^(suffix|suffixe|sufijo|sufixo|suffisso)/, ['suf']],
  [/^(prefix|préfixe|präfix|prefijo|prefixo|prefisso)/, ['pref']],
];

export function partOf(entryId: unknown): string[] {
  const token = /^[^/]+\/.*?__(.*?)__\d+$/.exec(typeof entryId === 'string' ? entryId : '')?.[1]?.toLowerCase();
  if (!token) return [];
  for (const [pattern, codes] of PARTS) if (pattern.test(token)) return codes;
  return [];
}

/** How many equivalents one meaning shows: a word WikDict knows twenty for is not twenty meanings. */
const EQUIVALENTS = 8;

/**
 * The words of a file as entries: one for each word and part of speech, each
 * meaning the equivalents of one sense of it, the best scored first.
 * `scored` is what a pair's entries are ordered by, most useful word first.
 */
export function* wikdictEntries(file: Uint8Array, firstId = 0): Generator<Entry> {
  const { columns, rows } = readTable(file, 'translation');
  const at = (name: string): number => {
    const i = columns.indexOf(name);
    if (i < 0) throw new Error(`libregaku: WikDict has no ${name} column`);
    return i;
  };
  const [lexentry, written, list, score, good] = [at('lexentry'), at('written_rep'), at('trans_list'), at('score'), at('is_good')];

  // word → each of its entry ids → the equivalents of its senses, with the best score they had
  const words = new Map<string, Map<string, Map<string, number>>>();
  for (const row of rows) {
    const word = row[written];
    const equivalents = row[list];
    if (row[good] !== 1 || typeof word !== 'string' || typeof equivalents !== 'string' || !word.trim()) continue;
    const id = typeof row[lexentry] === 'string' ? (row[lexentry] as string) : '';
    const by = words.get(word) ?? new Map<string, Map<string, number>>();
    const kept = by.get(id) ?? new Map<string, number>();
    const points = typeof row[score] === 'number' ? (row[score] as number) : 0;
    for (const e of equivalents.split(' | ')) {
      const t = e.trim();
      if (t) kept.set(t, Math.max(kept.get(t) ?? 0, points));
    }
    by.set(id, kept);
    words.set(word, by);
  }

  let n = firstId;
  for (const [word, by] of words) {
    for (const [id, kept] of by) {
      const glosses = [...kept].sort((a, b) => b[1] - a[1]).slice(0, EQUIVALENTS).map(([t]) => t);
      if (!glosses.length) continue;
      const kind = partOf(id);
      yield {
        id: String(n++).padStart(8, '0'), word, common: false, ...(kind.length ? { kind } : {}),
        senses: [{ pos: kind, glosses }],
      };
    }
  }
}
