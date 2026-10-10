import { NetflixAdapter } from '../adapters/netflix';
import { pairCues } from '../adapters/pair';
import { YouTubeAdapter } from '../adapters/youtube';
import type { Cue, SubtitleSource, TrackInfo } from '../adapters/types';
import { IntlSegmenter } from '../morphology/intl';
import { LinderaSegmenter } from '../morphology/lindera';
import type { Segmenter, Token } from '../morphology/types';
import { DomCaptionSource } from '../adapters/dom-captions';
import { charactersOf, clearLookupCache, ensureDictionary, lookupToken, type Characters, type LookupResult } from '../dict/client';
import { bottomOffset, namedMatches, occupiedBands } from './coexist';
import { addNote, ensureModel, isDuplicate, type NewCard } from '../anki/client';
import { flushCards, isQueueKey, queueCard, queuedCards } from '../anki/card-queue';
import { lineMediaName, tagsFor, toAnkiFurigana } from '../anki/model';
import { AnkiUnavailable } from '../anki/rpc';
import { cardAudio } from '../audio/card-audio';
import { sourceField } from '../anki/source';
import { buildStatusMap, lemmaReading, type OverrideStatus, type Status, type StatusMap } from '../anki/status';
import { loadOverrides, setMark, syncMarks } from '../anki/marks';
import { furigana } from '../morphology/furigana';
import {
  DICTIONARIES, TIER2_LANGS, jmdictEditionFor, loadSettings, nextRuby, onSettingsChange, rubyLabel, setSetting,
  settings,
} from '../settings';
import {
  cancelPopupClose, closePopup, closePopupSoon, draftFor, popupKey, pressAdd, showPopup, type CardDraft,
} from './popup';
import { clearFlash, flash as flashOn } from './flash';
import { phraseToken } from './phrase';
import {
  elementRecorder, extensionFor, isEncrypted, stillOf, tabCaptured, tabRecorder, type LineRecorder, type Media,
} from './capture';
import { isLineKey, isTyping, keyAction, type KeyAction } from './keys';
import { Sidebar, type WordContext } from './sidebar';
import { PlayerInset } from './player-inset';
import * as bookmarks from './bookmarks';
import { Header } from './header';
import { Transcript } from './transcript';
import { CueIndex } from './cue-index';
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
let cueIndex = new CueIndex([]);
let segmented = new Map<number, Token[]>();
/**
 * Every transcript line's words, by text, as the overlay and the panel's
 * counting analyse them. What "also in this video" searches, so a lookup
 * never re-analyses a film to answer it.
 */
let lineTokens = new Map<string, Token[]>();
/** The cues on screen, as their indexes joined — '' when none. */
let activeKey = '';
/** An impossible key, to force the next frame to repaint. */
const STALE = '?';
let raf = 0;
let domSource: DomCaptionSource | null = null;
/** Why captions are being read off the page instead of from a fetched track. */
let domReason: 'no-tracks' | 'load-failed' | null = null;
let sidebar: Sidebar | null = null;
/** Keeps the panel's bottom edge above the site's control bar. */
let controlsWatch: ResizeObserver | null = null;
let controlsAbort: AbortController | null = null;
let playerInset: PlayerInset | null = null;
let header: Header | null = null;
/** Where the current video's UI is mounted, for notices raised later. */
let currentMount: HTMLElement | null = null;
const transcript = new Transcript();
let activeVideo: HTMLVideoElement | null = null;
let status: StatusMap | null = null;
let overrides = new Map<string, OverrideStatus>();
/** Successful additions awaiting the next Anki snapshot; never persisted. */
const addedCards = new Set<string>();
/**
 * Words with a card kept for when Anki opens (src/anki/card-queue.ts). Shown
 * as on their way, like a card just added — the card exists, Anki just has
 * not been told yet.
 */
let queuedWords = new Set<string>();
let statusRequest = 0;
let manualRevision = 0;
/** When word status was last read from Anki, so a returning tab can refresh. */
let statusReadAt = 0;

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
  const fromAnki = ankiStatus(tok);
  return (addedCards.has(key) || queuedWords.has(key)) && fromAnki !== 'known' ? 'learning' : fromAnki;
}

/**
 * What Anki says about a token, by its dictionary form and that form's
 * reading — so わかる in a subtitle finds a card written 分かる, and 分かった
 * finds one written わかる. The reading is the lemma's, not the surface's:
 * わかった is not what the card says.
 */
function ankiStatus(tok: Token): Status {
  if (!status) return 'unknown';
  const key = tok.lemma ?? tok.surface;
  return status.get(key, lemmaReading(key, tok.surface, tok.reading));
}

/**
 * Whether Anki itself holds a card for this word — never a hand mark. A word
 * marked known by hand has no card, and the lookup card must still offer to
 * make one.
 */
function hasCardFor(tok: Token): boolean {
  const key = tok.lemma ?? tok.surface;
  if (addedCards.has(key) || queuedWords.has(key)) return true;
  const fromAnki = ankiStatus(tok);
  return fromAnki === 'learning' || fromAnki === 'known';
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
 * to the browser, then on to Anki — where it follows the collection to every
 * other device. The optimistic update matters: a status change that takes a
 * round-trip to appear reads as broken. Anki being closed only delays the last
 * step; the mark waits in the browser and goes with the next sync.
 */
async function mark(word: string, next: OverrideStatus | null, reading?: string): Promise<void> {
  manualRevision++;
  if (next) overrides.set(word, next);
  else overrides.delete(word);
  repaint();
  // The mark shows at once either way; a failed write only costs it on reload,
  // which the learner should hear now rather than discover then.
  if (!(await setMark(word, next, reading)) && currentMount) showNotice(currentMount, 'mark-not-saved');
  void pushMarks();
}

/**
 * Exchange marks with Anki: this browser's waiting changes go in, and every
 * mark in the collection — some made on other devices — comes back.
 */
async function pushMarks(): Promise<void> {
  const revision = manualRevision;
  const synced = await syncMarks();
  if (!synced) return;   // Anki closed: the marks wait in the browser
  // A mark made while this was in flight is newer than what came back.
  if (revision === manualRevision) overrides = synced.marks;
  if (synced.error) {
    log('marks could not be saved to Anki:', synced.error);
    if (currentMount) showNotice(currentMount, 'marks-not-synced', synced.error);
  }
  repaint();
}

/**
 * Show a status change at once: the line on screen, and the transcript's
 * underlines and counts. Only statuses changed, so the transcript repaints what
 * it has built and recounts from tokens it already holds — re-analysing every
 * line of a film for one mark is what refreshAnalysis() would cost.
 */
function repaint(): void {
  overlay?.setStatusSource(statusOf);
  sidebar?.refreshStatus();
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
    statusReadAt = Date.now();
    addedCards.clear();
    log(
      status.size
        ? `Anki: ${status.size} words known or learning in ${scope || 'the whole collection'}`
        : 'Anki reachable but nothing found in that scope — everything reads as unknown',
    );
    // Anki answered, so marks can travel both ways now, and cards kept while
    // it was closed can go in.
    void pushMarks();
    void sendQueued();
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

/**
 * Put the cards kept while Anki was closed into it, if it is open now. Called
 * whenever Anki answers, and every minute while any are waiting.
 */
async function sendQueued(): Promise<void> {
  const r = await flushCards(cardAudio);
  if (!r) return;   // still closed: they keep waiting
  if (r.words.length) {
    // On their way until Anki's next snapshot reports them itself.
    for (const w of r.words) addedCards.add(w);
    if (r.added) {
      log(`added ${r.added} card(s) kept while Anki was closed`);
      if (currentMount) flash(currentMount, `Anki is open — added ${r.added === 1 ? 'the card' : `${r.added} cards`} kept for it`);
    }
    void refreshStatus();
  }
  if (r.error && r.remaining && currentMount) showNotice(currentMount, 'cards-not-added', r.error);
  await reloadQueued();
}

/** A word or two over the picture, confirming what a key did. */
function flash(mount: HTMLElement, text: string, ms?: number): void {
  flashOn(mount, text, ms, sidebar?.inset ?? 0);
}

/** Re-read which words have a card waiting, and keep looking for Anki while any do. */
async function reloadQueued(): Promise<void> {
  const waiting = await queuedCards();
  queuedWords = new Set(waiting.map((q) => q.word));
  repaint();
  watchQueue(waiting.length > 0);
}

let queueTimer = 0;
/** While cards wait, look for Anki every minute: it can be opened at any moment. */
function watchQueue(on: boolean): void {
  if (!on) {
    clearInterval(queueTimer);
    queueTimer = 0;
  } else if (!queueTimer) {
    queueTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sendQueued();
    }, 60_000);
  }
}

function pickAdapter(): SubtitleSource | null {
  return ADAPTERS.find((a) => a.matches(location.href)) ?? null;
}

let segmenter: Segmenter | null = null;
/** The language `segmenter` was built for; a change of target rebuilds it. */
let segmenterFor = '';

/**
 * Prefer real morphology, but never block on it. The dictionary is a ~10 MB
 * one-time download; until it lands, tier 0 renders boundaries so the overlay
 * is useful immediately rather than blank.
 */
async function makeSegmenter(): Promise<Segmenter | null> {
  const lang = targetLang();
  if (segmenter && segmenterFor === lang) return segmenter;

  if (!IntlSegmenter.supported) {
    log('Intl.Segmenter unavailable — cannot segment at all');
    return null;
  }
  segmenter = new IntlSegmenter(lang);
  segmenterFor = lang;

  // The dictionary is independent of the analyser: a failure to load lindera
  // must not also cost us definitions. Only languages that have one fetch it —
  // there is no point downloading JMdict to look up Spanish.
  if (DICTIONARIES[lang]) {
    void (async () => {
      try {
        const d = await ensureDictionary(jmdictEditionFor(settings().native));
        log(
          d.ready
            ? 'JMdict ready — click a word to look it up'
            : `dictionary unavailable: ${d.error ?? d.phase}`,
        );
        clearLookupCache();   // drop anything looked up before it was ready
        if (d.ready) {
          // Merging consults the dictionary — for counters, prefixes and the
          // like — so lines analysed before it arrived carry guesses. Again.
          segmented = new Map();
          lineTokens = new Map();
          activeKey = STALE;
          sidebar?.refreshAnalysis();
        }
      } catch (e) {
        log('dictionary unavailable:', e);
      }
    })();
  }

  // Upgrade in the background.
  void (async () => {
    const dictName = TIER2_LANGS[lang];
    if (!dictName) {
      log(`no analyser for "${lang}" — staying on tier 0 (boundaries only)`);
      return;
    }
    try {
      const status = await LinderaSegmenter.status();
      if (!status.ready) log('downloading the Japanese dictionary (~10 MB, once)…');

      const r = await LinderaSegmenter.ensure(dictName);
      if (!r.ok) {
        analyserDown(r.error ?? 'the analyser did not load');
        return;
      }
      // The learner may have switched language while this downloaded.
      if (segmenterFor !== lang) return;
      segmenter = new LinderaSegmenter();
      segmented = new Map();   // re-segment with lemmas and readings
      lineTokens = new Map();
      activeKey = STALE;
      sidebar?.refreshAnalysis();
      log('upgraded to tier 2 — lemmas, readings and furigana are live');
    } catch (e) {
      analyserDown(String(e));
    }
  })();

  return segmenter;
}

/**
 * The analyser failed: say so, and keep going on boundaries alone.
 *
 * AGENTS.md: if the segmenter can't produce lemmas, the UI must say so rather
 * than silently mismatching against the user's cards. This used to be a
 * console line, so a failed download looked exactly like a working extension
 * that never showed readings.
 */
let analyserNoticed = false;
function analyserDown(reason: string): void {
  log('analyser unavailable — boundaries only:', reason);
  if (analyserNoticed || !currentMount) return;
  analyserNoticed = true;
  showNotice(currentMount, 'analyser-unavailable', reason);
}

/**
 * Segment a line, falling back to boundaries for this line alone if the
 * analyser fails. Per line, not for good: the offscreen document can come
 * back, and one failed request should not cost the rest of the session its
 * readings. A rejection here used to leave the previous line frozen on screen.
 */
function segmentText(text: string): Token[] | Promise<Token[]> {
  const seg = segmenter;
  if (!seg) return [];
  const degrade = (e: unknown): Token[] => {
    analyserDown(String(e));
    return IntlSegmenter.supported ? new IntlSegmenter(targetLang()).segment(text) : [];
  };
  try {
    const r = seg.segment(text);
    return Array.isArray(r) ? r : r.catch(degrade);
  } catch (e) {
    return degrade(e);
  }
}

/** A line break between cues shown together. */
const BREAK: Token = { surface: '\n', start: -1, end: -1, punct: true };

function joined(parts: Token[][]): Token[] {
  return parts.flatMap((p, i) => (i ? [BREAK, ...p] : p));
}

function segmentCue(i: number): Token[] | Promise<Token[]> {
  const cached = segmented.get(i);
  if (cached) return cached;
  const text = cues[i]?.text ?? '';
  const result = segmentText(text);
  if (Array.isArray(result)) {
    segmented.set(i, result);
    lineTokens.set(text, result);
    return result;
  }
  return result.then((toks) => {
    segmented.set(i, toks);
    lineTokens.set(text, toks);
    return toks;
  });
}

/** Tokens standing for a selected phrase rather than one word. */
const phrases = new WeakSet<Token>();

/** Where a word also turns up in this video. */
export interface AlsoLine {
  start: number;
  text: string;
  /** The word as it was written in that line, to pick it out. */
  match: string;
}

/**
 * Every other line of this video with the word in it, by dictionary form —
 * so 見た finds 見る wherever it was said. A phrase is found by its text.
 * Lines not analysed yet are analysed now, a batch at a time.
 */
async function alsoInVideo(token: Token, here?: number): Promise<AlsoLine[]> {
  const key = token.lemma ?? token.surface;
  const phrase = phrases.has(token);
  const lines = transcript.lines.filter((l) => here === undefined || Math.abs(l.start - here) > 0.01);
  const missing = [...new Set(lines.map((l) => l.text))].filter((t) => !lineTokens.has(t));
  for (let i = 0; i < missing.length; i += 32) {
    await Promise.all(missing.slice(i, i + 32).map(async (text) => {
      lineTokens.set(text, await segmentText(text));
    }));
  }
  const out: AlsoLine[] = [];
  for (const line of lines) {
    if (phrase) {
      if (line.text.includes(token.surface)) out.push({ start: line.start, text: line.text, match: token.surface });
      continue;
    }
    const hit = lineTokens.get(line.text)?.find((t) => !t.punct && (t.lemma ?? t.surface) === key);
    if (hit) out.push({ start: line.start, text: line.text, match: hit.surface });
  }
  return out;
}

/**
 * The kanji of the word a card is about — its headword's, which may be
 * written differently from what was on screen. Only where the language has a
 * dictionary behind it, as with lookups themselves.
 */
function charactersFor(token: Token, result: LookupResult): Promise<Characters> | undefined {
  if (!DICTIONARIES[targetLang()]) return undefined;
  return charactersOf(draftFor(result, token, '').expression, settings().native)
    .catch(() => ({ label: '', items: [] }));
}

/** Play from a line the lookup card points to. */
function playFrom(t: number): void {
  lineSeek = { to: t, at: Date.now() };
  seekTo(t);
  void activeVideo?.play().catch(() => {});
}

function paint(idx: number[]): void {
  const shown = idx.map((i) => cues[i]).filter((c): c is Cue => Boolean(c));
  if (!shown.length) return;

  // Set once, before any branch. This used to be set inside the two
  // segmenting branches and missed by the cached one, so replaying or seeking
  // back to an already-analysed line left copy-sentence holding the previous
  // one — which on a fetched track is most lines.
  currentLine = shown.map((c) => c.text).join('\n');
  const second = secondLine(shown);

  const parts = idx.map(segmentCue);
  if (parts.every((p): p is Token[] => Array.isArray(p))) {
    overlay?.render(joined(parts), second);
    return;
  }
  const key = activeKey;
  const gen = generation;
  void Promise.all(parts).then((all) => {
    // The cue may have moved on, or the video changed, while we were analysing.
    if (activeKey === key && gen === generation) overlay?.render(joined(all), second);
  });
}

function tick(video: HTMLVideoElement, seg: Segmenter, adapter: SubtitleSource): void {
  // During an ad the element's clock is the ad's: reading cues against it put
  // the video's opening lines over the advert.
  if (adapter.isAd?.()) {
    if (activeKey !== 'ad') {
      activeKey = 'ad';
      overlay?.clear();
      closePopup();
    }
    raf = requestAnimationFrame(() => tick(video, seg, adapter));
    return;
  }

  const idx = cueIndex.at(video.currentTime);
  const key = idx.join(',');
  if (key !== activeKey) {
    activeKey = key;
    if (!idx.length) {
      overlay?.clear();
    } else {
      paint(idx);
    }
    sidebar?.setActive(transcript.activeAt(video.currentTime));
  }
  raf = requestAnimationFrame(() => tick(video, seg, adapter));
}

let starting = false;
let rendering = false;
let retries = 0;
let retryTimer = 0;
/** Settings arrive asynchronously; nothing may run on the defaults instead. */
let settingsReady = false;
/**
 * Bumped by every reset. A run that began under an older generation belongs
 * to a video that is gone, and must not render.
 */
let generation = 0;

const MAX_RETRIES = 60;   // ~30s at 500ms
const RETRY_MS = 500;
/** Retries to wait for a track list before settling for reading captions. */
const DOM_GRACE = 6;      // ~3s

/**
 * Players mount asynchronously — Netflix in particular builds its <video> well
 * after document_idle. Checking once and giving up is how M1 first failed, so
 * anything that is merely "not ready yet" schedules another attempt.
 */
async function start(): Promise<void> {
  // A second start while a run is in flight adds nothing: that run is doing
  // the job. Unless the video changes under it — handled below.
  if (!settingsReady || rendering || starting) return;
  starting = true;
  const gen = generation;
  let ok = false;
  try {
    ok = await run(gen);
  } finally {
    starting = false;
  }

  // The video changed while that run was in flight, so its result is void.
  // Start over for the new one: every start asked for in the meantime found
  // this run still going and returned. This is what used to be missing — the
  // stale run finished by rendering the previous video's subtitles, and the
  // new video's start had already been ignored.
  if (gen !== generation) {
    if (!rendering) void start();
    return;
  }
  if (ok) {
    rendering = true;
    retries = 0;
    return;
  }

  // An advert can run for minutes. Waiting it out is not a failure to count.
  if (pickAdapter()?.isAd?.()) {
    quiet('waiting for the ad to finish');
    clearTimeout(retryTimer);
    retryTimer = window.setTimeout(() => void start(), 1000);
    return;
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

/**
 * @returns true once cues are on screen; false means "not ready, try again".
 * Every await is followed by a generation check: past it, the world may have
 * moved on to another video.
 */
async function run(gen: number): Promise<boolean> {
  const adapter = pickAdapter();
  if (!adapter) { quiet('no adapter for ' + location.href); return false; }
  if (adapter.isAd?.()) return false;

  const seg = await makeSegmenter();
  if (gen !== generation) return false;
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
  currentMount = mount;

  log('mounting into', mount.id || mount.className || mount.tagName);

  const tracks = await adapter.listTracks();
  if (gen !== generation) return false;
  if (!tracks.length) {
    if (adapter.noSubtitles?.()) {
      log('this video has no subtitle tracks');
      showNotice(mount, 'no-subtitles');
      return true;   // the site has answered; waiting will not change it
    }
    // No manifest reached us — on Netflix the page CSP blocks the MAIN-world
    // hook entirely. That only costs us the *whole* transcript; if the player
    // is rendering subtitles we can still read them, so never sit and wait
    // long when there is a caption container right there. A short wait first:
    // after clicking to another video the list is usually a second away, and
    // YouTube keeps an empty caption container in every player.
    if (retries >= DOM_GRACE && new DomCaptionSource(adapter.domCaptions).container()) {
      log('no track list (the page may block our manifest hook) — reading rendered captions instead');
      return startDomFallback(mount, seg, adapter, 'no-tracks');
    }
    quiet(
      'waiting for a subtitle track list, or for subtitles to be switched on',
      adapter.id === 'netflix' ? 'nf.textTracks' : 'yt.player-response',
      'Subtitles may simply be switched off in the player.',
    );
    return false;
  }

  log(
    'tracks:',
    tracks.map((t) => `${t.lang}${t.generated ? ' (auto)' : ''}`).join(', '),
  );

  // Anything still on screen is about an earlier attempt. Cleared here, before
  // choosing tracks, so that the notices raised while choosing survive: they
  // used to be cleared at the end of this same run, a frame after appearing.
  clearNotice();

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

  let loaded: Cue[];
  try {
    loaded = await adapter.loadTrack(track.id);
  } catch (err) {
    if (gen !== generation) return false;
    log('could not fetch the track:', err);
    // Before settling for the current line only, ask the adapter whether it
    // knows another way to the whole transcript.
    const alt = (await adapter.fallbackTrack?.().catch(() => [])) ?? [];
    if (gen !== generation) return false;
    if (alt.length) {
      log(`recovered ${alt.length} cues from the page's own transcript`);
      loaded = alt;
    } else {
      return startDomFallback(mount, seg, adapter, 'load-failed');
    }
  }
  if (gen !== generation) return false;
  if (!loaded.length) {
    log('track loaded but contained no cues');
    return startDomFallback(mount, seg, adapter, 'load-failed');
  }

  log(`rendering ${loaded.length} cues · segmenter tier ${seg.tier}` +
      (seg.hasLemma ? '' : ' (no lemmas — Anki matching would be surface-form only)'));

  /*
   * The native-language line comes from the source's *own* second track, not
   * from machine translation. Netflix's English subtitles are a localisation
   * written by a person; a machine translation of the Japanese would be a
   * worse guess at the same thing, and seeing where the two genuinely diverge
   * is most of the value of watching them together.
   */
  // '' is an explicit "no second line" from the toolbar; null means pick one.
  let second: string | null = null;
  if (settings().dualSubtitles && chosenSecond !== '') {
    const want = settings().native;
    // Same trap as above, plus a preference for plain subtitles over closed
    // captions: a translation line reading "[door creaks]" helps nobody.
    const inNative = tracks.filter(
      (t) => t.lang.startsWith(want) && t.id !== track.id && !t.forced,
    );
    const pick =
      (chosenSecond ? tracks.find((t) => t.id === chosenSecond) : undefined) ??
      inNative.find((t) => !t.cc) ??
      inNative[0];
    if (pick) {
      try {
        const other = await adapter.loadTrack(pick.id);
        if (gen !== generation) return false;
        if (other.length) {
          loaded = pairCues(loaded, other);
          second = pick.id;
          const paired = loaded.filter((c) => c.secondary).length;
          log(`dual subtitles: ${pick.lang} on ${paired} of ${loaded.length} lines`);
        }
      } catch (e) {
        if (gen !== generation) return false;
        // A missing second track is not a failure of the first — but it is
        // one the learner should hear about, or the setting looks broken.
        log('no second subtitle track:', e);
        showNotice(mount, 'second-track-failed', `${pick.label || pick.lang}: ${String(e).slice(0, 140)}`);
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

  // Past the last await: everything from here on is this video's.
  cues = loaded;
  cueIndex = new CueIndex(cues);
  activeSecond = second;
  segmented = new Map();
  activeKey = STALE;
  transcript.setFull(cues);

  if (getComputedStyle(mount).position === 'static') mount.style.position = 'relative';
  adapter.hideNative();

  overlay?.destroy();
  overlay = makeOverlay(mount, adapter);

  mountSidebar(mount, video, adapter);
  cancelAnimationFrame(raf);
  tick(video, seg, adapter);
  stalledOn = null;
  return true;
}

/**
 * Tokenize whatever YouTube is currently displaying. Only the current line, but
 * it works wherever captions are visible, which the fetched path does not.
 */
function startDomFallback(
  mount: HTMLElement, seg: Segmenter, adapter: SubtitleSource, reason: 'no-tracks' | 'load-failed',
): boolean {
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
  const gen = generation;
  const started = domSource.start((text) => {
    if (adapter.isAd?.()) return overlay?.clear();
    if (!text) return overlay?.clear();
    currentLine = text;
    const at = activeVideo?.currentTime ?? 0;
    transcript.observe(text, at);
    // The panel has no clock to follow in this mode; the caption is the clock.
    sidebar?.setActive(transcript.activeAt(at));
    const result = segmentText(text);
    if (Array.isArray(result)) overlay?.render(result);
    // A late analysis must not repaint a line the player has already replaced.
    else void result.then((toks) => {
      if (gen === generation && currentLine === text) overlay?.render(toks);
    });
  });

  if (!started) { quiet('could not observe the caption container'); return false; }

  // Not `libregaku-active`: that hides the container with display:none, and we
  // are reading from it.
  const v = pickAdapter()?.video();
  if (v) mountSidebar(mount, v, adapter);
  document.documentElement.classList.add('libregaku-reading');
  domReason = reason;
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
/** The languages the current run was built for. */
let languages = { target: '', native: '' };
/** The status scope last read from Anki. */
let scopeRead: string | null = null;

/** The second line only while it is wanted — the switch can flip mid-video. */
function secondLine(shown: Array<{ secondary?: string }>): string | undefined {
  if (!settings().dualSubtitles) return undefined;
  const lines = shown.map((c) => c.secondary).filter((s): s is string => Boolean(s));
  return lines.length ? lines.join('\n') : undefined;
}

/** Current line, for copy-sentence in the popup. */
let currentLine = '';
let hoverTimer = 0;
let pausedForHover = false;
/** The overlay word under the pointer, if any. */
let hovering: HTMLElement | null = null;
/** Only the most recent lookup may open a card. */
let lookupSeq = 0;

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
  o.setBlurred(settings().blurPrimary);
  o.setMarkKnown(settings().markKnown);
  o.setStatusSource(statusOf);
  o.onToken((tok, el) => void openLookup(mount, el, tok));
  o.onPhrase((words, text, el) => void openLookup(mount, el, phrase(words, text)));
  o.onPress(() => {
    // A press starts a click or a selection; a hover card that was about to
    // open for the word under it would replace the phrase's.
    clearTimeout(hoverTimer);
    pressPause();
  });
  wireHover(o, mount);
  return o;
}

/** A selected run of words as one token to look up, remembered as a phrase. */
function phrase(words: Token[], text: string): Token {
  const tok = phraseToken(words, text);
  phrases.add(tok);
  return tok;
}

/**
 * A word pressed is a lookup or a selection starting: hold the line still for
 * it, as hovering does — a phrase cannot be dragged across a line that has
 * already gone. If no card comes of it, play on.
 */
function pressPause(): void {
  if (!settings().hoverPause) return;
  pauseForHover();
  document.addEventListener('mouseup', () => {
    window.setTimeout(() => {
      if (!popupKey()) resumeAfterHover();
    }, 400);
  }, { once: true, capture: true });
}

function wireHover(o: Overlay, mount: HTMLElement): void {
  o.onHover((tok, el) => {
    clearTimeout(hoverTimer);
    hovering = el;

    if (!tok || !el) {
      // Leaving the word is often moving onto its card, to read it or press
      // Add. Playback resumes when the card closes (its onClose), not here —
      // resuming here restarted the video on the way to the card.
      closePopupSoon();
      return;
    }
    if (settings().interaction !== 'hover') return;
    // A line replaying to be recorded passes under the cursor; it is not being read.
    if (recordingLine) return;

    // Already showing this word — do not restart anything.
    if (popupKey() === `${tok.start}:${tok.surface}`) {
      cancelPopupClose();
      return;
    }

    hoverTimer = window.setTimeout(() => {
      pauseForHover();
      void openLookup(mount, el, tok, true);
    }, settings().hoverDelay);
  });
}

/** Resume a hover pause when the card goes away — unless another took its place. */
const onCardClosed = (why: 'closed' | 'replaced'): void => {
  if (why === 'closed') resumeAfterHover();
};

function pauseForHover(): void {
  if (recordingLine || !settings().hoverPause || !activeVideo || activeVideo.paused) return;
  activeVideo.pause();
  pausedForHover = true;
}

function resumeAfterHover(): void {
  if (!pausedForHover || !activeVideo) return;
  pausedForHover = false;
  void activeVideo.play().catch(() => {});
}

/** Where a word being carded was said, and what the second line said then. */
interface LineContext {
  /** Start of the line, in seconds. */
  start?: number;
  /** Its end, for recording it. */
  end?: number;
  translation?: string;
}

/** The line on screen right now, for a word looked up from the overlay. */
function lineHere(): LineContext {
  // '' (nothing on screen), 'ad' and STALE name no cue.
  if (!/^\d+(,\d+)*$/.test(activeKey)) return {};
  const shown = activeKey.split(',').map((i) => cues[Number(i)]).filter((c): c is Cue => Boolean(c));
  if (!shown.length) return {};
  return {
    start: shown[0]!.start,
    end: Math.max(...shown.map((c) => c.end)),
    translation: shown.map((c) => c.secondary).filter(Boolean).join('\n') || undefined,
  };
}

/**
 * A lookup for words that have no dictionary behind them, rather than
 * answering every Spanish word from a Japanese one.
 */
async function lookupFor(token: Token): Promise<LookupResult> {
  if (!DICTIONARIES[targetLang()]) {
    return { state: 'error', error: 'No dictionary for this language yet.' };
  }
  // The token's own lookup plan: its reading and part of speech pick the
  // entry, and a merged word knows which part to look up (勉強する → 勉強).
  return lookupToken(token);
}

/** Turn a lookup into an Anki note, with everything needed to review it. */
async function addCard(draft: CardDraft, token: Token, line: LineContext): Promise<string> {
  const deck = settings().deck;
  if (!deck) throw new Error('Pick a deck in Libregaku settings first');

  const adapter = pickAdapter();
  // The line's own start, so the card links back to where the word was said —
  // not to wherever playback has drifted to by the time Add is pressed, and
  // not to the playhead at all for a word picked from further down the
  // transcript.
  const at = line.start ?? activeVideo?.currentTime ?? 0;

  /*
   * The reading of the headword, not of the word as it was said. The token's
   * reading is the inflected surface's — たべた for 食べた — so aligning it
   * against 食べる wrote 食べる[たべた] on every inflected card. The draft
   * carries the dictionary entry's reading; the token's only fits when the
   * word was said in its dictionary form.
   */
  const surfaceReading = token.surface === draft.expression ? token.reading : undefined;
  const reading =
    draft.reading && !(draft.reading === token.reading && token.surface !== draft.expression)
      ? draft.reading
      : surfaceReading;

  const card: NewCard = {
    deck,
    expression: draft.expression,
    // Anki renders 勉強[べんきょう] as ruby, so store the bracket form.
    reading: toAnkiFurigana(furigana(draft.expression, reading)),
    meaning: draft.meaning,
    sentence: draft.sentence,
    sentenceMeaning: line.translation,
    source: sourceField({
      title: adapter?.title() ?? null,
      seconds: at,
      url: adapter?.deepLink(at) ?? null,
    }),
    tags: tagsFor({ source: adapter?.id ?? 'unknown', lang: targetLang() }),
  };
  const word = token.lemma ?? token.surface;
  // The headword and its reading: the pair recordings are filed under.
  const audio = settings().cardAudio ? { word: draft.expression, reading, lang: targetLang() } : undefined;

  let missing: string[] = [];
  try {
    await ensureModel();
    const [wordAudio, media] = await Promise.all([audio ? cardAudio(audio) : Promise.resolve(null), lineMedia(line)]);
    missing = media.missing;
    const video = adapter?.videoId() ?? 'video';
    const name = (ext: string): string => lineMediaName(video, line.start ?? at, ext);
    await addNote({
      ...card,
      audio: wordAudio,
      sentenceAudio: media.audio ? { data: media.audio.data, filename: name(extensionFor(media.audio.type)) } : null,
      picture: media.picture ? { data: media.picture.data, filename: name(extensionFor(media.picture.type)) } : null,
    });
  } catch (e) {
    // Anki already has it. Not a failure: say so, and let status catch up.
    if (isDuplicate(e)) {
      void refreshStatus();
      return `already in ${deck}`;
    }
    if (!(e instanceof AnkiUnavailable)) throw e;
    // Anki is closed. Keep the card, and add it the next time Anki answers.
    const kept = await queueCard({ card, word, ...(audio ? { audio } : {}) });
    if (kept === 'failed') throw new Error('Anki is closed, and the browser would not keep the card for later');
    if (kept === 'already') return `already waiting for Anki`;
    manualRevision++;
    overrides.delete(word);
    queuedWords.add(word);
    repaint();
    await setMark(word, null);
    watchQueue(true);
    return `Anki is closed — this goes to ${deck} when it opens`;
  }

  // Show the successful addition immediately, then let Anki's next snapshot
  // replace it. A stored "learning" override would hide maturity or deletion.
  statusRequest++;   // an older query may have started before this card existed
  manualRevision++;
  overrides.delete(word);
  addedCards.add(word);
  repaint();
  // A card now speaks for the word; a hand mark would hide what it says.
  await setMark(word, null);
  void refreshStatus();
  return missing.length ? `added to ${deck} — without ${missing.join(' or ')}` : `added to ${deck}`;
}

/** While a line replays to be recorded: hover must neither pause it nor open cards over it. */
let recordingLine = false;

/** The longest stretch recorded for one line; a longer one is cut here. */
const LONGEST_LINE = 30;

/** Once the video says it has finished seeking, or after `ms` regardless. */
function seeked(video: HTMLVideoElement, ms = 1500): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0;
    const done = (): void => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', done);
      resolve();
    };
    timer = window.setTimeout(done, ms);
    video.addEventListener('seeked', done);
  });
}

/**
 * The line's sound and a still from it, for a card (src/content/capture.ts).
 *
 * Chrome records in real time, so the line plays once more while it is
 * captured, and playback then goes back to where it was, paused or not. A
 * still of the line on screen is just the frame showing; one further down
 * the transcript is visited for as long as copying a frame takes. Whatever
 * the site will not give is named in `missing`, and the card goes in without.
 */
async function lineMedia(line: LineContext): Promise<{ audio: Media | null; picture: Media | null; missing: string[] }> {
  const out = { audio: null as Media | null, picture: null as Media | null, missing: [] as string[] };
  const video = activeVideo;
  const wantAudio = settings().cardSentenceAudio;
  const wantPicture = settings().cardScreenshot && Boolean(video) && !isEncrypted(video!);
  if (!video || line.start === undefined || (!wantAudio && !wantPicture)) return out;
  const start = line.start;
  const end = Math.min(line.end ?? start + 5, start + LONGEST_LINE);
  const back = video.currentTime;
  const wasPaused = video.paused;

  let recorder: LineRecorder | null = null;
  if (wantAudio) {
    recorder = elementRecorder(video) ?? ((await tabCaptured()) ? tabRecorder() : null);
    if (!recorder) {
      out.missing.push(isEncrypted(video) ? 'sentence audio (click the Libregaku icon to record here)' : 'sentence audio');
    }
  }

  if (!recorder) {
    if (!wantPicture) return out;
    if (back >= start - 0.25 && back <= end + 0.25) {
      out.picture = await stillOf(video);
      return out;
    }
    video.pause();
    seekTo(start + 0.3);
    await seeked(video);
    out.picture = await stillOf(video);
    seekTo(back);
    if (!wasPaused) void video.play().catch(() => {});
    return out;
  }

  const gen = generation;
  recordingLine = true;
  if (currentMount) flash(currentMount, 'Recording the line…', (end - start + 3) * 1000);
  try {
    seekTo(Math.max(0, start - 0.15));
    await seeked(video);
    await recorder.start();
    await video.play().catch(() => {});
    const limit = Date.now() + (end - start + 4) * 1000;
    let pictured = !wantPicture;
    let whole = false;
    for (;;) {
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      const t = video.currentTime;
      if (!pictured && t >= start + 0.3) {
        pictured = true;
        out.picture = await stillOf(video);
      }
      if (t >= end + 0.15) {
        whole = true;
        break;
      }
      // Moved by someone else — a seek, a pause, an advert, another video:
      // what was recorded is no longer this line.
      if (gen !== generation || video.paused || pickAdapter()?.isAd?.() || t < start - 1.5 || t > end + 3) break;
      if (Date.now() > limit) break;
    }
    const recorded = await recorder.stop();
    out.audio = whole ? recorded : null;
  } catch (e) {
    log('could not record the line:', e);
  } finally {
    recorder.dispose();
    recordingLine = false;
    if (gen === generation) {
      video.pause();
      seekTo(back);
      if (!wasPaused) void video.play().catch(() => {});
    }
  }
  if (!out.audio) out.missing.push('sentence audio');
  return out;
}

/**
 * The last word looked up, for the A and K keys. A card that has closed still
 * counts for a little while: pressing A a moment after moving off a word is
 * the same decision as pressing it with the card open.
 */
let lastLookup: { token: Token; result: LookupResult; sentence: string; line: LineContext; gen: number; at: number } | null = null;
const LOOKUP_FRESH_MS = 90_000;

function rememberLookup(token: Token, result: LookupResult, sentence: string, line: LineContext): void {
  lastLookup = { token, result, sentence, line, gen: generation, at: Date.now() };
}

async function openLookup(mount: HTMLElement, el: HTMLElement, token: Token, byHover = false): Promise<void> {
  cancelPopupClose();
  const seq = ++lookupSeq;
  // Captured now: by the time the lookup returns, the line may have moved on.
  const sentence = currentLine;
  const line = lineHere();
  try {
    const result = await lookupFor(token);
    // A slower lookup for an earlier word must not replace this one's card.
    if (seq !== lookupSeq || !el.isConnected) return;
    // Opened by hover, but the pointer has already left: a card appearing now
    // would have nothing to close it, and would hold the video paused.
    if (byHover && hovering !== el) {
      resumeAfterHover();
      return;
    }
    rememberLookup(token, result, sentence, line);
    showPopup(mount, el, result, {
      token,
      sentence,
      status: statusOf(token),
      onMark: (word, next) => mark(word, next, lemmaReading(word, token.surface, token.reading)),
      onAddCard: (draft) => addCard(draft, token, line),
      hasCard: hasCardFor(token),
      queued: queuedWords.has(token.lemma ?? token.surface),
      elsewhere: alsoInVideo(token, line.start),
      onSeek: playFrom,
      characters: charactersFor(token, result),
      onClose: onCardClosed,
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

/** Move playback, the way the site allows it to be moved. */
function seekTo(t: number): void {
  const adapter = pickAdapter();
  if (adapter?.seek) adapter.seek(t);
  else if (activeVideo) activeVideo.currentTime = t;
}

function mountSidebar(mount: HTMLElement, video: HTMLVideoElement, adapter: SubtitleSource): void {
  activeVideo = video;
  if (sidebar) return;
  sidebar = new Sidebar(mount, {
    transcript,
    segmenter: () => segmenter,
    statusOf,
    measure: async (text) => {
      if (!segmenter) return { unknown: 0, words: 0 };
      const toks = await segmentText(text);
      lineTokens.set(text, toks);
      const words = toks.filter((t) => t.content && !t.punct);
      return {
        words: words.length,
        unknown: words.filter((t) => statusOf(t) === 'unknown').length,
      };
    },
    seek: seekTo,
    currentTime: () => activeVideo?.currentTime ?? 0,
    context: videoContext,
    onWordClick: (token, el, sentence, context) => openFromTranscript(token, el, sentence, context),
    onPhrase: (words, text, el, sentence, context) =>
      openFromTranscript(phrase(words, text), el, sentence, context),
    // "Check again" found Anki: what the words' colours say is now out of date.
    onAnkiConnected: () => void refreshStatus(),
    lookup: lookupFor,
  });
  /** A card for a word, or a phrase, picked in the transcript. */
  function openFromTranscript(token: Token, el: HTMLElement, sentence: string, context?: WordContext): void {
    const seq = ++lookupSeq;
    void lookupFor(token).then((result) => {
      if (seq !== lookupSeq || !el.isConnected) return;
      const host = el.getRootNode() as ShadowRoot;
      // The line the word was clicked in, which may be far from the playhead.
      const line = { start: context?.start, end: context?.end, translation: context?.translation };
      rememberLookup(token, result, sentence, line);
      showPopup((host.host as HTMLElement).parentElement ?? mount, el, result, {
        token,
        sentence,
        status: statusOf(token),
        onMark: (word, next) => mark(word, next, lemmaReading(word, token.surface, token.reading)),
        onAddCard: (draft) => addCard(draft, token, line),
        hasCard: hasCardFor(token),
        queued: queuedWords.has(token.lemma ?? token.surface),
        elsewhere: alsoInVideo(token, line.start),
        onSeek: playFrom,
        characters: charactersFor(token, result),
        onClose: onCardClosed,
      });
    });
  }

  // Stop above the site's control bar, and follow it: YouTube's grows in
  // fullscreen, and the player resizes under theater mode and window changes.
  // Netflix only puts its bar on the page while the controls show, which
  // pointer movement brings up — so that is a moment to measure too.
  const fitControls = (): void => sidebar?.setBottomInset(adapter.controlsHeight?.() ?? 0);
  fitControls();
  controlsWatch = new ResizeObserver(fitControls);
  controlsWatch.observe(mount);
  controlsAbort = new AbortController();
  let fittedAt = 0;
  mount.addEventListener('pointermove', () => {
    if (Date.now() - fittedAt < 500) return;
    fittedAt = Date.now();
    fitControls();
  }, { signal: controlsAbort.signal, passive: true });
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
  const saved = await sidebar.saveLine(line);
  if (currentMount) flash(currentMount, saved ? 'Line saved' : 'Line no longer saved');
}

function reset(): void {
  // Anything still in flight belongs to the video we are leaving.
  generation++;
  // Leaving is not the end of a hover: nothing should resume on our account.
  pausedForHover = false;
  closePopup();
  sidebar?.destroy();
  sidebar = null;
  controlsWatch?.disconnect();
  controlsWatch = null;
  controlsAbort?.abort();
  controlsAbort = null;
  header?.destroy();
  header = null;
  playerInset?.destroy();
  playerInset = null;
  activeTrack = null;
  activeSecond = null;
  transcript.clear();
  domSource?.stop();
  domSource = null;
  domReason = null;
  lineSeek = null;
  clearFlash();
  cancelAnimationFrame(raf);
  overlay?.destroy();
  overlay = null;
  replace = null;
  cues = [];
  cueIndex = new CueIndex([]);
  segmented = new Map();
  lineTokens = new Map();
  activeKey = '';
  // Hand the site its own subtitles back. Both classes hide them, and nothing
  // removed either, so after one Japanese video the site's captions stayed
  // hidden in that tab for every later video, including ones we never render.
  document.documentElement.classList.remove('libregaku-active', 'libregaku-reading');
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
  a.onTracks(() => {
    // Reading the player's captions was a stand-in for a list we didn't have.
    // Now that one is here, trade up to the whole transcript. Only when the
    // list was what was missing — a track that failed to load would fail again.
    if (rendering && domReason === 'no-tracks') {
      log('a track list arrived — switching from reading captions to the full track');
      restart();
      return;
    }
    void start();
  });
}

/** Tear down and run again from the top, for a change that needs new tracks. */
function restart(): void {
  reset();
  rendering = false;
  retries = 0;
  void start();
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

/**
 * Where the last line key sent playback, and when. A seek takes a moment to
 * land — on Netflix, noticeably — and a second press that read the clock
 * before then went to the same line again rather than the one after it.
 */
let lineSeek: { to: number; at: number } | null = null;

function lineClock(): number {
  const now = activeVideo?.currentTime ?? 0;
  if (lineSeek && Date.now() - lineSeek.at < 1500 && Math.abs(now - lineSeek.to) > 0.5) return lineSeek.to;
  return now;
}

/** Go to the line before, the line after, or the start of this one — and play it. */
function goToLine(which: 'previous' | 'next' | 'replay'): boolean {
  const t = lineClock();
  const to = which === 'previous' ? cueIndex.previous(t) : which === 'next' ? cueIndex.next(t) : cueIndex.replay(t);
  if (to === null) return false;
  closePopup();   // its word belongs to the line being left
  lineSeek = { to, at: Date.now() };
  seekTo(to);
  // A line key is a request to hear that line, paused or not.
  void activeVideo?.play().catch(() => {});
  return true;
}

/**
 * Whether the player is where the keys would act on it: most of it on screen.
 * Scrolled down to read the comments, the arrows scroll the page again.
 */
function playerInView(): boolean {
  if (!currentMount) return false;
  const r = currentMount.getBoundingClientRect();
  const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
  return r.height > 0 && shown >= r.height / 2;
}

/**
 * Whether a key has anything of ours to act on here. When it does not, the
 * page keeps the key: B used to be taken from the site on every page,
 * rendering or not.
 */
function keyApplies(action: KeyAction): boolean {
  if (isLineKey(action)) {
    // Moving between lines needs every line, not just the one on screen.
    return cues.length > 0 && !domSource && !pickAdapter()?.isAd?.() && playerInView();
  }
  if (action === 'known') return popupKey() !== null;   // otherwise K is YouTube's play/pause
  if (action === 'save' || action === 'panel') return sidebar !== null;
  return overlay !== null;
}

/** A and K: the word whose card is open, or else the one looked up last. */
function keyOnWord(action: 'add' | 'known'): void {
  const mount = currentMount;
  // With its card open, Add goes through the card, which then says what happened.
  if (action === 'add' && pressAdd()) return;
  const last = lastLookup;
  if (!last || last.gen !== generation || Date.now() - last.at > LOOKUP_FRESH_MS) {
    if (mount) flash(mount, 'Look a word up first, then press A');
    return;
  }
  const word = last.token.lemma ?? last.token.surface;
  if (action === 'known') {
    // As the card's Known button does: pressing it on a known word clears it.
    const next = statusOf(last.token) === 'known' ? null : 'known';
    void mark(word, next, lemmaReading(word, last.token.surface, last.token.reading));
    closePopup();
    if (mount) flash(mount, next ? `${word} · marked known` : `${word} · mark cleared`);
    return;
  }
  const draft = draftFor(last.result, last.token, last.sentence);
  if (mount) flash(mount, `Adding ${draft.expression}…`, 8000);
  void addCard(draft, last.token, last.line).then(
    (said) => mount && flash(mount, `${draft.expression} · ${said}`),
    (e: unknown) => mount && flash(mount, e instanceof Error ? e.message : String(e), 4000),
  );
}

function act(action: KeyAction): void {
  const mount = currentMount;
  switch (action) {
    case 'previous':
    case 'next':
    case 'replay':
      if (!goToLine(action) && mount) flash(mount, action === 'next' ? 'That was the last line' : 'No line before this');
      return;
    case 'second': {
      const on = !settings().dualSubtitles;
      void setSetting('dualSubtitles', on).then(() => header?.update());
      if (mount) flash(mount, on ? 'Second line on' : 'Second line off');
      return;
    }
    case 'furigana': {
      const next = nextRuby(settings().ruby);
      void setSetting('ruby', next).then(() => header?.update());
      if (mount) flash(mount, `Furigana: ${rubyLabel(next)}`);
      return;
    }
    case 'blur': {
      const on = !settings().blurPrimary;
      void setSetting('blurPrimary', on).then(() => header?.update());
      if (mount) flash(mount, on ? 'Subtitle blurred until you hover it' : 'Subtitle shown');
      return;
    }
    case 'add':
    case 'known':
      keyOnWord(action);
      return;
    case 'save':
      void saveCurrentLine();
      return;
    case 'panel':
      sidebar?.toggle();
  }
}

/** Keys taken on the way down, whose release must not reach the page either. */
const taken = new Set<string>();

// Capture phase, so the keys reach us before the player's own shortcuts.
document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape') closePopup();
    const action = keyAction(e);
    if (!action || isTyping(e) || !keyApplies(action)) return;
    // Netflix and YouTube both treat stray letters and arrows as player shortcuts.
    e.preventDefault();
    e.stopPropagation();
    taken.add(e.code || e.key);
    // Holding the key auto-repeats; one press is one action.
    if (e.repeat) return;
    act(action);
  },
  true,
);
document.addEventListener(
  'keyup',
  (e) => {
    if (!taken.delete(e.code || e.key)) return;
    e.preventDefault();
    e.stopPropagation();
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

// A tab left in the background for a while may be showing a stale picture of
// the collection; coming back to it is a good moment to look again.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - statusReadAt > 5 * 60_000) {
    void refreshStatus();
  }
});

// Cards kept for Anki in another tab, or sent from one, change what this one shows.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && Object.keys(changes).some(isQueueKey)) void reloadQueued();
  });
} catch {
  /* not in an extension context */
}

void loadSettings().then(async (s) => {
  log(`lookup opens on ${s.interaction}`);
  await reloadQueued();
  appearance = { size: s.subtitleSize, bottom: s.subtitleBottom, dual: s.dualSubtitles };
  languages = { target: s.target, native: s.native };
  scopeRead = s.statusScope;
  settingsReady = true;
  void start();
  await refreshStatus();
});
// Word status is a read of the whole collection, so it is re-read only when
// what it reads changes — not on every panel toggle and button press.
onSettingsChange((s) => {
  if (s.statusScope === scopeRead) return;
  scopeRead = s.statusScope;
  void refreshStatus();
});
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
  overlay?.setBlurred(s.blurPrimary);
  overlay?.setMarkKnown(s.markKnown);

  const languageChanged = s.target !== languages.target || s.native !== languages.native;
  const dualTurnedOn = s.dualSubtitles && !appearance.dual;
  appearance = { size: s.subtitleSize, bottom: s.subtitleBottom, dual: s.dualSubtitles };
  languages = { target: s.target, native: s.native };

  if (languageChanged) {
    // A new target needs a new analyser and new tracks; a new native language
    // a new dictionary edition and a new second line. None of it is live
    // without starting over.
    log('language changed — starting over');
    segmenter = null;
    analyserNoticed = false;
    clearLookupCache();
    restart();
    return;
  }
  if (dualTurnedOn && activeTrack && !activeSecond) {
    // Turning the second line on needs its track, which is only fetched at
    // load. A "None" picked earlier in the toolbar is overridden by turning
    // the line back on here.
    log('second line turned on — reloading to fetch its track');
    if (chosenSecond === '') chosenSecond = null;
    restart();
    return;
  }
  // Showing or hiding the second line applies to the line already on screen.
  activeKey = STALE;
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
    // How a line's sound can be had here, for the popup's record button.
    const capture = activeVideo && settings().cardSentenceAudio
      ? (isEncrypted(activeVideo) ? 'tab' : 'element')
      : null;
    void (capture === 'tab' ? tabCaptured() : Promise.resolve(false)).then((capturing) => respond({
      supported: Boolean(adapter),
      site: adapter?.id ?? null,
      title: adapter?.title() ?? null,
      rendering,
      tracks: knownTracks,
      track: activeTrack ?? chosenTrack,
      // Null when no second line is loaded, which is not the same as a
      // deliberate "None" — the popup must not echo one back as the other.
      second: activeSecond,
      sidebarOpen: sidebar?.isOpen ?? false,
      capture,
      capturing,
    }));
    return true;
  }

  if (msg?.type === 'lg-set-tracks') {
    // Only what the message names: a change to one picker is not a choice
    // about the other.
    if ('track' in msg) chosenTrack = msg.track || null;
    if ('second' in msg) chosenSecond = msg.second ?? null;
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
