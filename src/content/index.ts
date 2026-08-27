import { NetflixAdapter } from '../adapters/netflix';
import { YouTubeAdapter } from '../adapters/youtube';
import type { Cue, SubtitleSource } from '../adapters/types';
import { IntlSegmenter } from '../morphology/intl';
import { LinderaSegmenter } from '../morphology/lindera';
import type { Segmenter, Token } from '../morphology/types';
import { DomCaptionSource } from '../adapters/dom-captions';
import { clearNotice, showNotice } from './notice';
import { Overlay } from './renderer';

/**
 * Orchestration: adapter → segmenter → overlay.
 *
 * M0 wires the cheapest possible segmenter (tier 0, built into the browser) so
 * the extension plumbing can be proven before lindera and its 10 MB dictionary
 * enter the picture. M2 swaps the segmenter with no change above this file.
 */

const TARGET_LANG = 'ja'; // M-later: from the active profile

/** Loud by default while the adapters are young. */
const log = (...a: unknown[]) => console.log('%c[libregaku]', 'color:#8AA2E8', ...a);

/** Log a waiting-state once, not once per retry. */
let lastQuiet = '';
/** The assumption behind the current wait, reported if we give up. */
let stalledOn: { id: string; detail?: string } | null = null;
const quiet = (msg: string, id?: string, detail?: string) => {
  if (id) stalledOn = { id, detail };
  if (msg === lastQuiet) return;
  lastQuiet = msg;
  log(msg);
};

const ADAPTERS: SubtitleSource[] = [new YouTubeAdapter(), new NetflixAdapter()];

let overlay: Overlay | null = null;
let cues: Cue[] = [];
let segmented = new Map<number, Token[]>();
let active = -1;
let raf = 0;
let domSource: DomCaptionSource | null = null;

function pickAdapter(): SubtitleSource | null {
  return ADAPTERS.find((a) => a.matches(location.href)) ?? null;
}

let segmenter: Segmenter | null = null;

/**
 * Prefer real morphology, but never block on it. The dictionary is a ~10 MB
 * one-time download; until it lands, tier 0 renders boundaries so the overlay
 * is useful immediately rather than blank.
 */
async function makeSegmenter(): Promise<Segmenter | null> {
  if (segmenter) return segmenter;

  if (!IntlSegmenter.supported) {
    log('Intl.Segmenter unavailable — cannot segment at all');
    return null;
  }
  segmenter = new IntlSegmenter(TARGET_LANG);

  // Upgrade in the background.
  void (async () => {
    try {
      const status = await LinderaSegmenter.status();
      if (!status.ready) log('downloading the Japanese dictionary (~10 MB, once)…');

      const r = await LinderaSegmenter.ensure('ipadic');
      if (!r.ok) {
        log('staying on tier 0 — analyser unavailable:', r.error);
        return;
      }
      segmenter = new LinderaSegmenter();
      segmented = new Map();   // re-segment with lemmas and readings
      active = -1;
      log('upgraded to tier 2 — lemmas, readings and furigana are live');
    } catch (e) {
      log('staying on tier 0 —', e);
    }
  })();

  return segmenter;
}

/** Binary search for the cue covering `t`. */
function cueAt(t: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid];
    if (!c) break;
    if (t < c.start) hi = mid - 1;
    else if (t > c.end) lo = mid + 1;
    else return mid;
  }
  return -1;
}

function paint(i: number): void {
  const cue = cues[i];
  if (!cue) return;
  const cached = segmented.get(i);
  if (cached) {
    overlay?.render(cached, cue.secondary);
    return;
  }
  const result = (segmenter ?? { segment: () => [] as Token[] }).segment(cue.text);
  if (Array.isArray(result)) {
    segmented.set(i, result);
    overlay?.render(result, cue.secondary);
    return;
  }
  void result.then((toks) => {
    segmented.set(i, toks);
    // The cue may have moved on while we were analysing.
    if (active === i) overlay?.render(toks, cue.secondary);
  });
}

function tick(video: HTMLVideoElement, seg: Segmenter): void {
  const i = cueAt(video.currentTime);
  if (i !== active) {
    active = i;
    if (i < 0) {
      // A blank overlay is ambiguous: no cue here, or a broken renderer?
      log(`no cue at ${video.currentTime.toFixed(1)}s` +
          (cues[0] ? ` · first cue starts at ${cues[0].start.toFixed(1)}s` : ''));
      overlay?.clear();
    } else {
      paint(i);
    }
  }
  raf = requestAnimationFrame(() => tick(video, seg));
}

let starting = false;
let rendering = false;
let retries = 0;
let retryTimer = 0;

const MAX_RETRIES = 60;   // ~30s at 500ms
const RETRY_MS = 500;

/**
 * Players mount asynchronously — Netflix in particular builds its <video> well
 * after document_idle. Checking once and giving up is how M1 first failed, so
 * anything that is merely "not ready yet" schedules another attempt.
 */
async function start(): Promise<void> {
  if (starting || rendering) return;
  starting = true;
  try {
    rendering = await run();
    if (rendering) {
      retries = 0;
      return;
    }
  } finally {
    starting = false;
  }

  if (retries++ >= MAX_RETRIES) {
    if (retries === MAX_RETRIES + 1) {
      log('gave up waiting after 30s — reload the tab to retry');
      // Say so on screen. Silence is the failure mode that costs months.
      const adapter = pickAdapter();
      const root = adapter
        ? adapter.playerRoot.reduce<HTMLElement | null>(
            (f, sel) => f ?? document.querySelector<HTMLElement>(sel),
            null,
          )
        : null;
      if (root && stalledOn) showNotice(root, stalledOn.id, stalledOn.detail);
    }
    return;
  }
  clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void start(), RETRY_MS);
}

/** @returns true once cues are on screen; false means "not ready, try again". */
async function run(): Promise<boolean> {
  const adapter = pickAdapter();
  if (!adapter) { quiet('no adapter for ' + location.href); return false; }

  const seg = await makeSegmenter();
  if (!seg) return true;   // unrecoverable; retrying will not help

  const video = adapter.video();
  if (!video) {
    quiet('waiting for the player to mount its video element', 'no-subtitles-on',
          'The player never finished loading.');
    return false;
  }

  // Adapters name their own player root. The video's immediate parent is the
  // wrong choice on both sites: it clips on YouTube, and on Netflix it sits
  // under the control layer, which then swallows hover.
  const mount =
    adapter.playerRoot.reduce<HTMLElement | null>(
      (found, sel) => found ?? document.querySelector<HTMLElement>(sel),
      null,
    ) ?? video.parentElement;
  if (!mount) { quiet('waiting for a player container to mount into'); return false; }

  log('mounting into', mount.id || mount.className || mount.tagName);

  const tracks = await adapter.listTracks();
  if (!tracks.length) {
    // No manifest reached us — on Netflix the page CSP blocks the MAIN-world
    // hook entirely. That only costs us the *whole* transcript; if the player
    // is rendering subtitles we can still read them, so never sit and wait
    // when there is a caption container right there.
    if (new DomCaptionSource(adapter.domCaptions).container()) {
      log('no track list (the page may block our manifest hook) — reading rendered captions instead');
      return startDomFallback(mount, seg, adapter);
    }
    quiet(
      'waiting for a subtitle track list, or for subtitles to be switched on',
      adapter.id === 'netflix' ? 'nf.timedtexttracks' : 'yt.player-response',
      'Subtitles may simply be switched off in the player.',
    );
    return false;
  }

  log(
    'tracks:',
    tracks.map((t) => `${t.lang}${t.generated ? ' (auto)' : ''}`).join(', '),
  );

  // M0: first track matching the target language; a picker arrives with the UI.
  const track = tracks.find((t) => t.lang.startsWith(TARGET_LANG));
  if (!track) {
    const have = tracks.map((t) => t.lang).join(', ');
    log(`no "${TARGET_LANG}" track here — available:`, have);
    showNotice(mount, 'no-target-track', `Available here: ${have || 'none'}`);
    return true;   // the list is known and lacks our language; retrying is pointless
  }
  if (track.generated) log('note: this track is auto-generated; segmentation will look rough');

  try {
    cues = await adapter.loadTrack(track.id);
  } catch (err) {
    log('could not fetch the track:', err);
    return startDomFallback(mount, seg, adapter);
  }
  if (!cues.length) {
    log('track loaded but contained no cues');
    return startDomFallback(mount, seg, adapter);
  }

  log(`rendering ${cues.length} cues · segmenter tier ${seg.tier}` +
      (seg.hasLemma ? '' : ' (no lemmas — Anki matching would be surface-form only)'));

  segmented = new Map();
  active = -1;

  if (getComputedStyle(mount).position === 'static') mount.style.position = 'relative';
  adapter.hideNative();

  overlay?.destroy();
  overlay = new Overlay(mount);
  overlay.onToken((tok) => {
    // M2 opens the dictionary popup here.
    console.log('libregaku token:', tok.surface, seg.hasLemma ? tok.lemma : '(no lemma at tier 0)');
  });

  cancelAnimationFrame(raf);
  tick(video, seg);
  clearNotice();
  stalledOn = null;
  return true;
}

/**
 * Tokenize whatever YouTube is currently displaying. Only the current line, but
 * it works wherever captions are visible, which the fetched path does not.
 */
function startDomFallback(mount: HTMLElement, seg: Segmenter, adapter: SubtitleSource): boolean {
  const source = new DomCaptionSource(adapter.domCaptions);
  if (!source.container()) {
    quiet(
      'waiting for a caption container — are subtitles switched on?',
      adapter.id === 'netflix' ? 'nf.caption-dom' : 'yt.caption-dom',
      `Looked for ${adapter.domCaptions.container}`,
    );
    return false;
  }

  overlay?.destroy();
  overlay = new Overlay(mount);
  overlay.onToken((tok) => {
    console.log('libregaku token:', tok.surface, seg.hasLemma ? tok.lemma : '(no lemma at tier 0)');
  });

  domSource?.stop();
  domSource = source;
  const started = domSource.start((text) => {
    if (!text) return overlay?.clear();
    const result = (segmenter ?? seg).segment(text);
    if (Array.isArray(result)) overlay?.render(result);
    else void result.then((toks) => overlay?.render(toks));
  });

  if (!started) { quiet('could not observe the caption container'); return false; }

  // Not `libregaku-active`: that hides the container with display:none, and we
  // are reading from it.
  document.documentElement.classList.add('libregaku-reading');
  clearNotice();
  stalledOn = null;
  log('reading captions from the player DOM (current line only — the sidebar will need a fetched track)');
  return true;
}

function reset(): void {
  domSource?.stop();
  domSource = null;
  cancelAnimationFrame(raf);
  overlay?.destroy();
  overlay = null;
  cues = [];
  segmented = new Map();
  active = -1;
}

for (const a of ADAPTERS) {
  a.onNavigate(() => {
    reset();
    rendering = false;
    retries = 0;
    lastQuiet = '';
    stalledOn = null;
    clearNotice();
    setTimeout(() => void start(), 600);
  });
  // The real trigger: the track list arrives after we first ran.
  a.onTracks(() => void start());
}

/**
 * Netflix blocks manifest-declared MAIN-world scripts via its CSP, so ask the
 * service worker to inject the hook instead — extension-initiated injection is
 * not subject to the page's policy. Harmless if the declared script already ran.
 */
if (/netflix\.com/.test(location.hostname)) {
  chrome.runtime
    .sendMessage({ type: 'inject-main-world', file: 'inject-netflix.js' })
    .then((r: { ok?: boolean; error?: string } | undefined) => {
      log(r?.ok ? 'injected the page hook via the service worker' : `page hook injection failed: ${r?.error}`);
      void start();
    })
    .catch((e: unknown) => log('page hook injection failed:', e));
}

log('content script loaded on', location.href);
void start();
