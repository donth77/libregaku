import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchJsonTgz } from '../archive';

/** A .json.tgz holding `json`, as jmdict-simplified publishes them. */
async function tgz(json: string): Promise<Uint8Array> {
  const payload = new TextEncoder().encode(json);
  const tar = new Uint8Array(512 + Math.ceil(payload.length / 512) * 512 + 1024);
  tar.set(new TextEncoder().encode('jmdict.json'), 0);
  tar.set(new TextEncoder().encode(payload.length.toString(8).padStart(11, '0')), 124);
  tar[156] = '0'.charCodeAt(0);
  tar.set(payload, 512);
  const gz = new Response(new Blob([tar]).stream().pipeThrough(new CompressionStream('gzip')));
  return new Uint8Array(await gz.arrayBuffer());
}

function serve(body: ReadableStream<Uint8Array>, length?: number) {
  vi.stubGlobal('fetch', async () =>
    new Response(body, { headers: length ? { 'content-length': String(length) } : {} }));
}

/** Chunks delivered one per read, then an error or the end. */
const streamOf = (chunks: Uint8Array[], fail?: Error) => {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(c) {
      const chunk = chunks[i++];
      if (chunk) c.enqueue(chunk);
      else if (fail) c.error(fail);
      else c.close();
    },
  });
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchJsonTgz', () => {
  it('unpacks the archive’s one file', async () => {
    const bytes = await tgz('{"words":[1,2,3]}');
    serve(streamOf([bytes]), bytes.length);
    expect(await fetchJsonTgz('https://example.org/x.json.tgz')).toEqual({ words: [1, 2, 3] });
  });

  it('names a download that broke off mid-stream, and how far it got', async () => {
    const bytes = await tgz('{"words":[1,2,3]}');
    serve(streamOf([bytes.subarray(0, 10)], new TypeError('network error')), bytes.length);
    await expect(fetchJsonTgz('https://example.org/x.json.tgz')).rejects.toThrow(/broke off after 10 of \d+ bytes/);
  });

  it('refuses a download shorter than the server said it would be', async () => {
    const bytes = await tgz('{"words":[1,2,3]}');
    serve(streamOf([bytes]), bytes.length + 100);
    await expect(fetchJsonTgz('https://example.org/x.json.tgz')).rejects.toThrow(/ended early|broke off/);
  });
});
