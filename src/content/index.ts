import { NetflixAdapter } from '../adapters/netflix';
import { pairCues } from '../adapters/pair';
import { YouTubeAdapter } from '../adapters/youtube';
import type { Cue, SubtitleSource, TrackInfo } from '../adapters/types';
import { IntlSegmenter } from '../morphology/intl';
import { LinderaSegmenter } from '../morphology/lindera';
import type { Segmenter, Token } from '../morphology/types';
import { DomCaptionSource } from '../adapters/dom-captions';
import { clearLookupCache, ensureDictionary, lookupWord } from '../dict/client';
import { bottomOffset, namedMatches, occupiedBands } from './coexist';
import { addNote, ensureModel } from '../anki/client';
import { tagsFor, toAnkiFurigana } from '../anki/model';
import { sourceField } from '../anki/source';
import { buildStatusMap, loadOverrides, setOverride, type OverrideStatus, type Status, type StatusMap } from '../anki/status';
import { furigana } from '../morphology/furigana';
import { TIER2_LANGS, jmdictEditionFor, loadSettings, onSettingsChange, settings } from '../settings';
import {
  cancelPopupClose, closePopup, closePopupSoon, popupKey, showPopup, type CardDraft,
} from './popup';
import { Sidebar } from './sidebar';
import { PlayerInset } from './player-inset';
import * as bookmarks from './bookmarks';
import { Header } from './header';
import { Transcript } from './transcript';
import { clearNotice, showNotice } from './notice';
import { Overlay } from './renderer';

/**
 * Orchestration: adapter → segmenter → overlay.
 *
 * M0 wires the cheapest possible segmenter (tier 0, built into the browser) so
 * the extension plumbing can be proven before lindera and its 10 MB dictionary
 * enter the picture. M2 swaps the segmenter with no change above this file.
 */

/** The language being learned, from settings. Never hardcode this again. */
const targetLang = (): string => settings().target;

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
let sidebar: Sidebar | null = null;
let playerInset: PlayerInset | null = null;
let header: Header | null = null;
const transcript = new Transcript();
let activeVideo: HTMLVideoElement | null = null;
let status: StatusMap | null = null;
let overrides = new Map<string, OverrideStatus>();
/** Successful additions awaiting the next Anki snapshot; never persisted. */
const addedCards = new Set<string>();
let statusRequest = 0;
let manualRevision = 0;

/**
 * A token's status, by dictionary form.
 *
 * The lemma is the key, which is the whole reason M2 merges morphemes: 来た has
 * to resolve to 来る or a card you already have will never light up.
 */
function statusOf(tok: Token): Status {
  if (tok.punct || !tok.content) return 'ignored';
  const key = tok.lemma ?? tok.surface;
  const manual = overrides.get(key);
  if (manual) return manual;
  const fromAnki = status?.get(key) ?? 'unknown';
  return addedCards.has(key) && fromAnki !== 'known' ? 'learning' : fromAnki;
}

/** Share of content words already known, for the sidebar. */
export function comprehension(tokens: Token[]): number {
  const words = tokens.filter((t) => t.content && !t.punct);
  if (!words.length) return 1;
  const known = words.filter((t) => statusOf(t) === 'known').length;
  return known / words.length;
}

/**
 * Record a hand-marked status.
 *
 * Applied immediately so the underline changes under the cursor, then written
 * to storage. The optimistic update matters: a status change that takes a
 * round-trip to appear reads as broken.
 */
async function mark(word: string, next: OverrideStatus | null): Promise<void> {
  manualRevision++;
  if (next) overrides.set(word, next);
  else overrides.delete(word);
  repaint();
  await setOverride(word, next);
}

/** Re-render the current line so a status change is visible at once. */
function repaint(): void {
  overlay?.setStatusSource(statusOf);
  sidebar?.refreshAnalysis();
}

async function refreshStatus(): Promise<void> {
  const request = ++statusRequest;
  const revision = manualRevision;
  const nextOverrides = await loadOverrides();
  const scope = settings().statusScope;
  try {
    const next = await buildStatusMap(scope);
    if (request !== statusRequest) return;
    status = next;
    addedCards.clear();
    log(
      status.size
        ? `Anki: ${status.size} words known or learning in ${scope || 'the whole collection'}`
        : 'Anki reachable but nothing found in that scope — everything reads as unknown',
    );
  } catch {
    if (request !== statusRequest) return;
    // Anki being closed is normal, not a fault. Everything simply reads unknown.
    status = null;
    log('Anki not reachable — words will show as unknown until it is running');
  }
  // A manual mark made during the fetch is newer than the storage read.
  if (revision === manualRevision) overrides = nextOverrides;
  repaint();
}

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
  segmenter = new IntlSegmenter(targetLang());

  // The dictionary is independent of the analyser: a failure to load lindera
  // must not also cost us definitions.
  void (async () => {
    try {
      const d = await ensureDictionary(jmdictEditionFor(settings().native));
      log(
        d.ready
          ? 'JMdict ready — click a word to look it up'
          : `dictionary unavailable: ${d.error ?? d.phase}`,
      );
      clearLookupCache();   // drop anything looked up before it was ready
    } catch (e) {
      log('dictionary unavailable:', e);
    }
  })();

  // Upgrade in the background.
  void (async () => {
    try {
      const status = await LinderaSegmenter.status();
      if (!status.ready) log('downloading the Japanese dictionary (~10 MB, once)…');

      const dictName = TIER2_LANGS[targetLang()];
      if (!dictName) {
        log(`no analyser for "${targetLang()}" — staying on tier 0 (boundaries only)`);
        return;
      }
      const r = await LinderaSegmenter.ensure(dictName);
      if (!r.ok) {
        log('staying on tier 0 — analyser unavailable:', r.error);
        return;
      }
      segmenter = new LinderaSegmenter();
      segmented = new Map();   // re-segment with lemmas and readings
      active = -1;
      sidebar?.refreshAnalysis();
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

  // Set once, before any branch. This used to be set inside the two
  // segmenting branches and missed by the cached one, so replaying or seeking
  // back to an already-analysed line left copy-sentence holding the previous
  // one — which on a fetched track is most lines.
  currentLine = cue.text;

  const cached = segmented.get(i);
  if (cached) {
    overlay?.render(cached, secondLine(cue));
    return;
  }

  const result = (segmenter ?? { segment: () => [] as Token[] }).segment(cue.text);
  if (Array.isArray(result)) {
    segmented.set(i, result);
    overlay?.render(result, secondLine(cue));
    return;
  }
  void result.then((toks) => {
    segmented.set(i, toks);
    // The cue may have moved on while we were analysing.
    if (active === i) overlay?.render(toks, secondLine(cue));
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
    sidebar?.setActive(transcript.activeAt(video.currentTime));
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
  /*
   * Prefer a human track over an auto-generated one in the same language.
   * ASR output has no punctuation and invents words, so segmenting it teaches
   * a learner nothing about the language and quite a lot about speech
   * recognition. Taking the first match regardless meant silently studying
   * ASR whenever it happened to be listed first.
   */
  knownTracks = tracks;

  // A pick from the toolbar is for this video only. Track ids are positions
  // in the list, so carrying one over would land on whatever sits at that
  // index in the next video — a different language, on Netflix as often as not.
  const videoId = adapter.videoId();
  if (videoId !== chosenForVideo) {
    chosenTrack = null;
    chosenSecond = null;
    chosenForVideo = videoId;
  }

  /*
   * Forced-narrative tracks carry only the lines that translate on-screen
   * text, so a whole episode may hold three of them. Netflix lists one before
   * the real subtitles in several languages, and taking the first match meant
   * choosing it — which reads as a video whose subtitles barely exist.
   */
  const inTarget = tracks.filter((t) => t.lang.startsWith(targetLang()) && !t.forced);
  // An explicit pick from the toolbar wins over the automatic one.
  const track =
    (chosenTrack ? tracks.find((t) => t.id === chosenTrack) : undefined) ??
    inTarget.find((t) => !t.generated && !t.cc) ??
    inTarget.find((t) => !t.generated) ??
    inTarget[0];

  if (!track) {
    const have = tracks.map((t) => t.lang).join(', ') || 'none';
    log(`no "${targetLang()}" track here — available:`, have);
    showNotice(mount, 'no-target-track',
      `This video has: ${have}. Change what you're learning in settings, or pick another video.`);
    return true;   // the list is known and lacks our language; retrying is pointless
  }
  activeTrack = track.id;
  if (track.generated) {
    log('note: this track is auto-generated; segmentation will look rough');
    showNotice(mount, 'auto-generated', 'No human-written track was available for this video.');
  }

  try {
    cues = await adapter.loadTrack(track.id);
  } catch (err) {
    log('could not fetch the track:', err);
    // Before settling for the current line only, ask the adapter whether it
    // knows another way to the whole transcript.
    const alt = (await adapter.fallbackTrack?.().catch(() => [])) ?? [];
    if (alt.length) {
      log(`recovered ${alt.length} cues from the page's own transcript`);
      cues = alt;
    } else {
      return startDomFallback(mount, seg, adapter);
    }
  }
  if (!cues.length) {
    log('track loaded but contained no cues');
    return startDomFallback(mount, seg, adapter);
  }

  log(`rendering ${cues.length} cues · segmenter tier ${seg.tier}` +
      (seg.hasLemma ? '' : ' (no lemmas — Anki matching would be surface-form only)'));

  /*
   * The native-language line comes from the source's *own* second track, not
   * from machine translation. Netflix's English subtitles are a localisation
   * written by a person; a machine translation of the Japanese would be a
   * worse guess at the same thing, and seeing where the two genuinely diverge
   * is most of the value of watching them together.
   */
  // '' is an explicit "no second line" from the toolbar; null means pick one.
  if (settings().dualSubtitles && chosenSecond !== '') {
    const want = settings().native;
    // Same trap as above, plus a preference for plain subtitles over closed
    // captions: a translation line reading "[door creaks]" helps nobody.
    const inNative = tracks.filter(
      (t) => t.lang.startsWith(want) && t.id !== track.id && !t.forced,
    );
    const second =
      (chosenSecond ? tracks.find((t) => t.id === chosenSecond) : undefined) ??
      inNative.find((t) => !t.cc) ??
      inNative[0];
    if (second) {
      try {
        const other = await adapter.loadTrack(second.id);
        if (other.length) {
          cues = pairCues(cues, other);
          activeSecond = second.id;
          const paired = cues.filter((c) => c.secondary).length;
          log(`dual subtitles: ${second.lang} on ${paired} of ${cues.length} lines`);
        }
      } catch (e) {
        // A missing second track is not a failure of the first.
        log('no second subtitle track:', e);
      }
    } else {
      /*
       * Say so on screen rather than only in the console. A second line that
       * simply never appears is indistinguishable from a broken setting, and
       * the learner is the only one who can fix it — by changing the language
       * or accepting that this video does not carry it.
       */
      const have = tracks.map((t) => t.lang).join(', ');
      if (tracks.length <= 1) {
        log('only one subtitle track on this video — no second line possible');
        showNotice(mount, 'only-one-track');
      } else {
        log(`no "${want}" track for the second line — available:`, have);
        showNotice(mount, 'no-second-track', `This video has: ${have}.`);
      }
    }
  }

  segmented = new Map();
  active = -1;
  transcript.setFull(cues);

  if (getComputedStyle(mount).position === 'static') mount.style.position = 'relative';
  adapter.hideNative();

  overlay?.destroy();
  overlay = makeOverlay(mount, adapter);

  mountSidebar(mount, video);
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
  overlay = makeOverlay(mount, adapter);

  domSource?.stop();
  domSource = source;
  const started = domSource.start((text) => {
    if (!text) return overlay?.clear();
    currentLine = text;
    transcript.observe(text, activeVideo?.currentTime ?? 0);
    const result = (segmenter ?? seg).segment(text);
    if (Array.isArray(result)) overlay?.render(result);
    else void result.then((toks) => overlay?.render(toks));
  });

  if (!started) { quiet('could not observe the caption container'); return false; }

  // Not `libregaku-active`: that hides the container with display:none, and we
  // are reading from it.
  const v = pickAdapter()?.video();
  if (v) mountSidebar(mount, v);
  document.documentElement.classList.add('libregaku-reading');
  clearNotice();
  stalledOn = null;
  log('reading captions from the player DOM (current line only — the sidebar will need a fetched track)');
  return true;
}

/**
 * Position the line, getting out of the way of any bilingual extension that is
 * already supplying the native-language track.
 */
function applyAnchor(o: Overlay, mount: HTMLElement, adapter: SubtitleSource): void {
  const place = (): void => {
    const floor = settings().subtitleBottom;
    const bands = occupiedBands(mount, adapter.domCaptions.container);
    const offset = bottomOffset(bands, floor);
    o.setBottom(offset);
    if (offset !== floor) {
      const names = namedMatches().map((n) => n.name).join(', ');
      log(`sharing the player${names ? ` with ${names}` : ''} — stacking our line above theirs`);
    }
  };

  place();
  replace = place;
  // Extension load order is not deterministic, so re-measure a couple of times.
  setTimeout(place, 2000);
  setTimeout(place, 6000);
}

/** Re-run placement for the current overlay, when the chosen height changes. */
let replace: (() => void) | null = null;

/** What the overlay was last told, so a settings change applies only what moved. */
let appearance = { size: 0, bottom: 0, dual: true };

/** The second line only while it is wanted — the switch can flip mid-video. */
function secondLine(cue: { secondary?: string }): string | undefined {
  return settings().dualSubtitles ? cue.secondary : undefined;
}

/** Current line, for copy-sentence in the popup. */
let currentLine = '';
let hoverTimer = 0;
let pausedForHover = false;

/**
 * Hover-to-open.
 *
 * Two things make this workable rather than maddening over playing video: a
 * grace period before opening, so sweeping the cursor across a line does not
 * flash a card per word; and pausing playback while the cursor rests on a
 * word, so the subtitle does not race away mid-lookup.
 */
/**
 * One construction site for the overlay.
 *
 * There are two code paths that need one — a fetched track and the DOM
 * fallback — and wiring them separately is how hover ended up working on
 * YouTube and not on Netflix. Anything an overlay needs belongs here.
 */
function makeOverlay(mount: HTMLElement, adapter: SubtitleSource): Overlay {
  const o = new Overlay(mount);
  o.setRightInset(sidebar?.inset ?? 0);
  applyAnchor(o, mount, adapter);
  o.setSize(settings().subtitleSize);
  o.setRubyMode(settings().ruby);
  o.setMarkKnown(settings().markKnown);
  o.setStatusSource(statusOf);
  o.onToken((tok, el) => void openLookup(mount, el, tok));
  wireHover(o, mount);
  return o;
}

function wireHover(o: Overlay, mount: HTMLElement): void {
  o.onHover((tok, el) => {
    clearTimeout(hoverTimer);

    if (!tok || !el) {
      closePopupSoon();
      resumeAfterHover();
      return;
    }
    if (settings().interaction !== 'hover') return;

    // Already showing this word — do not restart anything.
    if (popupKey() === `${tok.start}:${tok.surface}`) {
      cancelPopupClose();
      return;
    }

    hoverTimer = window.setTimeout(() => {
      pauseForHover();
      void openLookup(mount, el, tok);
    }, settings().hoverDelay);
  });
}

function pauseForHover(): void {
  if (!settings().hoverPause || !activeVideo || activeVideo.paused) return;
  activeVideo.pause();
  pausedForHover = true;
}

function resumeAfterHover(): void {
  if (!pausedForHover || !activeVideo) return;
  pausedForHover = false;
  void activeVideo.play().catch(() => {});
}

/** Turn a lookup into an Anki note, with everything needed to review it. */
async function addCard(draft: CardDraft, token: Token): Promise<string> {
  const deck = settings().deck;
  if (!deck) throw new Error('Pick a deck in Libregaku settings first');

  const adapter = pickAdapter();
  const at = activeVideo?.currentTime ?? 0;

  await ensureModel();
  await addNote({
    deck,
    expression: draft.expression,
    // Anki renders 勉強[べんきょう] as ruby, so store the bracket form.
    reading: toAnkiFurigana(furigana(draft.expression, token.reading)),
    meaning: draft.meaning,
    sentence: draft.sentence,
    source: sourceField({
      title: adapter?.title() ?? null,
      seconds: at,
      url: adapter?.deepLink(at) ?? null,
    }),
    tags: tagsFor({ source: adapter?.id ?? 'unknown', lang: targetLang() }),
  });

  // Show the successful addition immediately, then let Anki's next snapshot
  // replace it. A stored "learning" override would hide maturity or deletion.
  const word = token.lemma ?? token.surface;
  statusRequest++;   // an older query may have started before this card existed
  manualRevision++;
  overrides.delete(word);
  addedCards.add(word);
  repaint();
  await setOverride(word, null);
  void refreshStatus();
  return `added to ${deck}`;
}

async function openLookup(mount: HTMLElement, el: HTMLElement, token: Token): Promise<void> {
  cancelPopupClose();
  try {
    const result = await lookupWord(token.lemma, token.surface);
    showPopup(mount, el, result, {
      token,
      sentence: currentLine,
      status: statusOf(token),
      onMark: mark,
      onAddCard: (draft) => addCard(draft, token),
      hasCard: statusOf(token) === 'learning' || statusOf(token) === 'known',
    });
  } catch (e) {
    log('lookup failed:', e);
  }
}

/**
 * Where a saved line came from.
 *
 * The link is the adapter's, not one rebuilt here. Both sites take a
 * timestamp and each spells it differently, and the adapter is the only
 * place that knows which — the same call the Anki card already uses. Naming
 * YouTube here instead meant every Netflix save fell back to the bare page
 * URL, so reopening it resumed wherever the profile had left off rather than
 * at the line that was saved.
 */
function videoContext(atSeconds?: number): { site: string; video: string; title: string; url: string; lang: string } {
  const adapter = pickAdapter();
  const at = Math.floor(atSeconds ?? activeVideo?.currentTime ?? 0);
  return {
    site: adapter?.id ?? 'unknown',
    video: adapter?.videoId() ?? location.pathname,
    title: adapter?.title() ?? document.title,
    url: adapter?.deepLink(at) ?? location.href,
    lang: targetLang(),
  };
}

function mountSidebar(mount: HTMLElement, video: HTMLVideoElement): void {
  activeVideo = video;
  if (sidebar) return;
  sidebar = new Sidebar(mount, {
    transcript,
    segmenter: () => segmenter,
    statusOf,
    measure: async (text) => {
      const seg = segmenter;
      if (!seg) return { unknown: 0, words: 0 };
      const toks = await seg.segment(text);
      const words = toks.filter((t) => t.content && !t.punct);
      return {
        words: words.length,
        unknown: words.filter((t) => statusOf(t) === 'unknown').length,
      };
    },
    seek: (t) => {
      if (activeVideo) activeVideo.currentTime = t;
    },
    currentTime: () => activeVideo?.currentTime ?? 0,
    context: videoContext,
    onWordClick: (token, el, sentence) => {
      void lookupWord(token.lemma, token.surface).then((result) => {
        const host = el.getRootNode() as ShadowRoot;
        showPopup((host.host as HTMLElement).parentElement ?? mount, el, result, {
          token,
          sentence,
          status: statusOf(token),
          onMark: mark,
          onAddCard: (draft) => addCard(draft, token),
          hasCard: statusOf(token) === 'learning' || statusOf(token) === 'known',
        });
      });
    },
  });
  header = new Header(mount, {
    stats: () => sidebar?.stats ?? null,
    savedCount: () => sidebar?.savedCount ?? 0,
    sidebarOpen: () => sidebar?.isOpen ?? false,
    inset: () => sidebar?.inset ?? 0,
    onToggleSidebar: () => sidebar?.toggle(),
    onOpenSettings: () => {
      sidebar?.toggle(true);
      sidebar?.setMode('settings');
    },
    onShowSaved: () => {
      sidebar?.toggle(true);
      sidebar?.setMode('saved');
    },
  });
  // The panel sits over the player, so making room for it means moving three
  // things: the picture, the subtitle over it, and the top bar.
  playerInset = new PlayerInset(video, mount, (lift) => overlay?.setBottomInset(lift));
  sidebar.onSavedChange(() => header?.update());
  sidebar.onLayoutChange(() => {
    const px = sidebar?.inset ?? 0;
    overlay?.setRightInset(px);
    playerInset?.set(px);
    header?.update();
  });
  overlay?.setRightInset(sidebar.inset);
  playerInset.set(sidebar.inset);
  void sidebar.refreshSaved();

  log('sidebar ready — press S to open it');
}

/** Save the line on screen right now. The keyboard path to the bookmark. */
async function saveCurrentLine(): Promise<void> {
  const i = transcript.activeAt(activeVideo?.currentTime ?? 0);
  const line = transcript.lines[i];
  if (!line || !sidebar) return;
  await sidebar.saveLine(line);
}

function reset(): void {
  closePopup();
  sidebar?.destroy();
  sidebar = null;
  header?.destroy();
  header = null;
  playerInset?.destroy();
  playerInset = null;
  activeTrack = null;
  activeSecond = null;
  transcript.clear();
  domSource?.stop();
  domSource = null;
  cancelAnimationFrame(raf);
  overlay?.destroy();
  overlay = null;
  replace = null;
  cues = [];
  segmented = new Map();
  active = -1;
}

for (const a of ADAPTERS) {
  a.onNavigate(() => {
    reset();
    // The toolbar's picks and track list were for the video we just left.
    knownTracks = [];
    chosenTrack = null;
    chosenSecond = null;
    chosenForVideo = null;
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

// popup-dismiss
document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape') closePopup();
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key !== 'b' && key !== 's') return;
    // Someone typing in a field gets their letter. composedPath() sees through
    // shadow roots, so the search box inside our own panel counts as a field
    // too — e.target would only ever show the panel's host.
    const t = (e.composedPath()[0] ?? e.target) as HTMLElement | null;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    if (key === 'b') {
      // Netflix and YouTube both treat stray letters as player shortcuts.
      e.preventDefault();
      e.stopPropagation();
      void saveCurrentLine();
      return;
    }
    if (!sidebar) return;
    e.preventDefault();
    e.stopPropagation();
    sidebar.toggle();
  },
  true,
);
document.addEventListener(
  'click',
  (e) => {
    const t = e.target as Element | null;
    if (t?.closest?.('.libregaku-popup') || t?.closest?.('.libregaku-root')) return;
    closePopup();
  },
  true,
);

void loadSettings().then(async (s) => {
  log(`lookup opens on ${s.interaction}`);
  appearance = { size: s.subtitleSize, bottom: s.subtitleBottom, dual: s.dualSubtitles };
  await refreshStatus();
});
onSettingsChange(() => void refreshStatus());
onSettingsChange((s) => {
  if (s.interaction !== 'hover') closePopup();
});
onSettingsChange(() => header?.update());
// Appearance applies to the line on screen, not only to the next overlay built.
// The top bar's furigana and second-line buttons depend on this: they used to
// change the setting and nothing else.
onSettingsChange((s) => {
  if (s.subtitleSize !== appearance.size) overlay?.setSize(s.subtitleSize);
  if (s.subtitleBottom !== appearance.bottom) replace?.();
  overlay?.setRubyMode(s.ruby);
  overlay?.setMarkKnown(s.markKnown);
  // Turning the second line on needs its track, which is only fetched at
  // load. Re-run from the top, exactly as the toolbar's track picker does.
  if (s.dualSubtitles && !appearance.dual && activeTrack && !activeSecond) {
    log('second line turned on — reloading to fetch its track');
    reset();
    rendering = false;
    retries = 0;
    void start();
  }
  appearance = { size: s.subtitleSize, bottom: s.subtitleBottom, dual: s.dualSubtitles };
});
// Another tab saving a line must not be overwritten by this one's stale copy.
bookmarks.watch(() => {
  void sidebar?.refreshSaved().then(() => header?.update());
});

/**
 * State and control for the toolbar popup.
 *
 * The popup runs in its own document with no access to any of this, so the
 * content script answers for the page it is on. It is also the only place that
 * knows which tracks a video actually has, which is why the picker lives there
 * rather than in settings — track choice is per-video, not a preference.
 */
let chosenTrack: string | null = null;
/** '' means "none", chosen deliberately; null means nothing was chosen. */
let chosenSecond: string | null = null;
/** The video the picks above belong to. */
let chosenForVideo: string | null = null;
/** What the current run actually loaded, so the popup shows the truth. */
let activeTrack: string | null = null;
let activeSecond: string | null = null;
let knownTracks: TrackInfo[] = [];

chrome.runtime.onMessage.addListener((msg: { type?: string; track?: string; second?: string }, _s, respond) => {
  if (msg?.type === 'lg-state') {
    const adapter = pickAdapter();
    respond({
      supported: Boolean(adapter),
      site: adapter?.id ?? null,
      title: adapter?.title() ?? null,
      rendering,
      tracks: knownTracks,
      track: activeTrack ?? chosenTrack,
      second: activeSecond ?? '',
      sidebarOpen: sidebar?.isOpen ?? false,
    });
    return true;
  }

  if (msg?.type === 'lg-set-tracks') {
    chosenTrack = msg.track ?? null;
    chosenSecond = msg.second ?? null;
    chosenForVideo = pickAdapter()?.videoId() ?? null;
    // Re-run from the top so the change takes effect on the current video.
    reset();
    rendering = false;
    retries = 0;
    void start().then(() => respond({ ok: true }));
    return true;
  }

  if (msg?.type === 'lg-toggle-sidebar') {
    sidebar?.toggle();
    respond({ ok: true, open: sidebar?.isOpen ?? false });
    return true;
  }

  return false;
});

log('content script loaded on', location.href);
void start();
