import type { AnkiResult } from './direct';

/**
 * Client side of the Anki bridge. Every caller outside the service worker goes
 * through here so that AnkiConnect only ever sees one origin.
 */

/**
 * The same call, reporting failure rather than throwing it.
 *
 * Anything deciding *what to tell the user* wants the reason — closed,
 * blocked, or a port in use are three different instructions — and an
 * exception flattens them back into one.
 */
export async function ankiTry<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<AnkiResult<T>> {
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'anki',
      action,
      params,
    })) as AnkiResult<T> | undefined;
    return res ?? { ok: false, kind: 'offline', offline: true, error: 'The extension background is not responding.' };
  } catch (e) {
    // The worker restarting, or the extension being reloaded mid-call.
    return {
      ok: false,
      kind: 'offline',
      offline: true,
      error: e instanceof Error ? e.message : 'The extension background is not responding.',
    };
  }
}

export async function ankiCall<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await ankiTry<T>(action, params);

  if (!res) throw new AnkiUnavailable('The extension background is not responding.');
  if (!res.ok) {
    throw res.offline
      ? new AnkiUnavailable(res.error ?? 'Anki is not reachable.')
      : new Error(res.error ?? 'AnkiConnect call failed.');
  }
  return res.result as T;
}

/** Anki being closed is an expected condition, not a bug. */
export class AnkiUnavailable extends Error {}
