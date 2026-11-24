import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { charactersOf, clearLookupCache, keysOf, lookupToken, lookupWord } from '../client';
import type { Entry } from '../jmdict';
import { SOURCES } from '../sources';
import { OWN_DICTIONARIES } from '../../settings';

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

describe('a word the line uses in a verb’s form', () => {
  // Have you seen my keys? — as the English segmenter traces seen (src/morphology/lemma.ts).
  const seen = {
    surface: 'seen', lemma: 'see', inflections: ['past participle', 'or seen', 'or sin'],
    lookup: [{ key: 'see' }, { key: 'seen' }, { key: 'sin' }],
  };

  it('asks for its dictionary form as a verb, and for the other words as they are', async () => {
    expect(keysOf(seen)).toEqual([{ key: 'see', pos: 'v' }, { key: 'seen' }, { key: 'sin' }]);
    offscreen((m) => (m.type === 'dict-lookup' ? { ok: true, source: 'local', entries: [entry(String(m.key))] } : undefined));
    await lookupToken(seen);
    expect(sent.map((m) => [m.key, m.pos])).toEqual([['see', 'v']]);
  });

  it('does so for every tense, mood and verbal noun the trace names, in any language read by its forms', () => {
    const verb = (surface: string, lemma: string, ...inflections: string[]) =>
      keysOf({ surface, lemma, inflections, lookup: [{ key: lemma }] })[0]?.pos;
    expect(verb('visto', 'ver', 'masculine singular past participle')).toBe('v');
    expect(verb('hablábamos', 'hablar', 'first-person plural imperfect indicative')).toBe('v');
    expect(verb('going', 'go', 'present gerund participle and', 'or going')).toBe('v');
    expect(verb('يملك', 'ملك', 'third-person singular masculine non-past', 'third-person singular masculine jussive')).toBe('v');
    expect(verb('yiyor', 'yemek', 'ongoing')).toBe('v');
  });

  it('asks as before where any reading of the trace is not a verb’s, or a person is all it names', () => {
    const verb = (surface: string, lemma: string, ...inflections: string[]) =>
      keysOf({ surface, lemma, inflections, lookup: [{ key: lemma }] })[0]?.pos;
    // friends is the plural of friend the noun, or friend the verb's third person: the line does not say which.
    expect(verb('friends', 'friend', 'plural', 'third-person singular present indicative simple')).toBeUndefined();
    expect(verb('casas', 'casa', 'plural')).toBeUndefined();
    // من with a person on it is "from us"; a Turkish person ending follows a noun as well ("they are cows").
    expect(verb('منا', 'من', 'first-person plural masculine feminine dual', 'third-person masculine past dual')).toBeUndefined();
    expect(verb('inekler', 'inek', 'third-person plural')).toBeUndefined();
    // خبزا is "bread" in the accusative far more often than "the two of them baked", and is written alike.
    expect(verb('خبزا', 'خبز', 'third-person masculine past dual', 'third-person masculine past passive dual')).toBeUndefined();
    expect(verb("Tom's", 'Tom', 'possessive')).toBeUndefined();
  });

  it('leaves the analyser’s own tag to decide, where it gave one', () => {
    const tagged = { surface: '来た', lemma: '来る', pos: '動詞', inflections: ['past'], lookup: [{ key: '来る' }] };
    expect(keysOf(tagged)).toEqual([{ key: '来る' }]);
    expect(keysOf({ ...seen, lookup: [{ key: 'see', pos: 'VV' }] })).toEqual([{ key: 'see', pos: 'VV' }]);
    // A word in its own form has no trace to go by.
    expect(keysOf({ surface: 'see', lemma: 'see', lookup: [{ key: 'see' }] })).toEqual([{ key: 'see' }]);
  });
});

describe('a word the line uses in a verb’s form, with a dictionary in the learner’s own language', () => {
  const seen = {
    surface: 'seen', lemma: 'see', inflections: ['past participle', 'or seen', 'or sin'],
    lookup: [{ key: 'see' }, { key: 'seen' }, { key: 'sin' }],
  };
  const row = (id: string, kind: string[], ...glosses: string[]): Entry =>
    ({ id, word: 'see', common: false, kind, senses: glosses.map((g) => ({ pos: kind, glosses: [g] })) });
  /** The language's own dictionary, English Wiktionary's see (wty-en-en). */
  const english = [row('e1', ['n'], 'A diocese.'), row('e2', ['v'], 'To perceive or detect with the eyes.')];

  /**
   * The offscreen document as answerLookup answers: the learner's own dictionary first, each with its own rank,
   * then the language's own; the rows of each as the store hands them to the rank.
   */
  function asOffscreen(ownId: string, own: Entry[], lang: string): void {
    offscreen((m) => {
      if (m.type !== 'dict-lookup') return undefined;
      const key = String(m.key);
      const hint = { reading: m.reading as string | undefined, pos: m.pos as string | undefined };
      const mine = SOURCES[ownId]!.rank(own.filter((e) => e.word === key), key, hint);
      if (mine.length) return { ok: true, source: 'local', entries: mine.map((e) => ({ ...e, lang })) };
      return { ok: true, source: 'local', entries: SOURCES['wty-en-en']!.rank(english.filter((e) => e.word === key), key, hint) };
    });
  }

  it('opens on the learner’s own dictionary, on its verb, for every own dictionary English has', async () => {
    // Thai Wiktionary's see is two verb rows (wty-en-th); Japanese's a noun row, then the verb's (wty-en-ja).
    const rows: Record<string, [Entry[], string]> = {
      'wty-en-th': [[row('t1', ['v'], 'เห็น, เจอ'), row('t2', ['v'], 'เข้าใจ')], 'เห็น, เจอ'],
      'wty-en-ja': [[row('j1', ['名'], '司教。'), row('j2', ['動'], '～を見る、みえる、目に入る。')], '～を見る、みえる、目に入る。'],
    };
    const pairs = Object.entries(OWN_DICTIONARIES.en!);
    expect(pairs.length).toBeGreaterThan(10);
    for (const [lang, id] of pairs) {
      clearLookupCache();
      // Any other: WikDict's and the glossaries' see, the noun's row first (wikdict-en-de: Bischofssitz).
      const [own, opens] = rows[id] ?? [[row('o1', ['n'], `${lang}: diocese`), row('o2', ['v'], `${lang}: to see`)], `${lang}: to see`];
      asOffscreen(id, own, lang);
      const r = await lookupToken(seen);
      const top = r.state === 'ok' ? r.entries[0] : undefined;
      expect([top?.lang, top?.senses[0]?.glosses[0]], id).toEqual([lang, opens]);
    }
  });

  it('opens on the language’s own dictionary, on its verb, where the learner’s has no such word', async () => {
    asOffscreen('wty-en-th', [], 'th');
    const r = await lookupToken(seen);
    expect(r.state === 'ok' ? [r.entries[0]?.lang, r.entries[0]?.senses[0]?.glosses[0]] : r).toEqual([undefined, 'To perceive or detect with the eyes.']);
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
