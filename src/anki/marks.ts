import { ui } from '../i18n';
import { createDeck, ensureNoteType } from './client';
import {
  MARK_DECK, MARK_FIELDS, MARK_MODEL, MARK_MODEL_NAME, MARK_SEARCH, ROOT_TAG, fieldHtml, keyField, markTag,
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
 * Offline first. The page reads a cache in chrome.storage.local and never
 * waits on Anki: marking updates the cache and a queue at once, and a sync
 * — whenever Anki next answers — writes the queue into Anki and reads every
 * mark back. What Anki holds is the truth; what is still queued is newer.
 */

/** word → status: what the page reads, instantly. */
const OVERRIDES = 'libregaku.overrides';
/** Set once the old chrome.storage.sync item has been brought over on this machine. */
const MIGRATED = 'libregaku.overrides.migrated';
/** word → the change still to be written into Anki. */
const PENDING = 'libregaku.marks.pending';
/** Set once the marks this browser had before Anki kept them have been queued for it. */
const SEEDED = 'libregaku.marks.migrated';

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

type Queue = Record<string, Pending>;
type Marks = Record<string, OverrideStatus>;

interface Local {
  cache: Marks;
  queue: Queue;
  seeded: boolean;
}

export interface MarkSync {
  /** Every mark: Anki's, with whatever is still queued laid over them. */
  marks: Map<string, OverrideStatus>;
  /** Changes not yet in Anki. */
  pending: number;
  /** What to tell the user when Anki refused part of the sync. The queue is kept. */
  error?: string;
}

function isStatus(v: unknown): v is OverrideStatus {
  return v === 'known' || v === 'tracking' || v === 'unknown' || v === 'ignored';
}

function clean(raw: unknown): Marks {
  const out: Marks = {};
  if (!raw || typeof raw !== 'object') return out;
  // Older versions persisted every word given a card as "learning", masking Anki
  // forever. Drop those values; the next write removes them for good.
  for (const [word, status] of Object.entries(raw as Record<string, unknown>)) {
    if (isStatus(status)) out[word] = status;
  }
  return out;
}

function cleanQueue(raw: unknown): Queue {
  const out: Queue = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [word, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== 'object') continue;
    const { status, reading, at } = entry as Record<string, unknown>;
    if (status !== null && !isStatus(status)) continue;
    out[word] = {
      status,
      at: typeof at === 'number' ? at : 0,
      ...(typeof reading === 'string' && reading ? { reading } : {}),
    };
  }
  return out;
}

/** Everything stored here. Throws when storage cannot be read. */
async function readLocal(): Promise<Local> {
  const got = await chrome.storage.local.get([OVERRIDES, MIGRATED, PENDING, SEEDED]);
  const cache = clean(got[OVERRIDES]);
  return {
    cache: got[MIGRATED] ? cache : await migrate(cache),
    queue: cleanQueue(got[PENDING]),
    seeded: Boolean(got[SEEDED]),
  };
}

/**
 * One time: bring the old chrome.storage.sync item over, then remove it. Its
 * 8 KB limit is why marks left sync storage. The flag, not the removal, is
 * what stops a second import — so a failed removal can never bring back a
 * mark cleared since.
 */
async function migrate(local: Marks): Promise<Marks> {
  let legacy: Marks;
  try {
    legacy = clean((await chrome.storage.sync.get(OVERRIDES))[OVERRIDES]);
  } catch {
    return local;   // sync unreadable just now; try again next time
  }
  // Anything already local was written after the sync copy, so it wins.
  const merged = { ...legacy, ...local };
  try {
    await chrome.storage.local.set({ [OVERRIDES]: merged, [MIGRATED]: true });
  } catch {
    return merged;   // shown this session; the import is retried next time
  }
  try {
    await chrome.storage.sync.remove(OVERRIDES);
  } catch {
    /* the flag already prevents a second import */
  }
  return merged;
}

/**
 * Local writes from this page, one at a time, each reading the one before it.
 * A sync's final write joins the same line, so a mark made while Anki was
 * being written to is never overwritten by the sync that started before it.
 *
 * The line is per page. Two tabs writing within the same few milliseconds can
 * still overwrite each other's local write; closing that means one writer for
 * every tab, which only the service worker could be.
 */
let writing: Promise<unknown> = Promise.resolve();

function serial<T>(work: () => Promise<T>, fallback: (e: unknown) => T): Promise<T> {
  const run = writing.then(work).catch((e: unknown) => fallback(e));
  writing = run;
  return run;
}

let lastStamp = 0;
/** Strictly increasing, so two changes in one millisecond are still two. */
function stamp(): number {
  lastStamp = Math.max(Date.now(), lastStamp + 1);
  return lastStamp;
}

/**
 * Record a mark, or clear it with null, without waiting on Anki. Resolves
 * false only when browser storage refused it — the one case in which the mark
 * will not outlive this page.
 */
export function setMark(word: string, status: OverrideStatus | null, reading?: string): Promise<boolean> {
  return serial(async () => {
    // Read strictly: writing back a map that failed to load would erase
    // every other mark.
    const { cache, queue } = await readLocal();
    // Already so — including clearing a word that was never marked, which
    // adding a card does for every word it adds.
    if ((cache[word] ?? null) === status) return true;
    if (status) cache[word] = status;
    else delete cache[word];
    const kana = reading ? phonetic(reading.trim()) : null;
    queue[word] = { status, at: stamp(), ...(kana ? { reading: kana } : {}) };
    await chrome.storage.local.set({ [OVERRIDES]: cache, [PENDING]: queue });
    return true;
  }, (e) => {
    console.warn('[libregaku] could not store the mark for', word, e);
    return false;
  });
}

/** The marks as this page should show them now: Anki's last word, plus anything queued since. */
export async function loadOverrides(): Promise<Map<string, OverrideStatus>> {
  try {
    return new Map(Object.entries((await readLocal()).cache));
  } catch {
    return new Map();
  }
}

/** The older name for setMark, kept for its callers. */
export function setOverride(word: string, status: OverrideStatus | null): Promise<boolean> {
  return setMark(word, status);
}

/** How many changes are still waiting for Anki. */
export async function pendingMarks(): Promise<number> {
  try {
    return Object.keys((await readLocal()).queue).length;
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
}

interface AnkiMarks {
  byWord: Map<string, AnkiMark>;
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
 * Every mark note, one per word.
 *
 * Two devices that marked the same word offline each add a note; Anki's sync
 * then holds both. The most recently modified one is the mark, and the rest
 * are left in `stale` for deletion.
 */
async function readAnkiMarks(): Promise<AnkiMarks> {
  const ids = await call<number[]>('findNotes', { query: MARK_SEARCH });
  const byWord = new Map<string, AnkiMark>();
  const stale: number[] = [];
  for (let i = 0; i < ids.length; i += BATCH) {
    const notes = await call<MarkNoteInfo[]>('notesInfo', { notes: ids.slice(i, i + BATCH) });
    for (const note of notes) {
      // A note deleted between the search and now comes back as {}.
      if (typeof note?.noteId !== 'number' || !note.fields) continue;
      const word = strip(fieldValue(note.fields, 'Word'));
      if (!word) continue;
      // Older AnkiConnect has no `mod`; a note id is its creation time in ms.
      const mark: AnkiMark = {
        noteId: note.noteId,
        status: statusFromTags(note.tags),
        mod: note.mod ?? Math.floor(note.noteId / 1000),
      };
      const prev = byWord.get(word);
      if (!prev) {
        byWord.set(word, mark);
      } else if (newer(mark, prev)) {
        stale.push(prev.noteId);
        byWord.set(word, mark);
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
  const add: Array<{ word: string; status: OverrideStatus; reading?: string }> = [];
  const retag = new Map<OverrideStatus, number[]>();
  const remove = [...anki.stale];
  for (const [word, change] of Object.entries(queue)) {
    const have = anki.byWord.get(word);
    if (change.status === null) {
      if (have) remove.push(have.noteId);
    } else if (!have) {
      add.push({ word, status: change.status, reading: change.reading });
    } else if (have.status !== change.status) {
      retag.set(change.status, [...(retag.get(change.status) ?? []), have.noteId]);
    }
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
      await createDeck(MARK_DECK);
      await inBatches(add, async (batch) => {
        const ids = await call<Array<number | null>>('addNotes', {
          notes: batch.map((m) => ({
            deckName: MARK_DECK,
            modelName: MARK_MODEL_NAME,
            fields: { Word: keyField(m.word), Reading: m.reading ? fieldHtml(m.reading) : '' },
            tags: [ROOT_TAG, markTag(m.status)],
            // One note per word. A note another device added since the read
            // is refused here, stays queued, and is retagged next time.
            options: { allowDuplicate: false },
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
  // New notes' cards, and any a learner unsuspended by hand: a mark is never
  // something to review.
  await attempt(async () => {
    const loose = await call<number[]>('findCards', { query: `${MARK_SEARCH} -is:suspended` });
    await inBatches(loose, (cards) => call('suspend', { cards }));
  });
  return error;
}

/** Whether Anki now holds what a queued change asked for. */
function done(anki: AnkiMarks, word: string, change: Pending): boolean {
  const have = anki.byWord.get(word);
  return change.status === null ? !have : have?.status === change.status;
}

/** Anki's marks with the queue laid over them: a queued change is newer. */
function layered(anki: AnkiMarks, queue: Queue): Marks {
  const out: Marks = {};
  for (const [word, mark] of anki.byWord) if (mark.status) out[word] = mark.status;
  for (const [word, change] of Object.entries(queue)) {
    if (change.status) out[word] = change.status;
    else delete out[word];
  }
  return out;
}

/**
 * The last step of a sync, in line with every other local write: take off
 * the queue what Anki now holds — only if it has not changed since — keep
 * anything first-run seeding added, and store the new cache.
 */
function commit(attempted: Queue, seeded: Queue, after: AnkiMarks | null, error?: string): Promise<MarkSync> {
  return serial(async () => {
    const now = await readLocal();
    const queue = now.queue;
    for (const [word, change] of Object.entries(seeded)) queue[word] ??= change;
    if (after) {
      for (const [word, tried] of Object.entries(attempted)) {
        const current = queue[word];
        if (current && current.at === tried.at && current.status === tried.status && done(after, word, current)) {
          delete queue[word];
        }
      }
    }
    const cache = after ? layered(after, queue) : now.cache;
    await chrome.storage.local.set({ [OVERRIDES]: cache, [PENDING]: queue, [SEEDED]: true });
    return {
      marks: new Map(Object.entries(cache)),
      pending: Object.keys(queue).length,
      ...(error ? { error } : {}),
    };
  }, (e): MarkSync => ({
    marks: new Map(Object.entries(after ? layered(after, attempted) : {})),
    pending: Object.keys(attempted).length,
    error: ui.anki.marksNotStored(messageOf(e)),
  }));
}

async function runSync(): Promise<MarkSync | null> {
  const hello = await ankiTry<number>('version');
  // Closed, blocked, another program on the port, or no answer: the caller
  // keeps the cache, which already shows every mark made here.
  if (!hello.ok) return null;

  let local: Local;
  try {
    local = await readLocal();
  } catch (e) {
    return { marks: new Map(), pending: 0, error: ui.anki.storageUnreadable(messageOf(e)) };
  }

  let before: AnkiMarks;
  try {
    before = await readAnkiMarks();
  } catch (e) {
    if (e instanceof AnkiUnavailable) return null;
    return { marks: new Map(Object.entries(local.cache)), pending: Object.keys(local.queue).length, error: messageOf(e) };
  }

  // First run: marks this browser had before Anki kept them go to Anki,
  // except where Anki already has the word — Anki is where marks are shared.
  const attempted: Queue = { ...local.queue };
  const seeded: Queue = {};
  if (!local.seeded) {
    const at = stamp();
    for (const [word, status] of Object.entries(local.cache)) {
      if (!before.byWord.has(word) && !attempted[word]) attempted[word] = seeded[word] = { status, at };
    }
  }

  let error: string | undefined;
  let after: AnkiMarks | null = null;
  let gone = false;
  try {
    error = await flush(attempted, before);
    after = await readAnkiMarks();
  } catch (e) {
    if (e instanceof AnkiUnavailable) gone = true;
    else error ??= messageOf(e);
  }
  const result = await commit(attempted, seeded, after, error);
  return gone ? null : result;
}

let running: Promise<MarkSync | null> | null = null;
let following: Promise<MarkSync | null> | null = null;

/**
 * Write every queued change into Anki and read all marks back. Call it
 * whenever Anki answers. Null when Anki cannot be reached; the queue is
 * untouched and loadOverrides() still has every mark made here.
 *
 * One sync at a time per page. Asking during one queues exactly one more,
 * which picks up anything marked meanwhile.
 */
export function syncMarks(): Promise<MarkSync | null> {
  if (!running) {
    running = runSync().finally(() => {
      running = null;
    });
    return running;
  }
  following ??= running.then(
    () => {
      following = null;
      return syncMarks();
    },
    () => {
      following = null;
      return syncMarks();
    },
  );
  return following;
}
