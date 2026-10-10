import { fetchJsonTgz } from './archive';
import { keysFor, rank, readingsOf, toEntry, type Entry, type RankHint, type RawWord } from './jmdict';
import { toKanji, type StoredKanji } from './kanji';

/**
 * The dictionary store.
 *
 * JMdict is ~200k entries. Holding it in memory would cost the offscreen
 * document a few hundred megabytes, so it lives in IndexedDB: entries in one
 * store, a form → id index beside it. Lookups touch a handful of rows.
 */

const DB = 'libregaku-dict';
const VERSION = 3;
const ENTRIES = 'entries';
const FORMS = 'forms';
const META = 'meta';
/** KANJIDIC2, one row per character. Added in version 3. */
const KANJI = 'kanji';

const RELEASE = '3.6.2+20260914172325';

/**
 * The shape of what `build` writes. Bump it whenever `toEntry` or `keysFor`
 * change what is stored, exactly as RELEASE is bumped for new data: either one
 * changing means an existing install holds something this code did not write.
 */
const FORMAT = 3;

/** What the store records about its contents once, and only once, complete. */
function mark(edition: string): string {
  return `${edition}@${RELEASE}#${FORMAT}`;
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

let connection: Promise<IDBDatabase> | null = null;

/**
 * One connection for the life of the document. Opening per lookup cost a
 * round trip on every hover, and the tokenizer now asks too.
 */
function open(): Promise<IDBDatabase> {
  connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(FORMS)) {
        // One row per (form, entry) pair; many entries share a form.
        db.createObjectStore(FORMS, { keyPath: ['form', 'id'] }).createIndex('form', 'form');
      }
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      if (!db.objectStoreNames.contains(KANJI)) db.createObjectStore(KANJI, { keyPath: 'char' });
    };
    req.onsuccess = () => {
      const db = req.result;
      // A newer schema elsewhere must not be blocked by this connection.
      db.onversionchange = () => {
        db.close();
        connection = null;
      };
      db.onclose = () => {
        connection = null;
      };
      resolve(db);
    };
    req.onerror = () => {
      connection = null;
      reject(req.error);
    };
  });
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
export async function isPopulated(edition: string): Promise<boolean> {
  const db = await open();
  if ((await storedMark(db)) !== mark(edition)) return false;
  const n = await request<number>(db.transaction(ENTRIES).objectStore(ENTRIES).count());
  return n > 1000;
}

/**
 * Complete data for this edition from an older release or format, if that is
 * what the store holds. Good enough to answer lookups while its replacement
 * downloads, rather than sending every word to a remote API meanwhile.
 */
export async function hasStale(edition: string): Promise<boolean> {
  const db = await open();
  const stored = await storedMark(db);
  if (!stored || stored === mark(edition)) return false;
  // Marks before the release was recorded were the bare edition code.
  return stored === edition || stored.startsWith(`${edition}@`);
}

export async function build(
  edition: string,
  onProgress?: (phase: string, percent: number) => void,
): Promise<number> {
  onProgress?.('downloading', 0);
  const data = (await fetchJsonTgz(jmdictUrl(edition), (loaded, total) => {
    onProgress?.('downloading', total ? Math.round((loaded / total) * 100) : 0);
  })) as { words?: Array<RawWord | undefined> };

  const words = data.words ?? [];
  if (!words.length) throw new Error('libregaku: dictionary contained no words');

  const db = await open();

  // Emptied and unmarked in one transaction. Clearing the data but not the
  // mark meant a build interrupted half way — a closed browser, a full disk —
  // left a partial store that still claimed to be complete.
  onProgress?.('indexing', 0);
  const reset = db.transaction([ENTRIES, FORMS, META], 'readwrite');
  reset.objectStore(ENTRIES).clear();
  reset.objectStore(FORMS).clear();
  reset.objectStore(META).delete('edition');
  await done(reset);

  // Batched so one transaction does not hold ~200k writes open at once.
  const BATCH = 5000;
  let written = 0;

  for (let i = 0; i < words.length; i += BATCH) {
    const tx = db.transaction([ENTRIES, FORMS], 'readwrite');
    const entries = tx.objectStore(ENTRIES);
    const forms = tx.objectStore(FORMS);
    const end = Math.min(i + BATCH, words.length);

    for (let j = i; j < end; j++) {
      const w = words[j];
      // The parsed JSON is the largest thing this document ever holds; let it
      // go a batch at a time rather than all at the very end.
      words[j] = undefined;
      if (!w) continue;
      const entry = toEntry(w, edition);
      if (!entry) continue;
      entries.put(entry);
      for (const form of keysFor(w)) forms.put({ form, id: entry.id });
      written++;
    }

    await done(tx);
    onProgress?.('indexing', Math.round((end / words.length) * 100));
  }

  const marker = db.transaction(META, 'readwrite');
  marker.objectStore(META).put(mark(edition), 'edition');
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
export async function lookup(key: string, hint?: RankHint): Promise<Entry[]> {
  if (!key) return [];
  const db = await open();
  return rank(await candidates(db, key), key, hint).slice(0, LIMIT);
}

/** One dictionary word a written form stands for. */
export interface Reading {
  /** The entry's headword. */
  word: string;
  /** Its reading, in hiragana. */
  reading: string;
  /** The entry's first sense's part-of-speech codes. */
  pos?: string[];
}

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
      const ranked = rank(await candidates(db, form), form);
      const readings = readingsOf(ranked, form);
      if (!readings.length) return;
      out[form] = readings.map((reading) => {
        const entry = ranked.find((e) => (e.reading ?? (e.uk ? e.word : undefined)) === reading);
        return { word: entry?.word ?? form, reading, pos: entry?.senses[0]?.pos };
      });
    }),
  );
  return out;
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
