import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry, RawWord } from '../jmdict';
import type { Batch, Source } from '../store';
import { FakeIDBs } from './fake-idb';

vi.mock('../archive', () => ({ fetchJsonTgz: vi.fn() }));

/**
 * The store with more than one dictionary in it: each in a database of its
 * own, each with its own marks, and the table of inflected forms a language
 * found by its word boundaries is read through.
 */

const entry = (id: string, word: string, gloss = `gloss ${id}`, kind?: string[]): Entry =>
  ({ id, word, common: false, senses: [{ pos: [], glosses: [gloss] }], ...(kind ? { kind } : {}) });

/** A small dictionary of a made-up language: words, and forms of them. */
function source(over: Partial<Source> = {}, words = 1200): Source & { reads: number } {
  const made: Source & { reads: number } = {
    id: 'test',
    db: 'libregaku-dict-test',
    release: 'r1',
    format: 1,
    reads: 0,
    rank: (entries) => [...entries].sort((a, b) => a.id.localeCompare(b.id)),
    async read() {
      made.reads++;
      return (async function* (): AsyncGenerator<Batch> {
        yield {
          entries: [
            { entry: entry('00000001', 'hablar', 'to speak', ['v']), keys: ['hablar'] },
            { entry: entry('00000002', 'casa', 'house', ['n', 'fem']), keys: ['casa'] },
            // One word, two rows: the dictionary has a row for each part of speech.
            { entry: entry('00000003', 'haber', 'to have', ['v']), keys: ['haber'] },
            { entry: { ...entry('00000004', 'haber', 'asset', ['n', 'masc']), senses: [{ pos: [], glosses: ['asset'] }, { pos: [], glosses: ['credit'] }] }, keys: ['haber'] },
          ],
          inflections: [
            { form: 'hablamos', of: [{ lemma: 'hablar', tags: ['first-person plural present indicative'] }], pos: 'v' },
            { form: 'casa', of: [{ lemma: 'casar', tags: ['third-person singular present indicative'] }], pos: 'v' },
            // ha is filed under her, an old spelling with no entry of its own, which is a form of haber.
            { form: 'ha', of: [{ lemma: 'her', tags: ['third-person singular present subjunctive'] }], pos: 'v' },
            { form: 'her', of: [{ lemma: 'haber', tags: ['obsolete'] }] },
          ],
          percent: 50,
        };
        yield {
          entries: Array.from({ length: words }, (_, i) => {
            const e = entry(String(1000 + i).padStart(8, '0'), `w${i}`);
            return { entry: e, keys: [e.word] };
          }),
          // The same form again, further on in the file: both must be found.
          inflections: [{ form: 'hablamos', of: [{ lemma: 'hablar', tags: ['first-person plural indicative preterite'] }], pos: 'v' }],
          percent: 100,
        };
      })();
    },
    ...over,
  };
  return made;
}

const jmdictWord = (id: string, kana: string): RawWord => ({
  id, kana: [{ text: kana, common: false }], sense: [{ partOfSpeech: ['n'], gloss: [{ text: `gloss ${id}`, lang: 'eng' }] }],
});

let idbs: FakeIDBs;

async function fresh() {
  vi.resetModules();
  idbs = new FakeIDBs();
  vi.stubGlobal('indexedDB', idbs);
  const archive = await import('../archive');
  vi.mocked(archive.fetchJsonTgz).mockImplementation(async () => ({
    words: Array.from({ length: 1001 }, (_, i) => jmdictWord(String(3000000 + i), `ふぃら${i}`)),
  }));
  return import('../store');
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());

describe('a second dictionary', () => {
  it('is kept in a database of its own, beside JMdict', async () => {
    const store = await fresh();
    const es = source();
    await store.build('eng');
    await store.build('en', undefined, es);

    expect([...idbs.dbs.keys()].sort()).toEqual(['libregaku-dict', 'libregaku-dict-test']);
    expect(await store.isPopulated('eng')).toBe(true);
    expect(await store.isPopulated('en', es)).toBe(true);
    // Each answers from its own.
    expect((await store.lookup('hablar', undefined, es)).map((e) => e.word)).toEqual(['hablar']);
    expect(await store.lookup('hablar')).toEqual([]);
    expect(await store.lookup('ふぃら1', undefined, es)).toEqual([]);
  });

  it('is found where it was left when the language comes back, with no second download', async () => {
    const store = await fresh();
    const es = source();
    await store.build('en', undefined, es);
    await store.build('eng');
    expect(await store.isPopulated('en', es)).toBe(true);
    expect(es.reads).toBe(1);
  });

  it('is marked by its own release and format, so a bump of either replaces it', async () => {
    const store = await fresh();
    await store.build('en', undefined, source());
    expect(idbs.db('libregaku-dict-test').stores.get('meta')!.rows.get('"edition"')).toBe('en@r1#1');
    for (const newer of [source({ release: 'r2' }), source({ format: 2 })]) {
      expect(await store.isPopulated('en', newer)).toBe(false);
      // Still good to answer from while its replacement downloads.
      expect(await store.hasStale('en', newer)).toBe(true);
    }
  });

  it('records when it was fetched — all a publisher with only a "current" file lets us say', async () => {
    const store = await fresh();
    await store.build('en', undefined, source());
    const fetched = idbs.db('libregaku-dict-test').stores.get('meta')!.rows.get('"fetched"');
    expect(String(fetched)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('is not complete when the download holds nothing', async () => {
    const store = await fresh();
    const empty = source({
      async read() {
        return (async function* (): AsyncGenerator<Batch> {
          yield { entries: [], percent: 100 };
        })();
      },
    });
    await expect(store.build('en', undefined, empty)).rejects.toThrow(/no words/);
    expect(await store.isPopulated('en', empty)).toBe(false);
  });

  it('reports how far through the file it is as it stores it', async () => {
    const store = await fresh();
    const seen: string[] = [];
    await store.build('en', (phase, percent) => seen.push(`${phase} ${percent}`), source());
    expect(seen).toEqual(['downloading 0', 'indexing 0', 'indexing 50', 'indexing 100']);
  });

  it('ranks with its own rule, not JMdict’s', async () => {
    const store = await fresh();
    const backwards = source({
      read: async () => (async function* (): AsyncGenerator<Batch> {
        yield {
          entries: [
            ...Array.from({ length: 1001 }, (_, i) => ({ entry: entry(`f${i}`, `f${i}`), keys: [`f${i}`] })),
            { entry: entry('1', 'x', 'first'), keys: ['x'] },
            { entry: entry('2', 'x', 'second'), keys: ['x'] },
          ],
          percent: 100,
        };
      })(),
      rank: (entries) => [...entries].sort((a, b) => b.id.localeCompare(a.id)),
    });
    await store.build('en', undefined, backwards);
    expect((await store.lookup('x', undefined, backwards)).map((e) => e.senses[0]?.glosses[0])).toEqual(['second', 'first']);
  });
});

describe('a word the dictionary knows by another name', () => {
  it('is answered by the entry of the word it is a form of, when it has none of its own', async () => {
    const store = await fresh();
    const es = source();
    await store.build('en', undefined, es);
    // hablamos has no entry; hablar does.
    expect((await store.lookup('hablamos', undefined, es)).map((e) => e.word)).toEqual(['hablar']);
    // A word with an entry is itself, whatever it is also a form of.
    expect((await store.lookup('casa', undefined, es)).map((e) => e.word)).toEqual(['casa']);
    // Nothing known of it, and nothing it is a form of: an honest miss.
    expect(await store.lookup('zzz', undefined, es)).toEqual([]);
    // A form whose word has no entry either.
    expect(await store.lookup('her', undefined, es)).toEqual([expect.objectContaining({ word: 'haber' }), expect.objectContaining({ word: 'haber' })]);
  });

  it('is not, where the dictionary says a word of its kind is no form of anything', async () => {
    const store = await fresh();
    // A dictionary that takes what the analyser calls a particle for a word in its own right.
    const es = source({ followsForms: (hint) => hint?.pos !== 'particle' });
    await store.build('en', undefined, es);
    expect(await store.lookup('hablamos', { pos: 'particle' }, es)).toEqual([]);
    // Anything else is followed as before, and so is a word the analyser said nothing of.
    expect((await store.lookup('hablamos', { pos: 'v' }, es)).map((e) => e.word)).toEqual(['hablar']);
    expect((await store.lookup('hablamos', undefined, es)).map((e) => e.word)).toEqual(['hablar']);
    // An entry of its own is found whatever the word is called.
    expect((await store.lookup('casa', { pos: 'particle' }, es)).map((e) => e.word)).toEqual(['casa']);
  });

  it('costs JMdict nothing: it has no such table, and a miss stays a miss', async () => {
    const store = await fresh();
    await store.build('eng');
    expect(await store.lookup('ｚｚｚ')).toEqual([]);
    // And a Japanese particle is looked up as it always was, hint and all.
    expect((await store.lookup('ふぃら1', { pos: '助詞' })).map((e) => e.word)).toEqual(['ふぃら1']);
  });
});

describe('the table of inflected forms', () => {
  it('says what a form is a form of, from every row that mentions it', async () => {
    const store = await fresh();
    const es = source();
    await store.build('en', undefined, es);
    const forms = await store.formsOf(['hablamos', 'hablar', 'casa', 'nada'], es);
    expect(forms.hablamos).toEqual({
      word: false, senses: 0, kind: [],
      of: [
        { lemma: 'hablar', tags: ['first-person plural present indicative'], pos: 'v', senses: 1 },
        { lemma: 'hablar', tags: ['first-person plural indicative preterite'], pos: 'v', senses: 1 },
      ],
    });
    // A word in its own right, with nothing it is a form of.
    expect(forms.hablar).toEqual({ word: true, senses: 1, kind: ['v'], of: [] });
    // Both at once: casa the house, and a form of casar — a verb this small dictionary has no entry for.
    expect(forms.casa).toEqual({
      word: true, senses: 1, kind: ['n', 'fem'],
      of: [{ lemma: 'casar', tags: ['third-person singular present indicative'], pos: 'v', senses: 0 }],
    });
    // Nothing known of it: left out, rather than answered with a guess.
    expect(forms.nada).toBeUndefined();
  });

  it('counts a word’s meanings and kinds over every row it has', async () => {
    const store = await fresh();
    const es = source();
    await store.build('en', undefined, es);
    expect((await store.formsOf(['haber'], es)).haber).toEqual({ word: true, senses: 3, kind: ['v', 'n', 'masc'], of: [] });
  });

  it('follows a form of a form on to a word with an entry, once', async () => {
    const store = await fresh();
    const es = source();
    await store.build('en', undefined, es);
    expect((await store.formsOf(['ha'], es)).ha).toEqual({
      word: false, senses: 0, kind: [],
      of: [{ lemma: 'haber', tags: ['third-person singular present subjunctive'], pos: 'v', senses: 3 }],
    });
  });

  it('is emptied with the rest when the dictionary is replaced', async () => {
    const store = await fresh();
    const es = source();
    await store.build('en', undefined, es);
    await store.build('en', undefined, es);
    expect((await store.formsOf(['hablamos'], es)).hablamos?.of).toHaveLength(2);
  });

  it('answers nothing for no forms, without opening anything', async () => {
    const store = await fresh();
    expect(await store.formsOf([], source())).toEqual({});
    expect(idbs.dbs.size).toBe(0);
  });
});
