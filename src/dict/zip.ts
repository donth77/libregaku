/**
 * Read a zip in the browser, with no dependency.
 *
 * A zip's directory is at its end: a short record that says where the list
 * of files is, then the list. Each listing says where that file's own header
 * is, and the data follows the header. Deflate comes free through
 * DecompressionStream, so a reader is cheaper than a library — as with the
 * tar in archive.ts.
 *
 * Files are unpacked one at a time, when asked for: a dictionary is tens of
 * megabytes packed and hundreds unpacked.
 */

/** One file inside a zip archive. */
export interface ZipFile {
  name: string;
  /** Uncompressed size, in bytes. */
  size: number;
  /** Its bytes, unpacked when asked for — one at a time, so a 346 MB archive is never held unpacked at once. */
  bytes(): Promise<Uint8Array>;
}

/** What the directory says of one file. */
interface Listing {
  name: string;
  flags: number;
  method: number;
  packed: number;
  size: number;
  /** Where the file's own header starts. */
  header: number;
}

const END = 0x06054b50;
const LISTING = 0x02014b50;
const HEADER = 0x04034b50;
/** Sits just before the end record of an archive too big for its 32-bit fields. */
const ZIP64 = 0x07064b50;

const END_SIZE = 22;
const LISTING_SIZE = 46;
const HEADER_SIZE = 30;

const STORED = 0;
const DEFLATED = 8;

const cutShort = (what: string): Error =>
  new Error(`libregaku: the zip is cut short or damaged — ${what}. The download may not have finished.`);

/**
 * Where the end record is. It is the last thing in the file but for a comment
 * of up to 65,535 bytes, so it is looked for backwards from the end.
 */
function findEnd(view: DataView): number {
  const lowest = Math.max(0, view.byteLength - END_SIZE - 0xffff);
  for (let at = view.byteLength - END_SIZE; at >= lowest; at--) {
    if (view.getUint32(at, true) !== END) continue;
    // The comment has to fit, or these four bytes are part of something else.
    if (at + END_SIZE + view.getUint16(at + 20, true) <= view.byteLength) return at;
  }
  // A zip opens with a file's header. One that does and has no end record lost its end.
  const opensAsZip = view.byteLength >= 4 && view.getUint32(0, true) === HEADER;
  if (opensAsZip) throw cutShort('its directory, which comes last, is missing');
  throw new Error('libregaku: not a zip archive');
}

/** The files in an archive, in directory order. */
export function zipFiles(archive: Uint8Array): ZipFile[] {
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  const end = findEnd(view);
  const count = view.getUint16(end + 10, true);
  const length = view.getUint32(end + 12, true);
  const start = view.getUint32(end + 16, true);
  const locator = end >= 20 && view.getUint32(end - 20, true) === ZIP64;
  if (locator || count === 0xffff || length === 0xffffffff || start === 0xffffffff) {
    throw new Error('libregaku: zip64 archives are not supported');
  }
  if (start + length > end) throw cutShort('its directory runs past where it ends');

  const names = new TextDecoder();
  const files: ZipFile[] = [];
  let at = start;
  for (let i = 0; i < count; i++) {
    if (at + LISTING_SIZE > end || view.getUint32(at, true) !== LISTING) {
      throw cutShort(`its directory lists ${count} files and stops after ${i}`);
    }
    const nameLength = view.getUint16(at + 28, true);
    const next = at + LISTING_SIZE + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
    if (next > end) throw cutShort(`its directory lists ${count} files and stops after ${i}`);
    const listing: Listing = {
      name: names.decode(archive.subarray(at + LISTING_SIZE, at + LISTING_SIZE + nameLength)),
      flags: view.getUint16(at + 8, true),
      method: view.getUint16(at + 10, true),
      packed: view.getUint32(at + 20, true),
      size: view.getUint32(at + 24, true),
      header: view.getUint32(at + 42, true),
    };
    at = next;
    if (listing.packed === 0xffffffff || listing.size === 0xffffffff || listing.header === 0xffffffff) {
      throw new Error(`libregaku: zip64 archives are not supported (${listing.name})`);
    }
    // A folder is listed as a file of no bytes whose name ends in a slash.
    if (listing.name.endsWith('/')) continue;
    files.push({ name: listing.name, size: listing.size, bytes: () => unpack(archive, view, listing) });
  }
  return files;
}

/**
 * One file's bytes. A stored file's are a view of the archive, not a copy.
 *
 * What is wrong with a single file is found here, not while listing: an
 * archive with one file this cannot read is still good for the others.
 */
async function unpack(archive: Uint8Array, view: DataView, file: Listing): Promise<Uint8Array> {
  if (file.flags & 1) throw new Error(`libregaku: ${file.name} in the zip is encrypted`);
  if (file.method !== STORED && file.method !== DEFLATED) {
    throw new Error(`libregaku: ${file.name} in the zip is packed by a method this cannot read (${file.method})`);
  }
  if (file.header + HEADER_SIZE > archive.length || view.getUint32(file.header, true) !== HEADER) {
    throw cutShort(`${file.name} is not where the directory says`);
  }
  // The header repeats the name and has extra fields of its own, not always as long as the directory's.
  const data =
    file.header + HEADER_SIZE + view.getUint16(file.header + 26, true) + view.getUint16(file.header + 28, true);
  if (data + file.packed > archive.length) throw cutShort(`${file.name} runs past the end`);
  const packed = archive.subarray(data, data + file.packed);

  let bytes = packed;
  if (file.method === DEFLATED) {
    try {
      bytes = await inflate(packed);
    } catch (e) {
      throw cutShort(`${file.name} would not unpack (${String(e)})`);
    }
  }
  if (bytes.length !== file.size) {
    throw cutShort(`${file.name} is ${bytes.length} bytes unpacked, and the directory says ${file.size}`);
  }
  return bytes;
}

async function inflate(packed: Uint8Array): Promise<Uint8Array> {
  // DecompressionStream's DOM types are narrower than its actual contract
  // (ArrayBuffer-backed vs ArrayBufferLike), so the pair is asserted here.
  const raw = new DecompressionStream('deflate-raw') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  const stream = new Blob([packed as BlobPart]).stream().pipeThrough(raw);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
