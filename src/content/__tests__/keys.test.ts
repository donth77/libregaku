import { describe, expect, it } from 'vitest';
import { isLineKey, isTyping, keyAction } from '../keys';

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
