import { addNote, createDeck, ensureModel, isDuplicate, type CardAudio, type NewCard } from './client';
import { AnkiUnavailable, ankiTry } from './rpc';

/**
 * Cards made while Anki was closed, kept until it opens.
 *
 * Cards get made while watching, and Anki is a desktop program that is often
 * not running — so Add used to fail at exactly the moment it mattered, and
 * the word was gone unless the learner wrote it down. Now the card waits in
 * the browser and goes into Anki the next time it answers.
 *
 * A waiting card is a write that has not happened yet, not a word status:
 * what the learner knows is still read from Anki (AGENTS.md, invariant 1).
 * The page shows a waiting word as on its way, the same as a card added a
 * moment ago that Anki has not reported back yet.
 *
 * One storage key per card, so two tabs never overwrite each other's queue:
 * keeping a card is one write, and taking it off is one removal. If two tabs
 * both add the same waiting card, Anki's duplicate check refuses the second.
 */

const PREFIX = 'libregaku.cards.pending.';

export interface QueuedCard {
  /** The note as it would have gone in, without a recording. */
  card: NewCard;
  /** The word as the status layer keys it — its dictionary form. */
  word: string;
  /** What to fetch a recording of when it is added; absent when none is wanted. */
  audio?: AudioWanted;
  /** When it was kept, so cards go in in the order they were made. */
  at: number;
}

export interface AudioWanted {
  word: string;
  reading?: string;
  lang: string;
}

export function isQueueKey(key: string): boolean {
  return key.startsWith(PREFIX);
}

function isEntry(v: unknown): v is QueuedCard {
  if (!v || typeof v !== 'object') return false;
  const { card, word, at } = v as Record<string, unknown>;
  if (!card || typeof card !== 'object' || typeof word !== 'string' || typeof at !== 'number') return false;
  const { deck, expression } = card as Record<string, unknown>;
  return typeof deck === 'string' && Boolean(deck) && typeof expression === 'string' && Boolean(expression);
}

/** Every waiting card, oldest first. Throws when storage cannot be read. */
async function readQueue(): Promise<Array<{ key: string; entry: QueuedCard }>> {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter((kv): kv is [string, QueuedCard] => isQueueKey(kv[0]) && isEntry(kv[1]))
    .map(([key, entry]) => ({ key, entry }))
    .sort((a, b) => a.entry.at - b.entry.at);
}

/** The waiting cards, oldest first; none when storage cannot be read. */
export async function queuedCards(): Promise<QueuedCard[]> {
  try {
    return (await readQueue()).map((q) => q.entry);
  } catch {
    return [];
  }
}

/**
 * Keep a card for when Anki opens. 'already' when the same word is already
 * waiting for the same deck — pressing Add twice is still one card.
 */
export async function queueCard(entry: Omit<QueuedCard, 'at'>): Promise<'queued' | 'already' | 'failed'> {
  try {
    const waiting = await readQueue();
    if (waiting.some((q) => q.entry.card.deck === entry.card.deck && q.entry.card.expression === entry.card.expression)) {
      return 'already';
    }
    // Never the bytes of a recording: it is fetched again when the card goes
    // in, rather than holding megabytes of storage for a closed program.
    const { audio: _bytes, ...card } = entry.card;
    const key = `${PREFIX}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await chrome.storage.local.set({ [key]: { ...entry, card, at: Date.now() } satisfies QueuedCard });
    return 'queued';
  } catch (e) {
    console.warn('[libregaku] could not keep the card for later:', e);
    return 'failed';
  }
}

/**
 * Take a waiting card back out of the queue: Undo, before Anki has opened.
 * False when it is no longer waiting — it has gone in, or was never kept.
 */
export async function unqueueCard(deck: string, expression: string): Promise<boolean> {
  try {
    const hits = (await readQueue()).filter((q) => q.entry.card.deck === deck && q.entry.card.expression === expression);
    if (!hits.length) return false;
    await chrome.storage.local.remove(hits.map((q) => q.key));
    return true;
  } catch {
    return false;
  }
}

export interface CardFlush {
  /** Words — dictionary forms — Anki now has a card for, including ones it already had. */
  words: string[];
  /** How many were added. */
  added: number;
  /** How many Anki already had, and so were dropped from the queue. */
  duplicates: number;
  /** Still waiting. */
  remaining: number;
  /** Why some were not added. They stay queued and are tried again. */
  error?: string;
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function runFlush(audioFor?: (want: AudioWanted) => Promise<CardAudio | null>): Promise<CardFlush | null> {
  const done: CardFlush = { words: [], added: 0, duplicates: 0, remaining: 0 };
  let queue: Array<{ key: string; entry: QueuedCard }>;
  try {
    queue = await readQueue();
  } catch (e) {
    return { ...done, error: `Browser storage could not be read: ${messageOf(e)}` };
  }
  // Nothing waiting is the usual case: no reason to ask Anki anything.
  if (!queue.length) return done;
  if (!(await ankiTry<number>('version')).ok) return null;

  try {
    await ensureModel();
    // A deck can have been renamed or removed while the card waited. The
    // learner chose it for this card, so it is made again rather than the card
    // being refused for good.
    for (const deck of new Set(queue.map((q) => q.entry.card.deck))) await createDeck(deck);
  } catch (e) {
    if (e instanceof AnkiUnavailable) return null;
    return { ...done, remaining: queue.length, error: messageOf(e) };
  }

  let left = queue.length;
  for (const { key, entry } of queue) {
    try {
      const audio = entry.audio && audioFor ? await audioFor(entry.audio).catch(() => null) : null;
      await addNote({ ...entry.card, audio });
      done.added++;
    } catch (e) {
      if (e instanceof AnkiUnavailable) break;   // closed again: the rest wait
      if (!isDuplicate(e)) {
        done.error ??= messageOf(e);
        continue;
      }
      done.duplicates++;
    }
    done.words.push(entry.word);
    left--;
    try {
      await chrome.storage.local.remove(key);
    } catch {
      // Still listed, so it is tried again — and Anki calls it a duplicate.
    }
  }
  return { ...done, remaining: left };
}

let running: Promise<CardFlush | null> | null = null;
let following: Promise<CardFlush | null> | null = null;

/**
 * Add every waiting card to Anki. Null when Anki cannot be reached, with
 * nothing changed. `audioFor` fetches each card's recording as it goes in.
 *
 * One flush at a time per page. Asking during one queues exactly one more,
 * which picks up any card kept meanwhile.
 */
export function flushCards(audioFor?: (want: AudioWanted) => Promise<CardAudio | null>): Promise<CardFlush | null> {
  if (!running) {
    running = runFlush(audioFor).finally(() => {
      running = null;
    });
    return running;
  }
  following ??= running.then(
    () => {
      following = null;
      return flushCards(audioFor);
    },
    () => {
      following = null;
      return flushCards(audioFor);
    },
  );
  return following;
}
