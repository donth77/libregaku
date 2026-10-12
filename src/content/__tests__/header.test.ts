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

const DEPS = {
  stats: () => ({ known: 87, unknown: 14, i1: 3 }),
  sidebarOpen: () => false,
  inset: () => 0,
  onToggleSidebar: () => {},
  onOpenSettings: () => {},
};

function build(): { header: Header; host: HTMLElement } {
  const mount = document.createElement('div');
  document.body.appendChild(mount);
  const header = new Header(mount, DEPS);
  return { header, host: mount.querySelector('#libregaku-header')! };
}

const shown = (host: HTMLElement): boolean => host.shadowRoot!.querySelector('.bar')!.classList.contains('show');

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
      ['ArrowUp', 'Hide translation', '↑', 'Subtitles'],
      ['S', 'Transcript', 'S', 'Transcript'],
    ]);
  });

  // A name that flipped with the switch read "Hide translation, pressed".
  it('keeps each switch\'s name as it is pressed, and says what a click will do in its tooltip', async () => {
    await setSetting('blurPrimary', false);
    await setSetting('dualSubtitles', false);
    const { header, host } = build();
    const state = (name: string): Array<string | null | undefined> => {
      const b = host.shadowRoot!.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;
      return [b.getAttribute('aria-pressed'), b.dataset.tip, String(b.classList.contains('on'))];
    };
    try {
      expect(state('Blur subtitle')).toEqual(['false', 'Blur subtitle', 'false']);
      // Subtitles without their translation: one press from the subtitles off.
      expect(state('Subtitles')).toEqual(['true', 'Hide subtitles', 'true']);
      expect(state('Pin header')).toEqual(['false', 'Pin header', 'false']);
      await setSetting('blurPrimary', true);
      await setSetting('dualSubtitles', true);
      await setSetting('headerPinned', true);
      header.update();
      expect(state('Blur subtitle')).toEqual(['true', 'Unblur subtitle', 'true']);
      expect(state('Subtitles')).toEqual(['true', 'Hide translation', 'true']);
      // Neither: the button says what brings them back.
      await setSetting('showSubtitles', false);
      header.update();
      expect(state('Subtitles')).toEqual(['false', 'Show subtitles', 'false']);
      expect(state('Pin header')).toEqual(['true', 'Unpin header', 'true']);
      // On is drawn as more than a lighter colour.
      expect(host.shadowRoot!.querySelector('style')!.textContent).toMatch(/button\.on::after \{[^}]*border-top: 2px solid/);
    } finally {
      await setSetting('blurPrimary', false);
      await setSetting('dualSubtitles', true);
      await setSetting('showSubtitles', true);
    }
  });

  it('names Alt and Shift with its letter keys while single-key shortcuts are off', async () => {
    await setSetting('singleKeys', false);
    try {
      const keys = Array.from(build().host.shadowRoot!.querySelectorAll<HTMLElement>('button[aria-keyshortcuts]'))
        .map((b) => [b.getAttribute('aria-keyshortcuts'), b.dataset.key]);
      expect(keys).toEqual([
        ['Alt+Shift+R', 'Alt+Shift+R'], ['Alt+Shift+H', 'Alt+Shift+H'], ['ArrowUp', '↑'], ['Alt+Shift+S', 'Alt+Shift+S'],
      ]);
    } finally {
      await setSetting('singleKeys', true);
    }
  });

  it('names the pull tab as its tooltip reads, and makes it big enough to hit', () => {
    const { host } = build();
    const tab = host.shadowRoot!.querySelector<HTMLElement>('.tab')!;
    expect(tab.getAttribute('aria-label')).toBe('Show header');
    expect(tab.dataset.tip).toBe('Show header');
    expect(host.shadowRoot!.querySelector('style')!.textContent).toMatch(/\.tab \{[^}]*height: 24px/);
  });

  it('comes first of what is ours in the player, so it is first in Tab order too', () => {
    const mount = document.createElement('div');
    const video = document.createElement('video');
    const overlay = document.createElement('div');
    overlay.className = 'libregaku-root';
    const panel = document.createElement('div');
    panel.className = 'libregaku-sidebar';
    mount.append(video, overlay, panel);
    document.body.appendChild(mount);
    new Header(mount, DEPS);
    expect(Array.from(mount.children).map((el) => el.id || el.className || el.tagName))
      .toEqual(['VIDEO', 'libregaku-header', 'libregaku-root', 'libregaku-sidebar']);
  });

  it('comes down while the focus is in it, and goes when the focus leaves', () => {
    const { host } = build();
    const root = host.shadowRoot!;
    expect(shown(host)).toBe(false);
    const gear = root.querySelector<HTMLButtonElement>('button[aria-label="Settings"]')!;
    gear.focus();
    expect(shown(host)).toBe(true);
    // The pointer leaving the player does not take it from under the focus.
    host.parentElement!.dispatchEvent(new MouseEvent('mouseleave'));
    expect(shown(host)).toBe(true);
    // Nor does moving the focus along it.
    root.querySelector<HTMLButtonElement>('button[aria-label="Pin header"]')!.focus();
    expect(shown(host)).toBe(true);
    (root.activeElement as HTMLElement).blur();
    expect(shown(host)).toBe(false);
  });

  it('stays down when pinned, wherever the focus goes', async () => {
    await setSetting('headerPinned', true);
    const { host } = build();
    const gear = host.shadowRoot!.querySelector<HTMLButtonElement>('button[aria-label="Settings"]')!;
    gear.focus();
    gear.blur();
    expect(shown(host)).toBe(true);
  });

  it('moves the focus from the pull tab into the bar it brings down', () => {
    const { host } = build();
    const root = host.shadowRoot!;
    const tab = root.querySelector<HTMLButtonElement>('.tab')!;
    tab.focus();
    // The tab is what shows while the bar is away: the focus on it brings nothing down.
    expect(shown(host)).toBe(false);
    tab.click();
    expect(shown(host)).toBe(true);
    expect(tab.hidden).toBe(true);
    expect(root.activeElement?.closest('.bar')).not.toBeNull();
  });

  it('reads out what each number counts, which otherwise shows only on hover', () => {
    const stats = Array.from(build().host.shadowRoot!.querySelectorAll<HTMLElement>('.stat'));
    expect(stats.map((s) => s.dataset.tip)).toEqual(['Words you know', 'Lines with one new word']);
    expect(stats.map((s) => s.querySelector('.vh')?.textContent?.trim())).toEqual(['(Words you know)', '(Lines with one new word)']);
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
      // hidden alone does nothing where the button's own display beats it.
      const css = Array.from(build().host.shadowRoot!.querySelectorAll('style')).map((s) => s.textContent).join('');
      expect(css).toMatch(/button\[hidden\]\s*\{\s*display:\s*none/);
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
