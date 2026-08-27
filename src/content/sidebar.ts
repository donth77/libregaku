import { lookupWord } from '../dict/client';
import { readablePos } from '../dict/pos';
import type { Segmenter, Token } from '../morphology/types';
import { settings } from '../settings';
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
const OPEN_KEY = 'libregaku.sidebar.open';
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
  .lines { overflow-y: auto; flex: 1; overscroll-behavior: contain; }
  .line {
    display: grid; grid-template-columns: 44px 1fr; gap: 9px;
    padding: 8px 12px; border-bottom: 1px solid #171E2C;
    cursor: pointer; border-left: 2px solid transparent;
  }
  .line:hover { background: #161B2E; }
  .line.cur { border-left-color: #8AA2E8; background: #1A2138; }
  .line.hit { background: #2C2314; }
  .t {
    font: 10px/1.6 ui-monospace, monospace; color: #6B7490;
    font-variant-numeric: tabular-nums;
  }
  .tx { font-size: 14px; line-height: 1.75; }
  .w { cursor: pointer; border-radius: 2px; padding: 0 1px; }
  .w:hover { background: #242E44; }
  .sec { display: block; font-size: 12px; color: #838DA8; margin-top: 2px; }
  .empty { padding: 18px 12px; color: #6B7490; font-size: 12px; }
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
`;

export interface SidebarDeps {
  transcript: Transcript;
  segmenter: () => Segmenter | null;
  /** Unknown content words in a line, and how many words it has. */
  measure: (text: string) => Promise<{ unknown: number; words: number }>;
  seek: (t: number) => void;
  currentTime: () => number;
  onWordClick: (token: Token, el: HTMLElement, sentence: string) => void;
}

export class Sidebar {
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
  #hoverOn = true;

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
    const hoverBtn = document.createElement('button');
    hoverBtn.textContent = 'Hover ✓';
    hoverBtn.addEventListener('click', () => {
      this.#hoverOn = !this.#hoverOn;
      hoverBtn.textContent = this.#hoverOn ? 'Hover ✓' : 'Hover ✗';
      if (!this.#hoverOn) this.#hideHover();
    });
    const close = document.createElement('button');
    close.textContent = 'Close';
    close.addEventListener('click', () => this.toggle(false));
    controls.append(hoverBtn, close);
    head.append(title, controls);

    const filters = document.createElement('div');
    filters.className = 'filters';
    if (!settings().sidebarStats) filters.style.display = 'none';
    for (const [key, label, title] of [
      ['all', 'All', 'Every line'],
      ['unknown', 'Has new', 'Lines containing a word you have no card for'],
      ['i1', 'i+1', 'Exactly one unknown word — the highest-value lines to mine'],
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
        this.render();
      });
      filters.appendChild(b);
    }

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

    this.#panel.append(grip, head, search, summary, filters, this.#note, this.#list);
    this.#root.append(style, this.#panel, this.#hover);
    mount.appendChild(this.#host);

    void this.#restore();
    deps.transcript.onChange(() => this.render());
    this.#installHover();
  }

  async #restore(): Promise<void> {
    try {
      const got = await chrome.storage.sync.get([WIDTH_KEY, OPEN_KEY]);
      this.#width = Number(got[WIDTH_KEY]) || 340;
      this.toggle(Boolean(got[OPEN_KEY]));
    } catch {
      this.toggle(false);
    }
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

  toggle(open?: boolean): void {
    this.#open = open ?? !this.#open;
    this.#host.style.display = this.#open ? '' : 'none';
    void chrome.storage.sync.set({ [OPEN_KEY]: this.#open }).catch(() => {});
    if (this.#open) this.render();
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

      const t = document.createElement('span');
      t.className = 't';
      t.textContent = stamp(line.start);

      const tx = document.createElement('span');
      tx.className = 'tx';
      this.#fillLine(tx, line.text);

      if (line.secondary) {
        const s = document.createElement('span');
        s.className = 'sec';
        s.textContent = line.secondary;
        tx.appendChild(s);
      }

      const x = document.createElement('span');
      x.className = 'x' + (c ? (c.unknown === 1 ? ' one' : c.unknown ? ' hot' : '') : '');
      x.textContent = c ? String(c.unknown) : '';
      row.append(t, tx, x);
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
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = tok.surface;
        w.dataset.tok = JSON.stringify(tok);
        w.dataset.line = text;
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
      if (!this.#hoverOn) return;
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
