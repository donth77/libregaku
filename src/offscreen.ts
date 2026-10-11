import init, { TokenizerBuilder, loadDictionaryFromBytes, loadUserDictionaryFromBytes, type Tokenizer } from 'lindera-wasm';
import { downloadDictionary, hasDictionary, loadDictionaryFiles, removeDictionary } from 'lindera-wasm/opfs';
import type { RankHint } from './dict/jmdict';
import { jishoLookup } from './dict/jisho';
import { jotobaLookup } from './dict/jotoba';
import { remoteLookup } from './dict/remote';
import { closeCapture, isCapturing, openCapture, startRecording, stopRecording } from './audio/tab-capture';
import { forLanguage } from './dict/kanji';
import { SOURCES } from './dict/sources';
import {
  JMDICT, build as buildDict, buildKanji, dataMark, eachEntry, formsOf, hasKanji, hasStale, isPopulated, kanjiFor,
  lexicon, lookup, storedWords, storeWords, type Source,
} from './dict/store';
import { EXTRA_COST, EXTRA_FORMAT, extraCollector, extraRows, misreads, type ExtraWord } from './morphology/extra-words';
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

/** Where IPADIC keeps what is read from it, as indices into `details`. */
const IPADIC = { pos: 0, pos1: 1, conjForm: 5, base: 6, reading: 7 };

/** `details[i]`, or undefined for the "*" a dictionary writes where it has nothing. */
const col = (d: string[], i: number): string | undefined => {
  const v = d[i];
  return v && v !== '*' ? v : undefined;
};

/**
 * How one of Lindera's dictionaries is read.
 *
 * Each lays its columns out its own way. IPADIC's seventh is a dictionary
 * form; ko-dic's is a part-of-speech tag and cc-cedict's a definition — read
 * as IPADIC, Chinese came out with English glosses as its "readings" and
 * Korean with tags as lemmas. So a dictionary is read only through the entry
 * it has here, and one with no entry is refused by name rather than misread.
 */
interface Reader {
  /** Lindera's names for the columns relied on, by their place in `details`. */
  columns: Array<[number, string]>;
  /** One row as the language's merge rules take it. */
  read(surface: string, details: string[]): unknown;
}

const READERS: Record<string, Reader> = {
  ipadic: {
    columns: [[IPADIC.pos, 'part_of_speech'], [IPADIC.base, 'base_form'], [IPADIC.reading, 'reading']],
    read(surface, d): Morpheme {
      // Unknown words carry no lemma or reading — "*", or a short row.
      const usable = d.length > IPADIC.reading;
      return {
        surface,
        lemma: usable ? col(d, IPADIC.base) : undefined,
        reading: usable ? col(d, IPADIC.reading) : undefined,
        pos: col(d, IPADIC.pos),
        pos1: col(d, IPADIC.pos1),
        conjForm: col(d, IPADIC.conjForm),
      };
    },
  },
  // KoMorpheme, src/morphology/merge-ko.ts: the tag, and for a unit of more
  // than one morpheme, what it is made of (가/VV/*+았/EP/*).
  'ko-dic': {
    columns: [[0, 'part_of_speech_tag'], [4, 'type'], [7, 'expression']],
    read: (surface, d) => ({ surface, tag: col(d, 0), type: col(d, 4), expression: col(d, 7) }),
  },
  // Where the words are, and nothing else: its one reading per word is not
  // to be trusted (src/morphology/dictionaries.ts). The dictionary adds them.
  'cc-cedict': {
    columns: [],
    read: (surface) => ({ surface }),
  },
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
let reader: Reader | null = null;
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
  // 7 to 20 MB, once for each language. Kept in OPFS so a reinstall is the
  // only thing that triggers it again.
  await downloadDictionary(url, name, {
    onProgress: (p) => {
      state.phase = p.phase;
      state.percent = p.total ? Math.round(((p.loaded ?? 0) / p.total) * 100) : 0;
    },
  });
}

/** Give an analyser's memory back: each holds its whole dictionary, tens of megabytes. */
function release(t: Tokenizer): void {
  try {
    t.free();
  } catch {
    /* already gone */
  }
}

/** Refuse a dictionary whose columns are not where its reader says. */
function checkLayout(name: string, metadata: Uint8Array, r: Reader): void {
  let fields: unknown;
  try {
    fields = (JSON.parse(new TextDecoder().decode(metadata)) as { dictionary_schema?: { fields?: unknown } })
      .dictionary_schema?.fields;
  } catch {
    return;   // no readable schema to check against; the reader stands
  }
  if (!Array.isArray(fields)) return;
  // details[i] is field i + 4: the surface, two context ids and a cost come first.
  for (const [column, want] of r.columns) {
    if (fields[column + 4] !== want) {
      throw new Error(
        `the ${name} dictionary has "${String(fields[column + 4])}" where the analyser expects ${want}`,
      );
    }
  }
}

async function tokenizerFor(name: string, r: Reader): Promise<Tokenizer> {
  state.phase = 'loading';
  return buildTokenizer(name, r);
}

/** The analyser from its stored files, with `words` added when given (Lindera's user dictionary, as CSV). */
async function buildTokenizer(name: string, r: Reader, words?: string): Promise<Tokenizer> {
  const f = await loadDictionaryFiles(name);
  checkLayout(name, f.metadata, r);
  const dict = loadDictionaryFromBytes(
    f.metadata, f.dictTrie, f.dictValsIdx, f.dictVals,
    f.dictWordsIdx, f.dictWords, f.matrixMtx, f.charDef, f.unk,
  );
  const user = words ? loadUserDictionaryFromBytes(new TextEncoder().encode(words), dict.metadata) : null;
  const builder = new TokenizerBuilder();
  builder.setDictionaryInstance(dict);
  if (user) builder.setUserDictionaryInstance(user);
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
    const r = READERS[name];
    if (!url || !r) {
      throw new Error(`no analyser for dictionary "${name}" — only ${Object.keys(READERS).join(', ')} can be read`);
    }

    await initWasm();

    let fresh = false;
    if (!(await hasDictionary(name))) {
      await download(name, url);
      fresh = true;
    }

    let t: Tokenizer;
    try {
      t = await tokenizerFor(name, r);
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
      t = await tokenizerFor(name, r);
    }

    // One language is read at a time; the analyser for the one before goes.
    const before = tokenizer;
    tokenizer = t;
    reader = r;
    if (before) release(before);
    // The words added from JMdict were in the analyser just replaced.
    extras.state = 'none';
    extras.count = 0;
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

function analyse(text: string): unknown[] {
  const r = reader;
  if (!tokenizer || !r) return [];
  return (tokenizer.tokenize(text) as RawToken[]).map((t) => r.read(t.surface, t.details ?? []));
}

/* ── The word dictionary ────────────────────────────────────────── */

/**
 * The dictionary in use: the one for the language being learned. Each is kept
 * in a database of its own (src/dict/store.ts), so going back to a language
 * finds its dictionary where it was left.
 */
let active: Source = JMDICT;

const dict = {
  ready: false, loading: false, phase: 'idle', percent: 0,
  error: null as string | null, source: JMDICT.id, edition: 'eng',
  /** Serving an older release while its replacement downloads. */
  stale: false,
};

let dictLoading: Promise<void> | null = null;

/**
 * The dictionary in the learner's own language, where the language's own is
 * in another (settings.ts, ownDictionaryOf): Chinese Wiktionary for a
 * Japanese word, French for a Spanish one. A lookup asks it first and the
 * language's own when it has nothing. It only ever answers lookups: what
 * analysis asks of a dictionary, the language's own answers, as before.
 * Loaded once the language's own is ready, so the two never download at once.
 */
let own: Source | null = null;
const ownDict = { ready: false, error: null as string | null, source: '', edition: '' };
let ownLoading: Promise<void> | null = null;

function ensureOwn(id: string | undefined, edition: string | undefined): Promise<void> {
  if (!id || !edition) {
    own = null;
    Object.assign(ownDict, { ready: false, error: null, source: '', edition: '' });
    return Promise.resolve();
  }
  const source = SOURCES[id];
  if (!source) {
    own = null;
    Object.assign(ownDict, { ready: false, error: `no dictionary called "${id}"`, source: id, edition });
    return Promise.resolve();
  }
  if (ownDict.source === id && ownDict.edition === edition && (ownDict.ready || ownLoading)) {
    return ownLoading ?? Promise.resolve();
  }
  own = source;
  Object.assign(ownDict, { ready: false, error: null, source: id, edition });
  const load = async (): Promise<void> => {
    try {
      if (!(await isPopulated(edition, source))) await buildDict(edition, () => {}, source);
      // The learner may have changed language while it downloaded.
      if (own === source && ownDict.edition === edition) ownDict.ready = true;
      console.log(`[libregaku] ${id} ready — words in your own language first`);
    } catch (e) {
      if (own === source) ownDict.error = String(e);
      console.warn(`[libregaku] ${id} failed to load; meanings come from the language's own dictionary:`, e);
    }
  };
  const loading = load();
  ownLoading = loading;
  void loading.then(() => {
    if (ownLoading === loading) ownLoading = null;
  });
  return loading;
}

async function buildNow(source: Source, edition: string): Promise<void> {
  dict.loading = true;
  dict.error = null;
  dict.source = source.id;
  dict.edition = edition;
  // Nothing answers from the dictionary before until this one has been looked at.
  dict.ready = false;
  active = source;
  readings.clear();
  try {
    if (await isPopulated(edition, source)) {
      dict.ready = true;
      dict.stale = false;
      dict.phase = 'ready';
      dict.percent = 100;
      return;
    }
    // Complete data from an older release of this edition keeps answering
    // until the new one starts replacing it — better than a remote API.
    dict.stale = await hasStale(edition, source);
    dict.ready = dict.stale;
    const n = await buildDict(edition, (phase, percent) => {
      dict.phase = phase;
      dict.percent = percent;
      if (phase === 'indexing') dict.ready = false;   // the old data is going
    }, source);
    readings.clear();
    dict.ready = true;
    dict.stale = false;
    dict.phase = 'ready';
    dict.percent = 100;
    console.log(`[libregaku] ${source.id} ready — ${n} entries`);
  } catch (e) {
    dict.error = String(e);
    dict.phase = 'error';
    console.warn(`[libregaku] ${source.id} failed to load:`, e);
  } finally {
    dict.loading = false;
  }
}

/**
 * A different edition is a different dictionary, and so is another
 * language's: a change of either has to load rather than be treated as
 * already there. Callers share the build in flight and are answered when it
 * is done.
 */
function ensureDict(id: string, edition: string): Promise<void> {
  const source = SOURCES[id];
  if (!source) {
    dict.error = `no dictionary called "${id}"`;
    dict.phase = 'error';
    return Promise.resolve();
  }
  const same = dict.source === id && dict.edition === edition;
  if (dict.ready && !dict.stale && same) return Promise.resolve();
  if (dictLoading) return same ? dictLoading : dictLoading.then(() => ensureDict(id, edition));
  dictLoading = buildNow(source, edition).finally(() => {
    dictLoading = null;
  });
  return dictLoading;
}

/** The dictionary is the whole of this source, and current. */
const complete = (source: Source): boolean => active === source && dict.ready && !dict.stale;

/* ── What an analysis still wants from the dictionary ───────────── */

interface Analysis {
  ok: true;
  tokens: unknown[];
  lexicon?: unknown;
  /** False when the dictionary could not be consulted, so asking again later may know more. */
  complete: boolean;
}

/** The reading each Chinese word is given. Remembered: a few hundred words make up most lines. */
const readings = new Map<string, string | undefined>();
const HAN = /\p{sc=Han}/u;

/**
 * Chinese words with their readings, from the dictionary: the top entry's,
 * which is the one a word is most often read by (src/dict/cedict.ts). The
 * analyser's own dictionary has a reading too, and it is not asked.
 */
async function withReadings(tokens: Array<{ surface: string }>, source: Source): Promise<unknown[]> {
  if (readings.size > 20000) readings.clear();
  const unread = [...new Set(tokens.map((t) => t.surface))].filter((s) => HAN.test(s) && !readings.has(s));
  await Promise.all(unread.map(async (s) => {
    readings.set(s, (await lookup(s, undefined, source))[0]?.reading);
  }));
  return tokens.map((t) => ({ surface: t.surface, reading: readings.get(t.surface) }));
}

/**
 * One analysed line, with what the word dictionary adds to it — by the
 * analyser's dictionary, since each language wants something different.
 */
async function finished(tokens: unknown[]): Promise<Analysis> {
  const plain: Analysis = { ok: true, tokens, complete: true };
  if (state.dict === 'ipadic') {
    // Numbers, prefixed and suffixed nouns: merging reads these better with
    // the dictionary's view of them, and says so when it had to do without.
    const forms = lexiconQueries(tokens as Morpheme[]);
    if (!forms.length) return plain;
    if (active !== JMDICT || !dict.ready) return { ...plain, complete: false };
    try {
      return { ...plain, lexicon: await lexicon(forms), complete: !dict.stale };
    } catch {
      return { ...plain, complete: false };
    }
  }
  if (state.dict === 'cc-cedict') {
    // The dictionary in use where its words carry a reading (Jyutping, for Cantonese); CC-CEDICT's pinyin otherwise.
    const source = active.readsLines ? active : SOURCES.cedict;
    if (!source || !complete(source)) return { ...plain, complete: false };
    try {
      return { ...plain, tokens: await withReadings(tokens as Array<{ surface: string }>, source) };
    } catch {
      return { ...plain, complete: false };
    }
  }
  return plain;
}

/* ── Words IPADIC misreads, from JMdict (src/morphology/extra-words.ts) ── */

const extras = { state: 'none' as 'none' | 'building' | 'ready' | 'failed', count: 0 };
let extrasLoading: Promise<void> | null = null;

/**
 * Once the analyser and JMdict are both in, the words IPADIC misreads are
 * handed to it. The list is built once, from the JMdict already stored, and
 * kept beside it; later starts load it in a fraction of a second. Japanese
 * only, as both dictionaries are. Anything going wrong leaves the analyser
 * exactly as it was.
 */
function ensureExtras(): Promise<void> {
  if (!tokenizer || state.dict !== 'ipadic' || !complete(JMDICT)) return Promise.resolve();
  if (extras.state === 'ready' || extras.state === 'failed') return Promise.resolve();
  extrasLoading ??= loadExtras().finally(() => {
    extrasLoading = null;
  });
  return extrasLoading;
}

async function loadExtras(): Promise<void> {
  const name = state.dict;
  const r = reader;
  const plain = tokenizer;
  if (!name || !r || !plain) return;
  extras.state = 'building';
  try {
    const data = await dataMark();
    if (!data) throw new Error('the dictionary is not complete');
    const mark = `${data}|${DICTS[name] ?? name}|${EXTRA_FORMAT}|${EXTRA_COST}`;
    let csv = await storedWords(mark);
    if (csv === null) {
      const collect = extraCollector();
      await eachEntry((e) => collect.add(e));
      const words: ExtraWord[] = [];
      for (const w of collect.words()) {
        const pieces = (plain.tokenize(w.surface) as RawToken[]).map((t) => ({
          surface: t.surface,
          reading: col(t.details ?? [], IPADIC.reading),
        }));
        if (misreads(w, pieces)) words.push(w);
      }
      csv = extraRows(words);
      await storeWords(mark, csv);
    }
    const count = csv ? csv.split('\n').length : 0;
    if (count) {
      const t = await buildTokenizer(name, r, csv);
      if (tokenizer !== plain) {
        // Another language's analyser took its place while this was built.
        release(t);
        extras.state = 'none';
        return;
      }
      tokenizer = t;
      release(plain);
    }
    extras.state = 'ready';
    extras.count = count;
    console.log(`[libregaku] ${count} words from JMdict added to the analyser`);
  } catch (e) {
    extras.state = 'failed';
    console.warn('[libregaku] words from JMdict not added; the analyser reads as before:', e);
  }
}

/**
 * The page asks for JMdict just before it asks for the analyser, and the
 * analyser used to answer first. Its first lines were then read without the
 * words JMdict adds — 盗撮 as 盗 and 撮, と and と — and read again, right,
 * when JMdict came. A dictionary stored here answers within moments, so the
 * analyser waits for it. One that has to be downloaded does not hold it up.
 */
async function dictionarySoon(): Promise<void> {
  if (state.dict !== 'ipadic') return;
  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  // The request may still be on its way.
  if (!dictLoading && !dict.ready) await sleep(300);
  if (dictLoading) await Promise.race([dictLoading, sleep(4000)]);
}

/* ── KANJIDIC2 ─────────────────────────────────────────────────── */

const kanji = { ready: false, error: null as string | null };
let kanjiLoading: Promise<void> | null = null;

/**
 * KANJIDIC2 after JMdict, never before it: definitions matter more than the
 * characters' detail, and the two downloads should not compete. A failure
 * costs only the kanji section of the lookup card.
 */
function ensureKanji(): Promise<void> {
  if (kanji.ready) return Promise.resolve();
  kanjiLoading ??= (async () => {
    try {
      if (!(await hasKanji())) {
        const n = await buildKanji();
        console.log(`[libregaku] KANJIDIC2 ready — ${n} characters`);
      }
      kanji.ready = true;
      kanji.error = null;
    } catch (e) {
      kanji.error = String(e);
      console.warn('[libregaku] KANJIDIC2 failed to load:', e);
    } finally {
      kanjiLoading = null;
    }
  })();
  return kanjiLoading;
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
  const source = active;
  let failed: string | null = null;
  // The learner's own language first, where it has a dictionary of its own.
  const mine = own;
  if (mine && ownDict.ready) {
    try {
      const entries = await lookup(key, hint, mine);
      if (entries.length) return { ok: true, entries: entries.map((e) => ({ ...e, lang: ownDict.edition })), source: 'local' };
    } catch (e) {
      console.warn('[libregaku] lookup in your own language failed:', e);
    }
  }
  // While that one still downloads, an answer from the other is not kept:
  // the page asks again, and gets the meaning in its own language once it can.
  const settled = !mine || ownDict.ready || Boolean(ownDict.error);
  if (dict.ready) {
    try {
      return { ok: true, entries: await lookup(key, hint, source), source: settled ? 'local' : 'partial' };
    } catch (e) {
      console.warn('[libregaku] local lookup failed:', e);
      failed = String(e);
    }
  }
  // Japanese has a dictionary to ask elsewhere meanwhile; nothing else does.
  if (source !== JMDICT) {
    return failed ? { ok: false, error: failed } : { ok: false, error: 'the dictionary is still loading', reason: 'dictionaryLoading' };
  }
  return remote(key, dict.edition);
}

interface Message {
  target?: string;
  type?: string;
  text?: string;
  dict?: string;
  key?: string;
  source?: string;
  edition?: string;
  reading?: string;
  pos?: string;
  chars?: string[];
  forms?: string[];
  native?: string;
  /** dict-load: the dictionary in the learner's own language, asked before the other. */
  own?: { source: string; edition: string } | null;
  tabId?: number;
  streamId?: string;
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
      // With JMdict already in, the analyser answers once its added words are too.
      void load(msg.dict ?? 'ipadic').then(dictionarySoon).then(ensureExtras).then(() => respond({ ok: state.ready && !state.error, ...state }));
      return true;

    case 'tokenize': {
      if (!state.ready) {
        // `reason` is a code the page words in its own language; this page has no language tables.
        respond({
          ok: false,
          error: state.error ?? (state.loading ? 'the analyser is still loading' : 'the analyser is not loaded'),
          ...(!state.error && state.loading ? { reason: 'analyserLoading' } : {}),
        });
        return true;
      }
      let tokens: unknown[];
      try {
        tokens = analyse(msg.text ?? '');
      } catch (e) {
        respond({ ok: false, error: String(e) });
        return true;
      }
      void finished(tokens).then(respond, () => respond({ ok: true, tokens, complete: false }));
      return true;
    }

    case 'dict-load':
      // Answered once the analyser has JMdict's words too, if it is loaded:
      // the page re-reads its lines on this answer.
      void ensureDict(msg.source ?? JMDICT.id, msg.edition ?? 'eng').then(ensureExtras).then(() => {
        respond({ ok: !dict.error, ...dict });
        if (dict.ready && active === JMDICT) void ensureKanji();
        // Then the one in the learner's own language, if the pair has one.
        if (dict.ready) void ensureOwn(msg.own?.source, msg.own?.edition);
        else void ensureOwn(undefined, undefined);
      });
      return true;

    case 'dict-kanji': {
      const chars = (msg.chars ?? []).slice(0, 12);
      // A dictionary that lists single characters answers for them itself.
      const own = active.characters;
      if (own) {
        if (!dict.ready) {
          respond({ ok: false, error: 'the dictionary is still loading' });
          return true;
        }
        void own(chars).then(
          (characters) => respond({ ok: true, characters }),
          (e: unknown) => respond({ ok: false, error: String(e) }),
        );
        return true;
      }
      if (!kanji.ready) {
        respond({ ok: false, error: kanji.error ?? 'the kanji data is still loading' });
        return true;
      }
      void kanjiFor(chars).then(
        (found) => respond({ ok: true, characters: found.map((k) => forLanguage(k, msg.native ?? 'en')) }),
        (e: unknown) => respond({ ok: false, error: String(e) }),
      );
      return true;
    }

    case 'dict-status':
      respond({ ok: true, ...dict });
      return true;

    case 'dict-lookup':
      void answerLookup(msg.key ?? '', { reading: msg.reading, pos: msg.pos }).then(respond);
      return true;

    /* What written forms are forms of, for a language found by its word boundaries (src/morphology/lemma.ts). */
    case 'dict-forms': {
      const source = active;
      if (!complete(source)) {
        respond({ ok: false, error: dict.error ?? 'the dictionary is still loading', ...(dict.error ? {} : { reason: 'dictionaryLoading' }) });
        return true;
      }
      void formsOf((msg.forms ?? []).slice(0, 400), source).then(
        (forms) => respond({ ok: true, forms }),
        (e: unknown) => respond({ ok: false, error: String(e) }),
      );
      return true;
    }

    /* A tab's sound, for sentence audio (src/audio/tab-capture.ts). */
    case 'capture-open':
      if (typeof msg.tabId !== 'number' || !msg.streamId) {
        respond({ ok: false, error: 'no tab to capture' });
        return true;
      }
      void openCapture(msg.tabId, msg.streamId).then(
        () => respond({ ok: true }),
        (e: unknown) => respond({ ok: false, error: String(e) }),
      );
      return true;

    case 'capture-has':
      respond({ ok: true, capturing: typeof msg.tabId === 'number' && isCapturing(msg.tabId) });
      return true;

    case 'capture-close':
      if (typeof msg.tabId === 'number') closeCapture(msg.tabId);
      respond({ ok: true });
      return true;

    case 'record-start':
      try {
        startRecording(msg.tabId ?? -1);
        respond({ ok: true });
      } catch (e) {
        respond({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
      return true;

    case 'record-stop':
      void stopRecording(msg.tabId ?? -1).then((media) => respond(media ? { ok: true, ...media } : { ok: false }));
      return true;

    default:
      respond({ ok: false, error: `unknown message: ${msg.type}` });
      return true;
  }
});
