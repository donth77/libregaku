import init, { TokenizerBuilder, loadDictionaryFromBytes, type Tokenizer } from 'lindera-wasm';
import { downloadDictionary, hasDictionary, loadDictionaryFiles } from 'lindera-wasm/opfs';
import { jishoLookup } from './dict/jisho';
import { build as buildDict, isPopulated, lookup } from './dict/store';

/**
 * The morphological analyser lives here and nowhere else.
 *
 * It cannot run in the service worker (killed aggressively, no OPFS) nor in a
 * content script (OPFS belongs to the host page's origin, and WASM is subject
 * to the page's CSP). An offscreen document is a real extension page: our
 * origin, our CSP, persistent, with OPFS.
 */

const DICTS: Record<string, string> = {
  ipadic: 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-ipadic-6.0.0.zip',
  'ko-dic': 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-ko-dic-6.0.0.zip',
  'cc-cedict': 'https://github.com/lindera/lindera/releases/download/v6.0.0/lindera-cc-cedict-6.0.0.zip',
};

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
let wasmReady: Promise<void> | null = null;

function initWasm(): Promise<void> {
  // The binary sits beside us in the extension, not on a CDN.
  wasmReady ??= init({ module_or_path: chrome.runtime.getURL('lindera_wasm_bg.wasm') }).then(() => undefined);
  return wasmReady;
}

async function load(name: string): Promise<void> {
  if (state.loading) return;
  state.loading = true;
  state.error = null;
  state.dict = name;

  try {
    await initWasm();

    const url = DICTS[name];
    if (!url) throw new Error(`no download URL for dictionary "${name}"`);

    if (!(await hasDictionary(name))) {
      // ~10 MB, once. Kept in OPFS so a reinstall is the only thing that
      // triggers it again.
      await downloadDictionary(url, name, {
        onProgress: (p) => {
          state.phase = p.phase;
          state.percent = p.total ? Math.round(((p.loaded ?? 0) / p.total) * 100) : 0;
        },
      });
    }

    state.phase = 'loading';
    const f = await loadDictionaryFiles(name);
    const dict = loadDictionaryFromBytes(
      f.metadata, f.dictTrie, f.dictValsIdx, f.dictVals,
      f.dictWordsIdx, f.dictWords, f.matrixMtx, f.charDef, f.unk,
    );

    const builder = new TokenizerBuilder();
    builder.setDictionaryInstance(dict);
    builder.setMode('normal');
    tokenizer = builder.build();

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

/** IPADIC feature columns. */
const POS1 = 1;
const BASE_FORM = 6;
const READING = 7;

interface RawToken {
  surface: string;
  details?: string[];
  isUnknown?: boolean;
}

function analyse(text: string): Array<{ surface: string; lemma?: string; reading?: string; pos?: string; pos1?: string }> {
  if (!tokenizer) return [];
  return (tokenizer.tokenize(text) as RawToken[]).map((t) => {
    const d = t.details ?? [];
    // Unknown words come back as ["UNK"]; there is no lemma or reading to take.
    const usable = d.length > READING;
    const base = usable ? d[BASE_FORM] : undefined;
    const reading = usable ? d[READING] : undefined;
    const pos1 = d[POS1];
    return {
      surface: t.surface,
      lemma: base && base !== '*' ? base : undefined,
      reading: reading && reading !== '*' ? reading : undefined,
      pos: d[0] && d[0] !== '*' ? d[0] : undefined,
      pos1: pos1 && pos1 !== '*' ? pos1 : undefined,
    };
  });
}

/* ── JMdict ─────────────────────────────────────────────────────── */

const dict = { ready: false, loading: false, phase: 'idle', percent: 0, error: null as string | null };

async function ensureDict(): Promise<void> {
  if (dict.ready || dict.loading) return;
  dict.loading = true;
  dict.error = null;
  try {
    if (await isPopulated()) {
      dict.ready = true;
      dict.phase = 'ready';
      dict.percent = 100;
      return;
    }
    const n = await buildDict((phase, percent) => {
      dict.phase = phase;
      dict.percent = percent;
    });
    dict.ready = true;
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

chrome.runtime.onMessage.addListener((msg: { target?: string; type?: string; text?: string; dict?: string; key?: string }, _s, respond) => {
  if (msg?.target !== 'offscreen') return false;

  switch (msg.type) {
    case 'ping':
      respond({ ok: true, ready: state.ready });
      return true;

    case 'status':
      respond({ ok: true, ...state });
      return true;

    case 'load':
      void load(msg.dict ?? 'ipadic').then(() => respond({ ok: !state.error, ...state }));
      return true;

    case 'tokenize':
      if (!state.ready) {
        respond({ ok: false, error: state.error ?? 'dictionary not loaded yet' });
        return true;
      }
      try {
        respond({ ok: true, tokens: analyse(msg.text ?? '') });
      } catch (e) {
        respond({ ok: false, error: String(e) });
      }
      return true;

    case 'dict-load':
      void ensureDict().then(() => respond({ ok: !dict.error, ...dict }));
      return true;

    case 'dict-status':
      respond({ ok: true, ...dict });
      return true;

    case 'dict-lookup': {
      const key = msg.key ?? '';
      // While the local copy is still downloading — or if it never arrives —
      // Jisho serves the same JMdict data, so a word is never unlookupable
      // just because indexing has not finished.
      const remote = (): void => {
        void jishoLookup(key).then(
          (entries) => respond({ ok: true, entries, source: 'jisho' }),
          (e: unknown) => respond({ ok: false, error: String(e) }),
        );
      };

      if (!dict.ready) {
        remote();
        return true;
      }
      void lookup(key).then((entries) => {
        if (entries.length) respond({ ok: true, entries, source: 'local' });
        else remote();
      }, remote);
      return true;
    }

    default:
      respond({ ok: false, error: `unknown message: ${msg.type}` });
      return true;
  }
});
