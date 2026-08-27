import { fetchJsonTgz } from './archive';
import { keysFor, rank, toEntry, type Entry, type RawWord } from './jmdict';

/**
 * The dictionary store.
 *
 * JMdict is ~200k entries. Holding it in memory would cost the offscreen
 * document a few hundred megabytes, so it lives in IndexedDB: entries in one
 * store, a form → id index beside it. Lookups touch a handful of rows.
 */

const DB = 'libregaku-dict';
const VERSION = 1;
const ENTRIES = 'entries';
const FORMS = 'forms';

export const JMDICT_URL =
  'https://github.com/scriptin/jmdict-simplified/releases/latest/download/jmdict-eng-3.6.2+20260824122934.json.tgz';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(ENTRIES)) db.createObjectStore(ENTRIES, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(FORMS)) {
        // One row per (form, entry) pair; many entries share a form.
        db.createObjectStore(FORMS, { keyPath: ['form', 'id'] }).createIndex('form', 'form');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function isPopulated(): Promise<boolean> {
  const db = await open();
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const req = db.transaction(ENTRIES).objectStore(ENTRIES).count();
      req.onsuccess = () => resolve(req.result > 1000);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function build(
  onProgress?: (phase: string, percent: number) => void,
): Promise<number> {
  onProgress?.('downloading', 0);
  const data = (await fetchJsonTgz(JMDICT_URL, (loaded, total) => {
    onProgress?.('downloading', total ? Math.round((loaded / total) * 100) : 0);
  })) as { words?: RawWord[] };

  const words = data.words ?? [];
  if (!words.length) throw new Error('libregaku: dictionary contained no words');

  const db = await open();
  try {
    // Batched so one transaction does not hold ~200k writes open at once.
    const BATCH = 5000;
    let written = 0;

    for (let i = 0; i < words.length; i += BATCH) {
      const tx = db.transaction([ENTRIES, FORMS], 'readwrite');
      const entries = tx.objectStore(ENTRIES);
      const forms = tx.objectStore(FORMS);

      for (const w of words.slice(i, i + BATCH)) {
        const entry = toEntry(w);
        if (!entry) continue;
        entries.put(entry);
        for (const form of keysFor(w)) forms.put({ form, id: entry.id });
        written++;
      }

      await done(tx);
      onProgress?.('indexing', Math.round((Math.min(i + BATCH, words.length) / words.length) * 100));
    }
    return written;
  } finally {
    db.close();
  }
}

export async function lookup(key: string): Promise<Entry[]> {
  if (!key) return [];
  const db = await open();
  try {
    const tx = db.transaction([ENTRIES, FORMS]);
    const ids = await new Promise<string[]>((resolve, reject) => {
      const req = tx.objectStore(FORMS).index('form').getAll(key);
      req.onsuccess = () => resolve((req.result as Array<{ id: string }>).map((r) => r.id));
      req.onerror = () => reject(req.error);
    });
    if (!ids.length) return [];

    const store = tx.objectStore(ENTRIES);
    const found = await Promise.all(
      ids.slice(0, 20).map(
        (id) =>
          new Promise<Entry | undefined>((resolve) => {
            const req = store.get(id);
            req.onsuccess = () => resolve(req.result as Entry | undefined);
            req.onerror = () => resolve(undefined);
          }),
      ),
    );
    return rank(found.filter((e): e is Entry => Boolean(e)), key);
  } finally {
    db.close();
  }
}
