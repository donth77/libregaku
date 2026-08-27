import { YouTubeAdapter } from '../adapters/youtube';
import type { Cue, SubtitleSource } from '../adapters/types';
import { IntlSegmenter } from '../morphology/intl';
import type { Segmenter, Token } from '../morphology/types';
import { DomCaptionSource } from '../adapters/dom-captions';
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

const ADAPTERS: SubtitleSource[] = [new YouTubeAdapter()];

let overlay: Overlay | null = null;
let cues: Cue[] = [];
let segmented = new Map<number, Token[]>();
let active = -1;
let raf = 0;
let domSource: DomCaptionSource | null = null;

function pickAdapter(): SubtitleSource | null {
  return ADAPTERS.find((a) => a.matches(location.href)) ?? null;
}

function makeSegmenter(): Segmenter | null {
  if (IntlSegmenter.supported) return new IntlSegmenter(TARGET_LANG);
  console.warn('libregaku: Intl.Segmenter unavailable; cannot segment');
  return null;
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
      let toks = segmented.get(i);
      if (!toks) {
        const cue = cues[i];
        toks = cue ? (seg.segment(cue.text) as Token[]) : [];
        segmented.set(i, toks);
      }
      overlay?.render(toks);
    }
  }
  raf = requestAnimationFrame(() => tick(video, seg));
}

let starting = false;

async function start(): Promise<void> {
  if (starting) return;
  starting = true;
  try {
    await run();
  } finally {
    starting = false;
  }
}

async function run(): Promise<void> {
  const adapter = pickAdapter();
  if (!adapter) return log('no adapter for', location.href);

  const seg = makeSegmenter();
  if (!seg) return;

  const video = adapter.video();
  if (!video) return log('waiting: video element not in the DOM yet');

  // #movie_player is the full-size, positioned player root. The video's
  // immediate parent (.html5-video-container) is sized to the video itself and
  // can clip an overlay.
  const mount =
    document.querySelector<HTMLElement>('#movie_player') ??
    video.parentElement;
  if (!mount) return log('waiting: no player container to mount into');
  log('mounting into', mount.id || mount.className || mount.tagName);

  const tracks = await adapter.listTracks();
  if (!tracks.length) return log('waiting: no caption tracks yet');

  log(
    'tracks:',
    tracks.map((t) => `${t.lang}${t.generated ? ' (auto)' : ''}`).join(', '),
  );

  // M0: first track matching the target language; a picker arrives with the UI.
  const track = tracks.find((t) => t.lang.startsWith(TARGET_LANG));
  if (!track) {
    return log(
      `no "${TARGET_LANG}" track on this video — available:`,
      tracks.map((t) => t.lang).join(', ') || '(none)',
    );
  }
  if (track.generated) log('note: this track is auto-generated; segmentation will look rough');

  try {
    cues = await adapter.loadTrack(track.id);
  } catch (err) {
    log('could not fetch the track:', err);
    return startDomFallback(mount, seg);
  }
  if (!cues.length) {
    log('track loaded but contained no cues');
    return startDomFallback(mount, seg);
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
}

/**
 * Tokenize whatever YouTube is currently displaying. Only the current line, but
 * it works wherever captions are visible, which the fetched path does not.
 */
function startDomFallback(mount: HTMLElement, seg: Segmenter): void {
  if (!DomCaptionSource.container()) {
    return log('fallback unavailable: no caption container — turn captions on in the player');
  }

  overlay?.destroy();
  overlay = new Overlay(mount);
  overlay.onToken((tok) => {
    console.log('libregaku token:', tok.surface, seg.hasLemma ? tok.lemma : '(no lemma at tier 0)');
  });

  domSource?.stop();
  domSource = new DomCaptionSource();
  const started = domSource.start((text) => {
    if (!text) return overlay?.clear();
    overlay?.render(seg.segment(text) as Token[]);
  });

  if (!started) return log('fallback could not observe the caption container');

  // Not `libregaku-active`: that hides the container with display:none, and we
  // are reading from it.
  document.documentElement.classList.add('libregaku-reading');
  log('reading captions from the player DOM (current line only — the sidebar will need a fetched track)');
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
    setTimeout(() => void start(), 600);
  });
  // The real trigger: the track list arrives after we first ran.
  a.onTracks(() => void start());
}

log('content script loaded on', location.href);
void start();
