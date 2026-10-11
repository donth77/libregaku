/**
 * The only place that actually talks to AnkiConnect.
 *
 * Imported solely by the service worker, and that is the point. In MV3 a
 * content-script fetch carries the *host page's* origin, so calling AnkiConnect
 * from a content script on Netflix presents `Origin: https://www.netflix.com`.
 * AnkiConnect checks that header against its `webCorsOriginList` and refuses
 * anything unlisted — so every user would have to whitelist every streaming
 * site they watch, and would still be told only that the request failed.
 *
 * Routing through the service worker gives one stable origin —
 * `chrome-extension://<id>` — which is a single line of AnkiConnect config and
 * the same for every site.
 */

import { ANKI_PORT, ENDPOINT, extensionOrigin } from './endpoint';
import { MARK_SEARCH, MEDIA_PREFIX, MODEL_NAME, isOwnMedia } from './model';

const VERSION = 6;

/**
 * Why a call did not go through. Five failures that look identical to a
 * caller and need five different things done about them:
 *
 *   offline   nothing is listening — Anki is closed, or has no add-on
 *   blocked   AnkiConnect is there and refused this extension's origin
 *   occupied  something answered, but it is not AnkiConnect
 *   refused   AnkiConnect ran the call and said no
 *   timeout   something took the connection and never answered — Anki busy
 *             with a sync or a long operation, or a program that hangs
 *
 * Collapsing these into one boolean is how "open Anki" ends up on screen
 * while Anki is already open.
 */
export type AnkiFailure = 'offline' | 'blocked' | 'occupied' | 'refused' | 'timeout';

/** The media a new note can carry, as AnkiConnect names them. */
export type MediaKind = 'audio' | 'video' | 'picture';

/**
 * What went wrong, where it is this side's to explain: a code, and the
 * values the words need. The service worker does not follow the interface
 * language, so it never puts a reason into words; the page does, in its own
 * (ankiReason in rpc.ts, from src/i18n/en/anki.ts).
 */
export type AnkiReason =
  | { code: 'offline'; port: number }
  | { code: 'timeout'; port: number; seconds: number }
  | { code: 'blocked'; origin: string }
  /** Something on the port answered with an HTTP error. */
  | { code: 'http'; port: number; status: number }
  /** Something on the port answered, but not as AnkiConnect does. */
  | { code: 'notAnkiConnect'; port: number }
  | { code: 'notRelayed'; action: string }
  /** Media AnkiConnect would have fetched, or read from disk, itself. */
  | { code: 'mediaNotFetched'; media: MediaKind }
  | { code: 'mediaEmpty'; media: MediaKind }
  /** Media under a name that is not one of the extension's. */
  | { code: 'mediaName'; prefix: string }
  | { code: 'idsNeeded'; action: string; ids: 'notes' | 'cards' }
  /** A change, held to the hand marks, that named `count` notes or cards that are not marks. */
  | { code: 'notMarks'; count: number; ids: 'notes' | 'cards'; change: 'delete' | 'suspend' | 'retag' };

export interface AnkiResult<T> {
  ok: boolean;
  result?: T;
  /**
   * What went wrong, in words. From the service worker only AnkiConnect's
   * own, as it wrote them; the page adds the words for `reason`.
   */
  error?: string;
  /** Why, when the failure is this side's to explain rather than AnkiConnect's. */
  reason?: AnkiReason;
  kind?: AnkiFailure;
  /** True when Anki simply is not running, which is normal rather than a fault. */
  offline?: boolean;
}

/**
 * The actions the extension uses, and so the only ones the service worker
 * will relay. AnkiConnect can also delete decks, notes and media; a relay
 * that forwarded whatever it was handed would lend all of that to any bug
 * that reached it.
 */
export const RELAYED_ACTIONS: ReadonlySet<string> = new Set([
  'version',
  'modelNames',
  'modelFieldNames',
  'createModel',
  'deckNames',
  'createDeck',
  'addNote',
  'addNotes',
  'findNotes',
  'findCards',
  'notesInfo',
  'guiBrowse',
  // Hand marks only — see MARKS_ONLY.
  'addTags',
  'removeTags',
  'suspend',
  'deleteNotes',
]);

export function isRelayed(action: unknown): action is string {
  return typeof action === 'string' && RELAYED_ACTIONS.has(action);
}

/** The answer to an action the relay will not carry. */
export function notRelayed(action: unknown): AnkiResult<never> {
  return {
    ok: false,
    kind: 'refused',
    reason: { code: 'notRelayed', action: String(action) },
  };
}

/**
 * Actions that change notes or cards already in the collection, and which
 * ids each one takes. The extension only ever points them at its own hand
 * marks, so the relay holds them to that: it looks the marks up itself and
 * refuses a request naming anything else. Whatever reaches the relay, the
 * learner's real cards cannot be deleted, suspended or retagged through it.
 */
const MARKS_ONLY: Record<string, { ids: 'notes' | 'cards'; find: 'findNotes' | 'findCards' }> = {
  deleteNotes: { ids: 'notes', find: 'findNotes' },
  suspend: { ids: 'cards', find: 'findCards' },
  addTags: { ids: 'notes', find: 'findNotes' },
  removeTags: { ids: 'notes', find: 'findNotes' },
};

/**
 * How long after it was made a card can still be taken back out: Undo, for a
 * card added a moment ago by mistake, not a way to delete cards. A note's id
 * is the time it was made, in milliseconds.
 */
export const UNDO_WINDOW_MS = 15 * 60_000;

/**
 * Of these note ids, the ones Undo may delete: Libregaku cards made in the
 * last few minutes, not one of whose cards has been studied.
 */
async function undoable(ids: number[], now = Date.now()): Promise<AnkiResult<Set<number>>> {
  const recent = ids.filter((id) => id <= now && now - id < UNDO_WINDOW_MS);
  if (!recent.length) return { ok: true, result: new Set() };
  const nids = `nid:${recent.join(',')}`;
  const ours = await ankiDirect<number[]>('findNotes', { query: `${nids} note:"${MODEL_NAME}"` });
  if (!ours.ok) return { ok: false, kind: ours.kind, offline: ours.offline, error: ours.error, reason: ours.reason };
  const studied = await ankiDirect<number[]>('findNotes', { query: `${nids} -is:new` });
  if (!studied.ok) {
    return { ok: false, kind: studied.kind, offline: studied.offline, error: studied.error, reason: studied.reason };
  }
  const seen = new Set(studied.result ?? []);
  return { ok: true, result: new Set((ours.result ?? []).filter((id) => !seen.has(id))) };
}

/**
 * What is wrong with the media a new note asks AnkiConnect to store, or null.
 *
 * AnkiConnect will fetch a URL, or read any path on the computer, into the
 * collection — and from there into every synced device — and it replaces a
 * file of the same name that other notes may use. The extension only ever
 * sends bytes it fetched itself, under a name of its own, so that is all the
 * relay carries.
 */
export function mediaProblem(note: unknown): AnkiReason | null {
  if (!note || typeof note !== 'object') return null;
  for (const kind of ['audio', 'video', 'picture'] as const) {
    const raw = (note as Record<string, unknown>)[kind];
    if (raw === undefined || raw === null) continue;
    for (const m of Array.isArray(raw) ? raw : [raw]) {
      const { data, url, path, filename } = (m && typeof m === 'object' ? m : {}) as Record<string, unknown>;
      if (url !== undefined || path !== undefined) return { code: 'mediaNotFetched', media: kind };
      if (typeof data !== 'string' || !data) return { code: 'mediaEmpty', media: kind };
      if (!isOwnMedia(filename)) return { code: 'mediaName', prefix: MEDIA_PREFIX };
    }
  }
  return null;
}

/**
 * The service worker's side of every AnkiConnect call: only the actions the
 * extension uses, the ones that touch existing notes only on mark notes, and
 * new notes only with media of the extension's own.
 */
export async function relay<T>(action: unknown, params: unknown): Promise<AnkiResult<T>> {
  if (!isRelayed(action)) return notRelayed(action);
  const p = params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
  if (action === 'addNote' || action === 'addNotes') {
    const notes = action === 'addNote' ? [p.note] : Array.isArray(p.notes) ? (p.notes as unknown[]) : [];
    for (const note of notes) {
      const problem = mediaProblem(note);
      if (problem) return { ok: false, kind: 'refused', reason: problem };
    }
  }
  const rule = MARKS_ONLY[action];
  if (rule) {
    const raw = p[rule.ids];
    const ids: unknown[] = Array.isArray(raw) ? (raw as unknown[]) : [];
    if (!Array.isArray(raw) || !ids.every((id): id is number => Number.isInteger(id))) {
      return { ok: false, kind: 'refused', reason: { code: 'idsNeeded', action, ids: rule.ids } };
    }
    const own = await ankiDirect<number[]>(rule.find, { query: MARK_SEARCH });
    if (!own.ok) return { ok: false, kind: own.kind, offline: own.offline, error: own.error, reason: own.reason };
    const marks = new Set(own.result ?? []);
    let others = ids.filter((id) => !marks.has(id));
    // Undo: a card made a moment ago, and never studied, may go again.
    if (others.length && action === 'deleteNotes') {
      const fresh = await undoable(others);
      if (!fresh.ok) {
        return { ok: false, kind: fresh.kind, offline: fresh.offline, error: fresh.error, reason: fresh.reason };
      }
      others = others.filter((id) => !fresh.result?.has(id));
    }
    const foreign = others.length;
    if (foreign) {
      const change = action === 'deleteNotes' ? 'delete' : action === 'suspend' ? 'suspend' : 'retag';
      return { ok: false, kind: 'refused', reason: { code: 'notMarks', count: foreign, ids: rule.ids, change } };
    }
  }
  return ankiDirect<T>(action, p);
}

/**
 * How long each call may take before it counts as unanswered.
 *
 * A version check answers at once or not at all, and the settings panel waits
 * on it, so it gets little patience. Reading a chunk of notes out of a large
 * collection genuinely takes a while.
 */
function patienceFor(action: string): number {
  if (action === 'version') return 5_000;
  if (action === 'notesInfo' || action === 'findNotes' || action === 'findCards') return 60_000;
  return 20_000;
}

export async function ankiDirect<T>(
  action: string,
  params: Record<string, unknown> = {},
  timeoutMs = patienceFor(action),
): Promise<AnkiResult<T>> {
  // Without a limit, a listener that accepts and never answers holds the
  // caller until the worker itself is killed — "Checking…" for minutes.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const timedOut = (): AnkiResult<T> => ({
    ok: false,
    kind: 'timeout',
    reason: { code: 'timeout', port: ANKI_PORT, seconds: Math.round(timeoutMs / 1000) },
  });

  try {
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version: VERSION, params }),
        signal: ctl.signal,
      });
    } catch {
      if (ctl.signal.aborted) return timedOut();
      return {
        ok: false,
        kind: 'offline',
        offline: true,
        reason: { code: 'offline', port: ANKI_PORT },
      };
    }

    if (res.status === 403) {
      // AnkiConnect's own rejection, not a network problem. Say exactly what to
      // change, because the message it returns does not.
      return {
        ok: false,
        kind: 'blocked',
        reason: { code: 'blocked', origin: extensionOrigin() },
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        kind: 'occupied',
        reason: { code: 'http', port: ANKI_PORT, status: res.status },
      };
    }

    // A reply that is not AnkiConnect's JSON means another program has the
    // port. Anki will not get it back until that program lets go.
    const body: unknown = await res.json().catch(() => null);
    if (body === null && ctl.signal.aborted) return timedOut();
    // AnkiConnect always sends both keys, and its error is a string or null.
    // Another JSON service — a JSON-RPC server, say — may send one of them
    // with an object in it, and must not be mistaken for AnkiConnect saying no.
    if (!isEnvelope<T>(body)) {
      return {
        ok: false,
        kind: 'occupied',
        reason: { code: 'notAnkiConnect', port: ANKI_PORT },
      };
    }

    // AnkiConnect's own words, passed on as it wrote them.
    if (body.error) return { ok: false, kind: 'refused', error: body.error };
    return { ok: true, result: body.result };
  } finally {
    clearTimeout(timer);
  }
}

function isEnvelope<T>(body: unknown): body is { result: T; error: string | null } {
  if (body === null || typeof body !== 'object') return false;
  if (!('result' in body) || !('error' in body)) return false;
  return body.error === null || typeof body.error === 'string';
}
