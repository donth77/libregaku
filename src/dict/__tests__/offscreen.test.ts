import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The offscreen document's message handling: one shared analyser load, a
 * stored dictionary that recovers from a partial write, each analyser
 * dictionary read by its own columns, a word dictionary for each language,
 * and lookups that stay local once they can.
 *
 * lindera, OPFS, IndexedDB and the network are all stood in for; what is
 * under test is src/offscreen.ts deciding what to do with them.
 */

/** What the analyser returns for a line, as each dictionary lays its columns out. */
const lindera = vi.hoisted(() => ({
  free: (() => undefined) as () => void,
  rows: {
    // 一 + 回: a number and its counter, which merging asks the dictionary about.
    一回: [
      { surface: '一', details: ['名詞', '数', '*', '*', '*', '*', '一', 'イチ', 'イチ'] },
      { surface: '回', details: ['名詞', '接尾', '助数詞', '*', '*', '*', '回', 'カイ', 'カイ'] },
    ],
    // 日本: a name to IPADIC, read the rarer way.
    日本: [
      { surface: '日本', details: ['名詞', '固有名詞', '地域', '国', '*', '*', '日本', 'ニッポン', 'ニッポン'] },
    ],
    // ko-dic: tag, meaning, final consonant, reading, type, first tag, last tag, expression.
    갔어요: [
      { surface: '갔', details: ['VV+EP', '*', 'T', '갔', 'Inflect', 'VV', 'EP', '가/VV/*+았/EP/*'] },
      { surface: '어요', details: ['EF', '*', 'F', '어요', '*', '*', '*', '*'] },
    ],
    // cc-cedict: four empty part-of-speech columns, then its one reading, both scripts, a definition.
    去学校了: [
      { surface: '去', details: ['*', '*', '*', '*', 'qu4', '去', '去', 'to go/'] },
      { surface: '学校', details: ['*', '*', '*', '*', 'xue2 xiao4', '學校', '学校', 'school/'] },
      { surface: '了', details: ['*', '*', '*', '*', 'liao4', '瞭', '了', 'unofficial variant of 瞭[liao4]/'] },
    ],
    // IPADIC has no 癒やす: a piece with a short row, and an ending it takes やす for.
    癒やす: [
      { surface: '癒', details: ['名詞', '一般', '*', '*', '*', '*', '*'] },
      { surface: 'やす', details: ['助動詞', '*', '*', '*', '特殊・ヤス', '基本形', 'やす', 'ヤス', 'ヤス'] },
    ],
  } as Record<string, Array<{ surface: string; details: string[] }>>,
  /** The same lines as UniDic reads them. */
  unidic: {
    癒やす: [
      { surface: '癒やす', details: ['動詞', '一般', '*', '*', '五段-サ行', '終止形-一般', 'イヤス', '癒やす', '癒やす', 'イヤス', '癒やす', 'イヤス', '和', '*', '*', '*', '*'] },
    ],
    // 奢る, to treat, is 驕る, to be proud, to UniDic: one word under two spellings.
    奢る: [
      { surface: '奢る', details: ['動詞', '一般', '*', '*', '五段-ラ行', '終止形-一般', 'オゴル', '驕る', '奢る', 'オゴル', '奢る', 'オゴル', '和', '*', '*', '*', '*'] },
    ],
    蕎麦屋: [
      { surface: '蕎麦', details: ['名詞', '普通名詞', '一般', '*', '*', '*', 'ソバ', '蕎麦', '蕎麦', 'ソバ', '蕎麦', 'ソバ', '和', '*', '*', '*', '*'] },
      { surface: '屋', details: ['接尾辞', '名詞的', '一般', '*', '*', '*', 'ヤ', '屋', '屋', 'ヤ', '屋', 'ヤ', '和', '*', '*', '*', '*'] },
    ],
  } as Record<string, Array<{ surface: string; details: string[] }>>,
}));

vi.mock('lindera-wasm', () => ({
  default: vi.fn(async () => undefined),
  // A dictionary is told by its columns: UniDic has a lexeme, which no other has.
  loadDictionaryFromBytes: vi.fn((metadata: Uint8Array) => ({ unidic: new TextDecoder().decode(metadata).includes('lexeme') })),
  loadUserDictionaryFromBytes: vi.fn(() => ({})),
  TokenizerBuilder: class {
    unidic = false;
    setDictionaryInstance(dictionary?: { unidic?: boolean }) {
      this.unidic = Boolean(dictionary?.unidic);
      return this;
    }
    setUserDictionaryInstance() { return this; }
    setMode() { return this; }
    build() {
      const rows = this.unidic ? lindera.unidic : lindera.rows;
      const tokenize = (text: string) => rows[text]
        ?? [{ surface: text, details: ['名詞', '一般', '*', '*', '*', '*', text, 'ヨミ', 'ヨミ'] }];
      return {
        free: lindera.free,
        tokenize,
        tokenizeNbest: (text: string) => [{ tokens: tokenize(text), cost: 0 }],
      };
    }
  },
}));
vi.mock('lindera-wasm/opfs', () => ({
  downloadDictionary: vi.fn(),
  hasDictionary: vi.fn(),
  loadDictionaryFiles: vi.fn(),
  removeDictionary: vi.fn(async () => undefined),
}));
vi.mock('../store', () => ({
  // JMdict as a source: the dictionary lookups go to until another language asks for its own.
  JMDICT: { id: 'jmdict', db: 'libregaku-dict', release: 'test', format: 1, rank: (e: unknown[]) => e, read: async () => [] },
  build: vi.fn(),
  hasStale: vi.fn(async () => false),
  isPopulated: vi.fn(async () => false),
  lexicon: vi.fn(async () => ({})),
  lookup: vi.fn(async () => []),
  formsOf: vi.fn(async () => ({})),
  dataMark: vi.fn(async () => null),
  eachEntry: vi.fn(async () => undefined),
  storedWords: vi.fn(async () => null),
  storeWords: vi.fn(async () => undefined),
  hasKanji: vi.fn(async () => false),
  buildKanji: vi.fn(async () => 13000),
  kanjiFor: vi.fn(async () => []),
}));
vi.mock('../jotoba', () => ({ jotobaLookup: vi.fn(async () => []) }));
vi.mock('../jisho', () => ({ jishoLookup: vi.fn(async () => []) }));

const IPADIC_FIELDS = [
  'surface', 'left_context_id', 'right_context_id', 'cost', 'part_of_speech',
  'part_of_speech_subcategory_1', 'part_of_speech_subcategory_2', 'part_of_speech_subcategory_3',
  'conjugation_form', 'conjugation_type', 'base_form', 'reading', 'pronunciation',
];

const UNIDIC_FIELDS = [
  'surface', 'left_context_id', 'right_context_id', 'cost', 'part_of_speech',
  'part_of_speech_subcategory_1', 'part_of_speech_subcategory_2', 'part_of_speech_subcategory_3',
  'conjugation_type', 'conjugation_form', 'reading', 'lexeme', 'orthographic_surface_form',
  'phonological_surface_form', 'orthographic_base_form', 'phonological_base_form', 'word_type',
];

const KO_FIELDS = [
  'surface', 'left_context_id', 'right_context_id', 'cost', 'part_of_speech_tag', 'meaning',
  'presence_absence', 'reading', 'type', 'first_part_of_speech', 'last_part_of_speech', 'expression',
];

const ZH_FIELDS = [
  'surface', 'left_context_id', 'right_context_id', 'cost', 'part_of_speech',
  'part_of_speech_subcategory_1', 'part_of_speech_subcategory_2', 'part_of_speech_subcategory_3',
  'pinyin', 'traditional', 'simplified', 'definition',
];

const files = (fields = IPADIC_FIELDS) => {
  const bytes = new Uint8Array();
  return {
    metadata: new TextEncoder().encode(JSON.stringify({ dictionary_schema: { fields } })),
    dictTrie: bytes, dictValsIdx: bytes, dictVals: bytes, dictWordsIdx: bytes,
    dictWords: bytes, matrixMtx: bytes, charDef: bytes, unk: bytes,
  };
};

/** A dictionary's files as OPFS hands them over: its own bytes each time they are read. */
const stored = (fields = IPADIC_FIELDS) => async () => files(fields);

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

type Listener = (msg: unknown, sender: unknown, respond: (r: unknown) => void) => boolean;

async function boot() {
  vi.resetModules();
  let listener: Listener | null = null;
  vi.stubGlobal('chrome', {
    runtime: {
      getURL: (p: string) => p,
      onMessage: { addListener: (fn: Listener) => { listener = fn; } },
    },
  });
  const opfs = await import('lindera-wasm/opfs');
  const store = await import('../store');
  const { jotobaLookup } = await import('../jotoba');
  vi.mocked(opfs.hasDictionary).mockResolvedValue(true);
  vi.mocked(opfs.loadDictionaryFiles).mockImplementation(stored());
  await import('../../offscreen');

  const send = (msg: Record<string, unknown>) =>
    new Promise<Record<string, unknown>>((resolve) => {
      listener!({ target: 'offscreen', ...msg }, {}, (r) => resolve(r as Record<string, unknown>));
    });
  return { send, opfs, store, jotobaLookup };
}

afterEach(() => {
  // Reset, not clear: an override like isPopulated → true must not leak into
  // the next test.
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

/** How often a dictionary was asked for by name: Japanese has two, and each is its own download. */
const calls = (mock: unknown, name: string): number =>
  vi.mocked(mock as (...args: unknown[]) => unknown).mock.calls.filter((c) => c.includes(name)).length;

describe('loading the analyser', () => {
  it('shares one load between callers, and answers neither until it is ready', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.hasDictionary).mockResolvedValue(false);
    const download = deferred();
    vi.mocked(opfs.downloadDictionary).mockReturnValue(download.promise);

    let answered = 0;
    const first = send({ type: 'load', dict: 'ipadic' }).then((r) => { answered++; return r; });
    const second = send({ type: 'load', dict: 'ipadic' }).then((r) => { answered++; return r; });
    await new Promise((r) => setTimeout(r, 10));
    expect(answered).toBe(0);   // the second caller used to be told ok here

    download.resolve();
    expect(await first).toMatchObject({ ok: true, ready: true });
    expect(await second).toMatchObject({ ok: true, ready: true });
    expect(calls(opfs.downloadDictionary, 'ipadic')).toBe(1);
  });

  it('does not reload a dictionary that is already loaded', async () => {
    const { send, opfs } = await boot();
    await send({ type: 'load', dict: 'ipadic' });
    await send({ type: 'load', dict: 'ipadic' });
    expect(calls(opfs.loadDictionaryFiles, 'ipadic')).toBe(1);
  });

  it('replaces a stored copy that will not load — once', async () => {
    const { send, opfs } = await boot();
    let broken = true;
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(async (name) => {
      if (name === 'ipadic' && broken) {
        broken = false;
        throw new Error('NotFoundError: dict.words');
      }
      return files();
    });
    expect(await send({ type: 'load', dict: 'ipadic' })).toMatchObject({ ok: true, ready: true });
    expect(opfs.removeDictionary).toHaveBeenCalledWith('ipadic');
    expect(calls(opfs.downloadDictionary, 'ipadic')).toBe(1);
  });

  it('reports a fresh download that will not load, without looping', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.hasDictionary).mockResolvedValue(false);
    vi.mocked(opfs.loadDictionaryFiles).mockRejectedValue(new Error('corrupt'));
    const r = await send({ type: 'load', dict: 'ipadic' });
    expect(r).toMatchObject({ ok: false, ready: false });
    expect(String(r.error)).toContain('corrupt');
    expect(opfs.downloadDictionary).toHaveBeenCalledTimes(1);
  });

  it('refuses a dictionary it has no reader for, by name', async () => {
    const { send } = await boot();
    const r = await send({ type: 'load', dict: 'sudachi' });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toContain('"sudachi"');
    expect(String(r.error)).toContain('ipadic, ko-dic, unidic, cc-cedict');
  });

  it('reads UniDic by its own columns, and refuses IPADIC files read as UniDic', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(stored(IPADIC_FIELDS));
    const r = await send({ type: 'load', dict: 'unidic' });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toContain('the unidic dictionary has');
  });

  it('reads ko-dic by its own columns: a tag, and what a fused unit is made of', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(stored(KO_FIELDS));
    expect(await send({ type: 'load', dict: 'ko-dic' })).toMatchObject({ ok: true, ready: true, dict: 'ko-dic' });
    expect(await send({ type: 'tokenize', text: '갔어요' })).toEqual({
      ok: true,
      complete: true,
      tokens: [
        { surface: '갔', tag: 'VV+EP', type: 'Inflect', expression: '가/VV/*+았/EP/*' },
        { surface: '어요', tag: 'EF', type: undefined, expression: undefined },
      ],
    });
  });

  it('refuses ko-dic files read as if they were IPADIC, rather than taking tags for dictionary forms', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(stored(IPADIC_FIELDS));
    vi.mocked(opfs.downloadDictionary).mockResolvedValue(undefined);
    const r = await send({ type: 'load', dict: 'ko-dic' });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toContain('part_of_speech_tag');
  });

  it('reads one language at a time, and gives the last analyser’s memory back', async () => {
    const { send, opfs } = await boot();
    lindera.free = vi.fn();
    await send({ type: 'load', dict: 'ipadic' });
    expect(lindera.free).not.toHaveBeenCalled();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(stored(KO_FIELDS));
    expect(await send({ type: 'load', dict: 'ko-dic' })).toMatchObject({ ok: true, dict: 'ko-dic' });
    expect(lindera.free).toHaveBeenCalledOnce();
    // Rows are now read as ko-dic's.
    expect(await send({ type: 'tokenize', text: '갔어요' })).toMatchObject({ tokens: [{ tag: 'VV+EP' }, { tag: 'EF' }] });
  });

  it('refuses IPADIC files whose columns have moved', async () => {
    const { send, opfs } = await boot();
    const moved = [...IPADIC_FIELDS];
    moved[10] = 'reading';
    moved[11] = 'base_form';
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(stored(moved));
    vi.mocked(opfs.downloadDictionary).mockResolvedValue(undefined);
    const r = await send({ type: 'load', dict: 'ipadic' });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toContain('base_form');
  });

  it('says the analyser is loading, rather than returning nothing', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.hasDictionary).mockResolvedValue(false);
    vi.mocked(opfs.downloadDictionary).mockReturnValue(new Promise(() => {}));
    void send({ type: 'load', dict: 'ipadic' });
    await new Promise((r) => setTimeout(r, 0));
    expect(await send({ type: 'tokenize', text: '猫' })).toMatchObject({ ok: false, error: 'the analyser is still loading' });
  });
});

describe('a second opinion on Japanese', () => {
  /** Each dictionary's own files: UniDic's are not IPADIC's. */
  const eachItsOwn = async (name: string) => files(name === 'unidic' ? UNIDIC_FIELDS : IPADIC_FIELDS);
  const iyasu = { surface: '癒やす', pos: '動詞', pos1: '自立', lemma: '癒やす', reading: 'イヤス', conjForm: '基本形' };

  it('loads UniDic with IPADIC where it is stored, and reads a line with both', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(eachItsOwn);
    expect(await send({ type: 'load', dict: 'ipadic' })).toMatchObject({ ok: true, ready: true, dict: 'ipadic' });
    expect(calls(opfs.loadDictionaryFiles, 'unidic')).toBe(1);
    expect(opfs.downloadDictionary).not.toHaveBeenCalled();
    // The word IPADIC has in two pieces is UniDic's.
    expect(await send({ type: 'tokenize', text: '癒やす' })).toMatchObject({ ok: true, tokens: [iyasu] });
    // Nothing the page has was read without it.
    expect(await send({ type: 'second' })).toEqual({ ok: true, reread: false });
  });

  it('does not keep the page waiting for a download, and says when lines should be read again', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(eachItsOwn);
    vi.mocked(opfs.hasDictionary).mockImplementation(async (name) => name !== 'unidic');
    const download = deferred();
    vi.mocked(opfs.downloadDictionary).mockReturnValue(download.promise);

    expect(await send({ type: 'load', dict: 'ipadic' })).toMatchObject({ ok: true, ready: true });
    expect(await send({ type: 'tokenize', text: '癒やす' })).toMatchObject({ tokens: [{ surface: '癒' }, { surface: 'やす' }] });
    let answer: Record<string, unknown> | null = null;
    const asked = send({ type: 'second' }).then((r) => { answer = r; });
    await new Promise((r) => setTimeout(r, 10));
    expect(answer).toBeNull();

    download.resolve();
    await asked;
    expect(answer).toEqual({ ok: true, reread: true });
    expect(calls(opfs.downloadDictionary, 'unidic')).toBe(1);
    expect(await send({ type: 'tokenize', text: '癒やす' })).toMatchObject({ tokens: [iyasu] });
  });

  it('reads with IPADIC alone where UniDic will not load', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(async (name) => {
      if (name === 'unidic') throw new Error('NotFoundError: matrix.mtx');
      return files();
    });
    expect(await send({ type: 'load', dict: 'ipadic' })).toMatchObject({ ok: true, ready: true });
    expect(await send({ type: 'second' })).toEqual({ ok: false, reread: false });
    expect(await send({ type: 'tokenize', text: '癒やす' })).toMatchObject({ ok: true, tokens: [{ surface: '癒' }, { surface: 'やす' }] });
    // Replaced once, as the first is, and not again.
    expect(calls(opfs.downloadDictionary, 'unidic')).toBe(1);
  });

  it('goes with the analyser it was a second opinion on', async () => {
    const { send, opfs } = await boot();
    lindera.free = vi.fn();
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(eachItsOwn);
    await send({ type: 'load', dict: 'ipadic' });
    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(stored(KO_FIELDS));
    expect(await send({ type: 'load', dict: 'ko-dic' })).toMatchObject({ ok: true, dict: 'ko-dic' });
    expect(lindera.free).toHaveBeenCalledTimes(2);
    // Korean has none.
    expect(await send({ type: 'second' })).toEqual({ ok: false, reread: false });
  });
});

describe('tokenizing', () => {
  it('asks the dictionary about numbers once it is there, and says when it could not', async () => {
    const { send, store } = await boot();
    await send({ type: 'load', dict: 'ipadic' });

    const before = await send({ type: 'tokenize', text: '一回' });
    expect(before).toMatchObject({ ok: true, complete: false });
    expect(store.lexicon).not.toHaveBeenCalled();

    vi.mocked(store.isPopulated).mockResolvedValue(true);
    vi.mocked(store.lexicon).mockResolvedValue({ 一回: [{ word: '一回', reading: 'いっかい', pos: ['n'] }] });
    await send({ type: 'dict-load', edition: 'eng' });
    const after = await send({ type: 'tokenize', text: '一回' });
    expect(after).toMatchObject({ ok: true, complete: true, lexicon: { 一回: [{ reading: 'いっかい' }] } });
    expect(store.lexicon).toHaveBeenCalledWith(['一回']);
  });

  it('does not consult the dictionary when nothing needs it', async () => {
    const { send, store } = await boot();
    await send({ type: 'load', dict: 'ipadic' });
    expect(await send({ type: 'tokenize', text: '猫' })).toMatchObject({ ok: true, complete: true });
    expect(store.lexicon).not.toHaveBeenCalled();
  });

  it('reads a word by the dictionary\'s first reading where IPADIC has a later one: 日本 is にほん', async () => {
    const { send, store } = await boot();
    await send({ type: 'load', dict: 'ipadic' });
    // Before the dictionary is there, as IPADIC reads it.
    expect(await send({ type: 'tokenize', text: '日本' })).toMatchObject({ tokens: [{ surface: '日本', reading: 'ニッポン' }] });

    const japan = {
      id: '1', word: '日本', reading: 'にほん', common: true, senses: [{ pos: ['n'], glosses: ['Japan'] }],
      forms: [{ text: '日本', kana: false, common: true }, { text: 'にほん', kana: true, common: true }, { text: 'にっぽん', kana: true, common: true }],
    };
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    vi.mocked(store.dataMark).mockResolvedValue('jmdict@test');
    vi.mocked(store.eachEntry).mockImplementation(async (fn) => fn(japan));
    vi.mocked(store.lexicon).mockResolvedValue({ 日本: [{ word: '日本', reading: 'にほん', pos: ['n'] }] });
    await send({ type: 'dict-load', edition: 'eng' });
    await send({ type: 'load', dict: 'ipadic' });

    // The list is made once and kept with the words added to the analyser.
    expect(store.storeWords).toHaveBeenCalledWith(expect.stringContaining('jmdict@test'), { csv: expect.any(String), readings: '日本\tニッポン\tニホン\tname' });
    expect(await send({ type: 'tokenize', text: '日本' })).toMatchObject({ tokens: [{ surface: '日本', reading: 'ニホン' }] });
  });

  it('loads that list where it is kept, and makes it again where the dictionary says the reading is another word', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    vi.mocked(store.dataMark).mockResolvedValue('jmdict@test');
    vi.mocked(store.storedWords).mockResolvedValue({ csv: '', readings: '日本\tニッポン\tニホン\tname' });
    await send({ type: 'dict-load', edition: 'eng' });
    await send({ type: 'load', dict: 'ipadic' });
    expect(store.eachEntry).not.toHaveBeenCalled();
    expect(await send({ type: 'tokenize', text: '日本' })).toMatchObject({ tokens: [{ reading: 'ニホン' }] });
  });
});

describe('dictionary lookups', () => {
  it('go remote only while the local dictionary is not ready', async () => {
    const { send, store, jotobaLookup } = await boot();
    const building = deferred<number>();
    vi.mocked(store.build).mockReturnValue(building.promise);
    const loaded = send({ type: 'dict-load', edition: 'eng' });

    expect(await send({ type: 'dict-lookup', key: '猫' })).toMatchObject({ ok: true, source: 'remote' });
    expect(jotobaLookup).toHaveBeenCalledTimes(1);

    building.resolve(200000);
    await loaded;
    expect(await send({ type: 'dict-lookup', key: 'ｚｚｚ' })).toEqual({ ok: true, entries: [], source: 'local' });
    // A local miss is an answer: nothing goes over the network for it.
    expect(jotobaLookup).toHaveBeenCalledTimes(1);
  });

  it('pass the analyser’s hints to the ranking', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    await send({ type: 'dict-load', edition: 'eng' });
    await send({ type: 'dict-lookup', key: '私', reading: 'ワタシ', pos: '名詞,代名詞' });
    expect(store.lookup).toHaveBeenCalledWith('私', { reading: 'ワタシ', pos: '名詞,代名詞' }, store.JMDICT);
  });

  it('pass the word\'s name in kanji only with UniDic there to name each entry\'s spellings', async () => {
    const { send, store, opfs } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    await send({ type: 'dict-load', edition: 'eng' });
    // IPADIC alone: the name is not passed on, and the dictionary's own order stands.
    await send({ type: 'dict-lookup', key: 'そば', reading: 'ソバ', pos: '名詞,一般', spelling: '側' });
    expect(store.lookup).toHaveBeenLastCalledWith('そば', { reading: 'ソバ', pos: '名詞,一般' }, store.JMDICT);

    vi.mocked(opfs.loadDictionaryFiles).mockImplementation(async (name: string) => files(name === 'unidic' ? UNIDIC_FIELDS : IPADIC_FIELDS));
    await send({ type: 'load', dict: 'ipadic' });
    await send({ type: 'second' });
    await send({ type: 'dict-lookup', key: 'そば', reading: 'ソバ', pos: '名詞,一般', spelling: '側' });
    const hint = vi.mocked(store.lookup).mock.lastCall?.[1] as { spelling?: string; names?: (form: string) => string | undefined };
    expect(hint.spelling).toBe('側');
    // UniDic's name for a spelling: its own word for it, which may be another spelling's too.
    expect(hint.names?.('癒やす')).toBe('癒やす');
    expect(hint.names?.('奢る')).toBe('驕る');
    // No one word of UniDic's: no name.
    expect(hint.names?.('蕎麦屋')).toBeUndefined();
  });

  it('go remote after the local dictionary failed', async () => {
    const { send, store, jotobaLookup } = await boot();
    vi.mocked(store.build).mockRejectedValue(new Error('HTTP 404'));
    expect(await send({ type: 'dict-load', edition: 'eng' })).toMatchObject({ ok: false, error: 'Error: HTTP 404' });
    await send({ type: 'dict-lookup', key: '猫' });
    expect(jotobaLookup).toHaveBeenCalledTimes(1);
  });

  it('keep answering from an older release while the new one downloads', async () => {
    const { send, store, jotobaLookup } = await boot();
    vi.mocked(store.hasStale).mockResolvedValue(true);
    vi.mocked(store.build).mockReturnValue(new Promise(() => {}));
    void send({ type: 'dict-load', edition: 'eng' });
    await new Promise((r) => setTimeout(r, 0));
    expect(await send({ type: 'dict-lookup', key: '猫' })).toMatchObject({ source: 'local' });
    expect(jotobaLookup).not.toHaveBeenCalled();
  });

  it('share one build between callers', async () => {
    const { send, store } = await boot();
    vi.mocked(store.build).mockResolvedValue(200000);
    await Promise.all([send({ type: 'dict-load', edition: 'eng' }), send({ type: 'dict-load', edition: 'eng' })]);
    expect(store.build).toHaveBeenCalledTimes(1);
  });
});

describe('Chinese', () => {
  const school = { id: '1', word: '学校', reading: 'xué xiào', common: false, senses: [{ pos: [], glosses: ['school'] }] };
  const readings: Record<string, string> = { 去: 'qù', 学校: 'xué xiào', 了: 'le' };

  async function chinese() {
    const booted = await boot();
    vi.mocked(booted.opfs.loadDictionaryFiles).mockImplementation(stored(ZH_FIELDS));
    await booted.send({ type: 'load', dict: 'cc-cedict' });
    vi.mocked(booted.store.lookup).mockImplementation(async (key: string) =>
      (readings[key] ? [{ ...school, word: key, reading: readings[key] }] : []));
    return booted;
  }

  it('takes where the words are from the analyser, and never its one reading for each', async () => {
    const { send, store } = await chinese();
    const before = await send({ type: 'tokenize', text: '去学校了' });
    // No dictionary yet: the words, no readings, and a line worth asking about again.
    expect(before).toEqual({ ok: true, complete: false, tokens: [{ surface: '去' }, { surface: '学校' }, { surface: '了' }] });
    expect(store.lookup).not.toHaveBeenCalled();
  });

  it('gives each word the reading the dictionary puts first, once the dictionary is in', async () => {
    const { send, store } = await chinese();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    expect(await send({ type: 'dict-load', source: 'cedict', edition: 'en' })).toMatchObject({ ok: true, ready: true, source: 'cedict' });
    expect(await send({ type: 'tokenize', text: '去学校了' })).toEqual({
      ok: true,
      complete: true,
      tokens: [{ surface: '去', reading: 'qù' }, { surface: '学校', reading: 'xué xiào' }, { surface: '了', reading: 'le' }],
    });
    const { SOURCES } = await import('../sources');
    expect(store.lookup).toHaveBeenCalledWith('学校', undefined, SOURCES.cedict);
    // The same words on the next line cost nothing more.
    await send({ type: 'tokenize', text: '去学校了' });
    expect(store.lookup).toHaveBeenCalledTimes(3);
  });

  it('does not take readings from JMdict while the Chinese dictionary is still coming', async () => {
    const { send, store } = await chinese();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    await send({ type: 'dict-load', edition: 'eng' });
    expect(await send({ type: 'tokenize', text: '去学校了' })).toMatchObject({ complete: false, tokens: [{ surface: '去' }, { surface: '学校' }, { surface: '了' }] });
    expect(store.lookup).not.toHaveBeenCalled();
  });

  it('describes a word’s characters from their own entries', async () => {
    const { send, store } = await chinese();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    await send({ type: 'dict-load', source: 'cedict', edition: 'en' });
    const r = await send({ type: 'dict-kanji', chars: ['学', '校'] });
    // 学 has no entry in this small dictionary; 校 is not asked of KANJIDIC2.
    expect(r).toEqual({ ok: true, characters: [] });
    vi.mocked(store.lookup).mockResolvedValue([
      { ...school, word: '学', reading: 'xué', senses: [{ pos: [], glosses: ['to learn'] }, { pos: [], glosses: ['to study'] }] },
    ]);
    expect(await send({ type: 'dict-kanji', chars: ['学'] })).toEqual({
      ok: true, characters: [{ char: '学', meanings: ['to learn', 'to study'], on: ['xué'], kun: [] }],
    });
    expect(store.kanjiFor).not.toHaveBeenCalled();
    expect(store.buildKanji).not.toHaveBeenCalled();
  });
});

describe('a dictionary in your own language', () => {
  const casa = { id: '1', word: 'casa', common: false, senses: [{ pos: ['n'], glosses: ['Maison.'] }] };

  it('is asked first, its meanings marked with their language, and the language’s own after', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { SOURCES } = await import('../sources');
    await send({ type: 'dict-load', source: 'wty-es-en', edition: 'en', own: { source: 'wty-es-fr', edition: 'fr' } });
    await new Promise((r) => setTimeout(r, 0));   // loaded after the language's own
    vi.mocked(store.lookup).mockImplementation(async (key: string, _hint?: unknown, source?: unknown) =>
      (source === SOURCES['wty-es-fr'] && key === 'casa' ? [casa] : []));
    expect(await send({ type: 'dict-lookup', key: 'casa' })).toEqual({ ok: true, entries: [{ ...casa, lang: 'fr' }], source: 'local' });
    // A word French Wiktionary lacks: the English edition answers.
    expect(await send({ type: 'dict-lookup', key: 'chévere' })).toMatchObject({ ok: true, entries: [], source: 'local' });
    expect(store.lookup).toHaveBeenLastCalledWith('chévere', { reading: undefined, pos: undefined }, SOURCES['wty-es-en']);
  });

  it('while it downloads, answers from the other, which the page is told not to keep', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockImplementation(async (_e: string, source?: { id: string }) => source?.id === 'wty-es-en');
    vi.mocked(store.build).mockReturnValue(new Promise(() => {}));   // French never finishes
    await send({ type: 'dict-load', source: 'wty-es-en', edition: 'en', own: { source: 'wty-es-fr', edition: 'fr' } });
    await new Promise((r) => setTimeout(r, 0));
    expect(await send({ type: 'dict-lookup', key: 'casa' })).toMatchObject({ ok: true, source: 'partial' });
  });

  it('is let go when the pair has none', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { SOURCES } = await import('../sources');
    await send({ type: 'dict-load', source: 'wty-es-en', edition: 'en', own: { source: 'wty-es-fr', edition: 'fr' } });
    await new Promise((r) => setTimeout(r, 0));
    await send({ type: 'dict-load', source: 'wty-es-en', edition: 'en', own: null });
    await new Promise((r) => setTimeout(r, 0));
    await send({ type: 'dict-lookup', key: 'casa' });
    expect(store.lookup).toHaveBeenCalledTimes(1);
    expect(store.lookup).toHaveBeenCalledWith('casa', { reading: undefined, pos: undefined }, SOURCES['wty-es-en']);
  });
});

describe('a dictionary for each language', () => {
  it('loads the one asked for, and lookups go to it', async () => {
    const { send, store } = await boot();
    vi.mocked(store.build).mockResolvedValue(250000);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await send({ type: 'dict-load', source: 'wty-es-en', edition: 'en' })).toMatchObject({ ok: true, ready: true, source: 'wty-es-en', edition: 'en' });
    const { SOURCES } = await import('../sources');
    expect(vi.mocked(store.build).mock.calls[0]?.[0]).toBe('en');
    expect(vi.mocked(store.build).mock.calls[0]?.[2]).toBe(SOURCES['wty-es-en']);
    await send({ type: 'dict-lookup', key: 'hablar' });
    expect(store.lookup).toHaveBeenCalledWith('hablar', { reading: undefined, pos: undefined }, SOURCES['wty-es-en']);
  });

  it('never answers a Spanish word from a Japanese dictionary, local or remote', async () => {
    const { send, store, jotobaLookup } = await boot();
    vi.mocked(store.isPopulated).mockImplementation(async (_e: string, source?: { id: string }) => source?.id === 'jmdict');
    await send({ type: 'dict-load', edition: 'eng' });
    vi.mocked(store.build).mockReturnValue(new Promise(() => {}));
    void send({ type: 'dict-load', source: 'wty-es-en', edition: 'en' });
    await new Promise((r) => setTimeout(r, 0));
    // Still downloading: say so, rather than looking hablar up in JMdict or on Jotoba.
    expect(await send({ type: 'dict-lookup', key: 'hablar' })).toEqual({ ok: false, error: 'the dictionary is still loading', reason: 'dictionaryLoading' });
    expect(await send({ type: 'dict-status' })).toMatchObject({ ready: false, source: 'wty-es-en' });
    expect(store.lookup).not.toHaveBeenCalled();
    expect(jotobaLookup).not.toHaveBeenCalled();
  });

  it('goes back to a language’s dictionary without building it again', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    await send({ type: 'dict-load', source: 'wty-ko-en', edition: 'en' });
    await send({ type: 'dict-load', edition: 'eng' });
    expect(await send({ type: 'dict-load', source: 'wty-ko-en', edition: 'en' })).toMatchObject({ ok: true, ready: true, source: 'wty-ko-en' });
    expect(store.build).not.toHaveBeenCalled();
  });

  it('refuses a dictionary it does not know, by name', async () => {
    const { send } = await boot();
    expect(await send({ type: 'dict-load', source: 'oxford', edition: 'en' })).toMatchObject({ ok: false, error: 'no dictionary called "oxford"' });
  });

  it('answers what forms are forms of from the dictionary in use, once it is whole', async () => {
    const { send, store } = await boot();
    const forms = { hablamos: { word: false, senses: 0, kind: [], of: [{ lemma: 'hablar', tags: ['first-person plural present indicative'], senses: 4 }] } };
    vi.mocked(store.formsOf).mockResolvedValue(forms);
    expect(await send({ type: 'dict-forms', forms: ['hablamos'] })).toMatchObject({ ok: false, error: 'the dictionary is still loading' });

    vi.mocked(store.isPopulated).mockResolvedValue(true);
    await send({ type: 'dict-load', source: 'wty-es-en', edition: 'en' });
    expect(await send({ type: 'dict-forms', forms: ['hablamos'] })).toEqual({ ok: true, forms });
    const { SOURCES } = await import('../sources');
    expect(store.formsOf).toHaveBeenCalledWith(['hablamos'], SOURCES['wty-es-en']);
  });

  it('does not ask an older copy of the dictionary for forms: half a table reads as no inflection at all', async () => {
    const { send, store } = await boot();
    vi.mocked(store.hasStale).mockResolvedValue(true);
    vi.mocked(store.build).mockReturnValue(new Promise(() => {}));
    void send({ type: 'dict-load', source: 'wty-es-en', edition: 'en' });
    await new Promise((r) => setTimeout(r, 0));
    expect(await send({ type: 'dict-forms', forms: ['hablamos'] })).toMatchObject({ ok: false });
    expect(store.formsOf).not.toHaveBeenCalled();
  });
});

describe('kanji', () => {
  it('loads KANJIDIC2 once JMdict is ready, and answers in the learner\'s language', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    vi.mocked(store.hasKanji).mockResolvedValue(false);
    vi.mocked(store.buildKanji).mockResolvedValue(13000);
    vi.mocked(store.kanjiFor).mockResolvedValue([
      { char: '勉', meanings: { en: ['exertion'], fr: ['exercice'] }, on: ['ベン'], kun: ['つと.める'], strokes: 10 },
    ]);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(await send({ type: 'dict-kanji', chars: ['勉'] })).toMatchObject({ ok: false });
    await send({ type: 'dict-load', edition: 'eng' });
    await vi.waitFor(() => expect(store.buildKanji).toHaveBeenCalledOnce());
    await new Promise((r) => setTimeout(r, 0));
    const r = await send({ type: 'dict-kanji', chars: ['勉'], native: 'fr' });
    expect(r).toEqual({ ok: true, characters: [{ char: '勉', meanings: ['exercice'], on: ['ベン'], kun: ['つと.める'], strokes: 10 }] });
  });

  it('costs only the kanji when KANJIDIC2 will not download', async () => {
    const { send, store } = await boot();
    vi.mocked(store.isPopulated).mockResolvedValue(true);
    vi.mocked(store.hasKanji).mockResolvedValue(false);
    vi.mocked(store.buildKanji).mockRejectedValue(new Error('HTTP 404'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await send({ type: 'dict-load', edition: 'eng' })).toMatchObject({ ok: true, ready: true });
    await vi.waitFor(() => expect(store.buildKanji).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(await send({ type: 'dict-kanji', chars: ['勉'] })).toMatchObject({ ok: false, error: expect.stringContaining('404') });
  });
});
