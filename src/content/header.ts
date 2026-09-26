import { icon } from './icons';
import { settings, setSetting } from '../settings';

/**
 * The bar across the top of the player.
 *
 * It answers "how am I doing on this video" without opening anything, and
 * carries the switches you reach for mid-episode — furigana, the second
 * subtitle line, the transcript panel — where they are one click from the
 * video rather than two menus deep.
 *
 * It stays hidden until the cursor nears the top, so a bar that exists for
 * glances costs nothing while watching. The lock keeps it down for anyone who
 * would rather have it permanently.
 *
 * Reveal is driven by `mousemove` on the player rather than by a transparent
 * hover strip: a strip across the top would sit over the player's own back
 * button and title, and swallowing those clicks to save a listener would be a
 * bad trade.
 */

const REVEAL_ZONE = 84;   // px from the top of the player that count as "near the top"

export interface HeaderStats {
  known: number;
  unknown: number;
  i1: number;
}

export interface HeaderDeps {
  /** Null until enough of the transcript has been measured to mean anything. */
  stats: () => HeaderStats | null;
  savedCount: () => number;
  sidebarOpen: () => boolean;
  /** Width of the open transcript panel, so the bar stops short of it. */
  inset: () => number;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onShowSaved: () => void;
}

const STYLE = `
:host {
  position: absolute !important;
  top: 0 !important; left: 0 !important; right: var(--lg-inset, 0px) !important;
  z-index: 2147483000 !important;
  display: block !important;
  pointer-events: none !important;
  font-family: system-ui, -apple-system, "Helvetica Neue", sans-serif !important;
}
/* Off means off: the host's own important rule beats an inline display, so
   the switch has to be a rule in here, where specificity can settle it. */
:host(.off) { display: none !important; }
* { box-sizing: border-box; }

.bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 18px; padding: 0 16px; height: 56px;
  background: rgba(17, 20, 33, .94);
  border-bottom: 1px solid rgba(255, 255, 255, .07);
  color: #E8ECF6; font-size: 15px;
  transform: translateY(-100%);
  transition: transform .16s ease;
  pointer-events: auto;
}
.bar.show { transform: translateY(0); }
@media (prefers-reduced-motion: reduce) { .bar, .tab { transition: none; } }

.left { display: flex; align-items: center; gap: 12px; min-width: 0; overflow: hidden; }
.badge {
  display: inline-flex; align-items: center; height: 24px; padding: 0 10px;
  border-radius: 999px; background: #2A3348; color: #C7CFE2;
  font: 600 11px/1 ui-monospace, monospace; letter-spacing: .09em; text-transform: uppercase;
}
.stat { color: #9AA4BF; white-space: nowrap; font-size: 14px; }
.stat b { color: #E8ECF6; font-weight: 700; font-variant-numeric: tabular-nums; }
.stat.good b { color: #63AF97; }
.stat.i1 b { color: #E8B45C; }
.sep { width: 1px; height: 18px; background: rgba(255,255,255,.12); flex: none; }

.right { display: flex; align-items: center; gap: 4px; flex: none; }
button {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; padding: 0;
  background: none; border: 0; border-radius: 8px;
  color: #9AA4BF; cursor: pointer;
}
button:hover { background: rgba(255,255,255,.09); color: #E8ECF6; }
button.on { color: #8AA2E8; }
button:focus-visible { outline: 2px solid #8AA2E8; outline-offset: -2px; }
button svg { display: block; }

.count {
  position: absolute; transform: translate(11px, -11px);
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: #8AA2E8; color: #11141F;
  font: 700 10px/16px ui-monospace, monospace; text-align: center;
  pointer-events: none;
}

/* The pull tab: the only thing visible when the bar is away. */
.tab {
  position: absolute; top: 0; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; justify-content: center;
  width: 48px; height: 18px; padding: 0;
  background: rgba(17, 20, 33, .82);
  border: 0; border-radius: 0 0 8px 8px;
  color: #7E88A6; cursor: pointer;
  transition: opacity .16s ease, color .16s ease;
  pointer-events: auto;
}
.tab:hover { color: #E8ECF6; background: rgba(17, 20, 33, .96); }
.tab[hidden] { display: none; }
`;

export class Header {
  #host: HTMLElement;
  #root: ShadowRoot;
  #bar: HTMLElement;
  #tab: HTMLButtonElement;
  #left: HTMLElement;
  #deps: HeaderDeps;
  #mount: HTMLElement;
  #shown = false;
  #buttons = new Map<string, HTMLButtonElement>();
  #onMove: (e: MouseEvent) => void;
  #onLeave: () => void;

  constructor(mount: HTMLElement, deps: HeaderDeps) {
    this.#deps = deps;
    this.#mount = mount;

    this.#host = document.createElement('div');
    this.#host.id = 'libregaku-header';
    this.#root = this.#host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    this.#bar = document.createElement('div');
    this.#bar.className = 'bar';

    this.#left = document.createElement('div');
    this.#left.className = 'left';

    const right = document.createElement('div');
    right.className = 'right';

    const add = (
      key: string,
      name: string,
      title: string,
      onClick: () => void,
    ): HTMLButtonElement => {
      const b = document.createElement('button');
      b.replaceChildren(icon(name, 20));
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', onClick);
      this.#buttons.set(key, b);
      right.appendChild(b);
      return b;
    };

    add('ruby', 'ruby', 'Furigana', () => {
      // Cycles the same three values the settings panel offers, in the order
      // you would want them mid-episode: off, only what you don't know, all.
      const order = ['never', 'unknown', 'always'] as const;
      const next = order[(order.indexOf(settings().ruby) + 1) % order.length]!;
      void setSetting('ruby', next).then(() => this.update());
    });
    add('dual', 'captions', 'Second subtitle line', () => {
      void setSetting('dualSubtitles', !settings().dualSubtitles).then(() => this.update());
    });
    add('saved', 'bookmark', 'Saved lines', () => this.#deps.onShowSaved());
    add('sidebar', 'panel', 'Transcript panel', () => {
      this.#deps.onToggleSidebar();
      this.update();
    });
    add('pin', 'unlock', 'Keep this bar open', () => {
      const pinned = !settings().headerPinned;
      void setSetting('headerPinned', pinned).then(() => {
        this.#reveal(pinned || this.#shown);
        this.update();
      });
    });
    add('settings', 'settings', 'Settings', () => this.#deps.onOpenSettings());

    this.#bar.append(this.#left, right);

    this.#tab = document.createElement('button');
    this.#tab.className = 'tab';
    this.#tab.replaceChildren(icon('chevronsUp', 16));
    this.#tab.title = 'Libregaku';
    this.#tab.setAttribute('aria-label', 'Show the Libregaku bar');
    this.#tab.addEventListener('click', () => this.#reveal(!this.#shown));

    this.#root.append(style, this.#bar, this.#tab);

    // A click leaves focus where it was. A focused switch here kept Space for
    // itself, so the next Space flipped furigana again instead of pausing.
    this.#root.addEventListener('mousedown', (e) => {
      if ((e.target as Element | null)?.closest?.('button')) e.preventDefault();
    });

    // The player container is positioned by the site in every case we mount
    // into, but say so anyway rather than trust it — an unpositioned parent
    // would send the bar to the top of the document.
    if (getComputedStyle(mount).position === 'static') mount.style.position = 'relative';
    mount.appendChild(this.#host);

    this.#onMove = (e: MouseEvent) => {
      if (!settings().headerBar || settings().headerPinned) return;
      const box = mount.getBoundingClientRect();
      this.#reveal(e.clientY - box.top < REVEAL_ZONE);
    };
    this.#onLeave = () => {
      if (!settings().headerPinned) this.#reveal(false);
    };
    mount.addEventListener('mousemove', this.#onMove);
    mount.addEventListener('mouseleave', this.#onLeave);

    this.#reveal(settings().headerPinned);
    this.update();
  }

  #reveal(show: boolean): void {
    if (show === this.#shown) return;
    this.#shown = show;
    this.#bar.classList.toggle('show', show);
    this.#tab.hidden = show;
  }

  /** Repaint the numbers and the on/off state of every switch. */
  update(): void {
    const s = settings();
    this.#host.classList.toggle('off', !s.headerBar);
    if (!s.headerBar) this.#reveal(false);
    // The host's edges are pinned with !important against the page's CSS, so
    // the inset travels as a custom property rather than an inline right.
    this.#host.style.setProperty('--lg-inset', `${this.#deps.inset()}px`);

    const stats = this.#deps.stats();
    this.#left.replaceChildren();

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = s.target;
    this.#left.appendChild(badge);

    if (stats) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      this.#left.appendChild(sep);
      // The same words the panel uses for the same numbers: one number, one name.
      this.#left.appendChild(stat('good', `${stats.known}%`, 'known',
        'Share of the words in this video you already have a card for'));
      this.#left.appendChild(stat('i1', String(stats.i1), 'ready to learn',
        'Lines where only one word is new to you — the easiest to learn from'));
    }

    const setOn = (key: string, on: boolean, title: string): void => {
      const b = this.#buttons.get(key);
      if (!b) return;
      b.classList.toggle('on', on);
      b.title = title;
      b.setAttribute('aria-label', title);
      b.setAttribute('aria-pressed', String(on));
    };

    setOn('ruby', s.ruby !== 'never', `Furigana: ${s.ruby === 'unknown' ? 'new words' : s.ruby}`);
    setOn('dual', s.dualSubtitles, s.dualSubtitles ? 'Hide the second line' : 'Show a second line');
    setOn('sidebar', this.#deps.sidebarOpen(), 'Transcript panel');

    const pin = this.#buttons.get('pin');
    if (pin) {
      pin.replaceChildren(icon(s.headerPinned ? 'lock' : 'unlock', 20));
      setOn('pin', s.headerPinned, s.headerPinned ? 'Let this bar hide again' : 'Keep this bar open');
    }

    const saved = this.#buttons.get('saved');
    if (saved) {
      const n = this.#deps.savedCount();
      saved.replaceChildren(icon('bookmark', 20));
      if (n) {
        const c = document.createElement('span');
        c.className = 'count';
        c.textContent = n > 99 ? '99+' : String(n);
        saved.appendChild(c);
      }
      setOn('saved', n > 0, n ? `${n} saved on this video` : 'Saved lines');
    }
  }

  destroy(): void {
    this.#mount.removeEventListener('mousemove', this.#onMove);
    this.#mount.removeEventListener('mouseleave', this.#onLeave);
    this.#host.remove();
  }
}

function stat(cls: string, value: string, label: string, title: string): HTMLElement {
  const el = document.createElement('span');
  el.className = `stat ${cls}`;
  el.title = title;
  const b = document.createElement('b');
  b.textContent = value;
  el.append(b, document.createTextNode(` ${label}`));
  return el;
}
