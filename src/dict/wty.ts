import type { Entry } from './jmdict';

/**
 * Wiktionary, as wiktionary-to-yomitan ("wty") publishes it: Yomitan term
 * banks made from kaikki.org's reading of the English Wiktionary.
 *
 * A term bank is a JSON array of rows:
 *
 *   [term, reading, tags, rules, score, definitions, sequence, termTags]
 *
 * A row is a dictionary entry — one for each part of speech, so ser the verb
 * and ser the noun are two rows — or it says what a written form is a form
 * of: hablamos, of hablar. The reading is empty for Spanish and Korean; the
 * score, the sequence and termTags are empty everywhere, and are not read.
 *
 * A row is read for what it says, which is not always what its tags say: an
 * odd spelling is filed backwards (readForm), and half the Spanish "entries"
 * are a verb with a pronoun on the end (ATTACHED).
 *
 * Nothing here downloads or stores. A row comes in, and an entry, a form or
 * nothing goes out.
 */

/** What a written form is a form of: hablábamos → hablar, "first-person plural imperfect indicative". */
export interface Inflection {
  form: string;
  of: Array<{ lemma: string; tags: string[] }>;
  /** The form's part of speech, as the row's rules give it: v, n, adj. */
  pos?: string;
}

type Sense = Entry['senses'][number];
type Node = Record<string, unknown>;

const isNode = (x: unknown): x is Node => typeof x === 'object' && x !== null && !Array.isArray(x);

/** A node's children: `content` is a string, one node, or a list of either. */
const children = (content: unknown): unknown[] =>
  Array.isArray(content) ? content : content === undefined || content === null ? [] : [content];

/** What wty says a node is, in `data.content` — its nearest thing to a class name. */
function role(node: Node): string {
  const data = node.data;
  return isNode(data) && typeof data.content === 'string' ? data.content : '';
}

const isList = (node: Node): boolean => node.tag === 'ul' || node.tag === 'ol';

/**
 * How deep a row is followed. wty nests a meaning about eight deep; a row
 * nested past this is not one of its rows, and following it to the bottom
 * would be a stack overflow in the middle of a download.
 */
const DEEPEST = 48;

/* ── What kind of word ──────────────────────────────────────────── */

/**
 * wty's codes for what kind of word a row is, with the English for each: the
 * parts of speech, then their grammar. Every one found on five rows or more
 * of the Spanish or Korean file (2026.10.04).
 */
const GRAMMAR = new Map(Object.entries({
  n: 'noun', name: 'proper noun', v: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun',
  det: 'determiner', artic: 'article', num: 'numeral', counter: 'counter', prep: 'preposition',
  'prep-phrase': 'prepositional phrase', conj: 'conjunction', ptcl: 'particle', intj: 'interjection',
  phrase: 'phrase', prov: 'proverb', pref: 'prefix', suf: 'suffix', r: 'root', char: 'character',
  adn: 'adnominal', ptcpl: 'participle', contr: 'contraction',
  masc: 'masculine', fem: 'feminine', neut: 'neuter',
  sg: 'singular', pl: 'plural', 'pl-only': 'plural only', count: 'countable', uncount: 'uncountable',
  vt: 'transitive', vi: 'intransitive', vr: 'reflexive', vdt: 'ditransitive', impers: 'impersonal',
  aux: 'auxiliary', irreg: 'irregular', reltnl: 'relational', reltv: 'relative',
  interr: 'interrogative', poss: 'possessive', dim: 'diminutive', aug: 'augmentative',
  onoma: 'onomatopoeic',
}));

/**
 * Its codes for where and how a word is used — register, period, place — by
 * the same count. A place is a flag in the file, which no card can count on
 * being drawn: Windows shows the two letters instead. 🇩🇪⬅️ is its "western
 * Germany", put on whatever Wiktionary labels Western: ustedes, pana.
 */
const USAGE = new Map(Object.entries({
  idio: 'idiomatic', fig: 'figurative', literal: 'literal', col: 'colloquial', inf: 'informal',
  fam: 'familiar', formal: 'formal', polite: 'polite', lit: 'literary', poet: 'poetic',
  rhet: 'rhetoric', sl: 'slang', vulg: 'vulgar', derog: 'derogatory', offens: 'offensive',
  humor: 'humorous', euph: 'euphemistic', child: 'childish', net: 'Internet', neol: 'neologism',
  cmn: 'common', uncmmn: 'uncommon', rare: 'rare', dated: 'dated', arch: 'archaic',
  obs: 'obsolete', hist: 'historical', 'non-std': 'nonstandard', dialect: 'dialectal',
  regio: 'regional',
  '🇦🇷': 'Argentina', '🇧🇴': 'Bolivia', '🇧🇿': 'Belize', '🇨🇱': 'Chile', '🇨🇴': 'Colombia',
  '🇨🇺': 'Cuba', '🇪🇨': 'Ecuador', '🇪🇸': 'Spain', '🇬🇧': 'UK', '🇬🇷': 'Greek', '🇬🇹': 'Guatemala',
  '🇭🇳': 'Honduras', '🇲🇽': 'Mexico', '🇳🇮': 'Nicaragua', '🇵🇦': 'Panama', '🇵🇪': 'Peru',
  '🇵🇭': 'Philippines', '🇵🇾': 'Paraguay', '🇷🇺': 'Russia', '🇺🇸': 'US', '🇺🇾': 'Uruguay',
  '🇻🇪': 'Venezuela', '🇩🇪⬅️': 'western', '✡️': 'Judaism', '🛕': 'Hinduism',
}));

/** Codes of a row that a card does not say: a German noun's or adjective's declension (strong, weak, mixed) says which endings it takes, and "not comparable" is said of the few that are. */
const HEADER_NOISE = new Set(['not-comp', 'strong', 'weak', 'mixed']);

/**
 * A row's tags as codes, in the order a card should say them: what kind of
 * word it is, then how it is used.
 *
 * wty puts the part of speech first and sorts the rest by their English
 * names, capitals first, so a Mexican masculine noun is 'n 🇲🇽 masc' and a
 * colloquial one 'n col masc'. The gender belongs beside the noun. A code
 * with no name here counts as usage. "pl pl-only" says one thing twice.
 */
function codesOf(tags: string): string[] {
  const all = [...new Set(tags.split(/\s+/).filter((t) => t && !HEADER_NOISE.has(t)))];
  const codes = all.filter((t) => !(t === 'pl' && all.includes('pl-only')));
  return [...codes.filter((t) => GRAMMAR.has(t)), ...codes.filter((t) => !GRAMMAR.has(t))];
}

/**
 * A row's tags in plain English: 'n masc' → 'noun, masculine'. A tag with no name here stays as written.
 *
 * An entry carries the codes (`kind`, and `pos` on each sense), for a card to
 * name in its reader's language. This is their English, for whatever has no
 * names of its own: `kindOf(entry.kind.join(' '))`.
 */
export function kindOf(tags: string): string {
  return codesOf(tags).map((t) => GRAMMAR.get(t) ?? USAGE.get(t) ?? t).join(', ');
}

/* ── A dictionary entry ─────────────────────────────────────────── */

/**
 * One meaning into `senses`, unless they hold it already.
 *
 * Wiktionary gives a word used transitively and intransitively the same
 * words twice, labelled differently, and gratis the adjective and gratis the
 * adverb are both "free, without charge". A card would show the line twice,
 * so the second adds what it says of itself to the first.
 */
function addSense(senses: Sense[], sense: Sense): void {
  const said = sense.glosses.join('\n');
  const same = senses.find((s) => s.glosses.join('\n') === said);
  if (!same) {
    const misc = sense.misc?.length ? { misc: [...sense.misc] } : {};
    senses.push({ pos: [...sense.pos], glosses: [...sense.glosses], ...misc });
    return;
  }
  same.pos = [...new Set([...same.pos, ...sense.pos])];
  if (sense.misc?.length) same.misc = [...new Set([...(same.misc ?? []), ...sense.misc])];
}

/**
 * What Wiktionary's page leaves where a meaning should be: the caption of a
 * folded table, alone or ahead of the table's cells run together. Most Korean
 * syllables that are the reading of a Chinese character have one.
 */
const DEBRIS = /^More information(?:$|\s*[(*])/;

/** Chinese characters and nothing else: "誰", "坑, 更, 硜", "俺:". */
const CHARACTERS = /^[\p{Script=Han}\s,、]+:?$/u;

/**
 * A line that sends the reader to another page and says nothing of the word:
 * "See the entry at -는 (-neun).", "For the verb-final particle, see the entry
 * at -요 (-yo)." Wiktionary keeps a Korean particle or ending on a page named
 * with a hyphen before it, and leaves this on the page of the form alone. A
 * card has no other page to turn to.
 */
const POINTER = /^(?:For [^,]+, )?see the entry at /i;

/**
 * A meaning's text as it is stored, or '' for what is not a meaning.
 *
 * - Its first line only. What follows a line break is not the meaning: an
 *   example sentence that strayed into it, or a note of how a Chinese
 *   character was once read.
 * - A bullet left from the page's own list goes: "* 混: to mix".
 * - A meaning with others nested under it is often their heading, and ends in
 *   a colon: "a kind of bird:". On a line of its own the colon points at
 *   nothing.
 * - A row with no part of speech is, in Korean, a syllable and the Chinese
 *   characters read as it: "水: water" is worth keeping, and a character on
 *   its own, of which there are thousands, says nothing.
 * - A line that only points at another page (POINTER) is no meaning either.
 */
function meaningOf(text: string, heads: boolean, tagged: boolean): string {
  const [line = ''] = text.trim().split('\n');
  let gloss = line.replace(/\s+/g, ' ').trim().replace(/^\* /, '');
  if (heads) gloss = gloss.replace(/\s*:$/, '');
  return DEBRIS.test(gloss) || POINTER.test(gloss) || (!tagged && CHARACTERS.test(gloss)) ? '' : gloss;
}

/**
 * The labels on a meaning — transitive, colloquial, Mexico — as their codes:
 * vt, col, 🇲🇽. wty keeps them in a block of their own ahead of the text, each
 * a span holding the code, so they come out whole and the text stays clean.
 */
function labelsOf(block: Node): string[] {
  const labels: string[] = [];
  for (const span of children(block.content)) {
    const code = typeof span === 'string' ? span : isNode(span) && typeof span.content === 'string' ? span.content : '';
    if (code.trim()) labels.push(code.trim());
  }
  return [...new Set(labels)];
}

/** Blocks inside a meaning that are about it, not part of it: example sentences and their headings. */
const ASIDE = /^(?:details-entry|summary-entry|extra-info|example-sentence)/;

/**
 * One numbered meaning, then the meanings nested under it, each a sense of
 * its own.
 *
 * The meaning is the text written straight into the item, or into the bare
 * wrapper wty puts round it. A marked block is something about the meaning:
 * its labels go to `misc`, its example sentences are left out. A meaning
 * keeps only its own labels — one nested under "(Mexico) a punch" is as often
 * "(Argentina) a fight" as a finer shade of the first.
 */
function readMeaning(item: unknown, pos: string[], senses: Sense[], depth: number, heads = false): void {
  let text = '';
  const misc: string[] = [];
  const nested: Node[] = [];
  const walk = (node: unknown, deep: number): void => {
    if (deep > DEEPEST) return;
    if (typeof node === 'string') text += node;
    else if (Array.isArray(node)) for (const child of node) walk(child, deep + 1);
    else if (isNode(node)) {
      const what = role(node);
      if (what === 'tags') misc.push(...labelsOf(node));
      else if (isList(node)) nested.push(node);
      else if (node.tag !== 'details' && !ASIDE.test(what)) walk(node.content, deep + 1);
    }
  };
  walk(isNode(item) ? item.content : item, depth);

  const gloss = meaningOf(text, heads || nested.length > 0, pos.length > 0);
  if (gloss) addSense(senses, { pos, glosses: [gloss], misc });
  for (const list of nested) readList(list, pos, senses, depth + 1);
}

/**
 * Every meaning in a list. A list straight inside a list is one level further
 * down, not an item, and the item before it is what it is nested under.
 */
function readList(list: Node, pos: string[], senses: Sense[], depth: number): void {
  if (depth > DEEPEST) return;
  const items = children(list.content);
  items.forEach((item, i) => {
    const next = items[i + 1];
    if (isNode(item) && isList(item)) readList(item, pos, senses, depth + 1);
    else readMeaning(item, pos, senses, depth + 1, isNode(next) && isList(next));
  });
}

/** The lists of numbered meanings in a definition: wty marks each `glosses`. */
function glossLists(node: unknown, found: Node[] = [], depth = 0): Node[] {
  if (depth > DEEPEST) return found;
  if (Array.isArray(node)) for (const child of node) glossLists(child, found, depth + 1);
  else if (isNode(node)) {
    if (role(node) === 'glosses') found.push(node);
    else glossLists(node.content, found, depth + 1);
  }
  return found;
}

/**
 * All that is said of a verb with a pronoun on its end: hacerlo, "infinitive
 * of hacer combined with lo".
 *
 * Wiktionary has a page for each of these, and wty a row: 132,000, more than
 * half the Spanish entries. Read as entries they make hacerlo a word in its
 * own right — never traced to hacer, its card saying only what it is a form
 * of — and that is one word in eighty-five of running Spanish. The same
 * makes a "word" of animales, as animá with les. The rows of forms already
 * trace all but one in a hundred of them to their verbs, as they do dámelo,
 * which has no page; and that hundredth is mostly a plural mistaken for an
 * Argentine imperative: finales is not finá and les.
 */
const ATTACHED = /^[^;,.()]+ of \S+ combined with \S+\.?$/;

/**
 * A row that is a dictionary entry: its meanings, each a sense, under the
 * codes for what kind of word the row is. The grammar and etymology wty puts
 * ahead of the meanings, and the links after them, are outside the list of
 * meanings and are never read.
 *
 * Null for a row with no meanings, and for one that has nothing of its own
 * to say (ATTACHED): its word is found through the rows of forms.
 */
function readEntry(id: string, word: string, reading: unknown, tags: string, definitions: unknown[]): Entry | null {
  const kind = codesOf(tags);
  const senses: Sense[] = [];
  for (const definition of definitions) {
    // Yomitan lets a definition be bare text. wty writes none, and reading one costs this line.
    if (typeof definition === 'string') readMeaning(definition, kind, senses, 0);
    else if (isNode(definition)) for (const list of glossLists(definition.content)) readList(list, kind, senses, 0);
  }
  if (!senses.length || senses.every((s) => ATTACHED.test(s.glosses[0] ?? ''))) return null;
  return {
    id,
    word,
    reading: typeof reading === 'string' && reading ? reading : undefined,
    common: false,
    senses,
    kind: kind.length ? kind : undefined,
  };
}

/** A verb's meaning that only says which form of another verb it is: "third-person singular present indicative of essere; is". */
const FORM_GLOSS =
  /^((?:(?:first|second|third)-person|singular|plural|present|past|imperfect|preterite|pluperfect|future|conditional|indicative|subjunctive|imperative|participle|gerund|infinitive|and|or|[/ ])+?) of (\p{L}[\p{L}'’-]*)/u;
/** A verb with a pronoun written onto it: "contraction of ajudar + o". */
const CLITIC_GLOSS = /^contraction of (\p{L}[\p{L}'’-]*) \+ /u;

/**
 * A verb's row that is a form of another verb, put as a meaning. Italian has
 * sono, è and ha as rows of their own, "first-person singular present
 * indicative of essere: (I) am", where most languages list such a form among
 * the forms; Portuguese has ajudá-lo, "contraction of ajudar + o". The row is
 * kept for its meaning and filed as a form of that verb too, so a line reads
 * essere and ajudar, and a card for either matches.
 */
export function formIn(entry: Entry): Inflection | null {
  if (!(entry.kind ?? []).includes('v')) return null;
  const of: Inflection['of'] = [];
  for (const gloss of entry.senses.flatMap((s) => s.glosses)) {
    const form = FORM_GLOSS.exec(gloss);
    const clitic = form ? null : CLITIC_GLOSS.exec(gloss);
    const lemma = form?.[2] ?? clitic?.[1];
    if (!lemma || lemma === entry.word || of.some((o) => o.lemma === lemma)) continue;
    of.push({ lemma, tags: form ? [(form[1] ?? '').trim()] : [] });
  }
  return of.length ? { form: entry.word, of, pos: 'v' } : null;
}

/**
 * A verb's row with nothing to say of itself: every meaning only names the
 * form of another verb it is (formIn). It is kept as that form and not as a
 * word, so a card opens the verb, essere and ajudar, with its meanings.
 */
export function onlyForm(entry: Entry): boolean {
  const glosses = entry.senses.flatMap((s) => s.glosses);
  return formIn(entry) !== null && glosses.every((g) => FORM_GLOSS.test(g) || CLITIC_GLOSS.test(g));
}

/* ── A form of a word ───────────────────────────────────────────── */

/**
 * What a form is, as wty words it: "first-person plural present indicative".
 *
 * Where it took the description from a sentence it cut the word out of the
 * middle, and what followed is still there after the gap: "hanja form   woman;
 * girl”)", "accusative  ; you all". The description ends at the gap.
 */
const described = (how: string): string => (how.split(/\s{2,}/)[0] ?? '').trim();

/**
 * A word a form points at. Korean ones sometimes carry their Chinese
 * characters in brackets — 당연(當然) — and the entry is under the word alone.
 */
const bare = (word: string): string => word.replace(/\(\p{Script=Han}+\)/gu, '').trim() || word.trim();

/**
 * Wiktionary calls decírselo the "infinitive of decir combined with indirect
 * object le/les and direct object lo", and for a thousand such forms wty
 * takes everything after "of" to be the word. The word is the first of them;
 * the rest belongs to the description, which is where wty puts it in the
 * rows it reads rightly (dámelo).
 */
const COMBINED = /^(\S+) (combined with .+)$/;

/** The form's part of speech. Yomitan's rules tell a plural noun (np) from a singular one (ns); both are nouns. */
function partOf(rules: unknown): string | undefined {
  const rule = typeof rules === 'string' ? rules.trim().split(/\s+/)[0] : undefined;
  if (!rule) return undefined;
  return rule === 'np' || rule === 'ns' ? 'n' : rule;
}

/**
 * The labels of another spelling worth keeping: the ones a card reads as a spelling (SPELLING in
 * src/morphology/lemma.ts), and the ones that say who would write it so (당근 for 당연 is humorous slang).
 * Not what is said of the word itself (masculine, uncountable), nor where (US, Latin-America): its entry says those.
 */
export const SPELLING_LABELS: ReadonlySet<string> = new Set([
  'alternative', 'archaic', 'obsolete', 'dated', 'misspelling', 'nonstandard', 'rare', 'pronunciation-spelling', 'eye-dialect',
  'informal', 'superseded', 'uncommon', 'dialectal', 'lowercase',
  'humorous', 'slang', 'vulgar', 'colloquial', 'childish', 'offensive', 'derogatory', 'euphemistic',
]);

/** A way of being a form that is only another spelling: every word of its description is one of SPELLING_LABELS. */
export const onlySpelling = (tags: readonly string[]): boolean =>
  tags.length > 0 && tags.every((t) => t.split(' ').every((w) => SPELLING_LABELS.has(w)));

/**
 * A row that says what `term` is a form of. Each definition is
 * [word, [description]], and a form of two words, or of one word in two
 * ways, has a definition for each.
 *
 * "X is another spelling of Y" is a row filed under X, the odd spelling,
 * with each label of the spelling a definition of its own and one of them
 * `alt-of`: under stá, [está, alt-of] [está, informal alternative]; under
 * favorite, [favourite, alt-of] [favourite, alternative US] [favourite,
 * standard]. It is read as one way of being a form: stá is está,
 * alternative. Only the labels that say how a spelling stands are kept,
 * one word each: "alternative US" and "standard" say nothing a card needs.
 *
 * wty filed these rows the other way round until its release of 22 October
 * 2026, under the usual word, and this reader turned them round; read that
 * way, the release after it made favorite, stá and fué lead nowhere. Of
 * 126,550 such rows in its English file, 114,342 name a word the file has
 * as a headword, and 411 are filed under one; Spanish's are 4,468 and 21.
 */
function readForm(term: string, rules: unknown, definitions: unknown[]): Inflection | null {
  const of: Inflection['of'] = [];
  let respelt: string | undefined;
  for (const definition of definitions) {
    if (!Array.isArray(definition)) continue;
    const [word, how] = definition as unknown[];
    if (typeof word !== 'string' || !word.trim()) continue;
    let lemma = word.trim();
    let tags = (Array.isArray(how) ? how : [how])
      .filter((t): t is string => typeof t === 'string')
      .map(described)
      .filter(Boolean);
    const [, verb, pronouns] = COMBINED.exec(lemma) ?? [];
    if (verb && pronouns) {
      lemma = verb;
      tags = tags.length ? tags.map((t) => `${t} ${pronouns}`) : [pronouns];
    }
    if (tags.includes('alt-of')) respelt ??= lemma;
    // Two descriptions cut at the same gap say the same thing.
    const same = of.some((o) => o.lemma === lemma && o.tags.join('\n') === tags.join('\n'));
    if (!same) of.push({ lemma, tags });
  }

  const form = term;
  let said = of.map((o) => ({ ...o, lemma: bare(o.lemma) }));
  if (respelt !== undefined) {
    const labels = of
      .filter((o) => o.lemma === respelt)
      .flatMap((o) => o.tags.flatMap((t) => t.split(' ')))
      .filter((t) => SPELLING_LABELS.has(t));
    said = [{ lemma: bare(respelt), tags: [...new Set(['alternative', ...labels])] }];
  }
  // A word is not a form of itself, whatever a row says.
  said = said.filter((o) => o.lemma !== form);
  if (!said.length) return null;
  const pos = partOf(rules);
  return { form, of: said, ...(pos ? { pos } : {}) };
}

/* ── Rows ───────────────────────────────────────────────────────── */

/** One row of a term bank: a dictionary entry, a form of one, or nothing usable. */
export function readRow(row: unknown, id: string): { entry: Entry } | { inflection: Inflection } | null {
  if (!Array.isArray(row)) return null;
  const [term, reading, tags, rules, , definitions] = row as unknown[];
  if (typeof term !== 'string' || !term.trim() || !Array.isArray(definitions)) return null;
  const word = term.trim();
  const tagged = typeof tags === 'string' ? tags : '';

  if (tagged.split(/\s+/).includes('non-lemma')) {
    const inflection = readForm(word, rules, definitions);
    return inflection ? { inflection } : null;
  }
  const entry = readEntry(id, word, reading, tagged, definitions);
  return entry ? { entry } : null;
}

/** How Wiktionary words the row for a letter's name: de, "The name of the Latin script letter D/d." */
const LETTER_NAME = /^The name of the Latin[- ]script letter\b/;
/** And for an Arabic letter as a number: ل, "The twelfth numeral symbol of the Arabic alphabet". */
const LETTER_NUMBER = /^The (?:\S+ numeral symbol of the \S+ alphabet|abjad numeral representing)\b/;

/**
 * A row about a character rather than a word: a itself, or the name of a
 * letter. Wiktionary lists these first, so read in its order de is "the name
 * of the letter D" before it is "of", and y, a, o, e and te fare the same.
 */
function namesALetter(row: Entry): boolean {
  if (row.kind?.includes('char')) return true;
  return row.senses.length > 0 && row.senses.every((s) => LETTER_NAME.test(s.glosses[0] ?? '') || LETTER_NUMBER.test(s.glosses[0] ?? ''));
}

/**
 * The codes a card says for rows gathered into one entry.
 *
 * What kind of word it is, each part of speech once and three at most, the
 * one with the most meanings first: ser is a verb and a masculine noun, [v, n,
 * masc]. How it is used, only where every row says so: 수 has sixteen rows,
 * one of them uncommon and one historical, and the word is neither.
 */
function gathered(rows: Entry[]): string[] {
  const kinds = rows.map((r) => r.kind ?? []);
  // Each part of speech once, the one with the most meanings first: tout is a determiner before it is a noun.
  const parts = new Map<string, { meanings: number; beside: Set<string> }>();
  for (const row of rows) {
    const [part, ...rest] = (row.kind ?? []).filter((code) => GRAMMAR.has(code));
    if (!part) continue;
    const found = parts.get(part) ?? { meanings: 0, beside: new Set<string>() };
    found.meanings += row.senses.length;
    // A gender is a noun's: on an adjective it says only that the adjective has both forms.
    if (NOUNS.has(part)) for (const code of rest) if (BESIDE_NOUN.has(code)) found.beside.add(code);
    parts.set(part, found);
  }
  const ranked = [...parts].sort((a, b) => b[1].meanings - a[1].meanings);
  // The gender is said in the header where the word is a noun first; otherwise beside the noun's own meanings on the card.
  const named = ranked.slice(0, PARTS_NAMED).flatMap(([part, { beside }], at) => (at ? [part] : [part, ...beside]));
  const more = ranked.length - PARTS_NAMED;
  const shared = (kinds[0] ?? []).filter((code) => !GRAMMAR.has(code) && kinds.every((k) => k.includes(code)));
  // "+2" for the parts of speech not named: each still labels its meanings on the card.
  return [...new Set([...named, ...(more > 0 ? [`+${more}`] : []), ...shared])];
}

/** How many parts of speech a header names: a word with more is "adverb, determiner, pronoun, +1". */
const PARTS_NAMED = 3;
/** The parts of speech that have a gender of their own. */
const NOUNS = new Set(['n', 'name']);
/** What is said beside "noun": its gender, and that it has only a plural. */
const BESIDE_NOUN = new Set(['masc', 'fem', 'neut', 'pl-only']);

/**
 * Rows that share a headword, as one entry: senses in their order, `kind` naming every part of speech once.
 *
 * The lookup card shows one entry, and Wiktionary has a row for each part of
 * speech: como the adverb, the conjunction and the preposition. Rows keep
 * their order, but for those that only name a letter, which go last; the
 * entry takes the id of the row that leads. Each sense keeps the codes of the
 * row it came from, and a meaning two rows share is said once, under the
 * codes of both. Rows read differently stay apart, as JMdict's are, for
 * ranking to choose between.
 */
export function mergeByWord(entries: Entry[]): Entry[] {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = `${entry.word}\u0000${entry.reading ?? ''}`;
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }
  const merged: Entry[] = [];
  // An entry that only names a letter goes after the others: ل is "to, for" before it is a letter or a number.
  const letters: Entry[] = [];
  for (const group of groups.values()) {
    const rows = [...group.filter((r) => !namesALetter(r)), ...group.filter(namesALetter)];
    const [first, ...more] = rows;
    if (!first) continue;
    const into = rows.every(namesALetter) ? letters : merged;
    if (!more.length) {
      into.push(first);
      continue;
    }
    const senses: Sense[] = [];
    for (const row of rows) for (const sense of row.senses) addSense(senses, sense);
    const kind = gathered(rows);
    into.push({ ...first, common: rows.some((r) => r.common), senses, kind: kind.length ? kind : undefined });
  }
  return [...merged, ...letters];
}
