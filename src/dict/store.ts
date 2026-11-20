import { fetchJsonTgz } from './archive';
import { keysFor, rank, toEntry, wordsFor, type Entry, type FormReading, type RankHint, type RawWord } from './jmdict';
import { toKanji, type CharacterInfo, type StoredKanji } from './kanji';

/**
 * The dictionary store.
 *
 * JMdict is ~200k entries. Holding it in memory would cost the offscreen
 * document a few hundred megabytes, so it lives in IndexedDB: entries in one
 * store, a form → id index beside it. Lookups touch a handful of rows.
 *
 * Every dictionary is kept the same way, each in a database of its own, so a
 * learner of two languages downloads each dictionary once and switching
 * between them costs nothing. What differs between dictionaries — where one
 * is downloaded from, how its file is read, how its entries are ranked — is
 * its `Source`.
 */

const VERSION = 4;
const ENTRIES = 'entries';
const FORMS = 'forms';
const META = 'meta';
/** KANJIDIC2, one row per character. Added in version 3; used beside JMdict only. */
const KANJI = 'kanji';
/** What an inflected form is a form of. Added in version 4. */
const INFLECTIONS = 'inflections';

const RELEASE = '3.6.2+20261116213322';

/**
 * The shape of what `build` writes. Bump it whenever `toEntry` or `keysFor`
 * change what is stored, exactly as RELEASE is bumped for new data: either one
 * changing means an existing install holds something this code did not write.
 */
const FORMAT = 3;

/** What an inflected form is a form of: hablábamos → hablar, and what the ending says. */
export interface Inflection {
  form: string;
  of: Array<{ lemma: string; tags: string[] }>;
  /** The form's part of speech, where the dictionary says. */
  pos?: string;
}

/** A stretch of a dictionary on its way into the store. */
export interface Batch {
  entries: Array<{ entry: Entry; keys: string[] }>;
  inflections?: Inflection[];
  /** How far through the dictionary this batch reaches, 0 to 100. */
  percent: number;
}

/** One dictionary: where it is kept, where it comes from, and how its entries are ranked. */
export interface Source {
  id: string;
  /** The IndexedDB database it is kept in. */
  db: string;
  /** Its data's version — a release, or a name where the publisher has only "current". */
  release: string;
  /** The shape of what `read` hands over; bumped when that changes. */
  format: number;
  /**
   * Download one edition and hand its rows over a batch at a time, so a
   * dictionary far larger than memory can still be stored. Throws when the
   * download holds nothing: an empty answer must never replace a full store.
   */
  read(edition: string, onDownload?: (loaded: number, total: number) => void): Promise<AsyncIterable<Batch>>;
  /** The entries found under one key, most likely first. */
  rank(entries: Entry[], key: string, hint?: RankHint): Entry[];
  /**
   * Whether a word with no entry of its own is answered by the word it is a
   * form of, going by what the analyser says the word is. Left out, it always
   * is.
   */
  followsForms?(hint?: RankHint): boolean;
  /**
   * What the dictionary says of single characters, where it lists them as
   * entries: each character of a word, with its meanings and readings.
   */
  characters?(chars: string[]): Promise<CharacterInfo[]>;
  /**
   * Its entries carry the reading drawn above a word in a line — CC-CEDICT's
   * pinyin, the Cantonese dictionary's Jyutping — so the analyser's words
   * are read from it.
   */
  readsLines?: boolean;
}

/** What the store records about its contents once, and only once, complete. */
function mark(edition: string, source: Source): string {
  return `${edition}@${source.release}#${source.format}`;
}

/**
 * Pinned to one release, as the lindera dictionaries are. This used to point
 * at "latest" with a pinned filename, which broke the moment a newer release
 * shipped: the asset name changed under it and every download went 404 while
 * nothing else looked wrong. A bump here is a deliberate data update.
 */
export function jmdictUrl(edition: string): string {
  return (
    `https://github.com/scriptin/jmdict-simplified/releases/download/${RELEASE}/` +
    `jmdict-${edition}-${RELEASE}.json.tgz`
  );
}

/** Batched so one transaction does not hold ~200k writes open at once. */
const BATCH = 5000;

/** JMdict, as jmdict-simplified publishes it: one JSON file per language of definitions. */
export const JMDICT: Source = {
  id: 'jmdict',
  db: 'libregaku-dict',
  release: RELEASE,
  format: FORMAT,
  rank,
  async read(edition, onDownload) {
    const data = (await fetchJsonTgz(jmdictUrl(edition), onDownload)) as { words?: Array<RawWord | undefined> };
    const words = data.words ?? [];
    if (!words.length) throw new Error('libregaku: dictionary contained no words');
    return (async function* () {
      for (let i = 0; i < words.length; i += BATCH) {
        const end = Math.min(i + BATCH, words.length);
        const entries: Batch['entries'] = [];
        for (let j = i; j < end; j++) {
          const w = words[j];
          // The parsed JSON is the largest thing this document ever holds; let it
          // go a batch at a time rather than all at the very end.
          words[j] = undefined;
          if (!w) continue;
          const entry = toEntry(w, edition);
          if (entry) entries.push({ entry, keys: keysFor(w) });
        }
        yield { entries, percent: Math.round((end / words.length) * 100) };
      }
    })();
  },
};

const connections = new Map<string, Promise<IDBDatabase>>();

/**
 * One connection to each database for the life of the document. Opening per
 * lookup cost a round trip on every hover, and the tokenizer now asks too.
 */
function open(name: string = JMDICT.db): Promise<IDBDatabase> {
  let connection = connections.get(name);
  if (connection) return connection;
  connection = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(FORMS)) {
        // One row per (form, entry) pair; many entries share a form.
        db.createObjectStore(FORMS, { keyPath: ['form', 'id'] }).createIndex('form', 'form');
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(KANJI)) db.createObjectStore(KANJI, { keyPath: 'char' });
      if (!db.objectStoreNames.contains(INFLECTIONS)) {
        // Numbered as they arrive: one form can be a form of several words,
        // and its rows may sit far apart in the file.
        db.createObjectStore(INFLECTIONS, { autoIncrement: true }).createIndex('form', 'form');
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // A newer schema elsewhere must not be blocked by this connection.
      db.onversionchange = () => {
        db.close();
        connections.delete(name);
      };
      db.onclose = () => {
        connections.delete(name);
      };
      resolve(db);
    };
    req.onerror = () => {
      connections.delete(name);
      reject(req.error);
    };
  });
  connections.set(name, connection);
  return connection;
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function request<T>(req: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/** What the store currently holds, if anything is marked complete. */
async function storedMark(db: IDBDatabase): Promise<string | null> {
  try {
    return (await request<string | undefined>(db.transaction(META).objectStore(META).get('edition'))) ?? null;
  } catch {
    return null;
  }
}

/**
 * Populated, complete, and exactly what this code would build.
 *
 * The mark names the edition, the release and the format. Without the edition,
 * switching from English to Spanish would keep serving English — a setting that
 * appears to work and does not. Without the release, bumping RELEASE changed
 * nothing for anyone who had already downloaded the old one.
 */
export async function isPopulated(edition: string, source: Source = JMDICT): Promise<boolean> {
  const db = await open(source.db);
  if ((await storedMark(db)) !== mark(edition, source)) return false;
  const n = await request<number>(db.transaction(ENTRIES).objectStore(ENTRIES).count());
  return n > 1000;
}

/**
 * Complete data for this edition from an older release or format, if that is
 * what the store holds. Good enough to answer lookups while its replacement
 * downloads, rather than sending every word to a remote API meanwhile.
 */
export async function hasStale(edition: string, source: Source = JMDICT): Promise<boolean> {
  const db = await open(source.db);
  const stored = await storedMark(db);
  if (!stored || stored === mark(edition, source)) return false;
  // Marks before the release was recorded were the bare edition code.
  return stored === edition || stored.startsWith(`${edition}@`);
}

export async function build(
  edition: string,
  onProgress?: (phase: string, percent: number) => void,
  source: Source = JMDICT,
): Promise<number> {
  onProgress?.('downloading', 0);
  const batches = await source.read(edition, (loaded, total) => {
    onProgress?.('downloading', total ? Math.round((loaded / total) * 100) : 0);
  });

  const db = await open(source.db);

  // Emptied and unmarked in one transaction. Clearing the data but not the
  // mark meant a build interrupted half way — a closed browser, a full disk —
  // left a partial store that still claimed to be complete.
  onProgress?.('indexing', 0);
  const reset = db.transaction([ENTRIES, FORMS, INFLECTIONS, META], 'readwrite');
  reset.objectStore(ENTRIES).clear();
  reset.objectStore(FORMS).clear();
  reset.objectStore(INFLECTIONS).clear();
  reset.objectStore(META).delete('edition');
  await done(reset);

  let written = 0;
  for await (const batch of batches) {
    const tx = db.transaction([ENTRIES, FORMS, INFLECTIONS], 'readwrite');
    const entries = tx.objectStore(ENTRIES);
    const forms = tx.objectStore(FORMS);
    for (const { entry, keys } of batch.entries) {
      entries.put(entry);
      for (const form of keys) forms.put({ form, id: entry.id });
      written++;
    }
    if (batch.inflections?.length) {
      const inflections = tx.objectStore(INFLECTIONS);
      for (const row of batch.inflections) inflections.put(row);
    }
    await done(tx);
    onProgress?.('indexing', batch.percent);
  }
  if (!written) throw new Error('libregaku: dictionary contained no words');

  const marker = db.transaction(META, 'readwrite');
  marker.objectStore(META).put(mark(edition, source), 'edition');
  // When it was fetched: all a publisher with only a "current" file lets us say about it.
  marker.objectStore(META).put(new Date().toISOString(), 'fetched');
  await done(marker);

  return written;
}

/** Every entry filed under one form, unranked. */
async function candidates(db: IDBDatabase, key: string): Promise<Entry[]> {
  const tx = db.transaction([ENTRIES, FORMS]);
  const rows = await request<Array<{ id: string }>>(tx.objectStore(FORMS).index('form').getAll(key));
  if (!rows.length) return [];
  const store = tx.objectStore(ENTRIES);
  const found = await Promise.all(
    rows.map((r) => request<Entry | undefined>(store.get(r.id)).catch(() => undefined)),
  );
  return found.filter((e): e is Entry => Boolean(e));
}

/** How many ranked entries a lookup returns. */
const LIMIT = 20;

/**
 * Entries for one key, best first.
 *
 * Every candidate is ranked before any is dropped. Cutting to twenty first,
 * in id order, is how a common word could lose to rarer entries that merely
 * had lower sequence numbers.
 */
export async function lookup(key: string, hint?: RankHint, source: Source = JMDICT): Promise<Entry[]> {
  if (!key) return [];
  const db = await open(source.db);
  const found = await candidates(db, key);
  if (found.length) return source.rank(found, key, hint).slice(0, LIMIT);

  // No entry under it. A form the dictionary lists under another word — 넌
  // under 너, gran under grande — is answered by that word's entry: better
  // than "no entry" for a word it knows by another name. Not where the
  // dictionary says a word of this kind is no form of anything: a particle.
  if (source.followsForms?.(hint) === false) return [];
  const rows = await request<Inflection[]>(
    db.transaction(INFLECTIONS).objectStore(INFLECTIONS).index('form').getAll(key),
  ).catch(() => []);
  const words = [...new Set(rows.flatMap((row) => row.of.map((o) => o.lemma)))].slice(0, FORMS_FOLLOWED);
  const out: Entry[] = [];
  for (const word of words) out.push(...source.rank(await candidates(db, word), word, hint));
  return out.slice(0, LIMIT);
}

/** How many of the words a form belongs to a lookup follows. */
const FORMS_FOLLOWED = 3;

/** What the dictionary knows about a written form: whether it is a word, and what it is a form of. */
export interface FormInfo {
  /** It is a headword in its own right. */
  word: boolean;
  /**
   * How many meanings it has as one — the nearest thing a dictionary with no
   * word counts has to how common a word is. 0 when it is no headword.
   */
  senses: number;
  /** What kinds of word it is, in the dictionary's own codes: n, v, prep. */
  kind: string[];
  /** What it is a form of, where it is one, each with how many meanings that word has. */
  of: Array<{ lemma: string; tags: string[]; pos?: string; senses: number; spellingOf?: string[] }>;
}

/**
 * Whether each written form is a word, and what it is a form of — the
 * dictionary as a table of inflections, for a language whose words are found
 * by their boundaries alone (src/morphology/lemma.ts). Forms it knows nothing
 * of are left out.
 *
 * A form is sometimes filed under a word that is itself only a form: ha is a
 * form of her, an old spelling with no entry, which is a form of haber. Such
 * a step is followed once, so the answer names words with entries.
 */
export async function formsOf(forms: string[], source: Source): Promise<Record<string, FormInfo>> {
  const out: Record<string, FormInfo> = {};
  if (!forms.length) return out;
  const db = await open(source.db);
  const tx = db.transaction([ENTRIES, FORMS, INFLECTIONS]);
  const entries = tx.objectStore(ENTRIES);
  const words = tx.objectStore(FORMS).index('form');
  const inflections = tx.objectStore(INFLECTIONS).index('form');

  /** What the dictionary has under one headword. Asked once for each, however many forms lead to it. */
  const asked = new Map<string, Promise<{ senses: number; kind: string[]; spellingOf: string[] }>>();
  const headword = (word: string): Promise<{ senses: number; kind: string[]; spellingOf: string[] }> => {
    let found = asked.get(word);
    if (!found) {
      found = (async () => {
        const rows = await request<Array<{ id: string }>>(words.getAll(word)).catch(() => []);
        const under = await Promise.all(
          rows.map((r) => request<Entry | undefined>(entries.get(r.id)).catch(() => undefined)),
        );
        const kind = new Set<string>();
        let senses = 0;
        for (const e of under) {
          if (!e) continue;
          senses += e.senses.length;
          for (const k of e.kind ?? e.senses[0]?.pos ?? []) kind.add(k);
        }
        // Another way of writing a word is filed under it as an inflection tagged alternative: connaitre of connaître.
        const filed = await request<Inflection[]>(inflections.getAll(word)).catch(() => []);
        const spellingOf = filed.flatMap((r) => r.of).filter((w) => w.tags.some((t) => t === 'alternative' || t === 'alt-of')).map((w) => w.lemma);
        return { senses, kind: [...kind], spellingOf: [...new Set(spellingOf)] };
      })();
      asked.set(word, found);
    }
    return found;
  };
  const formsUnder = (form: string): Promise<Inflection[]> =>
    request<Inflection[]>(inflections.getAll(form)).catch(() => []);

  await Promise.all(
    [...new Set(forms)].map(async (form) => {
      const [self, rows] = await Promise.all([headword(form), formsUnder(form)]);
      if (!self.senses && !rows.length) return;
      const of: FormInfo['of'] = [];
      for (const row of rows) {
        for (const way of row.of) {
          const pos = row.pos ? { pos: row.pos } : {};
          const target = await headword(way.lemma);
          // No entry under that word: see what it is a form of in turn, once.
          const further = target.senses ? [] : (await formsUnder(way.lemma)).flatMap((r) => r.of);
          if (!further.length) {
            of.push({ ...way, ...pos, senses: target.senses, ...(target.spellingOf.length ? { spellingOf: target.spellingOf } : {}) });
            continue;
          }
          for (const hop of further) {
            if (hop.lemma !== form) of.push({ lemma: hop.lemma, tags: way.tags, ...pos, senses: (await headword(hop.lemma)).senses });
          }
        }
      }
      out[form] = { word: self.senses > 0, senses: self.senses, kind: self.kind, of };
    }),
  );
  return out;
}

/** One dictionary word a written form stands for. */
export type Reading = FormReading;

/**
 * What each written form reads as, for the tokenizer.
 *
 * Merging morphemes needs to know whether 一人 is a word and how it reads —
 * ひとり, which no concatenation of 一 and 人 produces — and whether お寿司
 * has its own entry or only 寿司 does. Several readings for one form (一日:
 * いちにち, ついたち) are all returned so the caller can decline to choose.
 */
export async function lexicon(forms: string[]): Promise<Record<string, Reading[]>> {
  const out: Record<string, Reading[]> = {};
  if (!forms.length) return out;
  const db = await open();
  await Promise.all(
    [...new Set(forms)].map(async (form) => {
      const words = wordsFor(await candidates(db, form), form);
      if (words.length) out[form] = words;
    }),
  );
  return out;
}

/* ── Words for the analyser (src/morphology/extra-words.ts) ─────── */

/** What the dictionary holds now, to file a list built from it under. Null when it is not complete. */
export async function dataMark(): Promise<string | null> {
  return storedMark(await open());
}

/** Every entry, one at a time — for building something from all of them without holding them all. */
export async function eachEntry(fn: (entry: Entry) => void): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const req = db.transaction(ENTRIES).objectStore(ENTRIES).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return resolve();
      fn(cursor.value as Entry);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

/** What was built from the dictionary for the analyser: the words added to it, and the words whose reading it is put right on. */
export interface AnalyserWords {
  csv: string;
  readings: string;
}

/** The lists built for the analyser, if they were filed under `mark`. */
export async function storedWords(mark: string): Promise<AnalyserWords | null> {
  const db = await open();
  const got = await request<{ mark: string; csv: string; readings?: string } | undefined>(
    db.transaction(META).objectStore(META).get('extraWords'),
  ).catch(() => undefined);
  return got?.mark === mark ? { csv: got.csv, readings: got.readings ?? '' } : null;
}

export async function storeWords(mark: string, words: AnalyserWords): Promise<void> {
  const db = await open();
  const tx = db.transaction(META, 'readwrite');
  tx.objectStore(META).put({ mark, ...words }, 'extraWords');
  await done(tx);
}

/* ── KANJIDIC2 ──────────────────────────────────────────────────── */

/** The shape `buildKanji` writes; bumped when toKanji changes what is stored. */
const KANJI_FORMAT = 1;

function kanjiMark(): string {
  return `kanjidic2@${RELEASE}#${KANJI_FORMAT}`;
}

/** Every language KANJIDIC2 has meanings in, from the same pinned release as JMdict. */
export function kanjidicUrl(): string {
  return (
    `https://github.com/scriptin/jmdict-simplified/releases/download/${RELEASE}/` +
    `kanjidic2-all-${RELEASE}.json.tgz`
  );
}

/** Complete, and exactly what this code would build. */
export async function hasKanji(): Promise<boolean> {
  const db = await open();
  let stored: string | null;
  try {
    stored = (await request<string | undefined>(db.transaction(META).objectStore(META).get('kanji'))) ?? null;
  } catch {
    return false;
  }
  if (stored !== kanjiMark()) return false;
  return (await request<number>(db.transaction(KANJI).objectStore(KANJI).count())) > 1000;
}

/** Download KANJIDIC2 and store it — 1.5 MB, once. Unmarked while it is written, as `build` is. */
export async function buildKanji(): Promise<number> {
  const data = (await fetchJsonTgz(kanjidicUrl())) as { characters?: unknown[] };
  const chars = data.characters ?? [];
  if (!chars.length) throw new Error('libregaku: KANJIDIC2 contained no characters');

  const db = await open();
  const reset = db.transaction([KANJI, META], 'readwrite');
  reset.objectStore(KANJI).clear();
  reset.objectStore(META).delete('kanji');
  await done(reset);

  const BATCH = 4000;
  let written = 0;
  for (let i = 0; i < chars.length; i += BATCH) {
    const tx = db.transaction(KANJI, 'readwrite');
    const store = tx.objectStore(KANJI);
    for (const raw of chars.slice(i, i + BATCH)) {
      const k = toKanji(raw);
      if (!k) continue;
      store.put(k);
      written++;
    }
    await done(tx);
  }

  const marker = db.transaction(META, 'readwrite');
  marker.objectStore(META).put(kanjiMark(), 'kanji');
  await done(marker);
  return written;
}

/** The stored entries for these characters, in the order asked; ones it lacks are left out. */
export async function kanjiFor(chars: string[]): Promise<StoredKanji[]> {
  if (!chars.length) return [];
  const db = await open();
  const store = db.transaction(KANJI).objectStore(KANJI);
  const found = await Promise.all(
    chars.map((c) => request<StoredKanji | undefined>(store.get(c)).catch(() => undefined)),
  );
  return found.filter((k): k is StoredKanji => Boolean(k));
}
