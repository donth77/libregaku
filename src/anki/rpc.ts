import { ui } from '../i18n';
import type { AnkiReason, AnkiResult } from './direct';

/**
 * Client side of the Anki bridge. Every caller outside the service worker goes
 * through here so that AnkiConnect only ever sees one origin.
 */

/**
 * Why a call failed, in words, in the interface language. The service worker
 * reports only a code, since it does not follow the interface language; the
 * words are the page's, put in when the answer arrives.
 */
export function ankiReason(r: AnkiReason): string {
  const say = ui.anki;
  switch (r.code) {
    case 'offline': return say.offline(r.port);
    case 'timeout': return say.timeout(r.port, r.seconds);
    case 'blocked': return say.blocked(r.origin);
    case 'http': return say.httpAnswer(r.port, r.status);
    case 'notAnkiConnect': return say.notAnkiConnect(r.port);
    case 'notRelayed': return say.notRelayed(r.action);
    case 'mediaNotFetched': return say.mediaNotFetched(r.media);
    case 'mediaEmpty': return say.mediaEmpty(r.media);
    case 'mediaName': return say.mediaName(r.prefix);
    case 'idsNeeded': return say.idsNeeded(r.action, r.ids);
    case 'notMarks': return say.notMarks(r.count, r.ids, r.change);
  }
}

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
    if (!res) return { ok: false, kind: 'offline', offline: true, error: ui.anki.noBackground };
    return res.reason ? { ...res, error: ankiReason(res.reason) } : res;
  } catch (e) {
    // The worker restarting, or the extension being reloaded mid-call.
    return {
      ok: false,
      kind: 'offline',
      offline: true,
      error: e instanceof Error ? e.message : ui.anki.noBackground,
    };
  }
}

export async function ankiCall<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const res = await ankiTry<T>(action, params);

  if (!res) throw new AnkiUnavailable(ui.anki.noBackground);
  if (!res.ok) {
    throw res.offline
      ? new AnkiUnavailable(res.error ?? ui.anki.unreachable)
      : new Error(res.error ?? ui.anki.callFailed);
  }
  return res.result as T;
}

/** Anki being closed is an expected condition, not a bug. */
export class AnkiUnavailable extends Error {}
