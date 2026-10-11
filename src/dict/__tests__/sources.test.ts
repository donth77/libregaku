import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Entry } from '../jmdict';
import type { Batch } from '../store';
import { FakeIDBs } from './fake-idb';

vi.mock('../download', async (original) => ({
  ...await original<typeof import('../download')>(),
  fetchBytes: vi.fn(),
}));

/**
 * The dictionaries other than JMdict, as the store reads them: a file that
 * is somebody else's, turned into entries and forms a batch at a time. The
 * files here are small ones in the real formats.
 */

const utf8 = new TextEncoder();

/** A zip with its files stored as they are: a header and the data for each, the directory, the end record. */
function zip(files: Record<string, string>): Uint8Array {
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const n = utf8.encode(name);
    const raw = utf8.encode(data);
    const header = new Uint8Array(30 + n.length);
    const h = new DataView(header.buffer);
    h.setUint32(0, 0x04034b50, true);
    h.setUint32(18, raw.length, true);
    h.setUint32(22, raw.length, true);
    h.setUint16(26, n.length, true);
    header.set(n, 30);
    const listing = new Uint8Array(46 + n.length);
    const l = new DataView(listing.buffer);
    l.setUint32(0, 0x02014b50, true);
    l.setUint32(20, raw.length, true);
    l.setUint32(24, raw.length, true);
    l.setUint16(28, n.length, true);
    l.setUint32(42, offset, true);
    listing.set(n, 46);
    parts.push(header, raw);
    directory.push(listing);
    offset += header.length + raw.length;
  }
  const size = directory.reduce((a, d) => a + d.length, 0);
  const end = new Uint8Array(22);
  const e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, directory.length, true);
  e.setUint16(10, directory.length, true);
  e.setUint32(12, size, true);
  e.setUint32(16, offset, true);
  const out = new Uint8Array(offset + size + end.length);
  let at = 0;
  for (const part of [...parts, ...directory, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

async function gzip(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A word's row as wiktionary-to-yomitan writes it: its meanings a list marked `glosses`. */
const lemma = (term: string, tags: string, ...meanings: string[]): unknown[] => [
  term, '', tags, '', 0,
  [{ type: 'structured-content', content: [{ tag: 'ol', data: { content: 'glosses' }, content: meanings.map((m) => ({ tag: 'li', content: [{ tag: 'div', content: [m] }] })) }] }],
  0, '',
];
/** A form's row: what it is a form of, and how. */
const form = (term: string, rules: string, of: string, how: string): unknown[] =>
  [term, '', 'non-lemma', rules, 0, [[of, [how]]], 0, ''];

async function all(batches: AsyncIterable<Batch>): Promise<Batch[]> {
  const out: Batch[] = [];
  for await (const b of batches) out.push(b);
  return out;
}

async function sources() {
  vi.resetModules();
  const download = await import('../download');
  const { SOURCES, CEDICT_URL, wtyUrl } = await import('../sources');
  return { SOURCES, CEDICT_URL, wtyUrl, fetchBytes: vi.mocked(download.fetchBytes) };
}

beforeEach(() => vi.useRealTimers());
afterEach(() => vi.resetAllMocks());

describe('the registry', () => {
  it('has a dictionary for each name the settings give one', async () => {
    const { SOURCES } = await sources();
    const { DICTIONARIES } = await import('../../settings');
    for (const [lang, name] of Object.entries(DICTIONARIES)) expect(SOURCES[name], `${lang}: ${name}`).toBeDefined();
  });

  it('keeps each in a database of its own', async () => {
    const { SOURCES } = await sources();
    const dbs = Object.values(SOURCES).map((s) => s.db);
    expect(new Set(dbs).size).toBe(dbs.length);
    // JMdict's is the one existing installs already hold.
    expect(SOURCES.jmdict?.db).toBe('libregaku-dict');
  });

  it('downloads the Wiktionary files from one pinned commit, never from "latest" alone', async () => {
    const { wtyUrl } = await sources();
    expect(wtyUrl('es', 'en')).toMatch(/^https:\/\/huggingface\.co\/datasets\/daxida\/wty-release\/resolve\/[0-9a-f]{40}\/latest\/dict\/es\/en\/wty-es-en\.zip$/);
  });
});

describe('a Wiktionary dictionary', () => {
  const archive = (): Uint8Array => zip({
    'index.json': '{"title":"wty-es-en"}',
    // Out of order in the archive: the reader takes the banks by their number.
    'term_bank_2.json': JSON.stringify([form('hablábamos', 'v', 'hablar', 'first-person plural imperfect indicative'), ['not', 'a', 'row']]),
    'term_bank_1.json': JSON.stringify([lemma('hablar', 'v', 'to talk; to speak'), lemma('mi', 'n masc', 'mi (the musical note)')]),
    'tag_bank_1.json': '[]',
  });

  it('reads its words, then the forms of them, a bank at a time', async () => {
    const { SOURCES, wtyUrl, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(archive());
    const batches = await all(await SOURCES['wty-es-en']!.read('en'));
    expect(fetchBytes.mock.calls[0]?.[0]).toBe(wtyUrl('es', 'en'));

    const words = batches.flatMap((b) => b.entries);
    expect(words.find((w) => w.entry.word === 'hablar')).toMatchObject({
      keys: ['hablar'], entry: { kind: ['v'], senses: [{ glosses: ['to talk; to speak'] }] },
    });
    expect(batches.flatMap((b) => b.inflections ?? [])).toContainEqual({
      form: 'hablábamos', pos: 'v', of: [{ lemma: 'hablar', tags: ['first-person plural imperfect indicative'] }],
    });
    // Whatever is not a row is passed over, and the last batch says it is done.
    expect(batches[batches.length - 1]?.percent).toBe(100);
  });

  it('gives the words the file leaves out, ahead of what it has for the same word', async () => {
    const { SOURCES, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(archive());
    const source = SOURCES['wty-es-en']!;
    const batches = await all(await source.read('en'));
    const words = batches.flatMap((b) => b.entries.map((e) => e.entry));

    // muy has no row in the published file at all.
    expect(words.find((w) => w.word === 'muy')).toMatchObject({ kind: ['adv'], senses: [{ glosses: ['very'] }] });
    // mi has one, without "my": ours is numbered first, so it leads the merged entry.
    const mi = words.filter((w) => w.word === 'mi').sort((a, b) => a.id.localeCompare(b.id));
    expect(mi.map((w) => w.senses[0]?.glosses[0])).toEqual(['my', 'mi (the musical note)']);
    expect(source.rank(mi, 'mi')[0]).toMatchObject({ word: 'mi', kind: ['det', 'n', 'masc'], senses: [{ glosses: ['my'] }, { glosses: ['mi (the musical note)'] }] });
    // And its plural, which the file files under a word it does not have.
    expect(batches.flatMap((b) => b.inflections ?? [])).toContainEqual({ form: 'mis', pos: 'det', of: [{ lemma: 'mi', tags: ['plural'] }] });
  });

  it('adds nothing of Spanish to Korean', async () => {
    const { SOURCES, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(zip({ 'term_bank_1.json': JSON.stringify([lemma('먹다', 'v', 'to eat')]) }));
    const words = (await all(await SOURCES['wty-ko-en']!.read('en'))).flatMap((b) => b.entries.map((e) => e.entry.word));
    expect(words).toContain('먹다');
    expect(words).toContain('뭐');
    expect(words).not.toContain('muy');
  });

  it('gives Korean its particles, each spelling of one under itself', async () => {
    const { SOURCES, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(zip({ 'term_bank_1.json': JSON.stringify([lemma('먹다', 'v', 'to eat')]) }));
    const added = (await all(await SOURCES['wty-ko-en']!.read('en'))).flatMap((b) => b.entries);
    const particles = added.filter((e) => e.entry.kind?.[0] === 'ptcl');
    const words = particles.map((e) => e.entry.word);
    // The two spellings of one particle, after a consonant and after a vowel.
    for (const pair of [['이', '가'], ['은', '는'], ['을', '를'], ['과', '와'], ['으로', '로'], ['이랑', '랑'], ['이나', '나']]) {
      for (const spelling of pair) expect(words, spelling).toContain(spelling);
    }
    for (const word of ['의', '에', '에서', '도', '만', '하고', '까지', '부터', '에게', '한테', '께', '보다', '처럼', '마다', '밖에', '요']) {
      expect(words, word).toContain(word);
    }
    expect(new Set(words).size).toBe(words.length);
    for (const p of particles) {
      expect(p.keys, p.entry.word).toEqual([p.entry.word]);
      expect(p.entry.senses.length, p.entry.word).toBeGreaterThan(0);
    }
  });

  it('shows one entry for a word with a row for each part of speech', async () => {
    const { SOURCES, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(zip({ 'term_bank_1.json': JSON.stringify([lemma('ser', 'v', 'to be'), lemma('ser', 'n masc', 'a being'), lemma('sera', 'n fem', 'basket')]) }));
    const source = SOURCES['wty-es-en']!;
    const rows = (await all(await source.read('en'))).flatMap((b) => b.entries.map((e) => e.entry)).filter((e) => e.word.startsWith('ser'));
    expect(source.rank(rows, 'ser')).toEqual([
      expect.objectContaining({ word: 'ser', kind: ['v', 'n', 'masc'], senses: [expect.objectContaining({ glosses: ['to be'] }), expect.objectContaining({ glosses: ['a being'] })] }),
    ]);
  });

  it('refuses an archive with no words in it, rather than storing an empty dictionary', async () => {
    const { SOURCES, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(zip({ 'index.json': '{}' }));
    await expect(SOURCES['wty-es-en']!.read('en')).rejects.toThrow(/no words/);
  });
});

describe('a Korean particle', () => {
  /*
   * Rows of wty-ko-en, 2026.10.04, each with the bank and the row it came
   * from, cut down to one meaning or one way of being a form. Wiktionary
   * keeps a particle under its form with a hyphen before it (-를), so under
   * the form alone the file has whatever else is spelt that way, or nothing.
   */
  const ROWS = [
    form('를', '', '이거', 'alternative'),                                                             // term_bank_5#9378
    lemma('이거', 'pron', 'this thing, this matter'),                                                  // term_bank_1#5421
    lemma('는', 'suf', 'See the entry at -는 (-neun, present tense-marking adnominalizing suffix).'),  // term_bank_1#2120
    lemma('는', 'ptcl', 'See the entry at -는 (-neun).'),                                              // term_bank_1#2121
    form('는', '', '이거', 'alternative'),                                                             // term_bank_5#9377
    form('는', 'v', '늘다', 'formal past determiner'),                                                 // term_bank_4#24213
    lemma('늘다', 'v vi', 'to increase'),                                                              // term_bank_1#5016
    lemma('이', 'det', 'this (proximal determiner)'),                                                  // term_bank_1#1660
    lemma('이', 'n', 'tooth, teeth (chiefly of a human)'),                                             // term_bank_1#1664
    form('이', '', '隶', 'hangeul'),                                                                   // term_bank_3#246
    lemma('을', 'n', 'B; used to enumerate the second of a group of unnamed people or objects'),       // term_bank_1#1621
    form('을', '', '鳦', 'hangeul'),                                                                   // term_bank_3#22915
    lemma('의', 'n lit', 'righteousness; righteous conduct'),                                          // term_bank_1#1626
    form('의', '', '依', 'hangeul'),                                                                   // term_bank_3#1114
    lemma('에서', 'name', 'Esau'),                                                                     // term_bank_1#24199
    lemma('보다', 'v vt', 'to see, to look at, to watch (to perceive with the eyes)'),                 // term_bank_1#2311
    lemma('엔', 'n', 'yen (currency of Japan)'),                                                       // term_bank_1#8487
    lemma('마다', 'v vt', 'to smash'),                                                                 // term_bank_1#11972
    form('마자', 'v', '마다', 'formal hortative'),                                                     // term_bank_8#8999
    lemma('먹다', 'v', 'to eat, drink, have, consume (food or liquid)'),                               // term_bank_1#2176
    form('먹어', 'v', '먹다', 'informal non-past indicative/interrogative'),                           // term_bank_4#417
    lemma('지다', 'v vi', 'to fall; to sink; to set; to go down'),                                     // term_bank_1#4939
    form('진다', 'v', '지다', 'formal non-past indicative'),                                           // term_bank_4#21110
    lemma('이다', 'ptcl', 'For the Korean copula ("to be"), see the entry at -이다 (-ida).'),          // term_bank_1#24098
    lemma('이다', 'v vt', 'to carry on the head'),                                                     // term_bank_1#24099
  ];

  /** The dictionary built from those rows, asked as the page asks it: a key, and the tag ko-dic gave the token. */
  async function korean(): Promise<(key: string, tag?: string) => Promise<Entry[]>> {
    const { SOURCES, fetchBytes } = await sources();
    vi.stubGlobal('indexedDB', new FakeIDBs());
    fetchBytes.mockResolvedValue(zip({ 'term_bank_1.json': JSON.stringify(ROWS) }));
    const store = await import('../store');
    const source = SOURCES['wty-ko-en']!;
    await store.build('en', undefined, source);
    return (key, tag) => store.lookup(key, tag ? { pos: tag } : undefined, source);
  }

  /** Each entry answered: its headword, and its meanings in order. */
  const told = (entries: Entry[]): Array<[string, string[]]> =>
    entries.map((e) => [e.word, e.senses.map((s) => s.glosses.join('; '))]);

  afterEach(() => vi.unstubAllGlobals());

  it('is itself, not the word the file calls it another way to write', async () => {
    const ask = await korean();
    // 운동화를 신으라고 했어야지: 를 opened the card for 이거, "this thing".
    expect(await ask('를', 'JKO')).toEqual([
      expect.objectContaining({ word: '를', kind: ['ptcl'], senses: [{ pos: ['ptcl'], glosses: ['marks the object (after a vowel)'] }] }),
    ]);
  });

  it('says what it does, where the file only points at a page with a hyphen in its name', async () => {
    const ask = await korean();
    // 는 the topic particle: not "See the entry at -는", not 이거, not a form of 늘다.
    expect(told(await ask('는', 'JX'))).toEqual([['는', ['marks the topic (after a vowel)']]]);
  });

  it('is not the other words spelt as it is', async () => {
    const ask = await korean();
    expect(told(await ask('이', 'JKS'))).toEqual([['이', ['marks the subject (after a consonant)']]]);
    expect(told(await ask('을', 'JKO'))).toEqual([['을', ['marks the object (after a consonant)']]]);
    expect(told(await ask('의', 'JKG'))).toEqual([['의', ['’s, of']]]);
    expect(told(await ask('에서', 'JKB'))).toEqual([['에서', ['at, in (where something is done); from (a place)']]]);
    expect(told(await ask('보다', 'JKB'))).toEqual([['보다', ['than']]]);
  });

  it('is answered where the file has nothing under its spelling at all', async () => {
    const ask = await korean();
    expect(told(await ask('까지', 'JX'))).toEqual([['까지', ['until, up to, as far as; even']]]);
    expect(told(await ask('에게', 'JKB'))).toEqual([['에게', ['to (a person)']]]);
  });

  it('leaves a word spelt like one as it was, with the particle after it', async () => {
    const ask = await korean();
    // 이 사람, "this person": the determiner, as ko-dic tags it.
    expect(told(await ask('이', 'MM'))).toEqual([
      ['이', ['this (proximal determiner)', 'tooth, teeth (chiefly of a human)']],
      ['이', ['marks the subject (after a consonant)']],
    ]);
    expect(told(await ask('보다', 'VV'))[0]).toEqual(['보다', ['to see, to look at, to watch (to perceive with the eyes)']]);
    // And asked for with no tag, as a word typed into a search is.
    expect(told(await ask('이'))[0]?.[1][0]).toBe('this (proximal determiner)');
    // A particle with no other word spelt as it is, is all there is to find.
    expect(told(await ask('를'))).toEqual([['를', ['marks the object (after a vowel)']]]);
  });

  it('is not answered by a word that only happens to be spelt as it is', async () => {
    const ask = await korean();
    // 이번엔: 엔 is 에 and 는 run together, and ko-dic gives 에 as the next key to try.
    expect(await ask('엔', 'JKB')).toEqual([]);
    expect(told(await ask('엔', 'NNG'))).toEqual([['엔', ['yen (currency of Japan)']]]);
  });

  it('is never a form of another word', async () => {
    const ask = await korean();
    // 하자마자: the file knows 마자 as "let us smash", and 마다 is also the particle "every".
    expect(await ask('마자', 'JX')).toEqual([]);
    expect(told(await ask('마자', 'VV'))[0]).toEqual(['마다', ['to smash']]);
  });

  it('leaves an inflected word to be found by the word it is a form of', async () => {
    const ask = await korean();
    expect(told(await ask('먹어', 'VV'))).toEqual([['먹다', ['to eat, drink, have, consume (food or liquid)']]]);
    expect(told(await ask('먹어'))).toEqual([['먹다', ['to eat, drink, have, consume (food or liquid)']]]);
    // 서쪽으로 진다: ko-dic calls this 진다 an ending. What it calls an ending is as often a verb it did not know.
    expect(told(await ask('진다', 'EF'))).toEqual([['지다', ['to fall; to sink; to set; to go down']]]);
  });

  it('counts the copula as a verb, which is "to be" before it is anything else', async () => {
    const ask = await korean();
    expect(told(await ask('이다', 'VCP'))).toEqual([['이다', ['to be (after a noun)', 'to carry on the head']]]);
  });

  it('changes nothing for Spanish, whose tokens carry no tag', async () => {
    const { SOURCES, fetchBytes } = await sources();
    vi.stubGlobal('indexedDB', new FakeIDBs());
    fetchBytes.mockResolvedValue(zip({ 'term_bank_1.json': JSON.stringify([
      lemma('hablar', 'v', 'to talk; to speak'), form('hablábamos', 'v', 'hablar', 'first-person plural imperfect indicative'),
      lemma('no', 'adv', 'no; not'), lemma('no', 'ptcl', 'not'),
    ]) }));
    const store = await import('../store');
    const source = SOURCES['wty-es-en']!;
    await store.build('en', undefined, source);
    expect(told(await store.lookup('hablábamos', undefined, source))).toEqual([['hablar', ['to talk; to speak']]]);
    // And were one tagged as ko-dic tags a particle: its rows are still one entry in the file's order, its forms still followed.
    expect(told(await store.lookup('no', { pos: 'JX' }, source))).toEqual([['no', ['no; not', 'not']]]);
    expect(told(await store.lookup('hablábamos', { pos: 'JX' }, source))).toEqual([['hablar', ['to talk; to speak']]]);
  });
});

describe('CC-CEDICT', () => {
  const FILE = [
    '# CC-CEDICT', '#! date=2026-10-10T09:16:04Z',
    '學校 学校 [xue2 xiao4] /school/CL:所[suo3]/',
    '學 学 [xue2] /to learn; to study/-ology/',
    '校 校 [xiao4] /(bound form) school; college/',
    '校 校 [jiao4] /to proofread/to check; to compare/',
    ...Array.from({ length: 1000 }, (_, i) => `字${i} 字${i} [zi4] /filler ${i}/`),
  ].join('\r\n');

  it('reads the current file, a word to a line, under both its written forms', async () => {
    const { SOURCES, CEDICT_URL, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(await gzip(FILE));
    const batches = await all(await SOURCES.cedict!.read('en'));
    expect(fetchBytes.mock.calls[0]?.[0]).toBe(CEDICT_URL);
    const school = batches.flatMap((b) => b.entries).find((e) => e.entry.word === '学校');
    expect(school).toMatchObject({ keys: ['学校', '學校'], entry: { reading: 'xué xiào', alt: '學校' } });
    expect(batches.reduce((n, b) => n + b.entries.length, 0)).toBe(1004);
  });

  it('refuses an answer that is not the dictionary', async () => {
    const { SOURCES, fetchBytes } = await sources();
    fetchBytes.mockResolvedValue(await gzip('<html>moved</html>'));
    await expect(SOURCES.cedict!.read('en')).rejects.toThrow(/no words/);
  });

  it('describes each character of a word from its own entry, its usual reading first', async () => {
    vi.resetModules();
    vi.doMock('../store', async (original) => {
      const real = await original<typeof import('../store')>();
      const { parseLine, toEntry, rank } = await import('../cedict');
      const entries = FILE.split('\r\n').map((line, i) => { const row = parseLine(line); return row ? toEntry(row, String(i).padStart(8, '0')) : null; }).filter((e) => e !== null);
      return { ...real, lookup: async (key: string) => rank(entries.filter((e) => e.word === key || e.alt === key), key) };
    });
    const { SOURCES } = await import('../sources');
    const described = await SOURCES.cedict!.characters!(['学', '校', '好']);
    vi.doUnmock('../store');
    expect(described).toEqual([
      { char: '学', meanings: ['to learn', 'to study', '-ology'], on: ['xué'], kun: [] },
      { char: '校', meanings: ['(bound form) school', 'college'], on: ['xiào', 'jiào'], kun: [] },
    ]);
  });
});
