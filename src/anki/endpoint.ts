/**
 * Where AnkiConnect lives, and which origin it will be asked to allow.
 *
 * Its own module because the settings UI needs to name both, and the
 * transport that uses them belongs to the service worker alone.
 */

export const ANKI_PORT = 8765;
export const ENDPOINT = `http://127.0.0.1:${ANKI_PORT}`;

/** AnkiWeb's code for the AnkiConnect add-on, pasted into Get Add-ons. */
export const ADDON_CODE = '2055492159';
export const ADDON_URL = 'https://ankiweb.net/shared/info/2055492159';
export const ANKI_URL = 'https://apps.ankiweb.net/';

/**
 * The one origin AnkiConnect ever sees from us, and so the one line it needs
 * in `webCorsOriginList`. Every call is relayed by the service worker for
 * exactly this reason — see the note in `direct.ts`.
 */
export function extensionOrigin(): string {
  try {
    return chrome.runtime.getURL('').replace(/\/$/, '');
  } catch {
    return 'chrome-extension://<this extension>';
  }
}
