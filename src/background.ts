/**
 * Service worker. Owns the offscreen document's lifecycle — nothing else.
 *
 * The tokenizer cannot live here: MV3 service workers are killed aggressively
 * and have no OPFS. It cannot live in a content script either, where OPFS
 * belongs to the host page's origin and WASM is subject to the page's CSP.
 * The offscreen document is the only correct home, and this file creates it.
 */

import { ankiDirect } from './anki/direct';

const OFFSCREEN_PATH = 'offscreen.html';

/*
 * Show setup once on install. The language pair is the one thing that cannot
 * be guessed — everything else has a defensible default — and discovering it
 * was wrong by watching nothing happen is a bad first run.
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== 'install') return;
  void chrome.runtime.openOptionsPage();
});

let creating: Promise<void> | null = null;

async function hasOffscreen(): Promise<boolean> {
  const ctxs = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  return ctxs.length > 0;
}

/**
 * Wait until the offscreen document can actually answer.
 *
 * Both createDocument() and getContexts() report the document as present the
 * moment it exists, which is before its module has run and registered a
 * message listener. Anything sent in that window reaches no receiver and
 * resolves to undefined, which every caller reads as "unavailable" — so the
 * analyser silently stayed on tier 0, with no readings and no furigana, while
 * the dictionary, racing it for the same document, loaded fine.
 *
 * The offscreen document answers 'ping' as soon as it is listening, so wait
 * for that rather than for the document's existence.
 */
async function offscreenReady(timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const r = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'ping' })) as
        | { ok?: boolean }
        | undefined;
      if (r?.ok) return;
    } catch {
      // No receiver yet. That is exactly the window this loop covers.
    }
    // Out of patience: return anyway and let the caller report its own
    // failure, which names what it was trying to do.
    if (Date.now() >= deadline) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export async function ensureOffscreen(): Promise<void> {
  if (!creating && !(await hasOffscreen())) {
    creating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_PATH,
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'Runs the morphological analyser (WASM) with OPFS-backed dictionaries.',
      })
      // Two callers can arrive together and both miss hasOffscreen(); the
      // loser is told a document already exists, which is what it wanted.
      .catch(() => undefined)
      .finally(() => {
        creating = null;
      });
  }
  await creating;
  await offscreenReady();
}

/**
 * Inject a page-world script on behalf of a content script.
 *
 * Content scripts declared with `world: "MAIN"` are subject to the *page's*
 * CSP, and Netflix's blocks them outright — the hook simply never runs. An
 * injection initiated by the extension is not subject to page CSP, so routing
 * it through here is the only way onto pages that lock the main world down.
 */
async function injectMainWorld(tabId: number, file: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [file],
    world: 'MAIN',
    injectImmediately: true,
  });
}

/**
 * Fetch a recording on a content script's behalf.
 *
 * A content script's fetch is bound by the host page's CORS policy, and
 * neither jpod101 nor the CDN it now redirects to sends
 * Access-Control-Allow-Origin — so from a content script every recording
 * failed as "Failed to fetch" and the card fell back to synthesis without
 * saying why. Host permissions apply here and CORS does not. Bytes travel
 * back as base64 because messages are JSON.
 */
async function fetchAudio(url: string): Promise<{ ok: boolean; status?: number; type?: string; bytes?: string; error?: string }> {
  if (!/^https:\/\//.test(url)) return { ok: false, error: 'only https URLs are fetched' };
  const res = await fetch(url);
  if (!res.ok) return { ok: false, status: res.status };
  const view = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < view.length; i += 0x8000) bin += String.fromCharCode(...view.subarray(i, i + 0x8000));
  return { ok: true, status: res.status, type: res.headers.get('content-type') ?? 'audio/mpeg', bytes: btoa(bin) };
}

chrome.runtime.onMessage.addListener((msg: { type?: string; file?: string; action?: string; params?: Record<string, unknown>; url?: string }, sender, sendResponse) => {
  if (msg?.type === 'fetch-audio' && typeof msg.url === 'string') {
    fetchAudio(msg.url).then(sendResponse, (e: unknown) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  // All AnkiConnect traffic funnels through here, so it presents one origin.
  if (msg?.type === 'anki' && msg.action) {
    void ankiDirect(msg.action, msg.params ?? {}).then(sendResponse);
    return true;
  }

  if (msg?.type === 'inject-main-world') {
    const tabId = sender.tab?.id;
    if (tabId == null || !msg.file) {
      sendResponse({ ok: false, error: 'no tab or file' });
      return true;
    }
    injectMainWorld(tabId, msg.file).then(
      () => sendResponse({ ok: true }),
      (e: unknown) => sendResponse({ ok: false, error: String(e) }),
    );
    return true;
  }

  if (msg?.type === 'ensure-offscreen') {
    ensureOffscreen().then(
      () => sendResponse({ ok: true }),
      (e: unknown) => sendResponse({ ok: false, error: String(e) }),
    );
    return true; // async
  }
  return false;
});
