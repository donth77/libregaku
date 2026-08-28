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

chrome.runtime.onMessage.addListener((msg: { type?: string; file?: string; action?: string; params?: Record<string, unknown> }, sender, sendResponse) => {
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
