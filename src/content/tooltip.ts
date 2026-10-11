/**
 * Labels for icon buttons, shown over each on hover or keyboard focus.
 *
 * An icon is a guess until it says what it does. The browser's own title
 * tooltip takes over a second to appear, which over a playing video reads as
 * no tooltip at all. These come after a short pause, at once when moving from
 * one button to the next, and name the button's key.
 *
 * Anything inside `root` with `data-tip` gets one, and `data-key` adds its
 * key. A control with a tip has no `title` as well: two tooltips for one
 * button is one too many.
 *
 * A tip stays while the pointer is on it, goes a moment after the pointer
 * leaves both it and its control, and goes at once on Escape (WCAG 1.4.13).
 */

/** The tip's look. Each shadow root that calls tooltips() includes it. */
export const TIP_STYLE = `
  .tip {
    position: absolute; z-index: 3; pointer-events: none;
    display: flex; align-items: center; gap: 7px;
    padding: 5px 9px; border-radius: 6px;
    background: #E8ECF6; color: #12172A; white-space: nowrap;
    font: 600 12px/1.25 system-ui, -apple-system, sans-serif;
    letter-spacing: normal; text-transform: none;
    box-shadow: 0 6px 18px -6px rgba(0,0,0,.65);
    opacity: 0; transition: opacity .1s ease-out;
  }
  /* Showing, it can be pointed at, and stays while it is. */
  .tip.on { opacity: 1; pointer-events: auto; }
  .tip kbd {
    font: 600 11px/1 ui-monospace, monospace; padding: 2px 5px; border-radius: 4px;
    background: #12172A; color: #E8ECF6;
  }
  @media (prefers-reduced-motion: reduce) { .tip { transition: none; } }
`;

/** How long a tip stays once the pointer has left its control: long enough to reach the tip itself. */
const LINGER_MS = 300;

/** Every tip showing or about to, each by how to put it away: Escape puts them all away. */
const putAway = new Set<() => void>();
let escapeHeard = false;

/** One listener for every tip, on the page: the focus may be anywhere while the pointer rests on a control. */
function hearEscape(): void {
  if (escapeHeard) return;
  escapeHeard = true;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') for (const hide of Array.from(putAway)) hide();
  }, true);
}

/**
 * Give the controls in `root` their tips. The tip is drawn in `root` and kept
 * inside `bounds` — above the control when there is room there, below when
 * not, as along the top edge of a player.
 */
export function tooltips(root: HTMLElement | ShadowRoot, bounds: () => DOMRect): void {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  tip.setAttribute('aria-hidden', 'true');   // the controls' own labels are what is read out
  root.appendChild(tip);
  hearEscape();
  let timer = 0;
  /** Until a tip the pointer has left goes. */
  let leaving = 0;
  let lastShown = 0;
  /** The control the tip is showing for, or is about to. */
  let current: HTMLElement | null = null;

  const place = (b: HTMLElement): void => {
    if (!b.isConnected || !b.dataset.tip) return;
    tip.replaceChildren(b.dataset.tip);
    if (b.dataset.key) {
      const k = document.createElement('kbd');
      k.textContent = b.dataset.key;
      tip.appendChild(k);
    }
    // Where the tip's own origin is on screen, whatever is positioned or
    // transformed above it — so the same arithmetic serves a card, a bar
    // that slides in, and a panel whose host has no width at all.
    tip.style.left = '0px';
    tip.style.top = '0px';
    const origin = tip.getBoundingClientRect();
    const area = bounds();
    const r = b.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const x = Math.max(area.left + 8, Math.min(r.left + r.width / 2 - w / 2, area.right - w - 8));
    const above = r.top - h - 6;
    const y = above >= area.top + 4 ? above : r.bottom + 6;
    tip.style.left = `${Math.round(x - origin.left)}px`;
    tip.style.top = `${Math.round(y - origin.top)}px`;
    tip.classList.add('on');
  };
  const show = (b: HTMLElement): void => {
    window.clearTimeout(leaving);
    if (b === current) return;   // showing for it already, or about to
    window.clearTimeout(timer);
    current = b;
    putAway.add(hide);
    // At once when moving from one control to the next, and after a pause otherwise.
    const moving = tip.classList.contains('on') || Date.now() - lastShown < 600;
    timer = window.setTimeout(() => place(b), moving ? 0 : 350);
  };
  function hide(): void {
    window.clearTimeout(timer);
    window.clearTimeout(leaving);
    if (tip.classList.contains('on')) lastShown = Date.now();
    tip.classList.remove('on');
    current = null;
    putAway.delete(hide);
  }
  /** The pointer has gone: the tip goes too, unless the pointer reaches it or comes back first. */
  const hideSoon = (): void => {
    // One not shown yet has nothing to stay for, and never will be.
    if (!tip.classList.contains('on')) {
      hide();
      return;
    }
    window.clearTimeout(leaving);
    leaving = window.setTimeout(hide, LINGER_MS);
  };
  const target = (e: Event): HTMLElement | null =>
    (e.target as Element | null)?.closest?.<HTMLElement>('[data-tip]') ?? null;
  const onTip = (n: EventTarget | null): boolean => n instanceof Node && tip.contains(n);

  root.addEventListener('pointerover', (e) => {
    if (onTip(e.target)) {
      window.clearTimeout(leaving);
      return;
    }
    const b = target(e);
    if (b) show(b);
  });
  root.addEventListener('pointerout', (e) => {
    const to = (e as PointerEvent).relatedTarget as Node | null;
    // Onto the tip, or still within the control it is for: it stays.
    if (onTip(to) || (current && to && current.contains(to))) return;
    if (onTip(e.target) || target(e)) hideSoon();
  });
  root.addEventListener('focusin', (e) => {
    const b = target(e);
    if (b) show(b);
  });
  // The tip for the control losing the focus; one the pointer is resting on stays.
  root.addEventListener('focusout', (e) => {
    if (target(e) === current) hide();
  });
  root.addEventListener('click', hide);
  // A tip left behind by a list scrolling under it would label the wrong row.
  root.addEventListener('scroll', hide, true);
}
