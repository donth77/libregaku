import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The bar's switches all write settings; what is worth pinning is the one
 * that hides the bar itself, which used to set an inline display the host's
 * own stylesheet overrode.
 */

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
});

import { Header } from '../header';
import { setSetting } from '../../settings';

function build(): { header: Header; host: HTMLElement } {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const header = new Header(mount, {
    stats: () => ({ known: 87, unknown: 14, i1: 3 }),
    sidebarOpen: () => false,
    inset: () => 0,
    onToggleSidebar: () => {},
    onOpenSettings: () => {},
  });
  return { header, host: mount.querySelector('#libregaku-header')! };
}

beforeEach(async () => {
  document.body.replaceChildren();
  await setSetting('headerBar', true);
  await setSetting('headerPinned', false);
});

describe('Header', () => {
  it('hides through a host class its own stylesheet honours', async () => {
    const { header, host } = build();
    expect(host.classList.contains('off')).toBe(false);
    await setSetting('headerBar', false);
    header.update();
    expect(host.classList.contains('off')).toBe(true);
    expect(host.shadowRoot!.querySelector('.bar')!.classList.contains('show')).toBe(false);
    await setSetting('headerBar', true);
    header.update();
    expect(host.classList.contains('off')).toBe(false);
  });

  it('names the keys for its switches in their tooltips', async () => {
    await setSetting('ruby', 'unknown');
    await setSetting('blurPrimary', false);
    await setSetting('dualSubtitles', true);
    const { host } = build();
    const tips = Array.from(host.shadowRoot!.querySelectorAll<HTMLElement>('button[aria-keyshortcuts]'))
      .map((b) => [b.getAttribute('aria-keyshortcuts'), b.dataset.tip, b.dataset.key, b.getAttribute('aria-label')]);
    expect(tips).toEqual([
      ['R', 'Furigana: new words', 'R', 'Furigana: new words'],
      ['H', 'Blur subtitle', 'H', 'Blur subtitle'],
      ['ArrowUp', 'Hide translation', '↑', 'Hide translation'],
      ['S', 'Transcript', 'S', 'Transcript'],
    ]);
  });

  it('labels every button with its own tooltip, quickly, and never the browser\'s slow one', async () => {
    vi.useFakeTimers();
    try {
      const { host } = build();
      const root = host.shadowRoot!;
      expect(root.querySelector('[title]')).toBeNull();
      for (const b of Array.from(root.querySelectorAll<HTMLElement>('button'))) expect(b.dataset.tip).toBeTruthy();
      const settingsButton = root.querySelector<HTMLElement>('button[aria-label="Settings"]')!;
      settingsButton.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(400);
      const tip = root.querySelector<HTMLElement>('.tip')!;
      expect(tip.classList.contains('on')).toBe(true);
      expect(tip.textContent).toBe('Settings');
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the language's flag, or its code when settings ask", async () => {
    await setSetting('languageBadge', 'flag');
    let badge = build().host.shadowRoot!.querySelector<HTMLElement>('.badge')!;
    expect(badge.textContent).toBe('🇯🇵');
    expect(badge.getAttribute('aria-label')).toBe('Japanese');
    document.body.replaceChildren();
    await setSetting('languageBadge', 'code');
    badge = build().host.shadowRoot!.querySelector<HTMLElement>('.badge')!;
    expect(badge.textContent).toBe('ja');
    await setSetting('languageBadge', 'flag');
  });

  it('shows the flag picked for the language being learned, and no other language\'s', async () => {
    await setSetting('languageBadge', 'flag');
    await setSetting('badgeFlag', { es: '🇲🇽', ar: '🇪🇬' });
    const badge = (): HTMLElement => {
      document.body.replaceChildren();
      return build().host.shadowRoot!.querySelector<HTMLElement>('.badge')!;
    };
    try {
      await setSetting('target', 'es');
      expect(badge().textContent).toBe('🇲🇽');
      await setSetting('target', 'ja');
      expect(badge().textContent).toBe('🇯🇵');
      // Arabic's own is the Arab League's flag, a picture, shown only while none is picked for it.
      await setSetting('target', 'ar');
      let arabic = badge();
      expect(arabic.textContent).toBe('🇪🇬');
      expect(arabic.querySelector('svg')).toBeNull();
      await setSetting('badgeFlag', { es: '🇲🇽' });
      arabic = badge();
      expect(arabic.querySelector('svg')).not.toBeNull();
    } finally {
      await setSetting('badgeFlag', {});
      await setSetting('target', 'ja');
    }
  });

  it('keeps furigana to a language with readings, and draws which of the three it is on', async () => {
    await setSetting('ruby', 'always');
    let ruby = build().host.shadowRoot!.querySelector<HTMLElement>('button[aria-keyshortcuts="R"]')!;
    expect(ruby.hidden).toBe(false);
    expect(ruby.querySelectorAll('svg path')).toHaveLength(6);   // a reading over both words
    document.body.replaceChildren();
    await setSetting('target', 'es');
    try {
      ruby = build().host.shadowRoot!.querySelector<HTMLElement>('button[aria-keyshortcuts="R"]')!;
      expect(ruby.hidden).toBe(true);
    } finally {
      await setSetting('target', 'ja');
      await setSetting('ruby', 'unknown');
    }
  });

  it('keeps to the video: lists open from the panel, not from here', () => {
    const { host } = build();
    const labels = Array.from(host.shadowRoot!.querySelectorAll('.right button')).map((b) => b.getAttribute('aria-label'));
    expect(labels.some((l) => /saved/i.test(l ?? ''))).toBe(false);
    expect(labels).toContain('Transcript');
  });

  it('names the numbers the way the panel does', () => {
    const { host } = build();
    const left = host.shadowRoot!.querySelector('.left')!.textContent!.replace(/\s+/g, ' ');
    expect(left).toContain('87% known');
    expect(left).toContain('3 ready to learn');
  });

  // A switch that kept focus after a click took the next Space for itself:
  // furigana flipped again instead of the video pausing.
  it('never lets a clicked button keep focus', () => {
    const { host } = build();
    const down = (el: Element): boolean => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    };
    const root = host.shadowRoot!;
    expect(down(root.querySelector('.right button svg')!)).toBe(true);
    expect(down(root.querySelector('.tab')!)).toBe(true);
    expect(down(root.querySelector('.left')!)).toBe(false);
  });
});
