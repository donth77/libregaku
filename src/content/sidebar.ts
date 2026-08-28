import { lookupWord } from '../dict/client';
import { icon } from './icons';
import { readablePos } from '../dict/pos';
import type { Segmenter, Token } from '../morphology/types';
import { setSetting, settings } from '../settings';
import { furigana } from '../morphology/furigana';
import { PANEL_STYLE, buildSettings } from './settings-panel';
import type { Transcript } from './transcript';

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

const STYLE = `
  :host {
    position: absolute !important;
    top: 0 !important; right: 0 !important; bottom: 0 !important;
    z-index: 2147483646 !important;
    pointer-events: none !important;
  }
  .panel {
    pointer-events: auto;
    position: absolute; top: 0; right: 0; bottom: 0;
    display: flex; flex-direction: column;
    background: rgba(13,17,28,.94); color: #E8ECF6;
    border-left: 1px solid #2A3348;
    font: 13px/1.5 system-ui, -apple-system, "Hiragino Sans", sans-serif;
    backdrop-filter: blur(8px);
  }
  .grip {
    position: absolute; left: -3px; top: 0; bottom: 0; width: 7px;
    cursor: col-resize; z-index: 2;
  }
  .grip:hover { background: rgba(138,162,232,.35); }
  header {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 10px 12px; border-bottom: 1px solid #212939;
    font: 600 10px/1.4 ui-monospace, monospace; letter-spacing: .12em;
    text-transform: uppercase; color: #838DA8; flex: none;
  }
  button {
    background: none; border: 0; color: #838DA8; cursor: pointer;
    font: 600 10px/1 ui-monospace, monospace; letter-spacing: .08em;
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
    width: 26px; height: 26px; padding: 0; border-radius: 5px;
  }
  .ico:hover { background: #212939; color: #E8ECF6; }
  .ico[aria-pressed="false"] { color: #5A6480; }
  .ico svg { display: block; }
  .search { padding: 9px 12px; border-bottom: 1px solid #212939; flex: none; }
  input {
    width: 100%; box-sizing: border-box; padding: 6px 9px;
    background: #12172A; border: 1px solid #2A3348; border-radius: 5px;
    color: #E8ECF6; font: 13px system-ui, sans-serif;
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
    padding: 10px 12px 8px; font-size: 12px; color: #B4BDD4;
    display: flex; gap: 12px; flex-wrap: wrap; font-variant-numeric: tabular-nums;
  }
  .summary b { color: #E8ECF6; }
  .x { font: 10px/1.6 ui-monospace, monospace; text-align: right; font-variant-numeric: tabular-nums; }
  .x.hot { color: #E5806C; font-weight: 600; }
  .x.one { color: #D9A64A; font-weight: 600; }
  .note {
    padding: 8px 12px; font-size: 11px; color: #D9A64A;
    background: #2C2314; border-bottom: 1px solid #212939; flex: none;
  }
  .lines { overflow-y: auto; flex: 1; overscroll-behavior: contain; padding: 8px 10px 72px; }

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
    padding: 11px 13px 9px; margin-bottom: 7px;
    background: #141A2A; border: 1px solid #232C42; border-radius: 9px;
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
    display: block; font-size: 17px; line-height: 2.5;
    color: #E8ECF6; word-break: normal; overflow-wrap: anywhere;
  }
  /* Space for the readings is reserved by line-height, not per token, so
     annotated and bare words sit on the same baseline. */
  .tx ruby { display: inline-block; position: relative; line-height: 1; }
  .tx rt {
    position: absolute; left: 50%; bottom: calc(100% + .04em);
    transform: translateX(-50%);
    font-size: .46em; line-height: 1; color: #8AA2E8;
    white-space: nowrap; user-select: none; pointer-events: none;
  }

  .w { cursor: pointer; border-radius: 2px; padding: 0 1px 2px; }
  .w:hover { background: #2A3550; }
  .w[data-s="unknown"]  { box-shadow: inset 0 -2px 0 #E5806C; }
  .w[data-s="learning"] { box-shadow: inset 0 -1.5px 0 #D9A64A; }
  .w[data-s="tracking"] { box-shadow: inset 0 -2px 0 #A78BFA; }

  .meta {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-top: 5px;
    font: 10px/1.4 ui-monospace, monospace; color: #5A6480;
    font-variant-numeric: tabular-nums;
  }
  .x { font: inherit; }
  .x.hot { color: #E5806C; font-weight: 600; }
  .x.one { color: #D9A64A; font-weight: 600; }

  .sec { display: block; font-size: 12.5px; line-height: 1.6; color: #838DA8; margin-top: 4px; }
  .empty { padding: 18px 12px; color: #6B7490; font-size: 12px; }

  /*
   * Filters float rather than occupying a permanent strip. They matter while
   * mining and never while reading, and the transcript is what the panel is
   * for.
   */
  .fab {
    position: absolute; right: 16px; bottom: 16px; z-index: 3;
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #1A2138; border: 1px solid #3B4A6B; color: #8AA2E8;
    box-shadow: 0 6px 20px -6px rgba(0,0,0,.7); cursor: pointer; padding: 0;
  }
  .fab:hover { background: #232D4A; color: #E8ECF6; }
  .fab.on { background: #8AA2E8; color: #0D111C; border-color: #8AA2E8; }
  .filters {
    position: absolute; right: 16px; bottom: 64px; z-index: 3;
    display: none; flex-direction: column; gap: 4px;
    background: #141A2A; border: 1px solid #2A3348; border-radius: 8px;
    padding: 6px; box-shadow: 0 8px 28px -8px rgba(0,0,0,.75);
  }
  .filters.open { display: flex; }
  .f {
    font: 600 10px/1 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; padding: 8px 12px; border-radius: 5px;
    border: 1px solid transparent; background: none; color: #838DA8;
    cursor: pointer; text-align: left; white-space: nowrap;
  }
  .f:hover { background: #1B2234; color: #E8ECF6; }
  .f[aria-pressed="true"] { background: #1A2138; color: #8AA2E8; border-color: #3B4A6B; }

  .hover {
    position: fixed; z-index: 2147483647; width: 230px;
    background: #12172A; border: 1px solid #2A3348; border-radius: 8px;
    box-shadow: 0 8px 28px -6px rgba(0,0,0,.7); padding: 9px 11px;
    pointer-events: none; display: none;
  }
  .hover.on { display: block; }
  .hw { font-size: 15px; font-weight: 600; }
  .hr { font: 500 10px ui-monospace, monospace; color: #8AA2E8; margin-left: 6px; }
  .hp { font: 10px ui-monospace, monospace; color: #6B7490; margin: 2px 0 3px; letter-spacing: .05em; }
  .hd { font-size: 12px; color: #C7CFE2; }
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
  #width = 340;
  #active = -1;
  #hits = new Set<number>();
  #filter: 'all' | 'unknown' | 'i1' = 'all';
  #counts = new Map<number, { unknown: number; words: number }>();
  #userScrolled = false;
  #hoverTimer = 0;
  #mode: 'transcript' | 'settings' = 'transcript';
  #settingsEl: HTMLElement | null = null;
  #fab!: HTMLButtonElement;
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
    gear.replaceChildren(icon('settings', 15));
    gear.title = 'Settings';
    gear.setAttribute('aria-label', 'Settings');
    gear.addEventListener('click', () => this.setMode(this.#mode === 'settings' ? 'transcript' : 'settings'));

    const close = document.createElement('button');
    close.className = 'ico';
    close.replaceChildren(icon('x', 16));
    close.title = 'Hide the panel — press S to bring it back';
    close.setAttribute('aria-label', 'Hide the panel');
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
    fab.replaceChildren(icon('filter', 17));
    fab.title = 'Filter lines';
    fab.setAttribute('aria-label', 'Filter lines');
    fab.addEventListener('click', () => {
      const open = filters.classList.toggle('open');
      fab.setAttribute('aria-expanded', String(open));
    });

    for (const [key, label, title] of [
      ['all', 'All lines', 'Every line'],
      ['unknown', 'Has new words', 'Lines containing a word you have no card for'],
      ['i1', 'i+1 only', 'Exactly one unknown word — the highest-value lines to mine'],
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
    this.#list.addEventListener('scroll', () => {
      this.#userScrolled = true;
      this.#hideHover();
    });

    this.#hover = document.createElement('div');
    this.#hover.className = 'hover';

    this.#search = search;
    this.#panel.append(grip, head, search, summary, this.#note, this.#list, filters, fab);
    this.#root.append(style, this.#panel, this.#hover);
    mount.appendChild(this.#host);

    void this.#restore();
    deps.transcript.onChange(() => this.render());
    this.#installHover();
  }

  async #restore(): Promise<void> {
    try {
      const got = await chrome.storage.sync.get(WIDTH_KEY);
      this.#width = Number(got[WIDTH_KEY]) || 340;
    } catch {
      /* keep the default width */
    }
    // Open unless the learner has closed it before. The transcript is the
    // reason the panel exists; hiding it until a keypress is discovered means
    // most people never see it.
    this.toggle(settings().sidebarOpen);
    this.#applyWidth();
  }

  #applyWidth(): void {
    this.#panel.style.width = `${this.#width}px`;
  }

  #installResize(grip: HTMLElement): void {
    let startX = 0;
    let startW = 0;
    const move = (e: PointerEvent): void => {
      this.#width = Math.min(Math.max(240, startW + (startX - e.clientX)), 640);
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
  setMode(mode: 'transcript' | 'settings'): void {
    this.#mode = mode;
    const showing = mode === 'settings';

    this.#title.textContent = showing ? 'Settings' : 'Transcript';
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

    if (showing) {
      this.#settingsEl = buildSettings(() => this.render());
      this.#panel.appendChild(this.#settingsEl);
    } else {
      this.render();
    }
  }

  toggle(open?: boolean): void {
    this.#open = open ?? !this.#open;
    this.#host.style.display = this.#open ? '' : 'none';
    if (this.#open) this.render();
    if (this.#open !== settings().sidebarOpen) void setSetting('sidebarOpen', this.#open);
  }

  get isOpen(): boolean {
    return this.#open;
  }

  /** Follow playback, unless the viewer has scrolled away. */
  setActive(index: number): void {
    if (index === this.#active) return;
    this.#active = index;
    if (!this.#open) return;

    for (const el of Array.from(this.#list.children)) el.classList.remove('cur');
    const el = this.#list.children[index] as HTMLElement | undefined;
    if (!el) return;
    el.classList.add('cur');
    if (!this.#userScrolled) el.scrollIntoView({ block: 'center' });
  }

  render(): void {
    if (!this.#open) return;

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

    transcript.lines.forEach((line, i) => {
      this.#fab.style.display = settings().sidebarStats ? '' : 'none';
    const stats = settings().sidebarStats;
      const c = stats ? this.#counts.get(i) : undefined;
      if (this.#filter === 'unknown' && (c?.unknown ?? 0) === 0) return;
      if (this.#filter === 'i1' && c?.unknown !== 1) return;

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
      meta.append(time, x);
      row.appendChild(meta);

      this.#list.appendChild(row);
    });

    if (settings().sidebarStats) void this.#measure();
  }

  /**
   * Count unknown words per line, lazily.
   *
   * Measuring the whole transcript up front would tokenize thousands of lines
   * before the panel could paint. Counting after the first render, then
   * repainting once, keeps opening instant.
   */
  async #measure(): Promise<void> {
    const { transcript } = this.#deps;
    if (this.#counts.size >= transcript.lines.length) {
      this.#paintSummary();
      return;
    }

    let changed = false;
    await Promise.all(
      transcript.lines.map(async (line, i) => {
        if (this.#counts.has(i)) return;
        this.#counts.set(i, await this.#deps.measure(line.text));
        changed = true;
      }),
    );
    if (!changed) return;

    for (const el of Array.from(this.#list.children)) {
      const i = Number((el as HTMLElement).dataset.i);
      const c = this.#counts.get(i);
      const x = el.querySelector('.x');
      if (!c || !x) continue;
      x.textContent = String(c.unknown);
      x.className = 'x' + (c.unknown === 1 ? ' one' : c.unknown ? ' hot' : '');
    }
    this.#paintSummary();
  }

  #paintSummary(): void {
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
    for (const [n, label] of [[`${known}%`, 'known'], [unknown, 'new'], [i1, 'at i+1']] as const) {
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

  destroy(): void {
    clearTimeout(this.#hoverTimer);
    this.#host.remove();
  }
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
