import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TIP_STYLE, tooltips } from '../tooltip';

/**
 * A tip that shows on hover has to stay while the pointer moves onto it, and
 * go on Escape without the pointer or the focus having to move (WCAG 1.4.13).
 */

const over = (el: Element, from: Element | null = null): boolean =>
  el.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, relatedTarget: from }));
const out = (el: Element, to: Element | null = null): boolean =>
  el.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: to }));

function setUp(): { button: HTMLButtonElement; other: HTMLButtonElement; tip: HTMLElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  const button = document.createElement('button');
  button.dataset.tip = 'Pronounce';
  const other = document.createElement('button');
  other.dataset.tip = 'Copy word';
  root.append(button, other);
  tooltips(root, () => host.getBoundingClientRect());
  return { button, other, tip: root.querySelector<HTMLElement>('.tip')! };
}

const on = (tip: HTMLElement): boolean => tip.classList.contains('on');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('a tooltip', () => {
  it('stays a moment after the pointer leaves, and while the pointer is on it', async () => {
    const { button, tip } = setUp();
    over(button);
    await vi.advanceTimersByTimeAsync(400);
    expect(on(tip)).toBe(true);
    // Across the gap between them, and onto the tip.
    out(button, null);
    await vi.advanceTimersByTimeAsync(150);
    expect(on(tip)).toBe(true);
    over(tip, null);
    await vi.advanceTimersByTimeAsync(1000);
    expect(on(tip)).toBe(true);
    // Back to its button, and it is still the same tip.
    out(tip, button);
    over(button, tip);
    await vi.advanceTimersByTimeAsync(1000);
    expect(on(tip)).toBe(true);
    expect(tip.textContent).toBe('Pronounce');
    // Off both, and it goes.
    out(button, null);
    await vi.advanceTimersByTimeAsync(300);
    expect(on(tip)).toBe(false);
  });

  it('can be pointed at only while it shows', () => {
    expect(TIP_STYLE).toMatch(/\.tip \{[^}]*pointer-events: none/);
    expect(TIP_STYLE).toMatch(/\.tip\.on \{[^}]*pointer-events: auto/);
  });

  it('never shows for a control the pointer only passed over', async () => {
    const { button, tip } = setUp();
    over(button);
    await vi.advanceTimersByTimeAsync(100);
    out(button, null);
    await vi.advanceTimersByTimeAsync(1000);
    expect(on(tip)).toBe(false);
  });

  it('goes on Escape, wherever the focus is', async () => {
    const { button, other, tip } = setUp();
    over(button);
    await vi.advanceTimersByTimeAsync(400);
    expect(on(tip)).toBe(true);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(on(tip)).toBe(false);
    // One about to show, too.
    over(other, button);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.advanceTimersByTimeAsync(1000);
    expect(on(tip)).toBe(false);
  });

  it('shows for keyboard focus, and goes with it', async () => {
    const { button, tip } = setUp();
    button.focus();
    await vi.advanceTimersByTimeAsync(400);
    expect(on(tip)).toBe(true);
    button.blur();
    expect(on(tip)).toBe(false);
  });
});
