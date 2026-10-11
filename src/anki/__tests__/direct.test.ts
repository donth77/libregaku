import { describe, expect, it, vi } from 'vitest';

/**
 * Five ways to fail, five different things to do about them. This is the
 * classification the settings panel reads, and the reason "open Anki" no
 * longer appears while Anki is open.
 */

vi.stubGlobal('chrome', { runtime: { getURL: () => 'chrome-extension://testid/' } });

import { ankiDirect, isRelayed, notRelayed, relay } from '../direct';
import { ankiReason, ankiTry } from '../rpc';

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
    expect(r.reason).toEqual({ code: 'blocked', origin: 'chrome-extension://testid' });
    // The page's words for it, which the settings panel shows.
    const said = ankiReason(r.reason!);
    expect(said).toContain('chrome-extension://testid');
    expect(said).toContain('webCorsOriginList');
  });

  it('reports another program on the port, rather than a missing add-on', async () => {
    // A static file server answering POST, which is exactly what squats 8765.
    answers(501, 'Unsupported method');
    const r = await ankiDirect('version');
    expect(r.kind).toBe('occupied');
    expect(r.reason).toEqual({ code: 'http', port: 8765, status: 501 });
    expect(ankiReason(r.reason!)).toContain('8765');
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
    expect(r.reason).toMatchObject({ code: 'timeout', port: 8765 });
    expect(ankiReason(r.reason!)).toContain('8765');
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

  it('refuses anything else that could change or delete what is already in Anki', () => {
    for (const a of ['deleteDecks', 'updateNoteFields', 'changeDeck', 'forgetCards', 'storeMediaFile', 'multi', 'sync', undefined, 42]) {
      expect(isRelayed(a)).toBe(false);
    }
    expect(notRelayed('deleteDecks')).toMatchObject({ ok: false, kind: 'refused' });
  });
});

describe('relay', () => {
  /** An AnkiConnect whose only mark notes are 1 and 2, answering one call per request. */
  function marksAre(...ids: number[]): ReturnType<typeof vi.fn> {
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const { action } = JSON.parse(String(init.body)) as { action: string };
      return { ok: true, status: 200, json: async () => ({ result: action === 'findNotes' ? ids : null, error: null }) };
    });
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('deletes only notes that are marks', async () => {
    marksAre(1, 2);
    expect(await relay('deleteNotes', { notes: [1, 3] })).toMatchObject({ ok: false, kind: 'refused' });
    expect(await relay('deleteNotes', { notes: [2] })).toMatchObject({ ok: true });
  });

  it('deletes a Libregaku card made minutes ago and never studied — Undo — and no other', async () => {
    const now = Date.now();
    const fresh = now - 60_000;            // a minute old
    const studied = now - 120_000;         // as old, but reviewed since
    const stale = now - 60 * 60_000;       // an hour old
    const foreign = now - 30_000;          // minutes old, but another note type
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const { action, params } = JSON.parse(String(init.body)) as { action: string; params: { query?: string } };
      const q = params?.query ?? '';
      let result: unknown = null;
      if (action === 'findNotes') {
        if (q.startsWith('note:"Libregaku Mark"')) result = [];                       // no marks
        else if (q.includes('note:"Libregaku"')) result = [fresh, studied].filter((id) => q.includes(String(id)));
        else if (q.includes('-is:new')) result = [studied].filter((id) => q.includes(String(id)));
        else result = [];
      }
      return { ok: true, status: 200, json: async () => ({ result, error: null }) };
    });
    vi.stubGlobal('fetch', fetch);

    expect(await relay('deleteNotes', { notes: [fresh] })).toMatchObject({ ok: true });
    for (const id of [studied, stale, foreign]) {
      const r = await relay('deleteNotes', { notes: [id] });
      expect(r, String(id)).toMatchObject({ ok: false, kind: 'refused' });
      expect(r.reason).toEqual({ code: 'notMarks', count: 1, ids: 'notes', change: 'delete' });
      expect(ankiReason(r.reason!)).toContain('a card it made in the last few minutes that has not been studied');
    }
    // Retagging and suspending stay marks-only, however new the card.
    expect(await relay('addTags', { notes: [fresh], tags: 'x' })).toMatchObject({ ok: false, kind: 'refused' });
  });

  it('refuses what it could not check, when the marks cannot be looked up', async () => {
    refuses();
    expect(await relay('deleteNotes', { notes: [1] })).toMatchObject({ ok: false, kind: 'offline' });
  });

  it('passes the other actions straight through', async () => {
    const fetch = marksAre();
    await relay('findNotes', { query: 'deck:*' });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('carries a new note with a recording the extension fetched, under its own name', async () => {
    const fetch = marksAre();
    const note = { deckName: 'Vocabulary', audio: [{ data: 'SUQz', filename: 'libregaku_猫_ねこ.mp3', fields: ['Audio'] }] };
    expect(await relay('addNote', { note })).toMatchObject({ ok: true });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('refuses media AnkiConnect would fetch or read itself, or file under someone else\'s name', async () => {
    const fetch = marksAre();
    const audio = (m: Record<string, unknown>) => ({ note: { deckName: 'Vocabulary', audio: [{ fields: ['Audio'], ...m }] } });
    for (const params of [
      audio({ url: 'https://example.org/a.mp3', filename: 'libregaku_a.mp3' }),
      audio({ path: '/Users/someone/.ssh/id_ed25519', filename: 'libregaku_a.mp3' }),
      audio({ data: 'SUQz', filename: 'their-image.jpg' }),
      audio({ data: 'SUQz', filename: 'libregaku_../../escape.mp3' }),
      audio({ filename: 'libregaku_a.mp3' }),
      { note: { deckName: 'Vocabulary', picture: { data: 'iVBO', filename: 'shared.png', fields: ['Image'] } } },
    ]) {
      expect(await relay('addNote', params)).toMatchObject({ ok: false, kind: 'refused' });
    }
    expect(await relay('addNotes', { notes: [{}, audio({ url: 'https://example.org/a.mp3', filename: 'libregaku_a.mp3' }).note] }))
      .toMatchObject({ ok: false, kind: 'refused' });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('what the page says', () => {
  /** The service worker, answering every call with `answer`. */
  function worker(answer: unknown): void {
    vi.stubGlobal('chrome', { runtime: { getURL: () => 'chrome-extension://testid/', sendMessage: async () => answer } });
  }

  it('puts the reason the service worker gives into words', async () => {
    refuses();
    const offline = await ankiDirect('version');
    worker(offline);
    expect(await ankiTry('version')).toMatchObject({ ok: false, kind: 'offline', error: 'Nothing is listening on port 8765.' });
  });

  it("passes AnkiConnect's own words on as they are", async () => {
    worker({ ok: false, kind: 'refused', error: 'deck was not found' });
    expect((await ankiTry('addNote')).error).toBe('deck was not found');
  });
});

