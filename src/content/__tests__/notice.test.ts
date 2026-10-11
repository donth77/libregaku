import { afterEach, describe, expect, it } from 'vitest';
import { clearNotice, showNotice } from '../notice';

/**
 * A notice says why subtitles stopped, or what the video lacks. Its message
 * is what a screen reader is told — not the Dismiss button beside it — and
 * the message goes into its region after the region is there, or it is not
 * read out at all.
 */

const frame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

afterEach(() => {
  clearNotice();
  document.body.replaceChildren();
});

function show(): ShadowRoot {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  showNotice(mount, 'no-target-track', 'This video has subtitles in English and French.');
  return mount.querySelector('.libregaku-notice')!.shadowRoot!;
}

describe('a notice', () => {
  it('announces its message, and only its message', async () => {
    const root = show();
    const region = root.querySelector<HTMLElement>('[role=status]')!;
    expect(root.querySelectorAll('[role=status], [role=alert]')).toHaveLength(1);
    expect(root.querySelector('.card')!.hasAttribute('role')).toBe(false);
    await frame();
    expect(region.querySelector('.title')?.textContent).toBe('No subtitles here in the language you are learning.');
    expect(region.querySelector('.detail')?.textContent).toBe('This video has subtitles in English and French.');
    // Dismiss, and the id for a bug report, are there to read but not announced.
    expect(region.contains(root.querySelector('button'))).toBe(false);
    expect(root.querySelector('.id')?.textContent).toBe('no-target-track');
    expect(region.contains(root.querySelector('.id'))).toBe(false);
  });

  it('puts its words in a frame after the region, so they are heard', async () => {
    const root = show();
    const region = root.querySelector<HTMLElement>('[role=status]')!;
    expect(region.textContent).toBe('');
    await frame();
    expect(region.textContent).toContain('No subtitles here');
  });

  it('marks the side its text starts on, and gives Dismiss room to be hit', () => {
    const style = show().querySelector('style')!.textContent ?? '';
    expect(style).toContain('border-inline-start: 3px solid');
    expect(style).not.toContain('border-left');
    expect(style).toMatch(/button \{[^}]*min-height: 24px/);
  });
});
