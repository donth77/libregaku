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
import { DEFAULTS, setSetting } from '../../settings';

const box = (left: number, top: number, width: number, height: number): Box =>
  ({ left, top, width, height, bottom: top + height });

/** The element with focus, inside whatever shadow roots it is in. */
const focused = (): Element | null => {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el;
};

const escape = (from: Element): boolean =>
  from.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }));

const RESULT: LookupResult = {
  state: 'ok',
  entries: [{
    id: '1', word: '勉強', reading: 'べんきょう', common: true,
    senses: [{ pos: ['n'], glosses: ['study'] }, { pos: ['n'], glosses: ['diligence'] }],
  }],
};

function open(over: Partial<Parameters<typeof showPopup>[3]> = {}, surface = '勉強', result = RESULT): ShadowRoot {
  const mount = document.createElement('div');
  const anchor = document.createElement('span');
  mount.appendChild(anchor);
  document.body.appendChild(mount);
  showPopup(mount, anchor, result, {
    token: { surface, start: surface.length, end: surface.length * 2 },
    sentence: '毎日勉強する',
    status: 'unknown',
    onMark: () => {},
    onAddCard: async () => 'added to Vocabulary',
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

  it('keeps clear of the whole subtitle, translation and all, when there is room', () => {
    // Two lines and a translation, low in a 480px player; the word is on the second line.
    const subtitle = box(100, 300, 650, 150);
    const line = box(100, 300, 650, 100);
    const word = box(400, 350, 40, 40);
    const p = placeCard(player, word, { width: 400, height: 260 }, [subtitle, line]);
    expect(p.side).toBe('above');
    expect(p.top + 260).toBeLessThanOrEqual(subtitle.top - 10);
  });

  it('gives up the translation before the line, and the line before the word', () => {
    const small = box(0, 0, 640, 400);
    const subtitle = box(40, 150, 560, 240);   // too little room either side of all of it
    const line = box(40, 280, 560, 90);        // 262px above the line itself
    const word = box(300, 320, 40, 40);
    const p = placeCard(small, word, { width: 400, height: 520 }, [subtitle, line]);
    // The card gives up the translation's clearance but keeps the line in view.
    expect(p.side).toBe('above');
    expect(p.top + p.maxHeight).toBeLessThanOrEqual(line.top - 10);

    // With the line as tall as the subtitle, the only clearance left is the word's.
    const tall = box(40, 150, 560, 240);
    const q = placeCard(small, word, { width: 400, height: 520 }, [subtitle, tall]);
    expect(q.side).toBe('above');
    expect(q.top + q.maxHeight).toBeLessThanOrEqual(word.top - 10);
    expect(q.top + q.maxHeight).toBeGreaterThan(tall.top);
  });

  it('grows upward when it sits above, and down when it sits below', () => {
    const word = (top: number) => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return (this.tagName === 'SPAN' ? box(300, top, 40, 30) : box(0, 0, 854, 480)) as DOMRect;
    });
    word(400);
    let host = open().host as HTMLElement;
    expect(host.style.top).toBe('');
    expect(host.style.bottom).toBe(`${480 - (400 - 10)}px`);
    closePopup();
    vi.restoreAllMocks();

    word(20);
    host = open().host as HTMLElement;
    expect(host.style.bottom).toBe('');
    expect(host.style.top).toBe(`${20 + 30 + 10}px`);
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
    // Hung from its bottom edge, 10px above the word, so growing never covers it.
    expect(host.style.bottom).toBe(`${360 - (290 - 10)}px`);
    expect(host.style.top).toBe('');
    // Add and the marks are outside the scrolling body, so a cap never hides them.
    expect(card.querySelector('.body .foot, .body .marks')).toBeNull();
    expect(card.querySelector(':scope > .foot button.add')).not.toBeNull();
    expect(card.querySelector(':scope > .head .marks')).not.toBeNull();
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

describe('focus', () => {
  /**
   * A word on a line drawn in a shadow root of its own, as the overlay draws
   * one, with the panel after it in the player.
   */
  function word(): { mount: HTMLElement; anchor: HTMLElement } {
    const mount = document.createElement('div');
    const line = document.createElement('div');
    mount.append(line, document.createElement('aside'));
    const anchor = document.createElement('span');
    anchor.tabIndex = 0;
    line.attachShadow({ mode: 'open' }).appendChild(anchor);
    document.body.appendChild(mount);
    return { mount, anchor };
  }
  const ctx: Parameters<typeof showPopup>[3] = {
    token: { surface: '勉強', start: 2, end: 4 },
    sentence: '毎日勉強する',
    status: 'unknown',
    onMark: () => {},
    onAddCard: async () => 'added',
  };
  const dialog = (): Element | null | undefined =>
    document.querySelector('.libregaku-popup')?.shadowRoot?.querySelector('[role=dialog]');

  it('goes into the card of a word that has it, clicked or pressed, and back to the word when the card goes', () => {
    const { mount, anchor } = word();
    anchor.focus();
    showPopup(mount, anchor, RESULT, ctx);
    // Right after the line in the page's order, not at the end of the player.
    expect(document.querySelector('.libregaku-popup')?.previousElementSibling).toBe((anchor.getRootNode() as ShadowRoot).host);
    expect(focused()).toBe(dialog());
    closePopup();
    expect(focused()).toBe(anchor);
  });

  it('stays where it is when the word does not have it: the card opened as the pointer rested on it', () => {
    const { mount, anchor } = word();
    const search = document.createElement('input');
    document.body.appendChild(search);
    search.focus();
    showPopup(mount, anchor, RESULT, ctx);
    expect(focused()).toBe(search);
    closePopup();
    expect(focused()).toBe(search);
  });

  it('goes into a card already open when its word is pressed', () => {
    const { mount, anchor } = word();
    showPopup(mount, anchor, RESULT, ctx);
    expect(focused()).not.toBe(dialog());
    anchor.focus();
    showPopup(mount, anchor, RESULT, ctx);
    expect(focused()).toBe(dialog());
  });

  it('is not taken back once it has left the card', () => {
    const { mount, anchor } = word();
    anchor.focus();
    showPopup(mount, anchor, RESULT, ctx);
    const search = document.createElement('input');
    document.body.appendChild(search);
    search.focus();
    closePopup();
    expect(focused()).toBe(search);
  });

  it('stays in the card when "more meanings" shows the rest and goes', () => {
    const many: LookupResult = {
      state: 'ok',
      entries: [{
        id: '2', word: '出来る', reading: 'できる', common: true,
        senses: Array.from({ length: 5 }, (_, i) => ({ pos: ['v1'], glosses: [`sense ${i + 1}`] })),
      }],
    };
    const { mount, anchor } = word();
    showPopup(mount, anchor, many, ctx);
    const more = dialog()!.querySelector<HTMLButtonElement>('.more-senses')!;
    more.focus();
    more.click();
    expect(focused()?.textContent).toBe('sense 4');
  });
});

describe('the status buttons', () => {
  it('wear the underline colours chosen in Settings', () => {
    const root = open({ colors: { '--lg-tracking': '#3366ff', '--lg-known': '#ffcc00' } });
    const host = root.host as HTMLElement;
    expect(host.style.getPropertyValue('--lg-tracking')).toBe('#3366ff');
    expect(host.style.getPropertyValue('--lg-known')).toBe('#ffcc00');
  });

  it('asks for a mark, and shows one already made filled in, beside the word', () => {
    let card = open();
    let track = card.querySelector<HTMLElement>('.head .marks .mk.track')!;
    expect(track.getAttribute('aria-label')).toBe('Track');
    expect(track.getAttribute('aria-pressed')).toBe('false');
    expect(track.dataset.tip).toBe('Track');
    closePopup();

    card = open({ status: 'tracking', marked: 'tracking' });
    track = card.querySelector<HTMLElement>('.mk.track')!;
    expect(track.getAttribute('aria-pressed')).toBe('true');
    expect(track.dataset.tip).toBe('Stop tracking');
    // Only the mark that is there.
    expect(card.querySelector('.mk.known')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('takes a mark off when pressed again, and puts one on otherwise', () => {
    const onMark = vi.fn();
    open({ status: 'tracking', marked: 'tracking', onMark }).querySelector<HTMLElement>('.mk.track')!.click();
    expect(onMark).toHaveBeenLastCalledWith('勉強', null);
    open({ status: 'tracking', marked: 'tracking', onMark }).querySelector<HTMLElement>('.mk.known')!.click();
    expect(onMark).toHaveBeenLastCalledWith('勉強', 'known');
  });

  it('shows no mark on a word Anki knows from its cards, since there is none to take off', () => {
    const known = open({ status: 'known', marked: null }).querySelector<HTMLElement>('.mk.known')!;
    expect(known.getAttribute('aria-pressed')).toBe('false');
    expect(known.dataset.tip).toBe('Mark known');
  });

  it('always offers Known, Track and Ignore: none of them is a setting', () => {
    const marks = Array.from(open().querySelectorAll('.marks .mk'));
    expect(marks.map((m) => m.getAttribute('aria-label'))).toEqual(['Known', 'Track', 'Ignore']);
  });
});

describe('the word a card is headed by', () => {
  const GAME: LookupResult = {
    state: 'ok',
    entries: [{ id: '2', word: 'ゲーム', common: true, senses: [{ pos: ['n'], glosses: ['game'] }] }],
  };
  // ゲームしましょう as the analyser hands it on: the word is the noun, the verb's own form beside it.
  const said = {
    surface: 'ゲームしましょう', lemma: 'ゲーム', usedAs: 'ゲームする', reading: 'ゲームシマショウ', lemmaReading: 'ゲーム',
    parts: ['ゲーム', 'し', 'ましょ', 'う'], inflections: ['polite', 'volitional'], start: 0, end: 8,
  };
  const reading = (card: ShadowRoot): string | undefined => card.querySelector('.hw .reading')?.textContent ?? undefined;

  it('has no reading from the form on the line: ゲーム, not ゲームシマショウ over it', () => {
    const card = open({ token: said, lang: 'ja' }, said.surface, GAME);
    expect(card.querySelector('.hw .word')?.textContent).toBe('ゲーム');
    expect(reading(card)).toBeUndefined();
  });

  it('shows what the form on the line is a form of, する and all, and marks the word in the title', () => {
    const onMark = vi.fn();
    const card = open({ token: said, lang: 'ja', onMark }, said.surface, GAME);
    expect(card.querySelector('.trace')?.textContent).toContain('ゲーム + し + ましょ + う  →  ゲームする');
    card.querySelector<HTMLElement>('.mk.known')!.click();
    expect(onMark).toHaveBeenLastCalledWith('ゲーム', 'known');
  });

  it('has no trace for a する verb in its dictionary form, which leads nowhere', () => {
    const plain = { surface: 'ゲームする', lemma: 'ゲーム', usedAs: 'ゲームする', reading: 'ゲームスル', parts: ['ゲーム', 'する'], start: 0, end: 5 };
    expect(open({ token: plain, lang: 'ja' }, plain.surface, GAME).querySelector('.trace')).toBeNull();
  });

  it("keeps the dictionary's reading of a word in kanji, whatever form the line has", () => {
    const studying = { surface: '勉強しています', lemma: '勉強', usedAs: '勉強する', reading: 'ベンキョウシテイマス', lemmaReading: 'ベンキョウ', start: 0, end: 7 };
    expect(reading(open({ token: studying, lang: 'ja' }, studying.surface))).toBe('べんきょう');
  });

  it('shows no reading that only repeats a word written in kana: する is not headed スル', () => {
    const suru: LookupResult = { state: 'ok', entries: [{ id: '3', word: 'する', common: true, senses: [{ pos: ['vs-i'], glosses: ['to do'] }] }] };
    const did = { surface: 'しました', lemma: 'する', reading: 'シマシタ', lemmaReading: 'スル', start: 0, end: 4 };
    expect(reading(open({ token: did, lang: 'ja' }, did.surface, suru))).toBeUndefined();
    closePopup();
    const does = { surface: 'する', lemma: 'する', reading: 'スル', lemmaReading: 'スル', start: 0, end: 2 };
    expect(reading(open({ token: does, lang: 'ja' }, does.surface, suru))).toBeUndefined();
  });

  it("falls back to the analyser's reading of the word itself where the dictionary has none", () => {
    const none = { state: 'empty' } as LookupResult;
    // A name no dictionary lists: as it was read on the line, which is the word.
    const name = { surface: '田中', lemma: '田中', reading: 'タナカ', start: 0, end: 2 };
    expect(reading(open({ token: name, lang: 'ja' }, name.surface, none))).toBe('タナカ');
    closePopup();
    // An inflected word with no entry: its dictionary form's reading, or none — never the line's.
    const ran = { surface: '走った', lemma: '走る', reading: 'ハシッタ', lemmaReading: 'ハシル', start: 0, end: 3 };
    expect(reading(open({ token: ran, lang: 'ja' }, ran.surface, none))).toBe('ハシル');
    closePopup();
    const { lemmaReading: _none, ...unread } = ran;
    expect(reading(open({ token: unread, lang: 'ja' }, unread.surface, none))).toBeUndefined();
    closePopup();
    // Letters read out are not the word again: ＣＤ, シーディー.
    const cd = { surface: 'CD', lemma: 'CD', reading: 'シーディー', start: 0, end: 2 };
    expect(reading(open({ token: cd, lang: 'ja' }, cd.surface, none))).toBe('シーディー');
  });

  it('keeps a reading in another script than the word: pinyin over a Chinese word', () => {
    const hello: LookupResult = { state: 'ok', entries: [{ id: '4', word: '你好', reading: 'nǐ hǎo', common: false, senses: [{ pos: [], glosses: ['hello'] }] }] };
    const token = { surface: '你好', lemma: '你好', reading: 'nǐ hǎo', lemmaReading: 'nǐ hǎo', start: 0, end: 2 };
    expect(reading(open({ token, lang: 'zh' }, token.surface, hello))).toBe('nǐ hǎo');
  });
});

describe('adding, and taking it back', () => {
  it('turns Add into Undo once the card is in, and takes it back out on a later press', async () => {
    vi.useFakeTimers();
    try {
      const undo = vi.fn(async () => 'taken back out of Vocabulary');
      const card = open({ onAddCard: async () => ({ said: 'added to Vocabulary', undo }) });
      const add = card.querySelector<HTMLButtonElement>('button.add')!;
      add.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(add.dataset.state).toBe('added');
      expect(add.textContent).toBe('Added');
      expect(add.dataset.tip).toBe('Undo');
      // Named by what it shows first, then by what pressing it does.
      expect(add.getAttribute('aria-label')).toBe('Added — undo');
      // A second press straight after is impatience, not Undo.
      add.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(undo).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      add.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(undo).toHaveBeenCalledOnce();
      expect(add.dataset.state).toBe('add');
      expect(add.getAttribute('aria-label')).toBe('Add to Anki');
      expect(card.querySelector('.toast')?.textContent).toBe('taken back out of Vocabulary');
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens a word Anki already has there, rather than adding it again', () => {
    const onShowInAnki = vi.fn();
    const onAddCard = vi.fn(async () => 'added');
    const card = open({ hasCard: true, onShowInAnki, onAddCard });
    card.querySelector<HTMLButtonElement>('button.add')!.click();
    expect(onShowInAnki).toHaveBeenCalledOnce();
    expect(onAddCard).not.toHaveBeenCalled();
    // The A key says where the card is instead.
    expect(pressAdd()).toBe(true);
    expect(onShowInAnki).toHaveBeenCalledOnce();
    expect(card.querySelector('.toast')?.textContent).toBe('Already in Anki');
  });

  it('offers Track on every card, pressed when the word is already tracked', () => {
    expect(open().querySelector('.mk.track')?.getAttribute('aria-pressed')).toBe('false');
    closePopup();
    expect(open({ marked: 'tracking' }).querySelector('.mk.track')?.getAttribute('aria-pressed')).toBe('true');
    closePopup();
    const card = open();
    expect(Array.from(card.querySelectorAll('.marks .mk')).map((b) => b.getAttribute('aria-label'))).toEqual(['Known', 'Track', 'Ignore']);
    expect(Array.from(card.querySelectorAll('.foot button')).map((b) => b.textContent)).toEqual(['Add to Anki']);
  });
});

describe('the deck menu', () => {
  const items = (card: ShadowRoot): string[] =>
    Array.from(card.querySelectorAll('.deckmenu button')).map((b) => b.textContent ?? '');

  it('is not there unless settings ask for it', () => {
    expect(open().querySelector('.foot .more')).toBeNull();
  });

  it("lists Anki's decks as places to add to, and adding there makes it the deck from then on", async () => {
    const onDeck = vi.fn(async (deck: string) => ({ deck }));
    const onAddCard = vi.fn(async () => 'added to Test Deck');
    const card = open({ deck: 'Japanese', decks: Promise.resolve(['Japanese', 'Test Deck']), onDeck, onAddCard });
    await flush();
    expect(card.querySelector<HTMLElement>('button.add')!.dataset.tip).toBe('Add to Japanese');
    const more = card.querySelector<HTMLButtonElement>('.foot .more')!;
    more.click();
    expect(items(card)).toEqual(['Add to Japanese', 'Add to Test Deck', 'New deck…']);
    expect(more.getAttribute('aria-expanded')).toBe('true');

    (Array.from(card.querySelectorAll<HTMLButtonElement>('.deckmenu button'))[1])!.click();
    await flush();
    expect(onDeck).toHaveBeenCalledWith('Test Deck', false);
    expect(onAddCard).toHaveBeenCalledOnce();
    expect(card.querySelector<HTMLElement>('.deckmenu')!.hidden).toBe(true);
    // Focus was in the list, which has gone: it is back on ▾.
    expect(focused()).toBe(more);
    expect(card.querySelector('.toast')?.textContent).toBe('added to Test Deck');
  });

  it('is a list of buttons that ▾ shows and hides, not a menu, and takes focus when opened from the keyboard', async () => {
    const card = open({ deck: 'Japanese', decks: Promise.resolve(['Japanese', 'Test Deck']), onDeck: async (deck) => ({ deck }) });
    await flush();
    const more = card.querySelector<HTMLButtonElement>('.foot .more')!;
    expect(more.hasAttribute('aria-haspopup')).toBe(false);
    expect(more.getAttribute('aria-controls')).toBe('deckmenu');
    // A click no mouse made, as Enter or Space on the button makes one.
    more.click();
    const menu = card.querySelector<HTMLElement>('#deckmenu')!;
    expect(menu.hidden).toBe(false);
    expect(card.querySelector('[role=menu], [role=menuitem]')).toBeNull();
    expect(focused()).toBe(menu.querySelector('button'));
    // Right after ▾, so Tab goes from one into the other.
    expect(more.nextElementSibling).toBe(menu);
  });

  it('leaves focus where it was when opened with the mouse, so Space still reaches the video', async () => {
    const card = open({ deck: 'Japanese', decks: Promise.resolve(['Japanese']), onDeck: async (deck) => ({ deck }) });
    await flush();
    card.querySelector('.foot .more')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(card.querySelector<HTMLElement>('.deckmenu')!.hidden).toBe(false);
    expect(focused()).toBe(document.body);
  });

  it('goes away on Escape and leaves the card open, with focus back on ▾', async () => {
    const card = open({ deck: 'Japanese', decks: Promise.resolve(['Japanese']), onDeck: async (deck) => ({ deck }) });
    await flush();
    const more = card.querySelector<HTMLButtonElement>('.foot .more')!;
    more.click();
    // The extension's own keys close the whole card on Escape, from the document (index.ts).
    const keys = vi.fn((e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup();
    });
    document.addEventListener('keydown', keys, true);
    try {
      escape(focused()!);
      expect(card.querySelector<HTMLElement>('.deckmenu')!.hidden).toBe(true);
      expect(more.getAttribute('aria-expanded')).toBe('false');
      expect(keys).not.toHaveBeenCalled();
      expect(popupIsOpen()).toBe(true);
      expect(focused()).toBe(more);
      // With the list away, Escape is the card's again.
      escape(more);
      expect(popupIsOpen()).toBe(false);
    } finally {
      document.removeEventListener('keydown', keys, true);
    }
  });

  it('says so when the deck is one word status does not read', async () => {
    const onDeck = vi.fn(async (deck: string) => ({ deck, warning: 'words you know are read from Japanese' }));
    const card = open({ deck: 'Japanese', decks: Promise.resolve(['Japanese', 'Test Deck']), onDeck });
    await flush();
    card.querySelector<HTMLButtonElement>('.foot .more')!.click();
    (Array.from(card.querySelectorAll<HTMLButtonElement>('.deckmenu button'))[1])!.click();
    await flush();
    expect(card.querySelector('.toast')?.textContent).toBe('added to Vocabulary — words you know are read from Japanese');
  });

  it('makes a new deck from a name asked for, and adds nothing if none is given', async () => {
    const onDeck = vi.fn(async (deck: string) => ({ deck }));
    const onAddCard = vi.fn(async () => 'added');
    const ask = vi.fn<(message?: string) => string | null>().mockReturnValueOnce('Japanese::Netflix').mockReturnValueOnce(null);
    vi.stubGlobal('prompt', ask);
    const card = open({ deck: 'Japanese', decks: Promise.resolve(['Japanese']), onDeck, onAddCard });
    await flush();
    const newDeck = (): HTMLButtonElement => {
      card.querySelector<HTMLButtonElement>('.foot .more')!.click();
      return Array.from(card.querySelectorAll<HTMLButtonElement>('.deckmenu button')).at(-1)!;
    };
    newDeck().click();
    await flush();
    expect(onDeck).toHaveBeenCalledWith('Japanese::Netflix', true);
    expect(onAddCard).toHaveBeenCalledOnce();

    await new Promise((r) => setTimeout(r, 950));
    newDeck().click();
    await flush();
    expect(onDeck).toHaveBeenCalledOnce();
    expect(ask).toHaveBeenCalledTimes(2);
  });
});

describe('the card\'s controls', () => {
  it('claims a card exists only when the caller says Anki has one', () => {
    let root = open({ status: 'known' });
    let add = root.querySelector<HTMLButtonElement>('button.add')!;
    expect(add.getAttribute('aria-label')).toBe('Add to Anki');
    expect(add.classList.contains('has')).toBe(false);
    closePopup();

    root = open({ hasCard: true });
    add = root.querySelector<HTMLButtonElement>('button.add')!;
    expect(add.textContent).toBe('In Anki');
    expect(add.getAttribute('aria-label')).toBe('Show in Anki');
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

  it('copies a selected phrase as it was written, not as it was looked up', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const root = open({ phrase: true }, '気にした');
    expect(root.querySelector('.tb[aria-label="Copy word"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('.tb[aria-label="Copy phrase"]')!.click();
    await flush();
    expect(writeText).toHaveBeenCalledWith('気にした');
    expect(root.querySelector('.toast')?.textContent).toBe('phrase copied');
  });

  it('never lets a clicked button keep focus, and names itself', () => {
    const root = open();
    const down = (el: Element): boolean => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(down(root.querySelector('button.add svg')!)).toBe(true);
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
    // With no entry the word is the dictionary form, and its reading that form's: never the one on the line's.
    expect(draftFor({ state: 'empty' } as LookupResult, said, 'x')).toEqual({
      expression: '勉強する', reading: '', meaning: '', sentence: 'x',
    });
    expect(draftFor({ state: 'empty' } as LookupResult, { ...said, lemmaReading: 'ベンキョウスル' }, 'x')).toEqual({
      expression: '勉強する', reading: 'ベンキョウスル', meaning: '', sentence: 'x',
    });
    // As it was said, where that is the word.
    const plain = { surface: '田中', lemma: '田中', reading: 'タナカ', start: 0, end: 2 };
    expect(draftFor({ state: 'empty' } as LookupResult, plain, 'x').reading).toBe('タナカ');
  });

  it("gives a word the dictionary writes in kana no reading from the line: ゲーム, not ゲームシマショウ", () => {
    const game: LookupResult = { state: 'ok', entries: [{ id: '2', word: 'ゲーム', common: true, senses: [{ pos: ['n'], glosses: ['game'] }] }] };
    const said = {
      surface: 'ゲームしましょう', lemma: 'ゲーム', usedAs: 'ゲームする', reading: 'ゲームシマショウ', lemmaReading: 'ゲーム', start: 0, end: 8,
    };
    expect(draftFor(game, said, 'ゲームしましょう')).toMatchObject({ expression: 'ゲーム', reading: 'ゲーム' });
  });

  it('is what the A key presses, when a card is open', async () => {
    expect(pressAdd()).toBe(false);
    const onAddCard = vi.fn(async () => 'added to Vocabulary');
    const card = open({ onAddCard });
    expect(pressAdd()).toBe(true);
    await flush();
    expect(onAddCard).toHaveBeenCalledWith(expect.objectContaining({ expression: '勉強', reading: 'べんきょう' }));
    expect(card.querySelector('.toast')?.textContent).toBe('added to Vocabulary');
  });

  it('adds one card however many times it is pressed while adding', async () => {
    let finish!: (msg: string) => void;
    const onAddCard = vi.fn(() => new Promise<string>((r) => { finish = r; }));
    open({ onAddCard });
    pressAdd();
    pressAdd();
    finish('added to Vocabulary');
    await flush();
    expect(onAddCard).toHaveBeenCalledOnce();
  });

  it('makes a card of the whole line from its own button, once per press', async () => {
    let finish!: (msg: string) => void;
    const onAddLine = vi.fn(() => new Promise<string>((r) => { finish = r; }));
    const card = open({ onAddLine });
    const b = card.querySelector<HTMLButtonElement>('.tb[aria-label="Add sentence"]')!;
    b.click();
    b.click();
    expect(b.classList.contains('busy')).toBe(true);
    finish('line added to Vocabulary');
    await flush();
    expect(onAddLine).toHaveBeenCalledOnce();
    expect(card.querySelector('.toast')?.textContent).toBe('line added to Vocabulary');
    // Not the word's button: that one is still waiting to be pressed.
    expect(card.querySelector('button.add svg path')?.getAttribute('d')).toBe('M5 12h14');
  });

  it('offers no line button when there is no line to add', () => {
    expect(open().querySelector('.tb[aria-label="Add sentence"]')).toBeNull();
  });

  it('says a card is waiting for Anki rather than in it', () => {
    const card = open({ hasCard: true, queued: true });
    expect((card.querySelector('button.add') as HTMLElement).dataset.tip).toBe('Waiting for Anki');
  });

  it('names its keys in the tooltips, without changing what the buttons are called', () => {
    const card = open();
    const add = card.querySelector<HTMLElement>('button.add')!;
    expect(add.dataset.tip).toBe('Add to Anki');
    expect(add.dataset.key).toBe('A');
    expect(add.getAttribute('aria-label')).toBe('Add to Anki');
    expect(add.getAttribute('aria-keyshortcuts')).toBe('A');
    const known = card.querySelector<HTMLElement>('.mk.known')!;
    expect(known.dataset.key).toBe('K');
    expect(known.getAttribute('aria-keyshortcuts')).toBe('K');
    expect(card.querySelector('.mk.ignore')?.hasAttribute('aria-keyshortcuts')).toBe(false);
    // Its own tooltip, not the browser's slow one as well.
    expect(card.querySelector('[title]')).toBeNull();
  });
});

describe('tooltips on the card', () => {
  const over = (el: Element, from: Element | null = null) =>
    el.dispatchEvent(new MouseEvent('pointerover', { bubbles: true, relatedTarget: from }));
  const out = (el: Element, to: Element | null = null) =>
    el.dispatchEvent(new MouseEvent('pointerout', { bubbles: true, relatedTarget: to }));

  it('labels an icon button after a short pause, with its key', async () => {
    vi.useFakeTimers();
    const card = open();
    const tip = card.querySelector<HTMLElement>('.tip')!;
    over(card.querySelector('button.add')!);
    expect(tip.classList.contains('on')).toBe(false);
    await vi.advanceTimersByTimeAsync(400);
    expect(tip.classList.contains('on')).toBe(true);
    expect(tip.firstChild?.textContent).toBe('Add to Anki');
    expect(tip.querySelector('kbd')?.textContent).toBe('A');
    vi.useRealTimers();
  });

  it('follows the pointer from one button to the next at once, and goes when it leaves', async () => {
    vi.useFakeTimers();
    const card = open();
    const tip = card.querySelector<HTMLElement>('.tip')!;
    const [pronounce, word, sentence] = Array.from(card.querySelectorAll('.tb'));
    over(pronounce!);
    await vi.advanceTimersByTimeAsync(400);
    expect(tip.textContent).toBe('Pronounce');
    out(pronounce!, word!);
    over(word!, pronounce!);
    await vi.advanceTimersByTimeAsync(0);
    expect(tip.textContent).toBe('Copy word');
    out(word!, sentence!);
    over(sentence!, word!);
    await vi.advanceTimersByTimeAsync(0);
    expect(tip.textContent).toBe('Copy sentence');
    out(sentence!, null);
    // A moment's grace, long enough to reach the tip itself; then it goes.
    expect(tip.classList.contains('on')).toBe(true);
    await vi.advanceTimersByTimeAsync(300);
    expect(tip.classList.contains('on')).toBe(false);
    vi.useRealTimers();
  });

  it('names each mark in a word or two', () => {
    const card = open();
    const tips = Array.from(card.querySelectorAll<HTMLElement>('.mk')).map((b) => b.dataset.tip);
    expect(tips).toEqual(['Mark known', 'Track', 'Ignore']);
  });
});

describe('the word elsewhere in the video', () => {
  const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ start: 60 * i + 5, text: `毎日勉強した${i}`, match: '勉強' }));
  const fold = (card: ShadowRoot): HTMLButtonElement | null => card.querySelector<HTMLButtonElement>('.also-fold .fold-head');

  it('is one line until opened, then lists the other lines with the word picked out', async () => {
    const card = open({ elsewhere: Promise.resolve(lines(2)) });
    expect(fold(card)).toBeNull();
    await flush();
    expect(fold(card)?.textContent).toBe('2 more times in this video');
    expect(fold(card)?.getAttribute('aria-expanded')).toBe('false');
    expect(card.querySelectorAll('.also-line')).toHaveLength(0);
    fold(card)!.click();
    const rows = Array.from(card.querySelectorAll('.also-line'));
    expect(rows.map((r) => r.querySelector('.at')?.textContent)).toEqual(['0:05', '1:05']);
    expect(rows[0]?.querySelector('b')?.textContent).toBe('勉強');
    fold(card)!.click();   // closed again, for the next card too
  });

  it('plays from a line when it is clicked, and closes the card', async () => {
    const onSeek = vi.fn();
    const card = open({ elsewhere: Promise.resolve(lines(1)), onSeek });
    await flush();
    expect(fold(card)?.textContent).toBe('Once more in this video');
    fold(card)!.click();
    card.querySelector<HTMLButtonElement>('.also-line')!.click();
    expect(onSeek).toHaveBeenCalledWith(5);
    expect(popupIsOpen()).toBe(false);
  });

  it('lists four and counts the rest, and stays open for the next card once opened', async () => {
    let card = open({ elsewhere: Promise.resolve(lines(7)) });
    await flush();
    // Opened by an earlier card, or opened now.
    if (fold(card)!.getAttribute('aria-expanded') !== 'true') fold(card)!.click();
    expect(card.querySelectorAll('.also-line')).toHaveLength(4);
    expect(card.querySelector('.also-more')?.textContent).toContain('and 3 more');
    closePopup();
    card = open({ elsewhere: Promise.resolve(lines(2)) }, '学校');
    await flush();
    expect(fold(card)?.getAttribute('aria-expanded')).toBe('true');
    fold(card)!.click();
  });

  it('offers the rest as a search of the transcript, for every form they were found in', async () => {
    const onSearch = vi.fn();
    const more = [...lines(5), { start: 400, text: '勉強しない', match: '勉強し' }];
    const card = open({ elsewhere: Promise.resolve(more), onSearch, token: { surface: '勉強', lemma: '勉強する', start: 2, end: 4 } });
    await flush();
    if (fold(card)!.getAttribute('aria-expanded') !== 'true') fold(card)!.click();
    const all = card.querySelector<HTMLButtonElement>('button.also-more')!;
    expect(all.textContent).toBe('Show all in transcript');
    all.click();
    expect(onSearch).toHaveBeenCalledWith('勉強する', ['勉強', '勉強', '勉強', '勉強', '勉強', '勉強', '勉強し']);
    expect(popupIsOpen()).toBe(false);
  });

  it('shows nothing when the word is nowhere else, or the card has moved on', async () => {
    const none = open({ elsewhere: Promise.resolve([]) });
    await flush();
    expect(fold(none)).toBeNull();

    let found!: (v: ReturnType<typeof lines>) => void;
    open({ elsewhere: new Promise((r) => { found = r; }) }, '勉強');
    const next = open({}, '学校');
    found(lines(2));
    await flush();
    expect(fold(next)).toBeNull();
  });
});

describe("the word's kanji", () => {
  it('is one line naming them until opened, then lists each with its meanings and readings', async () => {
    const card = open({
      characters: Promise.resolve({
        label: 'Kanji',
        items: [
          { char: '勉', meanings: ['exertion', 'endeavour', 'encourage', 'strive'], on: ['ベン'], kun: ['つと.める'] },
          { char: '強', meanings: ['strong'], on: ['キョウ', 'ゴウ', 'ショウ'], kun: ['つよ.い'] },
        ],
      }),
    });
    await flush();
    const head = card.querySelector<HTMLButtonElement>('.kanji-fold .fold-head')!;
    expect(head.textContent).toBe('Kanji · 勉 強');
    head.click();
    const chars = card.querySelector<HTMLElement>('.chars')!;
    expect(chars.hidden).toBe(false);
    expect(Array.from(chars.querySelectorAll('.kanji')).map((k) => k.textContent)).toEqual(['勉', '強']);
    const [ben, tsuyoi] = Array.from(chars.querySelectorAll('.kanji-mean'));
    // Three meanings at most, and two readings of each kind.
    expect(ben?.firstChild?.textContent).toBe('exertion, endeavour, encourage');
    expect(tsuyoi?.querySelector('.kanji-read')?.textContent).toBe('キョウ · ゴウ · つよ.い');
    head.click();
  });

  it('leaves the section out for a word with no kanji', async () => {
    const card = open({ characters: Promise.resolve({ label: 'Kanji', items: [] }) });
    await flush();
    expect(card.querySelector('.kanji-fold')).toBeNull();
  });
});

describe('the meanings', () => {
  it('shows three, and the rest when asked', () => {
    const many: LookupResult = {
      state: 'ok',
      entries: [{
        id: '2', word: '出来る', reading: 'できる', common: true,
        senses: Array.from({ length: 7 }, (_, i) => ({ pos: ['v1'], glosses: [`sense ${i + 1}`] })),
      }],
    };
    const mount = document.createElement('div');
    const anchor = document.createElement('span');
    mount.appendChild(anchor);
    document.body.appendChild(mount);
    showPopup(mount, anchor, many, {
      token: { surface: 'できる', start: 0, end: 3 }, sentence: 'できる', status: 'unknown',
      onMark: () => {}, onAddCard: async () => 'added',
    });
    const card = document.querySelector('.libregaku-popup')!.shadowRoot!;
    const shown = (): number => Array.from(card.querySelectorAll('ol li')).filter((li) => !(li as HTMLElement).hidden).length;
    expect(shown()).toBe(3);
    const more = card.querySelector<HTMLButtonElement>('.more-senses')!;
    expect(more.textContent).toBe('+4 more meanings');
    more.click();
    expect(shown()).toBe(7);
    expect(card.querySelector('.more-senses')).toBeNull();
  });

  it("say which language they are written in, which need not be the interface's", async () => {
    const meanings = (lang: string, result?: LookupResult): string | undefined => {
      const said = open({ lang }, '勉強', result).querySelector('ol')?.lang;
      closePopup();
      return said;
    };
    try {
      // A learner whose own language is Arabic: JMdict has no Arabic, so its meanings are English.
      await setSetting('native', 'ar');
      expect(meanings('ja')).toBe('en');
      // Or in the language chosen for them instead.
      await setSetting('definitions', 'de');
      expect(meanings('ja')).toBe('de');
      // Korean's dictionary is in English, whatever JMdict's are in.
      expect(meanings('ko')).toBe('en');
      // An entry from a dictionary in the learner's own language says which itself.
      const own: LookupResult = {
        state: 'ok',
        entries: [{ id: '1', word: '勉強', reading: 'べんきょう', common: true, lang: 'zh', senses: [{ pos: ['n'], glosses: ['学习'] }] }],
      };
      expect(meanings('ja', own)).toBe('zh');
    } finally {
      await setSetting('native', DEFAULTS.native);
      await setSetting('definitions', DEFAULTS.definitions);
    }
  });
});

describe('what a prefix or suffix left out of the lookup means', () => {
  const token = { surface: '新名所', start: 0, end: 3, lemma: '名所', parts: ['新', '名所'] };
  const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

  it('is listed under the trace, with its reading and meaning', async () => {
    const card = open({ token, leftovers: Promise.resolve([{ part: '新', reading: 'しん', meaning: 'new' }]) }, '新名所');
    await flush();
    const row = card.querySelector('.leftovers');
    expect(row?.textContent).toContain('新');
    expect(row?.textContent).toContain('しん · new');
    expect(card.querySelector('.trace')?.textContent).toContain('新 + 名所');
  });

  it('leaves nothing when the lookup found no meaning', async () => {
    const card = open({ token, leftovers: Promise.resolve([]) }, '新名所');
    await flush();
    expect(card.querySelector('.leftovers')?.children.length ?? 0).toBe(0);
  });
});
