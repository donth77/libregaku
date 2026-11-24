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
  /** The analyser's name for the word, in kanji, where it is written in kana: 側 for そば. */
  spelling?: string;
  /** How the verb conjugates, as the analyser names it: 五段・ラ行 for いら in いらない. */
  conj?: string;
  /** What a verb in kana follows, which says which verb it is: ピアノ|を before ひく. */
  follows?: string;
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

const idOf = (k: Key): string => `${k.key}\u0000${k.reading ?? ''}\u0000${k.pos ?? ''}\u0000${k.spelling ?? ''}\u0000${k.conj ?? ''}\u0000${k.follows ?? ''}`;

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
      spelling: k.spelling,
      conj: k.conj,
      follows: k.follows,
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
 * A way of being a form that only a verb's form has, in the words the dictionary's table of forms describes them
 * with (src/morphology/lemma.ts): a tense, a mood, an aspect or a voice, or a participle, gerund or infinitive. A noun
 * or an adjective is described by its number, gender, case or degree, none of which is here. Nor is a person alone:
 * Arabic writes "from us" as the preposition with a person on it (منا, of من), and Turkish's suffixes name a person
 * after a noun too (öğretmenim, "I am a teacher"). The table runs two readings together with a slash, so a slash
 * ends a word as a space does.
 */
const VERB_FORM = new RegExp(
  `(?:^|[ /])(?:participle|gerund|infinitive|imperative|subjunctive|indicative|jussive|conditional(?:-mood)?|` +
  `preterite|imperfect|pluperfect|future|past|present|non-past|ongoing|habitual|passive|potential)(?:[ /]|$)`,
);
/**
 * A reading that says nothing of which word it is, whatever else it names: a dual. Arabic writes a verb's past dual
 * as it writes a noun's indefinite accusative, with an alif — خبزا is "bread" far more often than "the two of them
 * baked" — and the table of forms lists the verb's alone. Over 20,000 of Tatoeba's Arabic sentences, 90 words were
 * read only as a past dual, most of them nouns (عملا, نوعا, رجلا) and a few verbs (كانا, قتلا), whose cards open as
 * the file orders the word's rows.
 */
const EITHER = /(?:^|[ /])dual(?:[ /]|$)/;

/** The dictionaries' code for a verb, which a Wiktionary or WikDict source puts first when asked (byRole, sources.ts). */
const VERB = 'v';

/**
 * The keys a token is looked up by, as the analyser planned them, and what its trace says of the word where the
 * analyser has no tag for it.
 *
 * A word traced to its dictionary form — seen → see, "past participle" — is that word in a verb's form, and its card
 * should open on the verb. Wiktionary has a row for each part of speech, and its order is the page's: see the noun,
 * a bishop's seat, comes before see the verb in several editions. So the dictionary form is asked for as a verb,
 * in the dictionaries' own code, and each source puts its verb rows first, the rest after them. Only where the
 * analyser said nothing of its own: a Japanese or Korean token carries its tag already, and that decides.
 *
 * Only where every way the trace reads the form is a verb's ("or ser" names another word, and is no reading). friends
 * is "plural · third-person singular present" of friend, the noun and the verb, and the line does not say which:
 * asked for as a verb, its card opened on "to befriend" (CARDS in scripts/measure-forms.ts, November 2026).
 */
export function keysOf(
  token: Pick<Token, 'surface' | 'lemma' | 'pos' | 'lookup' | 'inflections'>,
): Array<{ key: string; reading?: string; pos?: string; spelling?: string; conj?: string; follows?: string }> {
  const keys = (token.lookup ?? []).filter((k) => k.key);
  const readings = (token.inflections ?? []).filter((label) => !label.startsWith('or '));
  const verb = !token.pos && token.lemma !== undefined && token.lemma !== token.surface &&
    readings.length > 0 && readings.every((label) => VERB_FORM.test(label) && !EITHER.test(label));
  return verb ? keys.map((k) => (k.key === token.lemma && !k.pos ? { ...k, pos: VERB } : k)) : keys;
}

/**
 * Look a token up the way the analyser planned.
 *
 * A tier-2 token carries its keys in order — 勉強している tries 勉強する,
 * then 勉強; 3匹 falls back to 匹 — each with the reading and part of speech
 * that pick 私【わたし】 over 私【あたし】 and この over 九. A tier-1 token's
 * keys say only the words, and its trace says whether it is a verb's form
 * (keysOf). Anything else is looked up by lemma, then surface.
 */
export async function lookupToken(
  token: Pick<Token, 'surface' | 'lemma' | 'lemmaReading' | 'pos' | 'lookup' | 'compound' | 'derived' | 'inflections'>,
): Promise<LookupResult> {
  if (token.compound) return lookupCompound(token.surface, token.compound);
  const direct = token.lookup?.length
    ? await lookupKeys(keysOf(token))
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
