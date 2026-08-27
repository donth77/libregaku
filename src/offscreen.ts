/**
 * Offscreen document — the WASM and OPFS host.
 *
 * M0 establishes the message plumbing only. M2 loads lindera-wasm here and
 * downloads its dictionary into OPFS; nothing above this file changes when it
 * does, because callers speak to the `Segmenter` interface, not to lindera.
 */

type Req = { target?: string; type: string };

chrome.runtime.onMessage.addListener((msg: Req, _sender, sendResponse) => {
  if (msg?.target !== 'offscreen') return false;

  switch (msg.type) {
    case 'ping':
      sendResponse({ ok: true, ready: true });
      return true;
    default:
      sendResponse({ ok: false, error: `unknown message: ${msg.type}` });
      return true;
  }
});
