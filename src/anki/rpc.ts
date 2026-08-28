import type { AnkiResult } from './direct';

/**
 * Client side of the Anki bridge. Every caller outside the service worker goes
 * through here so that AnkiConnect only ever sees one origin.
 */
export async function ankiCall<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = (await chrome.runtime.sendMessage({
    type: 'anki',
    action,
    params,
  })) as AnkiResult<T> | undefined;

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
