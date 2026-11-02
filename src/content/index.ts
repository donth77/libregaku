import { AppleAdapter } from '../adapters/apple';
import { DisneyAdapter } from '../adapters/disney';
import { MaxAdapter } from '../adapters/max';
import { NetflixAdapter } from '../adapters/netflix';
import { PrimeAdapter } from '../adapters/prime';
import { mergeRepeats, pairCues } from '../adapters/pair';
import { VikiAdapter } from '../adapters/viki';
import { YouTubeAdapter } from '../adapters/youtube';
import type { Cue, SubtitleSource, TrackInfo } from '../adapters/types';
import { IntlSegmenter } from '../morphology/intl';
import { analyserFor, type Analyser } from '../morphology';
import { rubyOf } from '../morphology/ruby';
import type { Segmenter, Token } from '../morphology/types';
import { DomCaptionSource } from '../adapters/dom-captions';
import { charactersOf, clearLookupCache, ensureDictionary, lookupToken, type Characters, type LookupResult } from '../dict/client';
import { dictionarySite } from '../dict/sites';
import { bottomOffset, namedMatches, occupiedBands } from './coexist';
import {
  addNote, browseWord, createDeck, deckNames, ensureModel, isDuplicate, takeBack, type NewCard,
} from '../anki/client';
import { flushCards, isQueueKey, queueCard, queuedCards, unqueueCard } from '../anki/card-queue';
import { readyDeck } from '../anki/deck';
import { ROOT_TAG, langOfTags, lineMediaName, tagsFor, toAnkiFurigana } from '../anki/model';
import { AnkiUnavailable } from '../anki/rpc';
import { cardAudio } from '../audio/card-audio';
import { sourceField } from '../anki/source';
import { buildStatusMap, lemmaReading, type OverrideStatus, type Status, type StatusMap } from '../anki/status';
import { keepMarkReading, loadMarkReadings, loadOverrides, marksIn, setMark, syncMarks, type MarkSync } from '../anki/marks';
import { phonetic } from '../anki/text';
import {
  DICTIONARIES, cardDeck, definitionLanguage, dictionaryOf, fallbackDictionaryOf, featuresOf, loadSettings, nextRuby, ownDictionaryOf, trackLanguageMatch,
  onSettingsChange, targetVariant,
  nextSubtitleView, setSetting, settings, underlineVars,
} from '../settings';
import { languageList, loadUiLanguage, setTranslationLoader, setUiLanguage, ui } from '../i18n';
import {
  cancelPopupClose, closePopup, closePopupSoon, draftFor, popupKey, popupShows, pressAdd, showPopup, type Added, type CardDraft,
} from './popup';
import { outsideScope } from './settings-panel';
import { clearFlash, flash as flashOn } from './flash';
import { phraseAt, phraseToken } from './phrase';
import { lineReading } from './line-card';
import {
  elementRecorder, extensionFor, isEncrypted, stillOf, tabCaptured, tabRecorder, type LineRecorder, type Media,
  type MissingMedia,
} from './capture';
import { isControlKey, isLineKey, isTyping, keyAction, type KeyAction } from './keys';
import { Sidebar, type WordContext } from './sidebar';
import { PlayerInset } from './player-inset';
import * as bookmarks from './bookmarks';
import { Header } from './header';
import { Transcript } from './transcript';
import { CueIndex } from './cue-index';
import { chooseSecond, chooseTrack, sameTracks } from './track-choice';
import { clearNotice, noticeShown, showNotice } from './notice';
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

/** Whether the site has the language being learned only as pictures (Netflix's image-based subtitles). */
const targetInPictures = (adapter: SubtitleSource): boolean =>
  Boolean(adapter.pictureLanguages?.().some((l) => trackLanguageMatch(l, targetLang()) > 0));

/**
 * Under "no subtitles in the language you are learning": that the site has
 * them only as pictures, when it does, or else the languages it has, named.
 * Netflix's forced tracks are the "Off" setting of each audio language, not
 * subtitles anyone could study, and are left out.
 */
function noTargetDetail(adapter: SubtitleSource, tracks: TrackInfo[]): string {
  if (targetInPictures(adapter)) return ui.notices.onlyPictures;
  return ui.notices.noTargetTrackDetail(languageList(tracks.filter((t) => !t.forced).map((t) => t.lang)));
}

/**
 * The tracks a run would load from this list: the toolbar's picks first, then
 * the languages in settings. Asked again when a newer list arrives, to tell
 * whether it changes what is on screen (followTracks).
 *
 * Forced-narrative tracks carry only the lines that translate on-screen
 * text, so a whole episode may hold three of them. Netflix lists one before
 * the real subtitles in several languages, and taking the first match meant
 * choosing it — which reads as a video whose subtitles barely exist.
 */
function wantedTracks(tracks: TrackInfo[]): { track: TrackInfo | undefined; second: TrackInfo | undefined } {
  // The language's own tracks, and any written Chinese for Cantonese, never Cantonese for Mandarin (trackLanguageMatch).
  const inTarget = tracks.filter((t) => trackLanguageMatch(t.lang, targetLang()) > 0 && !t.forced);
  // An explicit pick from the toolbar wins over the automatic one: a person's
  // subtitles, in the script being learned (chooseTrack).
  const track =
    (chosenTrack ? tracks.find((t) => t.id === chosenTrack) : undefined) ??
    chooseTrack(inTarget, targetVariant(settings()));
  // '' is an explicit "no second line" from the toolbar; null means pick one.
  if (!track || !settings().dualSubtitles || chosenSecond === '') return { track, second: undefined };
  // The track being studied is not also its own translation, even when picked as both.
  const picked = chosenSecond && chosenSecond !== track.id ? tracks.find((t) => t.id === chosenSecond) : undefined;
  return { track, second: picked ?? chooseSecond(tracks, settings().native, track.id) };
}

/** Loud by default while the adapters are young. */
const log = (...a: unknown[]) => console.log('%c[libregaku]', 'color:#8AA2E8', ...a);

/** Log a waiting-state once, not once per retry. */
let lastQuiet = '';
/**
 * The assumption behind the current wait, reported if we give up. Its detail
 * is read when the notice shows, in the interface language of that moment.
 */
let stalledOn: { id: string; detail?: () => string } | null = null;
const quiet = (msg: string, id?: string, detail?: () => string) => {
  if (id) stalledOn = { id, detail };
  if (msg === lastQuiet) return;
  lastQuiet = msg;
  log(msg);
};

const ADAPTERS: SubtitleSource[] = [new YouTubeAdapter(), new NetflixAdapter(), new DisneyAdapter(), new PrimeAdapter(), new MaxAdapter(), new AppleAdapter(), new VikiAdapter()];

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
/** The view to open the next panel on, when a restart replaced one that was showing it. */
let keepMode: Sidebar['mode'] | null = null;
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
/** The hand marks of the language being learned — never another's, where the same spelling is another word. */
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
 * Marked words by the kana they are found by, kana → word. A subtitle writes
 * 行く as いこう, whose dictionary form is いく: the mark on 行く is found by it.
 * Only a word the subtitle writes in kana is found this way, and only when
 * the marked word is the dictionary's first entry for that kana: marking 聞く
 * must not clear きく meaning 効く, nor 殺る clear やる meaning 遣る. A word
 * written in kanji is matched as written and no other way.
 */
let markReadings = new Map<string, string>();
/** Marked words whose reading has been asked of the dictionary this session. */
const readingAsked = new Set<string>();

function markedByReading(key: string): OverrideStatus | undefined {
  const kana = phonetic(key);
  const word = kana ? markReadings.get(kana) : undefined;
  return word ? overrides.get(word) : undefined;
}

/**
 * Read how the marked words are read, and look up the ones nothing says: a
 * mark made from a list, or before readings were kept. A few at a time, once
 * each, and kept (keepMarkReading).
 */
async function refreshMarkReadings(): Promise<void> {
  const lang = targetLang();
  const known = await loadMarkReadings(lang);
  if (lang !== targetLang()) return;
  const index = (): void => {
    const next = new Map<string, string>();
    for (const [word, reading] of known) if (overrides.has(word) && phonetic(word) === null) next.set(reading, word);
    markReadings = next;
  };
  index();
  repaint();
  const missing = [...overrides.keys()].filter((w) => !known.has(w) && phonetic(w) === null && !readingAsked.has(w)).slice(0, 300);
  let found = false;
  for (const word of missing) {
    readingAsked.add(word);
    try {
      const result = await lookupToken({ surface: word, lemma: word });
      if (lang !== targetLang()) return;
      const reading = result.state === 'ok' ? phonetic(result.entries[0]?.reading ?? '') : null;
      if (result.state !== 'ok' && result.state !== 'empty') readingAsked.delete(word);   // the dictionary may still be loading
      if (!reading) continue;
      // Is it what that kana most likely means? The dictionary ranks its entries.
      const byKana = await lookupToken({ surface: reading, lemma: reading });
      if (lang !== targetLang()) return;
      if (byKana.state !== 'ok') {
        readingAsked.delete(word);
        continue;
      }
      const top = byKana.entries[0];
      if (!top || (top.word !== word && !top.forms?.some((f) => f.text === word))) continue;
      known.set(word, reading);
      void keepMarkReading(lang, word, reading);
      found = true;
    } catch {
      readingAsked.delete(word);
    }
  }
  if (found) {
    index();
    repaint();
  }
}

/**
 * A token's status, by dictionary form.
 *
 * The lemma is the key, which is the whole reason M2 merges morphemes: 来た has
 * to resolve to 来る or a card you already have will never light up.
 */
function statusOf(tok: Token): Status {
  if (tok.punct || !tok.content) return 'ignored';
  const key = tok.lemma ?? tok.surface;
  const manual = overrides.get(key) ?? markedByReading(key) ?? (tok.usedAs ? overrides.get(tok.usedAs) : undefined);
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
  const own = status.get(key, lemmaReading(key, tok.surface, tok.reading));
  if (!tok.usedAs || own === 'known') return own;
  // A card written as the line uses the word counts for it too: 勉強する for 勉強している, whose word is 勉強.
  const other = status.get(tok.usedAs, lemmaReading(tok.usedAs, tok.surface, tok.reading));
  return other === 'known' || own === 'unknown' ? other : own;
}

/**
 * The form of a token's word a hand mark is on: the word, or the word as the
 * line uses it — 勉強する, where a する verb was marked before it was marked as
 * its noun. Undefined where it has none.
 */
function markOn(tok: Token): string | undefined {
  const key = tok.lemma ?? tok.surface;
  if (overrides.has(key)) return key;
  return tok.usedAs && overrides.has(tok.usedAs) ? tok.usedAs : undefined;
}

/**
 * Take the hand mark off a word a card now speaks for, on whichever form of
 * the word it is. Off the page at once; resolves when the browser has it.
 */
function dropMark(tok: Token): Promise<unknown> {
  const forms = [tok.lemma ?? tok.surface, ...(tok.usedAs ? [tok.usedAs] : [])];
  for (const form of forms) overrides.delete(form);
  return Promise.all(forms.map((form) => setMark(targetLang(), form, null)));
}

/**
 * A mark from a word's card or its key. It goes on the word; and a mark on
 * another form of it comes off, whether that is what was asked or the new
 * mark replaces it, so a word never carries two.
 */
function markToken(tok: Token, word: string, next: OverrideStatus | null): Promise<void> {
  const old = markOn(tok);
  if (!old || old === word) return mark(word, next, lemmaReading(word, tok.surface, tok.reading));
  if (!next) return mark(old, null);
  overrides.delete(old);
  void setMark(targetLang(), old, null);
  return mark(word, next, lemmaReading(word, tok.surface, tok.reading));
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
  if (next) void refreshMarkReadings();
  // The mark shows at once either way; a failed write only costs it on reload,
  // which the learner should hear now rather than discover then.
  if (!(await setMark(targetLang(), word, next, reading))) {
    if (currentMount) showNotice(currentMount, 'mark-not-saved');
    return;
  }
  const synced = await pushMarks();
  // Say where it went. A mark is not a card: it is a hidden note in its own
  // deck, which Anki's deck list does not show — so without this, a mark that
  // reached Anki looked exactly like one that had not.
  if (currentMount) flash(currentMount, markSaid(word, next, synced), 3000);
}

/** What a mark did, in one line. */
/**
 * What a mark did, in one line: what happened to the word, and that no card
 * was made. Where the mark is kept — a hidden note in Anki, so it syncs —
 * is for settings and the help: said here, "in Anki" read as a card added.
 */
export function markSaid(word: string, next: OverrideStatus | null, synced: MarkSync | null | 'here'): string {
  if (!next) return ui.player.markOff(word);
  // Anki refused it: the one case worth saying, because it will be tried again.
  return ui.player.marked(word, next, Boolean(synced && synced !== 'here' && synced.error));
}

/**
 * Exchange marks with Anki: this browser's waiting changes go in, and every
 * mark in the collection — some made on other devices — comes back.
 */
async function pushMarks(): Promise<MarkSync | null | 'here'> {
  // Kept in this browser by choice: they wait, and go in if the setting comes back on.
  if (!settings().marksInAnki) return 'here';
  const revision = manualRevision;
  const synced = await syncMarks(targetLang());
  if (!synced) return null;   // Anki closed: the marks wait in the browser
  // A mark made while this was in flight is newer than what came back.
  if (revision === manualRevision) overrides = marksIn(synced.marks, targetLang());
  void refreshMarkReadings();
  if (synced.error) {
    log('marks could not be saved to Anki:', synced.error);
    if (currentMount) showNotice(currentMount, 'marks-not-synced', synced.error);
  }
  repaint();
  return synced;
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
  const lang = targetLang();
  const nextOverrides = await loadOverrides(lang);
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
  // A manual mark made during the fetch is newer than the storage read, and
  // a language changed to during it has marks of its own.
  if (revision === manualRevision && lang === targetLang()) overrides = nextOverrides;
  repaint();
  void refreshMarkReadings();
}

/**
 * The marks of the language being learned, read again from this browser:
 * what a change of language needs at once, without waiting on Anki.
 */
async function reloadMarks(): Promise<void> {
  // Whatever is still in flight was read for the language just left.
  const revision = ++manualRevision;
  const lang = targetLang();
  const next = await loadOverrides(lang);
  if (revision !== manualRevision || lang !== targetLang()) return;
  overrides = next;
  repaint();
  void refreshMarkReadings();
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
      if (currentMount) flash(currentMount, ui.player.queueSent(r.added));
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
  // Only cards in the language being learned: the same spelling in another is another word.
  const here = targetLang().toLowerCase();
  queuedWords = new Set(waiting.filter((q) => (langOfTags(q.card.tags) ?? here) === here).map((q) => q.word));
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
/** The language's analyser, once it has loaded: what a fresh segmenter is made from. */
let analyser: Analyser | null = null;

/** Forget every line's words, so each is analysed again by the segmenter now in place. */
function reanalyse(): void {
  segmented = new Map();
  lineTokens = new Map();
  activeKey = STALE;
  sidebar?.refreshAnalysis();
}

/**
 * Prefer real morphology, but never block on it. What the analyser reads
 * with is a one-time download of 7 to 20 MB; until it lands, tier 0 renders
 * boundaries so the overlay is useful immediately rather than blank.
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
  analyser = null;

  // The dictionary is independent of the analyser: a failure to load lindera
  // must not also cost us definitions. Only languages that have one fetch it —
  // and each its own, never JMdict to look up Spanish.
  const dictionary = dictionaryOf(lang, settings());
  if (dictionary) {
    void (async () => {
      try {
        // And the one in the learner's own language where the pair has one: asked first.
        const d = await ensureDictionary(dictionary.edition, dictionary.source, ownDictionaryOf(lang, settings()), fallbackDictionaryOf(lang, settings()));
        // The learner may have switched language while this downloaded.
        if (segmenterFor !== lang) return;
        log(
          d.ready
            ? `${dictionary.source} ready — click a word to look it up`
            : `dictionary unavailable: ${d.error ?? d.phase}`,
        );
        clearLookupCache();   // drop anything looked up before it was ready
        if (d.ready) {
          // Analysis consults the dictionary — for Japanese counters and
          // prefixes, for Chinese readings, for every Spanish dictionary form —
          // so lines analysed before it arrived carry guesses. Again, by a
          // segmenter that remembers none of them.
          const loaded = analyser as Analyser | null;   // set by the upgrade below, once it has finished
          if (loaded) segmenter = loaded.make();
          reanalyse();
        }
      } catch (e) {
        log('dictionary unavailable:', e);
      }
    })();
  }

  // Upgrade in the background.
  void (async () => {
    const found = analyserFor(lang);
    if (!found) {
      log(`no analyser for "${lang}" — staying on tier 0 (boundaries only)`);
      return;
    }
    try {
      const r = await found.load();
      if (!r.ok) {
        analyserDown(r.error);
        return;
      }
      // The learner may have switched language while this downloaded.
      if (segmenterFor !== lang) return;
      analyser = found;
      segmenter = found.make();
      reanalyse();   // with dictionary forms, and readings where the language has them
      log(`upgraded to tier ${segmenter.tier} — dictionary forms are live`);
      // What makes it read better may come long after — a second dictionary, downloaded once. The lines are
      // read again then, by a segmenter that remembers none of them.
      void found.improve?.().then((better) => {
        if (!better || segmenterFor !== lang || analyser !== found) return;
        segmenter = found.make();
        reanalyse();
        log('the analyser reads better now — lines read again');
      }, () => undefined);
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
/** `reason` is the error, in English as it came; with none, the notice says only that the analyser did not load. */
function analyserDown(reason?: string): void {
  log('analyser unavailable — boundaries only:', reason ?? 'the analyser did not load');
  if (analyserNoticed || !currentMount) return;
  analyserNoticed = true;
  showNotice(currentMount, 'analyser-unavailable', reason ?? ui.notices.analyserDidNotLoad);
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
  // Only where the language has characters to list, and the card is set to show them.
  const kind = featuresOf(targetLang()).characters;
  if (!DICTIONARIES[targetLang()] || !kind || !settings().cardKanji) return undefined;
  return charactersOf(draftFor(result, token, '').expression, definitionLanguage(settings()), kind)
    .catch(() => ({ label: '', items: [] }));
}

/**
 * What a prefix or suffix the lookup left out means. 新名所 is looked up as
 * 名所 when the dictionary has no 新名所, and 被害者側 as 被害者; the card says
 * what the 新 and the 側 add. Only kanji parts of a word that does not change
 * form, so an ending like た is not one.
 */
const KANJI_PART = /^[\u4E00-\u9FFF\u3400-\u4DBF々]+$/u;

function leftoversFor(token: Token): Promise<Array<{ part: string; reading?: string; meaning: string }>> | undefined {
  const { parts, lemma, surface } = token;
  if (!parts || parts.length < 2 || !lemma || lemma === surface || token.inflections?.length || token.name) return undefined;
  const left = parts.filter((p) => KANJI_PART.test(p) && !lemma.includes(p));
  if (!left.length) return undefined;
  return Promise.all(left.map(async (part) => {
    // As the affix it is: 生 as the suffix せい, "student", before 生 meaning "I".
    const result = await lookupToken({
      surface: part, lemma: part, lookup: [{ key: part, pos: part === parts[0] ? '接頭詞' : '名詞,接尾' }],
    }).catch(() => null);
    // The entry for the part as an affix, where there is one: 側 as が わ, a suffix, before そば, "nearby".
    const entries = result?.state === 'ok' ? result.entries : [];
    const kind = part === parts[0] ? /pref/ : /suf/;
    const top = entries.find((e) => e.senses.some((s) => s.pos?.some((p) => kind.test(p)))) ?? entries[0];
    const meaning = (top?.senses.find((s) => s.pos?.some((p) => kind.test(p))) ?? top?.senses[0])?.glosses.slice(0, 3).join('; ') ?? '';
    return { part, ...(top?.reading ? { reading: top.reading } : {}), meaning };
  })).then((all) => all.filter((x) => x.meaning));
}

/** The language's dictionary site for a word, for its card — none where the language has none. */
function dictionaryFor(token: Token, result: LookupResult): { name: string; url: string } | undefined {
  // A dictionary in the learner's own language where there is one on the web; the language's usual one otherwise.
  const site = dictionarySite(targetLang(), settings().native) ?? featuresOf(targetLang()).dictionary;
  if (!site) return undefined;
  const word = (result.state === 'ok' ? result.entries[0]?.word : undefined) ?? token.lemma ?? token.surface;
  return { name: site.name, url: site.url(word) };
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

  const at = adapter.time?.() ?? video.currentTime;
  const idx = cueIndex.at(at);
  const key = idx.join(',');
  if (key !== activeKey) {
    activeKey = key;
    if (!idx.length) {
      overlay?.clear();
    } else {
      paint(idx);
    }
    sidebar?.setActive(transcript.activeAt(at));
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
      if (root && stalledOn) showNotice(root, stalledOn.id, stalledOn.detail?.());
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
          () => ui.notices.playerNeverLoaded);
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
    if (targetInPictures(adapter)) {
      log(`the "${targetLang()}" subtitles here are pictures only`);
      showNotice(mount, 'no-target-track', ui.notices.onlyPictures);
      return true;
    }
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
      adapter.id === 'netflix' ? 'nf.textTracks' : adapter.id === 'disney' ? 'dp.master-playlist' : adapter.id === 'prime' ? 'pv.resources' : adapter.id === 'apple' ? 'apple.master' : adapter.id === 'max' ? 'mx.manifest' : 'yt.player-response',
      () => ui.notices.subtitlesMaybeOff,
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

  const { track, second: pick } = wantedTracks(tracks);

  if (!track) {
    const have = tracks.map((t) => t.lang);
    log(`no "${targetLang()}" track here — available:`, have.join(', ') || 'none');
    showNotice(mount, 'no-target-track', noTargetDetail(adapter, tracks));
    return true;   // the list is known and lacks our language; retrying is pointless
  }
  activeTrack = track.id;
  if (track.generated) {
    log('note: this track is auto-generated; segmentation will look rough');
    showNotice(mount, 'auto-generated', ui.notices.noHumanTrack);
  }

  let loaded: Cue[];
  try {
    loaded = await adapter.loadTrack(track.id);
  } catch (err) {
    if (gen !== generation) return false;
    log('could not fetch the track:', err);
    if (track.onRequest) {
      const still = (await adapter.listTracks()).find((t) => t.id === track.id);
      if (gen !== generation) return false;
      if (!still || still.onRequest) {
        // Nothing of this track is here, so no track is in use.
        activeTrack = null;
        // It came with nothing in it to read and is off the list: choose again from what is left.
        if (!still) return run(gen);
        // The site named the track and its player would not hand it over. What
        // the player draws meanwhile is another language's subtitles, not to
        // be read as this one's; say what brings the track instead. The list
        // that follows the learner's own choice is picked up (followTracks).
        showNotice(mount, 'track-not-sent', ui.notices.chooseInPlayer(track.label || track.lang));
        return true;
      }
    }
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
  // A line split at a cut is one line (src/adapters/pair.ts).
  loaded = mergeRepeats(loaded);

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
    // The toolbar's pick, or a track in the learner's own language that is
    // not a forced one (wantedTracks, chooseSecond).
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
        showNotice(mount, 'second-track-failed', ui.notices.secondTrackError(pick.label || pick.lang, String(e).slice(0, 140)));
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
        showNotice(mount, 'no-second-track', ui.notices.noSecondTrackDetail(languageList(tracks.filter((t) => !t.forced).map((t) => t.lang))));
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
      adapter.id === 'netflix' ? 'nf.caption-dom' : adapter.id === 'disney' ? 'dp.caption-dom' : adapter.id === 'prime' ? 'pv.caption-dom' : adapter.id === 'max' ? 'mx.caption-dom' : 'yt.caption-dom',
      () => ui.notices.lookedFor(adapter.domCaptions.container),
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
    const at = playhead();
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
    const bands = occupiedBands(mount, adapter.domCaptions.container, adapter.controls);
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
let languages = { target: '', variant: '', native: '', definitions: '' };
/** The status scope last read from Anki. */
let scopeRead: string | null = null;
/** The language whose hand marks are in `overrides`. */
let marksRead: string | null = null;

/** The second line only while it is wanted — the switch can flip mid-video. */
function secondLine(shown: Array<{ secondary?: string }>): string | undefined {
  if (!settings().dualSubtitles) return undefined;
  // Lines shown together can share a translation; it is shown once.
  const lines = [...new Set(shown.map((c) => c.secondary).filter((s): s is string => Boolean(s)))];
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
  o.setPanelInset(sidebar?.inset ?? 0);
  applyAnchor(o, mount, adapter);
  o.setSize(settings().subtitleSize);
  o.setRubyMode(settings().ruby);
  o.setBlurred(settings().blurPrimary);
  o.setShown(settings().showSubtitles);
  o.setMarkKnown(settings().markKnown);
  o.setUnderlines(settings().underlines);
  o.setColors(underlineVars(settings()));
  o.setLanguages(settings().target, settings().native);
  o.setRuby((tok) => rubyOf(segmenter, tok));
  o.setStatusSource(statusOf);
  o.onToken((tok, el) => void openLookup(mount, el, tok));
  o.onPhrase((words, text, el, again) => {
    const tok = phrase(words, text);
    // Clicked again while its card is open: put the card and the phrase away.
    if (again && popupShows(tok)) {
      closePopup();
      return false;
    }
    void openLookup(mount, el, tok);
    return true;
  });
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
  o.onHover((word, at, shift, pick) => {
    clearTimeout(hoverTimer);
    // A word in a marked phrase is the phrase, and its last word stands for it.
    hovering = pick ? pick.last : at;

    if (!word || !at) {
      // Leaving the word is often moving onto its card, to read it or press
      // Add. Playback resumes when the card closes (its onClose), not here —
      // resuming here restarted the video on the way to the card.
      if (!pinnedCard) closePopupSoon();
      return;
    }
    const how = settings().interaction;
    if (how === 'click' || (how === 'shift' && !shift)) return;
    // A line replaying to be recorded passes under the cursor; it is not being read.
    if (recordingLine) return;
    // A word in a marked phrase is the phrase: pointing at it again brings its card back.
    const tok = pick ? phrase(pick.words, pick.text) : word;
    const el = pick ? pick.last : at;

    // Already showing this word — do not restart anything.
    if (popupKey() === `${tok.start}:${tok.surface}`) {
      cancelPopupClose();
      return;
    }

    // Holding Shift is asking for the card; the grace period is for a cursor
    // only passing over the line.
    hoverTimer = window.setTimeout(() => {
      pauseForHover();
      void openLookup(mount, el, tok, true);
    }, how === 'shift' ? 0 : settings().hoverDelay);
  });
}

/**
 * Shift pressed with the cursor already resting on a word, when cards open
 * on Shift: the card opens then, without moving the cursor off and back.
 */
function lookUnderPointer(): void {
  const at = hovering;
  if (settings().interaction !== 'shift' || recordingLine || !currentMount || !at?.isConnected || !at.dataset.tok) return;
  const pick = phraseAt(at, '.t');
  const tok = pick ? phrase(pick.words, pick.text) : (JSON.parse(at.dataset.tok) as Token);
  if (popupKey() === `${tok.start}:${tok.surface}`) return;
  clearTimeout(hoverTimer);
  pauseForHover();
  void openLookup(currentMount, pick ? pick.last : at, tok, true);
}

/** Resume a hover pause when the card goes away — unless another took its place. */
/**
 * A card opened by a click or a key stays until it is closed: leaving the word
 * is not closing it. A hover card still closes as the pointer goes.
 */
let pinnedCard = false;

const onCardClosed = (why: 'closed' | 'replaced'): void => {
  pinnedCard = false;
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
    return { state: 'error', error: ui.player.noDictionary };
  }
  // The token's own lookup plan: its reading and part of speech pick the
  // entry, and a merged word knows which part to look up (勉強する → 勉強).
  return lookupToken(token);
}

/** Turn a lookup into an Anki note, with everything needed to review it. */
async function addCard(draft: CardDraft, token: Token, line: LineContext): Promise<Added> {
  // The deck chosen, or the language's own until one is: never another language's.
  const deck = cardDeck(settings());

  const adapter = pickAdapter();
  // The line's own start, so the card links back to where the word was said —
  // not to wherever playback has drifted to by the time Add is pressed, and
  // not to the playhead at all for a word picked from further down the
  // transcript.
  const at = line.start ?? playhead();

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
    reading: toAnkiFurigana(rubyOf(segmenter, { surface: draft.expression, reading })),
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
  const audio = settings().cardAudio
    ? { word: draft.expression, reading, lang: targetLang(), ...(draft.alt ? { also: [draft.alt] } : {}) }
    : undefined;

  let missing: MissingMedia[] = [];
  let id = 0;
  try {
    await ensureModel();
    await readyDeck();   // the language's own deck is made by its first card
    const [wordAudio, media] = await Promise.all([audio ? cardAudio(audio) : Promise.resolve(null), lineMedia(line)]);
    missing = media.missing;
    const video = adapter?.videoId() ?? 'video';
    const name = (ext: string): string => lineMediaName(video, line.start ?? at, ext);
    id = await addNote({
      ...card,
      audio: wordAudio,
      sentenceAudio: media.audio ? { data: media.audio.data, filename: name(extensionFor(media.audio.type)) } : null,
      picture: media.picture ? { data: media.picture.data, filename: name(extensionFor(media.picture.type)) } : null,
    });
  } catch (e) {
    // Anki already has it. Not a failure: say so, and let status catch up.
    if (isDuplicate(e)) {
      void refreshStatus();
      return { said: ui.player.alreadyIn(deck) };
    }
    if (!(e instanceof AnkiUnavailable)) throw e;
    // Anki is closed. Keep the card, and add it the next time Anki answers.
    const kept = await queueCard({ card, word, ...(audio ? { audio } : {}) });
    if (kept === 'failed') throw new Error(ui.player.notKept);
    if (kept === 'already') return { said: ui.player.alreadyQueued };
    manualRevision++;
    const dropped = dropMark(token);
    queuedWords.add(word);
    repaint();
    await dropped;
    watchQueue(true);
    return { said: ui.player.queued(deck), undo: unqueued(card, word) };
  }

  // Show the successful addition immediately, then let Anki's next snapshot
  // replace it. A stored "learning" override would hide maturity or deletion.
  statusRequest++;   // an older query may have started before this card existed
  manualRevision++;
  // A card now speaks for the word; a hand mark would hide what it says.
  const dropped = dropMark(token);
  addedCards.add(word);
  repaint();
  await dropped;
  void refreshStatus();
  return {
    said: ui.player.added(deck, missing),
    undo: takenBack(id, word, deck),
  };
}

/**
 * Undo for a card just added: out of Anki again — the service worker allows
 * it only for a card minutes old that has not been studied — and its word
 * back to what Anki says about it.
 */
function takenBack(id: number, word: string, deck: string): () => Promise<string> {
  return async () => {
    await takeBack(id);
    addedCards.delete(word);
    statusRequest++;
    manualRevision++;
    repaint();
    void refreshStatus();
    return ui.player.takenBack(deck);
  };
}

/** Undo for a card still waiting for Anki to open: it stops waiting. */
function unqueued(card: NewCard, word: string): () => Promise<string> {
  return async () => {
    if (!(await unqueueCard(card.deck, card.expression))) throw new Error(ui.player.alreadySent);
    queuedWords.delete(word);
    manualRevision++;
    repaint();
    return ui.player.unqueued;
  };
}

/** Anki's decks, for the card's deck menu: asked again at most once a minute. */
let decksAsked: { at: number; list: Promise<string[]> } | null = null;
function deckList(): Promise<string[]> {
  if (!decksAsked || Date.now() - decksAsked.at > 60_000) {
    decksAsked = { at: Date.now(), list: deckNames().catch(() => []) };
  }
  return decksAsked.list;
}

/** The deck menu on the card: where new cards go from now on, as in settings. */
async function chooseDeck(deck: string, create: boolean): Promise<{ deck: string; warning?: string }> {
  if (create) {
    await createDeck(deck);
    decksAsked = null;
  }
  await setSetting('deck', deck);
  const scope = settings().statusScope;
  return outsideScope(deck, scope)
    ? { deck, warning: ui.player.deckOutsideScope(scope, deck) }
    : { deck };
}

/** The Add button on a word Anki already has: its notes, in Anki's own browser. */
function showInAnki(token: Token): void {
  void browseWord(token.lemma ?? token.surface, settings().statusScope).catch((e: unknown) => {
    if (currentMount) flash(currentMount, e instanceof Error ? e.message : String(e), 4000);
  });
}

/**
 * The line as a card of its own: what the saved-lines list makes, in one
 * step and with what a word's card carries. The line on the front with the
 * readings it showed and its sound; its translation, a still and a link back
 * to the moment behind. Saving the same line twice is the same card.
 */
async function addLineCard(text: string, line: LineContext): Promise<Added> {
  const deck = cardDeck(settings());

  const adapter = pickAdapter();
  const at = line.start ?? playhead();
  const tokens = lineTokens.get(text) ?? (await segmentText(text));
  const ruby = settings().ruby;
  // The words that showed a reading, as the overlay decides it.
  const shows = (t: Token): boolean =>
    ruby === 'always' || (ruby === 'unknown' && (statusOf(t) === 'unknown' || statusOf(t) === 'learning'));
  const card: NewCard = {
    deck,
    expression: text,
    // The front shows Reading: with no analysis, it is the line as written,
    // since a card whose front is empty is one Anki refuses.
    reading: tokens.length ? lineReading(tokens, shows, (t) => rubyOf(segmenter, t)) : [{ text }],
    meaning: line.translation ?? '',
    source: sourceField({
      title: adapter?.title() ?? null,
      seconds: at,
      url: adapter?.deepLink(at) ?? null,
    }),
    tags: [...tagsFor({ source: adapter?.id ?? 'unknown', lang: targetLang() }), `${ROOT_TAG}::sentence`],
  };

  let missing: MissingMedia[] = [];
  let id = 0;
  try {
    await ensureModel();
    await readyDeck();
    const media = await lineMedia(line);
    missing = media.missing;
    const video = adapter?.videoId() ?? 'video';
    const name = (ext: string): string => lineMediaName(video, line.start ?? at, ext);
    id = await addNote({
      ...card,
      // The line is the card's subject, so its sound goes on the front.
      audio: media.audio ? { data: media.audio.data, filename: name(extensionFor(media.audio.type)) } : null,
      picture: media.picture ? { data: media.picture.data, filename: name(extensionFor(media.picture.type)) } : null,
    });
  } catch (e) {
    if (isDuplicate(e)) return { said: ui.player.sentenceAlreadyIn(deck) };
    if (!(e instanceof AnkiUnavailable)) throw e;
    // Kept like any card, but the line is recorded only as it goes in.
    const kept = await queueCard({ card, word: text });
    if (kept === 'failed') throw new Error(ui.player.notKept);
    if (kept === 'already') return { said: ui.player.sentenceAlreadyQueued };
    watchQueue(true);
    return {
      // What the settings would have put on it, which a card kept for later goes without.
      said: ui.player.sentenceQueued(deck, settings().cardSentenceAudio, settings().cardScreenshot),
      undo: unqueued(card, text),
    };
  }
  return {
    said: ui.player.sentenceAdded(deck, missing),
    undo: async () => {
      await takeBack(id);
      return ui.player.sentenceTakenBack(deck);
    },
  };
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
async function lineMedia(line: LineContext): Promise<{ audio: Media | null; picture: Media | null; missing: MissingMedia[] }> {
  const out = { audio: null as Media | null, picture: null as Media | null, missing: [] as MissingMedia[] };
  const video = activeVideo;
  const wantAudio = settings().cardSentenceAudio;
  const wantPicture = settings().cardScreenshot && Boolean(video) && !isEncrypted(video!);
  if (!video || line.start === undefined || (!wantAudio && !wantPicture)) return out;
  const start = line.start;
  const end = Math.min(line.end ?? start + 5, start + LONGEST_LINE);
  const back = playhead();
  const wasPaused = video.paused;

  let recorder: LineRecorder | null = null;
  if (wantAudio) {
    recorder = elementRecorder(video) ?? ((await tabCaptured()) ? tabRecorder() : null);
    if (!recorder) {
      out.missing.push(isEncrypted(video) ? 'audio-encrypted' : 'audio');
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
  if (currentMount) flash(currentMount, ui.player.recording, (end - start + 3) * 1000);
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
      const t = playhead();
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
  if (!out.audio) out.missing.push('audio');
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
  pinnedCard = !byHover;
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
      phrase: phrases.has(token),
      status: statusOf(token),
      marked: overrides.get(markOn(token) ?? '') ?? null,
      onMark: (word, next) => markToken(token, word, next),
      onAddCard: (draft) => addCard(draft, token, line),
      onAddLine: sentence.trim() ? () => addLineCard(sentence, line) : undefined,
      onShowInAnki: () => showInAnki(token),
      noAdd: settings().cardHideAdd,
      deck: cardDeck(settings()),
      decks: settings().cardDeckMenu ? deckList() : undefined,
      onDeck: settings().cardDeckMenu ? chooseDeck : undefined,
      colors: underlineVars(settings()),
      dictionary: dictionaryFor(token, result),
      hasCard: hasCardFor(token),
      queued: queuedWords.has(token.lemma ?? token.surface),
      elsewhere: settings().lookupElsewhere ? alsoInVideo(token, line.start) : undefined,
      onSeek: playFrom,
      onSearch: (query, forms) => sidebar?.findWord(query, forms),
      characters: charactersFor(token, result),
      leftovers: leftoversFor(token),
      lang: targetLang(),
      // The subtitle with its translation, then the line alone.
      keepClear: [el.closest('.wrap'), el.closest('.primary')].filter((x): x is Element => Boolean(x)),
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
  const at = Math.floor(atSeconds ?? playhead());
  return {
    site: adapter?.id ?? 'unknown',
    video: adapter?.videoId() ?? location.pathname,
    title: adapter?.title() ?? document.title,
    url: adapter?.deepLink(at) ?? location.href,
    lang: targetLang(),
  };
}

/** Where playback is on the cues' clock: the site's own position where its <video>'s time is not that. */
function playhead(): number {
  return pickAdapter()?.time?.() ?? activeVideo?.currentTime ?? 0;
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
    currentTime: () => playhead(),
    context: videoContext,
    onWordClick: (token, el, sentence, context) => openFromTranscript(token, el, sentence, context),
    onPhrase: (words, text, el, sentence, context, again) => {
      const tok = phrase(words, text);
      if (again && popupShows(tok)) {
        closePopup();
        return false;
      }
      openFromTranscript(tok, el, sentence, context);
      return true;
    },
    // A row's own button: the outcome is said over the player, as a mark's is.
    onAddLine: (text, context) =>
      addLineCard(text, context).then(
        ({ said }) => {
          if (currentMount) flash(currentMount, said, 3000);
        },
        (e: unknown) => {
          if (currentMount) flash(currentMount, e instanceof Error ? e.message : String(e), 5000);
          throw e;
        },
      ),
    // The Tracked view: the words marked tracking, newest first, and what can be done with each.
    marked: () => [...overrides].map(([word, status]) => ({ word, status })).reverse(),
    unmark: (word) => mark(word, null),
    addWord: async (word) => {
      const token: Token = { surface: word, lemma: word, start: 0, end: word.length, content: true };
      const draft = draftFor(await lookupFor(token), token, '');
      const { said } = await addCard(draft, token, {});
      return ui.player.wordResult(draft.expression, said);
    },
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
        phrase: phrases.has(token),
        status: statusOf(token),
        marked: overrides.get(markOn(token) ?? '') ?? null,
        onMark: (word, next) => markToken(token, word, next),
        onAddCard: (draft) => addCard(draft, token, line),
        onAddLine: sentence.trim() ? () => addLineCard(sentence, line) : undefined,
        onShowInAnki: () => showInAnki(token),
        noAdd: settings().cardHideAdd,
        deck: cardDeck(settings()),
        decks: settings().cardDeckMenu ? deckList() : undefined,
        onDeck: settings().cardDeckMenu ? chooseDeck : undefined,
        colors: underlineVars(settings()),
        dictionary: dictionaryFor(token, result),
        hasCard: hasCardFor(token),
        queued: queuedWords.has(token.lemma ?? token.surface),
        elsewhere: settings().lookupElsewhere ? alsoInVideo(token, line.start) : undefined,
        onSeek: playFrom,
        onSearch: (query, forms) => sidebar?.findWord(query, forms),
        characters: charactersFor(token, result),
        leftovers: leftoversFor(token),
        lang: targetLang(),
        keepClear: [el.closest('.line')].filter((x): x is Element => Boolean(x)),
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
    sidebarOpen: () => sidebar?.isOpen ?? false,
    inset: () => sidebar?.inset ?? 0,
    onToggleSidebar: () => showTranscript(),
    onOpenSettings: () => {
      sidebar?.toggle(true);
      sidebar?.setMode('settings');
    },
  });
  // The panel sits over the player, so making room for it means moving three
  // things: the picture, the subtitle over it, and the top bar.
  playerInset = new PlayerInset(video, mount, (lift) => overlay?.setBottomInset(lift));
  sidebar.onSavedChange(() => header?.update());
  sidebar.onLayoutChange(() => {
    const px = sidebar?.inset ?? 0;
    overlay?.setPanelInset(px);
    playerInset?.set(px);
    header?.update();
  });
  overlay?.setPanelInset(sidebar.inset);
  playerInset.set(sidebar.inset);
  void sidebar.refreshSaved();
  if (keepMode) {
    sidebar.toggle(true);
    sidebar.setMode(keepMode);
    keepMode = null;
  }

  log('sidebar ready — press S to open it');
}

/** Save the line on screen right now. The keyboard path to the bookmark. */
async function saveCurrentLine(): Promise<void> {
  const i = transcript.activeAt(playhead());
  const line = transcript.lines[i];
  if (!line || !sidebar) return;
  const saved = await sidebar.saveLine(line);
  if (currentMount) flash(currentMount, saved ? ui.player.lineSaved : ui.player.lineUnsaved);
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
    // Settled on an earlier list: this one is followed, and the subtitles
    // start over only where it changes them.
    if (rendering) {
      void followTracks(a);
      return;
    }
    void start();
  });
}

/**
 * A track list that arrives once the page has settled on an earlier one.
 *
 * Netflix sends another when its player fetches a track it had only named,
 * and a list can come twice for one video. The toolbar's lists follow it
 * either way. The subtitles start over only when this list would give
 * different ones than are on screen — a language that was missing, a second
 * line that could not be had — so a list that changes nothing for the learner
 * rebuilds nothing. start() used to drop every list after the first, which
 * left "no subtitles in your language" up after the subtitles had arrived.
 */
async function followTracks(adapter: SubtitleSource): Promise<void> {
  const gen = generation;
  const tracks = await adapter.listTracks();
  // Moved on meanwhile; or a run is in flight, which reads the list itself.
  if (gen !== generation || !rendering || starting || pickAdapter() !== adapter) return;
  if (!tracks.length || sameTracks(tracks, knownTracks)) return;
  knownTracks = tracks;
  const { track, second } = wantedTracks(tracks);
  if ((track?.id ?? null) === activeTrack && (second?.id ?? null) === activeSecond) return;
  log('the track list changed — starting over with it');
  restart();
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
  const now = playhead();
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
  // Furigana is for a language with readings; elsewhere R stays the site's.
  if (action === 'furigana' && !featuresOf(targetLang()).readings) return false;
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
    if (mount) flash(mount, ui.player.lookUpFirst);
    return;
  }
  const word = last.token.lemma ?? last.token.surface;
  if (action === 'known') {
    closePopup();
    // As the card's Known button does: on a word marked known, the mark comes off.
    const marked = overrides.get(markOn(last.token) ?? '') === 'known';
    if (!marked && statusOf(last.token) === 'known') {
      // Known from its cards: there is no mark to take off, and none needed.
      if (mount) flash(mount, ui.player.alreadyKnown(word));
      return;
    }
    // mark() says where it went.
    void markToken(last.token, word, marked ? null : 'known');
    return;
  }
  // A card already there is said, not made again.
  if (hasCardFor(last.token)) {
    if (mount) flash(mount, ui.player.alreadyInAnki(word));
    return;
  }
  const draft = draftFor(last.result, last.token, last.sentence);
  if (mount) flash(mount, ui.player.adding(draft.expression), 8000);
  void addCard(draft, last.token, last.line).then(
    ({ said }) => mount && flash(mount, ui.player.wordResult(draft.expression, said)),
    (e: unknown) => mount && flash(mount, e instanceof Error ? e.message : String(e), 4000),
  );
}

function act(action: KeyAction): void {
  const mount = currentMount;
  switch (action) {
    case 'previous':
    case 'next':
    case 'replay':
      if (!goToLine(action) && mount) flash(mount, action === 'next' ? ui.player.lastLine : ui.player.noLineBefore);
      return;
    case 'second': {
      // Translation off, then subtitles off, then both on: as the header's button steps.
      const next = nextSubtitleView(settings());
      void setSetting('dualSubtitles', next.dualSubtitles)
        .then(() => setSetting('showSubtitles', next.showSubtitles))
        .then(() => header?.update());
      if (mount) {
        flash(mount, !next.showSubtitles ? ui.player.subtitlesOff : next.dualSubtitles
          ? ui.player.subtitlesOn : ui.player.translationOff);
      }
      return;
    }
    case 'furigana': {
      const next = nextRuby(settings().ruby);
      void setSetting('ruby', next).then(() => header?.update());
      // Named for what the language draws above its words: furigana, pinyin.
      if (mount) flash(mount, ui.common[featuresOf(targetLang()).readings || 'furigana'](next));
      return;
    }
    case 'blur': {
      const on = !settings().blurPrimary;
      void setSetting('blurPrimary', on).then(() => header?.update());
      if (mount) flash(mount, on ? ui.player.blurOn : ui.player.blurOff);
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
      showTranscript();
  }
}

/**
 * The transcript, from the bar's button or S: shown in place of settings or
 * another of the panel's views, and the panel closed only from the
 * transcript itself — it used to close the panel showing settings instead.
 */
function showTranscript(): void {
  sidebar?.toggleTranscript();
  header?.update();
}

/** Keys taken on the way down, whose release must not reach the page either. */
const taken = new Set<string>();

// Capture phase, so the keys reach us before the player's own shortcuts.
document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape') {
      closePopup();
      overlay?.clearPhrase();
      sidebar?.clearPhrase();
    }
    if (e.key === 'Shift' && !e.repeat && !isTyping(e)) lookUnderPointer();
    // A focused control of ours keeps its own keys: → moves along the panel's
    // tabs, ↓ down the transcript, Enter presses a word, rather than the player's.
    if (isControlKey(e)) return;
    const action = keyAction(e, settings().singleKeys);
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

// The interface is in your language (src/i18n): set before anything is drawn,
// and ahead of every listener below, so what a change redraws is in the new one.
// A language's words are a file of their own, which the service worker runs
// into this script's world when asked.
setTranslationLoader((lang) => chrome.runtime.sendMessage({ type: 'load-strings', lang }));
onSettingsChange((s) => setUiLanguage(s.native));
void loadSettings().then(async (s) => {
  await loadUiLanguage(s.native);
  log(`lookup opens on ${s.interaction}`);
  await reloadQueued();
  appearance = { size: s.subtitleSize, bottom: s.subtitleBottom, dual: s.dualSubtitles };
  languages = { target: s.target, variant: targetVariant(s), native: s.native, definitions: definitionLanguage(s) };
  scopeRead = s.statusScope;
  marksRead = s.target;
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
// Hand marks are kept by language. Another language's come in with it, even
// when both read the same decks and nothing else is read again.
onSettingsChange((s) => {
  if (s.target === marksRead) return;
  marksRead = s.target;
  void reloadMarks();
  void reloadQueued();
});
onSettingsChange((s) => {
  if (s.interaction !== 'hover') closePopup();
});
// Whether articles and pronouns count as words to learn is decided when a line is analysed.
let grammarCounted: boolean | null = null;
onSettingsChange((s) => {
  if (grammarCounted !== null && s.underlineGrammar !== grammarCounted) reanalyse();
  grammarCounted = s.underlineGrammar;
});
// Marks kept in the browser go into Anki the moment keeping them there comes back on.
let marksInAnki: boolean | null = null;
onSettingsChange((s) => {
  if (marksInAnki === false && s.marksInAnki) void pushMarks();
  marksInAnki = s.marksInAnki;
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
  overlay?.setShown(s.showSubtitles);
  overlay?.setMarkKnown(s.markKnown);
  overlay?.setUnderlines(s.underlines);
  overlay?.setColors(underlineVars(s));

  // The script counts with the language: Traditional Chinese is another track of the same video.
  const learningChanged = s.target !== languages.target || targetVariant(s) !== languages.variant;
  const nativeChanged = s.native !== languages.native;
  const languageChanged = learningChanged || nativeChanged || definitionLanguage(s) !== languages.definitions;
  const dualTurnedOn = s.dualSubtitles && !appearance.dual;
  appearance = { size: s.subtitleSize, bottom: s.subtitleBottom, dual: s.dualSubtitles };
  languages = { target: s.target, variant: targetVariant(s), native: s.native, definitions: definitionLanguage(s) };

  if (languageChanged) {
    // A new target needs a new analyser and new tracks; a new native language
    // a new dictionary edition and a new second line. None of it is live
    // without starting over.
    log('language changed — starting over');
    // A track picked in the toolbar was picked for the language just left:
    // kept, it stayed on screen in the old language, read as the new one.
    if (learningChanged) chosenTrack = null;
    if (nativeChanged) chosenSecond = null;
    segmenter = null;
    analyserNoticed = false;
    clearLookupCache();
    // Changed from the panel's settings: the new panel opens on them again.
    keepMode = sidebar?.isOpen ? sidebar.mode : null;
    // Drawn again once the interface's words are here, if they changed too.
    void loadUiLanguage(s.native).then(restart);
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
      // The track in use; while a pick is loading, the pick. Settled with
      // nothing loaded, nothing: a pick that failed is not in use.
      track: activeTrack ?? (rendering ? null : chosenTrack),
      // What the notice over the player says, for when nothing is in use.
      notice: noticeShown()?.title ?? null,
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
    // The toolbar popup's Toggle Sidebar: open or close the panel, on whatever it was showing.
    sidebar?.toggle();
    header?.update();
    respond({ ok: true, open: sidebar?.isOpen ?? false });
    return true;
  }

  return false;
});

log('content script loaded on', location.href);
