import { icon } from './icons';
import { TIP_STYLE, tooltips } from './tooltip';
import { fill, languageLabel, ui, uiDirection, uiLocale } from '../i18n';
import { logo } from '../logo';
import { TARGET_LANGUAGES, featuresOf, nextRuby, settings, setSetting } from '../settings';

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
  sidebarOpen: () => boolean;
  /** Width of the open transcript panel, so the bar stops short of it. */
  inset: () => number;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
}

const STYLE = `
:host {
  /* Text starts where the interface's language starts: the page around sets left, which is wrong in Arabic. */
  text-align: start !important;
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
/* The symbol's square artboard has margins at the sides; take them back so
   the ink sits on the bar's padding and the usual gap from the badge. */
.mark { display: block; flex: none; margin: 0 -4px; }
.badge {
  display: inline-flex; align-items: center; height: 24px; padding: 0 10px;
  border-radius: 999px; background: #2A3348; color: #C7CFE2;
  font: 600 11px/1 ui-monospace, monospace; letter-spacing: .09em; text-transform: uppercase;
}
.badge.flag {
  height: auto; padding: 0; background: none; border-radius: 0;
  font: 20px/1 "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif; letter-spacing: 0;
}
.badge.flag svg { display: block; height: 20px; width: auto; border-radius: 2px; }
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
button.on { color: #F2F5FC; }
button:focus-visible { outline: 2px solid #F2F5FC; outline-offset: -2px; }
button svg { display: block; }

.count {
  position: absolute; transform: translate(11px, -11px);
  min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  background: #F2F5FC; color: #0D111C;
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
${TIP_STYLE}
`;

export class Header {
  #host: HTMLElement;
  #root: ShadowRoot;
  #bar: HTMLElement;
  #tab: HTMLButtonElement;
  #left: HTMLElement;
  /** Whose bar this is, when it sits over someone else's player. */
  #mark: SVGSVGElement | null;
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
    this.#host.lang = uiLocale();
    this.#host.dir = uiDirection();
    this.#root = this.#host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    this.#bar = document.createElement('div');
    this.#bar.className = 'bar';

    this.#left = document.createElement('div');
    this.#left.className = 'left';

    this.#mark = logo('symbol', 30, 'Libregaku');
    this.#mark?.classList.add('mark');

    const right = document.createElement('div');
    right.className = 'right';

    // Named in update(), which runs before the bar is first seen, so that
    // repainting the bar names them again: in another language, if it changed.
    const add = (key: string, name: string, onClick: () => void): HTMLButtonElement => {
      const b = document.createElement('button');
      b.replaceChildren(icon(name, 20));
      b.addEventListener('click', onClick);
      this.#buttons.set(key, b);
      right.appendChild(b);
      return b;
    };

    add('ruby', 'rubySome', () => {
      // Cycles the same three values the settings panel offers, in the order
      // you would want them mid-episode: off, only what you don't know, all.
      void setSetting('ruby', nextRuby(settings().ruby)).then(() => this.update());
    });
    add('blur', 'eyeOff', () => {
      void setSetting('blurPrimary', !settings().blurPrimary).then(() => this.update());
    });
    add('dual', 'captions', () => {
      void setSetting('dualSubtitles', !settings().dualSubtitles).then(() => this.update());
    });
    add('sidebar', 'panel', () => {
      this.#deps.onToggleSidebar();
      this.update();
    });
    add('pin', 'unlock', () => {
      const pinned = !settings().headerPinned;
      void setSetting('headerPinned', pinned).then(() => {
        this.#reveal(pinned || this.#shown);
        this.update();
      });
    });
    add('settings', 'settings', () => this.#deps.onOpenSettings());

    this.#bar.append(this.#left, right);

    this.#tab = document.createElement('button');
    this.#tab.className = 'tab';
    this.#tab.replaceChildren(icon('chevronsUp', 16));
    this.#tab.addEventListener('click', () => this.#reveal(!this.#shown));

    this.#root.append(style, this.#bar, this.#tab);
    // Under each button: the bar runs along the top of the player.
    tooltips(this.#root, () => this.#host.getBoundingClientRect());

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

  /**
   * Repaint the numbers, the on/off state of every switch, and every word on
   * the bar, so a change of interface language needs nothing more than this.
   */
  update(): void {
    const s = settings();
    this.#host.classList.toggle('off', !s.headerBar);
    if (!s.headerBar) this.#reveal(false);
    // The host's edges are pinned with !important against the page's CSS, so
    // the inset travels as a custom property rather than an inline right.
    this.#host.style.setProperty('--lg-inset', `${this.#deps.inset()}px`);

    const stats = this.#deps.stats();
    this.#left.replaceChildren();
    if (this.#mark) this.#left.appendChild(this.#mark);

    // The language being learned: its flag, or its code, as settings say.
    const lang = TARGET_LANGUAGES.find((l) => l.code === s.target);
    const badge = document.createElement('span');
    const flag = s.languageBadge === 'flag' && lang?.flag;
    const flagSvg = s.languageBadge === 'flag' ? lang?.flagSvg : undefined;
    badge.className = flag || flagSvg ? 'badge flag' : 'badge';
    // The SVG is the build's own file (src/flags/), not user input.
    if (flagSvg) badge.innerHTML = flagSvg;
    else badge.textContent = flag || s.target;
    const name = languageLabel(s.target);
    badge.dataset.tip = name;
    badge.setAttribute('role', 'img');
    badge.setAttribute('aria-label', name);
    this.#left.appendChild(badge);

    if (stats) {
      const sep = document.createElement('span');
      sep.className = 'sep';
      this.#left.appendChild(sep);
      // The same words the panel uses for the same numbers: one number, one name.
      this.#left.appendChild(stat('good', ui.header.knownTip,
        fill(ui.header.knownStat, { percent: bold(ui.header.knownPercent(stats.known)) })));
      this.#left.appendChild(stat('i1', ui.header.readyTip,
        fill(ui.header.readyStat, { count: bold(String(stats.i1)) })));
    }

    /** `keys` is the button's key, shown in its tooltip and given to assistive tech. */
    const setOn = (key: string, on: boolean, title: string, keys?: { shown: string; aria: string }): void => {
      const b = this.#buttons.get(key);
      if (!b) return;
      b.classList.toggle('on', on);
      b.dataset.tip = title;
      if (keys) b.dataset.key = keys.shown;
      b.setAttribute('aria-label', title);
      b.setAttribute('aria-pressed', String(on));
      if (keys) b.setAttribute('aria-keyshortcuts', keys.aria);
    };

    // Furigana is for a language with readings; its icon draws which of the three it is on.
    const ruby = this.#buttons.get('ruby');
    if (ruby) {
      ruby.hidden = !featuresOf(s.target).readings;
      ruby.replaceChildren(icon(s.ruby === 'always' ? 'rubyAll' : s.ruby === 'never' ? 'rubyOff' : 'rubySome', 20));
    }
    // Named for what the language draws above its words: furigana, pinyin.
    setOn('ruby', s.ruby !== 'never', ui.common[featuresOf(s.target).readings || 'furigana'](s.ruby), { shown: 'R', aria: 'R' });
    setOn('blur', s.blurPrimary, s.blurPrimary ? ui.header.unblurSubtitle : ui.header.blurSubtitle,
      { shown: 'H', aria: 'H' });
    this.#buttons.get('blur')?.replaceChildren(icon(s.blurPrimary ? 'eye' : 'eyeOff', 20));
    setOn('dual', s.dualSubtitles, s.dualSubtitles ? ui.header.hideTranslation : ui.header.showTranslation,
      { shown: '↑', aria: 'ArrowUp' });
    setOn('sidebar', this.#deps.sidebarOpen(), ui.header.transcript, { shown: 'S', aria: 'S' });

    const pin = this.#buttons.get('pin');
    if (pin) {
      pin.replaceChildren(icon(s.headerPinned ? 'lock' : 'unlock', 20));
      setOn('pin', s.headerPinned, s.headerPinned ? ui.header.unpinHeader : ui.header.pinHeader);
    }

    const gear = this.#buttons.get('settings');
    if (gear) {
      gear.dataset.tip = ui.header.settings;
      gear.setAttribute('aria-label', ui.header.settings);
    }
    this.#tab.dataset.tip = ui.header.showHeader;
    this.#tab.setAttribute('aria-label', ui.header.showHeaderLabel);
  }

  destroy(): void {
    this.#mount.removeEventListener('mousemove', this.#onMove);
    this.#mount.removeEventListener('mouseleave', this.#onLeave);
    this.#host.remove();
  }
}

/** A number on the bar, named: `parts` is its words with the number in bold among them, from fill(). */
function stat(cls: string, title: string, parts: Array<string | Node>): HTMLElement {
  const el = document.createElement('span');
  el.className = `stat ${cls}`;
  el.dataset.tip = title;
  el.append(...parts);
  return el;
}

function bold(text: string): HTMLElement {
  const b = document.createElement('b');
  b.textContent = text;
  return b;
}
