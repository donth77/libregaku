/**
 * A small in-memory IndexedDB, for the store's tests.
 *
 * Only what store.ts uses: keyPath and numbered stores, one index, transactions
 * that complete when their requests have, and a way to make one fail part way.
 * One FakeIDB is one database; FakeIDBs is `indexedDB`, with a database for
 * each name it is asked for.
 */

export type Row = Record<string, unknown>;

export class FakeIDB {
  stores = new Map<string, { keyPath?: string | string[]; auto?: number; rows: Map<string, Row> }>();
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
      createObjectStore(name: string, opts?: { keyPath?: string | string[]; autoIncrement?: boolean }) {
        idb.stores.set(name, { keyPath: opts?.keyPath, auto: opts?.autoIncrement ? 0 : undefined, rows: new Map() });
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
        put: (v: Row, key?: unknown) => request(() => {
          // A numbered store gives each row the next number, as autoIncrement does.
          const k = s.auto !== undefined && key === undefined ? ++s.auto : key;
          return s.rows.set(keyOf(s.keyPath, v, k), clone(v));
        }, true),
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

/** `indexedDB` itself: a database for each name, made when first opened. */
export class FakeIDBs {
  readonly dbs = new Map<string, FakeIDB>();

  db(name: string): FakeIDB {
    let db = this.dbs.get(name);
    if (!db) this.dbs.set(name, (db = new FakeIDB()));
    return db;
  }

  open(name: string, version: number) {
    return this.db(name).open(name, version);
  }
}
