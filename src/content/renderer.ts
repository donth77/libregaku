import { furigana } from '../morphology/furigana';
import type { Token } from '../morphology/types';

/**
 * The subtitle overlay.
 *
 * Everything lives in a shadow root: host pages have hostile CSS, and a shadow
 * boundary makes collisions structurally impossible rather than a bug class to
 * chase. Tokens are real DOM text — selectable, copyable, and legible to a
 * popup dictionary extension if the user runs one.
 */

/**
 * Pre-alpha: outline the text and log its geometry, so "nothing rendered" is
 * never ambiguous. Set false once the overlay is trusted on a given site.
 */
export const DEBUG_BOX = false;

const STYLE = `
  /* Inner-tree !important beats the outer document, so these cannot be
     overridden by the host page. \`all: initial\` used to live here and reset
     position/display out from under the layout — never reset the host. */
  :host {
    position: absolute !important;
    inset: 0 !important;
    display: block !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    contain: none !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    clip-path: none !important;
  }
  .wrap {
    position: absolute; left: 0; right: 0; bottom: var(--bottom, 12%);
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    font-family: system-ui, -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif;
    text-align: center; pointer-events: none;
  }
  .primary, .secondary {
    max-width: 88%; padding: 4px 12px; border-radius: 5px;
    background: rgba(0,0,0,.72); pointer-events: auto;
  }
  .primary:empty, .secondary:empty { display: none; }
  .primary {
    font-size: var(--size, 2.1vw); line-height: 1.85; color: #F2F5FC;
    display: flex; flex-wrap: wrap; justify-content: center; gap: 0 2px;
    user-select: text;
  }
  .secondary { font-size: calc(var(--size, 2.1vw) * .68); color: #B9C3D8; user-select: text; }
  .t { position: relative; padding: 0 1px 3px; border-radius: 2px; cursor: pointer; }
  .t:hover { background: rgba(255,255,255,.15); }
  .t rt {
    font-size: .48em; font-weight: 400; color: #9FB4E8;
    letter-spacing: .02em; user-select: none;
  }
  /* Ruby only where it earns its place: words you have not learned yet. */
  .wrap:not(.ruby-all) .t:not([data-s="unknown"]):not([data-s="learning"]) rt { visibility: hidden; }
  .wrap.ruby-off rt { display: none; }
  .t[data-s="unknown"]  { box-shadow: inset 0 -2.5px 0 #E5806C; }
  .t[data-s="learning"] { box-shadow: inset 0 -1.5px 0 #D9A64A; }
  .hidden { display: none; }
  /* Hug the text. The wrapper is a full-width flex column, so outlining it
     drew a box across the whole player. */
  .debug .primary {
    outline: 2px dashed #E5806C;
    outline-offset: 2px;
    position: relative;
  }
  .debug .primary::before {
    content: 'libregaku';
    position: absolute; top: -15px; left: 0;
    font: 600 9px/1.4 ui-monospace, monospace; letter-spacing: .1em;
    color: #E5806C; text-transform: uppercase; pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

export class Overlay {
  #host: HTMLElement;
  #root: ShadowRoot;
  #primary: HTMLElement;
  #secondary: HTMLElement;
  #onToken?: (t: Token, el: HTMLElement) => void;

  constructor(mount: HTMLElement) {
    this.#host = document.createElement('div');
    this.#host.className = 'libregaku-root';
    this.#root = this.#host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    const wrap = document.createElement('div');
    wrap.className = DEBUG_BOX ? 'wrap debug' : 'wrap';

    this.#primary = document.createElement('div');
    this.#primary.className = 'primary';
    this.#secondary = document.createElement('div');
    this.#secondary.className = 'secondary hidden';

    wrap.append(this.#primary, this.#secondary);
    this.#root.append(style, wrap);
    mount.appendChild(this.#host);

    this.#primary.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('.t') as HTMLElement | null;
      if (!el || !this.#onToken) return;
      const raw = el.dataset.tok;
      if (raw) this.#onToken(JSON.parse(raw) as Token, el);
    });
  }

  onToken(cb: (t: Token, el: HTMLElement) => void): void {
    this.#onToken = cb;
  }

  /** always | unknown | never */
  setRubyMode(mode: 'always' | 'unknown' | 'never'): void {
    const wrap = this.#primary.parentElement;
    wrap?.classList.toggle('ruby-all', mode === 'always');
    wrap?.classList.toggle('ruby-off', mode === 'never');
  }

  render(tokens: Token[], secondary?: string): void {
    if (DEBUG_BOX) {
      const h = this.#host.getBoundingClientRect();
      queueMicrotask(() => {
        const p = this.#primary.getBoundingClientRect();
        const cs = getComputedStyle(this.#host);
        console.log(
          `%c[libregaku]%c paint ${tokens.length} tokens\n` +
            `  host    ${Math.round(h.width)}×${Math.round(h.height)} @ ${Math.round(h.left)},${Math.round(h.top)}\n` +
            `  text    ${Math.round(p.width)}×${Math.round(p.height)} @ ${Math.round(p.left)},${Math.round(p.top)}\n` +
            `  host css display=${cs.display} position=${cs.position} z=${cs.zIndex} vis=${cs.visibility} opacity=${cs.opacity}`,
          'color:#8AA2E8', '',
        );
      });
    }
    this.#primary.replaceChildren();
    for (const tok of tokens) {
      const segs = furigana(tok.surface, tok.reading);
      const annotated = segs.some((x) => x.ruby);

      const el = document.createElement('span');
      el.className = 't';
      el.dataset.s = 'unknown';        // M4 replaces this with real Anki status
      el.dataset.tok = JSON.stringify(tok);
      el.tabIndex = 0;

      if (!annotated) {
        el.textContent = tok.surface;
      } else {
        for (const seg of segs) {
          if (!seg.ruby) {
            el.appendChild(document.createTextNode(seg.text));
            continue;
          }
          const ruby = document.createElement('ruby');
          ruby.appendChild(document.createTextNode(seg.text));
          const rt = document.createElement('rt');
          rt.textContent = seg.ruby;
          ruby.appendChild(rt);
          el.appendChild(ruby);
        }
      }
      this.#primary.appendChild(el);
    }
    if (secondary) {
      this.#secondary.textContent = secondary;
      this.#secondary.classList.remove('hidden');
    } else {
      this.#secondary.classList.add('hidden');
    }
  }

  clear(): void {
    this.#primary.replaceChildren();
    this.#secondary.classList.add('hidden');
  }

  destroy(): void {
    this.#host.remove();
  }
}
