import { MODEL_NAME, ROOT_TAG } from './model';

/**
 * What the learner knows, derived from their Anki collection.
 *
 * The central claim of this project: Libregaku stores no authoritative record
 * of your vocabulary. It reads Anki and caches the answer, so what you know
 * stays consistent on your phone, after a reinstall, and in any other tool —
 * with no account and no server.
 *
 * Scoped by *deck*, never by our own tag. A learner's known words live all over
 * their collection, mostly in decks that predate this extension; counting only
 * cards we made would report someone fluent as a beginner.
 */

/**
 * Word statuses, following Migaku's five.
 *
 *   unknown   never carded, never marked
 *   learning  a card exists and is still being drilled
 *   known     the card is mature — Anki's own 21-day threshold, which is also
 *             where Migaku draws the line
 *   tracking  the learner wants this word to stand out: not new, not learned,
 *             just watched. Nothing in Anki expresses this, which is exactly
 *             why it is worth having
 *   ignored   never mark this again — names, particles, words already known
 *             long before this extension existed
 */
export type Status = 'known' | 'learning' | 'tracking' | 'unknown' | 'ignored';

/** Anki's own threshold for a mature card. */
export const MATURE_DAYS = 21;

const ENDPOINT = 'http://127.0.0.1:8765';

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
  });
  if (!res.ok) throw new Error(`AnkiConnect returned HTTP ${res.status}`);
  const body = (await res.json()) as { result?: T; error?: string | null };
  if (body.error) throw new Error(body.error);
  return body.result as T;
}

interface NoteInfo {
  noteId: number;
  cards: number[];
  fields: Record<string, { value: string }>;
}

interface CardInfo {
  note: number;
  interval: number;
  queue: number;
}

/**
 * Which field holds the word being learned.
 *
 * Our own note type is known. Everyone else's is not, so fall back to the
 * first field, which by Anki convention is the sort field and in practice is
 * the expression for essentially every Japanese note type.
 */
function wordOf(note: NoteInfo): string | null {
  const preferred = ['Expression', 'Word', 'Vocabulary', 'Front', 'Kanji', '単語'];
  for (const name of preferred) {
    const v = note.fields[name]?.value?.trim();
    if (v) return strip(v);
  }
  const first = Object.values(note.fields)[0]?.value?.trim();
  return first ? strip(first) : null;
}

/** Fields carry HTML and furigana brackets; the key is the bare expression. */
function strip(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\[[^\]]*\]/g, '')   // 勉強[べんきょう] → 勉強
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export interface StatusMap {
  get(word: string): Status;
  size: number;
}

export async function buildStatusMap(deck: string): Promise<StatusMap> {
  const query = deck ? `deck:"${deck}"` : `note:"${MODEL_NAME}"`;
  const ids = await call<number[]>('findNotes', { query });

  const map = new Map<string, Status>();
  if (!ids.length) return { get: () => 'unknown', size: 0 };

  const notes = await call<NoteInfo[]>('notesInfo', { notes: ids });
  const cards = await call<CardInfo[]>('cardsInfo', { cards: notes.flatMap((n) => n.cards) });

  // A note may have several cards; the most mature one decides.
  const best = new Map<number, CardInfo>();
  for (const c of cards) {
    const prev = best.get(c.note);
    if (!prev || c.interval > prev.interval) best.set(c.note, c);
  }

  for (const note of notes) {
    const word = wordOf(note);
    if (!word) continue;
    const card = best.get(note.noteId);
    // queue -1 is suspended: deliberately set aside, not being learned.
    const status: Status =
      card && card.queue === -1
        ? 'ignored'
        : (card?.interval ?? 0) >= MATURE_DAYS
          ? 'known'
          : 'learning';
    // Never downgrade: a word known in one note stays known.
    const rank = { unknown: 0, ignored: 1, tracking: 2, learning: 3, known: 4 } as const;
    const prev = map.get(word);
    if (!prev || rank[status] > rank[prev]) map.set(word, status);
  }

  return { get: (w) => map.get(w) ?? 'unknown', size: map.size };
}

/** Words marked by hand, which Anki has no way to express on its own. */
export async function loadOverrides(): Promise<Map<string, Status>> {
  try {
    const got = await chrome.storage.sync.get('libregaku.overrides');
    const raw = (got['libregaku.overrides'] ?? {}) as Record<string, Status>;
    return new Map(Object.entries(raw));
  } catch {
    return new Map();
  }
}

export async function setOverride(word: string, status: Status | null): Promise<void> {
  const map = await loadOverrides();
  if (status) map.set(word, status);
  else map.delete(word);
  try {
    await chrome.storage.sync.set({ 'libregaku.overrides': Object.fromEntries(map) });
  } catch {
    /* over quota or unavailable; the session still reflects the change */
  }
}

export { ROOT_TAG };
