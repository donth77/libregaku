import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Entry } from '../jmdict';
import { jishoLookup } from '../jisho';
import { jotobaLookup } from '../jotoba';
import { remoteLookup } from '../remote';

const entry = (word: string): Entry => ({ id: word, word, common: true, senses: [{ pos: [], glosses: ['x'] }] });

function sources(jotoba: () => Promise<Entry[]>, jisho: () => Promise<Entry[]>) {
  const s = { jotoba: vi.fn(jotoba), jisho: vi.fn(jisho) };
  return { s, lookup: remoteLookup(s) };
}

describe('remoteLookup', () => {
  it('stops at Jotoba when it answers', async () => {
    const { s, lookup } = sources(async () => [entry('食べる')], async () => [entry('x')]);
    expect(await lookup('食べる', 'eng')).toMatchObject({ ok: true, entries: [{ word: '食べる' }] });
    expect(s.jisho).not.toHaveBeenCalled();
  });

  it('asks Jisho once when Jotoba has nothing', async () => {
    const { s, lookup } = sources(async () => [], async () => [entry('食べる')]);
    expect(await lookup('食べる', 'eng')).toMatchObject({ ok: true, entries: [{ word: '食べる' }] });
    expect(s.jisho).toHaveBeenCalledTimes(1);
  });

  it('asks Jisho exactly once even when both fail, and says why', async () => {
    const { s, lookup } = sources(
      async () => { throw new Error('HTTP 503'); },
      async () => { throw new Error('HTTP 429'); },
    );
    const r = await lookup('食べる', 'eng');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain('HTTP 503');
    expect(!r.ok && r.error).toContain('HTTP 429');
    expect(s.jisho).toHaveBeenCalledTimes(1);
  });

  it('keeps Jotoba’s empty answer when Jisho fails after it', async () => {
    const { lookup } = sources(async () => [], async () => { throw new Error('timeout'); });
    expect(await lookup('ｚｚｚ', 'eng')).toEqual({ ok: true, entries: [], source: 'remote' });
  });

  it('never asks Jisho for a non-English edition', async () => {
    const { s, lookup } = sources(async () => [], async () => [entry('x')]);
    expect(await lookup('食べる', 'ger')).toEqual({ ok: true, entries: [], source: 'remote' });
    expect(s.jisho).not.toHaveBeenCalled();
  });

  it('remembers answers for the session, per edition', async () => {
    const { s, lookup } = sources(async () => [entry('食べる')], async () => []);
    await lookup('食べる', 'eng');
    await lookup('食べる', 'eng');
    expect(s.jotoba).toHaveBeenCalledTimes(1);
    await lookup('食べる', 'ger');
    expect(s.jotoba).toHaveBeenCalledTimes(2);
  });

  it('does not remember failures', async () => {
    let fail = true;
    const { s, lookup } = sources(
      async () => { if (fail) throw new Error('offline'); return [entry('食べる')]; },
      async () => { throw new Error('offline'); },
    );
    expect((await lookup('食べる', 'eng')).ok).toBe(false);
    fail = false;
    expect((await lookup('食べる', 'eng')).ok).toBe(true);
    expect(s.jotoba).toHaveBeenCalledTimes(2);
  });
});

describe('remote requests', () => {
  afterEach(() => vi.unstubAllGlobals());

  const capture = (body: unknown) => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body)));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  };

  it('Jotoba: time-limited, and in the edition’s language', async () => {
    const fetch = capture({ words: [] });
    await jotobaLookup('食べる', { edition: 'ger', timeoutMs: 1234 });
    const init = fetch.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body))).toMatchObject({ query: '食べる', language: 'German' });
  });

  it('Jotoba: English by default', async () => {
    const fetch = capture({ words: [] });
    await jotobaLookup('食べる');
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)).language).toBe('English');
  });

  it('Jisho: time-limited', async () => {
    const fetch = capture({ data: [] });
    await jishoLookup('食べる');
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('a timeout surfaces as a failure, not a hang', async () => {
    vi.stubGlobal('fetch', (_url: string, init?: RequestInit) =>
      new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))));
    await expect(jishoLookup('食べる', { timeoutMs: 10 })).rejects.toBeTruthy();
  });
});
