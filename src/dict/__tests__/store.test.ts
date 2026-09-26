import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawWord } from '../jmdict';

vi.mock('../archive', () => ({ fetchJsonTgz: vi.fn() }));

/**
 * The store's bookkeeping, against a small in-memory IndexedDB.
 *
 * Only what store.ts uses: keyPath stores, one index, transactions that
 * complete when their requests have, and a way to make one fail part way.
 */

type Row = Record<string, unknown>;

class FakeIDB {
  stores = new Map<string, { keyPath?: string | string[]; rows: Map<string, Row> }>();
  version = 0;
  /** Fail every put in the n-th read-write transaction from now (1-based). */
  failWrite = 0;
  writes = 0;

  open(_name: string, version: number) {
    const req: Record<string, unknown> & { result?: unknown } = {};
    setTimeout(() => {
      const db = this.connection();
      req.result = db;
      if (version > this.version) {
        this.version = version;
        (req.onupgradeneeded as (() => void) | undefined)?.();
      }
      (req.onsuccess as (() => void) | undefined)?.();
    }, 0);
    return req;
  }

  connection() {
    const idb = this;
    return {
      objectStoreNames: { contains: (n: string) => idb.stores.has(n) },
      createObjectStore(name: string, opts?: { keyPath?: string | string[] }) {
        idb.stores.set(name, { keyPath: opts?.keyPath, rows: new Map() });
        return { createIndex: () => undefined };
      },
      transaction: (names: string | string[], mode = 'readonly') => idb.transaction(mode),
      close: () => undefined,
    };
  }

  transaction(mode: string) {
    const idb = this;
    const failing = mode === 'readwrite' && ++idb.writes === idb.failWrite;
    let pending = 0;
    let finished = false;
    const tx: Record<string, unknown> & { error?: unknown } = {};
    const settle = () => {
      setTimeout(() => {
        if (pending || finished) return;
        finished = true;
        (tx.oncomplete as (() => void) | undefined)?.();
      }, 0);
    };
    const request = (run: () => unknown, write = false) => {
      const req: Record<string, unknown> = {};
      pending++;
      setTimeout(() => {
        pending--;
        if (finished) return;
        if (write && failing) {
          finished = true;
          tx.error = new DOMException('quota', 'QuotaExceededError');
          (tx.onabort as (() => void) | undefined)?.();
          return;
        }
        req.result = run();
        (req.onsuccess as (() => void) | undefined)?.();
        settle();
      }, 0);
      return req;
    };
    const keyOf = (keyPath: string | string[] | undefined, v: Row, key?: unknown) =>
      JSON.stringify(Array.isArray(keyPath) ? keyPath.map((k) => v[k]) : keyPath ? v[keyPath] : key);
    tx.objectStore = (name: string) => {
      const s = idb.stores.get(name)!;
      const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
      return {
        put: (v: Row, key?: unknown) => request(() => s.rows.set(keyOf(s.keyPath, v, key), clone(v)), true),
        get: (key: unknown) => request(() => clone(s.rows.get(JSON.stringify(key)))),
        delete: (key: unknown) => request(() => s.rows.delete(JSON.stringify(key)), true),
        clear: () => request(() => s.rows.clear(), true),
        count: () => request(() => s.rows.size),
        index: (field: string) => ({
          getAll: (key: unknown) =>
            request(() =>
              [...s.rows.entries()]
                .filter(([, v]) => v[field] === key)
                .sort(([a], [b]) => (a < b ? -1 : 1))
                .map(([, v]) => clone(v)),
            ),
        }),
      };
    };
    settle();
    return tx;
  }
}

const word = (id: string, kana: string, opts: Partial<RawWord> & { uk?: boolean; common?: boolean } = {}): RawWord => ({
  id,
  kanji: opts.kanji,
  kana: [{ text: kana, common: opts.common ?? false }],
  sense: [{ partOfSpeech: ['n'], misc: opts.uk ? ['uk'] : [], gloss: [{ text: `gloss ${id}`, lang: 'eng' }] }],
});

/** Enough words to count as populated, plus whatever a test adds. */
const filler = Array.from({ length: 1001 }, (_, i) => word(String(3000000 + i), `ふぃら${i}`));

let idb: FakeIDB;

async function fresh(words: RawWord[] = filler) {
  vi.resetModules();
  idb = new FakeIDB();
  vi.stubGlobal('indexedDB', idb);
  const archive = await import('../archive');
  // A fresh array per download: build() releases each parsed word as it
  // indexes it, as it may with JSON it parsed itself.
  vi.mocked(archive.fetchJsonTgz).mockImplementation(async () => ({ words: [...words] }));
  return import('../store');
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());

describe('store', () => {
  it('builds, marks itself complete, and reports populated', async () => {
    const store = await fresh();
    await store.build('eng');
    expect(await store.isPopulated('eng')).toBe(true);
    expect(await store.isPopulated('ger')).toBe(false);
    expect(await store.hasStale('eng')).toBe(false);
  });

  it('treats an older release of the same edition as stale, not current', async () => {
    const store = await fresh();
    await store.build('eng');
    const meta = idb.stores.get('meta')!.rows;
    for (const old of ['eng', 'eng@3.6.2+20260824122934#2']) {
      meta.set(JSON.stringify('edition'), old as unknown as Row);
      expect(await store.isPopulated('eng'), old).toBe(false);
      expect(await store.hasStale('eng'), old).toBe(true);
      expect(await store.hasStale('ger'), old).toBe(false);
    }
  });

  it('unmarks the store before writing, so an interrupted build is never taken for complete', async () => {
    // More than one batch, so the failure lands after thousands of entries
    // are already in — enough to pass the count check on their own.
    const many = Array.from({ length: 6001 }, (_, i) => word(String(4000000 + i), `たくさん${i}`));
    const store = await fresh(many);
    await store.build('eng');
    expect(await store.isPopulated('eng')).toBe(true);

    // Rebuilding: the reset (write 1) and the first batch of 5000 (write 2)
    // land; the second batch fails — a full disk, say.
    idb.writes = 0;
    idb.failWrite = 3;
    await expect(store.build('eng')).rejects.toBeTruthy();
    expect(idb.stores.get('entries')!.rows.size).toBe(5000);
    expect(await store.isPopulated('eng')).toBe(false);
    expect(await store.hasStale('eng')).toBe(false);
  });

  it('ranks every candidate before returning any', async () => {
    // Twenty-four rare entries with low ids, and the everyday one last. Cut
    // to twenty in id order first, it could never be found.
    const rare = Array.from({ length: 24 }, (_, i) => word(String(1000000 + i), 'よう', { kanji: [{ text: `漢${i}` }] }));
    const everyday = word('1605840', 'よう', { kanji: [{ text: '様', common: true }], common: true, uk: true });
    const store = await fresh([...filler, ...rare, everyday]);
    await store.build('eng');
    const found = await store.lookup('よう');
    expect(found[0]?.id).toBe('1605840');
    expect(found.length).toBeLessThanOrEqual(20);
  });

  it('answers the tokenizer’s questions about written forms', async () => {
    const store = await fresh([
      ...filler,
      word('1576150', 'ひとり', { kanji: [{ text: '一人', common: true }], common: true }),
      word('1576260', 'いちにち', { kanji: [{ text: '一日', common: true }], common: true }),
      word('2225040', 'ついたち', { kanji: [{ text: '一日', common: true }], common: true }),
    ]);
    await store.build('eng');
    const lex = await store.lexicon(['一人', '一日', '三匹']);
    expect(lex['一人']).toEqual([{ word: '一人', reading: 'ひとり', pos: ['n'] }]);
    expect(lex['一日']?.map((r) => r.reading).sort()).toEqual(['いちにち', 'ついたち']);
    expect(lex['三匹']).toBeUndefined();
  });
});
