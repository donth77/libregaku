import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearFlash, flash } from '../flash';

/**
 * The word or two a key leaves over the player. A screen reader hears a
 * change to a live region it already knows, not a region that arrives with
 * its words, so the first message of all used to go unheard.
 */

function player(): HTMLElement {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  return mount;
}

const parts = (mount: HTMLElement): { pill: HTMLElement; region: HTMLElement; style: string } => {
  const root = mount.querySelector('.libregaku-flash')!.shadowRoot!;
  return {
    pill: root.querySelector<HTMLElement>('.msg')!,
    region: root.querySelector<HTMLElement>('[role=status]')!,
    style: root.querySelector('style')!.textContent ?? '',
  };
};

afterEach(() => {
  clearFlash();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('flash', () => {
  it('shows the words at once, and gives them to a screen reader once its region is there', async () => {
    vi.useFakeTimers();
    const mount = player();
    flash(mount, 'Translation off');
    const { pill, region } = parts(mount);
    expect(pill.textContent).toBe('Translation off');
    expect(pill.classList.contains('on')).toBe(true);
    // Seen in the pill, heard from the region: never both.
    expect(pill.getAttribute('aria-hidden')).toBe('true');
    expect(region.textContent).toBe('');
    await vi.advanceTimersByTimeAsync(16);
    expect(region.textContent).toBe('Translation off');
    // The region known, the next message goes straight in.
    flash(mount, 'Translation on');
    expect(region.textContent).toBe('Translation on');
  });

  it('gives the region the latest words when two come within its first frame', async () => {
    vi.useFakeTimers();
    const mount = player();
    flash(mount, 'Furigana: all');
    flash(mount, 'Translation off');
    const { region } = parts(mount);
    expect(region.textContent).toBe('');
    await vi.advanceTimersByTimeAsync(16);
    expect(region.textContent).toBe('Translation off');
  });

  it('takes its words away once it has faded, rather than leaving them to be found later', async () => {
    vi.useFakeTimers();
    const mount = player();
    flash(mount, 'Look a word up first', 1500);
    await vi.advanceTimersByTimeAsync(16);
    const { pill, region } = parts(mount);
    await vi.advanceTimersByTimeAsync(1500);
    expect(pill.classList.contains('on')).toBe(false);
    expect(pill.textContent).toBe('Look a word up first');   // still there while it fades
    await vi.advanceTimersByTimeAsync(200);
    expect(pill.textContent).toBe('');
    expect(region.textContent).toBe('');
  });

  it('wraps a long message instead of cutting it short', () => {
    const mount = player();
    flash(mount, 'Anki is closed, and the browser would not keep the card for later');
    const { style } = parts(mount);
    expect(style).toMatch(/\.msg \{[^}]*white-space: normal/);
    expect(style).not.toContain('text-overflow: ellipsis');
  });
});
