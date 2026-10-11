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
  .tip.on { opacity: 1; }
  .tip kbd {
    font: 600 11px/1 ui-monospace, monospace; padding: 2px 5px; border-radius: 4px;
    background: #12172A; color: #E8ECF6;
  }
  @media (prefers-reduced-motion: reduce) { .tip { transition: none; } }
`;

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
  let timer = 0;
  let lastShown = 0;

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
    window.clearTimeout(timer);
    timer = window.setTimeout(() => place(b), Date.now() - lastShown < 600 ? 0 : 350);
  };
  const hide = (): void => {
    window.clearTimeout(timer);
    if (tip.classList.contains('on')) lastShown = Date.now();
    tip.classList.remove('on');
  };
  const target = (e: Event): HTMLElement | null =>
    (e.target as Element | null)?.closest?.<HTMLElement>('[data-tip]') ?? null;

  root.addEventListener('pointerover', (e) => {
    const b = target(e);
    if (b) show(b);
  });
  root.addEventListener('pointerout', (e) => {
    const from = target(e);
    const to = ((e as PointerEvent).relatedTarget as Element | null)?.closest?.('[data-tip]') ?? null;
    if (from && from !== to) hide();
  });
  root.addEventListener('focusin', (e) => {
    const b = target(e);
    if (b) show(b);
  });
  root.addEventListener('focusout', hide);
  root.addEventListener('click', hide);
  // A tip left behind by a list scrolling under it would label the wrong row.
  root.addEventListener('scroll', hide, true);
}
