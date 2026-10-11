import { describe, expect, it } from 'vitest';
import { DICTIONARY_SITES, dictionarySite } from '../sites';

/** The word card's dictionary button, by the language learned and the learner's own. */
describe('a dictionary on the web in your own language', () => {
  it('is chosen by the pair, and left to the language’s usual one where there is none', () => {
    expect(dictionarySite('ja', 'es')?.url('食べる')).toBe('https://jotoba.de/search/0/%E9%A3%9F%E3%81%B9%E3%82%8B?l=es-ES');
    expect(dictionarySite('ko', 'ja')?.url('사랑')).toBe('https://korean.dict.naver.com/kojadict/#/search?query=%EC%82%AC%EB%9E%91');
    expect(dictionarySite('zh', 'de')?.url('学习')).toBe('https://dict.leo.org/chinesisch-deutsch/%E5%AD%A6%E4%B9%A0');
    expect(dictionarySite('es', 'fr')?.url('casa')).toBe('https://www.wordreference.com/esfr/casa');
    // French and German: Wiktionary in the learner's own language, and English's for anyone it has no edition for.
    expect(dictionarySite('fr', 'es')?.url('manger')).toBe('https://es.wiktionary.org/wiki/manger');
    expect(dictionarySite('de', 'zh-Hant')?.url('Haus')).toBe('https://zh.wiktionary.org/wiki/Haus');
    expect(dictionarySite('fr', 'en')).toBeUndefined();
    expect(dictionarySite('de', 'hi')).toBeUndefined();
    // Jisho is English already; Arabic has no Japanese dictionary worth sending anyone to.
    expect(dictionarySite('ja', 'en')).toBeUndefined();
    expect(dictionarySite('ja', 'ar')).toBeUndefined();
  });

  it('opens each over https, with the word in the address, a name to show and the address readable as a URL', () => {
    for (const [target, pairs] of Object.entries(DICTIONARY_SITES)) {
      for (const [native, site] of Object.entries(pairs)) {
        const url = site.url('ab c/d');
        expect(url, `${target}→${native}`).toMatch(/^https:\/\//);
        expect(url, `${target}→${native}`).toContain('ab%20c%2Fd');
        expect(() => new URL(url), `${target}→${native}`).not.toThrow();
        expect(site.name.length, `${target}→${native}`).toBeGreaterThan(1);
      }
    }
  });

  it('writes a Lingea address in its own script, encoded', () => {
    expect(dictionarySite('ja', 'uk')?.url('猫')).toMatch(/^https:\/\/dict\.com\/%D1%8F%D0%BF%D0%BE%D0%BD%D1%81%D1%8C%D0%BA%D0%BE-/);
  });
});
