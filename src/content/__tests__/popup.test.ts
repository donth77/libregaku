import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The lookup card has to fit in whatever player it opens over — at YouTube's
 * default size that is 640×360 — without covering the word it describes or
 * losing its status row, and it has to say when it goes away, because
 * whoever paused the video for it is waiting to hear.
 */

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: { sendMessage: async () => ({}) },
});

import {
  closePopup, closePopupSoon, draftFor, placeCard, popupIsOpen, pressAdd, showPopup, type Box,
} from '../popup';
import type { LookupResult } from '../../dict/client';

const box = (left: number, top: number, width: number, height: number): Box =>
  ({ left, top, width, height, bottom: top + height });

const RESULT: LookupResult = {
  state: 'ok',
  entries: [{
    id: '1', word: '勉強', reading: 'べんきょう', common: true,
    senses: [{ pos: ['n'], glosses: ['study'] }, { pos: ['n'], glosses: ['diligence'] }],
  }],
};

function open(over: Partial<Parameters<typeof showPopup>[3]> = {}, surface = '勉強'): ShadowRoot {
  const mount = document.createElement('div');
  const anchor = document.createElement('span');
  mount.appendChild(anchor);
  document.body.appendChild(mount);
  showPopup(mount, anchor, RESULT, {
    token: { surface, start: surface.length, end: surface.length * 2 },
    sentence: '毎日勉強する',
    status: 'unknown',
    onMark: () => {},
    onAddCard: async () => 'added to Mining',
    ...over,
  });
  return document.querySelector('.libregaku-popup')!.shadowRoot!;
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  closePopup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('placing the card', () => {
  const player = box(0, 0, 854, 480);

  it('sits above the word when it fits there', () => {
    const p = placeCard(player, box(400, 380, 40, 30), { width: 400, height: 300 });
    expect(p.side).toBe('above');
    expect(p.top + 300).toBe(380 - 10);
    expect(p.left).toBe(400 + 20 - 200);
  });

  it('goes below when only below has the room', () => {
    const p = placeCard(player, box(400, 40, 40, 30), { width: 400, height: 300 });
    expect(p.side).toBe('below');
    expect(p.top).toBe(40 + 30 + 10);
  });

  it('caps itself to the roomier side rather than covering the word', () => {
    // YouTube's default player, subtitle near the bottom, a long entry.
    const word = box(300, 290, 40, 30);
    const p = placeCard(box(0, 0, 640, 360), word, { width: 400, height: 520 });
    expect(p.side).toBe('above');
    expect(p.top).toBe(8);
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(word.top - 10);
  });

  it('covers the word only when neither side can hold a usable card', () => {
    const p = placeCard(box(0, 0, 400, 225), box(180, 170, 40, 25), { width: 384, height: 520 });
    expect(p.side).toBe('over');
    expect(p.maxHeight).toBe(225 - 16);
    expect(p.top).toBe(8);
  });

  it('stays inside the player at either edge', () => {
    expect(placeCard(player, box(0, 380, 30, 30), { width: 400, height: 200 }).left).toBe(8);
    expect(placeCard(player, box(830, 380, 20, 30), { width: 400, height: 200 }).left).toBe(854 - 400 - 8);
  });

  it('applies the cap to the card, so its senses scroll and its buttons stay', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return (this.tagName === 'SPAN' ? box(300, 290, 40, 30) : box(0, 0, 640, 360)) as DOMRect;
    });
    const root = open();
    const card = root.querySelector<HTMLElement>('.card')!;
    const host = root.host as HTMLElement;
    expect(card.dataset.side).toBe('above');
    expect(card.style.maxHeight).toBe(`${290 - 10 - 8}px`);
    expect(host.style.top).toBe('8px');
    // The status row is outside the scrolling body, so a cap never hides it.
    expect(card.querySelector('.body .marks')).toBeNull();
    expect(card.querySelector(':scope > .marks')).not.toBeNull();
    expect(card.querySelector('.body ol')).not.toBeNull();
  });
});

describe('closing the card', () => {
  it('says it closed, once', () => {
    const onClose = vi.fn();
    open({ onClose });
    closePopup();
    closePopup();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith('closed');
    expect(popupIsOpen()).toBe(false);
  });

  it('says it was replaced when another word opens a card', () => {
    const first = vi.fn();
    const second = vi.fn();
    open({ onClose: first }, '勉強');
    open({ onClose: second }, '食べる');
    expect(first).toHaveBeenCalledWith('replaced');
    expect(second).not.toHaveBeenCalled();
  });

  it('says it closed when the cursor left and did not come back', async () => {
    const onClose = vi.fn();
    open({ onClose });
    closePopupSoon(5);
    await new Promise((r) => setTimeout(r, 20));
    expect(onClose).toHaveBeenCalledWith('closed');
  });

  it('says it closed when a status is chosen', () => {
    const onClose = vi.fn();
    const root = open({ onClose });
    root.querySelector<HTMLButtonElement>('.mk.known')!.click();
    expect(onClose).toHaveBeenCalledWith('closed');
  });
});

describe('the card\'s controls', () => {
  it('claims a card exists only when the caller says Anki has one', () => {
    let root = open({ status: 'known' });
    let add = root.querySelector<HTMLButtonElement>('.tb.add')!;
    expect(add.getAttribute('aria-label')).toBe('Add to Anki');
    expect(add.classList.contains('has')).toBe(false);
    closePopup();

    root = open({ hasCard: true });
    add = root.querySelector<HTMLButtonElement>('.tb.add')!;
    expect(add.getAttribute('aria-label')).toBe('Already in Anki — add another');
    expect(add.classList.contains('has')).toBe(true);
  });

  it('says when a copy fails instead of failing silently', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });
    const root = open();
    root.querySelector<HTMLButtonElement>('.tb[aria-label="Copy word"]')!.click();
    await flush();
    expect(root.querySelector('.toast')?.textContent).toBe('could not copy — select the text instead');

    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    root.querySelector<HTMLButtonElement>('.tb[aria-label="Copy sentence"]')!.click();
    await flush();
    expect(root.querySelector('.toast')?.textContent).toBe('sentence copied');
  });

  it('never lets a clicked button keep focus, and names itself', () => {
    const root = open();
    const down = (el: Element): boolean => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(down(root.querySelector('.tb.add svg')!)).toBe(true);
    expect(down(root.querySelector('.mk.known')!)).toBe(true);
    expect(down(root.querySelector('.body li')!)).toBe(false);
    expect(root.querySelector('.card')?.getAttribute('aria-label')).toBe('勉強 — dictionary');
  });
});

describe('adding from the card', () => {
  it("drafts the dictionary's headword and reading, or the word as said when there is no entry", () => {
    const said = { surface: '勉強して', lemma: '勉強する', reading: 'ベンキョウシテ', start: 0, end: 4 };
    expect(draftFor(RESULT, said, '毎日勉強して')).toEqual({
      expression: '勉強', reading: 'べんきょう', meaning: 'study; diligence', sentence: '毎日勉強して',
    });
    expect(draftFor({ state: 'empty' } as LookupResult, said, 'x')).toEqual({
      expression: '勉強する', reading: 'ベンキョウシテ', meaning: '', sentence: 'x',
    });
  });

  it('is what the A key presses, when a card is open', async () => {
    expect(pressAdd()).toBe(false);
    const onAddCard = vi.fn(async () => 'added to Mining');
    const card = open({ onAddCard });
    expect(pressAdd()).toBe(true);
    await flush();
    expect(onAddCard).toHaveBeenCalledWith(expect.objectContaining({ expression: '勉強', reading: 'べんきょう' }));
    expect(card.querySelector('.toast')?.textContent).toBe('added to Mining');
  });

  it('adds one card however many times it is pressed while adding', async () => {
    let finish!: (msg: string) => void;
    const onAddCard = vi.fn(() => new Promise<string>((r) => { finish = r; }));
    open({ onAddCard });
    pressAdd();
    pressAdd();
    finish('added to Mining');
    await flush();
    expect(onAddCard).toHaveBeenCalledOnce();
  });

  it('says a card is waiting for Anki rather than in it', () => {
    const card = open({ hasCard: true, queued: true });
    expect(card.querySelector('.tb.add')?.getAttribute('title')).toBe('Waiting for Anki to open — add another (A)');
  });

  it('names its keys in the tooltips, without changing what the buttons are called', () => {
    const card = open();
    const add = card.querySelector('.tb.add')!;
    expect(add.getAttribute('title')).toBe('Add to Anki (A)');
    expect(add.getAttribute('aria-label')).toBe('Add to Anki');
    expect(add.getAttribute('aria-keyshortcuts')).toBe('A');
    const known = card.querySelector('.mk.known')!;
    expect(known.getAttribute('title')).toBe('Known (K)');
    expect(known.getAttribute('aria-keyshortcuts')).toBe('K');
    expect(card.querySelector('.mk.track')?.hasAttribute('aria-keyshortcuts')).toBe(false);
  });
});
