import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RawWord } from '../jmdict';
import { FakeIDB, type Row } from './fake-idb';

vi.mock('../archive', () => ({ fetchJsonTgz: vi.fn() }));

const word = (id: string, kana: string, opts: Partial<RawWord> & { uk?: boolean; common?: boolean } = {}): RawWord => ({
  id,
  kanji: opts.kanji,
  kana: [{ text: kana, common: opts.common ?? false }],
  sense: [{ partOfSpeech: ['n'], misc: opts.uk ? ['uk'] : [], gloss: [{ text: `gloss ${id}`, lang: 'eng' }] }],
});

/** Enough words to count as populated, plus whatever a test adds. */
const filler = Array.from({ length: 1001 }, (_, i) => word(String(3000000 + i), `ふぃら${i}`));

let idb: FakeIDB;

async function fresh(words: RawWord[] = filler) {
  vi.resetModules();
  idb = new FakeIDB();
  vi.stubGlobal('indexedDB', idb);
  const archive = await import('../archive');
  // A fresh array per download: build() releases each parsed word as it
  // indexes it, as it may with JSON it parsed itself.
  vi.mocked(archive.fetchJsonTgz).mockImplementation(async () => ({ words: [...words] }));
  return import('../store');
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.unstubAllGlobals());

describe('store', () => {
  it('builds, marks itself complete, and reports populated', async () => {
    const store = await fresh();
    await store.build('eng');
    expect(await store.isPopulated('eng')).toBe(true);
    expect(await store.isPopulated('ger')).toBe(false);
    expect(await store.hasStale('eng')).toBe(false);
  });

  it('treats an older release of the same edition as stale, not current', async () => {
    const store = await fresh();
    await store.build('eng');
    const meta = idb.stores.get('meta')!.rows;
    for (const old of ['eng', 'eng@3.6.2+20260824122934#2']) {
      meta.set(JSON.stringify('edition'), old as unknown as Row);
      expect(await store.isPopulated('eng'), old).toBe(false);
      expect(await store.hasStale('eng'), old).toBe(true);
      expect(await store.hasStale('ger'), old).toBe(false);
    }
  });

  it('unmarks the store before writing, so an interrupted build is never taken for complete', async () => {
    // More than one batch, so the failure lands after thousands of entries
    // are already in — enough to pass the count check on their own.
    const many = Array.from({ length: 6001 }, (_, i) => word(String(4000000 + i), `たくさん${i}`));
    const store = await fresh(many);
    await store.build('eng');
    expect(await store.isPopulated('eng')).toBe(true);

    // Rebuilding: the reset (write 1) and the first batch of 5000 (write 2)
    // land; the second batch fails — a full disk, say.
    idb.writes = 0;
    idb.failWrite = 3;
    await expect(store.build('eng')).rejects.toBeTruthy();
    expect(idb.stores.get('entries')!.rows.size).toBe(5000);
    expect(await store.isPopulated('eng')).toBe(false);
    expect(await store.hasStale('eng')).toBe(false);
  });

  it('ranks every candidate before returning any', async () => {
    // Twenty-four rare entries with low ids, and the everyday one last. Cut
    // to twenty in id order first, it could never be found.
    const rare = Array.from({ length: 24 }, (_, i) => word(String(1000000 + i), 'よう', { kanji: [{ text: `漢${i}` }] }));
    const everyday = word('1605840', 'よう', { kanji: [{ text: '様', common: true }], common: true, uk: true });
    const store = await fresh([...filler, ...rare, everyday]);
    await store.build('eng');
    const found = await store.lookup('よう');
    expect(found[0]?.id).toBe('1605840');
    expect(found.length).toBeLessThanOrEqual(20);
  });

  it('answers the tokenizer’s questions about written forms', async () => {
    const store = await fresh([
      ...filler,
      word('1576150', 'ひとり', { kanji: [{ text: '一人', common: true }], common: true }),
      word('1576260', 'いちにち', { kanji: [{ text: '一日', common: true }], common: true }),
      word('2225040', 'ついたち', { kanji: [{ text: '一日', common: true }], common: true }),
    ]);
    await store.build('eng');
    const lex = await store.lexicon(['一人', '一日', '三匹']);
    expect(lex['一人']).toEqual([{ word: '一人', reading: 'ひとり', pos: ['n'] }]);
    expect(lex['一日']?.map((r) => r.reading).sort()).toEqual(['いちにち', 'ついたち']);
    expect(lex['三匹']).toBeUndefined();
  });
});

describe('KANJIDIC2', () => {
  const characters = Array.from({ length: 1001 }, (_, i) => ({
    literal: String.fromCodePoint(0x4e00 + i),
    misc: { strokeCounts: [3] },
    readingMeaning: { groups: [{ readings: [{ type: 'ja_on', value: 'イチ' }], meanings: [{ lang: 'en', value: `m${i}` }] }] },
  }));

  async function withKanji() {
    const store = await fresh();
    const archive = await import('../archive');
    vi.mocked(archive.fetchJsonTgz).mockImplementation(async (url: string) =>
      (url.includes('kanjidic2') ? { characters } : { words: [...filler] }));
    return store;
  }

  it('builds from the pinned release, marks itself complete, and finds characters', async () => {
    const store = await withKanji();
    expect(store.kanjidicUrl()).toMatch(/kanjidic2-all-.+\.json\.tgz$/);
    expect(await store.hasKanji()).toBe(false);
    expect(await store.buildKanji()).toBe(1001);
    expect(await store.hasKanji()).toBe(true);
    const [first, second] = await store.kanjiFor(['一', '丁', '!']);
    expect(first).toMatchObject({ char: '一', on: ['イチ'], meanings: { en: ['m0'] } });
    expect(second?.char).toBe('丁');
  });

  it('lives beside JMdict without disturbing it', async () => {
    const store = await withKanji();
    await store.build('eng');
    await store.buildKanji();
    expect(await store.isPopulated('eng')).toBe(true);
    expect(await store.hasKanji()).toBe(true);
  });

  it('is not complete when the data is empty', async () => {
    const store = await fresh();
    const archive = await import('../archive');
    vi.mocked(archive.fetchJsonTgz).mockResolvedValue({ characters: [] });
    await expect(store.buildKanji()).rejects.toThrow(/no characters/);
    expect(await store.hasKanji()).toBe(false);
  });
});
