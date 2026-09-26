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
import { MARK_SEARCH } from './model';

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

export interface AnkiResult<T> {
  ok: boolean;
  result?: T;
  error?: string;
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
    error: `Libregaku does not send "${String(action)}" to AnkiConnect.`,
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
 * The service worker's side of every AnkiConnect call: only the actions the
 * extension uses, and the ones that touch existing notes only on mark notes.
 */
export async function relay<T>(action: unknown, params: unknown): Promise<AnkiResult<T>> {
  if (!isRelayed(action)) return notRelayed(action);
  const p = params && typeof params === 'object' ? (params as Record<string, unknown>) : {};
  const rule = MARKS_ONLY[action];
  if (rule) {
    const raw = p[rule.ids];
    const ids: unknown[] = Array.isArray(raw) ? (raw as unknown[]) : [];
    if (!Array.isArray(raw) || !ids.every((id): id is number => Number.isInteger(id))) {
      return { ok: false, kind: 'refused', error: `${action} needs a list of ${rule.ids}.` };
    }
    const own = await ankiDirect<number[]>(rule.find, { query: MARK_SEARCH });
    if (!own.ok) return { ok: false, kind: own.kind, offline: own.offline, error: own.error };
    const marks = new Set(own.result ?? []);
    const foreign = ids.filter((id) => !marks.has(id)).length;
    if (foreign) {
      const verb = action === 'deleteNotes' ? 'deletes' : action === 'suspend' ? 'suspends' : 'retags';
      return {
        ok: false,
        kind: 'refused',
        error: `Refused: ${foreign} of the ${rule.ids} sent ${foreign === 1 ? 'belongs' : 'belong'} to no ` +
          `Libregaku mark. Libregaku only ${verb} its own marks.`,
      };
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
    error:
      `Nothing answered on port ${ANKI_PORT} within ${Math.round(timeoutMs / 1000)} s. ` +
      'Anki may be busy (syncing, or showing a dialog), or another program is holding the port.',
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
        error: `Nothing is listening on port ${ANKI_PORT}.`,
      };
    }

    if (res.status === 403) {
      // AnkiConnect's own rejection, not a network problem. Say exactly what to
      // change, because the message it returns does not.
      return {
        ok: false,
        kind: 'blocked',
        error:
          `AnkiConnect refused ${extensionOrigin()}. In Anki: Tools → Add-ons → ` +
          `AnkiConnect → Config, and add that line to webCorsOriginList.`,
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        kind: 'occupied',
        error: `Something on port ${ANKI_PORT} answered with HTTP ${res.status}. AnkiConnect does not.`,
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
        error: `Something other than AnkiConnect is using port ${ANKI_PORT}.`,
      };
    }

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
