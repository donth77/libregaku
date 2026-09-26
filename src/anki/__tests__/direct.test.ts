import { describe, expect, it, vi } from 'vitest';

/**
 * Five ways to fail, five different things to do about them. This is the
 * classification the settings panel reads, and the reason "open Anki" no
 * longer appears while Anki is open.
 */

vi.stubGlobal('chrome', { runtime: { getURL: () => 'chrome-extension://testid/' } });

import { ankiDirect, isRelayed, notRelayed } from '../direct';

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

/** A listener that takes the connection and never answers, until the caller gives up. */
function hangs(): void {
  vi.stubGlobal('fetch', vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  })));
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

  it('gives up on a listener that never answers, and says so', async () => {
    hangs();
    const r = await ankiDirect('version', {}, 20);
    expect(r.kind).toBe('timeout');
    expect(r.offline).toBeUndefined();
    expect(r.error).toContain('8765');
  });

  it('does not take another JSON service for AnkiConnect refusing', async () => {
    // A JSON-RPC server answers 200 with an error object, not a string.
    answers(200, '{"jsonrpc":"2.0","error":{"code":-32600},"result":null}');
    expect((await ankiDirect('version')).kind).toBe('occupied');
  });
});

describe('the relay allowlist', () => {
  it('carries the actions the extension uses', () => {
    for (const a of ['version', 'addNote', 'findNotes', 'notesInfo', 'modelFieldNames']) {
      expect(isRelayed(a)).toBe(true);
    }
  });

  it('refuses anything that could change or delete what is already in Anki', () => {
    for (const a of ['deleteDecks', 'deleteNotes', 'updateNoteFields', 'storeMediaFile', 'multi', 'sync', undefined, 42]) {
      expect(isRelayed(a)).toBe(false);
    }
    expect(notRelayed('deleteDecks')).toMatchObject({ ok: false, kind: 'refused' });
  });
});

