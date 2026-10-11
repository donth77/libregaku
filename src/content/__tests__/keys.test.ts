import { afterEach, describe, expect, it } from 'vitest';
import { isControlKey, isLineKey, isTyping, keyAction, letterKey } from '../keys';

const press = (key: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}) =>
  keyAction({ key, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

describe('keyAction', () => {
  it('maps the arrows to moving between lines', () => {
    expect(press('ArrowLeft')).toBe('previous');
    expect(press('ArrowRight')).toBe('next');
    expect(press('ArrowDown')).toBe('replay');
    expect(press('ArrowUp')).toBe('second');
  });

  it('maps the letters, shifted or not', () => {
    expect(press('a')).toBe('add');
    expect(press('A', { shiftKey: true })).toBe('add');
    expect(press('k')).toBe('known');
    expect(press('r')).toBe('furigana');
    expect(press('h')).toBe('blur');
    expect(press('b')).toBe('save');
    expect(press('s')).toBe('panel');
  });

  it("leaves the players' own keys alone", () => {
    for (const key of [' ', 'f', 'm', 'c', 't', 'i', 'j', 'l', '0', 'Enter', 'Escape', 'Process']) {
      expect(press(key)).toBeNull();
    }
  });

  it('never takes a browser or system shortcut, or shift+arrow', () => {
    expect(press('a', { metaKey: true })).toBeNull();
    expect(press('r', { ctrlKey: true })).toBeNull();
    expect(press('ArrowLeft', { altKey: true })).toBeNull();
    expect(press('ArrowRight', { shiftKey: true })).toBeNull();
  });

  it('knows which keys need a whole track', () => {
    expect(['previous', 'next', 'replay', 'second'].every((a) => isLineKey(a as never))).toBe(true);
    expect(['add', 'known', 'furigana', 'blur', 'save', 'panel'].some((a) => isLineKey(a as never))).toBe(false);
  });

  it('leaves Alt and a letter to the page while single keys are on', () => {
    expect(press('a', { altKey: true })).toBeNull();
    expect(press('A', { altKey: true, shiftKey: true })).toBeNull();
  });
});

describe('keyAction with single-key shortcuts off', () => {
  const off = (key: string, mods: Partial<Record<'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey', boolean>> = {}, code?: string) =>
    keyAction({ key, code, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods }, false);
  const both = { altKey: true, shiftKey: true };

  it('takes a letter only with Alt and Shift held', () => {
    expect(off('a')).toBeNull();
    expect(off('A', { shiftKey: true })).toBeNull();
    expect(off('a', { altKey: true })).toBeNull();
    expect(off('A', both, 'KeyA')).toBe('add');
    expect(off('S', both, 'KeyS')).toBe('panel');
    // On a Mac, Option makes the letter another character; the key is still A.
    expect(off('Å', both, 'KeyA')).toBe('add');
    expect(off('Ó', both, 'KeyH')).toBe('blur');
    // And never a browser shortcut.
    expect(off('A', { ...both, ctrlKey: true }, 'KeyA')).toBeNull();
    expect(off('A', { ...both, metaKey: true }, 'KeyA')).toBeNull();
  });

  it('keeps the arrows as they are', () => {
    expect(off('ArrowLeft')).toBe('previous');
    expect(off('ArrowUp')).toBe('second');
    expect(off('ArrowLeft', both)).toBeNull();
  });

  it('names a letter key as it is pressed', () => {
    expect(letterKey('R', true)).toEqual({ shown: 'R', aria: 'R' });
    expect(letterKey('R', false)).toEqual({ shown: 'Alt+Shift+R', aria: 'Alt+Shift+R' });
  });
});

describe('isControlKey', () => {
  afterEach(() => document.body.replaceChildren());

  /** An element in a shadow root under a host such as the ones the extension draws. */
  const within = (host: string, tag: string, attrs: Record<string, string> = {}): HTMLElement => {
    const h = document.createElement('div');
    if (host.startsWith('#')) h.id = host.slice(1);
    else h.className = host.slice(1);
    document.body.appendChild(h);
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    h.attachShadow({ mode: 'open' }).appendChild(el);
    return el;
  };
  /** An element on the site's own page. */
  const onPage = (tag: string, attrs: Record<string, string> = {}): HTMLElement => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    return el;
  };
  /** Whether the page's capture listener would leave a key pressed on `el` to it. */
  const kept = (el: Element, key: string): boolean => {
    let result = false;
    const listen = (e: Event): void => {
      result = isControlKey(e as KeyboardEvent);
    };
    document.addEventListener('keydown', listen, true);
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true }));
    document.removeEventListener('keydown', listen, true);
    return result;
  };
  const MOVES = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '];

  // → on a panel tab seeked the video; ↓ in the transcript turned the translation on and off.
  it('leaves the arrows, Home, End, Enter and Space to anything in the panel or on the card', () => {
    const tab = within('.libregaku-sidebar', 'button', { role: 'tab' });
    const row = within('.libregaku-sidebar', 'div', { tabindex: '-1' });
    const card = within('.libregaku-popup', 'div', { tabindex: '0' });
    for (const key of MOVES) {
      expect(kept(tab, key), key).toBe(true);
      expect(kept(row, key), key).toBe(true);
      expect(kept(card, key), key).toBe(true);
    }
  });

  it('leaves a word of the subtitle the keys along its line and to press it, and ↑ and ↓ to the player', () => {
    // A word is a button, as the overlay draws it.
    const word = within('.libregaku-root', 'span', { class: 't', role: 'button', tabindex: '0' });
    for (const key of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ']) expect(kept(word, key), key).toBe(true);
    // A click leaves the focus on the word: the translation and the replay still answer.
    expect(kept(word, 'ArrowUp')).toBe(false);
    expect(kept(word, 'ArrowDown')).toBe(false);
    expect(kept(within('.libregaku-root', 'div', { class: 'wrap' }), 'ArrowRight')).toBe(false);
  });

  it('leaves them to a focused button of ours, and to the site\'s tabs and fields, but not to its buttons', () => {
    expect(kept(within('#libregaku-header', 'button'), 'ArrowRight')).toBe(true);
    expect(kept(onPage('div', { role: 'tab' }), 'ArrowRight')).toBe(true);
    expect(kept(onPage('div', { role: 'option' }), 'ArrowDown')).toBe(true);
    expect(kept(onPage('div', { role: 'separator' }), 'ArrowLeft')).toBe(true);
    expect(kept(onPage('select'), 'ArrowDown')).toBe(true);
    // The players leave a button focused after every click: → still moves a line.
    expect(kept(onPage('button'), 'ArrowRight')).toBe(false);
    expect(kept(onPage('div', { role: 'button' }), 'ArrowRight')).toBe(false);
  });

  it('keeps the player\'s keys everywhere else, and its letters everywhere', () => {
    expect(kept(document.body, 'ArrowRight')).toBe(false);
    expect(kept(onPage('div', { tabindex: '0' }), 'ArrowLeft')).toBe(false);
    const tab = within('.libregaku-sidebar', 'button', { role: 'tab' });
    expect(kept(tab, 'a')).toBe(false);
    expect(kept(tab, 'Escape')).toBe(false);
  });
});

describe('isTyping', () => {
  const at = (el: HTMLElement, isComposing = false) =>
    isTyping({ composedPath: () => [el], target: el, isComposing });

  it('lets fields keep their letters, even inside a shadow root', () => {
    const host = document.createElement('div');
    const input = document.createElement('input');
    host.attachShadow({ mode: 'open' }).appendChild(input);
    expect(at(input)).toBe(true);
    expect(at(document.createElement('textarea'))).toBe(true);
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    expect(at(editable)).toBe(true);
  });

  it('counts an input method mid-composition as typing', () => {
    expect(at(document.body, true)).toBe(true);
  });

  it('is not typing on the page itself', () => {
    expect(at(document.body)).toBe(false);
  });
});
