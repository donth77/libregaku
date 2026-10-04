/**
 * A word or two over the player, confirming what a key just did.
 *
 * Keys act without the cursor anywhere near what they change — adding the
 * last word looked up, cycling furigana on a line that may have none to show,
 * hiding a second line that may not be on screen. An action with nothing to
 * see is indistinguishable from a key that did nothing, so each one says so.
 * Briefly, out of the way, and never taking a click.
 */

const STYLE = `
  :host {
    position: absolute !important;
    /* Centred on the picture, which the open panel moves left: --lg-inset is its width. */
    left: calc((100% - var(--lg-inset, 0px)) / 2) !important; top: 14% !important;
    transform: translateX(-50%) !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  }
  .msg {
    max-width: min(420px, 80vw); padding: 7px 14px;
    background: rgba(18, 23, 42, .92); color: #E8ECF6;
    border: 1px solid #2A3348; border-radius: 999px;
    font: 600 13px/1.4 system-ui, -apple-system, "Hiragino Sans", sans-serif;
    text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    box-shadow: 0 6px 24px -8px rgba(0,0,0,.7);
    opacity: 0; transition: opacity .12s ease-out;
  }
  .msg.on { opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .msg { transition: none; } }
`;

let host: HTMLElement | null = null;
let msg: HTMLElement | null = null;
let timer = 0;

/** `inset` is how much of the player's right side the panel covers, in px. */
export function flash(mount: HTMLElement, text: string, ms = 1500, inset = 0): void {
  // One at a time, in whichever player is current: a new message replaces the last.
  if (!host || host.parentElement !== mount) {
    host?.remove();
    host = document.createElement('div');
    host.className = 'libregaku-flash';
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    msg = document.createElement('div');
    msg.className = 'msg';
    msg.setAttribute('role', 'status');
    root.append(style, msg);
    mount.appendChild(host);
  }
  // A custom property, because the host's position is pinned with !important.
  host.style.setProperty('--lg-inset', `${inset}px`);
  const el = msg;
  if (!el) return;
  el.textContent = text;
  el.classList.add('on');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => el.classList.remove('on'), ms);
}

export function clearFlash(): void {
  window.clearTimeout(timer);
  host?.remove();
  host = null;
  msg = null;
}
