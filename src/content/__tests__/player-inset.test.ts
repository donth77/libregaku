import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setUiLanguage } from '../../i18n';
import { PlayerInset } from '../player-inset';

/** A box where the page would have laid one out. */
function at(el: Element, left: number, top: number, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe(): void {} disconnect(): void {} });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setUiLanguage('en');
  document.body.innerHTML = '';
});

/**
 * A 1000×500 player whose picture fills it, and a 300px panel open over it.
 * The element moved: jsdom computes no transform for the container, so the
 * video itself is the one chosen to move.
 */
function player(): HTMLElement {
  const root = document.createElement('div');
  const stage = document.createElement('div');
  const video = document.createElement('video');
  stage.appendChild(video);
  root.appendChild(stage);
  document.body.appendChild(root);
  at(root, 0, 0, 1000, 500);
  at(stage, 0, 0, 1000, 500);
  at(video, 0, 0, 1000, 500);
  new PlayerInset(video, root, () => {}).set(300);
  return video;
}

describe('making room for the panel', () => {
  it('moves the picture left of a panel on the right', () => {
    expect(player().style.transform).toBe('translate(0px, 75px) scale(0.7)');
  });

  it('moves it right of the panel in a right-to-left interface, where the panel is on the left', () => {
    setUiLanguage('ar');
    expect(player().style.transform).toBe('translate(300px, 75px) scale(0.7)');
  });
});
