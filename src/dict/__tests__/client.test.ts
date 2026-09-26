import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLookupCache, lookupToken, lookupWord } from '../client';
import type { Entry } from '../jmdict';

/**
 * The content-script side of lookups: which keys it asks for, in what order,
 * with which hints — and what it says when nothing answers.
 */

type Reply = { ok?: boolean; entries?: Entry[]; error?: string; source?: string } | undefined;

const entry = (word: string): Entry => ({ id: word, word, common: true, senses: [{ pos: [], glosses: ['x'] }] });

let sent: Array<Record<string, unknown>> = [];

function offscreen(answer: (msg: Record<string, unknown>) => Reply) {
  sent = [];
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: vi.fn(async (msg: Record<string, unknown>) => {
        sent.push(msg);
        return answer(msg);
      }),
    },
  });
}

beforeEach(() => clearLookupCache());
afterEach(() => vi.unstubAllGlobals());

describe('lookupToken', () => {
  it('follows the token’s plan, passing each key’s hints', async () => {
    offscreen((m) =>
      m.type === 'dict-lookup'
        ? { ok: true, source: 'local', entries: m.key === '勉強' ? [entry('勉強')] : [] }
        : undefined,
    );
    const r = await lookupToken({
      surface: '勉強している',
      lemma: '勉強する',
      lookup: [
        { key: '勉強する', reading: 'ベンキョウスル', pos: '動詞' },
        { key: '勉強', reading: 'ベンキョウ', pos: '名詞,サ変接続' },
      ],
    });
    expect(r).toEqual({ state: 'ok', entries: [entry('勉強')] });
    expect(sent.map((m) => [m.key, m.reading, m.pos])).toEqual([
      ['勉強する', 'ベンキョウスル', '動詞'],
      ['勉強', 'ベンキョウ', '名詞,サ変接続'],
    ]);
  });

  it('falls back to lemma then surface for a token with no plan', async () => {
    offscreen(() => ({ ok: true, source: 'local', entries: [] }));
    expect(await lookupToken({ surface: 'たべた', lemma: 'たべる' })).toEqual({ state: 'empty' });
    expect(sent.map((m) => m.key)).toEqual(['たべる', 'たべた']);
  });

  it('remembers a local miss, so the next hover does not ask again', async () => {
    offscreen(() => ({ ok: true, source: 'local', entries: [] }));
    await lookupWord('ｚｚｚ', 'ｚｚｚ');
    await lookupWord('ｚｚｚ', 'ｚｚｚ');
    expect(sent).toHaveLength(1);
  });

  it('does not remember a remote answer: the local one should replace it', async () => {
    offscreen(() => ({ ok: true, source: 'remote', entries: [entry('食べる')] }));
    await lookupWord('食べる', '食べる');
    await lookupWord('食べる', '食べる');
    expect(sent).toHaveLength(2);
  });
});

describe('when nothing answers', () => {
  it('says so, rather than reporting a download stuck at 0%', async () => {
    offscreen(() => undefined);
    const r = await lookupWord('食べる', '食べる');
    expect(r.state).toBe('error');
  });

  it('still reports a genuine download in progress as loading', async () => {
    offscreen((m) =>
      m.type === 'dict-lookup'
        ? { ok: false, error: 'Jotoba: offline' }
        : { ready: false, phase: 'downloading', percent: 40, error: null } as unknown as Reply,
    );
    expect(await lookupWord('食べる', '食べる')).toEqual({ state: 'loading', percent: 40 });
  });
});
