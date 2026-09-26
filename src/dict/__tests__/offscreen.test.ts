import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The offscreen document's message handling: one shared analyser load, a
 * stored dictionary that recovers from a partial write, IPADIC-only column
 * reading, and dictionary lookups that stay local once they can.
 *
 * lindera, OPFS, IndexedDB and the network are all stood in for; what is
 * under test is src/offscreen.ts deciding what to do with them.
 */

vi.mock('lindera-wasm', () => ({
  default: vi.fn(async () => undefined),
  loadDictionaryFromBytes: vi.fn(() => ({})),
  TokenizerBuilder: class {
    setDictionaryInstance() { return this; }
    setMode() { return this; }
    build() {
      return {
        // 一 + 回: a number and its counter, which merging asks the dictionary about.
        tokenize: (text: string) =>
          text === '一回'
            ? [
                { surface: '一', details: ['名詞', '数', '*', '*', '*', '*', '一', 'イチ', 'イチ'] },
                { surface: '回', details: ['名詞', '接尾', '助数詞', '*', '*', '*', '回', 'カイ', 'カイ'] },
              ]
            : [{ surface: text, details: ['名詞', '一般', '*', '*', '*', '*', text, 'ヨミ', 'ヨミ'] }],
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
  build: vi.fn(),
  hasStale: vi.fn(async () => false),
  isPopulated: vi.fn(async () => false),
  lexicon: vi.fn(async () => ({})),
  lookup: vi.fn(async () => []),
}));
vi.mock('../jotoba', () => ({ jotobaLookup: vi.fn(async () => []) }));
vi.mock('../jisho', () => ({ jishoLookup: vi.fn(async () => []) }));

const IPADIC_FIELDS = [
  'surface', 'left_context_id', 'right_context_id', 'cost', 'part_of_speech',
  'part_of_speech_subcategory_1', 'part_of_speech_subcategory_2', 'part_of_speech_subcategory_3',
  'conjugation_form', 'conjugation_type', 'base_form', 'reading', 'pronunciation',
];

const files = (fields = IPADIC_FIELDS) => {
  const bytes = new Uint8Array();
  return {
    metadata: new TextEncoder().encode(JSON.stringify({ dictionary_schema: { fields } })),
    dictTrie: bytes, dictValsIdx: bytes, dictVals: bytes, dictWordsIdx: bytes,
    dictWords: bytes, matrixMtx: bytes, charDef: bytes, unk: bytes,
  };
};

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
  vi.mocked(opfs.loadDictionaryFiles).mockResolvedValue(files());
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
    expect(opfs.downloadDictionary).toHaveBeenCalledTimes(1);
  });

  it('does not reload a dictionary that is already loaded', async () => {
    const { send, opfs } = await boot();
    await send({ type: 'load', dict: 'ipadic' });
    await send({ type: 'load', dict: 'ipadic' });
    expect(opfs.loadDictionaryFiles).toHaveBeenCalledTimes(1);
  });

  it('replaces a stored copy that will not load — once', async () => {
    const { send, opfs } = await boot();
    vi.mocked(opfs.loadDictionaryFiles)
      .mockRejectedValueOnce(new Error('NotFoundError: dict.words'))
      .mockResolvedValue(files());
    expect(await send({ type: 'load', dict: 'ipadic' })).toMatchObject({ ok: true, ready: true });
    expect(opfs.removeDictionary).toHaveBeenCalledWith('ipadic');
    expect(opfs.downloadDictionary).toHaveBeenCalledTimes(1);
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

  it('refuses a dictionary whose columns it cannot read', async () => {
    const { send } = await boot();
    const r = await send({ type: 'load', dict: 'ko-dic' });
    expect(r.ok).toBe(false);
    expect(String(r.error)).toContain('ipadic');
  });

  it('refuses IPADIC files whose columns have moved', async () => {
    const { send, opfs } = await boot();
    const moved = [...IPADIC_FIELDS];
    moved[10] = 'reading';
    moved[11] = 'base_form';
    vi.mocked(opfs.loadDictionaryFiles).mockResolvedValue(files(moved));
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
    expect(store.lookup).toHaveBeenCalledWith('私', { reading: 'ワタシ', pos: '名詞,代名詞' });
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
