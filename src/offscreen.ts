import init, { TokenizerBuilder, loadDictionaryFromBytes, type Tokenizer } from 'lindera-wasm';
import { downloadDictionary, hasDictionary, loadDictionaryFiles, removeDictionary } from 'lindera-wasm/opfs';
import type { RankHint } from './dict/jmdict';
import { jishoLookup } from './dict/jisho';
import { jotobaLookup } from './dict/jotoba';
import { remoteLookup } from './dict/remote';
import { build as buildDict, hasStale, isPopulated, lexicon, lookup } from './dict/store';
import { LINDERA_DICTS as DICTS } from './morphology/dictionaries';
import { lexiconQueries, type Morpheme } from './morphology/merge';

/**
 * The morphological analyser lives here and nowhere else.
 *
 * It cannot run in the service worker (killed aggressively, no OPFS) nor in a
 * content script (OPFS belongs to the host page's origin, and WASM is subject
 * to the page's CSP). An offscreen document is a real extension page: our
 * origin, our CSP, persistent, with OPFS.
 */

/** Where a dictionary keeps what `analyse` reads, as indices into `details`. */
interface Layout {
  pos: number;
  pos1: number;
  conjForm: number;
  base: number;
  reading: number;
}

/**
 * IPADIC only, deliberately.
 *
 * ko-dic and cc-cedict lay their columns out differently — cc-cedict's
 * column 7 is an English definition, ko-dic's column 6 a part-of-speech tag —
 * and reading them as IPADIC put definitions up as ruby and tags down as
 * lemmas. A dictionary joins this table once its columns are mapped, and until
 * then is refused by name rather than misread.
 */
const LAYOUTS: Record<string, Layout> = {
  ipadic: { pos: 0, pos1: 1, conjForm: 5, base: 6, reading: 7 },
};

/** Lindera's names for the columns a layout relies on; details[i] is field i + 4. */
const EXPECTED: Array<[keyof Layout, string]> = [
  ['pos', 'part_of_speech'],
  ['base', 'base_form'],
  ['reading', 'reading'],
];

interface State {
  ready: boolean;
  loading: boolean;
  dict: string | null;
  phase: string;
  percent: number;
  error: string | null;
}

const state: State = { ready: false, loading: false, dict: null, phase: 'idle', percent: 0, error: null };

let tokenizer: Tokenizer | null = null;
let layout: Layout | null = null;
let wasmReady: Promise<void> | null = null;
let loading: Promise<void> | null = null;

function initWasm(): Promise<void> {
  // The binary sits beside us in the extension, not on a CDN.
  wasmReady ??= init({ module_or_path: chrome.runtime.getURL('lindera_wasm_bg.wasm') }).then(
    () => undefined,
    (e: unknown) => {
      wasmReady = null;   // let the next attempt try again rather than fail forever
      throw e;
    },
  );
  return wasmReady;
}

async function download(name: string, url: string): Promise<void> {
  // ~10 MB, once. Kept in OPFS so a reinstall is the only thing that
  // triggers it again.
  await downloadDictionary(url, name, {
    onProgress: (p) => {
      state.phase = p.phase;
      state.percent = p.total ? Math.round(((p.loaded ?? 0) / p.total) * 100) : 0;
    },
  });
}

/** Refuse a dictionary whose columns are not where the layout says. */
function checkLayout(name: string, metadata: Uint8Array, l: Layout): void {
  let fields: unknown;
  try {
    fields = (JSON.parse(new TextDecoder().decode(metadata)) as { dictionary_schema?: { fields?: unknown } })
      .dictionary_schema?.fields;
  } catch {
    return;   // no readable schema to check against; the layout stands
  }
  if (!Array.isArray(fields)) return;
  for (const [column, want] of EXPECTED) {
    if (fields[l[column] + 4] !== want) {
      throw new Error(
        `the ${name} dictionary has "${String(fields[l[column] + 4])}" where the analyser expects ${want}`,
      );
    }
  }
}

async function tokenizerFor(name: string, l: Layout): Promise<Tokenizer> {
  state.phase = 'loading';
  const f = await loadDictionaryFiles(name);
  checkLayout(name, f.metadata, l);
  const dict = loadDictionaryFromBytes(
    f.metadata, f.dictTrie, f.dictValsIdx, f.dictVals,
    f.dictWordsIdx, f.dictWords, f.matrixMtx, f.charDef, f.unk,
  );
  const builder = new TokenizerBuilder();
  builder.setDictionaryInstance(dict);
  builder.setMode('normal');
  return builder.build();
}

async function loadNow(name: string): Promise<void> {
  state.loading = true;
  state.ready = false;
  state.error = null;
  state.dict = name;
  state.phase = 'loading';
  state.percent = 0;

  try {
    const url = DICTS[name];
    const l = LAYOUTS[name];
    if (!url || !l) {
      throw new Error(`no analyser for dictionary "${name}" — only ${Object.keys(LAYOUTS).join(', ')} can be read`);
    }

    await initWasm();

    let fresh = false;
    if (!(await hasDictionary(name))) {
      await download(name, url);
      fresh = true;
    }

    let t: Tokenizer;
    try {
      t = await tokenizerFor(name, l);
    } catch (e) {
      if (fresh) throw e;
      /*
       * A stored copy that will not load. The usual cause is a download cut
       * off while its files were being written: the folder exists, so
       * hasDictionary() says yes on every start, and nothing ever loaded
       * again. Replace it, once.
       */
      console.warn('[libregaku] stored dictionary would not load; downloading it again:', e);
      await removeDictionary(name).catch(() => undefined);
      await download(name, url);
      t = await tokenizerFor(name, l);
    }

    tokenizer = t;
    layout = l;
    state.ready = true;
    state.phase = 'ready';
    state.percent = 100;
    console.log(`[libregaku] lindera ready with ${name}`);
  } catch (e) {
    state.error = String(e);
    state.phase = 'error';
    console.warn('[libregaku] lindera failed to load:', e);
  } finally {
    state.loading = false;
  }
}

/**
 * Load a dictionary, once.
 *
 * Every caller shares the load in flight. A second tab used to be told
 * "ok" the moment it asked, because a load was merely under way; it went on
 * to tokenize, was refused, and rendered nothing.
 */
function load(name: string): Promise<void> {
  if (state.ready && state.dict === name) return Promise.resolve();
  if (loading) return state.dict === name ? loading : loading.then(() => load(name));
  loading = loadNow(name).finally(() => {
    loading = null;
  });
  return loading;
}

interface RawToken {
  surface: string;
  details?: string[];
}

function analyse(text: string): Morpheme[] {
  const l = layout;
  if (!tokenizer || !l) return [];
  return (tokenizer.tokenize(text) as RawToken[]).map((t) => {
    const d = t.details ?? [];
    const col = (i: number): string | undefined => {
      const v = d[i];
      return v && v !== '*' ? v : undefined;
    };
    // Unknown words carry no lemma or reading — "*", or a short row.
    const usable = d.length > l.reading;
    return {
      surface: t.surface,
      lemma: usable ? col(l.base) : undefined,
      reading: usable ? col(l.reading) : undefined,
      pos: col(l.pos),
      pos1: col(l.pos1),
      conjForm: col(l.conjForm),
    };
  });
}

/* ── JMdict ─────────────────────────────────────────────────────── */

const dict = {
  ready: false, loading: false, phase: 'idle', percent: 0,
  error: null as string | null, edition: 'eng',
  /** Serving an older release while its replacement downloads. */
  stale: false,
};

let dictLoading: Promise<void> | null = null;

async function buildNow(edition: string): Promise<void> {
  dict.loading = true;
  dict.error = null;
  dict.edition = edition;
  try {
    if (await isPopulated(edition)) {
      dict.ready = true;
      dict.stale = false;
      dict.phase = 'ready';
      dict.percent = 100;
      return;
    }
    // Complete data from an older release of this edition keeps answering
    // until the new one starts replacing it — better than a remote API.
    dict.stale = await hasStale(edition);
    dict.ready = dict.stale;
    const n = await buildDict(edition, (phase, percent) => {
      dict.phase = phase;
      dict.percent = percent;
      if (phase === 'indexing') dict.ready = false;   // the old data is going
    });
    dict.ready = true;
    dict.stale = false;
    dict.phase = 'ready';
    dict.percent = 100;
    console.log(`[libregaku] JMdict ready — ${n} entries`);
  } catch (e) {
    dict.error = String(e);
    dict.phase = 'error';
    console.warn('[libregaku] JMdict failed to load:', e);
  } finally {
    dict.loading = false;
  }
}

/**
 * A different edition is a different dictionary, so a language change has to
 * rebuild rather than be treated as already loaded. Callers share the build
 * in flight and are answered when it is done.
 */
function ensureDict(edition: string): Promise<void> {
  if (dict.ready && !dict.stale && dict.edition === edition) return Promise.resolve();
  if (dictLoading) return dict.edition === edition ? dictLoading : dictLoading.then(() => ensureDict(edition));
  dictLoading = buildNow(edition).finally(() => {
    dictLoading = null;
  });
  return dictLoading;
}

const REMOTE_TIMEOUT_MS = 8000;

const remote = remoteLookup({
  jotoba: (key, edition) => jotobaLookup(key, { edition, timeoutMs: REMOTE_TIMEOUT_MS }),
  jisho: (key) => jishoLookup(key, { timeoutMs: REMOTE_TIMEOUT_MS }),
});

/**
 * Local once the dictionary is ready, remote only until then or if it failed.
 *
 * A local miss is an answer. Sending it on to Jotoba meant every particle,
 * name and number hovered went over the network, offline users got errors
 * for words the local copy simply did not list, and a fuzzy remote match
 * could stand in for the local entry of the next key.
 */
async function answerLookup(key: string, hint: RankHint): Promise<unknown> {
  if (dict.ready) {
    try {
      return { ok: true, entries: await lookup(key, hint), source: 'local' };
    } catch (e) {
      console.warn('[libregaku] local lookup failed; asking remotely:', e);
    }
  }
  return remote(key, dict.edition);
}

interface Message {
  target?: string;
  type?: string;
  text?: string;
  dict?: string;
  key?: string;
  edition?: string;
  reading?: string;
  pos?: string;
}

chrome.runtime.onMessage.addListener((msg: Message, _s, respond) => {
  if (msg?.target !== 'offscreen') return false;

  switch (msg.type) {
    case 'ping':
      respond({ ok: true, ready: state.ready });
      return true;

    case 'status':
      respond({ ok: true, ...state });
      return true;

    case 'load':
      void load(msg.dict ?? 'ipadic').then(() => respond({ ok: state.ready && !state.error, ...state }));
      return true;

    case 'tokenize': {
      if (!state.ready) {
        respond({
          ok: false,
          error: state.error ?? (state.loading ? 'the analyser is still loading' : 'the analyser is not loaded'),
        });
        return true;
      }
      let tokens: Morpheme[];
      try {
        tokens = analyse(msg.text ?? '');
      } catch (e) {
        respond({ ok: false, error: String(e) });
        return true;
      }
      // Numbers, prefixed and suffixed nouns: merging reads these better with
      // the dictionary's view of them, and says so when it had to do without.
      const forms = lexiconQueries(tokens);
      if (!forms.length) {
        respond({ ok: true, tokens, complete: true });
        return true;
      }
      if (!dict.ready) {
        respond({ ok: true, tokens, complete: false });
        return true;
      }
      void lexicon(forms).then(
        (answers) => respond({ ok: true, tokens, lexicon: answers, complete: !dict.stale }),
        () => respond({ ok: true, tokens, complete: false }),
      );
      return true;
    }

    case 'dict-load':
      void ensureDict(msg.edition ?? 'eng').then(() => respond({ ok: !dict.error, ...dict }));
      return true;

    case 'dict-status':
      respond({ ok: true, ...dict });
      return true;

    case 'dict-lookup':
      void answerLookup(msg.key ?? '', { reading: msg.reading, pos: msg.pos }).then(respond);
      return true;

    default:
      respond({ ok: false, error: `unknown message: ${msg.type}` });
      return true;
  }
});
