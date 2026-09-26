import { lookupToken, type LookupResult } from '../dict/client';
import { addSentence, isDuplicate, probe } from '../anki/client';
import { ROOT_TAG, tagsFor } from '../anki/model';
import { sourceField } from '../anki/source';
import { icon } from './icons';
import * as bookmarks from './bookmarks';
import type { Bookmark } from './bookmarks';
import { copyText, downloadText, tsvCell } from './share';
import { readablePos } from '../dict/pos';
import type { Segmenter, Token } from '../morphology/types';
import { onSettingsChange, setSetting, settings, type Settings } from '../settings';
import { furigana } from '../morphology/furigana';
import { PANEL_STYLE, buildSettings, syncSettingsControls } from './settings-panel';
import { popupIsOpen } from './popup';
import type { Transcript, Line } from './transcript';
import { TokenCache, countWords, estimateRowHeight, nextFrame, now, whenIdle, type Count } from './transcript-work';

/**
 * The transcript panel.
 *
 * This is what separates a study tool from a subtitle overlay: the whole script
 * beside the video, clickable, so you can read ahead, go back, and work a scene
 * without scrubbing. No open-source extension has one.
 *
 * Plain DOM rather than Preact, which the design nominated: this is a list and
 * a search box, and a framework would earn its place only once there is more
 * state than that. Revisit when mining controls land.
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

/** Ten lines of the transcript, and their rows once they have been made. */
interface Block {
  el: HTMLElement;
  lines: Line[];
  /** Whether its rows exist. An unfilled block is a placeholder of its estimated height. */
  filled: boolean;
  /** The estimated height of all its rows. */
  height: number;
}

/** Where a transcript word came from, for a card mined from it. */
export interface WordContext {
  /** When the line starts, in seconds — the card's timestamp and link. */
  start?: number;
  /** The line's second-track translation. */
  translation?: string;
}

const clampWidth = (w: number): number => Math.min(Math.max(MIN_WIDTH, w), MAX_WIDTH);

/**
 * Whether the control a key was pressed in uses that key itself.
 *
 * Text fields and selects use every key. Buttons and switches use only the
 * two that press them. Anything else — including a button that merely had
 * focus — leaves the key to the player.
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
  return (tag === 'button' || el.getAttribute('role') === 'button') && presses;
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
    background: rgba(13,17,28,.82); color: #8AA2E8;
    border: 1px solid #2A3348; border-right: 0;
    border-radius: 8px 0 0 8px;
    cursor: pointer; backdrop-filter: blur(6px);
    opacity: .35; transition: opacity .18s, background .18s, color .18s;
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
  .grip:hover { background: rgba(138,162,232,.35); }
  header {
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
  button:focus-visible { outline: 2px solid #8AA2E8; outline-offset: 2px; border-radius: 3px; }
  /* Header controls are icons: three text buttons crowded a 340px column and
     read as a toolbar rather than as chrome. */
  header { gap: 10px; }
  header > span:last-child { display: flex; align-items: center; gap: 2px; }
  .ico {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0; border-radius: 6px;
  }
  .ico:hover { background: #212939; color: #E8ECF6; }
  .ico[aria-pressed="false"] { color: #5A6480; }
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
  .search .count:empty { display: none; }
  input {
    width: 100%; box-sizing: border-box; padding: 8px 11px;
    background: #12172A; border: 1px solid #2A3348; border-radius: 6px;
    color: #E8ECF6; font: 14px system-ui, sans-serif;
  }
  input:focus { outline: none; border-color: #8AA2E8; }
  .filters { display: flex; gap: 5px; padding: 0 12px 9px; flex: none; }
  .f {
    font: 600 10px/1 ui-monospace, monospace; letter-spacing: .06em;
    text-transform: uppercase; padding: 6px 10px; border-radius: 5px;
    border: 1px solid #2A3348; background: #12172A; color: #838DA8; cursor: pointer;
  }
  .f[aria-pressed="true"] { background: #1A2138; color: #8AA2E8; border-color: #3B4A6B; }
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
    border-color: #8AA2E8;
    box-shadow: inset 0 0 0 1px #8AA2E8;
    background: #1A2138;
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

  .tx {
    display: block; font-size: 21px; line-height: 1.7;
    color: #E8ECF6; word-break: normal; overflow-wrap: anywhere;
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
    font-size: .46em; line-height: 1; color: #8AA2E8;
    white-space: nowrap; user-select: none; pointer-events: none;
  }

  .w { cursor: pointer; border-radius: 2px; padding: 0 1px 3px; }
  .w:hover { background: #2A3550; }
  .w[data-s="unknown"]  { box-shadow: inset 0 -2.5px 0 #E5806C; }
  .w[data-s="learning"] { box-shadow: inset 0 -1.5px 0 #D9A64A; }
  .w[data-s="tracking"] { box-shadow: inset 0 -2px 0 #A78BFA; }
  .lines.mark-known .w[data-s="known"] { box-shadow: inset 0 -1.5px 0 #63AF97; }

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
    font: 12px/1.4 ui-monospace, monospace; color: #5A6480;
    font-variant-numeric: tabular-nums;
  }
  .line .meta .x { margin-left: auto; }
  /* A saved line has no count, so its remove button takes the right edge. */
  .sv .meta .save { margin-left: auto; }
  .x { font: inherit; white-space: nowrap; }
  .x.hot { color: #E5806C; font-weight: 600; }
  .x.one { color: #D9A64A; font-weight: 600; }

  .sec { display: block; font-size: 14.5px; line-height: 1.6; color: #838DA8; margin-top: 6px; }
  .empty { padding: 20px 14px; color: #6B7490; font-size: 13.5px; }

  /*
   * Filters float rather than occupying a permanent strip. They matter while
   * mining and never while reading, and the transcript is what the panel is
   * for.
   */
  .fab {
    position: absolute; right: 16px; bottom: 16px; z-index: 3;
    width: 44px; height: 44px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #1A2138; border: 1px solid #3B4A6B; color: #8AA2E8;
    box-shadow: 0 6px 20px -6px rgba(0,0,0,.7); cursor: pointer; padding: 0;
  }
  .fab:hover { background: #232D4A; color: #E8ECF6; }
  .fab.on { background: #8AA2E8; color: #0D111C; border-color: #8AA2E8; }
  /*
   * The way back after reading ahead. Only present while the line being
   * spoken is out of sight, so it is never chrome — it is an answer to the
   * one question a scrolled-away transcript raises.
   */
  .now {
    position: absolute; left: 16px; bottom: 16px; z-index: 3;
    display: none; align-items: center; gap: 5px;
    height: 36px; padding: 0 14px 0 10px; border-radius: 18px;
    background: #1A2138; border: 1px solid #3B4A6B; color: #8AA2E8;
    font: 600 11px/1 ui-monospace, monospace; letter-spacing: .07em; text-transform: uppercase;
    box-shadow: 0 6px 20px -6px rgba(0,0,0,.7); cursor: pointer;
  }
  .now.on { display: inline-flex; }
  .now:hover { background: #232D4A; color: #E8ECF6; }
  .now svg { display: block; transform: rotate(90deg); }
  .now.up svg { transform: rotate(-90deg); }
  .filters {
    position: absolute; right: 16px; bottom: 64px; z-index: 3;
    display: none; flex-direction: column; gap: 4px;
    background: #141A2A; border: 1px solid #2A3348; border-radius: 8px;
    padding: 6px; box-shadow: 0 8px 28px -8px rgba(0,0,0,.75);
  }
  .filters.open { display: flex; }
  .f {
    font: 600 11px/1 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; padding: 9px 13px; border-radius: 6px;
    border: 1px solid transparent; background: none; color: #838DA8;
    cursor: pointer; text-align: left; white-space: nowrap;
  }
  .f:hover { background: #1B2234; color: #E8ECF6; }
  .f[aria-pressed="true"] { background: #1A2138; color: #8AA2E8; border-color: #3B4A6B; }

  .hover {
    position: fixed; z-index: 2147483647; width: 270px;
    background: #12172A; border: 1px solid #2A3348; border-radius: 9px;
    box-shadow: 0 8px 28px -6px rgba(0,0,0,.7); padding: 11px 13px;
    pointer-events: none; display: none;
  }
  .hover.on { display: block; }
  .hw { font-size: 17px; font-weight: 600; }
  .hr { font: 500 11px ui-monospace, monospace; color: #8AA2E8; margin-left: 6px; }
  .hp { font: 11px ui-monospace, monospace; color: #6B7490; margin: 2px 0 4px; letter-spacing: .05em; }
  .hd { font-size: 13.5px; color: #C7CFE2; }
  .save {
    display: inline-flex; align-items: center; justify-content: center;
    width: 24px; height: 24px; padding: 0; margin: -4px -5px -4px 0;
    background: none; border: 0; border-radius: 4px;
    color: #5F6982; cursor: pointer; opacity: 0; transition: opacity .12s ease;
  }
  .line:hover .save, .save.on, .save:focus-visible { opacity: 1; }
  .save:hover { background: rgba(255,255,255,.08); color: #C7CFE2; }
  .save.on { color: #8AA2E8; }
  .save.on svg { fill: currentColor; }
  .savedview { overflow-y: auto; padding: 0 0 14px; flex: 1; }
  /*
   * Saved lines are only worth keeping if they can leave. Anki when it is
   * connected; a file or the clipboard when it is not, so a sentence is
   * never trapped in this panel.
   */
  .savedbar { padding: 11px 14px 12px; border-bottom: 1px solid #212939; }
  .savedbar .btnrow { padding: 0; }
  .said { margin-top: 9px; font-size: 12px; line-height: 1.5; color: #8A94AF; }
  .said:empty { display: none; }
  .savedview .empty { margin: 16px 16px 0; font-size: 14px; line-height: 1.55; color: #8992AD; }
  .gh {
    display: flex; align-items: baseline; gap: 8px;
    padding: 15px 16px 6px; font-size: 12px; font-weight: 600;
    color: #9AA4BF; text-transform: uppercase; letter-spacing: .06em;
  }
  .gh span {
    font-size: 9px; letter-spacing: .07em; padding: 2px 5px; border-radius: 3px;
    background: #2A3348; color: #A9B3CC; text-transform: none;
  }
  .sv { padding: 10px 16px; cursor: pointer; border-left: 2px solid transparent; }
  .sv:hover { background: rgba(255,255,255,.045); border-left-color: #8AA2E8; }
  .sv .tx { display: block; font-size: 17px; line-height: 1.5; color: #E8ECF6; }
  .sv .sec { display: block; margin-top: 3px; font-size: 14px; color: #97A0BA; }
  @media (prefers-reduced-motion: no-preference) { .lines { scroll-behavior: smooth; } }
${PANEL_STYLE}
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
   * playing, so its own start time and translation come with it — a card mined
   * here should point at this line, not wherever playback happens to be.
   */
  onWordClick: (token: Token, el: HTMLElement, sentence: string, context?: WordContext) => void;
  /**
   * Enough about this video to find a saved line again months later. Given a
   * time, the link points there rather than at wherever playback happens to be.
   */
  context: (at?: number) => { site: string; video: string; title: string; url: string; lang: string };
  /** "Check again" in settings reached Anki: word status is worth re-reading. */
  onAnkiConnected?: () => void;
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
  #mode: 'transcript' | 'settings' | 'saved' = 'transcript';
  #settingsEl: HTMLElement | null = null;
  #fab!: HTMLButtonElement;
  #now!: HTMLButtonElement;
  #tab!: HTMLButtonElement;
  #filterMenu!: HTMLElement;
  #count!: HTMLElement;
  /** The search, trimmed. While there is one, following playback pauses. */
  #query = '';
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

    const grip = document.createElement('div');
    grip.className = 'grip';
    this.#installResize(grip);

    const head = document.createElement('header');
    const title = document.createElement('span');
    title.textContent = 'Transcript';
    const controls = document.createElement('span');
    const gear = document.createElement('button');
    gear.className = 'ico';
    gear.replaceChildren(icon('settings', 17));
    gear.title = 'Settings';
    gear.setAttribute('aria-label', 'Settings');
    gear.addEventListener('click', () => this.setMode(this.#mode === 'settings' ? 'transcript' : 'settings'));

    const close = document.createElement('button');
    close.className = 'ico';
    close.replaceChildren(icon('x', 18));
    close.title = 'Collapse the panel';
    close.setAttribute('aria-label', 'Collapse the panel');
    close.addEventListener('click', () => this.toggle(false));
    controls.append(gear, close);
    head.append(title, controls);
    this.#title = title;
    this.#gear = gear;
    this.#search = null;

    const filters = document.createElement('div');
    filters.className = 'filters';
    const fab = document.createElement('button');
    fab.className = 'fab';
    fab.replaceChildren(icon('filter', 19));
    fab.title = 'Filter lines';
    fab.setAttribute('aria-label', 'Filter lines');
    fab.setAttribute('aria-expanded', 'false');
    fab.addEventListener('click', () => {
      const open = filters.classList.toggle('open');
      fab.setAttribute('aria-expanded', String(open));
    });

    for (const [key, label, title] of [
      ['all', 'All lines', 'Every line'],
      ['unknown', 'Has new words', 'Lines containing a word you have no card for'],
      ['i1', 'Ready to learn', 'Lines where only one word is new to you — the easiest to learn from'],
      ['saved', 'Saved', 'Lines you kept for later'],
    ] as const) {
      const b = document.createElement('button');
      b.className = 'f';
      b.textContent = label;
      b.title = title;
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
    input.placeholder = 'Search the transcript…';
    input.setAttribute('aria-label', 'Search the transcript');
    // Mid-composition text is not the query yet: searching every kana on the
    // way to a kanji would throw the list about under the IME.
    input.addEventListener('input', (e) => {
      if (!(e as InputEvent).isComposing) this.#setQuery(input.value);
    });
    input.addEventListener('compositionend', () => this.#setQuery(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault();
        if (this.#query) this.#stepHit(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape' && input.value) {
        input.value = '';
        this.#setQuery('');
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
    now.append(icon('forward', 13), document.createTextNode('Current line'));
    now.title = 'Back to the line being spoken';
    now.addEventListener('click', () => this.#resume());
    this.#now = now;

    this.#hover = document.createElement('div');
    this.#hover.className = 'hover';

    this.#tab = document.createElement('button');
    this.#tab.className = 'tab';
    this.#tab.replaceChildren(icon('back', 16));
    this.#tab.title = 'Show the transcript (S)';
    this.#tab.setAttribute('aria-label', 'Show the transcript');
    this.#tab.addEventListener('click', () => this.toggle(true));

    this.#search = search;
    this.#panel.append(grip, head, search, summary, this.#note, this.#wait, this.#list, filters, fab, now);
    this.#root.append(style, this.#panel, this.#tab, this.#hover);
    mount.appendChild(this.#host);

    this.#installKeys();
    this.#applyAppearance(settings());
    this.#unwatch = watchSettings((s, here) => this.#settingsChanged(s, here));
    this.#tokens.reset(deps.segmenter());
    this.#lineSet = new Set(deps.transcript.lines);
    void this.#restore();
    deps.transcript.onChange(() => this.#refreshTranscript());
    this.#installHover();
    this.#installClicks();
    // Counting starts once construction is over: the header wants the numbers
    // even while the panel is closed, but not at the cost of the first frame.
    this.#countTimer = window.setTimeout(() => this.#countAll(), 0);
  }

  /**
   * One listener for every row: a bookmark saves, a word looks up, anywhere
   * else on a card seeks. A listener per row was thousands of them.
   */
  #installClicks(): void {
    this.#list.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      const row = target?.closest?.('.line') as HTMLElement | null;
      const line = row ? this.#lineOf.get(row) : undefined;
      if (!line) return;
      if (target?.closest('.save')) {
        void this.#toggleSave(line);
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
  #settingsChanged(s: Settings, here = true): void {
    if (this.#destroyed) return;
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

  /** Readings and known-word marks, the same three ways the overlay offers. */
  #applyAppearance(s: Settings): void {
    this.#list.classList.toggle('ruby-all', s.ruby === 'always');
    this.#list.classList.toggle('ruby-off', s.ruby === 'never');
    this.#list.classList.toggle('mark-known', s.markKnown);
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
    this.#filterMenu.classList.remove('open');
    this.#fab.setAttribute('aria-expanded', 'false');
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
    this.#onLayout?.();
  }

  #installResize(grip: HTMLElement): void {
    let startX = 0;
    let startW = 0;
    const move = (e: PointerEvent): void => {
      this.#width = clampWidth(startW + (startX - e.clientX));
      this.#applyWidth();
    };
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      void chrome.storage.sync.set({ [WIDTH_KEY]: this.#width }).catch(() => {});
    };
    grip.addEventListener('pointerdown', (e) => {
      e.preventDefault();
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
    if (same) return;
    for (const row of this.#dressed) this.#paintSave(row);
    if (this.#filter === 'saved') this.render();
  }

  /** Save or unsave a line from outside the panel — the B key uses this. */
  async saveLine(line: Line): Promise<void> {
    await this.#toggleSave(line);
  }

  async #toggleSave(line: Line): Promise<void> {
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
  }

  /** A row's bookmark, drawn to match whether its line is saved. */
  #paintSave(row: HTMLElement): void {
    const b = row.querySelector('.save');
    const line = this.#lineOf.get(row);
    if (!b || !line) return;
    const on = this.#saved.has(this.#idFor(line.start));
    b.classList.toggle('on', on);
    const title = on ? 'Saved — click to remove' : 'Save this line';
    b.setAttribute('title', title);
    b.setAttribute('aria-label', title);
    b.setAttribute('aria-pressed', String(on));
  }

  #onSavedChange: (() => void) | null = null;

  /** The header keeps a count; let it know when the count moves. */
  onSavedChange(fn: () => void): void {
    this.#onSavedChange = fn;
  }

  /**
   * What a pile of saved sentences is for.
   *
   * Keeping them was never the point; getting them somewhere they are
   * reviewed is. Anki when it is connected, and a file or the clipboard when
   * it is not — a saved line should never depend on this panel to survive.
   */
  #savedActions(lines: Bookmark[]): HTMLElement {
    const box = document.createElement('div');
    box.className = 'savedbar';
    const row = document.createElement('div');
    row.className = 'btnrow';
    const said = document.createElement('div');
    said.className = 'said';
    said.setAttribute('role', 'status');

    const button = (label: string, title: string, onClick: (b: HTMLButtonElement) => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.addEventListener('click', () => onClick(b));
      row.appendChild(b);
      return b;
    };

    button('Copy', 'Copy every saved line as tab-separated text', () => {
      void copyText(savedTsv(lines)).then((ok) => {
        said.textContent = ok
          ? `${lines.length} line${lines.length === 1 ? '' : 's'} copied.`
          : 'Could not reach the clipboard.';
      });
    });

    button('Export file', 'Save a tab-separated file Anki can import', () => {
      const ok = downloadText(`libregaku-saved-${fileStamp()}.tsv`, savedTsv(lines), 'text/tab-separated-values');
      said.textContent = ok
        ? 'Saved to your downloads. In Anki: File → Import.'
        : 'This page blocked the download — use Copy instead.';
    });

    button('Add to Anki', 'Make a card from each saved line', (b) => {
      void this.#savedToAnki(lines, said, b);
    });

    box.append(row, said);
    return box;
  }

  /**
   * Every saved line as a sentence card.
   *
   * Duplicates are counted rather than treated as failures: running this
   * twice is the normal way to add what has been saved since last time.
   */
  async #savedToAnki(lines: Bookmark[], said: HTMLElement, btn: HTMLButtonElement): Promise<void> {
    const deck = settings().deck;
    if (!deck) {
      said.textContent = 'Choose a deck in Settings first — that is where new cards go.';
      return;
    }

    btn.disabled = true;
    said.textContent = 'Checking Anki…';
    const state = await probe();
    if (state.kind !== 'connected') {
      btn.disabled = false;
      said.textContent =
        state.kind === 'offline'
          ? 'Anki is not running. Open it and try again — Settings has the steps.'
          : state.kind === 'blocked'
            ? 'AnkiConnect has not allowed this extension yet. Settings has the one line to add.'
            : 'Anki could not be reached. Settings says why.';
      return;
    }

    let added = 0;
    let already = 0;
    let failed: string | null = null;
    for (const [i, b] of lines.entries()) {
      said.textContent = `Adding ${i + 1} of ${lines.length}…`;
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
      : `${added} added to ${deck}${already ? `, ${already} already there` : ''}.`;
    this.#onSavedChange?.();
  }

  /**
   * Every saved line, newest video first. Lines from the video on screen seek;
   * lines from elsewhere open that video at the right second, which is the
   * whole reason the url is stored alongside the text.
   */
  async #renderSaved(): Promise<void> {
    const host = this.#settingsEl;
    if (!host) return;
    const groups = await bookmarks.grouped();
    host.replaceChildren();

    if (!groups.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent =
        'Nothing saved yet. Use the bookmark on any transcript line — or press B — to keep a sentence you want to come back to.';
      host.appendChild(empty);
      return;
    }

    host.appendChild(this.#savedActions(groups.flatMap((g) => g.lines)));

    const here = this.#deps.context();
    for (const g of groups) {
      const head = document.createElement('div');
      head.className = 'gh';
      head.textContent = g.title || g.video;
      if (g.site === here.site && g.video === here.video) {
        const badge = document.createElement('span');
        badge.textContent = 'this video';
        head.appendChild(badge);
      }
      host.appendChild(head);

      for (const b of g.lines) {
        const row = document.createElement('div');
        row.className = 'sv';

        const tx = document.createElement('span');
        tx.className = 'tx';
        tx.textContent = b.text;
        row.appendChild(tx);

        if (b.secondary) {
          const sec = document.createElement('span');
          sec.className = 'sec';
          sec.textContent = b.secondary;
          row.appendChild(sec);
        }

        const meta = document.createElement('div');
        meta.className = 'meta';
        const time = document.createElement('span');
        time.textContent = stamp(b.start);
        const del = document.createElement('button');
        del.className = 'save on';
        del.replaceChildren(icon('x', 15));
        del.title = 'Remove from saved';
        del.setAttribute('aria-label', del.title);
        del.addEventListener('click', async (e) => {
          e.stopPropagation();
          await bookmarks.remove(b.id);
          this.#saved.delete(b.id);
          this.#onSavedChange?.();
          void this.#renderSaved();
        });
        meta.append(time, del);
        row.appendChild(meta);

        row.addEventListener('click', () => {
          if (b.site === here.site && b.video === here.video) {
            this.#userScrolled = false;
            this.#deps.seek(b.start);
            this.setMode('transcript');
          } else {
            window.open(b.url, '_blank', 'noopener');
          }
        });

        host.appendChild(row);
      }
    }
  }

  setMode(mode: 'transcript' | 'settings' | 'saved'): void {
    this.#mode = mode;
    const showing = mode !== 'transcript';

    this.#title.textContent =
      mode === 'settings' ? 'Settings' : mode === 'saved' ? 'Saved lines' : 'Transcript';
    this.#gear.replaceChildren(icon(showing ? 'back' : 'settings', showing ? 17 : 15));
    this.#gear.title = showing ? 'Back to the transcript' : 'Settings';
    this.#gear.setAttribute('aria-label', this.#gear.title);
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
      this.#panel.appendChild(this.#settingsEl);
    } else if (mode === 'saved') {
      this.#settingsEl = document.createElement('div');
      this.#settingsEl.className = 'savedview';
      this.#panel.appendChild(this.#settingsEl);
      void this.#renderSaved();
    } else {
      this.render();
    }
  }

  toggle(open?: boolean): void {
    this.#open = open ?? !this.#open;
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
    if (this.#open !== settings().sidebarOpen) void setSetting('sidebarOpen', this.#open);
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
    this.#curRow?.classList.remove('cur');
    el?.classList.add('cur');
    this.#curRow = el;
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
      if (NAV_KEYS.has(e.key)) away();
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

  #findHits(): void {
    this.#hits = this.#query ? this.#deps.transcript.search(this.#query) : [];
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
      ? 'No matches'
      : at >= 0 ? `${at + 1} of ${shown.length}` : `${shown.length} found`;
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
    this.#note.textContent = partial
      ? 'Building as you watch — this player only exposes the current line.'
      : '';

    this.#syncRows();

    if (!transcript.lines.length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = partial
        ? 'Nothing yet. Lines appear here as they are spoken.'
        : 'No transcript loaded.';
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
      if (line === current) {
        this.#curRow?.classList.remove('cur');
        row.classList.add('cur');
        this.#curRow = row;
      }
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

  /** One line's row as it starts out: readable, and nothing more yet. */
  #shell(line: Line): HTMLElement {
    const row = document.createElement('div');
    row.className = 'line';
    row.dataset.i = String(this.#indexOf.get(line) ?? -1);
    const tx = document.createElement('span');
    tx.className = 'tx';
    tx.textContent = line.text;
    row.appendChild(tx);
    if (line.secondary) {
      const sec = document.createElement('span');
      sec.className = 'sec';
      sec.textContent = line.secondary;
      row.appendChild(sec);
    }
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${stamp(line.start)} – ${stamp(line.end)}`;
    row.appendChild(meta);
    this.#rowOf.set(line, row);
    this.#lineOf.set(row, line);
    return row;
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
  }

  #progressText(): string {
    const total = this.#lineSet.size;
    if (this.#countFailed) return 'Some lines could not be counted, so there are no totals.';
    const pct = total ? Math.floor((Math.min(this.#counts.size, total) / total) * 100) : 0;
    return `Counting new words… ${pct}%`;
  }

  /** A row's "2 new", or nothing while its line is uncounted. */
  #label(row: HTMLElement): void {
    const x = row.querySelector<HTMLElement>('.x');
    const line = this.#lineOf.get(row);
    if (!x || !line) return;
    const c = settings().sidebarStats ? this.#counts.get(line) : undefined;
    x.textContent = c?.unknown ? `${c.unknown} new` : '';
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
    for (const [n, label] of [[`${known}%`, 'known'], [unknown, 'new'], [i1, 'ready to learn']] as const) {
      const span = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = String(n);
      span.append(b, document.createTextNode(` ${label}`));
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
    const x = document.createElement('span');
    x.className = 'x';
    const save = document.createElement('button');
    save.className = 'save';
    save.replaceChildren(icon('bookmark', 15));
    meta.append(x, save);
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
    for (const tok of tokens) {
      if (tok.punct) {
        frag.appendChild(document.createTextNode(tok.surface));
        continue;
      }

      const w = document.createElement('span');
      w.className = 'w';
      w.dataset.tok = JSON.stringify(tok);
      w.dataset.line = text;
      const status = this.#deps.statusOf(tok);
      w.dataset.s = status;
      this.#wordTok.set(w, tok);

      // Readings and status belong here too: a transcript that renders the
      // same words differently from the overlay is two tools, not one.
      const segs = furigana(tok.surface, tok.reading);
      const annotated = segs.some((x) => x.ruby);
      if (annotated) {
        this.#annotated.add(w);
        ruby = true;
        if (status === 'unknown' || status === 'learning') fresh = true;
        for (const seg of segs) {
          if (!seg.ruby) {
            w.appendChild(document.createTextNode(seg.text));
            continue;
          }
          const r = document.createElement('ruby');
          r.appendChild(document.createTextNode(seg.text));
          const rt = document.createElement('rt');
          rt.textContent = seg.ruby;
          r.appendChild(rt);
          w.appendChild(r);
        }
      } else {
        w.textContent = tok.surface;
      }
      frag.appendChild(w);
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
      const w = (e.target as HTMLElement).closest('.w') as HTMLElement | null;
      // Moving onto a reading inside the same word is not a new hover.
      if (!w || w === this.#hoverFor) return;
      this.#hideHover();
      this.#hoverFor = w;
      this.#hoverTimer = window.setTimeout(() => void this.#showHover(w), HOVER_DELAY);
    });
    this.#list.addEventListener('mouseout', (e) => {
      const w = (e.target as HTMLElement).closest('.w') as HTMLElement | null;
      if (!w) return;
      // Crossing from 食 to べる leaves an element but not the word. Treated
      // as leaving, the card blinked out and back on every kanji boundary.
      const to = (e as MouseEvent).relatedTarget as Node | null;
      if (to && w.contains(to)) return;
      this.#hideHover();
    });
  }

  /**
   * The line a transcript word sits on: when it starts and what it means.
   * Nothing is claimed if the row no longer matches the word's own line.
   */
  #contextOf(w: HTMLElement): WordContext {
    const row = w.closest<HTMLElement>('.line');
    const line = row ? this.#lineOf.get(row) : undefined;
    if (!line || line.text !== w.dataset.line) return {};
    return { start: line.start, translation: line.secondary };
  }

  async #showHover(w: HTMLElement): Promise<void> {
    const tok = w.dataset.tok ? (JSON.parse(w.dataset.tok) as Token) : null;
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
    hw.textContent = top?.word ?? tok.surface;
    head.appendChild(hw);
    const reading = top?.reading ?? tok.reading;
    if (reading) {
      const hr = document.createElement('span');
      hr.className = 'hr';
      hr.textContent = reading;
      head.appendChild(hr);
    }
    this.#hover.appendChild(head);

    if (top) {
      const hp = document.createElement('div');
      hp.className = 'hp';
      hp.textContent = readablePos(top.senses[0]?.pos ?? []);
      const hd = document.createElement('div');
      hd.className = 'hd';
      // Preview only: one gloss, no buttons. Acting on a word means clicking.
      hd.textContent = top.senses[0]?.glosses.slice(0, 2).join('; ') ?? '';
      this.#hover.append(hp, hd);
    } else {
      const hd = document.createElement('div');
      hd.className = 'hd';
      hd.textContent =
        result.state === 'loading'
          ? `Dictionary loading — ${result.percent}%`
          : result.state === 'error'
            ? 'Dictionary unavailable'
            : 'No entry.';
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
    this.#hover.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - width - 8))}px`;
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
