import { ui } from '../i18n';
import type { Token } from '../morphology/types';
import type { Entry } from './jmdict';
import { kanjiIn, type CharacterInfo } from './kanji';

/** Content-script side of the dictionary. The store itself lives offscreen. */

export interface DictStatus {
  ready: boolean;
  phase: string;
  percent: number;
  error: string | null;
}

const cache = new Map<string, Entry[]>();

export type LookupResult =
  | { state: 'ok'; entries: Entry[] }
  | { state: 'empty' }
  | { state: 'loading'; percent: number }
  | { state: 'error'; error: string };

/** What the analyser knows about a key, to rank homographs by. */
export interface LookupHint {
  /** Reading of the key, either kana. */
  reading?: string;
  /** The analyser's part of speech, as the token carries it. */
  pos?: string;
}

interface Key extends LookupHint {
  key: string;
}

/** Said when nothing answers at all — distinct from a dictionary still loading. */
const noAnswer = (): string => ui.errors.noAnswer;

/**
 * Why the offscreen document could not answer, in the interface's language
 * where it gave one of the reasons it has a code for. It never words them
 * itself: its bundle carries no language tables. Anything else — a failed
 * download, an exception — is its own message, as detail.
 */
function worded(res: { error?: string; reason?: string }): string | undefined {
  if (res.reason === 'dictionaryLoading') return ui.errors.dictionaryLoading;
  if (res.reason === 'analyserLoading') return ui.errors.analyserLoading;
  return res.error;
}

/**
 * Have the offscreen document load a dictionary, downloading it the first
 * time: `source` names it (settings.ts, DICTIONARIES), and `edition` says
 * which language its definitions are in, where it comes in several. `own` is
 * a dictionary in the learner's own language (settings.ts, ownDictionaryOf),
 * loaded after it and asked before it.
 */
export async function ensureDictionary(
  edition: string, source = 'jmdict', own: { source: string; edition: string } | null = null,
  fallback: { source: string; edition: string } | null = null,
): Promise<DictStatus> {
  await chrome.runtime.sendMessage({ type: 'ensure-offscreen' });
  const res = (await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'dict-load',
    source,
    edition,
    own,
    fallback,
  })) as DictStatus | undefined;
  return (
    res ?? {
      ready: false,
      phase: 'unavailable',
      percent: 0,
      error: noAnswer(),
    }
  );
}

export async function dictStatus(): Promise<DictStatus> {
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-status' })) as
    | DictStatus
    | undefined;
  return res ?? { ready: false, phase: 'unavailable', percent: 0, error: noAnswer() };
}

const idOf = (k: Key): string => `${k.key}\u0000${k.reading ?? ''}\u0000${k.pos ?? ''}`;

/**
 * Try each key in turn until one has entries.
 *
 * Only *answers* are cached. Caching a failure was the original bug here: a
 * click while the dictionary was still indexing stored an empty result, and
 * every later lookup of that word returned it — so the card said "no entry"
 * forever, even once the data had landed.
 */
async function lookupKeys(keys: Key[]): Promise<LookupResult> {
  for (const k of keys) {
    const hit = cache.get(idOf(k));
    if (hit?.length) return { state: 'ok', entries: hit };
  }

  for (const k of keys) {
    const id = idOf(k);
    if (cache.has(id)) continue;   // known-empty, but a later key may still hit

    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'dict-lookup',
      key: k.key,
      reading: k.reading,
      pos: k.pos,
    })) as { ok?: boolean; entries?: Entry[]; error?: string; reason?: string; source?: string } | undefined;

    // No reply is not "still loading": with nothing listening, the status
    // check below gets no reply either, and the card said 0% forever.
    if (!res) return { state: 'error', error: noAnswer() };

    if (!res.ok) {
      // Not an answer — do not remember it.
      const status = await dictStatus();
      if (status.error) return { state: 'error', error: res.error ? `${status.error}; ${res.error}` : status.error };
      if (!status.ready) return { state: 'loading', percent: status.percent };
      return { state: 'error', error: worded(res) ?? ui.errors.lookupFailed };
    }

    const entries = res.entries ?? [];
    // Only remember answers from the local copy; the offscreen document keeps
    // remote ones, and a local answer should replace them once it can.
    if (res.source === 'local') {
      if (cache.size > 2000) cache.clear();
      cache.set(id, entries);
    }
    if (entries.length) return { state: 'ok', entries };
  }

  return { state: 'empty' };
}

/**
 * Look a word up, trying the dictionary form first.
 *
 * The lemma is what JMdict is keyed on, so 来た resolves through 来る. Falling
 * back to the surface covers words the analyser could not resolve. `hint`
 * describes the lemma.
 */
export function lookupWord(lemma: string | undefined, surface: string, hint?: LookupHint): Promise<LookupResult> {
  const keys: Key[] = [];
  if (lemma) keys.push({ key: lemma, ...hint });
  if (surface && surface !== lemma) keys.push({ key: surface });
  return lookupKeys(keys);
}

/**
 * Look a token up the way the analyser planned.
 *
 * A tier-2 token carries its keys in order — 勉強している tries 勉強する,
 * then 勉強; 3匹 falls back to 匹 — each with the reading and part of speech
 * that pick 私【わたし】 over 私【あたし】 and この over 九. Anything else is
 * looked up by lemma, then surface.
 */
export async function lookupToken(
  token: Pick<Token, 'surface' | 'lemma' | 'lemmaReading' | 'pos' | 'lookup' | 'compound' | 'derived'>,
): Promise<LookupResult> {
  if (token.compound) return lookupCompound(token.surface, token.compound);
  const direct = token.lookup?.length
    ? await lookupKeys(token.lookup.filter((k) => k.key))
    : await lookupWord(token.lemma, token.surface, { reading: token.lemmaReading });
  // No entry for the word: it may be a word with a suffix, and the parts have entries.
  if (direct.state === 'empty' && token.derived) return lookupCompound(token.surface, token.derived, true);
  return direct;
}

/** A part's meaning short enough for a line: Donau is a river, and the dictionary says where it flows. */
const brief = (text: string): string => (text.length > 70 ? `${text.slice(0, 69).replace(/[\s,;(]+\S*$/, '')}…` : text);

/**
 * A word the dictionary has no entry for, made of two it has: one entry for
 * the whole, saying what each part means. Where only one part is found, that
 * part's own entry stands for the word.
 */
async function lookupCompound(surface: string, lemmas: string[], everyPart = false): Promise<LookupResult> {
  const found = await Promise.all(lemmas.map((key) => lookupKeys([{ key }])));
  const last = found[found.length - 1];
  if (!last || last.state !== 'ok') return last ?? { state: 'empty' };
  // A derived word with only its suffix found says nothing of the word.
  if (everyPart && found.some((f) => f.state !== 'ok')) return { state: 'empty' };
  const headEntry = last.entries[0];
  if (!headEntry) return last;
  const senses: Array<{ pos: string[]; glosses: string[] }> = [];
  for (const [i, result] of found.entries()) {
    const e = result.state === 'ok' ? result.entries[0] : undefined;
    if (e) senses.push({ pos: [], glosses: [`${lemmas[i]}: ${brief(e.senses.flatMap((s) => s.glosses).slice(0, 2).join('; '))}`] });
  }
  // Only the last part found: it stands for the word. For a derived word it is the word, said under the word's own name.
  if (senses.length < 2) return everyPart ? { state: 'ok', entries: [{ ...headEntry, id: `derived-${surface}`, word: surface, forms: undefined }] } : last;
  return { state: 'ok', entries: [{ ...headEntry, id: `compound-${surface}`, word: surface, forms: undefined, senses }] };
}

/** Forget negative results so a finished download takes effect immediately. */
export function clearLookupCache(): void {
  cache.clear();
}

/** What the lookup card shows about the characters in a word, under its own heading. */
export interface Characters {
  label: string;
  items: CharacterInfo[];
}

/**
 * The characters a word is written with, each with what it means and how it
 * reads: kanji from KANJIDIC2, with meanings in the learner's own language
 * where it has them; Chinese characters from their own dictionary entries.
 * Empty for a word with none, and while the data is still downloading — the
 * card simply leaves the section out. `label` says what the language calls
 * its characters ('kanji', 'hanzi'); the card puts a name to it.
 */
export async function charactersOf(word: string, native: string, label = 'kanji'): Promise<Characters> {
  const chars = kanjiIn(word);
  if (!chars.length) return { label, items: [] };
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'dict-kanji', chars, native })) as
    | { ok?: boolean; characters?: CharacterInfo[] }
    | undefined;
  return { label, items: res?.ok ? res.characters ?? [] : [] };
}
