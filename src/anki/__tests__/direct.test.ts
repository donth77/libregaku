import { describe, expect, it, vi } from 'vitest';

/**
 * Four ways to fail, four different things to do about them. This is the
 * classification the settings panel reads, and the reason "open Anki" no
 * longer appears while Anki is open.
 */

vi.stubGlobal('chrome', { runtime: { getURL: () => 'chrome-extension://testid/' } });

import { ankiDirect } from '../direct';

/** A fresh fetch per case, holding only as much Response as the transport touches. */
function answers(status: number, body: string): void {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => JSON.parse(body) as unknown,
  })));
}

function refuses(): void {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new TypeError('Failed to fetch');
  }));
}

describe('ankiDirect', () => {
  it('returns the result when AnkiConnect answers', async () => {
    answers(200, '{"result":6,"error":null}');
    expect(await ankiDirect<number>('version')).toEqual({ ok: true, result: 6 });
  });

  it('calls nothing listening offline, not an error', async () => {
    refuses();
    const r = await ankiDirect('version');
    expect(r.kind).toBe('offline');
    expect(r.offline).toBe(true);
  });

  it('names the origin when AnkiConnect refuses one', async () => {
    answers(403, '"unauthorized"');
    const r = await ankiDirect('version');
    expect(r.kind).toBe('blocked');
    expect(r.error).toContain('chrome-extension://testid');
    expect(r.error).toContain('webCorsOriginList');
  });

  it('reports another program on the port, rather than a missing add-on', async () => {
    // A static file server answering POST, which is exactly what squats 8765.
    answers(501, 'Unsupported method');
    const r = await ankiDirect('version');
    expect(r.kind).toBe('occupied');
    expect(r.error).toContain('8765');
  });

  it('treats a non-AnkiConnect reply as the port being taken', async () => {
    answers(200, '{"hello":"not anki"}');
    expect((await ankiDirect('version')).kind).toBe('occupied');
  });

  it('passes AnkiConnect its own refusals', async () => {
    answers(200, '{"result":null,"error":"deck was not found"}');
    const r = await ankiDirect('addNote');
    expect(r.kind).toBe('refused');
    expect(r.error).toBe('deck was not found');
  });
});
