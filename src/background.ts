/**
 * Service worker. Owns the offscreen document's lifecycle — nothing else.
 *
 * The tokenizer cannot live here: MV3 service workers are killed aggressively
 * and have no OPFS. It cannot live in a content script either, where OPFS
 * belongs to the host page's origin and WASM is subject to the page's CSP.
 * The offscreen document is the only correct home, and this file creates it.
 */

const OFFSCREEN_PATH = 'offscreen.html';

let creating: Promise<void> | null = null;

async function hasOffscreen(): Promise<boolean> {
  const ctxs = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  return ctxs.length > 0;
}

export async function ensureOffscreen(): Promise<void> {
  if (await hasOffscreen()) return;
  if (creating) return creating;

  creating = chrome.offscreen
    .createDocument({
      url: OFFSCREEN_PATH,
      reasons: [chrome.offscreen.Reason.WORKERS],
      justification: 'Runs the morphological analyser (WASM) with OPFS-backed dictionaries.',
    })
    .finally(() => {
      creating = null;
    });

  return creating;
}

chrome.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
  if (msg?.type === 'ensure-offscreen') {
    ensureOffscreen().then(
      () => sendResponse({ ok: true }),
      (e: unknown) => sendResponse({ ok: false, error: String(e) }),
    );
    return true; // async
  }
  return false;
});
