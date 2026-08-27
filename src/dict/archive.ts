/**
 * Unpack a `.json.tgz` in the browser, with no dependency.
 *
 * Gzip comes free via DecompressionStream. The tar around it holds a single
 * file, and tar is simple enough that a reader is cheaper than a library: a
 * 512-byte header carrying the size as octal, then the payload.
 */

/** Read a NUL-terminated field from a tar header. */
function field(bytes: Uint8Array, offset: number, length: number): string {
  const slice = bytes.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return new TextDecoder().decode(end === -1 ? slice : slice.subarray(0, end)).trim();
}

export function untarSingle(tar: Uint8Array): Uint8Array {
  let at = 0;
  while (at + 512 <= tar.length) {
    const header = tar.subarray(at, at + 512);
    const name = field(header, 0, 100);
    if (!name) {
      at += 512;   // padding block between entries
      continue;
    }
    const size = parseInt(field(header, 124, 12) || '0', 8);
    const type = String.fromCharCode(header[156] ?? 0);

    // '0' and NUL both mean "regular file"; anything else is metadata.
    if (type === '0' || type === '\0') return tar.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('libregaku: no file found in tar');
}

export async function fetchJsonTgz(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`libregaku: dictionary download failed (HTTP ${res.status})`);

  const total = Number(res.headers.get('content-length') ?? 0);
  let loaded = 0;

  const counted = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      loaded += chunk.byteLength;
      onProgress?.(loaded, total);
      controller.enqueue(chunk);
    },
  });

  if (!res.body) throw new Error('libregaku: no response body');

  // DecompressionStream's DOM types are narrower than its actual contract
  // (ArrayBuffer-backed vs ArrayBufferLike), so the pair is asserted here.
  const gunzip = new DecompressionStream('gzip') as unknown as ReadableWritablePair<
    Uint8Array,
    Uint8Array
  >;
  const stream = res.body.pipeThrough(counted).pipeThrough(gunzip);

  const tar = new Uint8Array(await new Response(stream).arrayBuffer());
  return JSON.parse(new TextDecoder().decode(untarSingle(tar)));
}
