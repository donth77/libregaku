import { keysFor as cedictKeys, parseLine, rank as cedictRank, toEntry as cedictEntry, type CedictRow } from './cedict';
import { fetchBytes, gunzipText } from './download';
import type { Entry, RankHint } from './jmdict';
import type { CharacterInfo } from './kanji';
import { JMDICT, lookup, type Batch, type Source } from './store';
import { wikdictEntries, wikdictUrl } from './wikdict';
import { formIn, mergeByWord, onlyForm, readRow, type Inflection } from './wty';
import { foldArabic } from '../morphology/arabic';
import { foldHindi } from '../morphology/hindi';
import { foldTurkish } from '../morphology/turkish';
import { zipFiles } from './zip';

/**
 * The dictionaries, one for each language that has one, by the names
 * settings.ts gives them (DICTIONARIES).
 *
 * JMdict is in store.ts, where it has always been. The others are read
 * here: each is somebody else's file in somebody else's format, and this is
 * the one place that says where it comes from and what a row of it means.
 */

/** Rows to a transaction: enough to be few, few enough not to hold the store long. */
const ROWS = 5000;

/** An id that sorts as a number does, so entries come back in their file's order. */
const idOf = (n: number): string => String(n).padStart(8, '0');

/* ── CC-CEDICT ──────────────────────────────────────────────────── */

/**
 * MDBG publishes the current file and nothing else: there is no release to
 * pin, and the address has not changed in fifteen years. The format is one
 * line a word, unchanged for longer. What is stored is marked with the day it
 * was fetched (store.ts), and replaced only when FORMAT here is bumped.
 */
export const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

/** How many characters of a word the card describes; a word is rarely longer. */
const CHARACTERS = 12;

export const CEDICT: Source = {
  id: 'cedict',
  db: 'libregaku-dict-cedict',
  release: 'mdbg',
  format: 1,
  readsLines: true,
  rank: cedictRank,
  async read(_edition, onDownload) {
    const lines = (await gunzipText(await fetchBytes(CEDICT_URL, onDownload))).split('\n');
    if (lines.length < 1000) throw new Error('libregaku: dictionary contained no words');
    return (async function* (): AsyncGenerator<Batch> {
      for (let i = 0; i < lines.length; i += ROWS) {
        const end = Math.min(i + ROWS, lines.length);
        const entries: Batch['entries'] = [];
        for (let j = i; j < end; j++) {
          const row = parseLine(lines[j] ?? '');
          if (row) entries.push({ entry: cedictEntry(row, idOf(j)), keys: cedictKeys(row) });
        }
        yield { entries, percent: Math.round((end / lines.length) * 100) };
      }
    })();
  },
  /**
   * Each character of a word, from its own entry: 学 "to learn", 校 "school".
   * Its readings stand where a kanji's do on the card — the commonest first.
   */
  characters: (chars) => charactersFrom(CEDICT, chars),
};

/**
 * Each character of a word, from its own entry in `source`: 学 "to learn",
 * 校 "school". Its readings stand where a kanji's do on the card — the
 * commonest first.
 */
async function charactersFrom(source: Source, chars: string[]): Promise<CharacterInfo[]> {
  const found = await Promise.all(
    chars.slice(0, CHARACTERS).map(async (char): Promise<CharacterInfo | null> => {
      const entries = await lookup(char, undefined, source);
      const top = entries[0];
      if (!top) return null;
      const readings = [...new Set(entries.map((e) => e.reading).filter((r): r is string => Boolean(r)))];
      return { char, meanings: top.senses.flatMap((s) => s.glosses).slice(0, 4), on: readings.slice(0, 3), kun: [] };
    }),
  );
  return found.filter((c): c is CharacterInfo => c !== null);
}

/* ── Wiktionary, by way of kaikki.org and wiktionary-to-yomitan ───── */

/**
 * The release of the published files this build reads, pinned as JMdict's
 * release is: the files under "latest" are replaced with every update, and a
 * dated tag is not. A tag rather than a commit: the publisher squashes the
 * history now and then, and a commit can go with it. A bump here is a
 * deliberate data update, and FORMAT below goes with it only if the reader
 * (wty.ts) had to change.
 */
const WTY_TAG = '2026-10-22';
const WTY_REVISION = '2026.10.22';

/**
 * Where an edition files a language under another code than ours, by the language and then the edition:
 * Russian and Spanish Wiktionary write Mandarin as cmn, so Chinese words explained in Russian are wty-cmn-ru.
 */
const FILED_AS: Record<string, Record<string, string>> = { zh: { ru: 'cmn', es: 'cmn' } };

/** A Wiktionary dictionary: `target` words explained in `native`. */
export function wtyUrl(target: string, native: string): string {
  const filed = FILED_AS[target]?.[native] ?? target;
  return (
    `https://huggingface.co/datasets/daxida/wty-release/resolve/${WTY_TAG}/` +
    `latest/dict/${filed}/${native}/wty-${filed}-${native}.zip`
  );
}

/**
 * The key a language's words are looked up by where one word has several spellings (foldHindi). Each word and
 * each form is kept under it as well, as another way of writing the word, so the line's spelling leads to the
 * dictionary's and a card is made for the dictionary's.
 */
const RESPELL: Record<string, (word: string) => string> = { hi: foldHindi, tr: foldTurkish };

/**
 * How a language's forms name the word they are a form of, where the file writes that otherwise than the
 * word's key: an Arabic form names its word with the vowels (كَتَبَ), and the word is under كتب.
 */
const LEMMA_KEY: Record<string, (word: string) => string> = { ar: foldArabic };

/**
 * What a language's forms are described with that the written form cannot show, by language, left out of what
 * is stored. An Arabic noun's case is its last vowel, which is not written, so الكتابُ, الكتابَ and الكتابِ are one
 * form to a reader and the file's three rows for them one row here; Arabic's are a third as many that way. Its
 * active voice and indicative mood go unsaid as the plain ones, as Spanish's do, and its classes of ending
 * (triptote, ar-infl-a) are the grammarian's, not the reader's.
 */
const UNWRITTEN: Record<string, ReadonlySet<string>> = {
  ar: new Set([
    'nominative', 'accusative', 'genitive', 'informal', 'triptote', 'diptote', 'invariable', 'sound-form', 'broken-form',
    'active', 'indicative', 'perfective', 'imperfective', 'ar-infl-a', 'ar-infl-in', 'ar-infl-ah', 'ar-infl-an-maksura',
    'ar-infl-an-alef', 'ar-infl-awna',
  ]),
};

/**
 * Languages whose table of forms names rightly the word each form is of and describes the form wrongly: its
 * Turkish verbs' descriptions are often the next row's (geliyorum, "I am coming", is third-person). Their forms
 * are stored with only what says how a spelling stands to another, and the analyser names the suffixes
 * (src/morphology/turkish.ts).
 */
const UNDESCRIBED: ReadonlySet<string> = new Set(['tr']);

/** How many letters after the stem a stored Turkish form has at most (READ_BY_SUFFIXES). */
const LONG_CHAIN = 6;
/**
 * Forms a language's analyser reads by itself, left out of what is stored: a Turkish form with more than
 * LONG_CHAIN letters after its word's stem (evlerimizden, of ev; gelmeyeceğim, of gelmek) is read by the
 * suffixes (src/morphology/turkish.ts). The shorter ones are kept, and those whose stem is written otherwise
 * (kitabı, of kitap; gidiyor, of gitmek): 945,000 of Wiktionary's 2.7 million. Keeping only the second kind
 * found 2.4 points fewer of Tatoeba's words.
 */
const READ_BY_SUFFIXES: Record<string, (form: string, lemma: string) => boolean> = {
  tr: (form, lemma) => {
    const stem = /m[ae]k$/.test(lemma) ? lemma.slice(0, -3) : lemma;
    return form.startsWith(stem) && form.length - stem.length > LONG_CHAIN;
  },
};
/** What is kept of an UNDESCRIBED language's descriptions. */
const SPELLING_TAGS = new Set(['alternative', 'alt-of', 'misspelling', 'nonstandard', 'obsolete', 'archaic', 'dated', 'informal', 'rare']);

/** A description with what UNWRITTEN leaves out of it left out: "nominative/accusative singular definite" is "singular definite". */
const written = (tags: readonly string[], unwritten: ReadonlySet<string>): string[] => [...new Set(tags
  .map((t) => t.split(' ').map((w) => w.split('/').filter((x) => !unwritten.has(x)).join('/')).filter(Boolean).join(' '))
  .filter(Boolean))];

/**
 * A batch's forms with those of one spelling as one row, each way of being a form of a word said once: what
 * the rows of a language whose descriptions UNWRITTEN shortens come to.
 */
function oneRowEach(rows: Inflection[], unwritten: ReadonlySet<string>): Inflection[] {
  const byForm = new Map<string, Inflection>();
  for (const row of rows) {
    const into = byForm.get(row.form) ?? { form: row.form, of: [], ...(row.pos ? { pos: row.pos } : {}) };
    for (const way of row.of) {
      const tags = written(way.tags, unwritten);
      if (!into.of.some((o) => o.lemma === way.lemma && o.tags.join('\n') === tags.join('\n'))) into.of.push({ lemma: way.lemma, tags });
    }
    byForm.set(row.form, into);
  }
  return [...byForm.values()];
}

/** The shape of what is stored, where a language's has moved on from the rest (see `format` in wty()). */
// 22 November 2026: every language one up, as rows naming another spelling are read the way wty's 22 October release writes them (wty.ts).
// 23 November 2026: Japanese and Chinese, whose entries giving only another spelling are left out (pointerOnly in wty()).
const WTY_FORMAT: Record<string, number> = { de: 6, ko: 7, ja: 6, zh: 6 };

/**
 * The kinds of word (wty's codes) each of an analyser's tags stands for, by language: what a row has to be
 * to be the word the analyser found. Korean 안 is an adverb ("not") where it is tagged MAG, and 년 a counter
 * ("year") where it is NNBC, though the file's first rows for them are "inside" and a slur.
 */
const ROLES: Record<string, Record<string, readonly string[]>> = {
  // Only the tags that tell one row from the rest: a noun, a determiner or a number says too little, since a word
  // such as 막 or 한 has a row of each and the file's order is better than a guess among them.
  ko: { NP: ['pron'], NNBC: ['counter'], MAG: ['adv'], MAJ: ['conj', 'adv'], IC: ['intj'], VV: ['v'], VX: ['v'], VA: ['adj', 'v'], XR: ['adj', 'v'] },
};

/** Codes that say a row is not the usual use of the word. */
const MARKED = new Set(['lit', 'poet', 'dated', 'dialect', 'obs', 'arch', 'uncmmn', 'rare', 'offens', 'vulg', 'derog']);

/** The rows that are the analyser's role for the word first, the rest after them, each in its own order. */
function byRole(rows: Entry[], target: string, hint?: RankHint): Entry[] {
  const wanted = hint?.pos ? ROLES[target]?.[hint.pos.split('+')[0] ?? ''] : undefined;
  if (!wanted || rows.length < 2) return rows;
  const fits = (row: Entry): boolean => wanted.includes(row.kind?.[0] ?? '');
  const usual = (row: Entry): boolean => fits(row) && !(row.kind ?? []).some((k) => MARKED.has(k));
  // The role, in its usual use; then the role in a literary or a dated one; then the others.
  return [...rows.filter(usual), ...rows.filter((row) => fits(row) && !usual(row)), ...rows.filter((row) => !fits(row))];
}

/** A word, or a word's main meaning, that the published file leaves out. */
export interface Gap {
  word: string;
  /** What kind of word it is, in the file's codes. */
  kind: string[];
  glosses: string[];
  /** Its own inflected forms the file leaves out with it. */
  forms?: Array<{ form: string; tags: string[] }>;
}

/**
 * What the published files leave out, by the language the words are of.
 *
 * Wiktionary files muy, tu and buen as shortened forms of other words —
 * mucho, tuyo, bueno — and the converter drops such an entry without a trace:
 * no meaning, and nothing to say what it is a form of. For others it keeps
 * the entry and loses the sense everyone means: mi is there as the note and
 * the Greek letter and not as "my", al as "upon" and not "to the". They are
 * few, and among the commonest words there are: over 3.2 million words of
 * Tatoeba the Spanish ones with no entry were four in five of the words in
 * lower case that had none, muy alone one word in 340. Looking up muy and
 * finding nothing is not a dictionary. So they are given here, in our own
 * words, ahead of whatever the file has for the same word, and the list
 * stays this short: a word joins it by that count, not by a guess.
 */
export const GAPS: Record<string, Gap[]> = {
  es: [
    { word: 'muy', kind: ['adv'], glosses: ['very'] },
    { word: 'mi', kind: ['det'], glosses: ['my'], forms: [{ form: 'mis', tags: ['plural'] }] },
    {
      word: 'tu', kind: ['det'], glosses: ['your (said to one person addressed as tú)'],
      forms: [{ form: 'tus', tags: ['plural'] }],
    },
    { word: 'su', kind: ['det'], glosses: ['his, her, its, their; your (said to someone addressed as usted)'] },
    { word: 'una', kind: ['artic', 'fem'], glosses: ['a, an (before a feminine noun)'] },
    { word: 'al', kind: ['contr'], glosses: ['to the (a and el, written as one word)'] },
    { word: 'buen', kind: ['adj'], glosses: ['good (bueno, before a masculine singular noun)'] },
    { word: 'algún', kind: ['det'], glosses: ['some, any (alguno, before a masculine singular noun)'] },
    { word: 'cualquier', kind: ['det'], glosses: ['any, whichever (cualquiera, before a noun)'] },
    { word: 'primer', kind: ['adj'], glosses: ['first (primero, before a masculine singular noun)'] },
    { word: 'tercer', kind: ['adj'], glosses: ['third (tercero, before a masculine singular noun)'] },
    { word: 'san', kind: ['adj'], glosses: ['Saint (santo, before a man’s name)'] },
    { word: 'quizás', kind: ['adv'], glosses: ['perhaps, maybe'] },
  ],
  /*
   * French writes the article and the preposition together (au, aux) and drops
   * the vowel of a little word before a vowel (l', d', qu'), and the file keeps
   * au only as an old spelling of "à le" and has no entry at all for l', d' or
   * qu'. They are among the commonest words there are: au and aux are one word
   * in 150 of Tatoeba's French, and the three with an apostrophe more than that.
   */
  fr: [
    { word: 'au', kind: ['contr'], glosses: ['to the, at the, in the (à and le, written as one word)'] },
    { word: 'aux', kind: ['contr'], glosses: ['to the, at the, in the (à and les, written as one word)'] },
    { word: 'l\'', kind: ['artic', 'pron'], glosses: ['the (le or la before a vowel)', 'him, her, it (le or la before a vowel)'] },
    { word: 'd\'', kind: ['prep'], glosses: ['of, from (de before a vowel)'] },
    { word: 'qu\'', kind: ['conj', 'pron'], glosses: ['that (que before a vowel)', 'what, whom (que before a vowel)'] },
    { word: 'jusqu\'', kind: ['prep'], glosses: ['until, up to, as far as (jusque before a vowel)'] },
    { word: 'lorsqu\'', kind: ['conj'], glosses: ['when (lorsque before a vowel)'] },
    { word: 'puisqu\'', kind: ['conj'], glosses: ['since, because (puisque before a vowel)'] },
  ],
  /*
   * German joins a preposition and the article after it: im is in and dem, zum
   * zu and dem. The file has none of them as a word; ins is there only as a
   * form of im, which it lacks. They are about one word in 150 of Tatoeba's
   * German, im alone one in 300.
   */
  de: [
    { word: 'im', kind: ['contr'], glosses: ['in the (in and dem, written as one word)'] },
    { word: 'zum', kind: ['contr'], glosses: ['to the, for the (zu and dem, written as one word)'] },
    { word: 'zur', kind: ['contr'], glosses: ['to the, for the (zu and der, written as one word)'] },
    { word: 'vom', kind: ['contr'], glosses: ['from the, of the (von and dem, written as one word)'] },
    { word: 'beim', kind: ['contr'], glosses: ['at the, by the (bei and dem, written as one word)'] },
    { word: 'ans', kind: ['contr'], glosses: ['to the, on the (an and das, written as one word)'] },
    { word: 'aufs', kind: ['contr'], glosses: ['onto the, on the (auf and das, written as one word)'] },
    { word: 'ums', kind: ['contr'], glosses: ['around the, for the (um and das, written as one word)'] },
    { word: 'fürs', kind: ['contr'], glosses: ['for the (für and das, written as one word)'] },
    { word: 'durchs', kind: ['contr'], glosses: ['through the (durch and das, written as one word)'] },
    { word: 'übers', kind: ['contr'], glosses: ['over the, about the (über and das, written as one word)'] },
    // The file has -heit and not its twin, which words made with it are found by (Wendigkeit: wendig and -keit).
    { word: '-keit', kind: ['suf'], glosses: ['makes a noun of an adjective: -ness, -ity (as -heit does, after -ig, -lich, -bar and -sam)'] },
  ],
  /*
   * Italian puts a d on a before a vowel (ad andare), and the file has ad only
   * as "a for euphony", a word it has no entry for: one word in 820 of
   * Tatoeba's Italian. i, the article, one word in 140, is in the file only as
   * a form of every article at once, and was read as the plural of la.
   */
  it: [
    { word: 'i', kind: ['artic'], glosses: ['the (masculine plural, before most consonants: i libri)'] },
    { word: 'ad', kind: ['prep'], glosses: ['to, at, in (a before a vowel: ad andare)'] },
  ],
  /*
   * Portuguese writes o, a, os and as as lo, la, los and las after a verb that
   * drops its last r, s or z for them (encontrá-la, fazê-lo, di-lo), and the
   * file has them only as other spellings of o and a, which are not what they
   * are. Together they are one word in 740 of Tatoeba's Portuguese.
   */
  pt: [
    { word: 'lo', kind: ['pron'], glosses: ['him, it (o after a verb that drops its r, s or z: fazê-lo, "to do it")'] },
    { word: 'la', kind: ['pron'], glosses: ['her, it (a after a verb that drops its r, s or z: encontrá-la, "to find her")'] },
    { word: 'los', kind: ['pron'], glosses: ['them (os after a verb that drops its r, s or z: vê-los, "to see them")'] },
    { word: 'las', kind: ['pron'], glosses: ['them, feminine (as after a verb that drops its r, s or z: chamá-las, "to call them")'] },
  ],
  /*
   * Spoken Thai's particles, which the file has only as other spellings of the written ones (มั้ย of ไหม, เถอะ of
   * เถิด). Until 22 November 2026 the reader turned every such row round (readForm in wty.ts), so nothing led from
   * them to a meaning; they now lead to the written word, and these entries say how each is used in speech. And
   * ไหร่, the second half of เท่าไหร่ and เมื่อไหร่, which the browser cuts in two. Together they are one word in
   * 280 of Tatoeba's Thai.
   */
  th: [
    { word: 'ไหร่', kind: ['pron'], glosses: ['how much, when: the second half of เท่าไหร่, "how much", and เมื่อไหร่, "when" (ไร, as it is said)'] },
    { word: 'มั้ย', kind: ['ptcl'], glosses: ['... or not? (asks a yes-or-no question; ไหม, as it is said: เข้าใจมั้ย, "do you understand?")'] },
    { word: 'เถอะ', kind: ['ptcl'], glosses: ["let's; do (softens a suggestion or a request; เถิด, as it is said: ไปเถอะ, \"let's go\")"] },
    { word: 'ล่ะ', kind: ['ptcl'], glosses: ['then, so; and what about (asks on, or stresses; เล่า, as it is said: แล้วคุณล่ะ, "and you?")'] },
    { word: 'ซะ', kind: ['ptcl'], glosses: ['go on and; right away (after a verb, urges it done; เสีย, as it is said: กินซะ, "eat it up")'] },
    { word: 'รึ', kind: ['conj', 'ptcl'], glosses: ['or; ... is it? (หรือ, as it is said)'] },
  ],
  // anymore, which the file has only as another spelling of "any more": one word in 2,000 of Tatoeba's English.
  en: [
    { word: 'anymore', kind: ['adv'], glosses: ['any longer; no longer, with a negative (I don’t live there anymore)', 'nowadays (US, in some dialects)'] },
  ],
  // सभी, "all, everyone" (सब and ही), is not in the file: one word in 1,100 of Tatoeba's Hindi.
  hi: [
    { word: 'सभी', kind: ['pron', 'det'], glosses: ['all, everyone; all of (सब, all, with ही, which stresses it)'] },
  ],
  // Spoken Korean's two commonest short forms: the file has 뭐 only as a form
  // of 무엇, and 거 only as the reading of a Chinese character.
  ko: [
    { word: '뭐', kind: ['pron'], glosses: ['what (무엇, as it is said)'] },
    // Three of the commonest words the file has in the wrong order: 시장 is "hunger" before "market", 분 a unit of
    // measure before "person" (분들, 그분), and 중 "average" before "during" (식사 중, 셋 중). Each is in it, further down.
    { word: '시장', kind: ['n'], glosses: ['market, marketplace (야시장, night market)', 'mayor'] },
    { word: '분', kind: ['n'], glosses: ['person, honorific (그분, "that person"; 분들, "people")'] },
    { word: '중', kind: ['n'], glosses: ['during, in the middle of (식사 중, "at a meal")', 'among, out of (셋 중, "one of three")'] },
    // 할 테니까, 갈 터예요: ko-dic reads 터 ("place") and the copula, and the file has only the place.
    { word: '-ㄹ 터이다', kind: ['phrase'], glosses: ['it will be, I expect (a stem and ㄹ, then 터이다: 갈 터예요, "I am going to go")', 'ㄹ 테니까: since it will, because I will (갈 테니까, "since I will go")'] },
    // What is put on a noun to make another word of it, which a word the file lacks (한국식, 실용적) is found by.
    { word: '-적', kind: ['suf'], glosses: ['-ic, -al, -ive: of or like the noun (실용적, practical)'] },
    { word: '-식', kind: ['suf'], glosses: ['-style, -type: in the way of the noun (한국식, Korean-style)'] },
    { word: '-화', kind: ['suf'], glosses: ['-ization: becoming or making the noun (현대화, modernization)'] },
    { word: '-별', kind: ['suf'], glosses: ['by, per, each: according to the noun (나라별, by country)'] },
    { word: '-형', kind: ['suf'], glosses: ['-type, -form: of the kind of the noun (대형, large-type)'] },
    { word: '-감', kind: ['suf'], glosses: ['feeling of the noun (안정감, sense of stability)'] },
    { word: '-력', kind: ['suf'], glosses: ['power, ability of the noun (경쟁력, competitiveness)'] },
    { word: '거', kind: ['n'], glosses: ['thing; the fact that (것, as it is said)'] },
    // The copula: under 이다 the file has "to carry on the head" and "to tile
    // a roof", and for "to be" only a line that points at -이다.
    { word: '이다', kind: ['v'], glosses: ['to be (after a noun)'] },
    /*
     * The particles. Wiktionary keeps each on a page named with a hyphen
     * before it, -를 and -까지, and the file files it there: a spelling no
     * word in a line has. Under the form alone it has whatever else is spelt
     * that way — 이 "this" and "tooth", 에서 Esau, 보다 "to see" — or a row
     * that calls 를 another way to write 이거, or nothing at all. One word in
     * four of Tatoeba's Korean is a particle, 24,714 in 15,941 sentences, and
     * none was answered by an entry that says what it does. Here is every
     * spelling of one with ten or more among them, and 하고, which speech has
     * for 와: 99 in 100 of them. All but 야, which ko-dic calls a particle as
     * often when it is the copula: 감자야, "it is a potato". Each spelling has
     * a line of its own, since which is said depends on the sound before it.
     * PARTICLE, below, is how a particle finds its line and no other word does.
     */
    { word: '이', kind: ['ptcl'], glosses: ['marks the subject (after a consonant)'] },
    { word: '가', kind: ['ptcl'], glosses: ['marks the subject (after a vowel)'] },
    { word: '께서', kind: ['ptcl'], glosses: ['marks the subject (with respect)'] },
    { word: '은', kind: ['ptcl'], glosses: ['marks the topic (after a consonant)'] },
    { word: '는', kind: ['ptcl'], glosses: ['marks the topic (after a vowel)'] },
    { word: '을', kind: ['ptcl'], glosses: ['marks the object (after a consonant)'] },
    { word: '를', kind: ['ptcl'], glosses: ['marks the object (after a vowel)'] },
    { word: '의', kind: ['ptcl'], glosses: ['’s, of'] },
    { word: '에', kind: ['ptcl'], glosses: ['at, in, on (a place or a time); to (a place)'] },
    { word: '에서', kind: ['ptcl'], glosses: ['at, in (where something is done); from (a place)'] },
    {
      word: '서', kind: ['ptcl'],
      glosses: ['at, in; from (에서, as it is said)', 'marks the subject, after a number of people (둘이서, the two together)'],
    },
    { word: '에게', kind: ['ptcl'], glosses: ['to (a person)'] },
    { word: '한테', kind: ['ptcl'], glosses: ['to (a person; spoken)'] },
    { word: '께', kind: ['ptcl'], glosses: ['to (a person, with respect)'] },
    { word: '으로', kind: ['ptcl'], glosses: ['to, toward; by, with, using; as (after a consonant other than ㄹ)'] },
    { word: '로', kind: ['ptcl'], glosses: ['to, toward; by, with, using; as (after a vowel or ㄹ)'] },
    { word: '과', kind: ['ptcl'], glosses: ['and; with (after a consonant)'] },
    { word: '와', kind: ['ptcl'], glosses: ['and; with (after a vowel)'] },
    { word: '하고', kind: ['ptcl'], glosses: ['and; with (spoken)'] },
    { word: '이랑', kind: ['ptcl'], glosses: ['and; with (spoken, after a consonant)'] },
    { word: '랑', kind: ['ptcl'], glosses: ['and; with (spoken, after a vowel)'] },
    { word: '이나', kind: ['ptcl'], glosses: ['or; or something; as many as (after a consonant)'] },
    { word: '나', kind: ['ptcl'], glosses: ['or; or something; as many as (after a vowel)'] },
    { word: '도', kind: ['ptcl'], glosses: ['also, too; even'] },
    { word: '만', kind: ['ptcl'], glosses: ['only, just'] },
    { word: '뿐', kind: ['ptcl'], glosses: ['only, nothing but'] },
    { word: '밖에', kind: ['ptcl'], glosses: ['only, nothing but (with a negative)'] },
    { word: '조차', kind: ['ptcl'], glosses: ['even'] },
    { word: '까지', kind: ['ptcl'], glosses: ['until, up to, as far as; even'] },
    { word: '부터', kind: ['ptcl'], glosses: ['from, since, starting with'] },
    { word: '보다', kind: ['ptcl'], glosses: ['than'] },
    { word: '처럼', kind: ['ptcl'], glosses: ['like, as'] },
    { word: '같이', kind: ['ptcl'], glosses: ['like, as'] },
    { word: '만큼', kind: ['ptcl'], glosses: ['as much as, as … as'] },
    { word: '대로', kind: ['ptcl'], glosses: ['as, according to'] },
    { word: '마다', kind: ['ptcl'], glosses: ['every, each'] },
    { word: '이라고', kind: ['ptcl'], glosses: ['marks what was said, or what something is called (after a consonant)'] },
    { word: '라고', kind: ['ptcl'], glosses: ['marks what was said, or what something is called (after a vowel)'] },
    { word: '요', kind: ['ptcl'], glosses: ['makes what is said polite'] },
  ],
};

/**
 * How a language's analyser tags a particle, where its dictionary has to be
 * told: ko-dic's tags for one all start with J — 를 is JKO, 는 JX.
 *
 * A particle is spelt like other words and is none of them. So a token the
 * analyser calls one is answered by a particle's own entry, which GAPS gives,
 * or not at all: never by 이 "tooth", nor by a word the rows of forms take it
 * for — the 마자 of 하자마자 is in the file as "let us smash", a form of 마다.
 * Nothing is an answer too. The 엔 of 이번엔 is 에 and 는 run together, the
 * file has only the yen under it, and the analyser's next key, 에, is asked.
 * Any other token is answered as it always was, by the other words of that
 * spelling, with the particle's entry after theirs.
 *
 * An ending (E…) is left as it was. What ko-dic calls an ending standing
 * alone is as often a verb it did not know — the 진다 of 서쪽으로 진다, the
 * 자니 of 아직도 자니 — and the rows of forms are what find 지다 and 자다.
 */
const PARTICLE: Record<string, RegExp> = { ko: /^J/ };

/**
 * A row that is a particle's. The file puts the part of speech first among a
 * row's codes, so 반입자, "an antiparticle", which is 'n ptcl', is not one.
 */
const ofParticle = (row: Entry): boolean => row.kind?.[0] === 'ptcl';

/** A word written out with its reading and nothing else: 大臣【だいじん】. */
const POINTER = /^[\p{Script=Han}々〆ヶ\p{Script=Hiragana}\p{Script=Katakana}ー]+【[\p{Script=Hiragana}\p{Script=Katakana}ー]+】$/u;
/** A meaning written in Chinese characters and kana alone: in Portuguese, わかる is "分かる | 解かる | 判る", its spellings. */
const SPELLINGS = /^(?=.*[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])[\p{Script=Han}々〆ヶ\p{Script=Hiragana}\p{Script=Katakana}ー\p{P}\s]+$/u;
/** The learners' languages written in Chinese characters, whose own meanings SPELLINGS would take for spellings. */
const WRITTEN_IN_HAN = new Set(['zh', 'zh-Hant', 'ja']);

/**
 * One Wiktionary dictionary as a source.
 *
 * The zip holds the entries in files of a few thousand rows each, and they
 * are unpacked and stored one at a time: Spanish is 346 MB unpacked, which is
 * more than should ever be held at once. A row is a word, or an inflected
 * form with the word it is a form of; the forms are what find hablar from
 * hablábamos (store.ts, formsOf).
 */
export function wty(target: string, native: string): Source {
  const id = `wty-${target}-${native}`;
  /*
   * Japanese Wiktionary in Chinese gives a third of its words only as the
   * word and its reading, 大臣【だいじん】: no meaning, and asked first, it
   * would stand in for one. Such an entry is left out, and the language's
   * own dictionary answers for the word instead. So is an entry that gives
   * a word only its other spellings, where the learner's language is not
   * written in Chinese characters: 36 of Portuguese's 6,068 for Japanese
   * (わかる, みる), and in Korean 15 of 17,357 for Chinese (感觉, "感覺.") and
   * 3 for Japanese.
   */
  const spellings = (g: string): boolean => !WRITTEN_IN_HAN.has(native) && SPELLINGS.test(g);
  const pointerOnly = (e: Entry): boolean =>
    native !== 'en' && e.senses.length > 0 && e.senses.every((s) => s.glosses.every((g) => POINTER.test(g) || spellings(g)));
  const particle = PARTICLE[target];
  const respell = RESPELL[target];
  const lemmaKey = LEMMA_KEY[target];
  const unwritten = UNWRITTEN[target];
  const undescribed = UNDESCRIBED.has(target);
  const bySuffixes = READ_BY_SUFFIXES[target];
  /** The token is one the analyser calls a particle. */
  const isParticle = (hint?: RankHint): boolean => Boolean(particle && hint?.pos && particle.test(hint.pos));
  return {
    id,
    db: `libregaku-dict-${id}`,
    release: WTY_REVISION,
    // Bumped when the reader (wty.ts) or the words added here (GAPS) change what is stored. By the language
    // whose words changed, so that a new word for German is not a new download of Spanish.
    format: WTY_FORMAT[target] ?? 5,
    rank: (entries: Entry[], key: string, hint?: RankHint) => {
      // One row for each part of speech a word has; the card shows one entry.
      // The row that is the role the analyser found for it first: 우리 "we", not 우리 "cage".
      const rows = byRole(entries.filter((e) => e.word === key), target, hint);
      if (!particle) return mergeByWord(rows);
      // A particle's rows are an entry apart (PARTICLE): all that answers a
      // particle, and what comes last for any other word.
      const own = mergeByWord(rows.filter(ofParticle));
      return isParticle(hint) ? own : [...mergeByWord(rows.filter((row) => !ofParticle(row))), ...own];
    },
    followsForms: (hint) => !isParticle(hint),
    async read(_edition, onDownload) {
      const number = (name: string): number => Number(/(\d+)\.json$/.exec(name)?.[1] ?? 0);
      const banks = zipFiles(await fetchBytes(wtyUrl(target, native), onDownload))
        .filter((f) => /^term_bank_\d+\.json$/.test(f.name))
        .sort((a, b) => number(a.name) - number(b.name));
      if (!banks.length) throw new Error('libregaku: dictionary contained no words');
      return (async function* (): AsyncGenerator<Batch> {
        let n = 0;
        // First, what the file leaves out: numbered ahead of its rows, so a
        // meaning given here leads the entry it is merged into. In English,
        // as they are written: a French edition is not given English meanings.
        const gaps = native === 'en' ? GAPS[target] ?? [] : [];
        if (gaps.length) {
          yield {
            entries: gaps.map((gap) => ({
              entry: {
                id: idOf(n++), word: gap.word, common: false, kind: gap.kind,
                senses: gap.glosses.map((g) => ({ pos: gap.kind, glosses: [g] })),
              },
              keys: [gap.word],
            })),
            inflections: gaps.flatMap((gap) => (gap.forms ?? []).map((f) => ({
              form: f.form, of: [{ lemma: gap.word, tags: f.tags }], pos: gap.kind[0],
            }))),
            percent: 0,
          };
        }
        for (const [at, bank] of banks.entries()) {
          const rows = JSON.parse(new TextDecoder().decode(await bank.bytes())) as unknown;
          if (!Array.isArray(rows)) continue;
          for (let i = 0; i < rows.length; i += ROWS) {
            const batch: Required<Omit<Batch, 'percent'>> = { entries: [], inflections: [] };
            for (const raw of rows.slice(i, i + ROWS) as unknown[]) {
              const row = readRow(raw, idOf(n++));
              if (!row) continue;
              // Arabic in some editions keyed with its vowels (كِتَاب): under كتاب, its vowels kept as the reading.
              if (lemmaKey && 'entry' in row && lemmaKey(row.entry.word) !== row.entry.word) {
                row.entry = { ...row.entry, word: lemmaKey(row.entry.word), reading: row.entry.reading ?? row.entry.word };
              }
              if (lemmaKey && 'inflection' in row) row.inflection = { ...row.inflection, form: lemmaKey(row.inflection.form) };
              if ('entry' in row) {
                // sono, a row of its own, is a form of essere (formIn), and only that where it says nothing more (onlyForm).
                if (!pointerOnly(row.entry) && !onlyForm(row.entry)) batch.entries.push({ entry: row.entry, keys: [row.entry.word] });
                const form = formIn(row.entry);
                if (form) batch.inflections.push(lemmaKey ? { ...form, of: form.of.map((o) => ({ ...o, lemma: lemmaKey(o.lemma) })) } : form);
                const key = respell?.(row.entry.word);
                if (key && key !== row.entry.word) batch.inflections.push({ form: key, of: [{ lemma: row.entry.word, tags: ['alternative'] }] });
              } else {
                let inflection = lemmaKey
                  ? { ...row.inflection, of: row.inflection.of.map((o) => ({ ...o, lemma: lemmaKey(o.lemma) })).filter((o) => o.lemma !== row.inflection.form) }
                  : row.inflection;
                // Read by the analyser where every word it is a form of is its stem and suffixes.
                if (bySuffixes && inflection.of.every((o) => bySuffixes(inflection.form, o.lemma))) continue;
                if (undescribed) {
                  const of = inflection.of.map((o) => ({ ...o, tags: o.tags.filter((t) => SPELLING_TAGS.has(t)) }));
                  inflection = { ...inflection, of: of.filter((o, i) => of.findIndex((x) => x.lemma === o.lemma && x.tags.join() === o.tags.join()) === i) };
                }
                if (!inflection.of.length) continue;
                batch.inflections.push(inflection);
                const key = respell?.(inflection.form);
                if (key && key !== inflection.form) batch.inflections.push({ ...inflection, form: key });
              }
            }
            if (unwritten) batch.inflections = oneRowEach(batch.inflections, unwritten);
            const within = Math.min(1, (i + ROWS) / rows.length);
            yield { ...batch, percent: Math.round(((at + within) / banks.length) * 100) };
          }
        }
      })();
    },
  };
}

/* ── Chinese in other languages, written as CC-CEDICT is ─────────── */

/**
 * A dictionary written line for line as CC-CEDICT is, with its meanings in
 * another language: CxDICT, which is CFDICT kept up to date (French), and
 * HanDeDict (German). Plain text rather than gzipped. CxDICT's lines may end
 * in CR, and HanDeDict keeps each entry's history in # lines, which are not
 * entries.
 */
function cedictIn(id: string, url: string, release: string): Source {
  return {
    id,
    db: `libregaku-dict-${id}`,
    release,
    format: 1,
    rank: cedictRank,
    async read(_edition, onDownload) {
      const text = new TextDecoder().decode(await fetchBytes(url, onDownload)).replace(/^\uFEFF/, '');
      const lines = text.split('\n');
      if (lines.length < 1000) throw new Error('libregaku: dictionary contained no words');
      return (async function* (): AsyncGenerator<Batch> {
        for (let i = 0; i < lines.length; i += ROWS) {
          const end = Math.min(i + ROWS, lines.length);
          const entries: Batch['entries'] = [];
          for (let j = i; j < end; j++) {
            const row = parseLine((lines[j] ?? '').replace(/\r$/, ''));
            if (row) entries.push({ entry: cedictEntry(row, idOf(j)), keys: cedictKeys(row) });
          }
          yield { entries, percent: Math.round((end / lines.length) * 100) };
        }
      })();
    },
  };
}

/** CxDICT's French file: CFDICT, from chine.in, kept up to date by its users. Its release tag moves with each update. */
export const CXDICT_URL = 'https://github.com/licryle/CxDICT/releases/download/latest-fr/CxDICT-French-Human.u8';
/** HanDeDict, from handedict.zydeo.net, as its maintainer keeps it on GitHub. */
export const HANDEDICT_URL = 'https://raw.githubusercontent.com/gugray/HanDeDict/master/handedict.u8';

/* ── Korean: the National Institute of Korean Language's dictionary for learners ── */

/**
 * 한국어기초사전 (krdict), the dictionary for learners of the National
 * Institute of Korean Language: 50,000 words, each explained in eleven
 * languages, from Lyroxide's Yomitan files (github.com/Lyroxide/yomitan-ko-dic),
 * one a language. The Institute's own download takes only a browser's
 * User-Agent and lets no other site read it; a GitHub release takes neither.
 * The text is CC BY-SA 2.0 KR; its recordings are licensed apart, and not used.
 */
const KRDICT_FILES: Record<string, string> = {
  ar: 'AR', en: 'EN', es: 'ES', fr: 'FR', id: 'ID', ja: 'JA', ru: 'RU', th: 'TH', vi: 'VI', zh: 'ZH', 'zh-Hant': 'ZH',
};

export function krdictUrl(lang: string): string {
  return `https://github.com/Lyroxide/yomitan-ko-dic/releases/download/1.0.0/KO-${KRDICT_FILES[lang] ?? 'EN'}.KRDICT.No.Examples.zip`;
}

/**
 * What each language's file calls a particle: the word kind the analyser's
 * particle tags (ko-dic's J…) are answered by, as for Wiktionary (PARTICLE).
 */
const KRDICT_PARTICLE = new Set([
  'Postpositional Particle', '助詞', '助词', 'Particule', 'Posposición', 'Partikel', 'Trợ từ',
  'падежное окончание', 'คำชี้', 'كلمة ملحقة',
]);

type Node = Record<string, unknown>;
const isNode = (x: unknown): x is Node => typeof x === 'object' && x !== null && !Array.isArray(x);
const kids = (content: unknown): unknown[] =>
  Array.isArray(content) ? content : content === undefined || content === null ? [] : [content];
const textOf = (content: unknown): string =>
  kids(content).map((c) => (typeof c === 'string' ? c : isNode(c) ? textOf(c.content) : '')).join('');

/**
 * A krdict row's meanings. Under the headword, each sense opens with a line
 * holding the word in the learner's language — after a bold "1. " where the
 * word has more than one sense — then a line that explains it, then labelled
 * lines, sentence patterns, which are left out.
 */
export function krdictSenses(definitions: unknown): string[][] {
  const senses: string[][] = [];
  const top = kids(isNode(kids(definitions)[0]) ? (kids(definitions)[0] as Node).content : definitions);
  /** A label set on a shaded ground: 文型, a sentence pattern, and the like. */
  const label = (x: unknown): boolean => isNode(x) && isNode(x.style) && 'backgroundColor' in x.style;
  for (const block of top) {
    if (!isNode(block) || block.tag !== 'div') continue;
    for (const line of kids(block.content)) {
      if (!isNode(line)) continue;
      const parts = kids(line.content);
      const head = parts[0];
      if (typeof line.content !== 'string' && parts.length && !label(head)) {
        const numbered = isNode(head) && /^\d+\.\s*$/.test(textOf(head.content));
        const word = textOf(numbered ? parts.slice(1) : parts).trim();
        senses.push(word ? [word] : []);
      } else if (typeof line.content === 'string' && senses.length) {
        // The line that explains it, in the learner's language.
        const said = line.content.trim();
        const last = senses[senses.length - 1]!;
        if (said && last.length < 2) last.push(said);
      }
    }
  }
  return senses.filter((s) => s.length);
}

const KRDICT: Source = {
  id: 'krdict',
  db: 'libregaku-dict-krdict',
  release: '1.0.0',
  // Bumped when krdictSenses reads a row differently.
  format: 2,
  rank: (entries: Entry[], key: string, hint?: RankHint) => {
    const rows = entries.filter((e) => e.word === key);
    const ofParticle = (e: Entry): boolean => KRDICT_PARTICLE.has(e.kind?.[0] ?? '');
    // A particle is answered by a particle's entry, or not at all; any other word by the others first.
    if (hint?.pos && PARTICLE.ko?.test(hint.pos)) return rows.filter(ofParticle);
    return [...rows.filter((e) => !ofParticle(e)), ...rows.filter(ofParticle)];
  },
  followsForms: () => false,
  async read(edition, onDownload) {
    const number = (name: string): number => Number(/(\d+)\.json$/.exec(name)?.[1] ?? 0);
    const banks = zipFiles(await fetchBytes(krdictUrl(edition), onDownload))
      .filter((f) => /^term_bank_\d+\.json$/.test(f.name))
      .sort((a, b) => number(a.name) - number(b.name));
    if (!banks.length) throw new Error('libregaku: dictionary contained no words');
    const HAN = /\p{Script=Han}/u;
    return (async function* (): AsyncGenerator<Batch> {
      let n = 0;
      for (const [at, bank] of banks.entries()) {
        const rows = JSON.parse(new TextDecoder().decode(await bank.bytes())) as unknown;
        if (!Array.isArray(rows)) continue;
        const entries: Batch['entries'] = [];
        for (const raw of rows as unknown[]) {
          if (!Array.isArray(raw) || typeof raw[0] !== 'string') continue;
          const word = raw[0];
          // The same entry is filed again under its Chinese characters, which no Korean line is written in.
          if (!word || HAN.test(word)) continue;
          const label = typeof raw[2] === 'string' ? raw[2] : '';
          const kind = label.replace(/⭐/g, '').trim();
          const senses = krdictSenses(raw[5]);
          if (!senses.length) continue;
          entries.push({
            entry: {
              id: idOf(n++), word,
              // Stars grade the words a learner meets first; any is common.
              common: label.includes('⭐'),
              ...(kind ? { kind: [kind] } : {}),
              senses: senses.map((glosses) => ({ pos: kind ? [kind] : [], glosses })),
            },
            keys: [word],
          });
        }
        yield { entries, percent: Math.round(((at + 1) / banks.length) * 100) };
      }
    })();
  },
};

/* ── Cantonese: CC-CEDICT's words read in Cantonese, and CC-Canto's own ── */

/**
 * Pleco's Cantonese data, from cantonese.org (CC BY-SA 3.0): CC-Canto, the
 * words of spoken Cantonese CC-CEDICT lacks — 佢哋, 咗, 冇 — with their
 * Jyutping and meanings; and a Jyutping reading for each CC-CEDICT word, so
 * the whole of CC-CEDICT reads in Cantonese. Both are pinned by their date
 * in the file name, and neither has changed in years.
 */
export const CANTO_URLS = {
  words: 'https://cantonese.org/cccanto-170202.zip',
  readings: 'https://cantonese.org/cccedict-canto-readings-150923.zip',
};

/** A line of CC-Canto, or of the readings: 佢哋 渠哋 [qu2 di4] {keoi5 dei6} /they/ # a note. The meanings are not in the readings. */
const CANTO_LINE = /^(\S+) (\S+) \[([^\]]*)\] \{([^}]*)\}(?: \/(.*)\/)?(?:\s*#.*)?\s*$/;

interface CantoRow {
  traditional: string;
  simplified: string;
  pinyin: string;
  jyutping: string;
  glosses: string[];
}

export function parseCanto(line: string): CantoRow | null {
  const [, traditional, simplified, pinyin, jyutping, body] = CANTO_LINE.exec(line.replace(/\r$/, '')) ?? [];
  if (!traditional || !simplified || pinyin === undefined || !jyutping) return null;
  const glosses = (body ?? '').split('/').map((g) => g.trim()).filter(Boolean);
  return { traditional, simplified, pinyin, jyutping: jyutping.trim(), glosses };
}

/**
 * The everyday reading of characters spoken all the time, where the files
 * list a rarer one first — the one a line would otherwise be read with: 嘅
 * is ge3 far more often than koi3, 食 sik6 rather than ji6. Each was checked
 * against the files' order; only these were wrong.
 */
const CANTO_USUAL: Record<string, string> = {
  嘅: 'ge3', 噉: 'gam2', 會: 'wui5', 㗎: 'gaa3', 喎: 'wo3', 乜: 'mat1', 咪: 'mai6', 靚: 'leng3', 食: 'sik6', 畀: 'bei2',
};

/** Words of everyday speech the files lack altogether. */
const CANTO_GAPS: Array<{ word: string; reading: string; glosses: string[] }> = [
  { word: '喺', reading: 'hai2', glosses: ['at, in, on (a place)', 'to be at (a place)'] },
  { word: '噃', reading: 'bo3', glosses: ['sentence-final particle: as a reminder, or advice'] },
  { word: '乜', reading: 'mat1', glosses: ['what (乜嘢, what thing)'] },
];

/** Which CC-CEDICT line a reading is for: both spellings and the pinyin, its spaces and case aside. */
const cantoKey = (traditional: string, simplified: string, pinyin: string): string =>
  `${traditional}\t${simplified}\t${pinyin.replace(/\s+/g, '').toLowerCase()}`;

/** The one text file in a zip, as text. */
async function zippedText(url: string, onDownload?: (loaded: number, total: number) => void): Promise<string> {
  const file = zipFiles(await fetchBytes(url, onDownload)).find((f) => /\.txt$/.test(f.name));
  if (!file) throw new Error('libregaku: dictionary contained no words');
  return new TextDecoder().decode(await file.bytes()).replace(/^\uFEFF/, '');
}

/**
 * Cantonese: CC-Canto's words first, then CC-CEDICT's, every one with its
 * reading in Jyutping, which is what is drawn above the words. A word read
 * two ways — 佢, keoi5 and heoi5 — has its commonest first, as the files do.
 */
export const CANTO: Source = {
  id: 'canto',
  db: 'libregaku-dict-canto',
  release: 'cccanto-170202+150923',
  // Bumped when what is stored changes: the words added (CANTO_GAPS), how a reading is chosen.
  format: 2,
  readsLines: true,
  rank: (entries: Entry[], key: string) => {
    const rows = entries.filter((e) => e.word === key || e.alt === key);
    // A character's everyday reading first, where the files lead with a rarer one.
    const usual = CANTO_USUAL[key];
    return usual ? [...rows.filter((e) => e.reading === usual), ...rows.filter((e) => e.reading !== usual)] : rows;
  },
  characters: (chars) => charactersFrom(CANTO, chars),
  async read(_edition, onDownload) {
    const [words, readings, cedict] = await Promise.all([
      zippedText(CANTO_URLS.words, onDownload),
      zippedText(CANTO_URLS.readings),
      fetchBytes(CEDICT_URL).then(gunzipText),
    ]);
    const jyutping = new Map<string, string>();
    /** Each character's commonest reading, for a word the readings do not have. */
    const ofChar = new Map<string, string>();
    for (const row of [...readings.split('\n'), ...words.split('\n')].map(parseCanto)) {
      if (!row) continue;
      const key = cantoKey(row.traditional, row.simplified, row.pinyin);
      if (!jyutping.has(key)) jyutping.set(key, row.jyutping);
      for (const char of [row.traditional, row.simplified]) {
        if ([...char].length === 1 && !ofChar.has(char)) ofChar.set(char, row.jyutping);
      }
    }
    /**
     * A word newer than the readings (2015), read a character at a time: right
     * for most, and for the rest a character read its usual way, which is what
     * a learner would guess. Nothing where any character has no reading.
     */
    const spelt = (word: string): string | undefined => {
      const each = [...word].map((c) => CANTO_USUAL[c] ?? ofChar.get(c));
      return each.every(Boolean) ? each.join(' ') : undefined;
    };
    const own = words.split('\n');
    const lines = cedict.split('\n');
    if (own.length < 1000 || lines.length < 1000 || jyutping.size < 1000) throw new Error('libregaku: dictionary contained no words');
    return (async function* (): AsyncGenerator<Batch> {
      let n = 0;
      const total = own.length + lines.length;
      const entryOf = (row: CedictRow, reading: string | undefined): Batch['entries'][number] => {
        const entry = cedictEntry(row, idOf(n++));
        // Jyutping as the files write it, numbers and all, in place of CC-CEDICT's pinyin.
        if (reading) entry.reading = reading;
        else delete entry.reading;
        return { entry, keys: cedictKeys(row) };
      };
      // What the files lack, then CC-Canto's own words: what is said in Cantonese leads what is written in Mandarin.
      yield {
        entries: CANTO_GAPS.map((gap) => ({
          entry: { id: idOf(n++), word: gap.word, reading: gap.reading, common: true, senses: [{ pos: [], glosses: gap.glosses }] },
          keys: [gap.word],
        })),
        percent: 0,
      };
      for (let i = 0; i < own.length; i += ROWS) {
        const entries: Batch['entries'] = [];
        for (const line of own.slice(i, i + ROWS)) {
          const row = parseCanto(line);
          if (row?.glosses.length) entries.push(entryOf(row, row.jyutping));
        }
        yield { entries, percent: Math.round((Math.min(i + ROWS, own.length) / total) * 100) };
      }
      for (let i = 0; i < lines.length; i += ROWS) {
        const entries: Batch['entries'] = [];
        for (const line of lines.slice(i, i + ROWS)) {
          const row = parseLine(line);
          if (row) {
            const reading = jyutping.get(cantoKey(row.traditional, row.simplified, row.pinyin)) ?? spelt(row.traditional);
            entries.push(entryOf(row, reading));
          }
        }
        yield { entries, percent: Math.round(((own.length + Math.min(i + ROWS, lines.length)) / total) * 100) };
      }
    })();
  },
};

/* ── WikDict: bilingual dictionaries from Wiktionary, for pairs the Wiktionary files hold little of ── */

/**
 * One WikDict pair as a source (wikdict.ts). The publisher keeps only the
 * current files, so `release` names the month this was last checked against
 * and the canary (audio.contract's neighbour, dict.contract.test.ts) watches
 * the address. Each pair is downloaded when it is chosen, and read by a table
 * walker of a hundred lines (sqlite.ts) that nothing runs until then.
 */
const WIKDICT_RELEASE = '2026-10';

export function wikdict(target: string, native: string): Source {
  const id = `wikdict-${target}-${native}`;
  return {
    id,
    db: `libregaku-dict-${id}`,
    release: WIKDICT_RELEASE,
    format: 1,
    rank: (entries: Entry[], key: string) => mergeByWord(entries.filter((e) => e.word === key)),
    async read(_edition, onDownload) {
      const file = await fetchBytes(wikdictUrl(target, native), onDownload);
      const all = [...wikdictEntries(file)];
      if (all.length < 1000) throw new Error('libregaku: dictionary contained no words');
      return (async function* (): AsyncGenerator<Batch> {
        for (let i = 0; i < all.length; i += ROWS) {
          const entries = all.slice(i, i + ROWS).map((entry) => ({ entry, keys: [entry.word] }));
          yield { entries, percent: Math.round((Math.min(i + ROWS, all.length) / all.length) * 100) };
        }
      })();
    },
  };
}

export const SOURCES: Record<string, Source> = {
  [JMDICT.id]: JMDICT,
  [CEDICT.id]: CEDICT,
  'wty-ko-en': wty('ko', 'en'),
  'wty-es-en': wty('es', 'en'),
  'wty-fr-en': wty('fr', 'en'),
  'wty-de-en': wty('de', 'en'),
  'wty-it-en': wty('it', 'en'),
  'wty-pt-en': wty('pt', 'en'),
  'wty-th-en': wty('th', 'en'),
  'wty-hi-en': wty('hi', 'en'),
  'wty-ar-en': wty('ar', 'en'),
  'wty-tr-en': wty('tr', 'en'),
  'wty-en-en': wty('en', 'en'),
  // In the learner's own language (settings.ts, OWN_DICTIONARIES).
  'wty-ja-zh': wty('ja', 'zh'),
  'wty-ja-ko': wty('ja', 'ko'),
  'wty-es-fr': wty('es', 'fr'),
  'wty-es-zh': wty('es', 'zh'),
  'wty-es-pl': wty('es', 'pl'),
  'wty-de-fr': wty('de', 'fr'),
  'wty-de-ru': wty('de', 'ru'),
  'wty-de-zh': wty('de', 'zh'),
  'wty-fr-zh': wty('fr', 'zh'),
  'wty-fr-tr': wty('fr', 'tr'),
  'wty-fr-vi': wty('fr', 'vi'),
  'wty-fr-ru': wty('fr', 'ru'),
  'wty-fr-th': wty('fr', 'th'),
  'wty-fr-nl': wty('fr', 'nl'),
  'wty-fr-pl': wty('fr', 'pl'),
  // Where Wiktionary's own file in the learner's language is a few thousand words (settings.ts, OWN_DICTIONARIES).
  'wikdict-fr-es': wikdict('fr', 'es'),
  'wikdict-fr-pt': wikdict('fr', 'pt'),
  'wikdict-fr-it': wikdict('fr', 'it'),
  'wikdict-de-es': wikdict('de', 'es'),
  'wikdict-de-pt': wikdict('de', 'pt'),
  'wikdict-de-it': wikdict('de', 'it'),
  'wikdict-es-de': wikdict('es', 'de'),
  'wikdict-es-pt': wikdict('es', 'pt'),
  'wikdict-es-it': wikdict('es', 'it'),
  'wty-zh-ja': wty('zh', 'ja'),
  'wty-zh-ko': wty('zh', 'ko'),
  'cxdict-fr': cedictIn('cxdict-fr', CXDICT_URL, 'latest-fr'),
  handedict: cedictIn('handedict', HANDEDICT_URL, 'master'),
  // Measured with scripts/measure-forms.mjs (COVER), November 2026: see OWN_DICTIONARIES in settings.ts.
  'wty-es-nl': wty('es', 'nl'),
  'wty-es-ru': wty('es', 'ru'),
  'wty-es-ko': wty('es', 'ko'),
  'wty-de-pl': wty('de', 'pl'),
  'wty-de-ko': wty('de', 'ko'),
  'wikdict-de-sv': wikdict('de', 'sv'),
  'wikdict-de-nl': wikdict('de', 'nl'),
  'wikdict-de-tr': wikdict('de', 'tr'),
  'wikdict-de-ja': wikdict('de', 'ja'),
  'wty-fr-ko': wty('fr', 'ko'),
  'wty-fr-ja': wty('fr', 'ja'),
  'wikdict-fr-de': wikdict('fr', 'de'),
  'wikdict-fr-sv': wikdict('fr', 'sv'),
  'wikdict-fr-id': wikdict('fr', 'id'),
  'wty-it-pl': wty('it', 'pl'),
  'wty-it-fr': wty('it', 'fr'),
  'wty-it-de': wty('it', 'de'),
  'wty-it-ru': wty('it', 'ru'),
  'wty-it-ko': wty('it', 'ko'),
  'wty-it-zh': wty('it', 'zh'),
  'wty-it-ja': wty('it', 'ja'),
  'wty-it-es': wty('it', 'es'),
  'wty-pt-fr': wty('pt', 'fr'),
  'wty-pt-pl': wty('pt', 'pl'),
  'wty-pt-ru': wty('pt', 'ru'),
  'wikdict-pt-es': wikdict('pt', 'es'),
  'wikdict-pt-de': wikdict('pt', 'de'),
  'wty-ar-pl': wty('ar', 'pl'),
  'wty-ar-ru': wty('ar', 'ru'),
  'wty-ar-fr': wty('ar', 'fr'),
  'wty-tr-ru': wty('tr', 'ru'),
  'wty-tr-pl': wty('tr', 'pl'),
  'wty-tr-zh': wty('tr', 'zh'),
  'wikdict-tr-de': wikdict('tr', 'de'),
  'wikdict-tr-fr': wikdict('tr', 'fr'),
  'wty-en-ja': wty('en', 'ja'),
  'wty-en-ko': wty('en', 'ko'),
  'wty-en-es': wty('en', 'es'),
  'wty-en-fr': wty('en', 'fr'),
  'wty-en-pl': wty('en', 'pl'),
  'wty-en-nl': wty('en', 'nl'),
  'wty-en-vi': wty('en', 'vi'),
  'wty-en-th': wty('en', 'th'),
  'wikdict-en-de': wikdict('en', 'de'),
  'wikdict-en-pt': wikdict('en', 'pt'),
  'wikdict-en-it': wikdict('en', 'it'),
  'wikdict-en-ru': wikdict('en', 'ru'),
  'wikdict-en-sv': wikdict('en', 'sv'),
  'wikdict-en-tr': wikdict('en', 'tr'),
  'wikdict-en-id': wikdict('en', 'id'),
  // Japanese and Chinese, measured with COVER in scripts/compare-unidic.mjs and scripts/measure-forms.mjs zh.
  'wty-ja-pt': wty('ja', 'pt'),
  'wty-zh-pl': wty('zh', 'pl'),
  [KRDICT.id]: KRDICT,
  [CANTO.id]: CANTO,
};
