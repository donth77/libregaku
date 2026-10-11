import { ui } from '../i18n';
import { createDeck, ensureNoteType } from './client';
import {
  MARK_FIELDS, MARK_MODEL, MARK_MODEL_NAME, MARK_SEARCH, MARK_UNSORTED, ROOT_TAG, fieldHtml, keyField, langOfTags,
  langTag, markDeck, markTag,
} from './model';
import { AnkiUnavailable, ankiCall as call, ankiTry } from './rpc';
import type { OverrideStatus } from './status';
import { phonetic, strip } from './text';

/**
 * Words marked by hand — known, tracking, ignored, unknown — kept in Anki.
 *
 * A mark is the one piece of word status Anki cannot derive: "I know this,
 * and I do not want a card for it." Kept only in this browser, it vanished
 * on reinstall and never reached another device. So each mark is also a
 * note in Anki, of its own note type, in its own deck, suspended so it never
 * enters review, with its status in a tag. It then syncs wherever the
 * collection does, and survives anything that happens to the extension.
 *
 * A mark belongs to a language. 人 known in Japanese says nothing about 人 in
 * Chinese, and a list of the words marked in two languages is a list of
 * neither. So marks are kept by language here, and in Anki each carries its
 * language as a tag — the one a card carries — in that language's own deck.
 *
 * Offline first. The page reads a cache in chrome.storage.local and never
 * waits on Anki: marking updates the cache and a queue at once, and a sync
 * — whenever Anki next answers — writes the queue into Anki and reads every
 * mark back. What Anki holds is the truth; what is still queued is newer.
 */

/** language → word → status: what the page reads, instantly. */
const CACHE = 'libregaku.marks.byLanguage';
/** language → word → the change still to be written into Anki. */
const QUEUE = 'libregaku.marks.pending.byLanguage';
/** Set once the marks this browser had before Anki kept them have been queued for it. */
const SEEDED = 'libregaku.marks.migrated';

/*
 * From before a mark had a language: word → status, and word → change. Read
 * one last time, each word given a language (languageOf), and removed.
 */
const FLAT_CACHE = 'libregaku.overrides';
const FLAT_QUEUE = 'libregaku.marks.pending';
/** Set once the still older chrome.storage.sync item has been brought over on this machine. */
const SYNC_IMPORTED = 'libregaku.overrides.migrated';

/** Ids and notes per AnkiConnect request, so no one call is ever unbounded. */
const BATCH = 500;

const STATUSES: readonly OverrideStatus[] = ['known', 'ignored', 'tracking', 'unknown'];

interface Pending {
  /** null clears the mark: its note is deleted. */
  status: OverrideStatus | null;
  /** Hiragana, written to the note's Reading when it is created. */
  reading?: string;
  /** When it was queued; a change made during a sync is told apart by this. */
  at: number;
}

/**
 * The kana a marked word may be found by, in hiragana, by language and word:
 * 行く by いく, so a subtitle that writes 行く as いこう finds the mark. Kept
 * only for a word that is the dictionary's first entry for its kana — see the
 * page (markedByReading) — and written only by it. Never trimmed: an entry
 * for a word no longer marked matches nothing.
 */
const READINGS = 'libregaku.marks.readings';

/** By language, then by word. */
type ByLanguage<T> = Map<string, Map<string, T>>;
type Marks = ByLanguage<OverrideStatus>;
type Queue = ByLanguage<Pending>;

interface Local {
  cache: Marks;
  queue: Queue;
  seeded: boolean;
}

export interface MarkSync {
  /** Every mark, by language and then by word: Anki's, with whatever is still queued laid over them. */
  marks: Map<string, Map<string, OverrideStatus>>;
  /** Changes not yet in Anki. */
  pending: number;
  /** What to tell the user when Anki refused part of the sync. The queue is kept. */
  error?: string;
}

function put<T>(all: ByLanguage<T>, lang: string, word: string, value: T): void {
  let words = all.get(lang);
  if (!words) all.set(lang, (words = new Map()));
  words.set(word, value);
}

function take<T>(all: ByLanguage<T>, lang: string, word: string): void {
  const words = all.get(lang);
  if (words?.delete(word) && !words.size) all.delete(lang);
}

function* each<T>(all: ByLanguage<T>): Generator<[lang: string, word: string, value: T]> {
  for (const [lang, words] of all) {
    for (const [word, value] of words) yield [lang, word, value];
  }
}

function count(all: ByLanguage<unknown>): number {
  let n = 0;
  for (const words of all.values()) n += words.size;
  return n;
}

function copy<T>(all: ByLanguage<T>): ByLanguage<T> {
  return new Map([...all].map(([lang, words]) => [lang, new Map(words)]));
}

/** As chrome.storage keeps it: language → word → value, in plain objects. */
function stored<T>(all: ByLanguage<T>): Record<string, Record<string, T>> {
  return Object.fromEntries([...all].map(([lang, words]) => [lang, Object.fromEntries(words)]));
}

function push<K, V>(lists: Map<K, V[]>, key: K, value: V): void {
  const list = lists.get(key);
  if (list) list.push(value);
  else lists.set(key, [value]);
}

/** A language as marks are kept under it: its code, in lower case. */
function code(lang: string): string {
  return lang.trim().toLowerCase();
}

/**
 * The language of a mark made before marks had one.
 *
 * Japanese was then the only language with word forms and a dictionary, so a
 * word in kana or kanji is Japanese. A word in a script Japanese is never
 * written in names its own language. Anything else — a word in Latin
 * letters, above all — could be in any of several, and is taken to be in the
 * one being learned now.
 */
function languageOf(word: string, learning: string): string {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(word)) return 'ja';
  if (/\p{Script=Hangul}/u.test(word)) return 'ko';
  if (/\p{Script=Thai}/u.test(word)) return 'th';
  return learning;
}

function isStatus(v: unknown): v is OverrideStatus {
  return v === 'known' || v === 'tracking' || v === 'unknown' || v === 'ignored';
}

/**
 * A stored status. Older versions persisted every word given a card as
 * "learning", masking Anki forever: that is no status here, so it is dropped
 * as it is read, and the next write removes it for good.
 */
function statusOf(v: unknown): OverrideStatus | null {
  return isStatus(v) ? v : null;
}

function pendingOf(v: unknown): Pending | null {
  if (!v || typeof v !== 'object') return null;
  const { status, reading, at } = v as Record<string, unknown>;
  if (status !== null && !isStatus(status)) return null;
  return {
    status,
    at: typeof at === 'number' ? at : 0,
    ...(typeof reading === 'string' && reading ? { reading } : {}),
  };
}

/** What is stored by language, with anything that is not one of `valueOf`'s left out. */
function read<T>(raw: unknown, valueOf: (v: unknown) => T | null): ByLanguage<T> {
  const out: ByLanguage<T> = new Map();
  if (!raw || typeof raw !== 'object') return out;
  for (const [lang, words] of Object.entries(raw as Record<string, unknown>)) {
    if (!words || typeof words !== 'object') continue;
    for (const [word, v] of Object.entries(words as Record<string, unknown>)) {
      const value = valueOf(v);
      if (value !== null) put(out, lang, word, value);
    }
  }
  return out;
}

/** The same from before marks had a language — word → value — each word under its own. */
function readFlat<T>(raw: unknown, valueOf: (v: unknown) => T | null, learning: string): ByLanguage<T> {
  const out: ByLanguage<T> = new Map();
  if (!raw || typeof raw !== 'object') return out;
  for (const [word, v] of Object.entries(raw as Record<string, unknown>)) {
    const value = valueOf(v);
    if (value !== null) put(out, languageOf(word, learning), word, value);
  }
  return out;
}

/**
 * Everything stored here. Throws when storage cannot be read.
 *
 * Always in line with the local writes (serial), because the first read
 * after an update is one itself: marks from before they had a language are
 * stored by language. `learning` is the language being learned, which is
 * what such a mark is taken to be in when its spelling does not say.
 */
async function readLocal(learning: string): Promise<Local> {
  const got = await chrome.storage.local.get([CACHE, QUEUE, SEEDED, FLAT_CACHE, FLAT_QUEUE, SYNC_IMPORTED]);
  // Nothing by language yet: whatever is here is from before marks had one.
  const flat = got[CACHE] === undefined && got[QUEUE] === undefined;
  const local: Local = {
    cache: flat ? readFlat(got[FLAT_CACHE], statusOf, learning) : read(got[CACHE], statusOf),
    queue: flat ? readFlat(got[FLAT_QUEUE], pendingOf, learning) : read(got[QUEUE], pendingOf),
    seeded: Boolean(got[SEEDED]),
  };
  if (flat || !got[SYNC_IMPORTED]) await bringOver(local, flat, !got[SYNC_IMPORTED], learning);
  return local;
}

/**
 * One time each: marks from before they had a language are stored by
 * language, and the chrome.storage.sync item older still is brought over —
 * its 8 KB limit is why marks left sync storage. What is written here, not
 * the removals after it, is what stops either happening twice — so a failed
 * removal can never bring back a mark cleared since.
 */
async function bringOver(local: Local, flat: boolean, fromSync: boolean, learning: string): Promise<void> {
  let imported = false;
  if (fromSync) {
    try {
      const legacy = readFlat((await chrome.storage.sync.get(FLAT_CACHE))[FLAT_CACHE], statusOf, learning);
      // Anything already local was written after the sync copy, so it wins.
      for (const [lang, word, status] of each(legacy)) {
        if (!local.cache.get(lang)?.has(word)) put(local.cache, lang, word, status);
      }
      imported = true;
    } catch {
      /* sync unreadable just now; tried again next time */
    }
  }
  if (!flat && !imported) return;
  try {
    await chrome.storage.local.set({
      [CACHE]: stored(local.cache),
      [QUEUE]: stored(local.queue),
      ...(imported ? { [SYNC_IMPORTED]: true } : {}),
    });
  } catch {
    return;   // shown this session; brought over again next time
  }
  try {
    if (imported) await chrome.storage.sync.remove(FLAT_CACHE);
  } catch {
    /* the flag already prevents a second import */
  }
  try {
    if (flat) await chrome.storage.local.remove([FLAT_CACHE, FLAT_QUEUE]);
  } catch {
    /* never read again: the marks by language are there now */
  }
}

/**
 * Local reads and writes from this page, one at a time, each seeing the one
 * before it. A sync's final write joins the same line, so a mark made while
 * Anki was being written to is never overwritten by the sync that started
 * before it.
 *
 * The line is per page. Two tabs writing within the same few milliseconds can
 * still overwrite each other's local write; closing that means one writer for
 * every tab, which only the service worker could be.
 */
let writing: Promise<unknown> = Promise.resolve();

function serial<T>(work: () => Promise<T>): Promise<T> {
  const run = writing.then(work);
  // The next in line goes ahead whatever became of this one.
  writing = run.catch(() => undefined);
  return run;
}

let lastStamp = 0;
/** Strictly increasing, so two changes in one millisecond are still two. */
function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

/**
 * Record a mark on a word of one language, or clear it with null, without
 * waiting on Anki. Resolves false only when browser storage refused it — the
 * one case in which the mark will not outlive this page.
 */
export function setMark(
  lang: string,
  word: string,
  status: OverrideStatus | null,
  reading?: string,
): Promise<boolean> {
  const language = code(lang);
  return serial(async () => {
    // Read strictly: writing back marks that failed to load would erase
    // every other one.
    const { cache, queue } = await readLocal(language);
    // Already so — including clearing a word that was never marked, which
    // adding a card does for every word it adds.
    if ((cache.get(language)?.get(word) ?? null) === status) return true;
    if (status) put(cache, language, word, status);
    else take(cache, language, word);
    const kana = reading ? phonetic(reading.trim()) : null;
    put(queue, language, word, { status, at: stamp(), ...(kana ? { reading: kana } : {}) });
    await chrome.storage.local.set({ [CACHE]: stored(cache), [QUEUE]: stored(queue) });
    return true;
  }).catch((e: unknown) => {
    console.warn('[libregaku] could not store the mark for', word, e);
    return false;
  });
}

const readingOf = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);

/** Add to the readings kept. A failure costs only the match by reading. */
async function keepReadings(found: Array<[lang: string, word: string, reading: string]>): Promise<void> {
  if (!found.length) return;
  try {
    const all = read((await chrome.storage.local.get(READINGS))[READINGS], readingOf);
    let changed = false;
    for (const [lang, word, reading] of found) {
      if (all.get(lang)?.get(word) === reading) continue;
      put(all, lang, word, reading);
      changed = true;
    }
    if (changed) await chrome.storage.local.set({ [READINGS]: stored(all) });
  } catch (e) {
    console.warn('[libregaku] could not keep the readings of marked words:', e);
  }
}

/** How one language's marked words are read, word → hiragana, as far as that is known. */
export async function loadMarkReadings(lang: string): Promise<Map<string, string>> {
  try {
    return new Map(read((await chrome.storage.local.get(READINGS))[READINGS], readingOf).get(code(lang)));
  } catch {
    return new Map();
  }
}

/** The reading of a marked word, found by the page: kept so it is looked up once. */
export function keepMarkReading(lang: string, word: string, reading: string): Promise<void> {
  const kana = phonetic(reading.trim());
  return kana ? serial(() => keepReadings([[code(lang), word, kana]])) : Promise.resolve();
}

/**
 * One language's marks as this page should show them now: Anki's last word,
 * plus anything queued since. Never another language's: the same spelling
 * there is another word.
 */
export async function loadOverrides(lang: string): Promise<Map<string, OverrideStatus>> {
  const language = code(lang);
  try {
    return new Map((await serial(() => readLocal(language))).cache.get(language));
  } catch {
    return new Map();
  }
}

/** One language's marks out of a sync's, as loadOverrides gives them. */
export function marksIn(marks: MarkSync['marks'], lang: string): Map<string, OverrideStatus> {
  return new Map(marks.get(code(lang)));
}

/** How many changes are still waiting for Anki, in every language. `learning` as for readLocal. */
export async function pendingMarks(learning: string): Promise<number> {
  try {
    return count((await serial(() => readLocal(code(learning)))).queue);
  } catch {
    return 0;
  }
}

/* ---- Anki's side ------------------------------------------------------- */

interface MarkNoteInfo {
  noteId?: number;
  fields?: Record<string, { value: string }>;
  tags?: string[];
  mod?: number;
}

interface AnkiMark {
  noteId: number;
  /** Null when the note carries no status tag — someone removed it. */
  status: OverrideStatus | null;
  mod: number;
  /** False for a note from before marks had a language: the next flush gives it its tag. */
  tagged: boolean;
}

interface AnkiMarks {
  /** One note for each word of each language. */
  byWord: ByLanguage<AnkiMark>;
  /** Older notes for a word that has a newer one: deleted on the next flush. */
  stale: number[];
}

function statusFromTags(tags: string[] = []): OverrideStatus | null {
  const have = new Set(tags.map((t) => t.toLowerCase()));
  return STATUSES.find((s) => have.has(markTag(s).toLowerCase())) ?? null;
}

function fieldValue(fields: Record<string, { value: string }>, name: string): string {
  const key = Object.keys(fields).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? fields[key]?.value ?? '' : '';
}

function newer(a: AnkiMark, b: AnkiMark): boolean {
  return a.mod !== b.mod ? a.mod > b.mod : a.noteId > b.noteId;
}

/**
 * Every mark note, one per word of each language.
 *
 * Two devices that marked the same word offline each add a note; Anki's sync
 * then holds both. The most recently modified one is the mark, and the rest
 * are left in `stale` for deletion.
 *
 * A note's language is its tag. One with none is from before marks had a
 * language, and is read as languageOf says until a flush has tagged it.
 */
async function readAnkiMarks(learning: string): Promise<AnkiMarks> {
  const ids = await call<number[]>('findNotes', { query: MARK_SEARCH });
  const byWord: ByLanguage<AnkiMark> = new Map();
  const stale: number[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const notes = await call<MarkNoteInfo[]>('notesInfo', { notes: ids.slice(i, i + BATCH) });
    for (const note of notes) {
      // A note deleted between the search and now comes back as {}.
      if (typeof note?.noteId !== 'number' || !note.fields) continue;
      const word = strip(fieldValue(note.fields, 'Word'));
      if (!word) continue;
      const tagged = langOfTags(note.tags);
      const lang = tagged ?? languageOf(word, learning);
      // Older AnkiConnect has no `mod`; a note id is its creation time in ms.
      const mark: AnkiMark = {
        noteId: note.noteId,
        status: statusFromTags(note.tags),
        mod: note.mod ?? Math.floor(note.noteId / 1000),
        tagged: tagged !== null,
      };
      const prev = byWord.get(lang)?.get(word);
      if (!prev) {
        put(byWord, lang, word, mark);
      } else if (newer(mark, prev)) {
        stale.push(prev.noteId);
        put(byWord, lang, word, mark);
      } else {
        stale.push(mark.noteId);
      }
    }
  }
  return { byWord, stale };
}

async function inBatches<T>(items: T[], send: (batch: T[]) => Promise<unknown>): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH) await send(items.slice(i, i + BATCH));
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Every language's marks sat in one deck before each had its own. Those
 * still there move to their language's deck, found by the tag each carries.
 * One search when there are none, which is always but once.
 */
async function sortDecks(langs: Iterable<string>): Promise<void> {
  if (!(await call<number[]>('findCards', { query: MARK_UNSORTED })).length) return;
  for (const lang of langs) {
    const cards = await call<number[]>('findCards', { query: `${MARK_UNSORTED} tag:${langTag(lang)}` });
    // AnkiConnect makes the deck when it is not there yet.
    await inBatches(cards, (batch) => call('changeDeck', { cards: batch, deck: markDeck(lang) }));
  }
}

/**
 * Write the queue into Anki, in as few calls as the changes allow: one
 * deleteNotes, one addNotes, and an addTags/removeTags pair per status.
 *
 * Each step is tried on its own, so a refusal in one — a note type edited out
 * of shape, say — does not stop the others. Nothing is taken off the queue
 * here: the sync reads Anki back afterwards and only what it finds there is
 * done. That also covers AnkiConnect versions that report a partly failed
 * addNotes differently. Anki going away mid-flush is rethrown.
 */
async function flush(queue: Queue, anki: AnkiMarks): Promise<string | undefined> {
  const add: Array<{ lang: string; word: string; status: OverrideStatus; reading?: string }> = [];
  const retag = new Map<OverrideStatus, number[]>();
  const remove = [...anki.stale];
  for (const [lang, word, change] of each(queue)) {
    const have = anki.byWord.get(lang)?.get(word);
    if (change.status === null) {
      if (have) remove.push(have.noteId);
    } else if (!have) {
      add.push({ lang, word, status: change.status, reading: change.reading });
    } else if (have.status !== change.status) {
      push(retag, change.status, have.noteId);
    }
  }
  // Notes from before marks had a language, less any about to go: each is
  // given its own, so every device reads it the same from now on.
  const going = new Set(remove);
  const untagged = new Map<string, number[]>();
  for (const [lang, , mark] of each(anki.byWord)) {
    if (!mark.tagged && !going.has(mark.noteId)) push(untagged, lang, mark.noteId);
  }

  let error: string | undefined;
  const attempt = async (step: () => Promise<unknown>): Promise<void> => {
    try {
      await step();
    } catch (e) {
      if (e instanceof AnkiUnavailable) throw e;
      error ??= messageOf(e);
    }
  };

  if (remove.length) {
    await attempt(() => inBatches(remove, (notes) => call('deleteNotes', { notes })));
  }
  if (add.length) {
    let missed = 0;
    await attempt(async () => {
      await ensureNoteType(MARK_MODEL, MARK_FIELDS);
      for (const lang of new Set(add.map((m) => m.lang))) await createDeck(markDeck(lang));
      await inBatches(add, async (batch) => {
        const ids = await call<Array<number | null>>('addNotes', {
          notes: batch.map((m) => ({
            deckName: markDeck(m.lang),
            modelName: MARK_MODEL_NAME,
            fields: { Word: keyField(m.word), Reading: m.reading ? fieldHtml(m.reading) : '' },
            tags: [ROOT_TAG, markTag(m.status), langTag(m.lang)],
            // One note per word in a language's deck. A note another device
            // added since the read is refused here, stays queued, and is
            // retagged next time.
            options: { allowDuplicate: false, duplicateScope: 'deck' },
          })),
        });
        // Older AnkiConnect reports a refused note as null, with no reason.
        if (Array.isArray(ids)) missed += ids.filter((id) => id === null).length;
      });
    });
    if (missed) {
      error ??= ui.anki.marksNotAdded(missed);
    }
  }
  for (const [status, notes] of retag) {
    const others = STATUSES.filter((s) => s !== status).map(markTag).join(' ');
    await attempt(() => inBatches(notes, async (ids) => {
      await call('addTags', { notes: ids, tags: `${ROOT_TAG} ${markTag(status)}` });
      await call('removeTags', { notes: ids, tags: others });
    }));
  }
  for (const [lang, notes] of untagged) {
    await attempt(() => inBatches(notes, (ids) => call('addTags', { notes: ids, tags: langTag(lang) })));
  }
  await attempt(() => sortDecks(anki.byWord.keys()));
  // New notes' cards, and any a learner unsuspended by hand: a mark is never
  // something to review.
  await attempt(async () => {
    const loose = await call<number[]>('findCards', { query: `${MARK_SEARCH} -is:suspended` });
    await inBatches(loose, (cards) => call('suspend', { cards }));
  });
  return error;
}

/** Whether Anki now holds what a queued change asked for. */
function done(anki: AnkiMarks, lang: string, word: string, change: Pending): boolean {
  const have = anki.byWord.get(lang)?.get(word);
  return change.status === null ? !have : have?.status === change.status;
}

/** Anki's marks with the queue laid over them: a queued change is newer. */
function layered(anki: AnkiMarks, queue: Queue): Marks {
  const out: Marks = new Map();
  for (const [lang, word, mark] of each(anki.byWord)) {
    if (mark.status) put(out, lang, word, mark.status);
  }
  for (const [lang, word, change] of each(queue)) {
    if (change.status) put(out, lang, word, change.status);
    else take(out, lang, word);
  }
  return out;
}

/**
 * The last step of a sync, in line with every other local write: take off
 * the queue what Anki now holds — only if it has not changed since — keep
 * anything first-run seeding added, and store the new cache.
 */
function commit(
  learning: string,
  attempted: Queue,
  seeded: Queue,
  after: AnkiMarks | null,
  error?: string,
): Promise<MarkSync> {
  return serial(async () => {
    const now = await readLocal(learning);
    const queue = now.queue;
    for (const [lang, word, change] of each(seeded)) {
      if (!queue.get(lang)?.has(word)) put(queue, lang, word, change);
    }
    if (after) {
      for (const [lang, word, tried] of each(attempted)) {
        const current = queue.get(lang)?.get(word);
        if (current && current.at === tried.at && current.status === tried.status && done(after, lang, word, current)) {
          take(queue, lang, word);
        }
      }
    }
    const cache = after ? layered(after, queue) : now.cache;
    await chrome.storage.local.set({ [CACHE]: stored(cache), [QUEUE]: stored(queue), [SEEDED]: true });

    return {
      marks: cache,
      pending: count(queue),
      ...(error ? { error } : {}),
    };
  }).catch((e: unknown): MarkSync => ({
    marks: after ? layered(after, attempted) : new Map(),
    pending: count(attempted),
    error: ui.anki.marksNotStored(messageOf(e)),
  }));
}

async function runSync(learning: string): Promise<MarkSync | null> {
  const hello = await ankiTry<number>('version');
  // Closed, blocked, another program on the port, or no answer: the caller
  // keeps the cache, which already shows every mark made here.
  if (!hello.ok) return null;

  let local: Local;
  try {
    local = await serial(() => readLocal(learning));
  } catch (e) {
    return { marks: new Map(), pending: 0, error: ui.anki.storageUnreadable(messageOf(e)) };
  }

  let before: AnkiMarks;
  try {
    before = await readAnkiMarks(learning);
  } catch (e) {
    if (e instanceof AnkiUnavailable) return null;
    return { marks: local.cache, pending: count(local.queue), error: messageOf(e) };
  }

  // First run: marks this browser had before Anki kept them go to Anki,
  // except where Anki already has the word — Anki is where marks are shared.
  const attempted = copy(local.queue);
  const seeded: Queue = new Map();
  if (!local.seeded) {
    const at = stamp();
    for (const [lang, word, status] of each(local.cache)) {
      if (before.byWord.get(lang)?.has(word) || attempted.get(lang)?.has(word)) continue;
      const change: Pending = { status, at };
      put(attempted, lang, word, change);
      put(seeded, lang, word, change);
    }
  }

  let error: string | undefined;
  let after: AnkiMarks | null = null;
  let gone = false;
  try {
    error = await flush(attempted, before);
    after = await readAnkiMarks(learning);
  } catch (e) {
    if (e instanceof AnkiUnavailable) gone = true;
    else error ??= messageOf(e);
  }
  const result = await commit(learning, attempted, seeded, after, error);
  return gone ? null : result;
}

let running: Promise<MarkSync | null> | null = null;
let following: Promise<MarkSync | null> | null = null;

/**
 * Write every queued change into Anki and read all marks back — every
 * language's, since one collection holds them all. Call it whenever Anki
 * answers, with the language being learned. Null when Anki cannot be
 * reached; the queue is untouched and loadOverrides() still has every mark
 * made here.
 *
 * One sync at a time per page. Asking during one queues exactly one more,
 * which picks up anything marked meanwhile.
 */
export function syncMarks(lang: string): Promise<MarkSync | null> {
  const learning = code(lang);
  if (!running) {
    running = runSync(learning).finally(() => {
      running = null;
    });
    return running;
  }
  following ??= running.then(
    () => {
      following = null;
      return syncMarks(learning);
    },
    () => {
      following = null;
      return syncMarks(learning);
    },
  );
  return following;
}
