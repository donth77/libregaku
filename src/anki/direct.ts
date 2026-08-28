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

const ENDPOINT = 'http://127.0.0.1:8765';
const VERSION = 6;

export interface AnkiResult<T> {
  ok: boolean;
  result?: T;
  error?: string;
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
      offline: true,
      error: 'Anki is not reachable. Open Anki and make sure the AnkiConnect add-on is installed.',
    };
  }

  if (res.status === 403) {
    // AnkiConnect's own rejection, not a network problem. Say exactly what to
    // change, because the message it returns does not.
    return {
      ok: false,
      error:
        `AnkiConnect refused this origin. In Anki: Tools → Add-ons → AnkiConnect → ` +
        `Config, and add "${chrome.runtime.getURL('').replace(/\/$/, '')}" to ` +
        `webCorsOriginList.`,
    };
  }
  if (!res.ok) return { ok: false, error: `AnkiConnect returned HTTP ${res.status}` };

  const body = (await res.json()) as { result?: T; error?: string | null };
  if (body.error) return { ok: false, error: body.error };
  return { ok: true, result: body.result };
}
