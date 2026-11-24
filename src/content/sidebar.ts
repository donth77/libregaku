import { lookupToken, type LookupResult } from '../dict/client';
import { addSentence, isDuplicate, probe } from '../anki/client';
import { readyDeck } from '../anki/deck';
import { ROOT_TAG, tagsFor } from '../anki/model';
import { sourceField } from '../anki/source';
import { icon } from './icons';
import { TIP_STYLE, tooltips } from './tooltip';
import * as bookmarks from './bookmarks';
import type { Bookmark } from './bookmarks';
import { copyText, copyWhenReady, downloadText, tsvCell } from './share';
import type { Segmenter, Token } from '../morphology/types';
import type { OverrideStatus } from '../anki/status';
import { applyVars, onSettingsChange, setSetting, settings, underlineVars, type Settings } from '../settings';
import { markPhrase, phraseAt, phraseToken, selectWhole, selectedWords, textFrom } from './phrase';
import { matcher } from './search-text';
import { rubyOf } from '../morphology/ruby';
import { romanised, roomFor, sidesOf, type Drawn } from './ruby-room';
import { PANEL_STYLE, buildSettings, keysView, syncSettingsControls } from './settings-panel';
import { letterKey } from './keys';
import { partsOfSpeech, popupIsOpen } from './popup';
import type { Transcript, Line } from './transcript';
import { TokenCache, countWords, estimateRowHeight, nextFrame, now, whenIdle, type Count } from './transcript-work';
import { fill, grammarLabel, ui, uiDirection, uiLocale } from '../i18n';

/**
 * The transcript panel.
 *
 * This is what separates a study tool from a subtitle overlay: the whole script
 * beside the video, clickable, so you can read ahead, go back, and work a scene
 * without scrubbing. No open-source extension has one.
 *
 * Plain DOM rather than Preact, which the design nominated: this is a list and
 * a search box, and a framework would earn its place only once there is more
 * state than that. Revisit when card-making controls land.
 *
 * Hover previews a definition here, unlike the overlay, which requires a click.
 * The distinction is deliberate — the overlay sits over playing video where a
 * hover card covers the next line, while the transcript is static text you are
 * deliberately studying.
 */

const WIDTH_KEY = 'libregaku.sidebar.width';
const MIN_WIDTH = 280;
const MAX_WIDTH = 680;
const HOVER_DELAY = 180;
/** The hover card's rendered width, for when layout cannot measure it. */
const HOVER_WIDTH = 298;
/** Keys that scroll a list from the keyboard. */
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
/** Keys that move within the tabs, the resize grip, and the transcript's lines and words. */
const MOVE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']);
/** How far ← or → moves the resize grip, in px. */
const WIDTH_STEP = 20;

/*
 * The list's budget. A film is 1,500–5,000 lines; the panel shows six or so.
 *
 * Every line gets a row, but a cheap one, and rows are grouped in blocks the
 * browser lays out only near the screen. Words, readings and buttons are
 * built for the blocks within a screen's height of what is showing, a few
 * rows at a time per frame, and kept once built. Counting — which needs every
 * line — runs behind all of that with a handful of requests in flight.
 */
/** Rows per block: the unit the browser skips, and the unit that is built. */
const BLOCK = 10;
/** Rows built at once when the list opens, around what it opens on. */
const PRIME = 24;
/** Rows built either side of a line the list jumps to. */
const AROUND = 6;
/** How far beyond the visible list a block counts as near: a screen each way. */
const NEAR = '100% 0px';
/** Analyser requests the counter keeps open; the rest wait their turn. */
const COUNT_IN_FLIGHT = 8;
/** Main-thread time one slice of counting or building may take, in ms. */
const SLICE_MS = 8;
/** How long a jump keeps its line centred while estimated heights settle, in ms. */
const PIN_MS = 1200;
/** Frames a jump is checked for after it lands, while the blocks around it are first drawn. */
const HOLD_FRAMES = 4;
/** How often a count in progress repaints its progress, in ms. */
const PROGRESS_MS = 250;

type Filter = 'all' | 'unknown' | 'i1' | 'saved';

/** The filters, in the order their menu lists them. */
const FILTERS: readonly Filter[] = ['all', 'unknown', 'i1', 'saved'];

/** A filter's name in its menu, and what it shows. Read when drawn: the interface language can change. */
const filterText = (key: Filter): { label: string; about: string } => ({
  all: { label: ui.sidebar.filterAll, about: ui.sidebar.filterAllAbout },
  unknown: { label: ui.sidebar.filterNew, about: ui.sidebar.filterNewAbout },
  i1: { label: ui.sidebar.filterReady, about: ui.sidebar.filterReadyAbout },
  saved: { label: ui.sidebar.filterSaved, about: ui.sidebar.filterSavedAbout },
})[key];

/** What the panel is showing: the transcript, or one of the views over it. */
type PanelMode = 'transcript' | 'settings' | 'saved' | 'keys';

/** The marks the Saved view lists, one list each. */
type WordMark = 'tracking' | 'known' | 'ignored';

/**
 * The Saved view's lists: lines kept from the transcript, then words by
 * their mark. Saved lines and tracked words were two tabs doing one job —
 * keeping something to come back to — and they worked differently.
 */
type SavedList = 'lines' | WordMark;

/** The lists, in the order their buttons show. */
const SAVED_LISTS: readonly SavedList[] = ['lines', 'tracking', 'known', 'ignored'];

/** Rows drawn at a time in a long list (lazyRows). */
const LIST_BLOCK = 40;

/** A marked word's reading and first meaning, from the dictionary. */
interface WordInfo {
  reading: string;
  meaning: string;
}

/** Each list's name in a file saved from it. */
const WORD_FILE: Record<WordMark, string> = { tracking: 'tracked', known: 'known', ignored: 'ignored' };

/**
 * What each list is called and says, and what taking its mark off is called
 * — as on the word's card. Read when drawn: the interface language can change.
 */
const wordList = (mark: WordMark): { name: string; empty: string; intro: (n: number) => string; unmark: string } => ({
  tracking: {
    name: ui.sidebar.listTracked,
    empty: ui.sidebar.trackedEmpty,
    intro: ui.sidebar.trackedIntro,
    unmark: ui.sidebar.stopTracking,
  },
  known: {
    name: ui.sidebar.listKnown,
    empty: ui.sidebar.knownEmpty,
    intro: ui.sidebar.knownIntro,
    unmark: ui.sidebar.unmarkKnown,
  },
  ignored: {
    name: ui.sidebar.listIgnored,
    empty: ui.sidebar.ignoredEmpty,
    intro: ui.sidebar.ignoredIntro,
    unmark: ui.sidebar.stopIgnoring,
  },
})[mark];

/** Ten lines of the transcript, and their rows once they have been made. */
interface Block {
  el: HTMLElement;
  lines: Line[];
  /** Whether its rows exist. An unfilled block is a placeholder of its estimated height. */
  filled: boolean;
  /** The estimated height of all its rows. */
  height: number;
}

/**
 * A way to the help page from the panel. A page cannot open an extension
 * page itself, so the service worker opens it (background.ts, open-help).
 */
function helpLink(label: string, topic?: string): HTMLElement {
  const row = document.createElement('div');
  row.className = 'helprow';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'helplink';
  b.append(icon('external', 13), document.createTextNode(label));
  b.addEventListener('click', () => {
    void chrome.runtime.sendMessage({ type: 'open-help', ...(topic ? { topic } : {}) }).catch(() => {});
  });
  row.appendChild(b);
  return row;
}

/** Where a transcript word came from, for a card made from it. */
export interface WordContext {
  /** When the line starts, in seconds — the card's timestamp and link. */
  start?: number;
  /** When it ends, for recording it. */
  end?: number;
  /** The line's second-track translation. */
  translation?: string;
}

const clampWidth = (w: number): number => Math.min(Math.max(MIN_WIDTH, w), MAX_WIDTH);

/**
 * Whether the control a key was pressed in uses that key itself.
 *
 * Text fields and selects use every key. Buttons and switches use only the
 * two that press them. The tabs, the resize grip and the transcript also use
 * the arrows, Home and End, which move between them. Anything else —
 * including a button that merely had focus — leaves the key to the player.
 */
function consumesKey(target: EventTarget | undefined, key: string): boolean {
  const el = target as HTMLElement | undefined;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') return true;
  const presses = key === ' ' || key === 'Enter';
  if (tag === 'input') {
    return /^(checkbox|radio|button|submit|reset)$/.test((el as HTMLInputElement).type) ? presses : true;
  }
  if (MOVE_KEYS.has(key) && el.closest('[role=tablist], [role=separator], .lines')) return true;
  return (tag === 'button' || el.getAttribute('role') === 'button') && presses;
}

/** Whether ← moves forward from here: in right-to-left text, what comes next is to the left. */
function rtlAt(el: Element): boolean {
  const dir = getComputedStyle(el).direction;
  return dir ? dir === 'rtl' : uiDirection() === 'rtl';
}

/**
 * One subscription for the module, handed on to whichever panels are alive.
 *
 * `onSettingsChange` cannot unsubscribe, so a listener per panel would keep
 * every panel ever built — one per video watched in the tab — alive for good.
 */
const watchers = new Set<(s: Settings, here: boolean) => void>();
let watching = false;

function watchSettings(fn: (s: Settings, here: boolean) => void): () => void {
  if (!watching) {
    watching = true;
    onSettingsChange((s, here) => watchers.forEach((w) => w(s, here)));
  }
  watchers.add(fn);
  return () => watchers.delete(fn);
}

const STYLE = `
  /*
   * The bottom edge stops at the site's own control bar. The panel used to run
   * to the bottom of the player, over captions, settings, theater and
   * fullscreen, which could not then be clicked while it was open. The height
   * arrives as a custom property because every edge here is pinned with
   * !important, and an inline style cannot beat that.
   */
  :host {
    /* Text starts where the interface's language starts: the page around sets left, which is wrong in Arabic. */
    text-align: start !important;
    position: absolute !important;
    top: 0 !important; right: 0 !important; bottom: var(--lg-bottom, 0px) !important;
    z-index: 2147483646 !important;
    pointer-events: none !important;
  }

  /*
   * Collapsed state.
   *
   * A tab rather than nothing, because closing the panel used to be a one-way
   * door — the only way back was a keyboard shortcut with no visible trace.
   * Anything reversible needs a visible way to reverse it.
   *
   * Deliberately not a full-height rail: this sits over someone's video, and a
   * strip down the whole edge is a permanent intrusion where a small tab is
   * not. It also fades while the cursor is still, following the player's own
   * chrome rather than competing with it.
   */
  .tab {
    pointer-events: auto;
    position: absolute; right: 0; top: 50%; transform: translateY(-50%);
    width: 26px; height: 76px; padding: 0;
    display: flex; align-items: center; justify-content: center;
    background: rgba(13,17,28,.82); color: #DDE3F0;
    border: 1px solid #2A3348; border-right: 0;
    border-radius: 8px 0 0 8px;
    cursor: pointer; backdrop-filter: blur(6px);
    opacity: .7; transition: opacity .18s, background .18s, color .18s;
  }
  .tab:hover, .tab:focus-visible { opacity: 1; background: #141A2A; color: #E8ECF6; }
  :host(.active) .tab { opacity: .9; }
  .tab svg { display: block; }
  @media (prefers-reduced-motion: reduce) { .tab { transition: none; } }
  .panel {
    pointer-events: auto;
    position: absolute; top: 0; right: 0; bottom: 0;
    display: flex; flex-direction: column;
    background: rgba(13,17,28,.94); color: #E8ECF6;
    border-left: 1px solid #2A3348;
    font: 14px/1.5 system-ui, -apple-system, "Hiragino Sans", sans-serif;
    backdrop-filter: blur(8px);
  }
  .grip {
    position: absolute; left: -3px; top: 0; bottom: 0; width: 7px;
    cursor: col-resize; z-index: 2;
  }
  .grip:hover { background: rgba(242,245,252,.28); }
  .grip:focus-visible { background: rgba(242,245,252,.28); outline: 2px solid #F2F5FC; outline-offset: -2px; }
  /*
   * Right to left (Arabic): the panel on the player's left, where the
   * interface starts, with its tab, edge and resize grip, and what floats
   * inside it mirrored. That edge can be the window's own, where a site may
   * keep something above the whole player: YouTube's closed guide drawer
   * does, and subs.css lets clicks through it.
   */
  :host([dir=rtl]) { right: auto !important; left: 0 !important; }
  :host([dir=rtl]) .tab { right: auto; left: 0; border-left: 0; border-right: 1px solid #2A3348; border-radius: 0 8px 8px 0; }
  :host([dir=rtl]) .tab svg { transform: scaleX(-1); }
  :host([dir=rtl]) .panel { right: auto; left: 0; border-left: 0; border-right: 1px solid #2A3348; }
  :host([dir=rtl]) .grip { left: auto; right: -3px; }
  /* A div, not a header: inside the panel, a header read as the page's banner. */
  .head {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 12px 14px; border-bottom: 1px solid #212939;
    font: 600 11px/1.4 ui-monospace, monospace; letter-spacing: .12em;
    text-transform: uppercase; color: #838DA8; flex: none;
  }
  button {
    background: none; border: 0; color: #838DA8; cursor: pointer;
    font: 600 11px/1 ui-monospace, monospace; letter-spacing: .08em;
    text-transform: uppercase; padding: 4px 6px;
  }
  button:hover { color: #E8ECF6; }
  button:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; border-radius: 3px; }
  /* Header controls are icons: three text buttons crowded a 340px column and
     read as a toolbar rather than as chrome. */
  .head { gap: 10px; padding: 8px 10px 0 8px; align-items: flex-end; text-transform: none; letter-spacing: normal; }
  .head .controls { display: flex; align-items: center; gap: 2px; padding-bottom: 6px; }
  /* The lists, as tabs: the one showing underlined, each with what it holds. */
  .tabs { display: flex; align-items: flex-end; gap: 2px; min-width: 0; }
  .tabbtn {
    display: inline-flex; align-items: baseline; gap: 6px; padding: 8px 10px 9px;
    background: none; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
    color: #A3ACC4; font: 600 13.5px/1.2 system-ui, -apple-system, sans-serif; white-space: nowrap;
    text-transform: none; letter-spacing: normal;   /* not the panel's small-capitals buttons */
  }
  .tabbtn:hover { color: #E8ECF6; }
  .tabbtn[aria-selected="true"] { color: #F2F5FC; border-bottom-color: #F2F5FC; }
  .tabbtn .n { font: 600 11px/1 ui-monospace, monospace; color: #8A94AF; font-variant-numeric: tabular-nums; }
  .tabbtn[aria-selected="true"] .n { color: #C7CFE2; }
  .tabbtn:focus-visible { outline: 2px solid #F2F5FC; outline-offset: -2px; border-radius: 6px; }
  .ico[aria-pressed="true"] { background: rgba(242, 245, 252, .1); color: #F2F5FC; }
  .viewtitle {
    flex: none; padding: 14px 16px 2px;
    font: 700 17px/1.25 system-ui, -apple-system, sans-serif; color: #F2F5FC; letter-spacing: -.01em;
  }
  .viewtitle[hidden] { display: none; }
  /* What the tabs show: the transcript and its controls, or another view. */
  .view { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .ico {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0; border-radius: 6px;
  }
  .ico:hover { background: #212939; color: #E8ECF6; }
  .ico[aria-pressed="false"] { color: #838DA8; }
  .ico svg { display: block; }
  .search {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; border-bottom: 1px solid #212939; flex: none;
  }
  .search input { flex: 1; min-width: 0; }
  .search .count {
    flex: none; white-space: nowrap;
    font: 12px/1 ui-monospace, monospace; color: #838DA8; font-variant-numeric: tabular-nums;
  }
  /* Empty, it stays rendered, out of the way: a live region shown only once it has words is not read out. */
  .search .count:empty { margin-inline-start: -8px; }
  input {
    width: 100%; box-sizing: border-box; padding: 8px 11px;
    background: #12172A; border: 1px solid #6B7490; border-radius: 6px;
    color: #E8ECF6; font: 14px system-ui, sans-serif;
  }
  input::placeholder { color: #8A94AF; }
  input:focus { outline: none; border-color: #8A94AF; }
  /* A ring, as on the buttons: with the border this light at rest, a lighter border alone barely shows. */
  input:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 1px; }
  .filters { display: flex; gap: 5px; padding: 0 12px 9px; flex: none; }
  .f {
    font: 600 10px/1 ui-monospace, monospace; letter-spacing: .06em;
    text-transform: uppercase; padding: 6px 10px; border-radius: 5px;
    border: 1px solid #2A3348; background: #12172A; color: #838DA8; cursor: pointer;
  }
  .f[aria-pressed="true"] { background: #F2F5FC; color: #0D111C; border-color: #F2F5FC; }
  .summary {
    padding: 12px 14px 10px; font-size: 13.5px; color: #B4BDD4;
    display: flex; gap: 12px; flex-wrap: wrap; font-variant-numeric: tabular-nums;
  }
  .summary b { color: #E8ECF6; }
  .note {
    padding: 9px 14px; font-size: 12px; color: #D9A64A;
    background: #2C2314; border-bottom: 1px solid #212939; flex: none;
  }
  .lines { overflow-y: auto; flex: 1; overscroll-behavior: contain; padding: 10px 12px 80px; }

  /*
   * A card per line rather than a table row.
   *
   * Subtitles are variable-length prose, not tabular data. Rows forced the
   * text into a narrow column beside a timestamp gutter and gave long lines
   * nowhere to go; a card lets the text use the full width and puts the timing
   * underneath, where it is reference rather than structure.
   */
  .line {
    display: block; width: 100%; box-sizing: border-box;
    padding: 14px 16px 11px; margin-bottom: 10px;
    background: #141A2A; border: 1px solid #232C42; border-radius: 11px;
    cursor: pointer;
  }
  .line:hover { border-color: #33405C; background: #171E30; }
  /* Rings drawn inside the card: a block clips what its rows paint outside
     it, so an outer glow was cut off on the first and last row of each. */
  .line.cur {
    border-color: #C7CFE2;
    box-shadow: inset 0 0 0 1px #C7CFE2;
    background: #182033;
  }
  .line.hit { border-color: #D9A64A; }
  .line.hit-cur { border-color: #D9A64A; box-shadow: inset 0 0 0 1px #D9A64A; }
  .line.hide { display: none; }

  /*
   * Rows in blocks the browser lays out and paints only near the screen. Off
   * it, a block is a box of its estimated height, then of the height it last
   * had once it has been shown. Per block rather than per row: the browser
   * watches each one for visibility, and ten times fewer is ten times cheaper
   * on every scrolled frame.
   */
  .blk { content-visibility: auto; contain-intrinsic-size: auto 1150px; }
  .blk.hide { display: none; }
  .wait {
    padding: 9px 14px; font-size: 12px; color: #8A94AF; flex: none;
    border-bottom: 1px solid #212939;
  }
  .wait[hidden] { display: none; }
  .summary .pending { color: #838DA8; }

  /*
   * Selectable, as the overlay's line is: dragging across words, or
   * shift-clicking a second one, is how a phrase is picked. The panel sits
   * inside the player, and YouTube's player turns selection off for
   * everything in it — this panel included, until it said otherwise.
   */
  .tx {
    display: block; font-size: 21px; line-height: 1.7;
    color: #E8ECF6; word-break: normal; overflow-wrap: anywhere;
    user-select: text; -webkit-user-select: text;
  }
  /* Space for the readings is reserved by line-height, not per token, so
     annotated and bare words sit on the same baseline. */
  /* Only annotated lines get the taller leading, so a card with no readings
     is no taller than its text. */
  .tx.has-ruby { line-height: 2.3; }
  .tx ruby { display: inline-block; position: relative; line-height: 1; }
  .tx rt {
    position: absolute; left: 50%; bottom: calc(100% + .04em);
    transform: translateX(-50%);
    font-size: .46em; line-height: 1; color: #B8C0D4;
    white-space: nowrap; user-select: none; pointer-events: none;
  }
  /* A romanised reading (pinyin, Jyutping) widens its character's box by a hidden copy of itself, as on the subtitle. */
  .tx ruby[data-r] { text-align: center; }
  .tx ruby[data-r]::after {
    content: attr(data-r); display: block; height: 0; overflow: hidden; visibility: hidden;
    font-size: .46em; white-space: nowrap; padding: 0 .12em;
  }
  /* A reading wider than its characters is given room, and leans off a neighbour's reading, as on the subtitle (ruby-room.ts). */
  .tx ruby[data-k] { padding: 0 var(--lg-after, 0em) 0 var(--lg-before, 0em); }
  .tx ruby[data-k] rt { left: calc(50% + var(--lg-lean, 0em)); }
  .lines.ruby-off .tx ruby[data-k],
  .lines:not(.ruby-all) .w:not([data-s="unknown"]):not([data-s="learning"]) ruby[data-k] { padding: 0; }

  /* Square corners: a rounded box bent each underline up at its ends. */
  .w { cursor: pointer; padding: 0 1px 3px; }
  .w:hover { background: #262F45; }
  .w:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 1px; }
  .tx .p { padding: 0 0 3px; }
  /* A phrase: one band across its words and the marks between, as on the subtitle. */
  .tx.phrased ::selection { background: transparent; }
  /* Solid, as on the subtitle: a see-through colour darkens wherever two pieces meet. */
  .w.inphrase, .tx .p.inphrase { background: #36508C; border-radius: 0; }
  /* The word whose card is open: the same band a phrase gets. */
  .w.picked:not(.inphrase) { background: #36508C; }
  .w[data-s="unknown"]  { box-shadow: inset 0 -2.5px 0 var(--lg-unknown, #E5806C); }
  .w[data-s="learning"] { box-shadow: inset 0 -1.5px 0 var(--lg-learning, #D9A64A); }
  .w[data-s="tracking"] { box-shadow: inset 0 -2px 0 var(--lg-tracking, #A78BFA); }
  .lines.mark-known .w[data-s="known"] { box-shadow: inset 0 -1.5px 0 var(--lg-known, #63AF97); }

  /*
   * Readings follow the overlay's setting, keyed on the same status. The
   * transcript used to annotate every word while the overlay annotated only new
   * ones, which put two opinions about what you know side by side.
   */
  .lines:not(.ruby-all) .w:not([data-s="unknown"]):not([data-s="learning"]) rt { visibility: hidden; }
  .lines.ruby-off rt { display: none; }
  /* The taller leading is only for lines where a reading will actually show. */
  .lines.ruby-off .tx.has-ruby,
  .lines:not(.ruby-all) .tx.has-ruby:not(.has-new-ruby) { line-height: 1.7; }

  /*
   * Time left, count right, the save button after it.
   *
   * Spacing them apart across three items left the count floating in the middle
   * of the row, anchored to nothing and moving with the width of the
   * timestamp. Pushed to the right instead, the counts line up down the list,
   * which is the whole reason for having them: you are scanning for the
   * lines with one new word, not reading each number in place.
   */
  .meta {
    display: flex; align-items: center; gap: 10px;
    margin-top: 7px;
    font: 12px/1.4 ui-monospace, monospace; color: #8A94AF;
    font-variant-numeric: tabular-nums;
  }
  /* A line's time is the button that plays from it, and looks like the time it is. */
  .meta .seek {
    padding: 0; border-radius: 3px; color: inherit;
    font: inherit; letter-spacing: normal; text-transform: none;
  }
  .meta .seek:hover { color: #E8ECF6; }
  /* The row's buttons at the right of its time; the count is up in its corner. */
  .line .meta > button:first-of-type { margin-inline-start: auto; }
  .line > .x {
    float: right; margin: 3px 0 4px 10px; padding: 1px 8px; border-radius: 999px;
    font: 600 11.5px/1.6 ui-monospace, monospace; font-variant-numeric: tabular-nums;
  }
  .line > .x:empty { display: none; }
  :host([dir=rtl]) .line > .x { float: left; margin: 3px 10px 4px 0; }
  .line > .x.hot { background: rgba(229, 128, 108, .14); }
  .line > .x.one { background: rgba(217, 166, 74, .14); }
  .line .meta { clear: both; }
  /* A saved line has no count, so its remove button takes the right edge. */
  .sv .meta .save { margin-inline-start: auto; }
  .x { font: inherit; white-space: nowrap; }
  .x.hot { color: #E5806C; font-weight: 600; }
  .x.one { color: #D9A64A; font-weight: 600; }

  .sec { display: block; font-size: 14.5px; line-height: 1.6; color: #838DA8; margin-top: 6px; }
  .empty { padding: 20px 14px; color: #8A94AF; font-size: 13.5px; }

  /*
   * Filters float rather than occupying a permanent strip. They matter while
   * choosing words to learn and never while reading, and the transcript is
   * what the panel is for.
   */
  .fab {
    position: absolute; right: 16px; bottom: 16px; z-index: 3;
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #182033; border: 1px solid #343E58; color: #E8ECF6;
    box-shadow: 0 6px 20px -6px rgba(0,0,0,.7); cursor: pointer; padding: 0;
  }
  .fab:hover { background: #1F2840; color: #F2F5FC; }
  .fab.on { background: #F2F5FC; color: #0D111C; border-color: #F2F5FC; }
  /*
   * The way back after reading ahead. Only present while the line being
   * spoken is out of sight, so it is never chrome — it is an answer to the
   * one question a scrolled-away transcript raises.
   */
  .now {
    position: absolute; left: 16px; bottom: 16px; z-index: 3;
    display: none; align-items: center; gap: 5px;
    height: 36px; padding: 0 14px 0 10px; border-radius: 18px;
    background: #182033; border: 1px solid #343E58; color: #E8ECF6;
    font: 600 11px/1 ui-monospace, monospace; letter-spacing: .07em; text-transform: uppercase;
    box-shadow: 0 6px 20px -6px rgba(0,0,0,.7); cursor: pointer;
  }
  .now.on { display: inline-flex; }
  .now:hover { background: #1F2840; color: #F2F5FC; }
  .now svg { display: block; transform: rotate(90deg); }
  .now.up svg { transform: rotate(-90deg); }
  .filters {
    position: absolute; right: 16px; bottom: 64px; z-index: 3;
    display: none; flex-direction: column; gap: 4px;
    background: #141A2A; border: 1px solid #2A3348; border-radius: 8px;
    padding: 6px; box-shadow: 0 8px 28px -8px rgba(0,0,0,.75);
  }
  .filters.open { display: flex; }
  :host([dir=rtl]) .fab, :host([dir=rtl]) .filters { right: auto; left: 16px; }
  :host([dir=rtl]) .now { left: auto; right: 16px; padding: 0 10px 0 14px; }
  .f {
    font: 600 11px/1 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; padding: 9px 13px; border-radius: 6px;
    border: 1px solid transparent; background: none; color: #838DA8;
    cursor: pointer; text-align: start; white-space: nowrap;
  }
  .f:hover { background: #1B2234; color: #E8ECF6; }
  .f[aria-pressed="true"] { background: #F2F5FC; color: #0D111C; border-color: #F2F5FC; }

  .hover {
    position: fixed; z-index: 2147483647; width: 270px;
    background: #12172A; border: 1px solid #2A3348; border-radius: 9px;
    box-shadow: 0 8px 28px -6px rgba(0,0,0,.7); padding: 11px 13px;
    pointer-events: none; display: none;
  }
  .hover.on { display: block; }
  .hw { font-size: 17px; font-weight: 600; }
  .hr { font: 500 11px ui-monospace, monospace; color: #B8C0D4; margin-inline-start: 6px; }
  .hp { font: 11px ui-monospace, monospace; color: #8A94AF; margin: 2px 0 4px; letter-spacing: .05em; }
  .hd { font-size: 13.5px; color: #C7CFE2; }
  .hg { margin-top: 6px; font-size: 12.5px; color: #A3ACC4; }
  .save, .addline {
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; padding: 0; margin: -4px -5px -4px 0;
    background: none; border: 0; border-radius: 4px;
    color: #5F6982; cursor: pointer; opacity: 0; transition: opacity .12s ease;
  }
  .line:hover .save, .save.on, .save:focus-visible { opacity: 1; }
  .line:hover .addline, .addline:focus-visible, .addline.busy { opacity: 1; }
  .addline { margin-right: 0; }
  :host([dir=rtl]) .save { margin: -4px 0 -4px -5px; }
  :host([dir=rtl]) .addline { margin-left: 0; }
  .addline.busy svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .addline.busy svg { animation: none; } }
  .save:hover, .addline:hover { background: rgba(255,255,255,.08); color: #C7CFE2; }
  .save.on { color: #F2F5FC; }
  .save.on svg { fill: currentColor; }
  /* The Saved view: its buttons, search and actions stay put while the list scrolls under them. */
  .savedview { display: flex; flex-direction: column; flex: 1; min-height: 0; }
  .svhead { flex: none; padding-bottom: 12px; border-bottom: 1px solid #212939; }
  .svlist { flex: 1; min-height: 0; overflow-y: auto; padding: 0 0 14px; }
  /* A drawn block of rows, which the browser skips while it is off screen. */
  .svlist .blk { content-visibility: auto; contain-intrinsic-size: auto 600px; }
  .said { margin-top: 9px; font-size: 12px; line-height: 1.5; color: #8A94AF; }
  .said:empty { display: none; }
  .savedview .empty { margin: 16px 16px 0; font-size: 14px; line-height: 1.55; color: #8992AD; }
  .tintro { margin: 14px 16px 6px; font-size: 13px; line-height: 1.5; color: #A3ACC4; }
  .helprow { padding: 12px 4px 2px; }
  .helplink {
    display: inline-flex; align-items: center; gap: 6px; padding: 0; border: 0; background: none; cursor: pointer;
    color: #C7CFE2; font: 13px/1.4 system-ui, -apple-system, sans-serif; text-decoration: underline;
    text-decoration-color: #5A6480; text-underline-offset: 3px;
  }
  .helplink:hover { color: #F2F5FC; }
  .trow { padding: 12px 16px; border-bottom: 1px solid #212939; }
  .tword { display: flex; align-items: baseline; gap: 10px; }
  .tw { font-size: 20px; font-weight: 600; color: #E8ECF6; }
  .tw[data-s="tracking"] { box-shadow: inset 0 -2px 0 var(--lg-tracking, #A78BFA); }
  .tw[data-s="known"] { box-shadow: inset 0 -2px 0 var(--lg-known, #63AF97); }
  .tw[data-s="ignored"] { color: #A3ACC4; }
  /* The learner has turned underlines off: in the transcript and in the saved lists. */
  .panel.no-underlines .w[data-s], .panel.no-underlines .tw[data-s] { box-shadow: none; }
  /* Which list the Saved view shows: one at a time, each with its count. */
  .wchips { display: flex; flex-wrap: wrap; gap: 6px; padding: 14px 16px 2px; }
  .wchip {
    display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 999px; cursor: pointer;
    border: 1px solid #2A3348; background: transparent; color: #A3ACC4;
    font: 500 12.5px/1 system-ui, -apple-system, sans-serif; letter-spacing: normal; text-transform: none;
  }
  .wchip:hover { color: #E8ECF6; border-color: #4A5470; }
  .wchip[aria-pressed="true"] { background: #E8ECF6; border-color: #E8ECF6; color: #0D111C; }
  .wchip .n { font-variant-numeric: tabular-nums; opacity: .7; }
  .wchip .n:empty { display: none; }
  .wbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 10px 16px 0; }
  .wbar .wfind { flex: 1 1 150px; min-width: 0; }
  .wbar .btnrow { padding: 0; border-top: 0; flex: none; flex-wrap: nowrap; }
  .wsaid { margin: 8px 16px 0; }
  .tr { font: 500 12px/1.4 ui-monospace, monospace; color: #B8C0D4; }
  .tm { margin: 4px 0 0; font-size: 13.5px; line-height: 1.45; color: #C7CFE2; }
  .tm:empty { display: none; }
  /* The settings' button row carries a rule above it; in a list row it split the word from its buttons. */
  .trow .btnrow { padding: 0; margin-top: 10px; border-top: 0; }
  .trow .said { margin-top: 6px; font-size: 12.5px; color: #A3ACC4; }
  .trow .said:empty { display: none; }
  .gh {
    display: flex; align-items: baseline; gap: 8px;
    padding: 15px 16px 6px; font-size: 12px; font-weight: 600;
    color: #9AA4BF; text-transform: uppercase; letter-spacing: .06em;
  }
  .gh span {
    font-size: 9px; letter-spacing: .07em; padding: 2px 5px; border-radius: 3px;
    background: #2A3348; color: #A9B3CC; text-transform: none;
  }
  .sv { padding: 10px 16px; cursor: pointer; }
  .sv:hover { background: rgba(255,255,255,.045); }
  .sv .tx { display: block; font-size: 17px; line-height: 1.5; color: #E8ECF6; }
  .sv .sec { display: block; margin-top: 3px; font-size: 14px; color: #97A0BA; }
  @media (prefers-reduced-motion: no-preference) { .lines { scroll-behavior: smooth; } }
${PANEL_STYLE}
  /* The settings' fields, edged as the search boxes are here, where the panel sits over video. */
  .set select, .flagfind { border-color: #6B7490; }
  .set select:hover:not(:disabled) { border-color: #8A94AF; }
${TIP_STYLE}
`;

export interface SidebarDeps {
  transcript: Transcript;
  segmenter: () => Segmenter | null;
  /** Unknown content words in a line, and how many words it has. */
  measure: (text: string) => Promise<{ unknown: number; words: number }>;
  /** Status of a token, so the transcript matches the overlay. */
  statusOf: (t: Token) => string;
  seek: (t: number) => void;
  currentTime: () => number;
  /**
   * A word in the transcript was clicked. The line it sits on is not the one
   * playing, so its own start time and translation come with it — a card made
   * here should point at this line, not wherever playback happens to be.
   */
  onWordClick: (token: Token, el: HTMLElement, sentence: string, context?: WordContext) => void;
  /** A selection across words in one line: the words, the text they span, and where to anchor a card. */
  /**
   * `again` is a plain click on the phrase already marked, not a new one
   * picked. Returning false drops the phrase rather than keeping it marked.
   */
  onPhrase?: (
    words: Token[], text: string, el: HTMLElement, sentence: string, context: WordContext | undefined, again: boolean,
  ) => boolean | void;
  /**
   * Enough about this video to find a saved line again months later. Given a
   * time, the link points there rather than at wherever playback happens to be.
   */
  context: (at?: number) => { site: string; video: string; title: string; url: string; lang: string };
  /** "Check again" in settings reached Anki: word status is worth re-reading. */
  onAnkiConnected?: () => void;
  /**
   * Make a card of a whole line, from its row's button. Settles when the
   * card is in, waiting for Anki, or refused; the outcome is the caller's to say.
   */
  onAddLine?: (text: string, context: WordContext) => Promise<void>;
  /** Words marked by hand, newest first: the Words view lists them. */
  marked?: () => Array<{ word: string; status: OverrideStatus }>;
  /** Take a word's mark off. */
  unmark?: (word: string) => Promise<void>;
  /** Make a card for a tracked word. Resolves to what to say, or throws with it. */
  addWord?: (word: string) => Promise<string>;
  /**
   * How a word is looked up. Supplied so the transcript and the overlay answer
   * from the same place — including "no dictionary for this language" — rather
   * than each deciding for itself.
   */
  lookup?: (tok: Token) => Promise<LookupResult>;
}

export class Sidebar {
  #title!: HTMLElement;
  #gear!: HTMLButtonElement;
  #keysButton!: HTMLButtonElement;
  #tabs!: HTMLElement;
  #search: HTMLElement | null = null;
  #host: HTMLElement;
  #root: ShadowRoot;
  #panel: HTMLElement;
  #list: HTMLElement;
  #note: HTMLElement;
  #hover: HTMLElement;
  #deps: SidebarDeps;

  #open = false;
  #width = 400;
  #active = -1;
  #filter: Filter = 'all';
  /** Ids saved on *this* video, so a row can paint itself without a round trip. */
  #saved = new Set<string>();
  #destroyed = false;
  /** Until the stored width and open state are read, settings do not move the panel. */
  #restored = false;
  #userScrolled = false;
  #hoverTimer = 0;
  /** The word the hover card is for, or waiting to be for. */
  #hoverFor: HTMLElement | null = null;
  /** Bumped whenever the card should not appear, so a slow lookup cannot show a stale one. */
  #hoverSeq = 0;
  #idle = 0;
  #mode: PanelMode = 'transcript';
  /** Which list the Saved view shows. */
  #savedShow: SavedList = 'lines';
  /** What the Saved view's search narrows its list to. */
  #savedQuery = '';
  /** The Saved view's list, drawn again as the search changes; the bar above it stays. */
  #savedRows: HTMLElement | null = null;
  /** Draws the list's blocks as they come near the view. */
  #savedSeen: IntersectionObserver | null = null;
  /** The bar's status line: what Copy, Export and Add to Anki did. */
  #savedSaid: HTMLElement | null = null;
  /** Readings and meanings of marked words, looked up once, for the rows, the search and the export. */
  #wordInfo = new Map<string, WordInfo | null>();
  #settingsEl: HTMLElement | null = null;
  /** What the tabs show, as their one tabpanel: the transcript and its controls, or another view. */
  #view!: HTMLElement;
  #grip!: HTMLElement;
  /**
   * The one control in the transcript that Tab stops at. ↑ and ↓ move it from
   * line to line and ← and → along a line; while focus is elsewhere it follows
   * the line being spoken, so Tab comes back in there. A word has a tabindex
   * only while it holds it: otherwise a click on a word would take focus, and
   * with it the arrow keys, from the player.
   */
  #stop: HTMLElement | null = null;
  /** For ids, which tie a row's buttons to its line. */
  #ids = 0;
  #fab!: HTMLButtonElement;
  #close!: HTMLButtonElement;
  #searchInput!: HTMLInputElement;
  #now!: HTMLButtonElement;
  #tab!: HTMLButtonElement;
  #filterMenu!: HTMLElement;
  #count!: HTMLElement;
  /** The search, trimmed. While there is one, following playback pauses. */
  #query = '';
  /**
   * A word's forms, when the search came from its card (findWord): lines with
   * any of them match too, so 食べる finds 食べた. Typing drops them.
   */
  #forms: readonly string[] = [];
  /** Lines matching the search, in transcript order. */
  #hits: number[] = [];
  #hitSet = new Set<number>();
  /** The match last jumped to — held by identity, since new lines move indices. */
  #hitLine: Line | null = null;
  /** Whether progress was showing, so a change to it can be told from any other. */
  #stats = settings().sidebarStats;
  /** Every document and window listener, removed together on destroy. */
  #abort = new AbortController();
  #unwatch: () => void = () => {};

  // ---- the list: blocks of rows, made and built near the screen ---------
  /**
   * The list is blocks of ten lines. Every block exists from the start,
   * sized by an estimate; its rows are made only when something needs them —
   * the block comes near the screen, a jump lands in it, or the background
   * gets to it soon after opening — and a row's words only near enough to read.
   * Inserting every row at once was a third of a second of style and layout.
   */
  #blocks: Block[] = [];
  #blockOf = new Map<Line, Block>();
  #blockByEl = new WeakMap<HTMLElement, Block>();
  /** Where each line sits in the transcript, for its row's number. */
  #indexOf = new Map<Line, number>();
  /** Each line's estimated card height, for rows not yet drawn. */
  #height = new Map<Line, number>();
  /** The background has made every block before this one. */
  #fillAt = 0;
  #cancelFill: (() => void) | null = null;
  /** The transcript changed since the blocks were last put in step with it. */
  #rowsStale = true;
  #rowOf = new Map<Line, HTMLElement>();
  #lineOf = new WeakMap<HTMLElement, Line>();
  /** The lines of the transcript, for asking cheaply whether one is still in it. */
  #lineSet = new Set<Line>();
  /** What was last written to each block's size, so an unchanged one is not written again. */
  #sized = new WeakMap<HTMLElement, string>();
  /**
   * Rows that have words, and the analysis they were built from. A pending
   * build is stored as -1 - revision, so it is neither built nor started twice.
   */
  #built = new Map<HTMLElement, number>();
  /** The token each word was drawn from, so a status change repaints it in place. */
  #wordTok = new WeakMap<HTMLElement, Token>();
  /** Words that carry a reading. */
  #annotated = new WeakSet<HTMLElement>();
  /** Rows that have their count and bookmark — every row ever built. */
  #dressed = new Set<HTMLElement>();
  /** Site and video for bookmark ids: constant for a transcript, and a page read to find. */
  #where: { site: string; video: string } | null = null;
  #tokens = new TokenCache();
  #io: IntersectionObserver | null = null;
  /** Whether visibility has ever been reported; without it, built rows count as near. */
  #ioSeen = false;
  #nearBlocks = new Set<HTMLElement>();
  #toBuild = new Set<HTMLElement>();
  /** Calls off the frame the waiting rows are due to be built in. */
  #cancelBuild: (() => void) | null = null;
  #curRow: HTMLElement | null = null;
  #hitRows = new Set<HTMLElement>();
  #hitCurRow: HTMLElement | null = null;
  /** A row the list jumped to, held centred while the rows around it settle. */
  #pin: HTMLElement | null = null;
  #pinUntil = 0;
  /** Frames left in which to check a held jump, and whether one is booked. */
  #holdFrames = 0;
  #holdQueued = false;
  #wait!: HTMLElement;

  // ---- counting: every line, in the background --------------------------
  /** Counts for the statuses of this revision; a status change starts over. */
  #counts = new Map<Line, Count>();
  #statusRev = 0;
  #countQueue: Line[] = [];
  #countAt = 0;
  /** Lines this revision is waiting on the analyser for. */
  #counting = new Set<Line>();
  #countTimer = 0;
  #countFailed = false;
  #progressAt = 0;
  /**
   * The totals from the last time every line was counted, kept while lines
   * are only being added — a caption observed during playback. They are true
   * of the lines they cover, where "counting…" every few seconds would be
   * noise. Any change to what is known, or to the words, drops them.
   */
  #lastStats: { known: number; unknown: number; i1: number } | null = null;

  constructor(mount: HTMLElement, deps: SidebarDeps) {
    this.#deps = deps;

    this.#host = document.createElement('div');
    this.#host.className = 'libregaku-sidebar';
    this.#root = this.#host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    this.#panel = document.createElement('div');
    this.#panel.className = 'panel';
    this.#panel.setAttribute('role', 'complementary');

    const grip = document.createElement('div');
    grip.className = 'grip';
    this.#grip = grip;
    this.#installResize(grip);

    /*
     * The panel's lists are tabs — the transcript, the lines saved, the words
     * marked — each with how many it holds. Settings and the keyboard
     * shortcuts are views of another kind, reached by their icons. The
     * player bar keeps to the video; it used to open Saved lines too, while
     * Tracked words opened from here, and the two lists worked differently.
     */
    const head = document.createElement('div');
    head.className = 'head';
    const tabs = document.createElement('nav');
    tabs.className = 'tabs';
    tabs.setAttribute('role', 'tablist');
    const tab = (mode: PanelMode): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tabbtn';
      b.id = `lg-tab-${mode}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-controls', 'lg-view');
      b.dataset.mode = mode;
      const name = document.createElement('span');
      const n = document.createElement('span');
      n.className = 'n';
      b.append(name, n);
      b.addEventListener('click', () => this.setMode(mode));
      tabs.appendChild(b);
      return b;
    };
    tab('transcript');
    tab('saved');
    // One Tab stop for the row: ← and → (the other way round right to left),
    // Home and End go from tab to tab and show it.
    tabs.addEventListener('keydown', (e) => {
      const all = Array.from(tabs.querySelectorAll<HTMLElement>('[role=tab]'));
      const at = all.indexOf(e.target as HTMLElement);
      if (at < 0 || e.altKey || e.ctrlKey || e.metaKey) return;
      let to: number;
      if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = all.length - 1;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        to = at + ((e.key === 'ArrowRight') === (uiDirection() === 'rtl') ? -1 : 1);
      } else return;
      // Ours alone: the player this sits in would seek on the same arrow.
      e.preventDefault();
      e.stopPropagation();
      const next = all[(to + all.length) % all.length]!;
      next.focus();
      this.setMode(next.dataset.mode as PanelMode);
    });
    this.#tabs = tabs;
    // What a view that is not a list is, under the tabs.
    const title = document.createElement('div');
    title.className = 'viewtitle';
    title.hidden = true;
    const controls = document.createElement('span');
    controls.className = 'controls';
    const gear = document.createElement('button');
    gear.className = 'ico';
    gear.replaceChildren(icon('settings', 17));
    gear.addEventListener('click', () => this.setMode(this.#mode === 'settings' ? 'transcript' : 'settings'));

    // The keys are reference for while the video plays, so they have a view
    // of their own here rather than a place among the settings.
    const keys = document.createElement('button');
    keys.className = 'ico';
    keys.replaceChildren(icon('keyboard', 17));
    keys.addEventListener('click', () => this.setMode(this.#mode === 'keys' ? 'transcript' : 'keys'));

    const close = document.createElement('button');
    close.className = 'ico';
    close.replaceChildren(icon('x', 18));
    close.addEventListener('click', () => this.toggle(false));
    this.#close = close;
    controls.append(keys, gear, close);
    head.append(tabs, controls);
    this.#title = title;
    this.#gear = gear;
    this.#keysButton = keys;
    this.#search = null;

    const filters = document.createElement('div');
    filters.className = 'filters';
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.replaceChildren(icon('filter', 19));
    fab.setAttribute('aria-expanded', 'false');
    fab.addEventListener('click', () => {
      const open = filters.classList.toggle('open');
      fab.setAttribute('aria-expanded', String(open));
      // Opened from the keyboard, the menu takes focus, on the filter in use.
      if (open && this.#root.activeElement === fab) filters.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    });

    for (const key of FILTERS) {
      const b = document.createElement('button');
      b.className = 'f';
      b.dataset.filter = key;
      b.setAttribute('aria-pressed', String(key === 'all'));
      b.addEventListener('click', () => {
        this.#setFilter(key);
        this.render();
      });
      filters.appendChild(b);
    }
    this.#fab = fab;
    this.#filterMenu = filters;

    const summary = document.createElement('div');
    summary.className = 'summary';

    const search = document.createElement('div');
    search.className = 'search';
    const input = document.createElement('input');
    input.type = 'search';
    this.#searchInput = input;
    // Mid-composition text is not the query yet: searching every kana on the
    // way to a kanji would throw the list about under the IME.
    input.addEventListener('input', (e) => {
      if (!(e as InputEvent).isComposing) this.#typed(input.value);
    });
    input.addEventListener('compositionend', () => this.#typed(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (this.#query) this.#stepHit(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape' && input.value) {
        input.value = '';
        this.#typed('');
      }
    });
    this.#count = document.createElement('span');
    this.#count.className = 'count';
    this.#count.setAttribute('aria-live', 'polite');
    search.append(input, this.#count);

    this.#note = document.createElement('div');
    this.#note.className = 'note';
    this.#note.style.display = 'none';

    // What a count filter shows while the counts it needs are still arriving:
    // a statement of progress, never a partial answer.
    this.#wait = document.createElement('div');
    this.#wait.className = 'wait';
    this.#wait.setAttribute('role', 'status');
    this.#wait.hidden = true;

    this.#list = document.createElement('div');
    this.#list.className = 'lines';
    this.#installFollow();
    if (typeof IntersectionObserver === 'function') {
      this.#io = new IntersectionObserver((entries) => this.#onNear(entries), {
        root: this.#list,
        rootMargin: NEAR,
      });
    }

    const now = document.createElement('button');
    now.className = 'now';
    now.append(icon('forward', 13), document.createTextNode(''));
    now.addEventListener('click', () => {
      // It goes once it has done its job; pressed from the keyboard, focus
      // goes on to the line it brought back rather than to the page.
      const had = this.#root.activeElement === now;
      this.#resume();
      if (had) (this.#curRow?.querySelector<HTMLElement>('.seek') ?? this.#stop)?.focus({ preventScroll: true });
    });
    this.#now = now;

    this.#hover = document.createElement('div');
    this.#hover.className = 'hover';

    this.#tab = document.createElement('button');
    this.#tab.className = 'tab';
    this.#tab.replaceChildren(icon('back', 16));
    this.#tab.addEventListener('click', () => this.toggleTranscript());

    this.#search = search;
    // The filter button before its menu, so Tab reaches the menu from it.
    this.#view = document.createElement('div');
    this.#view.className = 'view';
    this.#view.id = 'lg-view';
    this.#view.append(search, summary, this.#note, this.#wait, this.#list, fab, filters, now);
    this.#panel.append(grip, head, title, this.#view);
    this.#root.append(style, this.#panel, this.#tab, this.#hover);
    mount.appendChild(this.#host);
    // Kept inside the panel while it is open; the tab alone has the player.
    tooltips(this.#root, () =>
      (this.#open ? this.#panel : (this.#host.parentElement ?? this.#host)).getBoundingClientRect());

    this.#installKeys();
    this.#applyAppearance(settings());
    this.#paintLabels();
    this.#paintTabs();
    this.#unwatch = watchSettings((s, here) => this.#settingsChanged(s, here));
    this.#tokens.reset(deps.segmenter());
    this.#lineSet = new Set(deps.transcript.lines);
    void this.#restore();
    deps.transcript.onChange(() => this.#refreshTranscript());
    this.#installHover();
    this.#installClicks();
    this.#installListKeys();
    // Counting starts once construction is over: the header wants the numbers
    // even while the panel is closed, but not at the cost of the first frame.
    this.#countTimer = window.setTimeout(() => this.#countAll(), 0);
  }

  /** The row a phrase is marked on, to clear once the selection leaves it. */
  #phraseRow: HTMLElement | null = null;
  #selFrame = 0;

  /** Unmark the phrase in the transcript, if one is marked. */
  clearPhrase(): void {
    if (!this.#phraseRow) return;
    (this.#root as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.()?.removeAllRanges();
  }

  /** Redraw the phrase band as the selection moves, once a frame, on the row it is in. */
  #onSelection(): void {
    if (this.#selFrame) return;
    this.#selFrame = requestAnimationFrame(() => {
      this.#selFrame = 0;
      const sel = (this.#root as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.();
      const at = sel?.rangeCount ? sel.getRangeAt(0).startContainer : null;
      const row = (at instanceof Element ? at : at?.parentElement)?.closest<HTMLElement>('.tx') ?? null;
      if (this.#phraseRow && this.#phraseRow !== row) {
        markPhrase(this.#root, this.#phraseRow, '.w');   // the selection is elsewhere: this clears it
        this.#phraseRow.classList.remove('phrased');
      }
      this.#phraseRow = row && this.#list.contains(row) ? row : null;
      this.#phraseRow?.classList.toggle('phrased', markPhrase(this.#root, this.#phraseRow, '.w'));
    });
  }

  /**
   * One listener for every row: a bookmark saves, a word looks up, anywhere
   * else on a card seeks. A listener per row was thousands of them.
   */
  #installClicks(): void {
    // A selection across words in one line is a phrase (src/content/phrase.ts),
    // and the click that ends it is not a word's or a seek.
    let selected = false;
    // The press that is ending was on the marked phrase, without Shift.
    let pressedPhrase = false;
    this.#list.addEventListener('mousedown', (e) => {
      pressedPhrase = e.button === 0 && !e.shiftKey && Boolean((e.target as Element | null)?.closest?.('.inphrase'));
    });
    this.#list.addEventListener('mouseup', () => {
      const picked = selectedWords(this.#root, this.#list, '.w');
      if (picked.length < 2 || !this.#deps.onPhrase) return;
      const last = picked[picked.length - 1]!;
      const text = textFrom(picked[0]!, last);
      if (text === null) return;
      selected = true;
      this.#hideHover();
      const keep = this.#deps.onPhrase(
        picked.map((w) => JSON.parse(w.dataset.tok ?? '{}') as Token),
        text, last, last.dataset.line ?? '', this.#contextOf(last), pressedPhrase,
      ) !== false;
      // After the browser's own handling of the release, which collapses a
      // selection clicked inside: the phrase stays marked, to point at again,
      // unless that click was to put it away.
      const first = picked[0]!;
      setTimeout(() => (keep ? selectWhole(this.#root, first, last) : this.clearPhrase()), 0);
    });
    this.#list.addEventListener('click', (e) => {
      if (selected) {
        selected = false;
        return;
      }
      const target = e.target as Element | null;
      const row = target?.closest?.('.line') as HTMLElement | null;
      const line = row ? this.#lineOf.get(row) : undefined;
      if (!line) return;
      if (target?.closest('.save')) {
        void this.#toggleSave(line);
        return;
      }
      const add = target?.closest<HTMLButtonElement>('.addline');
      if (add) {
        void this.#addLine(line, add);
        return;
      }
      const w = target?.closest('.w') as HTMLElement | null;
      if (w?.dataset.tok) {
        this.#hideHover();
        this.#deps.onWordClick(JSON.parse(w.dataset.tok) as Token, w, w.dataset.line ?? '', this.#contextOf(w));
        return;
      }
      this.#userScrolled = false;
      this.#deps.seek(line.start);
    });
  }

  /**
   * The transcript from the keyboard, as one Tab stop. ↑ and ↓ go from line
   * to line, Home and End to the first and the last, and ← and → along a
   * line's words, its time and its buttons. Enter or Space on a word does what
   * a click does, and focus on one previews it as the pointer does. Lines are
   * found from the transcript and their rows made as they are reached: nothing
   * here walks the rows.
   */
  #installListKeys(): void {
    const list = this.#list;
    // Every key used here stops here: the player this sits in has its own
    // for the arrows, Home, End and Space, and would act on them as well.
    const take = (e: KeyboardEvent): void => {
      e.preventDefault();
      e.stopPropagation();
    };
    list.addEventListener('keydown', (e) => {
      const el = e.target as HTMLElement;
      const row = el.closest<HTMLElement>('.line');
      const line = row ? this.#lineOf.get(row) : undefined;
      if (!row || !line || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Enter' || e.key === ' ') {
        if (el.classList.contains('w')) {
          take(e);
          el.click();
        } else if (el.tagName === 'BUTTON') {
          e.stopPropagation();   // not cancelled: the key's own action is what presses a button
        }
        return;
      }
      if (e.shiftKey) return;   // Shift and an arrow extend a selection
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        take(e);
        const items = Array.from(row.querySelectorAll<HTMLElement>('.tx .w, .meta button'));
        // One way along the whole line, the way its text runs: where that is not the
        // interface's, the words and the buttons under them would pull opposite ways.
        const back = (e.key === 'ArrowRight') === rtlAt(row.querySelector('.tx') ?? el);
        const next = items[items.indexOf(el) + (back ? -1 : 1)];
        if (!next) return;
        this.#setStop(next);
        next.focus();
        return;
      }
      const lines = this.#deps.transcript.lines;
      const i = this.#indexOf.get(line) ?? -1;
      const to = e.key === 'ArrowDown' ? this.#nextShown(i, 1)
        : e.key === 'ArrowUp' ? this.#nextShown(i, -1)
          : e.key === 'Home' ? this.#nextShown(-1, 1)
            : e.key === 'End' ? this.#nextShown(lines.length, -1)
              : undefined;
      if (to === undefined) return;
      take(e);
      if (to) this.#focusRow(to);
    });
    list.addEventListener('focusin', (e) => {
      const el = e.target as HTMLElement;
      if (!el.matches('.line .w, .line .meta button')) return;
      this.#setStop(el);
      if (el.classList.contains('w') && settings().sidebarHover) this.#previewSoon(el);
    });
    list.addEventListener('focusout', (e) => {
      if ((e.target as HTMLElement).classList.contains('w')) this.#hideHover();
    });
  }

  /** Make this the transcript's one Tab stop. */
  #setStop(el: HTMLElement | null): void {
    const old = this.#stop;
    if (old === el) return;
    if (old?.classList.contains('w')) old.removeAttribute('tabindex');
    else if (old) old.tabIndex = -1;
    this.#stop = el;
    if (el) el.tabIndex = 0;
  }

  /**
   * Keep the transcript reachable with Tab: the line being spoken, unless a
   * filter hides it, and then the first line it shows. Read from the lines;
   * only the row found is made.
   */
  #ensureStop(): void {
    const stop = this.#stop;
    if (stop?.isConnected && !stop.closest('.line.hide')) return;
    if (this.#countWaiting()) {
      this.#setStop(null);   // nothing is shown until the counts are in
      return;
    }
    const lines = this.#deps.transcript.lines;
    let row = this.#shownRow(this.#active);
    for (let i = 0; !row && i < lines.length; i++) row = this.#shownRow(i);
    this.#setStop(row?.querySelector<HTMLElement>('.seek') ?? null);
  }

  /** The row of the nearest line the filter shows, from this one either way. */
  #nextShown(from: number, dir: 1 | -1): HTMLElement | null {
    const lines = this.#deps.transcript.lines;
    for (let i = from + dir; i >= 0 && i < lines.length; i += dir) {
      if (this.#isShown(lines[i]!)) return this.#row(i);
    }
    return null;
  }

  /**
   * Focus a line's time, with its words and buttons built for ← and →, and
   * bring the line into view by scrolling the list alone, as following does.
   */
  #focusRow(row: HTMLElement): void {
    this.#build(row);
    const seek = row.querySelector<HTMLElement>('.seek');
    if (!seek) return;
    this.#setStop(seek);
    seek.focus({ preventScroll: true });
    const r = row.getBoundingClientRect();
    const l = this.#list.getBoundingClientRect();
    // The foot of the list is under the floating buttons.
    if (r.top < l.top || r.bottom > l.bottom - 64) this.#reveal(row);
    else this.#queueAround(row);
  }

  /**
   * Keys belong to the control that uses them, and a click leaves nothing
   * holding focus that did not need it.
   *
   * The host page sees a key pressed in here as a keydown on our shadow host —
   * a div, not a field — and treats it as a player shortcut: k pauses, m
   * mutes, a digit seeks, f goes fullscreen. So a key stops at the host only
   * when the control it was pressed in consumes it: anything typed into the
   * search box or a select, and Space or Enter on a focused button, which
   * would otherwise press the button *and* pause the video.
   *
   * Stopping every key used to break the player instead: a clicked button kept
   * focus, so after bookmarking a line Space pressed the bookmark again and the
   * player's shortcuts went dead until the video was clicked. A mouse click now
   * leaves focus where it was. Our own document-level handlers run in the
   * capture phase and have already had their turn, which is how Escape still
   * closes the lookup card from in here.
   */
  #installKeys(): void {
    const signal = this.#abort.signal;
    const stop = (e: Event): void => {
      if (consumesKey(e.composedPath()[0], (e as KeyboardEvent).key)) e.stopPropagation();
    };
    for (const ev of ['keydown', 'keyup', 'keypress'] as const) {
      this.#host.addEventListener(ev, stop, { signal });
    }
    this.#root.addEventListener('mousedown', (e) => {
      if ((e.target as Element | null)?.closest?.('button')) e.preventDefault();
    }, { signal });
    this.#root.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key !== 'Escape') return;
      this.#closeFilters();
      this.#hideHover();
    }, { signal });
    // A menu left open over the transcript hides lines; any other click shuts it.
    this.#panel.addEventListener('click', (e) => {
      if (!(e.target as Element | null)?.closest?.('.filters, .fab')) this.#closeFilters();
    }, { signal });
  }

  /**
   * Settings changed — here, in the options page, or in another tab.
   *
   * Opening and closing follows `sidebarOpen` too, when the change was made
   * in this page — the panel's own switch. From another tab it only sets how
   * the next page opens: pressing S in one tab closing the panel in all of
   * them would be a surprise. `toggle` writes that same setting, but only
   * when it differs from what is stored, and by the time this runs the store
   * already holds the new value, so the two cannot chase each other.
   */
  /**
   * The panel's own labels: its tabs, buttons, filter menu and search box,
   * made once, so written here in one place. Everything else is drawn from
   * `ui` as it is shown. A new interface language builds a new panel
   * (restart() in index.ts), since your language changes its lines too.
   */
  /** The S key on the buttons it presses, as it is pressed now: alone, or with Alt and Shift. */
  #paintKeys(): void {
    const { shown, aria } = letterKey('S', settings().singleKeys);
    for (const b of [this.#close, this.#tab]) {
      b.dataset.key = shown;
      b.setAttribute('aria-keyshortcuts', aria);
    }
  }

  #paintLabels(): void {
    this.#paintKeys();
    const s = ui.sidebar;
    this.#host.lang = uiLocale();
    this.#host.dir = uiDirection();
    this.#panel.setAttribute('aria-label', s.panelLabel);
    this.#grip.setAttribute('aria-label', s.resizeLabel);
    this.#tabs.setAttribute('aria-label', s.tabsLabel);
    const names: Partial<Record<PanelMode, string>> = { transcript: s.transcriptTab, saved: s.savedTab };
    for (const b of Array.from(this.#tabs.querySelectorAll<HTMLElement>('[data-mode]'))) {
      const name = b.firstElementChild;
      if (name) name.textContent = names[b.dataset.mode as PanelMode] ?? '';
    }
    const label = (el: HTMLElement, tip: string, aria: string): void => {
      el.dataset.tip = tip;
      el.setAttribute('aria-label', aria);
    };
    label(this.#gear, s.settings, s.settings);
    label(this.#keysButton, s.shortcuts, s.shortcuts);
    label(this.#close, s.close, s.closeLabel);
    label(this.#fab, s.filterTip, s.filterLabel);
    label(this.#tab, s.openTip, s.openLabel);
    for (const b of Array.from(this.#filterMenu.querySelectorAll<HTMLElement>('.f[data-filter]'))) {
      const { label: name, about } = filterText(b.dataset.filter as Filter);
      b.textContent = name;
      b.setAttribute('aria-description', about);
    }
    this.#searchInput.placeholder = s.searchPlaceholder;
    this.#searchInput.setAttribute('aria-label', s.searchLabel);
    const text = this.#now.lastChild;
    if (text) text.textContent = s.currentLine;
  }

  #settingsChanged(s: Settings, here = true): void {
    if (this.#destroyed) return;
    this.#paintKeys();
    this.#applyAppearance(s);
    if (s.sidebarStats !== this.#stats) {
      this.#stats = s.sidebarStats;
      if (!s.sidebarStats) {
        // The count filters read the counts; without them they hide every
        // line, behind a filter button that is hidden too.
        if (this.#countFilter()) this.#setFilter('all');
        this.#closeFilters();
      }
      // Counting stops with progress switched off and picks up where it left
      // off when it comes back; the rows themselves have not changed.
      this.#countAll();
      for (const row of this.#dressed) this.#label(row);
      this.render();
    }
    if (here && this.#restored && s.sidebarOpen !== this.#open) this.toggle(s.sidebarOpen);
    if (this.#mode === 'settings' && this.#settingsEl) syncSettingsControls(this.#settingsEl);
  }

  /** Readings, known-word marks and underline colours, as the overlay has them. */
  #applyAppearance(s: Settings): void {
    this.#list.classList.toggle('ruby-all', s.ruby === 'always');
    this.#list.classList.toggle('ruby-off', s.ruby === 'never');
    this.#list.classList.toggle('mark-known', s.markKnown);
    this.#panel.classList.toggle('no-underlines', !s.underlines);
    applyVars(this.#host, underlineVars(s));
  }

  #countFilter(): boolean {
    return this.#filter === 'unknown' || this.#filter === 'i1';
  }

  #setFilter(key: Filter): void {
    this.#filter = key;
    this.#filterMenu.querySelectorAll<HTMLElement>('button').forEach((x) =>
      x.setAttribute('aria-pressed', String(x.dataset.filter === key)),
    );
    this.#fab.classList.toggle('on', key !== 'all');
    this.#closeFilters();
  }

  #closeFilters(): void {
    // Closed with focus in it — Escape, or a filter picked from the keyboard — it hands focus back to its button.
    const back = this.#open && this.#filterMenu.contains(this.#root.activeElement);
    this.#filterMenu.classList.remove('open');
    this.#fab.setAttribute('aria-expanded', 'false');
    if (back) this.#fab.focus();
  }

  /**
   * Stop this far above the bottom of the player: the height of the site's
   * own control bar, so its captions, settings and fullscreen buttons stay
   * clickable while the panel is open. The edge tab centres in what is left.
   */
  setBottomInset(px: number): void {
    const v = Number.isFinite(px) ? Math.max(0, Math.round(px)) : 0;
    this.#host.style.setProperty('--lg-bottom', `${v}px`);
  }

  async #restore(): Promise<void> {
    try {
      const got = await chrome.storage.sync.get(WIDTH_KEY);
      // Clamped again: older versions allowed widths the drag no longer does.
      this.#width = clampWidth(Number(got[WIDTH_KEY]) || 400);
    } catch {
      /* keep the default width */
    }
    // Navigating away before storage answered must not leave page listeners
    // behind for a panel that no longer exists.
    if (this.#destroyed) return;
    document.addEventListener('selectionchange', () => this.#onSelection(), { signal: this.#abort.signal });
    // Open unless the learner has closed it before. The transcript is the
    // reason the panel exists; hiding it until a keypress is discovered means
    // most people never see it.
    this.toggle(settings().sidebarOpen);
    this.#followPlayerChrome();
    this.#applyWidth();
    this.#restored = true;
  }

  #applyWidth(): void {
    this.#panel.style.width = `${this.#width}px`;
    this.#grip.setAttribute('aria-valuenow', String(this.#width));
    this.#onLayout?.();
  }

  /** The panel's edge: dragged, or moved with ← and → once it has focus. */
  #installResize(grip: HTMLElement): void {
    grip.tabIndex = 0;
    grip.setAttribute('role', 'separator');
    grip.setAttribute('aria-orientation', 'vertical');
    grip.setAttribute('aria-valuemin', String(MIN_WIDTH));
    grip.setAttribute('aria-valuemax', String(MAX_WIDTH));
    grip.setAttribute('aria-valuenow', String(this.#width));
    const save = (): void => {
      void chrome.storage.sync.set({ [WIDTH_KEY]: this.#width }).catch(() => {});
    };
    let startX = 0;
    let startW = 0;
    /** Whether the grip had focus before a drag. */
    let had = false;
    const move = (e: PointerEvent): void => {
      // Toward the video widens the panel: leftward here, rightward when it sits on the left.
      const moved = uiDirection() === 'rtl' ? e.clientX - startX : startX - e.clientX;
      this.#width = clampWidth(startW + moved);
      this.#applyWidth();
    };
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      // A drag leaves focus where it was, as a click on a button does: kept
      // here, the arrow keys would go on resizing the panel, not the player.
      if (!had && this.#root.activeElement === grip) grip.blur();
      save();
    };
    grip.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();   // not the player's seek as well
      const wider = (e.key === 'ArrowLeft') !== (uiDirection() === 'rtl');
      this.#width = clampWidth(this.#width + (wider ? WIDTH_STEP : -WIDTH_STEP));
      this.#applyWidth();
    });
    // Saved once the key is let go, as a drag is once it is dropped: a held
    // key repeats faster than storage takes writes.
    grip.addEventListener('keyup', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      e.stopPropagation();
      save();
    });
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      had = this.#root.activeElement === grip;
      startX = e.clientX;
      startW = this.#width;
      const signal = this.#abort.signal;
      window.addEventListener('pointermove', move, { signal });
      window.addEventListener('pointerup', up, { signal });
    });
  }

  /**
   * Swap the panel between the transcript and settings.
   *
   * Settings are built fresh each time rather than kept around: they are read
   * from storage, and a stale panel showing values that have since changed
   * elsewhere is worse than a moment's work rebuilding it.
   */

  // ---- saved lines ----------------------------------------------------

  /**
   * The words themselves may have changed: a better analyser, or the same one
   * with its dictionary now loaded. Tokens are dropped and every line is
   * counted again. Built rows keep what they show until they are rebuilt —
   * the ones near the screen straight away, the rest as they come near.
   *
   * For a change of status alone, `refreshStatus` does the same job without
   * analysing anything again.
   */
  refreshAnalysis(): void {
    if (this.#destroyed) return;
    this.#tokens.reset(this.#deps.segmenter());
    for (const row of this.#built.keys()) {
      if (!this.#ioSeen || this.#nearBlocks.has(row.parentElement as HTMLElement)) this.#toBuild.add(row);
    }
    this.#pumpBuild();
    for (const row of this.#built.keys()) this.#repaintStatus(row);
    this.#recount();
  }

  /**
   * Word statuses changed — a mark, a new card, a fresh read of Anki — but not
   * the words. Rows already built repaint their underlines where they stand
   * and the counts are redone from tokens already in hand: nothing is rebuilt
   * and nothing goes back to the analyser.
   */
  refreshStatus(): void {
    if (this.#destroyed) return;
    this.#paintTabs();
    if (this.#mode === 'saved') {
      this.#paintSavedChips();
      if (this.#savedShow !== 'lines') void this.#renderSavedRows();
    }
    // A different analyser means different words, which this cannot cover.
    if (this.#deps.segmenter() !== this.#tokens.segmenter) {
      this.refreshAnalysis();
      return;
    }
    for (const row of this.#built.keys()) this.#repaintStatus(row);
    this.#recount();
  }

  /** The transcript changed: a new track, a line observed, or cleared. */
  #refreshTranscript(): void {
    if (this.#destroyed) return;
    const lines = this.#deps.transcript.lines;
    const before = this.#lineSet;
    this.#lineSet = new Set(lines);
    this.#rowsStale = true;
    this.#where = null;
    // Lines only added keep the last totals standing until they are counted;
    // any line gone means a different transcript, and different totals.
    for (const line of before) {
      if (!this.#lineSet.has(line)) {
        this.#lastStats = null;
        break;
      }
    }
    // A backward seek can insert a line before existing ones. Counts are held
    // by line identity, and kept only while that line is in the transcript.
    for (const line of this.#counts.keys()) {
      if (!this.#lineSet.has(line)) this.#counts.delete(line);
    }
    // Matches are line positions, and a line arriving earlier moves them.
    if (this.#query) this.#findHits();
    this.#countAll();
    this.render();
  }

  /**
   * The same aggregate the summary line shows, for the header bar. Null until
   * every line is counted: a percentage over the lines counted so far would
   * be a different number, shown as though it were this one.
   */
  get stats(): { known: number; unknown: number; i1: number } | null {
    if (this.#countFailed) return null;
    if (!this.#countsReady()) return this.#lastStats;
    let words = 0;
    let unknown = 0;
    let i1 = 0;
    for (const c of this.#counts.values()) {
      words += c.words;
      unknown += c.unknown;
      if (c.unknown === 1) i1++;
    }
    this.#lastStats = words ? { known: Math.round(((words - unknown) / words) * 100), unknown, i1 } : null;
    return this.#lastStats;
  }

  #countsReady(): boolean {
    const n = this.#lineSet.size;
    return n > 0 && !this.#countFailed && this.#counts.size >= n;
  }

  /**
   * A line's bookmark id. Site and video are read from the page once per
   * transcript: asked per row, that read was a DOM query for every line.
   */
  #idFor(start: number): string {
    this.#where ??= this.#deps.context();
    return bookmarks.idFor(this.#where.site, this.#where.video, start);
  }

  /** How many lines are saved on this video — the header shows this. */
  get savedCount(): number {
    return this.#saved.size;
  }

  /** Pull this video's saves out of storage and repaint if anything changed. */
  async refreshSaved(): Promise<void> {
    const c = this.#deps.context();
    const mine = await bookmarks.forVideo(c.site, c.video);
    const next = new Set(mine.map((b) => b.id));
    const same = next.size === this.#saved.size && [...next].every((id) => this.#saved.has(id));
    this.#saved = next;
    if (this.#mode === 'saved') {
      this.#paintSavedChips();
      if (this.#savedShow === 'lines') void this.#renderSavedRows();
    }
    if (same) return;
    for (const row of this.#dressed) this.#paintSave(row);
    if (this.#filter === 'saved') this.render();
  }

  /** Save or unsave a line from outside the panel — the B key uses this. */
  /** Save the line, or unsave it if it was saved. Resolves to whether it is saved now. */
  async saveLine(line: Line): Promise<boolean> {
    return this.#toggleSave(line);
  }

  async #toggleSave(line: Line): Promise<boolean> {
    const c = this.#deps.context(line.start);
    const on = await bookmarks.toggle({
      id: this.#idFor(line.start),
      site: c.site,
      video: c.video,
      title: c.title,
      url: c.url,
      text: line.text,
      secondary: line.secondary,
      start: line.start,
      end: line.end,
      lang: c.lang,
      savedAt: Date.now(),
    });
    if (on) this.#saved.add(this.#idFor(line.start));
    else this.#saved.delete(this.#idFor(line.start));
    // Repaint just this row rather than the list: re-rendering while the
    // cursor is on a button makes the button jump out from under it.
    const row = this.#rowOf.get(line);
    if (row) this.#paintSave(row);
    this.#onSavedChange?.();
    if (this.#filter === 'saved') this.render();
    return on;
  }

  /**
   * Which tab is showing, and how many each list holds. The tab showing is the
   * row's one Tab stop — the first while Settings or the keys are showing,
   * which are not tabs — and names the panel they share.
   */
  #paintTabs(): void {
    const all = Array.from(this.#tabs.querySelectorAll<HTMLElement>('[role=tab]'));
    const selected = all.find((b) => b.dataset.mode === this.#mode);
    for (const b of all) {
      b.setAttribute('aria-selected', String(b === selected));
      b.tabIndex = b === (selected ?? all[0]) ? 0 : -1;
    }
    if (selected) {
      this.#view.setAttribute('role', 'tabpanel');
      this.#view.setAttribute('aria-labelledby', selected.id);
    } else {
      this.#view.removeAttribute('role');
      this.#view.removeAttribute('aria-labelledby');
    }
    const set = (mode: PanelMode, n: number | null): void => {
      const el = this.#tabs.querySelector<HTMLElement>(`[data-mode="${mode}"] .n`);
      if (el) el.textContent = n ? String(n) : '';
    };
    // What was kept to come back to: the lines saved in the language being
    // learned, and the words tracked. Known and ignored words wait for
    // nothing, and can run to thousands.
    const tracked = this.#deps.marked?.().filter((m) => m.status === 'tracking').length ?? 0;
    void bookmarks.inLanguage(settings().target).then((mine) => set('saved', mine.length + tracked), () => set('saved', tracked));
  }

  /** The line as a card, from its row's button: busy while it goes, then a tick. */
  async #addLine(line: Line, b: HTMLButtonElement): Promise<void> {
    const add = this.#deps.onAddLine;
    if (!add || b.classList.contains('busy')) return;
    b.classList.add('busy');
    b.replaceChildren(icon('loader', 15));
    const ok = await add(line.text, { start: line.start, end: line.end, translation: line.secondary })
      .then(() => true, () => false);
    b.classList.remove('busy');
    b.replaceChildren(icon(ok ? 'check' : 'linePlus', 15));
    if (ok) window.setTimeout(() => b.replaceChildren(icon('linePlus', 15)), 2500);
  }

  /** A row's bookmark, drawn to match whether its line is saved. */
  #paintSave(row: HTMLElement): void {
    const b = row.querySelector<HTMLElement>('.save');
    const line = this.#lineOf.get(row);
    if (!b || !line) return;
    const on = this.#saved.has(this.#idFor(line.start));
    b.classList.toggle('on', on);
    // One name, pressed or not, as a toggle has; the tip says what a click will do.
    b.dataset.tip = on ? ui.sidebar.unsave : ui.sidebar.saveLine;
    b.setAttribute('aria-label', ui.sidebar.saveLine);
    b.setAttribute('aria-pressed', String(on));
  }

  #onSavedChange: (() => void) | null = null;

  /** The header keeps a count; let it know when the count moves. */
  onSavedChange(fn: () => void): void {
    this.#onSavedChange = (): void => {
      this.#paintTabs();
      fn();
    };
  }

  /**
   * What a pile of saved sentences is for.
   *
   * Keeping them was never the point; getting them somewhere they are
   * reviewed is. Anki when it is connected, and a file or the clipboard when
   * it is not — a saved line should never depend on this panel to survive.
   * As far as the search narrows them.
   */
  async #lineAction(how: 'copy' | 'file' | 'anki', b: HTMLButtonElement): Promise<void> {
    const said = this.#savedSaid;
    if (!said) return;
    const lines = (await this.#lineGroups()).flatMap((g) => g.lines);
    if (!lines.length) {
      said.textContent = ui.sidebar.nothingToExport;
      return;
    }
    if (how === 'anki') {
      await this.#savedToAnki(lines, said, b);
    } else if (how === 'copy') {
      said.textContent = (await copyText(savedTsv(lines))) ? ui.sidebar.linesCopied(lines.length) : ui.sidebar.noClipboard;
    } else {
      const ok = downloadText(`libregaku-saved-${fileStamp()}.tsv`, savedTsv(lines), 'text/tab-separated-values');
      said.textContent = ok ? ui.sidebar.downloaded : ui.sidebar.downloadBlocked;
    }
  }

  /**
   * Every saved line as a sentence card.
   *
   * Duplicates are counted rather than treated as failures: running this
   * twice is the normal way to add what has been saved since last time.
   */
  async #savedToAnki(lines: Bookmark[], said: HTMLElement, btn: HTMLButtonElement): Promise<void> {
    btn.disabled = true;
    said.textContent = ui.sidebar.checkingAnki;
    const state = await probe();
    if (state.kind !== 'connected') {
      btn.disabled = false;
      said.textContent =
        state.kind === 'offline'
          ? ui.sidebar.ankiOffline
          : state.kind === 'blocked'
            ? ui.sidebar.ankiBlocked
            : ui.sidebar.ankiUnreachable;
      return;
    }

    let deck: string;
    try {
      // The deck chosen, or the language's own, which its first card makes.
      deck = await readyDeck();
    } catch (e) {
      btn.disabled = false;
      said.textContent = e instanceof Error ? e.message : String(e);
      return;
    }

    let added = 0;
    let already = 0;
    let failed: string | null = null;
    for (const [i, b] of lines.entries()) {
      said.textContent = ui.sidebar.adding(i + 1, lines.length);
      try {
        await addSentence({
          deck,
          text: b.text,
          translation: b.secondary,
          source: sourceField({ title: b.title || null, seconds: b.start, url: b.url || null }),
          tags: [...tagsFor({ source: b.site, lang: b.lang }), `${ROOT_TAG}::sentence`],
        });
        added++;
      } catch (e) {
        if (isDuplicate(e)) already++;
        else {
          failed = e instanceof Error ? e.message : String(e);
          break;
        }
      }
    }

    btn.disabled = false;
    said.textContent = failed
      ? failed
      : ui.sidebar.savedAdded(added, deck, already);
    this.#onSavedChange?.();
  }

  /**
   * Every saved line, newest video first. Lines from the video on screen seek;
   * lines from elsewhere open that video at the right second, which is the
   * whole reason the url is stored alongside the text.
   */
  /** The marked words of one list, newest first. */
  #listed(show: WordMark): string[] {
    return (this.#deps.marked?.() ?? []).filter((m) => m.status === show).map((m) => m.word);
  }

  /**
   * What was kept to come back to: lines saved from the transcript, and
   * words tracked, known or ignored — one list at a time, chosen with a row
   * of buttons. The buttons, the search and what the list can be done with
   * stay at the top; the list scrolls under them, drawn as it comes into view.
   *
   * The words are read from the marks, so the lists are the same on every
   * device. A mark comes off here as it does on the word's card, and a
   * tracked word can become a card, which takes it off the list: a card
   * speaks for it now.
   */
  async #renderSaved(): Promise<void> {
    const host = this.#settingsEl;
    if (!host) return;
    host.replaceChildren();
    const head = document.createElement('div');
    head.className = 'svhead';

    const chips = document.createElement('div');
    chips.className = 'wchips';
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', ui.sidebar.listsLabel);
    for (const show of SAVED_LISTS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'wchip';
      b.dataset.show = show;
      b.setAttribute('aria-pressed', String(show === this.#savedShow));
      const name = document.createElement('span');
      name.textContent = show === 'lines' ? ui.sidebar.listLines : wordList(show).name;
      const n = document.createElement('span');
      n.className = 'n';
      b.append(name, n);
      b.addEventListener('click', () => {
        if (show === this.#savedShow) return;
        this.#savedShow = show;
        void this.#renderSaved();
      });
      chips.appendChild(b);
    }

    const bar = document.createElement('div');
    bar.className = 'wbar';
    const find = document.createElement('input');
    find.type = 'search';
    find.className = 'wfind';
    find.placeholder = ui.sidebar.findPlaceholder;
    find.setAttribute('aria-label', ui.sidebar.findLabel);
    find.value = this.#savedQuery;
    find.addEventListener('input', () => {
      this.#savedQuery = find.value;
      void this.#renderSavedRows();
    });
    const actions = document.createElement('div');
    actions.className = 'btnrow';
    const said = document.createElement('div');
    said.className = 'said wsaid';
    said.setAttribute('role', 'status');
    this.#savedSaid = said;
    const button = (label: string, about: string, run: (b: HTMLButtonElement) => Promise<void>): void => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('aria-description', about);
      b.addEventListener('click', () => void run(b));
      actions.appendChild(b);
    };
    const show = this.#savedShow;
    if (show === 'lines') {
      button(ui.sidebar.copy, ui.sidebar.copySavedAbout, (b) => this.#lineAction('copy', b));
      button(ui.sidebar.exportFile, ui.sidebar.exportSavedAbout, (b) => this.#lineAction('file', b));
      button(ui.sidebar.addToAnki, ui.sidebar.addSavedAbout, (b) => this.#lineAction('anki', b));
    } else {
      button(ui.sidebar.copy, ui.sidebar.copyWordsAbout, (b) => this.#exportWords('copy', said, b));
      button(ui.sidebar.exportFile, ui.sidebar.exportWordsAbout, (b) => this.#exportWords('file', said, b));
    }
    bar.append(find, actions);
    head.append(chips, bar, said);

    const rows = document.createElement('div');
    rows.className = 'svlist';
    host.append(head, rows);
    this.#savedRows = rows;
    this.#paintSavedChips();
    await this.#renderSavedRows();
  }

  /** Each list's count, on its button. */
  #paintSavedChips(): void {
    const host = this.#settingsEl;
    if (!host || this.#mode !== 'saved') return;
    const set = (show: SavedList, n: number): void => {
      const el = host.querySelector<HTMLElement>(`.wchip[data-show="${show}"] .n`);
      if (el) el.textContent = n ? String(n) : '';
    };
    const marked = this.#deps.marked?.() ?? [];
    for (const show of SAVED_LISTS) if (show !== 'lines') set(show, marked.filter((m) => m.status === show).length);
    void bookmarks.inLanguage(settings().target).then((mine) => set('lines', mine.length), () => {});
  }

  /**
   * The saved lines a search matches, by their text or their translation,
   * grouped by video. A line of the video on screen carries the translation
   * it has now, which follows your language: one saved while your language
   * was English kept English under it after you changed it. A line of another
   * video keeps the one it was saved with until that video is open.
   */
  async #lineGroups(): Promise<Array<{ site: string; video: string; title: string; lines: Bookmark[] }>> {
    // Only the language being learned: its lines, for its deck.
    const here = this.#deps.context();
    const now = new Map<string, string>();
    for (const line of this.#deps.transcript.lines) {
      if (line.secondary) now.set(bookmarks.idFor(here.site, here.video, line.start), line.secondary);
    }
    const groups = (await bookmarks.grouped(settings().target)).map((g) => ({
      ...g,
      lines: g.lines.map((b) => (now.has(b.id) ? { ...b, secondary: now.get(b.id) } : b)),
    }));
    if (!this.#savedQuery.trim()) return groups;
    const matches = matcher(this.#savedQuery);
    return groups
      .map((g) => ({ ...g, lines: g.lines.filter((b) => matches(b.text, this.#readingOf(b.text)) || matches(b.secondary ?? '')) }))
      .filter((g) => g.lines.length);
  }

  /** The open list as the search narrows it, drawn a block at a time as it comes into view. */
  async #renderSavedRows(): Promise<void> {
    // A redraw takes its rows with it. Focus that was on one goes to the row
    // now in its place — the next, once a line is removed or a mark taken
    // off — and not to the page.
    const rows = this.#savedRows;
    const active = this.#root.activeElement as HTMLElement | null;
    const row = (el: Element | null): Element | null => el?.closest('.sv, .trow') ?? null;
    const was = rows && active && rows.contains(active) ? Array.from(rows.querySelectorAll('.sv, .trow')).indexOf(row(active)!) : -1;
    await this.#drawSavedRows();
    if (was < 0 || !rows?.isConnected || rows !== this.#savedRows) return;
    const now = Array.from(rows.querySelectorAll<HTMLElement>('.sv, .trow'));
    const target = now[Math.min(was, now.length - 1)]?.querySelector<HTMLElement>('button');
    if (target) {
      target.focus();
    } else {
      rows.tabIndex = -1;
      rows.focus();
    }
  }

  async #drawSavedRows(): Promise<void> {
    const rows = this.#savedRows;
    if (!rows?.isConnected) return;
    const show = this.#savedShow;
    const query = this.#savedQuery.trim();
    const say = (cls: string, text: string): void => {
      const p = document.createElement('p');
      p.className = cls;
      p.textContent = text;
      rows.appendChild(p);
    };

    if (show === 'lines') {
      const groups = await this.#lineGroups();
      // A newer search, or another list, got there first.
      if (rows !== this.#savedRows || show !== this.#savedShow || query !== this.#savedQuery.trim()) return;
      this.#savedSeen?.disconnect();
      rows.replaceChildren();
      if (!groups.length) {
        say('empty', query ? ui.sidebar.noLineMatches(query) : ui.sidebar.savedEmpty);
        return;
      }
      const here = this.#deps.context();
      const items = groups.flatMap((g) => [{ group: g }, ...g.lines.map((line) => ({ line }))]);
      this.#savedSeen = lazyRows(rows, items, (item) =>
        'group' in item ? this.#groupHead(item.group, here) : this.#savedRow(item.line, here), 64);
      return;
    }

    const list = wordList(show);
    const words = this.#listed(show);
    this.#savedSeen?.disconnect();
    rows.replaceChildren();
    if (!words.length) {
      say('empty', list.empty);
      return;
    }
    const shown = this.#matching(words);
    if (query) {
      // The search reaches readings and meanings not looked up yet: fetch them, then look again.
      void this.#lookUpAll(words).then((more) => {
        if (more && this.#savedQuery.trim() === query && this.#savedShow === show) void this.#renderSavedRows();
      });
    }
    if (!shown.length) {
      say('empty', ui.sidebar.noWordMatches(query));
      return;
    }
    say('tintro', query ? ui.sidebar.wordsMatching(shown.length, words.length) : list.intro(words.length));
    this.#savedSeen = lazyRows(rows, shown, (word) => this.#wordRow(word, show), 92);
  }

  /** A video's heading over its saved lines. */
  #groupHead(g: { site: string; video: string; title: string }, here: { site: string; video: string }): HTMLElement {
    const head = document.createElement('div');
    head.className = 'gh';
    head.textContent = g.title || g.video;
    if (g.site === here.site && g.video === here.video) {
      const badge = document.createElement('span');
      badge.textContent = ui.sidebar.thisVideo;
      head.appendChild(badge);
    }
    return head;
  }

  /**
   * A saved line. Lines from the video on screen seek; lines from elsewhere
   * open that video at the right second, which is the whole reason the url is
   * stored alongside the text.
   */
  #savedRow(b: Bookmark, here: { site: string; video: string }): HTMLElement {
    const row = document.createElement('div');
    row.className = 'sv';
    const tx = document.createElement('span');
    tx.className = 'tx';
    tx.id = this.#newId();
    tx.lang = b.lang;
    tx.textContent = b.text;
    row.appendChild(tx);
    if (b.secondary) {
      const sec = document.createElement('span');
      sec.className = 'sec';
      sec.lang = settings().native;
      sec.textContent = b.secondary;
      row.appendChild(sec);
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    // The row's click, as a button: it seeks here, or opens the video the line is from.
    const thisVideo = b.site === here.site && b.video === here.video;
    const at = stamp(b.start);
    const time = this.#timeButton(at, thisVideo ? ui.sidebar.playFrom(at) : ui.sidebar.openAt(at), tx.id);
    const del = document.createElement('button');
    del.className = 'save on';
    del.replaceChildren(icon('x', 15));
    del.dataset.tip = ui.sidebar.remove;
    del.setAttribute('aria-label', ui.sidebar.removeLabel);
    del.setAttribute('aria-describedby', tx.id);
    del.addEventListener('click', async (e) => {
      e.stopPropagation();
      await bookmarks.remove(b.id);
      this.#saved.delete(b.id);
      this.#onSavedChange?.();
      this.#paintSavedChips();
      void this.#renderSavedRows();
    });
    meta.append(time, del);
    row.appendChild(meta);
    row.addEventListener('click', () => {
      if (thisVideo) {
        this.#userScrolled = false;
        this.#deps.seek(b.start);
        this.setMode('transcript');
      } else {
        window.open(b.url, '_blank', 'noopener');
      }
    });
    return row;
  }

  /** A marked word, its reading and first meaning, and what can be done with it. */
  #wordRow(word: string, show: WordMark): HTMLElement {
    const list = wordList(show);
    const row = document.createElement('div');
    row.className = 'trow';
    const head = document.createElement('div');
    head.className = 'tword';
    const w = document.createElement('span');
    w.className = 'tw';
    w.dataset.s = show;
    w.lang = settings().target;
    w.textContent = word;
    const r = document.createElement('span');
    r.className = 'tr';
    r.lang = settings().target;
    head.append(w, r);
    const meaning = document.createElement('div');
    meaning.className = 'tm';
    const said = document.createElement('div');
    said.className = 'said';
    said.setAttribute('role', 'status');
    const actions = document.createElement('div');
    actions.className = 'btnrow';
    const button = (label: string, run: () => Promise<string | void>): void => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', () => {
        if (b.disabled) return;
        b.disabled = true;
        void run().then(
          (msg) => {
            if (msg) said.textContent = msg;
          },
          (e: unknown) => {
            said.textContent = e instanceof Error ? e.message : String(e);
            b.disabled = false;
          },
        );
      });
      actions.appendChild(b);
    };
    if (show === 'tracking' && this.#deps.addWord) button(ui.sidebar.addToAnki, () => this.#deps.addWord!(word));
    if (this.#deps.unmark) button(list.unmark, () => this.#deps.unmark!(word));
    row.append(head, meaning, actions, said);
    // Its reading and first meaning, from the same lookup the cards use —
    // made now, as the row comes into view, not for every word in the list.
    void this.#infoFor(word).then((info) => {
      if (!info || !row.isConnected) return;
      r.textContent = info.reading !== word ? info.reading : '';
      meaning.textContent = info.meaning;
    });
    return row;
  }

  /** The words a search matches: by the word, its reading or its meaning, as far as they are known. */
  #matching(words: string[]): string[] {
    if (!this.#savedQuery.trim()) return words;
    const matches = matcher(this.#savedQuery);
    return words.filter((w) => {
      const info = this.#wordInfo.get(w);
      return matches(w) || Boolean(info && (matches(info.reading) || matches(info.meaning)));
    });
  }

  /** A word's reading and first meaning, looked up once. Null when the dictionary has nothing. */
  #infoFor(word: string): Promise<WordInfo | null> {
    const known = this.#wordInfo.get(word);
    if (known !== undefined) return Promise.resolve(known);
    return (this.#deps.lookup ?? lookupToken)({ surface: word, lemma: word, start: 0, end: word.length, content: true })
      .then((result) => {
        const top = result.state === 'ok' ? result.entries[0] : undefined;
        const info = top ? { reading: top.reading ?? '', meaning: top.senses[0]?.glosses.slice(0, 3).join('; ') ?? '' } : null;
        // Only answers are kept: a lookup made while the dictionary loads says nothing yet.
        if (result.state === 'ok' || result.state === 'empty') this.#wordInfo.set(word, info);
        return info;
      }, () => null);
  }

  /** Look up every word not looked up yet, a few at a time. True when anything new was learned. */
  async #lookUpAll(words: string[]): Promise<boolean> {
    const before = this.#wordInfo.size;
    const missing = words.filter((w) => !this.#wordInfo.has(w));
    for (let i = 0; i < missing.length && !this.#destroyed; i += 8) {
      await Promise.all(missing.slice(i, i + 8).map((w) => this.#infoFor(w)));
    }
    return this.#wordInfo.size > before;
  }

  /**
   * The open list, as far as the search narrows it, as tab-separated text:
   * copied, or saved as a file Anki imports. Readings and meanings not looked
   * up yet are fetched first; the copy keeps the click that asked for it
   * while they come.
   */
  async #exportWords(how: 'copy' | 'file', said: HTMLElement, b: HTMLButtonElement): Promise<void> {
    const show = this.#savedShow;
    if (show === 'lines') return;
    const words = this.#matching(this.#listed(show));
    if (!words.length) {
      said.textContent = ui.sidebar.nothingToExport;
      return;
    }
    b.disabled = true;
    if (words.some((w) => !this.#wordInfo.has(w))) said.textContent = ui.sidebar.lookingUp;
    const text = this.#lookUpAll(words).then(() => wordsTsv(words.map((word) => ({
      word, reading: this.#wordInfo.get(word)?.reading ?? '', meaning: this.#wordInfo.get(word)?.meaning ?? '',
    }))));
    try {
      if (how === 'copy') {
        const ok = await copyWhenReady(text);
        said.textContent = ok ? ui.sidebar.wordsCopied(words.length) : ui.sidebar.noClipboard;
      } else {
        const name = `libregaku-${WORD_FILE[show]}-${fileStamp()}.tsv`;
        const ok = downloadText(name, await text, 'text/tab-separated-values');
        said.textContent = ok ? ui.sidebar.downloaded : ui.sidebar.downloadBlocked;
      }
    } finally {
      b.disabled = false;
    }
  }

  setMode(mode: PanelMode): void {
    // A view that goes while it has focus — a saved line played from the
    // keyboard — hands focus to the tabs rather than dropping it on the page.
    const lost = this.#settingsEl?.contains(this.#root.activeElement) ?? false;
    this.#mode = mode;
    const showing = mode !== 'transcript';

    const other = mode === 'settings' || mode === 'keys';
    this.#title.hidden = !other;
    this.#title.textContent = mode === 'settings' ? ui.sidebar.settings : mode === 'keys' ? ui.sidebar.shortcuts : '';
    this.#keysButton.setAttribute('aria-pressed', String(mode === 'keys'));
    this.#gear.setAttribute('aria-pressed', String(mode === 'settings'));
    this.#paintTabs();
    if (this.#search) this.#search.style.display = showing ? 'none' : '';

    this.#settingsEl?.remove();
    this.#settingsEl = null;
    this.#hideHover();
    this.#closeFilters();

    for (const el of [this.#note, this.#list] as HTMLElement[]) {
      el.style.display = showing ? 'none' : '';
    }
    if (showing) this.#wait.hidden = true;
    const summary = this.#root.querySelector('.summary') as HTMLElement | null;
    const filters = this.#root.querySelector('.filters') as HTMLElement | null;
    if (summary) summary.style.display = showing ? 'none' : '';
    if (filters) filters.style.display = showing || !settings().sidebarStats ? 'none' : '';
    this.#fab.style.display = showing || !settings().sidebarStats ? 'none' : '';
    this.#paintNow();

    if (mode === 'settings') {
      this.#settingsEl = buildSettings(() => this.render(), {
        onAnkiConnected: () => this.#deps.onAnkiConnected?.(),
      });
      this.#settingsEl.prepend(helpLink(ui.sidebar.help));
      this.#view.appendChild(this.#settingsEl);
    } else if (mode === 'keys') {
      this.#settingsEl = keysView();
      this.#settingsEl.append(helpLink(ui.sidebar.help, 'keys'));
      this.#view.appendChild(this.#settingsEl);
    } else if (mode === 'saved') {
      this.#settingsEl = document.createElement('div');
      this.#settingsEl.className = 'savedview';
      this.#view.appendChild(this.#settingsEl);
      void this.#renderSaved();
    } else {
      this.render();
    }
    if (lost) this.#focusTabs();
  }

  /** Focus the tabs, on the one Tab reaches (#paintTabs). */
  #focusTabs(): void {
    this.#tabs.querySelector<HTMLElement>('[role=tab][tabindex="0"]')?.focus();
  }

  /**
   * What every Transcript control means — the bar's button, the S key, the
   * panel's own tab, the toolbar popup's button: the transcript, open.
   * Pressed while the transcript is showing, the panel closes. They used to
   * reopen the panel on whatever view it was closed on — Saved, Words,
   * Settings — under a button that says Transcript.
   */
  toggleTranscript(): void {
    if (this.#open && this.#mode === 'transcript') {
      this.toggle(false);
      return;
    }
    if (this.#mode !== 'transcript') this.setMode('transcript');
    if (!this.#open) this.toggle(true);
  }

  toggle(open?: boolean): void {
    this.#open = open ?? !this.#open;
    const focused = this.#root.activeElement;
    // The host always stays in the DOM: collapsed means the tab, never nothing.
    this.#panel.style.display = this.#open ? '' : 'none';
    this.#tab.style.display = this.#open ? 'none' : '';
    // The hover card sits outside the panel, so hiding the panel left it
    // floating over the video with nothing under it to point at.
    if (!this.#open) {
      this.#hideHover();
      this.#closeFilters();
    }
    this.#onLayout?.();
    if (this.#open) this.render();
    // Focus goes with what it was on: from the panel to the tab that opens it
    // again, and from that tab to the panel's tabs. A click, which gives a
    // button no focus here, moves none.
    if (!this.#open && focused && this.#panel.contains(focused)) this.#tab.focus();
    else if (this.#open && focused === this.#tab) this.#focusTabs();
    if (this.#open !== settings().sidebarOpen) void setSetting('sidebarOpen', this.#open);
  }

  /** What the panel is showing: the transcript, or one of its other views. */
  get mode(): PanelMode {
    return this.#mode;
  }

  get isOpen(): boolean {
    return this.#open;
  }

  /** How much of the player's right edge the open panel covers. */
  get inset(): number {
    return this.#open ? this.#width : 0;
  }

  #onLayout: (() => void) | null = null;

  /**
   * The overlay and the header bar keep clear of the panel rather than
   * running underneath it — a subtitle half-hidden behind the transcript is
   * worse than a narrower subtitle. This says when the panel opens, closes
   * or is resized.
   */
  onLayoutChange(fn: () => void): void {
    this.#onLayout = fn;
  }

  /**
   * Follow playback, unless the viewer has scrolled away.
   *
   * A step measures once, before it writes anything, then scrolls; the rows
   * around the new line are built on the next frame. Building first and
   * measuring after made each step lay out everything it had just built —
   * steps of 60–130ms near the top of a long film, where rows were still
   * arriving.
   */
  setActive(index: number): void {
    if (index === this.#active) return;
    this.#active = index;
    if (!this.#open || this.#rowsStale) return;

    const el = this.#shownRow(index);
    if (el && this.#following()) this.#reveal(el);
    this.#markCurrent();
    this.#paintNow();
  }

  /** Move the current-line mark, by reference rather than a search of every row. */
  #markCurrent(): void {
    const el = this.#row(this.#active);
    if (el === this.#curRow) return;
    this.#setCur(el);
  }

  /**
   * Mark this row as the line being spoken, for the eye and for a screen
   * reader. Tab into the list lands on it, unless focus is in the list already.
   */
  #setCur(el: HTMLElement | null): void {
    this.#curRow?.classList.remove('cur');
    this.#curRow?.removeAttribute('aria-current');
    el?.classList.add('cur');
    el?.setAttribute('aria-current', 'true');
    this.#curRow = el;
    if (el && !el.classList.contains('hide') && !this.#list.contains(this.#root.activeElement)) {
      this.#setStop(el.querySelector<HTMLElement>('.seek'));
    }
  }

  /**
   * Follow playback until the viewer scrolls, then stop until asked.
   *
   * Intent is read from input — wheel, touch, the scrollbar, the keyboard —
   * rather than from the scroll event, which fires for our own scrolling
   * too. Judged by scroll events, the first line we centred looked like the
   * viewer scrolling away, and following stopped after one line.
   */
  #installFollow(): void {
    const list = this.#list;
    const away = (): void => {
      this.#userScrolled = true;
      this.#pin = null;     // never pull the list back from under someone scrolling it
    };
    list.addEventListener('wheel', away, { passive: true });
    list.addEventListener('touchmove', away, { passive: true });
    // A press on the list itself rather than a card is the scrollbar.
    list.addEventListener('mousedown', (e) => {
      if (e.target === list) away();
    });
    list.addEventListener('keydown', (e) => {
      // Space on a button presses it; it scrolls nothing.
      if (NAV_KEYS.has(e.key) && !(e.key === ' ' && consumesKey(e.target ?? undefined, e.key))) away();
    });
    list.addEventListener('scroll', () => {
      this.#hideHover();
      this.#paintNow();
    });
  }

  /** A search is reading elsewhere on purpose, so it pauses following too. */
  #following(): boolean {
    return settings().sidebarFollow && !this.#userScrolled && !this.#query;
  }

  /**
   * Search, as something that takes you somewhere.
   *
   * Matches used to be outlined and nothing more, while following pulled the
   * list straight back to the line being spoken — in a long transcript the
   * outlines were somewhere you were never shown. Now the list goes to the
   * first match, Enter and Shift+Enter step through the rest, and following
   * waits until the search is cleared.
   */
  #setQuery(query: string): void {
    const q = query.trim();
    // Some IMEs announce the same text twice around the end of a composition;
    // the second must not throw the list back to the first match.
    if (q === this.#query) return;
    const had = Boolean(this.#query);
    this.#query = q;
    this.#hitLine = null;
    this.#findHits();
    this.#paintHits();
    if (q) this.#stepHit(1);
    else if (had) this.#resume();
    this.#paintNow();
  }

  /** What was typed in the search box: plain text, whatever a word's card searched for before. */
  #typed(query: string): void {
    if (this.#forms.length) {
      this.#forms = [];
      this.#query = '';   // the same text, searched for differently
    }
    this.#setQuery(query);
  }

  /**
   * Search the transcript for a word in every form its lines have it in, as
   * its card found them — 食べる finds 食べた and 食べない, which the words
   * alone would not — opening the panel on the transcript if need be.
   */
  findWord(query: string, forms: readonly string[]): void {
    if (this.#destroyed) return;
    if (this.#mode !== 'transcript') this.setMode('transcript');
    if (!this.#open) this.toggle(true);
    this.#searchInput.value = query;
    this.#forms = [...new Set(forms.filter(Boolean))];
    this.#query = '';
    this.#setQuery(query);
  }

  /** How a line is read, from its words' readings, if it has been analysed. Never a request. */
  #readingOf(text: string): string | undefined {
    const tokens = this.#tokens.peek(text);
    if (!tokens?.some((t) => t.reading)) return undefined;
    return tokens.map((t) => t.reading ?? t.surface).join('');
  }

  #findHits(): void {
    // By how a line is read too, once it has been analysed: tabemasu finds 食べます.
    this.#hits = this.#query ? this.#deps.transcript.search(this.#query, (line) => this.#readingOf(line.text)) : [];
    if (this.#query && this.#forms.length) {
      const hits = new Set(this.#hits);
      this.#deps.transcript.lines.forEach((line, i) => {
        if (this.#forms.some((form) => line.text.includes(form))) hits.add(i);
      });
      this.#hits = [...hits].sort((a, b) => a - b);
    }
    this.#hitSet = new Set(this.#hits);
    if (this.#hitLine && !this.#hitSet.has(this.#deps.transcript.lines.indexOf(this.#hitLine))) {
      this.#hitLine = null;
    }
  }

  /**
   * Matches on lines a filter shows: a hidden one cannot be gone to. Read from
   * the lines, not the rows — most rows of a long film may not exist yet.
   */
  #shownHits(): number[] {
    const lines = this.#deps.transcript.lines;
    return this.#hits.filter((i) => {
      const line = lines[i];
      return line !== undefined && this.#isShown(line);
    });
  }

  /** Go to the next (1) or previous (-1) match, wrapping at either end. */
  #stepHit(dir: 1 | -1): void {
    const lines = this.#deps.transcript.lines;
    const shown = this.#shownHits();
    if (!shown.length) {
      this.#hitLine = null;
      this.#paintHits();
      return;
    }
    const at = this.#hitLine ? shown.indexOf(lines.indexOf(this.#hitLine)) : -1;
    const next = at < 0 ? (dir > 0 ? 0 : shown.length - 1) : (at + dir + shown.length) % shown.length;
    const i = shown[next]!;
    this.#hitLine = lines[i] ?? null;
    // Made here if its block is not yet, and measured before the marks are
    // moved, so the measurement lays out only what the jump itself needed.
    const row = this.#row(i);
    if (row) this.#reveal(row);
    this.#paintHits();
  }

  /**
   * Mark matches in place on the rows that exist, touching only those whose
   * state changed. Rows made later are marked as they are made.
   */
  #paintHits(): void {
    if (this.#rowsStale) return;   // the next render marks them on rows in step
    const lines = this.#deps.transcript.lines;
    const want = new Set<HTMLElement>();
    for (const i of this.#hits) {
      const line = lines[i];
      const row = line && this.#rowOf.get(line);
      if (row) want.add(row);
    }
    for (const row of this.#hitRows) if (!want.has(row)) row.classList.remove('hit');
    for (const row of want) if (!this.#hitRows.has(row)) row.classList.add('hit');
    this.#hitRows = want;
    const cur = this.#hitLine ? this.#rowOf.get(this.#hitLine) ?? null : null;
    if (cur !== this.#hitCurRow) {
      this.#hitCurRow?.classList.remove('hit-cur');
      cur?.classList.add('hit-cur');
      this.#hitCurRow = cur;
    }
    this.#paintCount();
  }

  #paintCount(): void {
    if (!this.#query) {
      this.#count.textContent = '';
      return;
    }
    const shown = this.#shownHits();
    const at = this.#hitLine ? shown.indexOf(this.#deps.transcript.lines.indexOf(this.#hitLine)) : -1;
    this.#count.textContent = !shown.length
      ? ui.sidebar.noMatches
      : at >= 0 ? ui.sidebar.matchAt(at + 1, shown.length) : ui.sidebar.matchesFound(shown.length);
  }

  /**
   * The card for a transcript line — made now, with the rest of its block, if
   * nothing has needed it before. Null while the blocks are out of step with
   * the transcript.
   */
  #row(index: number): HTMLElement | null {
    if (index < 0 || this.#rowsStale) return null;
    const line = this.#deps.transcript.lines[index];
    if (!line) return null;
    const made = this.#rowOf.get(line);
    if (made) return made;
    const block = this.#blockOf.get(line);
    if (!block) return null;
    this.#fill(block);
    return this.#rowOf.get(line) ?? null;
  }

  /** The card for a line, if a filter is not hiding it. */
  #shownRow(index: number): HTMLElement | null {
    const line = this.#deps.transcript.lines[index];
    return line && this.#isShown(line) ? this.#row(index) : null;
  }

  /**
   * Centre a card by scrolling the list and nothing else. `scrollIntoView`
   * scrolls every scrollable ancestor too, and the page under the player is
   * one of them.
   *
   * Measured before anything is written, so the measurement finds layout
   * already done, and the rows around the card are built afterwards, on the
   * next frame. A far jump lands among rows whose heights were estimates, so
   * it is made at once rather than animated through thousands of lines, and
   * held centred for a moment while real heights replace the estimates. Any
   * other move lets go of a jump still being held.
   */
  #reveal(el: HTMLElement, behavior?: ScrollBehavior): void {
    const list = this.#list;
    const target = this.#centreFor(el);
    const far = Math.abs(target - list.scrollTop) > list.clientHeight * 1.5;
    const instant = far || behavior === 'instant';
    list.scrollTo({ top: target, behavior: instant ? 'instant' : behavior });
    if (instant) {
      this.#pin = el;
      this.#pinUntil = now() + PIN_MS;
      this.#requestHold(HOLD_FRAMES);
    } else {
      this.#pin = null;
    }
    this.#queueAround(el);
  }

  /** The scroll position that centres this card. */
  #centreFor(el: HTMLElement): number {
    const list = this.#list;
    const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    return Math.max(0, top - (list.clientHeight - el.offsetHeight) / 2);
  }

  /** Put a jumped-to card back in the centre if the rows around it moved it. */
  #holdPin(): void {
    const el = this.#pin;
    if (!el) return;
    if (!el.isConnected || now() > this.#pinUntil) {
      this.#pin = null;
      return;
    }
    const target = this.#centreFor(el);
    if (Math.abs(target - this.#list.scrollTop) > 2) this.#list.scrollTo({ top: target, behavior: 'instant' });
  }

  /**
   * Check a held jump on a coming frame: never straight after a write, and
   * never more than once a frame however many rows were built meanwhile.
   * Measuring after every row built was a layout per row.
   */
  #requestHold(frames = 1): void {
    if (!this.#pin || this.#destroyed) return;
    this.#holdFrames = Math.max(this.#holdFrames, frames);
    if (this.#holdQueued) return;
    this.#holdQueued = true;
    nextFrame(() => {
      this.#holdQueued = false;
      if (this.#destroyed) return;
      this.#holdPin();
      this.#holdFrames--;
      if (this.#holdFrames > 0) this.#requestHold(this.#holdFrames);
    });
  }

  /** Back to the current line, and following again. */
  #resume(): void {
    this.#userScrolled = false;
    const el = this.#shownRow(this.#active);
    if (el) this.#reveal(el);
    this.#paintNow();
  }

  /**
   * Offer the way back only while the current line is out of sight and
   * nothing is bringing it back — while following, it is merely on its way.
   * A current line whose row is not made yet is placed by its block.
   */
  #paintNow(): void {
    const line = this.#deps.transcript.lines[this.#active];
    const el = this.#open && this.#mode === 'transcript' && !this.#rowsStale && line && this.#isShown(line)
      ? this.#rowOf.get(line) ?? this.#blockOf.get(line)?.el
      : undefined;
    if (!el || this.#following()) {
      this.#now.classList.remove('on');
      return;
    }
    const r = el.getBoundingClientRect();
    const l = this.#list.getBoundingClientRect();
    const mid = (r.top + r.bottom) / 2;
    const above = mid < l.top;
    this.#now.classList.toggle('on', above || mid > l.bottom);
    this.#now.classList.toggle('up', above);
  }

  render(): void {
    // A new caption arrives every few seconds and calls this. Repainting the
    // transcript underneath the saved or settings view is how the partial
    // transcript warning reappeared over saved lines.
    if (this.#destroyed || !this.#open || this.#mode !== 'transcript') return;

    const { transcript } = this.#deps;
    const partial = transcript.mode === 'accumulating';
    this.#note.style.display = partial ? '' : 'none';
    this.#note.textContent = partial ? ui.sidebar.partial : '';

    this.#syncRows();

    if (!transcript.lines.length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = partial ? ui.sidebar.partialEmpty : ui.sidebar.empty;
      this.#list.replaceChildren(e);
      this.#wait.hidden = true;
      this.#paintCount();
      return;
    }

    const stats = settings().sidebarStats;
    // The count filters read the counts. With progress switched off they hid
    // every line, behind a filter button that was hidden as well.
    if (!stats && this.#countFilter()) this.#setFilter('all');
    this.#fab.style.display = stats ? '' : 'none';
    this.#filterMenu.style.display = stats ? '' : 'none';
    this.#applyFilter();

    // The list may have lost its place — it was hidden, or has only just
    // been laid out. Put it back without animating: this is a repaint, not
    // playback moving on. Measured before the rows around it are built.
    const cur = this.#following() ? this.#shownRow(this.#active) : null;
    if (cur) this.#reveal(cur, 'instant');
    this.#markCurrent();
    this.#paintHits();
    this.#prime();
    this.#paintNow();
    this.#paintCount();
  }

  /**
   * Put the blocks in step with the transcript.
   *
   * A new transcript gets every block at once — a few hundred empty, sized
   * placeholders — and no rows at all; rows are made as blocks are needed. A
   * line observed while playing joins the block of the line before it, and
   * gets a row at once only if that block already has its rows.
   */
  #syncRows(): void {
    if (!this.#rowsStale) return;
    this.#rowsStale = false;
    const lines = this.#deps.transcript.lines;
    this.#indexOf = new Map();
    lines.forEach((line, i) => this.#indexOf.set(line, i));
    let kept = 0;
    for (const line of lines) if (this.#blockOf.has(line)) kept++;
    // A new track, a cleared one, or lines gone from the middle: start afresh.
    if (!kept || kept < this.#blockOf.size) {
      this.#dropRows();
      this.#makeBlocks(lines);
    } else if (kept < lines.length) {
      this.#insertLines(lines);
    }
    // Rows already made take their new numbers; the rest get theirs when made.
    for (const [line, row] of this.#rowOf) {
      const n = String(this.#indexOf.get(line) ?? -1);
      if (row.dataset.i !== n) row.dataset.i = n;
    }
    this.#scheduleFill();
  }

  /** A whole transcript's blocks: empty, sized, and inserted at once. */
  #makeBlocks(lines: readonly Line[]): void {
    const width = this.#list.clientWidth || this.#width;
    const frag = document.createDocumentFragment();
    for (let at = 0; at < lines.length; at += BLOCK) {
      frag.appendChild(this.#newBlock(lines.slice(at, at + BLOCK), width).el);
    }
    this.#list.replaceChildren(frag);
  }

  /** A block for these lines, at the end of the list, empty until filled. */
  #newBlock(lines: Line[], width: number): Block {
    const el = document.createElement('div');
    el.className = 'blk';
    const block: Block = { el, lines, filled: false, height: 0 };
    for (const line of lines) {
      const h = estimateRowHeight(line, width);
      this.#height.set(line, h);
      block.height += h;
      this.#blockOf.set(line, block);
    }
    this.#blocks.push(block);
    this.#blockByEl.set(el, block);
    this.#sizeBlock(block);
    this.#io?.observe(el);
    return block;
  }

  /**
   * Lines observed while playing, each put straight after the line before it.
   * A block may grow past its usual size; nothing is reshuffled to stop it.
   */
  #insertLines(lines: readonly Line[]): void {
    const width = this.#list.clientWidth || this.#width;
    lines.forEach((line, i) => {
      if (this.#blockOf.has(line)) return;
      const prev = i > 0 ? lines[i - 1] : undefined;
      let block = (prev && this.#blockOf.get(prev)) || this.#blocks[0]!;
      const last = block === this.#blocks[this.#blocks.length - 1] &&
        prev !== undefined && prev === block.lines[block.lines.length - 1];
      if (last && block.lines.length >= BLOCK) {
        block = this.#newBlock([], width);
        this.#list.appendChild(block.el);
      }
      const after = prev ? block.lines.indexOf(prev) : -1;
      block.lines.splice(after + 1, 0, line);
      this.#blockOf.set(line, block);
      const h = estimateRowHeight(line, width);
      this.#height.set(line, h);
      block.height += h;
      if (block.filled) {
        const row = this.#shell(line);
        const next = block.lines[after + 2];
        block.el.insertBefore(row, (next && this.#rowOf.get(next)) ?? null);
        if (this.#nearBlocks.has(block.el)) this.#toBuild.add(row);
      }
      this.#sizeBlock(block);
    });
    this.#pumpBuild();
  }

  /**
   * Make a block's rows: plain rows for its lines, brought in line with what
   * the list shows — the filter, the current line, the matches — and queued
   * for their words if the block is near the screen.
   */
  #fill(block: Block): void {
    // Blocks out of step with the transcript wait for the next sync, which
    // may drop them and which starts the background filling again anyway.
    if (block.filled || this.#rowsStale) return;
    block.filled = true;
    const lines = this.#deps.transcript.lines;
    const current = lines[this.#active];
    const frag = document.createDocumentFragment();
    for (const line of block.lines) {
      const row = this.#shell(line);
      if (!this.#isShown(line)) row.classList.add('hide');
      if (this.#hitSet.has(this.#indexOf.get(line) ?? -1)) {
        row.classList.add('hit');
        this.#hitRows.add(row);
      }
      if (line === this.#hitLine) {
        row.classList.add('hit-cur');
        this.#hitCurRow = row;
      }
      if (line === current) this.#setCur(row);
      frag.appendChild(row);
    }
    block.el.appendChild(frag);
    this.#sizeBlock(block);
    if (this.#nearBlocks.has(block.el)) {
      for (const line of block.lines) {
        const row = this.#rowOf.get(line)!;
        if (!row.classList.contains('hide')) this.#toBuild.add(row);
      }
      this.#scheduleBuild();
    }
  }

  /**
   * Make the blocks nothing has needed yet, a slice at a time while the page
   * is idle, so every row exists soon after opening without the opening
   * paying for all of them at once. Blocks off screen are skipped by the
   * browser, so filling one costs its rows' creation and nothing more.
   */
  #scheduleFill(): void {
    if (this.#cancelFill || this.#destroyed || this.#fillAt >= this.#blocks.length) return;
    this.#cancelFill = whenIdle(() => {
      this.#cancelFill = null;
      this.#fillSome();
    });
  }

  #fillSome(): void {
    if (this.#destroyed || this.#rowsStale) return;
    const started = now();
    while (this.#fillAt < this.#blocks.length && now() - started < SLICE_MS) {
      this.#fill(this.#blocks[this.#fillAt++]!);
    }
    this.#scheduleFill();
  }

  /** One line's row as it starts out: readable, playable from its time, and nothing more yet. */
  #shell(line: Line): HTMLElement {
    const row = document.createElement('div');
    row.className = 'line';
    row.dataset.i = String(this.#indexOf.get(line) ?? -1);
    const tx = document.createElement('span');
    tx.className = 'tx';
    tx.id = this.#newId();
    tx.dir = 'auto';
    // In the language learned, whatever the interface's: kanji are drawn as
    // Japanese draws them, not as a Chinese or Korean interface would.
    tx.lang = settings().target;
    tx.textContent = line.text;
    row.appendChild(tx);
    if (line.secondary) {
      const sec = document.createElement('span');
      sec.className = 'sec';
      sec.dir = 'auto';
      sec.lang = settings().native;
      sec.textContent = line.secondary;
      row.appendChild(sec);
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    // The start is a button, for the keyboard: a click anywhere on the card plays the line too.
    const when = document.createElement('span');
    when.className = 'when';
    const start = stamp(line.start);
    const seek = this.#timeButton(start, ui.sidebar.playFrom(start), tx.id);
    seek.tabIndex = -1;   // the list is one Tab stop (#stop)
    when.append(seek, ` – ${stamp(line.end)}`);
    meta.appendChild(when);
    row.appendChild(meta);
    this.#rowOf.set(line, row);
    this.#lineOf.set(row, line);
    return row;
  }

  /** A line's time as a button: named for what it does, and described by the line it is for. */
  #timeButton(time: string, label: string, describedBy: string): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'seek';
    b.textContent = time;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-describedby', describedBy);
    return b;
  }

  #newId(): string {
    return `lgt${++this.#ids}`;
  }

  /**
   * Size a block for the lines it shows, and hide it if it shows none.
   *
   * An empty block holds its place with a fixed height, whether or not the
   * browser has drawn it. A filled one is sized only for when it is skipped:
   * unfiltered, `auto` lets it keep the height it was last drawn at; under a
   * filter that remembered height would belong to rows now hidden, so the
   * estimate for its visible rows stands alone.
   */
  #sizeBlock(block: Block): void {
    const all = this.#filter === 'all';
    let shown = block.lines.length;
    let height = block.height;
    if (!all) {
      shown = 0;
      height = 0;
      for (const line of block.lines) {
        if (!this.#isShown(line)) continue;
        shown++;
        height += this.#height.get(line) ?? 0;
      }
    }
    block.el.classList.toggle('hide', shown === 0);
    const px = `${Math.max(1, Math.round(height))}px`;
    const size = block.filled ? `${all ? 'auto ' : ''}${px}|` : `${px}|${px}`;
    // Written only when it changes: a render re-applies the filter, and five
    // hundred identical style writes would each still invalidate a block.
    if (this.#sized.get(block.el) === size) return;
    this.#sized.set(block.el, size);
    const [intrinsic, fixed] = size.split('|') as [string, string];
    block.el.style.setProperty('contain-intrinsic-size', intrinsic);
    if (fixed) block.el.style.setProperty('height', fixed);
    else block.el.style.removeProperty('height');
  }

  #dropRows(): void {
    this.#io?.disconnect();
    this.#cancelFill?.();
    this.#cancelFill = null;
    this.#blocks = [];
    this.#blockOf.clear();
    this.#height.clear();
    this.#fillAt = 0;
    this.#rowOf.clear();
    this.#built.clear();
    this.#dressed.clear();
    this.#toBuild.clear();
    this.#nearBlocks.clear();
    this.#hitRows.clear();
    this.#hitCurRow = null;
    this.#curRow = null;
    this.#stop = null;
    this.#pin = null;
    this.#list.replaceChildren();
  }

  /** A count filter with no counts yet to answer from. */
  #countWaiting(): boolean {
    return this.#countFilter() && !this.#countsReady() && !this.#lastStats;
  }

  /** Whether the filter shows this line — answered from the line, row or no row. */
  #isShown(line: Line): boolean {
    const f = this.#filter;
    if (f === 'all') return true;
    if (f === 'saved') return this.#saved.has(this.#idFor(line.start));
    if (this.#countWaiting()) return false;
    const c = this.#counts.get(line);
    return f === 'unknown' ? (c?.unknown ?? 0) > 0 : c?.unknown === 1;
  }

  /**
   * Show the lines the filter wants, by hiding the rest in place.
   *
   * A count filter needs every line counted; until then it says how far the
   * count has got and shows nothing, rather than a partial list that would
   * grow under the reader. Rows that exist are hidden or shown; every block
   * is sized for what it shows, and hidden if that is nothing.
   */
  #applyFilter(): void {
    const waiting = this.#countWaiting();
    this.#wait.hidden = !waiting;
    if (waiting) this.#wait.textContent = this.#progressText();
    for (const block of this.#blocks) {
      if (block.filled) {
        for (const line of block.lines) {
          const row = this.#rowOf.get(line);
          if (!row) continue;
          const show = this.#isShown(line);
          if (row.classList.contains('hide') === show) row.classList.toggle('hide', !show);
        }
      }
      this.#sizeBlock(block);
    }
    this.#ensureStop();
  }

  // ---- counting ----------------------------------------------------------

  /**
   * Statuses changed, so every count is out of date. The numbers on screen are
   * blanked rather than left standing, and counted again at once from tokens
   * already in hand — which for a status change is all of them, so the new
   * numbers usually replace the old before anything is painted.
   */
  #recount(): void {
    this.#statusRev++;
    this.#counts.clear();
    this.#counting.clear();
    this.#countFailed = false;
    this.#lastStats = null;
    for (const row of this.#dressed) this.#label(row);
    this.#countAll();
    // Not finished in one go: take the old totals down now rather than at the
    // next progress repaint, and stop a count filter showing old answers.
    if (!this.#countsReady()) {
      this.#paintSummary();
      if (this.#countFilter() && this.#open && this.#mode === 'transcript' && !this.#rowsStale) this.#applyFilter();
    }
  }

  /**
   * Count every line not yet counted for the current statuses, in slices.
   *
   * Each line is analysed once for the analysis in force, the same request
   * that builds its row if both want it at once, and no more than a handful
   * are waiting on the analyser at any moment — so the words on screen are
   * never queued behind a whole film's worth of counting.
   */
  #countAll(): void {
    clearTimeout(this.#countTimer);
    this.#countTimer = 0;
    if (this.#destroyed) return;
    if (!settings().sidebarStats) {
      this.#countQueue = [];
      this.#countAt = 0;
      this.#paintSummary();
      return;
    }
    this.#countQueue = this.#deps.transcript.lines.filter((line) => !this.#counts.has(line));
    this.#countAt = 0;
    this.#pumpCounts();
  }

  #pumpCounts(): void {
    clearTimeout(this.#countTimer);
    this.#countTimer = 0;
    if (this.#destroyed) return;
    const rev = this.#statusRev;
    const started = now();
    while (this.#countAt < this.#countQueue.length && this.#counting.size < COUNT_IN_FLIGHT) {
      if (now() - started > SLICE_MS) break;
      const line = this.#countQueue[this.#countAt++]!;
      if (this.#counts.has(line) || this.#counting.has(line) || !this.#lineSet.has(line)) continue;
      this.#countOne(line, rev);
    }
    const more = this.#countAt < this.#countQueue.length;
    // Yield before the next slice, unless it is the analyser that is holding things up.
    if (more && this.#counting.size < COUNT_IN_FLIGHT) {
      this.#countTimer = window.setTimeout(() => this.#pumpCounts(), 0);
    }
    this.#countProgress(!more && !this.#counting.size);
  }

  #countOne(line: Line, rev: number): void {
    const seg = this.#analyser();
    const tokens = seg ? this.#tokens.get(line.text) : null;
    if (Array.isArray(tokens)) {
      this.#record(line, countWords(tokens, this.#deps.statusOf));
      return;
    }
    this.#counting.add(line);
    const done = (count: Count | null): void => {
      // A newer revision has queued this line again; its own request covers it.
      if (this.#destroyed || rev !== this.#statusRev) return;
      this.#counting.delete(line);
      if (count) this.#record(line, count);
      else this.#countFailed = true;
      this.#pumpCounts();
    };
    // Without an analyser — or when it fails on this line — the player
    // counts, the way it always did.
    const measure = (): void => {
      this.#deps.measure(line.text).then(done, () => done(null));
    };
    if (tokens) tokens.then((t) => done(countWords(t, this.#deps.statusOf)), measure);
    else measure();
  }

  #record(line: Line, count: Count): void {
    this.#counts.set(line, count);
    const row = this.#rowOf.get(line);
    if (row && this.#dressed.has(row)) this.#label(row);
  }

  /**
   * Say how counting is going: the real numbers once every line is counted,
   * a neutral "counting" until then — never a total over some of the lines.
   * Progress repaints a few times a second at most; the finish, at once.
   */
  #countProgress(finished: boolean): void {
    if (!finished) {
      const t = now();
      if (t - this.#progressAt < PROGRESS_MS) return;
      this.#progressAt = t;
    }
    this.#paintSummary();
    if (this.#countFilter() && this.#open && this.#mode === 'transcript' && !this.#rowsStale) this.#applyFilter();
    // A search finds kanji by its reading, which a line has only once it is analysed: look again as they arrive.
    if (this.#query) {
      const before = this.#hits.length;
      this.#findHits();
      if (this.#hits.length !== before) this.#paintHits();
    }
  }

  #progressText(): string {
    const total = this.#lineSet.size;
    if (this.#countFailed) return ui.sidebar.countFailed;
    const pct = total ? Math.floor((Math.min(this.#counts.size, total) / total) * 100) : 0;
    return ui.sidebar.counting(pct);
  }

  /** A row's "2 new", or nothing while its line is uncounted. */
  #label(row: HTMLElement): void {
    const x = row.querySelector<HTMLElement>('.x');
    const line = this.#lineOf.get(row);
    if (!x || !line) return;
    const c = settings().sidebarStats ? this.#counts.get(line) : undefined;
    x.textContent = c?.unknown ? ui.sidebar.lineNew(c.unknown) : '';
    x.className = 'x' + (c ? (c.unknown === 1 ? ' one' : c.unknown ? ' hot' : '') : '');
  }

  /**
   * The analyser the tokens belong to. The player swaps it for a better one
   * as it loads; if that happened without anyone saying so, the tokens in
   * hand are for the old one and are dropped here.
   */
  #analyser(): Segmenter | null {
    const seg = this.#deps.segmenter();
    if (seg !== this.#tokens.segmenter) this.#tokens.reset(seg);
    return seg;
  }

  #paintSummary(): void {
    this.#onSavedChange?.();   // the header must also clear stale statistics
    const el = this.#root.querySelector('.summary');
    if (!el) return;
    if (!settings().sidebarStats || !this.#lineSet.size) {
      el.textContent = '';
      return;
    }
    const stats = this.stats;
    if (!stats) {
      // Counting, or a line could not be counted: say so, and show no number.
      if (this.#countsReady()) {
        el.textContent = '';   // counted, and there are no words to count
        return;
      }
      const pending = document.createElement('span');
      pending.className = 'pending';
      pending.textContent = this.#progressText();
      el.replaceChildren(pending);
      return;
    }
    const { known, unknown, i1 } = stats;
    el.replaceChildren();
    // Each a sentence with its number in bold, wherever the language puts it.
    const parts: Array<[string, string]> = [
      [ui.sidebar.knownPercent(known), ui.sidebar.summaryKnown],
      [String(unknown), ui.sidebar.summaryNew],
      [String(i1), ui.sidebar.summaryReady],
    ];
    for (const [n, template] of parts) {
      const span = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = n;
      span.append(...fill(template, { n: b }));
      el.appendChild(span);
    }
  }

  // ---- building rows near the screen ------------------------------------

  /**
   * Build the rows the list opens on, straight away.
   *
   * Visibility is reported a frame later, and a list that opened on plain
   * text for a frame would flicker. So the rows around the line being spoken
   * — or the top, when nothing is — are made and built now. Where visibility
   * is never reported at all, this is also what keeps the rows in view built.
   */
  #prime(): void {
    const lines = this.#deps.transcript.lines;
    const anchor = this.#active >= 0 && this.#following() ? this.#active : 0;
    const from = Math.max(0, anchor - PRIME / 2);
    for (let i = from; i < Math.min(lines.length, from + PRIME); i++) {
      if (!this.#isShown(lines[i]!)) continue;
      const row = this.#row(i);
      if (row) this.#build(row);
    }
  }

  /**
   * Queue the rows either side of one the list has just moved to. They are
   * built on the next frame, after the move — not before it, where building
   * them would make the move's own measurement lay them all out.
   */
  #queueAround(el: HTMLElement): void {
    const i = Number(el.dataset.i);
    if (!Number.isInteger(i)) return;
    const lines = this.#deps.transcript.lines;
    for (let j = Math.max(0, i - AROUND); j <= Math.min(lines.length - 1, i + AROUND); j++) {
      if (!this.#isShown(lines[j]!)) continue;
      const row = this.#row(j);
      if (row && !this.#isBuilt(row)) this.#toBuild.add(row);
    }
    this.#scheduleBuild();
  }

  /** Blocks came within a screen of the visible list, or left it. */
  #onNear(entries: IntersectionObserverEntry[]): void {
    this.#ioSeen = true;
    for (const e of entries) {
      const block = this.#blockByEl.get(e.target as HTMLElement);
      if (!block) continue;
      if (e.isIntersecting) {
        this.#nearBlocks.add(block.el);
        this.#fill(block);
        for (const line of block.lines) {
          const row = this.#rowOf.get(line);
          if (row && !row.classList.contains('hide') && !this.#isBuilt(row)) this.#toBuild.add(row);
        }
      } else {
        // Passed by on the way somewhere else: not worth building after all.
        this.#nearBlocks.delete(block.el);
        for (const line of block.lines) {
          const row = this.#rowOf.get(line);
          if (row) this.#toBuild.delete(row);
        }
      }
    }
    this.#pumpBuild();
  }

  /** Build what is waiting on the next frame, unless that is already booked. */
  #scheduleBuild(): void {
    if (this.#cancelBuild || !this.#toBuild.size || this.#destroyed) return;
    this.#cancelBuild = nextFrame(() => {
      this.#cancelBuild = null;
      this.#pumpBuild();
    });
  }

  /**
   * Build waiting rows for a slice of a frame, and carry on next frame. A
   * scrollbar dragged through the whole film queues and unqueues blocks as
   * it passes; only what is still near when its turn comes is built. Nothing
   * here measures: a held jump is checked on the next frame instead.
   */
  #pumpBuild(): void {
    this.#cancelBuild?.();
    this.#cancelBuild = null;
    if (this.#destroyed) return;
    const started = now();
    for (const row of this.#toBuild) {
      if (now() - started > SLICE_MS) break;
      this.#toBuild.delete(row);
      if (row.isConnected) this.#build(row);
    }
    this.#scheduleBuild();
    this.#requestHold();
  }

  #isBuilt(row: HTMLElement): boolean {
    return this.#built.get(row) === this.#tokens.revision;
  }

  /**
   * Give a row its words, readings and buttons, for the analysis in force.
   *
   * Tokens already in hand paint at once. Otherwise the row keeps its plain
   * text until they arrive — from the one request for that line, which the
   * counter may well have made already.
   */
  #build(row: HTMLElement): void {
    const line = this.#lineOf.get(row);
    if (!line) return;
    this.#dress(row);
    const seg = this.#analyser();
    const rev = this.#tokens.revision;
    const state = this.#built.get(row);
    if (state === rev || state === -1 - rev) return;
    const tokens = seg ? this.#tokens.get(line.text) : null;
    if (!tokens) {
      this.#built.set(row, rev);   // no analyser: plain text is the finished row
      return;
    }
    if (Array.isArray(tokens)) {
      this.#paintWords(row, line, tokens);
      this.#built.set(row, rev);
      return;
    }
    this.#built.set(row, -1 - rev);
    // Answered for an older analysis, or for a row a new transcript replaced:
    // nothing to paint, and nothing to keep track of.
    const current = (): boolean =>
      !this.#destroyed && this.#tokens.revision === rev && row.isConnected && this.#built.has(row);
    tokens.then(
      (t) => {
        if (!current()) return;
        this.#paintWords(row, line, t);
        this.#built.set(row, rev);
        this.#requestHold();
      },
      () => {
        // The analyser failed on this line; it stays readable as plain text.
        if (current()) this.#built.set(row, rev);
      },
    );
  }

  /**
   * The parts of a row that do not depend on its words — its count and its
   * bookmark — added the first time it is built and kept from then on.
   */
  #dress(row: HTMLElement): void {
    if (this.#dressed.has(row)) return;
    const meta = row.querySelector('.meta');
    if (!meta) return;
    // The count, a badge in the row's corner that the line flows around: in
    // the time row it sat short of the buttons that only show on hover.
    const x = document.createElement('span');
    x.className = 'x';
    row.prepend(x);
    // Every row's buttons have the same names, so each is described by its
    // line; ← and → reach them, Tab does not (#stop).
    const of = row.querySelector('.tx')?.id ?? '';
    const save = document.createElement('button');
    save.className = 'save';
    save.tabIndex = -1;
    save.setAttribute('aria-describedby', of);
    save.replaceChildren(icon('bookmark', 15));
    if (this.#deps.onAddLine) {
      const add = document.createElement('button');
      add.className = 'addline';
      add.tabIndex = -1;
      add.setAttribute('aria-describedby', of);
      add.replaceChildren(icon('linePlus', 15));
      add.dataset.tip = ui.sidebar.addSentence;
      add.setAttribute('aria-label', ui.sidebar.addSentenceLabel);
      meta.append(add);
    }
    meta.append(save);
    this.#dressed.add(row);
    this.#label(row);
    this.#paintSave(row);
  }

  /** A line's words, each carrying its status and reading, in place of its plain text. */
  #paintWords(row: HTMLElement, line: Line, tokens: readonly Token[]): void {
    const into = row.querySelector<HTMLElement>('.tx');
    if (!into) return;
    const text = line.text;
    const frag = document.createDocumentFragment();
    // Whether any reading exists, and whether one sits on a word the "new
    // words only" setting would show it for — the second decides whether
    // this line needs the taller leading in that mode.
    let ruby = false;
    let fresh = false;
    // What each word is drawn as, so a reading knows what stands beside it.
    const drawn: Drawn[] = tokens.map((t) => (t.punct ? (t.surface.includes('\n') ? 'break' : 'mark') : rubyOf(this.#deps.segmenter(), t)));
    for (const [j, tok] of tokens.entries()) {
      if (tok.punct) {
        // In a span, so a phrase across it can mark it too.
        const p = document.createElement('span');
        p.className = 'p';
        p.textContent = tok.surface;
        frag.appendChild(p);
        continue;
      }

      const w = document.createElement('span');
      w.className = 'w';
      // Pressed as a button is, with Enter or Space; ← and → reach it (#installListKeys).
      w.setAttribute('role', 'button');
      w.dataset.tok = JSON.stringify(tok);
      w.dataset.line = text;
      const status = this.#deps.statusOf(tok);
      w.dataset.s = status;
      this.#wordTok.set(w, tok);

      // Readings and status belong here too: a transcript that renders the
      // same words differently from the overlay is two tools, not one.
      const segs = drawn[j] as ReturnType<typeof rubyOf>;
      const annotated = segs.some((x) => x.ruby);
      if (annotated) {
        this.#annotated.add(w);
        ruby = true;
        if (status === 'unknown' || status === 'learning') fresh = true;
        for (const [i, seg] of segs.entries()) {
          if (!seg.ruby) {
            w.appendChild(document.createTextNode(seg.text));
            continue;
          }
          const r = document.createElement('ruby');
          r.appendChild(document.createTextNode(seg.text));
          const rt = document.createElement('rt');
          rt.textContent = seg.ruby;
          r.appendChild(rt);
          if (romanised(seg.ruby)) r.dataset.r = seg.ruby;
          else {
            const [before, after] = sidesOf(drawn, j, i);
            // One kana of a reading is .46em of the text under it here (.tx rt).
            const room = roomFor(seg.text, seg.ruby, before, after, 0.46);
            if (room) {
              r.dataset.k = seg.ruby;
              r.style.setProperty('--lg-before', `${room.left}em`);
              r.style.setProperty('--lg-after', `${room.right}em`);
              r.style.setProperty('--lg-lean', `${Math.round((room.lean / 0.46) * 1000) / 1000}em`);
            }
          }
          w.appendChild(r);
        }
      } else {
        w.textContent = tok.surface;
      }
      frag.appendChild(w);
    }
    // A word holding the Tab stop goes with the old words: its line's time takes over, focus too.
    const stop = this.#stop;
    if (stop && into.contains(stop)) {
      const seek = row.querySelector<HTMLElement>('.seek');
      const focused = this.#root.activeElement === stop;
      this.#setStop(seek);
      if (focused) seek?.focus({ preventScroll: true });
    }
    into.replaceChildren(frag);
    into.classList.toggle('has-ruby', ruby);
    into.classList.toggle('has-new-ruby', fresh);
  }

  /**
   * A status change, applied to a built row where it stands: each word's
   * underline, and whether the line still needs room for a reading.
   */
  #repaintStatus(row: HTMLElement): void {
    const into = row.querySelector<HTMLElement>('.tx');
    if (!into) return;
    let fresh = false;
    for (const w of Array.from(into.children) as HTMLElement[]) {
      const tok = this.#wordTok.get(w);
      if (!tok) continue;
      const status = this.#deps.statusOf(tok);
      if (w.dataset.s !== status) w.dataset.s = status;
      if (this.#annotated.has(w) && (status === 'unknown' || status === 'learning')) fresh = true;
    }
    into.classList.toggle('has-new-ruby', fresh);
  }

  #installHover(): void {
    this.#list.addEventListener('mouseover', (e) => {
      if (!settings().sidebarHover) return;
      const hit = (e.target as HTMLElement).closest('.w') as HTMLElement | null;
      if (hit) this.#previewSoon(hit);
    });
    this.#list.addEventListener('mouseout', (e) => {
      const w = (e.target as HTMLElement).closest('.w') as HTMLElement | null;
      if (!w) return;
      // Crossing from 食 to べる leaves an element but not the word. Treated
      // as leaving, the card blinked out and back on every kanji boundary.
      const to = (e as MouseEvent).relatedTarget as Node | null;
      if (to && w.contains(to)) return;
      // Nor is moving along a marked phrase leaving it.
      if (w.classList.contains('inphrase') && (to as Element | null)?.closest?.('.inphrase')?.parentElement === w.parentElement) return;
      this.#hideHover();
    });
  }

  /** Preview a word, under the pointer or with focus, after a short wait. */
  #previewSoon(hit: HTMLElement): void {
    // A word in a marked phrase is the phrase, hovered as one: its last word stands for it.
    const w = phraseAt(hit, '.w')?.last ?? hit;
    // Moving onto a reading inside the same word is not a new hover.
    if (w === this.#hoverFor) return;
    this.#hideHover();
    this.#hoverFor = w;
    this.#hoverTimer = window.setTimeout(() => void this.#showHover(w), HOVER_DELAY);
  }

  /**
   * The line a transcript word sits on: when it starts and what it means.
   * Nothing is claimed if the row no longer matches the word's own line.
   */
  #contextOf(w: HTMLElement): WordContext {
    const row = w.closest<HTMLElement>('.line');
    const line = row ? this.#lineOf.get(row) : undefined;
    if (!line || line.text !== w.dataset.line) return {};
    return { start: line.start, end: line.end, translation: line.secondary };
  }

  async #showHover(w: HTMLElement): Promise<void> {
    const pick = phraseAt(w, '.w');
    const tok = pick ? phraseToken(pick.words, pick.text) : w.dataset.tok ? (JSON.parse(w.dataset.tok) as Token) : null;
    // Preview only, and never on top of a card the learner opened on purpose.
    if (!tok || popupIsOpen()) return;

    const seq = ++this.#hoverSeq;
    const result = await (this.#deps.lookup ?? lookupToken)(tok);
    // A first lookup can take a while. By the time it answers the pointer may
    // have moved on, the panel closed or the row been rebuilt — and a card
    // shown then pointed at nothing, or at the previous word.
    if (seq !== this.#hoverSeq || this.#hoverFor !== w || !w.isConnected || !this.#open) return;
    const top = result.state === 'ok' ? result.entries[0] : undefined;

    this.#hover.replaceChildren();
    const head = document.createElement('div');
    const hw = document.createElement('span');
    hw.className = 'hw';
    hw.lang = settings().target;
    hw.textContent = top?.word ?? tok.surface;
    head.appendChild(hw);
    const reading = top?.reading ?? tok.reading;
    if (reading) {
      const hr = document.createElement('span');
      hr.className = 'hr';
      hr.lang = settings().target;
      hr.textContent = reading;
      head.appendChild(hr);
    }
    this.#hover.appendChild(head);

    if (top) {
      const hp = document.createElement('div');
      hp.className = 'hp';
      hp.textContent = partsOfSpeech(top.kind ?? top.senses[0]?.pos ?? []);
      const hd = document.createElement('div');
      hd.className = 'hd';
      // Preview only: one gloss, no buttons. Acting on a word means clicking.
      hd.textContent = top.senses[0]?.glosses.slice(0, 2).join('; ') ?? '';
      this.#hover.append(hp, hd);
      // What the form is, as the word's own card says: 待てなかった, potential · negative · past.
      if (tok.inflections?.length) {
        const hg = document.createElement('div');
        hg.className = 'hg';
        hg.textContent = tok.inflections.map(grammarLabel).join(' · ');
        this.#hover.appendChild(hg);
      }
    } else {
      const hd = document.createElement('div');
      hd.className = 'hd';
      hd.textContent =
        result.state === 'loading'
          ? ui.sidebar.dictionaryLoading(result.percent)
          : result.state === 'error'
            ? ui.sidebar.dictionaryUnavailable
            : ui.sidebar.noEntry;
      this.#hover.appendChild(hd);
    }

    const r = w.getBoundingClientRect();
    this.#hover.classList.add('on');
    // Measured, not assumed. The clamp was written for a narrower card and
    // never followed it when it widened, so up to 54px ran off the right edge
    // wherever the panel meets the screen's — fullscreen, theater, Netflix.
    const width = this.#hover.offsetWidth || HOVER_WIDTH;
    const h = this.#hover.offsetHeight;
    const below = r.bottom + 8;
    const top_ = below + h > window.innerHeight - 8 ? r.top - h - 8 : below;
    this.#hover.style.top = `${Math.max(8, Math.min(top_, window.innerHeight - h - 8))}px`;
    const from = uiDirection() === 'rtl' ? r.right - width : r.left;
    this.#hover.style.left = `${Math.max(8, Math.min(from, window.innerWidth - width - 8))}px`;
  }

  /** Hide the card, and make sure no lookup still under way can bring it back. */
  #hideHover(): void {
    clearTimeout(this.#hoverTimer);
    this.#hoverSeq++;
    this.#hoverFor = null;
    this.#hover.classList.remove('on');
  }

  /**
   * Brighten the tab while the player's own controls are up.
   *
   * Sitting at a low opacity keeps it out of the way during a scene, but
   * something that never responds reads as a rendering artefact rather than a
   * control — so it wakes with the same gesture that wakes the player.
   *
   * These listeners are on the page's document, which outlives this panel:
   * they go with the panel's abort signal, or every video watched in the tab
   * kept its whole transcript alive through them.
   */
  #followPlayerChrome(): void {
    const signal = this.#abort.signal;
    const wake = (): void => {
      this.#host.classList.add('active');
      clearTimeout(this.#idle);
      this.#idle = window.setTimeout(() => this.#host.classList.remove('active'), 2600);
    };
    for (const ev of ['mousemove', 'keydown'] as const) {
      document.addEventListener(ev, wake, { passive: true, signal });
    }
    wake();
  }

  destroy(): void {
    this.#destroyed = true;
    this.#statusRev++;
    this.#abort.abort();
    this.#unwatch();
    this.#io?.disconnect();
    this.#cancelBuild?.();
    this.#cancelFill?.();
    this.#toBuild.clear();
    this.#countQueue = [];
    clearTimeout(this.#countTimer);
    clearTimeout(this.#hoverTimer);
    clearTimeout(this.#idle);
    this.#host.remove();
  }
}

/**
 * Anki reads a tab-separated file directly, and the header lines tell it how
 * without a click. Older versions treat them as comments and skip them, so
 * they cost nothing.
 */
/**
 * A long list, drawn as it comes into view.
 *
 * The rows go in blocks of LIST_BLOCK, each block drawn only when it nears the
 * view; until then it is an empty box about as tall as its rows will be. A
 * list of known words runs to thousands, each with a dictionary lookup, and
 * drawing them all at once is how opening it stalled. A drawn block is
 * skipped by the browser while it is off screen (content-visibility).
 */
function lazyRows<T>(box: HTMLElement, items: readonly T[], draw: (item: T) => HTMLElement, guess: number): IntersectionObserver | null {
  const blocks: Array<{ el: HTMLElement; from: number }> = [];
  for (let i = 0; i < items.length; i += LIST_BLOCK) {
    const el = document.createElement('div');
    el.className = 'blk';
    el.style.height = `${Math.min(LIST_BLOCK, items.length - i) * guess}px`;
    box.appendChild(el);
    blocks.push({ el, from: i });
  }
  const fill = (b: { el: HTMLElement; from: number }): void => {
    b.el.style.removeProperty('height');
    b.el.replaceChildren(...items.slice(b.from, b.from + LIST_BLOCK).map(draw));
  };
  // The top of the list is what opens in view: drawn at once, not a frame later.
  const [first, ...rest] = blocks;
  if (first) fill(first);
  if (typeof IntersectionObserver !== 'function') {
    rest.forEach(fill);
    return null;
  }
  const byEl = new Map(rest.map((b) => [b.el, b] as const));
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      seen.unobserve(e.target);
      const b = byEl.get(e.target as HTMLElement);
      if (b) fill(b);
    }
  }, { root: box, rootMargin: '600px 0px' });
  for (const b of rest) seen.observe(b.el);
  return seen;
}

export function savedTsv(lines: Bookmark[]): string {
  const head = [
    '#separator:tab',
    '#html:false',
    '#columns:Sentence\tTranslation\tSource\tLink',
  ];
  const rows = lines.map((b) =>
    [
      tsvCell(b.text),
      tsvCell(b.secondary),
      tsvCell([b.title, stamp(b.start)].filter(Boolean).join(' · ')),
      tsvCell(b.url),
    ].join('\t'),
  );
  return [...head, ...rows].join('\n');
}

/** A list of marked words as a file Anki imports, the way saved lines are. */
export function wordsTsv(words: Array<{ word: string; reading: string; meaning: string }>): string {
  const head = ['#separator:tab', '#html:false', '#columns:Word\tReading\tMeaning'];
  const rows = words.map((w) => [tsvCell(w.word), tsvCell(w.reading), tsvCell(w.meaning)].join('\t'));
  return [...head, ...rows].join('\n');
}

/** A filename that sorts by date and never collides across a day. */
function fileStamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function stamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
