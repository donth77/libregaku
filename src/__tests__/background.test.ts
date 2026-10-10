import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The service worker relays three things a content script cannot do itself.
 * Each relay is an exemption — from CORS, from the page's CSP, from
 * AnkiConnect's origin check — so each carries only what the extension uses.
 */

type Listener = (msg: unknown, sender: chrome.runtime.MessageSender, respond: (r: unknown) => void) => boolean;
let listener: Listener;
let template: unknown;
const executeScript = vi.fn(async () => []);
const fetchMock = vi.fn();

vi.stubGlobal('chrome', {
  runtime: {
    id: 'self',
    getURL: (p: string) => `chrome-extension://self/${p}`,
    onInstalled: { addListener: () => {} },
    onMessage: { addListener: (fn: Listener) => { listener = fn; } },
  },
  storage: { sync: { get: async (k: string) => ({ [k]: template }) } },
  scripting: { executeScript },
});
vi.stubGlobal('fetch', fetchMock);

beforeAll(async () => {
  await import('../background');
});

beforeEach(() => {
  template = undefined;
  fetchMock.mockReset();
  executeScript.mockClear();
});

const OURS = { id: 'self', tab: { id: 7 } } as chrome.runtime.MessageSender;

/** Send a message; resolves with the reply, or 'no reply' when the worker declined. */
function send(msg: unknown, sender = OURS): Promise<unknown> {
  return new Promise((resolve) => {
    let replied = false;
    const kept = listener(msg, sender, (r) => { replied = true; resolve(r); });
    if (!kept && !replied) resolve('no reply');
  });
}

/** As much of a Response as the audio relay reads. */
function audio(bytes: number, init: { url?: string; status?: number; length?: boolean } = {}): Response {
  const body = new Uint8Array(bytes).fill(1);
  const headers = new Headers({ 'content-type': 'audio/mpeg' });
  if (init.length !== false) headers.set('content-length', String(bytes));
  return {
    ok: (init.status ?? 200) < 300,
    status: init.status ?? 200,
    url: init.url ?? '',
    headers,
    body: null,
    arrayBuffer: async () => body.buffer,
  } as unknown as Response;
}

const JPOD = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji=x&kana=x';

describe('the AnkiConnect relay', () => {
  it('carries an action the extension uses', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ result: 6, error: null }) });
    expect(await send({ type: 'anki', action: 'version' })).toEqual({ ok: true, result: 6 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:8765');
    expect(JSON.parse(String(init.body))).toMatchObject({ action: 'version', version: 6 });
  });

  it('refuses an action the extension never uses, without calling Anki', async () => {
    expect(await send({ type: 'anki', action: 'deleteDecks', params: { decks: ['Japanese'] } }))
      .toMatchObject({ ok: false, kind: 'refused' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers nothing that did not come from this extension', async () => {
    expect(await send({ type: 'anki', action: 'version' }, { id: 'someone-else' })).toBe('no reply');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('changing notes already in Anki', () => {
  /*
   * The relay deletes, suspends and retags only Libregaku's own mark notes.
   * Here Anki holds two marks — notes 1 and 2, cards 11 and 12 — and one of
   * the learner's own notes, 99, with card 199.
   */
  function collection(): void {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const { action, params } = JSON.parse(String(init.body)) as { action: string; params: { query?: string } };
      const marks = params.query === 'note:"Libregaku Mark"';
      const result = action === 'findNotes' && marks ? [1, 2] : action === 'findCards' && marks ? [11, 12] : null;
      return { ok: true, status: 200, json: async () => ({ result, error: null }) };
    });
  }
  const sentActions = (): string[] =>
    fetchMock.mock.calls.map(([, init]) => (JSON.parse(String((init as RequestInit).body)) as { action: string }).action);

  it('refuses to delete a note that is not a mark, and deletes nothing', async () => {
    collection();
    expect(await send({ type: 'anki', action: 'deleteNotes', params: { notes: [1, 99] } }))
      .toMatchObject({ ok: false, kind: 'refused' });
    expect(sentActions()).toEqual(['findNotes']);
  });

  it('refuses to suspend a card that is not a mark', async () => {
    collection();
    expect(await send({ type: 'anki', action: 'suspend', params: { cards: [199] } }))
      .toMatchObject({ ok: false, kind: 'refused' });
    expect(sentActions()).toEqual(['findCards']);
  });

  it("refuses to retag the learner's own notes", async () => {
    collection();
    for (const action of ['addTags', 'removeTags']) {
      expect(await send({ type: 'anki', action, params: { notes: [99], tags: 'libregaku::mark::known' } }))
        .toMatchObject({ ok: false, kind: 'refused' });
    }
    expect(sentActions()).toEqual(['findNotes', 'findNotes']);
  });

  it('deletes and suspends mark notes', async () => {
    collection();
    expect(await send({ type: 'anki', action: 'deleteNotes', params: { notes: [1, 2] } })).toMatchObject({ ok: true });
    expect(await send({ type: 'anki', action: 'suspend', params: { cards: [11] } })).toMatchObject({ ok: true });
    expect(sentActions()).toEqual(['findNotes', 'deleteNotes', 'findCards', 'suspend']);
  });

  it('refuses a request that does not name its notes, without asking Anki anything', async () => {
    collection();
    for (const notes of ['all', undefined, [1, 'x']]) {
      expect(await send({ type: 'anki', action: 'deleteNotes', params: { notes } })).toMatchObject({ ok: false });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('the audio relay', () => {
  it('fetches jpod101 without cookies', async () => {
    fetchMock.mockResolvedValueOnce(audio(2048, { url: 'https://cdn.innovativelanguage.com/a.mp3' }));
    const r = await send({ type: 'fetch-audio', url: JPOD }) as { ok: boolean; bytes?: string };
    expect(r.ok).toBe(true);
    expect(atob(r.bytes ?? '')).toHaveLength(2048);
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].credentials).toBe('omit');
  });

  it('refuses any other host, and plain http, without fetching', async () => {
    for (const url of ['https://mail.google.com/mail/u/0/', JPOD.replace('https:', 'http:')]) {
      expect(await send({ type: 'fetch-audio', url })).toMatchObject({ ok: false });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('checks where a redirect landed, not only where it started', async () => {
    fetchMock.mockResolvedValueOnce(audio(2048, { url: 'https://evil.example/steal' }));
    expect(await send({ type: 'fetch-audio', url: JPOD })).toMatchObject({ ok: false });
  });

  it("allows the host of the user's own template, and no other", async () => {
    template = 'https://audio.example.org/{word}.mp3';
    fetchMock.mockResolvedValueOnce(audio(2048, { url: 'https://audio.example.org/x.mp3' }));
    expect(await send({ type: 'fetch-audio', url: 'https://audio.example.org/x.mp3' })).toMatchObject({ ok: true });
    expect(await send({ type: 'fetch-audio', url: 'https://other.example.org/x.mp3' })).toMatchObject({ ok: false });
  });

  it('refuses a body too large to be a recording, declared or not', async () => {
    fetchMock.mockResolvedValueOnce(audio(5 * 1024 * 1024, { url: JPOD }));
    expect(await send({ type: 'fetch-audio', url: JPOD })).toMatchObject({ ok: false });
    fetchMock.mockResolvedValueOnce(audio(5 * 1024 * 1024, { url: JPOD, length: false }));
    expect(await send({ type: 'fetch-audio', url: JPOD })).toMatchObject({ ok: false });
  });
});

describe('page-world injection', () => {
  it('injects the Netflix hook', async () => {
    expect(await send({ type: 'inject-main-world', file: 'inject-netflix.js' })).toEqual({ ok: true });
    expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ files: ['inject-netflix.js'], world: 'MAIN' }));
  });

  it('injects nothing else', async () => {
    expect(await send({ type: 'inject-main-world', file: 'content.js' })).toMatchObject({ ok: false });
    expect(executeScript).not.toHaveBeenCalled();
  });
});

describe('sentence audio from a tab', () => {
  it('asks for the permission before anything else', async () => {
    const r = await send({ type: 'tab-capture-start', tabId: 7 }) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/settings/);
  });

  it("reports a content script's own tab as not captured when nothing can be asked", async () => {
    expect(await send({ type: 'capture-status' })).toEqual({ ok: false, capturing: false });
  });
});
