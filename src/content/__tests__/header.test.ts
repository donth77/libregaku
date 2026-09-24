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
    savedCount: () => 0,
    sidebarOpen: () => false,
    inset: () => 0,
    onToggleSidebar: () => {},
    onOpenSettings: () => {},
    onShowSaved: () => {},
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

  it('names the numbers the way the panel does', () => {
    const { host } = build();
    const left = host.shadowRoot!.querySelector('.left')!.textContent!.replace(/\s+/g, ' ');
    expect(left).toContain('87% known');
    expect(left).toContain('3 ready to learn');
  });
});
