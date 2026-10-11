/**
 * Service worker. Owns the offscreen document's lifecycle, and relays the few
 * requests a content script cannot make itself: AnkiConnect, audio, and
 * page-world injection. Each relay carries only what the extension uses.
 *
 * The tokenizer cannot live here: MV3 service workers are killed aggressively
 * and have no OPFS. It cannot live in a content script either, where OPFS
 * belongs to the host page's origin and WASM is subject to the page's CSP.
 * The offscreen document is the only correct home, and this file creates it.
 */

import { relay } from './anki/direct';
import { MAX_AUDIO_BYTES, TEMPLATE_KEY, audioUrlAllowed } from './audio/pronounce';
import { NAVER_API } from './audio/recordings';
import type { CaptureFailure } from './audio/tab-capture';
import { UI_LANGUAGES } from './i18n/languages';

const OFFSCREEN_PATH = 'offscreen.html';

/**
 * Page-world scripts a content script may ask to have injected. Only Netflix
 * needs this route; anything else asking is not one of ours.
 */
const MAIN_WORLD_FILES: ReadonlySet<string> = new Set(['inject-netflix.js']);

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
        reasons: [chrome.offscreen.Reason.WORKERS, chrome.offscreen.Reason.USER_MEDIA],
        justification:
          'Runs the morphological analyser (WASM) with OPFS-backed dictionaries, and records a ' +
          "tab's sound for sentence audio when the learner has turned that on.",
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

/** The user's own audio template, if one is set; its host is the one extra host allowed. */
async function audioTemplate(): Promise<unknown> {
  try {
    return (await chrome.storage.sync.get(TEMPLATE_KEY))[TEMPLATE_KEY];
  } catch {
    return undefined;
  }
}

/** The body, or null past `cap` bytes — stopping the download rather than buffering it first. */
async function readCapped(res: Response, cap: number): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > cap) return null;
  if (!res.body) {
    const whole = new Uint8Array(await res.arrayBuffer());
    return whole.length > cap ? null : whole;
  }
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > cap) {
      void reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
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
 *
 * That exemption is why this is narrow: only the audio hosts pronounce.ts
 * uses, checked again where a redirect lands, no cookies sent, and a size
 * cap. Anything wider would let a content script fetch as the extension.
 */
/**
 * Wikimedia asks every program that reads from it to say what it is, and
 * limits those that do not. A browser will not let a page name itself in
 * User-Agent, so Wikimedia reads this header in its place.
 */
function wikimediaHeaders(url: string): Record<string, string> | null {
  if (!/(^|\.)wikimedia\.org$/.test(new URL(url).hostname)) return null;
  return { 'Api-User-Agent': `Libregaku/${chrome.runtime.getManifest().version} (https://github.com/donth77/libregaku)` };
}

/**
 * Naver's dictionary answers a search only when the request says it comes
 * from its own page, and a fetch cannot set that header. So the browser is
 * asked to add it to this extension's searches, and to nothing else.
 */
const NAVER_REFERER_RULE = 1;

async function refererForNaver(): Promise<void> {
  await chrome.declarativeNetRequest.updateSessionRules({
    removeRuleIds: [NAVER_REFERER_RULE],
    addRules: [{
      id: NAVER_REFERER_RULE,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
        requestHeaders: [{
          header: 'referer',
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: 'https://korean.dict.naver.com/',
        }],
      },
      condition: {
        urlFilter: `|${NAVER_API}`,
        initiatorDomains: [chrome.runtime.id],
        resourceTypes: [chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST],
      },
    }],
  });
}

async function fetchAudio(url: string): Promise<{ ok: boolean; status?: number; type?: string; bytes?: string; error?: string }> {
  const template = await audioTemplate();
  if (!audioUrlAllowed(url, template)) return { ok: false, error: 'not an audio source Libregaku uses' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    if (url.startsWith(NAVER_API)) await refererForNaver();
    const headers = wikimediaHeaders(url);
    const res = await fetch(url, { credentials: 'omit', signal: ctl.signal, ...(headers ? { headers } : {}) });
    // A redirect can land anywhere; what matters is where the bytes came from.
    if (!audioUrlAllowed(res.url || url, template)) {
      return { ok: false, status: res.status, error: 'audio redirected to a host Libregaku does not use' };
    }
    if (!res.ok) return { ok: false, status: res.status };
    const view = await readCapped(res, MAX_AUDIO_BYTES);
    if (!view) return { ok: false, status: res.status, error: 'too large to be a recording' };
    let bin = '';
    for (let i = 0; i < view.length; i += 0x8000) bin += String.fromCharCode(...view.subarray(i, i + 0x8000));
    return { ok: true, status: res.status, type: res.headers.get('content-type') ?? 'audio/mpeg', bytes: btoa(bin) };
  } finally {
    clearTimeout(timer);
  }
}

/** A message for the offscreen document, which is made if it is not there yet. */
async function toOffscreen(msg: Record<string, unknown>): Promise<unknown> {
  await ensureOffscreen();
  return chrome.runtime.sendMessage({ target: 'offscreen', ...msg });
}

/**
 * Why the tab's sound could not be had. The toolbar popup says it in the
 * interface language from `code`, a key of src/i18n/en/errors.ts: this worker
 * does not follow that language. The English in `error` is what the popup
 * showed before it read `code`, and can go once it does.
 */
function captureFailed(code: CaptureFailure, error: string): { ok: false; code: CaptureFailure; error: string } {
  return { ok: false, code, error };
}

async function startTabCapture(tabId: number): Promise<unknown> {
  if (typeof chrome.tabCapture?.getMediaStreamId !== 'function') {
    return captureFailed('captureNotAllowed', 'Allow sentence audio on this site in Libregaku’s settings first.');
  }
  const streamId = await new Promise<string | null>((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      // Refused when the learner has not invoked the extension on this tab.
      const err = chrome.runtime.lastError;
      // Chrome's own words, when it gives any, are passed on as they are.
      if (err?.message !== undefined) reject(new Error(err.message));
      else resolve(err || !id ? null : id);
    });
  });
  if (!streamId) return captureFailed('captureRefused', 'Chrome would not capture this tab');
  return toOffscreen({ type: 'capture-open', tabId, streamId });
}

chrome.runtime.onMessage.addListener((msg: { type?: string; file?: string; action?: string; params?: Record<string, unknown>; url?: string; tabId?: number; topic?: string; lang?: string }, sender, sendResponse) => {
  // Only this extension's own pages and content scripts. Nothing is
  // externally connectable today; this keeps it that way if that changes.
  if (sender.id !== chrome.runtime.id) return false;

  if (msg?.type === 'fetch-audio' && typeof msg.url === 'string') {
    fetchAudio(msg.url).then(sendResponse, (e: unknown) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  // All AnkiConnect traffic funnels through here, so it presents one origin —
  // and only for the actions the extension itself uses, with the ones that
  // change existing notes held to its own hand marks.
  if (msg?.type === 'anki') {
    void relay(msg.action, msg.params).then(sendResponse);
    return true;
  }

  // The interface in a language other than English: its words are a file of
  // their own (src/i18n), run into the content script's world that asked.
  if (msg?.type === 'load-strings') {
    const tabId = sender.tab?.id;
    const lang = msg.lang ?? '';
    if (tabId == null || lang === 'en' || !(UI_LANGUAGES as readonly string[]).includes(lang)) {
      sendResponse({ ok: false });
      return true;
    }
    chrome.scripting.executeScript({ target: { tabId, frameIds: [sender.frameId ?? 0] }, files: [`i18n/${lang}.js`] })
      .then(() => sendResponse({ ok: true }), (e: unknown) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }

  if (msg?.type === 'inject-main-world') {
    const tabId = sender.tab?.id;
    if (tabId == null || !msg.file) {
      sendResponse({ ok: false, error: 'no tab or file' });
      return true;
    }
    if (!MAIN_WORLD_FILES.has(msg.file)) {
      sendResponse({ ok: false, error: `${msg.file} is not a page script Libregaku injects` });
      return true;
    }
    injectMainWorld(tabId, msg.file).then(
      () => sendResponse({ ok: true }),
      (e: unknown) => sendResponse({ ok: false, error: String(e) }),
    );
    return true;
  }

  // Sentence audio from a tab's sound (src/audio/tab-capture.ts). Started
  // from the toolbar popup: Chrome only allows it after the learner has
  // invoked the extension on that tab, and only with the optional
  // tabCapture permission granted.
  if (msg?.type === 'tab-capture-start' && typeof msg.tabId === 'number') {
    startTabCapture(msg.tabId).then(sendResponse, (e: unknown) =>
      sendResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    return true;
  }
  // The rest are asked by a content script, always about its own tab.
  const tabId = sender.tab?.id;
  if ((msg?.type === 'capture-status' || msg?.type === 'record-start' || msg?.type === 'record-stop') && tabId != null) {
    toOffscreen({ type: msg.type === 'capture-status' ? 'capture-has' : msg.type, tabId }).then(
      sendResponse,
      () => sendResponse({ ok: false, capturing: false }),
    );
    return true;
  }
  if (msg?.type === 'capture-permission') {
    chrome.permissions.contains({ permissions: ['tabCapture'] }).then(
      (granted) => sendResponse({ ok: true, granted }),
      () => sendResponse({ ok: true, granted: false }),
    );
    return true;
  }
  if (msg?.type === 'open-options') {
    void chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }

  // A page cannot open an extension page itself; the help, from the panel, comes through here.
  if (msg?.type === 'open-help') {
    const topic = typeof msg.topic === 'string' && /^[a-z0-9-]+$/.test(msg.topic) ? `#${msg.topic}` : '';
    void chrome.tabs.create({ url: chrome.runtime.getURL(`help.html${topic}`) });
    sendResponse({ ok: true });
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
