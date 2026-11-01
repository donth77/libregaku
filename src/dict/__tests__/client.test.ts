import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { charactersOf, clearLookupCache, lookupToken, lookupWord } from '../client';
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

describe('a word made with a suffix', () => {
  const part = (word: string, gloss: string): Entry => ({ id: word, word, common: false, senses: [{ pos: [], glosses: [gloss] }] });
  const known: Record<string, Entry> = { 한국: part('한국', 'Korea'), '-식': part('-식', 'style'), '-적': part('-적', '-ic') };
  const answer = (msg: Record<string, unknown>): Reply =>
    ({ ok: true, entries: known[String(msg.key)] ? [known[String(msg.key)]!] : [], source: 'local' });

  it('is the word and the suffix where the word itself has no entry: 한국식', async () => {
    offscreen(answer);
    const r = await lookupToken({ surface: '한국식', lemma: '한국식', derived: ['한국', '-식'] });
    expect(r).toMatchObject({ state: 'ok', entries: [{ word: '한국식', senses: [{ glosses: ['한국: Korea'] }, { glosses: ['-식: style'] }] }] });
  });

  it('is empty where the stem is not a word, however well the suffix is known', async () => {
    offscreen(answer);
    expect(await lookupToken({ surface: '쿨적', lemma: '쿨적', derived: ['쿨', '-적'] })).toEqual({ state: 'empty' });
  });

  it('is left alone where the word has an entry of its own', async () => {
    offscreen((msg) => ({ ok: true, entries: msg.key === '한국식' ? [part('한국식', 'Korean style')] : [], source: 'local' }));
    const r = await lookupToken({ surface: '한국식', lemma: '한국식', derived: ['한국', '-식'] });
    expect(r).toMatchObject({ state: 'ok', entries: [{ word: '한국식', senses: [{ glosses: ['Korean style'] }] }] });
  });
});

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

  it('passes what a verb in kana follows, and asks again where that is another thing', async () => {
    offscreen((m) => (m.type === 'dict-lookup' ? { ok: true, source: 'local', entries: [entry(`つく after ${String(m.follows)}`)] } : undefined));
    const tsuku = (follows: string) => lookupToken({ surface: 'つく', lemma: 'つく', lookup: [{ key: 'つく', pos: '動詞,自立', follows }] });
    expect(await tsuku('駅|に')).toEqual({ state: 'ok', entries: [entry('つく after 駅|に')] });
    expect(await tsuku('')).toEqual({ state: 'ok', entries: [entry('つく after ')] });
    await tsuku('駅|に');
    expect(sent.map((m) => m.follows)).toEqual(['駅|に', '']);
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

describe('charactersOf', () => {
  it("asks for the word's kanji in the learner's language", async () => {
    offscreen(() => ({ ok: true, characters: [{ char: '勉', meanings: ['exertion'], on: ['ベン'], kun: [] }] } as unknown as Reply));
    const c = await charactersOf('勉強する', 'fr');
    expect(sent).toEqual([{ target: 'offscreen', type: 'dict-kanji', chars: ['勉', '強'], native: 'fr' }]);
    // An id for what the language calls its characters; the card puts the name to it.
    expect(c.label).toBe('kanji');
    expect(c.items.map((k) => k.char)).toEqual(['勉']);
  });

  it('asks nothing for a word with no kanji, and has nothing while the data loads', async () => {
    offscreen(() => ({ ok: false, error: 'the kanji data is still loading' }));
    expect((await charactersOf('ありがとう', 'en')).items).toEqual([]);
    expect(sent).toEqual([]);
    expect((await charactersOf('猫', 'en')).items).toEqual([]);
  });
});
