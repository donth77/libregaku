/**
 * A dictionary file, fetched whole, with its progress reported.
 *
 * For the files that are not a .json.tgz (archive.ts reads those): a zip to
 * be opened a file at a time, a gzipped text.
 */

export async function fetchBytes(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    // As in archive.ts: "Failed to fetch" from an extension page is nearly
    // always a host the manifest does not cover — often the last hop of a
    // redirect, which the error does not name.
    throw new Error(
      `libregaku: could not fetch ${new URL(url).host} — ${String(e)}. ` +
        `If this is "Failed to fetch", check host_permissions covers every ` +
        `redirect hop, not just the URL requested.`,
    );
  }
  if (!res.ok) throw new Error(`libregaku: dictionary download failed (HTTP ${res.status})`);
  if (!res.body) throw new Error('libregaku: no response body');

  const total = Number(res.headers.get('content-length') ?? 0);
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  const reader = res.body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      onProgress?.(loaded, total);
    }
  } catch (e) {
    throw new Error(
      `libregaku: dictionary download broke off after ${loaded} of ${total || '?'} bytes — ${String(e)}`,
    );
  }
  if (total && loaded < total) {
    throw new Error(`libregaku: dictionary download ended early (${loaded} of ${total} bytes)`);
  }

  const out = new Uint8Array(loaded);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

/** A gzipped text file, as text. */
export async function gunzipText(gz: Uint8Array): Promise<string> {
  // DecompressionStream's DOM types are narrower than its actual contract
  // (ArrayBuffer-backed vs ArrayBufferLike), so the pair is asserted here.
  const gunzip = new DecompressionStream('gzip') as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  const stream = new Blob([gz as BlobPart]).stream().pipeThrough(gunzip);
  return new Response(stream).text();
}
