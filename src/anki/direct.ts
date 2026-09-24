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

const VERSION = 6;

/**
 * Why a call did not go through. Four failures that look identical to a
 * caller and need four different things done about them:
 *
 *   offline   nothing is listening — Anki is closed, or has no add-on
 *   blocked   AnkiConnect is there and refused this extension's origin
 *   occupied  something answered, but it is not AnkiConnect
 *   refused   AnkiConnect ran the call and said no
 *
 * Collapsing these into one boolean is how "open Anki" ends up on screen
 * while Anki is already open.
 */
export type AnkiFailure = 'offline' | 'blocked' | 'occupied' | 'refused';

export interface AnkiResult<T> {
  ok: boolean;
  result?: T;
  error?: string;
  kind?: AnkiFailure;
  /** True when Anki simply is not running, which is normal rather than a fault. */
  offline?: boolean;
}


export async function ankiDirect<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<AnkiResult<T>> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: VERSION, params }),
    });
  } catch {
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
  let body: { result?: T; error?: string | null } | null = null;
  try {
    body = (await res.json()) as { result?: T; error?: string | null };
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object' || !('result' in body || 'error' in body)) {
    return {
      ok: false,
      kind: 'occupied',
      error: `Something other than AnkiConnect is using port ${ANKI_PORT}.`,
    };
  }

  if (body.error) return { ok: false, kind: 'refused', error: body.error };
  return { ok: true, result: body.result };
}
