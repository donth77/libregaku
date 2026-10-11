/**
 * Rows out of a SQLite file, and nothing else.
 *
 * WikDict publishes its dictionaries as SQLite files, and all that is wanted
 * of one is every row of a table, once, to put into the dictionary store. That
 * is a walk down a b-tree and a decode of each record, a hundred lines, where
 * a SQL engine would be a megabyte of WebAssembly to ship and to compile. So
 * this reads the format (sqlite.org/fileformat2.html) for tables stored by
 * rowid, as every ordinary table is, and for UTF-8 text.
 */

const be16 = (b: Uint8Array, at: number): number => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);
const be32 = (b: Uint8Array, at: number): number => (be16(b, at) * 65536) + be16(b, at + 2);

/** A variable-length integer, and where it ends. */
function varint(b: Uint8Array, at: number): [value: number, next: number] {
  let value = 0;
  for (let i = 0; i < 8; i++) {
    const byte = b[at + i] ?? 0;
    value = value * 128 + (byte & 0x7f);
    if (!(byte & 0x80)) return [value, at + i + 1];
  }
  // Nine bytes: the last one holds all eight of its bits.
  return [value * 256 + (b[at + 8] ?? 0), at + 9];
}

/** One value of a record, by its serial type. */
function value(b: Uint8Array, at: number, type: number): unknown {
  const view = new DataView(b.buffer, b.byteOffset + at);
  switch (type) {
    case 0: return null;
    case 1: return view.getInt8(0);
    case 2: return view.getInt16(0);
    case 3: return (view.getInt8(0) * 65536) + view.getUint16(1);
    case 4: return view.getInt32(0);
    case 5: return (view.getInt16(0) * 4294967296) + view.getUint32(2);
    case 6: return Number(view.getBigInt64(0));
    case 7: return view.getFloat64(0);
    case 8: return 0;
    case 9: return 1;
    default:
      if (type < 12) return null;
      return type % 2 === 0 ? b.slice(at, at + (type - 12) / 2) : new TextDecoder().decode(b.subarray(at, at + (type - 13) / 2));
  }
}

/** The bytes of a record, however many pages it spills onto. */
function payload(file: Uint8Array, pageSize: number, usable: number, page: number, at: number, size: number): Uint8Array {
  const maxLocal = usable - 35;
  if (size <= maxLocal) return file.subarray(at, at + size);
  const minLocal = Math.floor(((usable - 12) * 32) / 255) - 23;
  const k = minLocal + ((size - minLocal) % (usable - 4));
  const local = k <= maxLocal ? k : minLocal;
  const out = new Uint8Array(size);
  out.set(file.subarray(at, at + local));
  let filled = local;
  let next = be32(file, at + local);
  while (next && filled < size) {
    const start = (next - 1) * pageSize;
    const take = Math.min(usable - 4, size - filled);
    out.set(file.subarray(start + 4, start + 4 + take), filled);
    filled += take;
    next = be32(file, start);
  }
  if (filled < size) throw new Error(`libregaku: sqlite row on page ${page} is cut short`);
  return out;
}

function record(bytes: Uint8Array): unknown[] {
  const [headerSize, first] = varint(bytes, 0);
  const types: number[] = [];
  for (let at = first; at < headerSize; ) {
    const [type, next] = varint(bytes, at);
    types.push(type);
    at = next;
  }
  const row: unknown[] = [];
  let at = headerSize;
  for (const type of types) {
    row.push(value(bytes, at, type));
    at += type >= 12 ? Math.floor((type - 12) / 2) : [0, 1, 2, 3, 4, 6, 8, 8, 0, 0][type] ?? 0;
  }
  return row;
}

/** Every row of the table whose root is `root`, in rowid order. */
function* walk(file: Uint8Array, pageSize: number, usable: number, root: number): Generator<unknown[]> {
  const start = (root - 1) * pageSize;
  // Page 1 has the file's header ahead of its own.
  const head = start + (root === 1 ? 100 : 0);
  const kind = file[head];
  const cells = be16(file, head + 3);
  if (kind === 0x0d) {
    for (let i = 0; i < cells; i++) {
      const cell = start + be16(file, head + 8 + i * 2);
      const [size, afterSize] = varint(file, cell);
      const [, afterRowid] = varint(file, afterSize);
      yield record(payload(file, pageSize, usable, root, afterRowid, size));
    }
  } else if (kind === 0x05) {
    for (let i = 0; i < cells; i++) {
      yield* walk(file, pageSize, usable, be32(file, start + be16(file, head + 12 + i * 2)));
    }
    yield* walk(file, pageSize, usable, be32(file, head + 8));
  } else {
    throw new Error(`libregaku: sqlite page ${root} is not a table page`);
  }
}

/**
 * Every row of a table, each as its values in column order, with the column
 * names alongside, read from the table's own definition.
 */
export function readTable(file: Uint8Array, table: string): { columns: string[]; rows: Generator<unknown[]> } {
  if (new TextDecoder().decode(file.subarray(0, 15)) !== 'SQLite format 3') throw new Error('libregaku: not a sqlite file');
  const size = be16(file, 16);
  const pageSize = size === 1 ? 65536 : size;
  const usable = pageSize - (file[20] ?? 0);
  if (be32(file, 56) !== 1) throw new Error('libregaku: sqlite file is not UTF-8');
  for (const row of walk(file, pageSize, usable, 1)) {
    // sqlite_master: type, name, tbl_name, rootpage, sql
    if (row[0] !== 'table' || row[1] !== table) continue;
    const sql = String(row[4] ?? '');
    const defined = /\(([\s\S]*)\)/.exec(sql)?.[1] ?? '';
    const columns = defined.split(',').map((c) => c.trim().split(/\s+/)[0] ?? '').filter(Boolean);
    return { columns, rows: walk(file, pageSize, usable, Number(row[3])) };
  }
  throw new Error(`libregaku: no table ${table} in the sqlite file`);
}
