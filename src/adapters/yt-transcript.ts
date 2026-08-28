import type { Cue } from './types';

/**
 * YouTube's own transcript panel, read from the DOM.
 *
 * The signed-URL path is unreliable: `/api/timedtext` needs a proof-of-origin
 * token, and on many setups the player never puts one on the wire — captions
 * display, the CC button reports on, and `getOption('captions','tracklist')`
 * still returns nothing. Four rounds of coaxing did not fix that.
 *
 * But YouTube already fetches the full transcript itself when someone opens
 * "Show transcript", and renders every line with its timestamp. Reading that
 * needs no token, no API and no player internals — only the same kind of DOM
 * work the caption fallback already does, and unlike the caption fallback it
 * yields the *whole* script, which is what the sidebar needs.
 */

const OPEN_BUTTONS = [
  'ytd-video-description-transcript-section-renderer button',
  'button[aria-label*="transcript" i]',
  'ytd-menu-service-item-renderer[aria-label*="transcript" i]',
];

const PANEL = 'ytd-transcript-renderer, ytd-engagement-panel-section-list-renderer[target-id*="transcript"]';
const SEGMENT = 'ytd-transcript-segment-renderer';
const CLOSE = 'ytd-engagement-panel-title-header-renderer button[aria-label*="Close" i]';

function seconds(stamp: string): number {
  const p = stamp.trim().split(':').map(Number);
  if (p.length === 3) return (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0);
  if (p.length === 2) return (p[0] ?? 0) * 60 + (p[1] ?? 0);
  return Number(stamp) || 0;
}

export function readSegments(root: ParentNode = document): Cue[] {
  const cues: Cue[] = [];
  for (const seg of Array.from(root.querySelectorAll<HTMLElement>(SEGMENT))) {
    const stamp = seg.querySelector('.segment-timestamp')?.textContent?.trim();
    const text = seg.querySelector('.segment-text')?.textContent?.trim();
    if (!stamp || !text) continue;
    cues.push({ start: seconds(stamp), end: 0, text });
  }

  // The panel gives start times only; each line runs until the next begins.
  for (let i = 0; i < cues.length; i++) {
    const cur = cues[i]!;
    cur.end = cues[i + 1]?.start ?? cur.start + 6;
  }
  return cues;
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function findAndClickOpen(): Promise<boolean> {
  for (const sel of OPEN_BUTTONS) {
    const btn = document.querySelector<HTMLElement>(sel);
    if (!btn) continue;
    btn.click();
    return true;
  }
  return false;
}

/**
 * Open the panel, read it, put it back.
 *
 * Leaving it open would rearrange the page under someone who never asked for
 * it, so the panel is restored to however it was found.
 */
export async function fetchViaTranscriptPanel(timeoutMs = 6000): Promise<Cue[]> {
  const alreadyOpen = Boolean(document.querySelector(SEGMENT));
  if (!alreadyOpen && !(await findAndClickOpen())) return [];

  const deadline = Date.now() + timeoutMs;
  let cues: Cue[] = [];
  while (Date.now() < deadline) {
    cues = readSegments();
    if (cues.length) break;
    await wait(200);
  }

  if (!alreadyOpen && cues.length) {
    document.querySelector<HTMLElement>(CLOSE)?.click();
  }
  return cues;
}

export function transcriptPanelPresent(): boolean {
  return Boolean(document.querySelector(PANEL) || document.querySelector(OPEN_BUTTONS[0]!));
}
