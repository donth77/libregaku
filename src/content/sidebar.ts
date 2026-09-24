import { lookupWord } from '../dict/client';
import { addSentence, isDuplicate, probe } from '../anki/client';
import { ROOT_TAG, tagsFor } from '../anki/model';
import { sourceField } from '../anki/source';
import { icon } from './icons';
import * as bookmarks from './bookmarks';
import type { Bookmark } from './bookmarks';
import { copyText, downloadText, tsvCell } from './share';
import { readablePos } from '../dict/pos';
import type { Segmenter, Token } from '../morphology/types';
import { setSetting, settings } from '../settings';
import { furigana } from '../morphology/furigana';
import { PANEL_STYLE, buildSettings } from './settings-panel';
import type { Transcript, Line } from './transcript';

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
const HOVER_DELAY = 180;
/** Keys that scroll a list from the keyboard. */
const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

const STYLE = `
  :host {
    position: absolute !important;
    top: 0 !important; right: 0 !important; bottom: 0 !important;
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
  .search { padding: 10px 14px; border-bottom: 1px solid #212939; flex: none; }
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
  .line.cur {
    border-color: #8AA2E8;
    box-shadow: 0 0 0 1px #8AA2E8, 0 4px 18px -6px rgba(138,162,232,.5);
    background: #1A2138;
  }
  .line.hit { border-color: #D9A64A; }
  .line.hide { display: none; }

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
  onWordClick: (token: Token, el: HTMLElement, sentence: string) => void;
  /**
   * Enough about this video to find a saved line again months later. Given a
   * time, the link points there rather than at wherever playback happens to be.
   */
  context: (at?: number) => { site: string; video: string; title: string; url: string; lang: string };
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
  #hits = new Set<number>();
  #filter: 'all' | 'unknown' | 'i1' | 'saved' = 'all';
  /** Ids saved on *this* video, so a row can paint itself without a round trip. */
  #saved = new Set<string>();
  #counts = new Map<Line, { unknown: number; words: number }>();
  #analysisRevision = 0;
  #measuringRevision: number | null = null;
  #destroyed = false;
  #userScrolled = false;
  #hoverTimer = 0;
  #mode: 'transcript' | 'settings' | 'saved' = 'transcript';
  #settingsEl: HTMLElement | null = null;
  #fab!: HTMLButtonElement;
  #now!: HTMLButtonElement;
  #tab!: HTMLButtonElement;
  #filterMenu!: HTMLElement;

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
      b.setAttribute('aria-pressed', String(key === 'all'));
      b.addEventListener('click', () => {
        this.#filter = key;
        filters.querySelectorAll('button').forEach((x) =>
          x.setAttribute('aria-pressed', String(x === b)),
        );
        fab.classList.toggle('on', key !== 'all');
        filters.classList.remove('open');
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
    input.addEventListener('input', () => {
      this.#hits = new Set(deps.transcript.search(input.value));
      this.render();
    });
    search.appendChild(input);

    this.#note = document.createElement('div');
    this.#note.className = 'note';
    this.#note.style.display = 'none';

    this.#list = document.createElement('div');
    this.#list.className = 'lines';
    this.#installFollow();

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
    this.#panel.append(grip, head, search, summary, this.#note, this.#list, filters, fab, now);
    this.#root.append(style, this.#panel, this.#tab, this.#hover);
    mount.appendChild(this.#host);

    void this.#restore();
    deps.transcript.onChange(() => this.#refreshTranscript());
    this.#installHover();
  }

  async #restore(): Promise<void> {
    try {
      const got = await chrome.storage.sync.get(WIDTH_KEY);
      this.#width = Number(got[WIDTH_KEY]) || 400;
    } catch {
      /* keep the default width */
    }
    // Open unless the learner has closed it before. The transcript is the
    // reason the panel exists; hiding it until a keypress is discovered means
    // most people never see it.
    this.toggle(settings().sidebarOpen);
    this.#followPlayerChrome();
    this.#applyWidth();
  }

  #applyWidth(): void {
    this.#panel.style.width = `${this.#width}px`;
    this.#onLayout?.();
  }

  #installResize(grip: HTMLElement): void {
    let startX = 0;
    let startW = 0;
    const move = (e: PointerEvent): void => {
      this.#width = Math.min(Math.max(280, startW + (startX - e.clientX)), 680);
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
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
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

  /** Word status or the segmenter changed: counts and filters must follow. */
  refreshAnalysis(): void {
    this.#counts.clear();
    this.#refreshTranscript();
  }

  #refreshTranscript(): void {
    if (this.#destroyed) return;
    this.#analysisRevision++;
    // A backward seek can insert a line before existing ones. Keep counts by
    // line identity, and retain them only while that line is in the transcript.
    const lines = new Set(this.#deps.transcript.lines);
    for (const line of this.#counts.keys()) {
      if (!lines.has(line)) this.#counts.delete(line);
    }
    this.#paintSummary();
    this.render();
    // The player header still shows statistics when the panel is closed.
    if (settings().sidebarStats) void this.#measure();
  }

  /**
   * The same aggregate the summary line shows, for the header bar. Null until
   * enough lines are measured for a percentage to mean anything.
   */
  get stats(): { known: number; unknown: number; i1: number } | null {
    let words = 0;
    let unknown = 0;
    let i1 = 0;
    for (const c of this.#counts.values()) {
      words += c.words;
      unknown += c.unknown;
      if (c.unknown === 1) i1++;
    }
    if (!words) return null;
    return { known: Math.round(((words - unknown) / words) * 100), unknown, i1 };
  }

  #idFor(start: number): string {
    const c = this.#deps.context();
    return bookmarks.idFor(c.site, c.video, start);
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
    if (!same && this.#mode === 'transcript') this.render();
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
    for (const el of Array.from(this.#list.children)) {
      const row = el as HTMLElement;
      if (Number(row.dataset.i) !== this.#deps.transcript.lines.indexOf(line)) continue;
      const b = row.querySelector('.save');
      if (!b) continue;
      b.classList.toggle('on', on);
      const title = on ? 'Saved — click to remove' : 'Save this line';
      b.setAttribute('title', title);
      b.setAttribute('aria-label', title);
      b.setAttribute('aria-pressed', String(on));
    }
    this.#onSavedChange?.();
    if (this.#filter === 'saved') this.render();
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

    for (const el of [this.#note, this.#list] as HTMLElement[]) {
      el.style.display = showing ? 'none' : '';
    }
    const summary = this.#root.querySelector('.summary') as HTMLElement | null;
    const filters = this.#root.querySelector('.filters') as HTMLElement | null;
    if (summary) summary.style.display = showing ? 'none' : '';
    if (filters) filters.style.display = showing || !settings().sidebarStats ? 'none' : '';
    this.#fab.style.display = showing || !settings().sidebarStats ? 'none' : '';
    this.#paintNow();

    if (mode === 'settings') {
      this.#settingsEl = buildSettings(() => this.render());
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

  /** Follow playback, unless the viewer has scrolled away. */
  setActive(index: number): void {
    if (index === this.#active) return;
    this.#active = index;
    if (!this.#open) return;

    this.#list.querySelector('.line.cur')?.classList.remove('cur');
    const el = this.#row(index);
    if (el) {
      el.classList.add('cur');
      if (this.#following()) this.#reveal(el);
    }
    this.#paintNow();
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

  #following(): boolean {
    return settings().sidebarFollow && !this.#userScrolled;
  }

  /** The card for a transcript line. Not `children[i]`: filters hide rows. */
  #row(index: number): HTMLElement | null {
    if (index < 0) return null;
    return this.#list.querySelector<HTMLElement>(`.line[data-i="${index}"]`);
  }

  /**
   * Centre a card by scrolling the list and nothing else. `scrollIntoView`
   * scrolls every scrollable ancestor too, and the page under the player is
   * one of them.
   */
  #reveal(el: HTMLElement, behavior?: ScrollBehavior): void {
    const list = this.#list;
    const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    const target = top - (list.clientHeight - el.offsetHeight) / 2;
    list.scrollTo({ top: Math.max(0, target), behavior });
  }

  /** Back to the current line, and following again. */
  #resume(): void {
    this.#userScrolled = false;
    const el = this.#row(this.#active);
    if (el) this.#reveal(el);
    this.#paintNow();
  }

  /**
   * Offer the way back only while the current line is out of sight and
   * nothing is bringing it back — while following, it is merely on its way.
   */
  #paintNow(): void {
    const el = this.#open && this.#mode === 'transcript' ? this.#row(this.#active) : null;
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

    this.#list.replaceChildren();

    if (!transcript.lines.length) {
      const e = document.createElement('div');
      e.className = 'empty';
      e.textContent = partial
        ? 'Nothing yet. Lines appear here as they are spoken.'
        : 'No transcript loaded.';
      this.#list.appendChild(e);
      return;
    }

    const stats = settings().sidebarStats;
    this.#fab.style.display = stats ? '' : 'none';
    transcript.lines.forEach((line, i) => {
      const c = stats ? this.#counts.get(line) : undefined;
      if (this.#filter === 'unknown' && (c?.unknown ?? 0) === 0) return;
      if (this.#filter === 'i1' && c?.unknown !== 1) return;
      const savedId = this.#idFor(line.start);
      if (this.#filter === 'saved' && !this.#saved.has(savedId)) return;

      const row = document.createElement('div');
      row.className = 'line' + (i === this.#active ? ' cur' : '') + (this.#hits.has(i) ? ' hit' : '');
      row.dataset.i = String(i);
      row.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.w')) return;   // word clicks are not seeks
        this.#userScrolled = false;
        this.#deps.seek(line.start);
      });

      const tx = document.createElement('span');
      tx.className = 'tx';
      this.#fillLine(tx, line.text);
      row.appendChild(tx);

      if (line.secondary) {
        const sec = document.createElement('span');
        sec.className = 'sec';
        sec.textContent = line.secondary;
        row.appendChild(sec);
      }

      const meta = document.createElement('div');
      meta.className = 'meta';
      const time = document.createElement('span');
      time.textContent = `${stamp(line.start)} – ${stamp(line.end)}`;
      const x = document.createElement('span');
      x.className = 'x' + (c ? (c.unknown === 1 ? ' one' : c.unknown ? ' hot' : '') : '');
      x.textContent = c?.unknown ? `${c.unknown} new` : '';

      const save = document.createElement('button');
      save.className = 'save' + (this.#saved.has(savedId) ? ' on' : '');
      save.replaceChildren(icon('bookmark', 15));
      save.title = this.#saved.has(savedId) ? 'Saved — click to remove' : 'Save this line';
      save.setAttribute('aria-label', save.title);
      save.setAttribute('aria-pressed', String(this.#saved.has(savedId)));
      save.addEventListener('click', (e) => {
        e.stopPropagation();     // saving a line is not a request to seek to it
        void this.#toggleSave(line);
      });

      meta.append(time, x, save);
      row.appendChild(meta);

      this.#list.appendChild(row);
    });

    if (settings().sidebarStats) void this.#measure();

    // A rebuilt list has lost its place. Put it back without animating there:
    // this is a repaint, not playback moving on.
    const cur = this.#row(this.#active);
    if (cur && this.#following()) this.#reveal(cur, 'instant');
    this.#paintNow();
  }

  /**
   * Count after rendering. Only one batch per revision can publish results;
   * changing status or transcript invalidates any measurements still in flight.
   */
  async #measure(): Promise<void> {
    const revision = this.#analysisRevision;
    if (this.#destroyed || this.#measuringRevision === revision) return;
    const { transcript } = this.#deps;
    if (this.#counts.size >= transcript.lines.length) {
      this.#paintSummary();
      return;
    }

    this.#measuringRevision = revision;
    try {
      const measured = await Promise.all(
        transcript.lines.filter((line) => !this.#counts.has(line)).map(async (line) =>
          [line, await this.#deps.measure(line.text)] as const,
        ),
      );
      if (this.#destroyed || revision !== this.#analysisRevision) return;
      for (const [line, counts] of measured) this.#counts.set(line, counts);

      for (const el of Array.from(this.#list.children)) {
        const line = transcript.lines[Number((el as HTMLElement).dataset.i)];
        const c = line && this.#counts.get(line);
        const x = el.querySelector('.x');
        if (!c || !x) continue;
        x.textContent = c.unknown ? `${c.unknown} new` : '';
        x.className = 'x' + (c.unknown === 1 ? ' one' : c.unknown ? ' hot' : '');
      }
      this.#paintSummary();
      // Counts can add or remove rows from the selected filter, including
      // when the filter was selected before the first measurements finished.
      if (this.#filter === 'unknown' || this.#filter === 'i1') this.render();
    } catch (e) {
      if (!this.#destroyed && revision === this.#analysisRevision) {
        console.warn('[libregaku] could not count transcript words:', e);
      }
    } finally {
      if (this.#measuringRevision === revision) this.#measuringRevision = null;
    }
  }

  #paintSummary(): void {
    this.#onSavedChange?.();   // the header must also clear stale statistics
    const el = this.#root.querySelector('.summary');
    if (!el) return;
    if (!settings().sidebarStats) {
      el.textContent = '';
      return;
    }

    let words = 0;
    let unknown = 0;
    let i1 = 0;
    for (const c of this.#counts.values()) {
      words += c.words;
      unknown += c.unknown;
      if (c.unknown === 1) i1++;
    }
    if (!words) {
      el.textContent = '';
      return;
    }
    const known = Math.round(((words - unknown) / words) * 100);
    el.replaceChildren();
    for (const [n, label] of [[`${known}%`, 'known'], [unknown, 'new'], [i1, 'ready to learn']] as const) {
      const span = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = String(n);
      span.append(b, document.createTextNode(` ${label}`));
      el.appendChild(span);
    }
  }

  /** Tokenize lazily — a long transcript should not analyse every line up front. */
  #fillLine(into: HTMLElement, text: string): void {
    const seg = this.#deps.segmenter();
    if (!seg) {
      into.textContent = text;
      return;
    }
    const result = seg.segment(text);
    const paint = (tokens: Token[]): void => {
      into.replaceChildren();
      into.classList.toggle(
        'has-ruby',
        tokens.some((t) => !t.punct && furigana(t.surface, t.reading).some((x) => x.ruby)),
      );
      for (const tok of tokens) {
        if (tok.punct) {
          into.appendChild(document.createTextNode(tok.surface));
          continue;
        }

        const w = document.createElement('span');
        w.className = 'w';
        w.dataset.tok = JSON.stringify(tok);
        w.dataset.line = text;
        w.dataset.s = this.#deps.statusOf(tok);

        // Readings and status belong here too: a transcript that renders the
        // same words differently from the overlay is two tools, not one.
        const segs = furigana(tok.surface, tok.reading);
        if (!segs.some((x) => x.ruby)) {
          w.textContent = tok.surface;
        } else {
          for (const seg of segs) {
            if (!seg.ruby) {
              w.appendChild(document.createTextNode(seg.text));
              continue;
            }
            const ruby = document.createElement('ruby');
            ruby.appendChild(document.createTextNode(seg.text));
            const rt = document.createElement('rt');
            rt.textContent = seg.ruby;
            ruby.appendChild(rt);
            w.appendChild(ruby);
          }
        }
        into.appendChild(w);
      }
    };
    if (Array.isArray(result)) paint(result);
    else {
      into.textContent = text;
      void result.then(paint).catch(() => {});
    }
  }

  #installHover(): void {
    this.#list.addEventListener('mouseover', (e) => {
      if (!settings().sidebarHover) return;
      const w = (e.target as HTMLElement).closest('.w') as HTMLElement | null;
      if (!w) return;
      clearTimeout(this.#hoverTimer);
      this.#hoverTimer = window.setTimeout(() => void this.#showHover(w), HOVER_DELAY);
    });
    this.#list.addEventListener('mouseout', (e) => {
      if ((e.target as HTMLElement).closest('.w')) {
        clearTimeout(this.#hoverTimer);
        this.#hideHover();
      }
    });
    this.#list.addEventListener('click', (e) => {
      const w = (e.target as HTMLElement).closest('.w') as HTMLElement | null;
      if (!w?.dataset.tok) return;
      this.#hideHover();
      this.#deps.onWordClick(JSON.parse(w.dataset.tok) as Token, w, w.dataset.line ?? '');
    });
  }

  async #showHover(w: HTMLElement): Promise<void> {
    const tok = w.dataset.tok ? (JSON.parse(w.dataset.tok) as Token) : null;
    if (!tok) return;

    const result = await lookupWord(tok.lemma, tok.surface);
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
    const h = this.#hover.offsetHeight;
    const top_ = r.bottom + 8 + h > window.innerHeight ? r.top - h - 8 : r.bottom + 8;
    this.#hover.style.top = `${Math.max(8, top_)}px`;
    this.#hover.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 244))}px`;
  }

  #hideHover(): void {
    this.#hover.classList.remove('on');
  }

  /**
   * Brighten the tab while the player's own controls are up.
   *
   * Sitting at a low opacity keeps it out of the way during a scene, but
   * something that never responds reads as a rendering artefact rather than a
   * control — so it wakes with the same gesture that wakes the player.
   */
  #followPlayerChrome(): void {
    let idle = 0;
    const wake = (): void => {
      this.#host.classList.add('active');
      clearTimeout(idle);
      idle = window.setTimeout(() => this.#host.classList.remove('active'), 2600);
    };
    for (const ev of ['mousemove', 'keydown'] as const) {
      document.addEventListener(ev, wake, { passive: true });
    }
    wake();

    // Keys typed inside the panel are ours. The host page only ever sees a
    // keydown whose target is our shadow host — a div, not a field — and
    // treats it as a player shortcut: k pauses, m mutes, a digit seeks, f
    // goes fullscreen. Stop them at the host; our own document-level
    // handlers run in the capture phase and have already had their turn.
    for (const ev of ['keydown', 'keyup', 'keypress'] as const) {
      this.#host.addEventListener(ev, (e) => e.stopPropagation());
    }
  }

  destroy(): void {
    this.#destroyed = true;
    this.#analysisRevision++;
    clearTimeout(this.#hoverTimer);
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
