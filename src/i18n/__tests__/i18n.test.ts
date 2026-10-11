import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fill, grammarLabel, languageLabel, languageName, localize, onUiLanguageChange, ownName, setUiLanguage, ui, uiLanguage,
  uiLanguageFor, uiLocale,
} from '..';
import { localeOf } from '../languages';
import { grammar } from '../en/grammar';
import { GRAMMAR_LABELS } from '../../morphology/merge';
import { browserLanguage, trackLanguageMatch } from '../../settings';

/**
 * The interface language: your own where the interface is written in it,
 * English otherwise, and switched in place so whatever reads `ui` next reads
 * the new words.
 */

afterEach(() => {
  setUiLanguage('en');
  document.body.replaceChildren();
});

describe('the interface language', () => {
  it('is your language where the interface is written in it, and English otherwise', () => {
    expect(uiLanguageFor('ko')).toBe('ko');
    expect(uiLanguageFor('zh')).toBe('zh');
    expect(uiLanguageFor('zh-Hant')).toBe('zh-Hant');
    expect(uiLanguageFor('es')).toBe('es');
    expect(uiLanguageFor('hu')).toBe('en');
    expect(uiLanguageFor('ja')).toBe('ja');
    expect(uiLanguageFor('fil')).toBe('en');
  });

  it('switches in place, tells whoever draws, and says nothing when it stays the same', () => {
    const before = ui.common;
    const redraw = vi.fn();
    const stop = onUiLanguageChange(redraw);
    setUiLanguage('ko');
    expect(uiLanguage()).toBe('ko');
    expect(uiLocale()).toBe('ko');
    expect(ui.common).toBe(before);   // the same section, refilled
    setUiLanguage('ko');
    expect(redraw).toHaveBeenCalledTimes(1);
    setUiLanguage('hu');   // not written: English
    expect(uiLanguage()).toBe('en');
    expect(redraw).toHaveBeenCalledTimes(2);
    stop();
    setUiLanguage('es');
    expect(redraw).toHaveBeenCalledTimes(2);
  });

  it("formats as the browser does where it is the same language: en-GB's dates for English", () => {
    expect(localeOf('en', 'en-GB')).toBe('en-GB');
    expect(localeOf('es', 'es-MX')).toBe('es-MX');
    expect(localeOf('zh-Hant', 'zh-HK')).toBe('zh-HK');
    expect(localeOf('zh', 'zh-TW')).toBe('zh-CN');   // a Traditional browser, a Simplified interface
    expect(localeOf('ko', 'en-GB')).toBe('ko');
    expect(localeOf('en', '')).toBe('en');
  });

  it('reads every string in the new language, and English again where it goes back', () => {
    setUiLanguage('ko');
    expect(ui.sidebar.settings).toBe('설정');
    expect(grammarLabel('past')).toBe('과거');
    setUiLanguage('es');
    expect(ui.sidebar.settings).toBe('Configuración');
    setUiLanguage('en');
    expect(ui.sidebar.settings).toBe('Settings');
    expect(grammarLabel('past')).toBe('past');
  });

  it('writes Chinese as the script chosen', () => {
    setUiLanguage('zh');
    expect(uiLocale()).toBe('zh-CN');
    setUiLanguage('zh-Hant');
    expect(uiLocale()).toBe('zh-TW');
  });
});

describe('a string with elements in it', () => {
  it('puts each where the template says, in whatever order', () => {
    const b = document.createElement('b');
    expect(fill('In Anki, go to {menu}, then restart.', { menu: b })).toEqual(['In Anki, go to ', b, ', then restart.']);
    expect(fill('{menu}(으)로 이동', { menu: b })).toEqual([b, '(으)로 이동']);
    expect(fill('{a}{b}', { a: 'x', b: 'y' })).toEqual(['x', 'y']);
    // A value the caller forgot shows as itself rather than vanishing.
    expect(fill('Open {menu}', {})).toEqual(['Open ', '{menu}']);
  });
});

describe("an ending's name", () => {
  it('is in the table for every ending the Japanese and Korean analysers name', () => {
    const names = Object.keys(grammar);
    expect(names).toEqual(expect.arrayContaining([...GRAMMAR_LABELS]));
  });

  it('is its own where it has one, and otherwise each word named alone', () => {
    expect(grammarLabel('passive or potential')).toBe('passive or potential');
    // A dictionary's tags, each a name of its own, and a verb that is none.
    expect(grammarLabel('past or ser')).toBe('past or ser');
    expect(grammarLabel('no-such-tag')).toBe('no-such-tag');
  });
});

describe('language names', () => {
  it('are in the interface language, capitalised in a list', () => {
    expect(languageName('ja')).toBe('Japanese');
    expect(languageName('zh-Hant')).toBe('Chinese (Traditional)');
    setUiLanguage('es');
    expect(languageName('ja')).toBe('japonés');
    expect(languageLabel('ja')).toBe('Japonés');
    setUiLanguage('ko');
    expect(languageLabel('ja')).toBe('일본어');
  });

  it('name a language of your own in itself, so it can be found from any interface', () => {
    expect(ownName('es')).toBe('Español');
    expect(ownName('ko')).toBe('한국어');
    expect(ownName('zh')).toBe('中文（简体）');
    expect(ownName('zh-Hant')).toBe('中文（繁體）');
    setUiLanguage('ko');
    expect(ownName('en')).toBe('English');
    // A code from damaged storage is shown as it is, not thrown over.
    expect(() => ownName('')).not.toThrow();
    expect(() => ownName('not a tag')).not.toThrow();
  });
});

describe('a page with words in its markup', () => {
  it('takes them from the interface language, attributes too, and its lang follows', () => {
    document.body.innerHTML = '<p data-i18n="nowhere.at-all">Kept</p><button data-i18n-title="nowhere.else" title="T">B</button>';
    localize(document);
    // A path with no string leaves the English in the markup.
    expect(document.querySelector('p')?.textContent).toBe('Kept');
    expect(document.querySelector('button')?.title).toBe('T');
    setUiLanguage('zh-Hant');
    localize(document);
    expect(document.documentElement.lang).toBe('zh-TW');
  });
});

describe('your language, before you choose', () => {
  it("is the browser's where it can be, Traditional Chinese for Taiwan and Hong Kong, and English otherwise", () => {
    expect(browserLanguage('ko')).toBe('ko');
    expect(browserLanguage('es-419')).toBe('es');
    expect(browserLanguage('zh-CN')).toBe('zh');
    expect(browserLanguage('zh-TW')).toBe('zh-Hant');
    expect(browserLanguage('zh-HK')).toBe('zh-Hant');
    expect(browserLanguage('zh-Hant-TW')).toBe('zh-Hant');
    expect(browserLanguage('pt-BR')).toBe('pt');
    expect(browserLanguage('hu')).toBe('en');   // not a translation on offer
    expect(browserLanguage('fil')).toBe('en');
  });
});

describe('a translation track for your language', () => {
  it('is the language itself, or, for Chinese, the other script when the chosen one is missing', () => {
    expect(trackLanguageMatch('en-US', 'en')).toBe(2);
    expect(trackLanguageMatch('ja', 'en')).toBe(0);
    expect(trackLanguageMatch('zh-Hans', 'zh')).toBe(2);
    expect(trackLanguageMatch('zh-CN', 'zh')).toBe(2);
    expect(trackLanguageMatch('zh-TW', 'zh')).toBe(1);
    expect(trackLanguageMatch('zh-Hant', 'zh-Hant')).toBe(2);
    expect(trackLanguageMatch('zh-HK', 'zh-Hant')).toBe(2);
    expect(trackLanguageMatch('zh-Hans', 'zh-Hant')).toBe(1);
    expect(trackLanguageMatch('zh', 'zh-Hant')).toBe(1);
    expect(trackLanguageMatch('ko', 'zh')).toBe(0);
  });
});
