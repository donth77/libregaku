import { describe, expect, it } from 'vitest';
import {
  DEFAULTS, DICTIONARIES, OWN_DICTIONARIES, TARGET_LANGUAGES, cardDeck, dictionaryOf, featuresOf, ownDictionaryOf,
  targetVariant, withDecks, withDefaults, type Settings,
} from '../settings';
import { SOURCES } from '../dict/sources';

/** What each language being learned gets, and the decks kept for each. */

const at = (more: Partial<Settings>): Settings => ({ ...DEFAULTS, ...more });

describe('the decks kept for each language', () => {
  it('puts the decks in use away under their language and brings the new language its own', () => {
    const japanese = at({ target: 'ja', deck: 'Japanese::Netflix', statusScope: 'Japanese' });
    const spanish = withDecks(japanese, { ...japanese, target: 'es' });
    // Nothing chosen for Spanish yet: its cards go to a deck of its own, never to the Japanese one.
    expect(spanish).toMatchObject({ target: 'es', deck: '', statusScope: '' });
    expect(cardDeck(spanish)).toBe('Libregaku-ES');
    expect(cardDeck(japanese)).toBe('Japanese::Netflix');
    expect(spanish.decks.ja).toEqual({ deck: 'Japanese::Netflix', statusScope: 'Japanese' });

    const chosen = withDecks(spanish, { ...spanish, deck: 'Español' });
    expect(chosen.decks.es).toEqual({ deck: 'Español', statusScope: '' });

    const back = withDecks(chosen, { ...chosen, target: 'ja' });
    expect(back).toMatchObject({ target: 'ja', deck: 'Japanese::Netflix', statusScope: 'Japanese' });
    expect(back.decks.es).toEqual({ deck: 'Español', statusScope: '' });
    expect(withDecks(back, { ...back, target: 'es' })).toMatchObject({ deck: 'Español', statusScope: '' });
  });

  it('keeps the scope with the deck, each changed on its own', () => {
    const before = at({ target: 'ko', deck: 'Korean', statusScope: '' });
    const scoped = withDecks(before, { ...before, statusScope: 'Korean' });
    expect(scoped.decks.ko).toEqual({ deck: 'Korean', statusScope: 'Korean' });
  });

  it('leaves everything alone for a change that is neither', () => {
    const before = at({ target: 'ja', deck: 'Japanese', decks: { ja: { deck: 'Japanese', statusScope: '' } } });
    const after = { ...before, ruby: 'always' as const };
    expect(withDecks(before, after)).toBe(after);
    // A language never given a deck has nothing to write down.
    const empty = at({ target: 'zh' });
    expect(withDecks(empty, { ...empty, blurPrimary: true }).decks).toEqual({});
  });

  it('carries a deck chosen before decks were kept by language over to its language', () => {
    const stored = withDefaults({ target: 'ja', deck: 'Vocabulary', statusScope: 'Japanese' });
    expect(stored.decks).toEqual({});
    expect(withDecks(stored, { ...stored, target: 'zh' }).decks.ja).toEqual({ deck: 'Vocabulary', statusScope: 'Japanese' });
  });

  it('reads stored decks defensively', () => {
    const odd = { ja: { deck: 'A' }, ko: null, zh: 'x', es: { deck: 3, statusScope: 'S' } } as unknown as Settings['decks'];
    expect(withDefaults({ decks: odd }).decks).toEqual({
      ja: { deck: 'A', statusScope: '' }, es: { deck: '', statusScope: 'S' },
    });
    expect(withDefaults({ decks: 'nope' as unknown as Settings['decks'] }).decks).toEqual({});
  });
});

describe('the flag picked for each language', () => {
  // It was one flag for every language, typed in as text.
  const before = (target: string, flag: string): Partial<Settings> =>
    ({ target, badgeFlag: flag }) as unknown as Partial<Settings>;

  it('gives a flag picked before each language had its own to the language being learned', () => {
    expect(withDefaults(before('es', '🇲🇽')).badgeFlag).toEqual({ es: '🇲🇽' });
    expect(withDefaults(before('es', '')).badgeFlag).toEqual({});
    expect(withDefaults(undefined).badgeFlag).toEqual({});
  });

  it('keeps each language its own, and reads them defensively', () => {
    const odd = { es: '🇲🇽', ja: '', fr: 3, de: null } as unknown as Settings['badgeFlag'];
    expect(withDefaults({ target: 'ja', badgeFlag: odd }).badgeFlag).toEqual({ es: '🇲🇽' });
  });
});

describe('a language written two ways', () => {
  it('is learned in Simplified Chinese until Traditional is picked', () => {
    expect(targetVariant(at({ target: 'zh' }))).toBe('zh-Hans');
    expect(targetVariant(at({ target: 'zh', scripts: { zh: 'zh-Hant' } }))).toBe('zh-Hant');
    expect(targetVariant(at({ target: 'zh', scripts: { zh: 'zh-Hans' } }))).toBe('zh-Hans');
  });

  it('is the language itself for one written one way, whatever is stored for another', () => {
    expect(targetVariant(at({ target: 'ja', scripts: { zh: 'zh-Hant' } }))).toBe('ja');
    expect(targetVariant(at({ target: 'es' }))).toBe('es');
    expect(featuresOf('ja').scripts).toBeUndefined();
  });

  it('keeps only a script the language has', () => {
    const odd = { zh: 'zh-Hant', ja: 'ja-Latn', ko: 7, es: null } as unknown as Settings['scripts'];
    expect(withDefaults({ scripts: odd }).scripts).toEqual({ zh: 'zh-Hant' });
    expect(withDefaults({ scripts: { zh: 'yue' } }).scripts).toEqual({});
    expect(withDefaults({ scripts: 'zh-Hant' as unknown as Settings['scripts'] }).scripts).toEqual({});
    expect(withDefaults(undefined).scripts).toEqual({});
    // A script that is not the language's is as good as none picked.
    expect(targetVariant(at({ target: 'zh', scripts: { zh: 'yue' } }))).toBe('zh-Hans');
  });
});

describe('what each language gets', () => {
  const tier = (code: string) => TARGET_LANGUAGES.find((l) => l.code === code)?.tier;

  it('gives Japanese, Korean and Chinese an analyser, and Spanish, French and German their dictionary forms', () => {
    expect(['ja', 'ko', 'zh', 'es', 'fr', 'de', 'it'].map(tier)).toEqual([2, 2, 2, 1, 1, 1, 0]);
  });

  it('has a dictionary for every language above boundaries alone, and for no other', () => {
    for (const lang of TARGET_LANGUAGES) {
      expect(Boolean(DICTIONARIES[lang.code]), lang.code).toBe(lang.tier > 0);
    }
  });

  it('asks for JMdict in the learner’s language, and the others in English, the one they are written in', () => {
    expect(dictionaryOf('ja', { native: 'de', definitions: 'en' })).toEqual({ source: 'jmdict', edition: 'ger' });
    expect(dictionaryOf('ja', { native: 'ko', definitions: 'fr' })).toEqual({ source: 'jmdict', edition: 'fre' });
    expect(dictionaryOf('zh', { native: 'de', definitions: 'en' })).toEqual({ source: 'cedict', edition: 'en' });
    expect(dictionaryOf('ko', { native: 'en', definitions: 'en' })).toEqual({ source: 'wty-ko-en', edition: 'en' });
    expect(dictionaryOf('es', { native: 'ja', definitions: 'en' })).toEqual({ source: 'wty-es-en', edition: 'en' });
    expect(dictionaryOf('fr', { native: 'en', definitions: 'en' })).toEqual({ source: 'wty-fr-en', edition: 'en' });
    expect(dictionaryOf('de', { native: 'ja', definitions: 'en' })).toEqual({ source: 'wty-de-en', edition: 'en' });
    expect(dictionaryOf('it', { native: 'en', definitions: 'en' })).toBeNull();
  });

  it('names what each language draws above its words, and what it calls its characters', () => {
    expect(featuresOf('ja')).toMatchObject({ readings: 'furigana', characters: 'kanji', definitions: true });
    expect(featuresOf('zh')).toMatchObject({ readings: 'pinyin', characters: 'hanzi', definitions: false });
    expect(featuresOf('ko')).toMatchObject({ readings: false, characters: false });
    expect(featuresOf('es')).toMatchObject({ readings: false, characters: false });
  });

  it('sends each language to a dictionary site of its own', () => {
    const site = (lang: string, word: string) => featuresOf(lang).dictionary?.url(word);
    expect(site('ja', '食べる')).toBe('https://jisho.org/search/%E9%A3%9F%E3%81%B9%E3%82%8B');
    expect(site('zh', '学校')).toContain('mdbg.net/chinese/dictionary?page=worddict&wdqb=%E5%AD%A6%E6%A0%A1');
    expect(site('ko', '먹다')).toContain('korean.dict.naver.com/koendict/#/search?query=%EB%A8%B9%EB%8B%A4');
    expect(site('es', 'hablar')).toBe('https://www.spanishdict.com/translate/hablar');
    expect(site('fr', 'manger')).toBe('https://en.wiktionary.org/wiki/manger#French');
    expect(site('de', 'Haus')).toBe('https://en.wiktionary.org/wiki/Haus#German');
    expect(featuresOf('it').dictionary).toBeUndefined();
  });
});

describe('a dictionary in your own language', () => {
  it('is asked for where the pair has one, and only there', () => {
    expect(ownDictionaryOf('ja', { native: 'zh' })).toEqual({ source: 'wty-ja-zh', edition: 'zh' });
    expect(ownDictionaryOf('ja', { native: 'zh-Hant' })).toEqual({ source: 'wty-ja-zh', edition: 'zh-Hant' });
    expect(ownDictionaryOf('ja', { native: 'ko' })).toEqual({ source: 'wty-ja-ko', edition: 'ko' });
    expect(ownDictionaryOf('es', { native: 'fr' })).toEqual({ source: 'wty-es-fr', edition: 'fr' });
    // JMdict is already in Spanish; English is what the others are in.
    expect(ownDictionaryOf('ja', { native: 'es' })).toBeNull();
    expect(ownDictionaryOf('es', { native: 'en' })).toBeNull();
    expect(ownDictionaryOf('th', { native: 'fr' })).toBeNull();
  });

  it('names only dictionaries there are, each for a language that has one of its own', () => {
    for (const [lang, pairs] of Object.entries(OWN_DICTIONARIES)) {
      expect(DICTIONARIES[lang]).toBeTruthy();
      for (const source of Object.values(pairs)) expect(SOURCES[source]?.id).toBe(source);
    }
  });
});

describe('Cantonese', () => {
  it('is a language of its own, read in Jyutping, from its own dictionary', () => {
    expect(TARGET_LANGUAGES.find((l) => l.code === 'yue')).toMatchObject({ tier: 2, flag: '🇭🇰' });
    expect(featuresOf('yue')).toMatchObject({ readings: 'jyutping', characters: 'hanzi' });
    expect(DICTIONARIES.yue).toBe('canto');
  });

  it('takes Cantonese tracks, then any written Chinese, Hong Kong’s first; Mandarin takes no Cantonese', async () => {
    const { trackLanguageMatch } = await import('../settings');
    expect(trackLanguageMatch('yue', 'yue')).toBe(2);
    expect(trackLanguageMatch('yue-HK', 'yue')).toBe(2);
    expect(trackLanguageMatch('zh-yue', 'yue')).toBe(2);
    // Cantonese speech is mostly subtitled in written Chinese: every Chinese track will do.
    const nearest = ['zh-Hans', 'zh', 'zh-TW', 'zh-HK', 'yue', 'zh-Hant', 'zh-Hant-HK', 'zh-CN']
      .sort((a, b) => trackLanguageMatch(b, 'yue') - trackLanguageMatch(a, 'yue'));
    expect(nearest).toEqual(['yue', 'zh-HK', 'zh-Hant-HK', 'zh-TW', 'zh-Hant', 'zh-Hans', 'zh', 'zh-CN']);
    expect(trackLanguageMatch('zh-CN', 'yue')).toBeGreaterThan(0);
    expect(trackLanguageMatch('ja', 'yue')).toBe(0);
    expect(trackLanguageMatch('zh-yue', 'zh')).toBe(0);
    expect(trackLanguageMatch('zh-yue', 'zh-Hant')).toBe(0);
    expect(trackLanguageMatch('zh-HK', 'zh-Hant')).toBe(2);
    expect(trackLanguageMatch('zh-Hans', 'zh')).toBe(2);
  });
});
