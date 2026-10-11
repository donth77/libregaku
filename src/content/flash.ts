import { uiDirection, uiLocale } from '../i18n';

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
  /* Right to left, the panel is on the left and moves the picture right. */
  :host([dir=rtl]) { left: calc((100% + var(--lg-inset, 0px)) / 2) !important; }
  /*
   * A long message wraps rather than ending in an ellipsis: it may be the
   * reason a card was not made. One line is still a pill; more round off.
   */
  .msg {
    width: max-content; max-width: min(420px, 80vw); padding: 7px 14px;
    background: rgba(18, 23, 42, .92); color: #E8ECF6;
    border: 1px solid #2A3348; border-radius: 17px;
    font: 600 13px/1.4 system-ui, -apple-system, "Hiragino Sans", sans-serif;
    text-align: center; white-space: normal; overflow-wrap: break-word;
    box-shadow: 0 6px 24px -8px rgba(0,0,0,.7);
    opacity: 0; transition: opacity .12s ease-out;
  }
  .msg.on { opacity: 1; }
  @media (prefers-reduced-motion: reduce) { .msg { transition: none; } }
  /* What a screen reader is told: the same words, kept off screen. */
  .said {
    position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; border: 0;
    overflow: hidden; clip-path: inset(50%); white-space: nowrap;
  }
`;

/** How long a message takes to fade, after which its words go too. */
const FADE_MS = 200;

let host: HTMLElement | null = null;
let msg: HTMLElement | null = null;
let said: HTMLElement | null = null;
let timer = 0;
let frame = 0;

/** `inset` is how much of the player's right side the panel covers, in px. */
export function flash(mount: HTMLElement, text: string, ms = 1500, inset = 0): void {
  // One at a time, in whichever player is current: a new message replaces the last.
  let fresh = false;
  if (!host || host.parentElement !== mount) {
    fresh = true;
    host?.remove();
    host = document.createElement('div');
    host.className = 'libregaku-flash';
    const root = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    // Seen in the pill; heard from a region beside it.
    msg = document.createElement('div');
    msg.className = 'msg';
    msg.setAttribute('aria-hidden', 'true');
    said = document.createElement('div');
    said.className = 'said';
    said.setAttribute('role', 'status');
    root.append(style, msg, said);
    mount.appendChild(host);
  }
  // In the interface's language, which may have changed since the last.
  host.lang = uiLocale();
  host.dir = uiDirection();
  // A custom property, because the host's position is pinned with !important.
  host.style.setProperty('--lg-inset', `${inset}px`);
  const el = msg;
  const region = said;
  if (!el || !region) return;
  el.textContent = text;
  el.classList.add('on');

  // A screen reader announces a change to a region it already knows, not a
  // region arriving with its words: a region made just now gets them a frame
  // later, and so does any message after it within that frame.
  const waiting = frame !== 0;
  cancelAnimationFrame(frame);
  frame = 0;
  const speak = (): void => {
    frame = 0;
    region.textContent = text;
  };
  if (fresh || waiting) frame = requestAnimationFrame(speak);
  else speak();

  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    el.classList.remove('on');
    // Its words go once it has faded, rather than staying for a screen reader to come across later.
    timer = window.setTimeout(() => {
      el.textContent = '';
      region.textContent = '';
    }, FADE_MS);
  }, ms);
}

export function clearFlash(): void {
  window.clearTimeout(timer);
  cancelAnimationFrame(frame);
  frame = 0;
  host?.remove();
  host = null;
  msg = null;
  said = null;
}
