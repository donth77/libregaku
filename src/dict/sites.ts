/**
 * Where a word card's dictionary button goes, by the language being learned
 * and then the learner's own: a dictionary on the web that explains the word
 * in the learner's language, where one does. Anyone else gets the language's
 * usual one, in English (settings.ts, featuresOf).
 *
 * Each was opened with a word and found to land on its entry, in October
 * 2026. Each takes the word's dictionary form, and the Chinese ones its
 * simplified spelling, which is what a card shows as its headword.
 */

export interface DictionarySite {
  name: string;
  url: (word: string) => string;
}

const e = encodeURIComponent;
const site = (name: string, url: (w: string) => string): DictionarySite => ({ name, url: (w) => url(e(w)) });

/** Lingea's free dictionaries, at dict.com, by the pair's name in the learner's language. */
const lingea = (slug: string): DictionarySite => site('Lingea', (w) => `https://dict.com/${encodeURI(slug)}/${w}`);
/** Jotoba shows JMdict's meanings in the languages JMdict has them in. */
const jotoba = (locale: string): DictionarySite => site('Jotoba', (w) => `https://jotoba.de/search/0/${w}?l=${locale}`);
/** Naver's editions of Korea's dictionary for learners, explained in each language. */
const naverLearners = (lang: string): DictionarySite =>
  site('Naver', (w) => `https://korean.dict.naver.com/ko${lang}dict/#/search?query=${w}`);
/** Naver's other bilingual dictionaries, which look Korean words up too. */
const naver = (lang: string): DictionarySite => site('Naver', (w) => `https://dict.naver.com/${lang}kodict/#/search?query=${w}`);
const hanzii = (lang: string): DictionarySite => site('Hanzii', (w) => `https://hanzii.net/search/word/${w}?hl=${lang}`);
/**
 * Wiktionary in the learner's own language, which has an entry for a French or
 * German word in its own words. It is the page for a pair where there is no
 * dedicated dictionary worth sending anyone to: the editions listed were each
 * opened with a French and a German word in October 2026 and had its entry.
 * Wiktionary in English is the language's usual one (settings.ts, featuresOf),
 * and Hindi's has neither word.
 */
const wiktionary = (edition: string): DictionarySite => site('Wiktionary', (w) => `https://${edition}.wiktionary.org/wiki/${w}`);
const WIKTIONARY_EDITIONS: Record<string, string> = {
  es: 'es', fr: 'fr', de: 'de', it: 'it', pt: 'pt', ru: 'ru', ja: 'ja', zh: 'zh', 'zh-Hant': 'zh', ko: 'ko', pl: 'pl',
  nl: 'nl', tr: 'tr', ar: 'ar', vi: 'vi', id: 'id', sv: 'sv', uk: 'uk', th: 'th',
};
const inWiktionary = (): Record<string, DictionarySite> =>
  Object.fromEntries(Object.entries(WIKTIONARY_EDITIONS).map(([native, edition]) => [native, wiktionary(edition)]));

const wordReference = (pair: string): DictionarySite => site('WordReference', (w) => `https://www.wordreference.com/${pair}/${w}`);

/** The kinds of words Japoński Pomocnik's search must be told to look among. */
const POMOCNIK_TYPES = [
  'VERB_IRREGULAR', 'VERB_AUX', 'VERB_ZURU', 'ADJECTIVE_I', 'AUX_ADJECTIVE_I', 'NAME', 'MALE_NAME', 'FEMALE_NAME',
  'COUNTER', 'ADJECTIVE_NA', 'WORK', 'COMPANY_NAME', 'PLACE', 'ORGANIZATION_NAME', 'PRODUCT_NAME', 'STATION_NAME',
  'PROPER_NOUN', 'SURNAME_NAME', 'UNCLASS_NAME', 'PERSON', 'PARTICULE', 'PREFIX', 'SUFFIX', 'ADVERB', 'ADVERB_TO',
  'VERB_RU', 'NOUN', 'NOUN_PREFIX', 'NOUN_SUFFIX', 'TEMPORAL_NOUN', 'ADVERBIAL_NOUN', 'ADJECTIVE_NO', 'ADJECTIVE_F',
  'CONJUNCTION', 'AUX', 'ADJECTIVE_TARU', 'VERB_TE', 'VERB_U', 'INTERJECTION', 'EXPRESSION', 'PRONOUN',
].map((t) => `WORD_${t}`).join(',');

export const DICTIONARY_SITES: Record<string, Record<string, DictionarySite>> = {
  ja: {
    de: site('Wadoku', (w) => `https://www.wadoku.de/search/${w}`),
    fr: site('Dictionnaire japonais', (w) => `https://www.dictionnaire-japonais.com/search.php?w=${w}&t=1`),
    es: jotoba('es-ES'),
    nl: jotoba('nl-NL'),
    sl: jotoba('sl-SI'),
    ru: site('Warodai', (w) => `https://www.warodai.ru/lookup/#${w}`),
    sv: lingea('japansk-svensk'),
    hu: lingea('japan-magyar'),
    it: site('Kotobank', (w) => `https://kotobank.jp/jaitword/${w}`),
    pt: site('Kotobank', (w) => `https://kotobank.jp/japtword/${w}`),
    pl: site('Japoński Pomocnik', (w) =>
      `https://www.japonski-pomocnik.pl/wordDictionarySearch?word=${w}&wordPlace=START_WITH&searchIn=KANJI,KANA,ROMAJI` +
      `&dictionaryTypeStringList=${POMOCNIK_TYPES}`),
    uk: lingea('японсько-украінськии'),
    tr: lingea('japonca-turkce'),
    vi: site('Mazii', (w) => `https://mazii.net/vi-VN/search/word/javi/${w}`),
    id: site('Mazii', (w) => `https://mazii.net/id-ID/search/word/jaid/${w}`),
    th: site('J-Campus', (w) => `https://j-campus.com/dic/?q=${w}`),
    ko: site('Naver', (w) => `https://ja.dict.naver.com/#/search?query=${w}`),
    zh: site('MOJi', (w) => `https://www.mojidict.com/searchText/${w}`),
    'zh-Hant': site('Mazii', (w) => `https://mazii.net/zh-TW/search/word/jatw/${w}`),
  },
  ko: {
    ...Object.fromEntries(['ja', 'zh', 'fr', 'es', 'ar', 'vi', 'th', 'id', 'ru'].map((l) => [l, naverLearners(l)])),
    // Naver's learners' dictionary has no Traditional edition; the Simplified one is the nearest.
    'zh-Hant': naverLearners('zh'),
    ...Object.fromEntries(['de', 'it', 'pt', 'tr', 'hi', 'nl', 'sv', 'hu'].map((l) => [l, naver(l)])),
    pl: lingea('koreansko-polski'),
    uk: lingea('кореисько-украінськии'),
    sl: lingea('korejsko-slovenski'),
  },
  zh: {
    de: site('LEO', (w) => `https://dict.leo.org/chinesisch-deutsch/${w}`),
    fr: site('Chine Informations', (w) => `https://chine.in/mandarin/dictionnaire/?q=${w}`),
    es: site('PONS', (w) => `https://es.pons.com/traducci%C3%B3n/chino-espa%C3%B1ol/${w}`),
    ja: site('Weblio', (w) => `https://cjjc.weblio.jp/content/${w}`),
    ko: site('Naver', (w) => `https://zh.dict.naver.com/#/search?query=${w}`),
    ru: site('BKRS', (w) => `https://bkrs.info/slovo.php?ch=${w}`),
    vi: hanzii('vi'),
    th: hanzii('th'),
    id: hanzii('id'),
    it: lingea('cinese-italiano'),
    pt: lingea('chines-portugues'),
    pl: lingea('chinsko-polski'),
    nl: lingea('chinees-nederlands'),
    sv: lingea('kinesisk-svensk'),
    hu: lingea('kinai-magyar'),
    sl: lingea('kitajsko-slovenski'),
    tr: lingea('cince-turkce'),
    hi: lingea('cinsko-hindi'),
    uk: lingea('китаисько-украінськии'),
  },
  fr: inWiktionary(),
  de: inWiktionary(),
  it: inWiktionary(),
  pt: inWiktionary(),
  th: inWiktionary(),
  hi: inWiktionary(),
  ar: inWiktionary(),
  es: {
    fr: wordReference('esfr'),
    pt: wordReference('espt'),
    it: wordReference('esit'),
    ar: wordReference('esar'),
    de: site('PONS', (w) => `https://de.pons.com/%C3%BCbersetzung/spanisch-deutsch/${w}`),
    pl: site('PONS', (w) => `https://pl.pons.com/t%C5%82umaczenie/hiszpa%C5%84ski-polski/${w}`),
    sl: site('PONS', (w) => `https://sl.pons.com/prevod/%C5%A1pan%C5%A1%C4%8Dina-sloven%C5%A1%C4%8Dina/${w}`),
    ru: site('Academic', (w) => `https://translate.academic.ru/${w}/es/ru/`),
    ja: site('Kotobank', (w) => `https://kotobank.jp/esjaword/${w}`),
    ko: site('Naver', (w) => `https://dict.naver.com/eskodict/#/search?query=${w}`),
    zh: site('Eudic', (w) => `https://www.esdict.cn/dicts/es/${w}`),
    'zh-Hant': site('Eudic', (w) => `https://www.esdict.cn/dicts/es/${w}`),
    nl: lingea('spaans-nederlands'),
    sv: lingea('spansk-svensk'),
    hu: lingea('spanyol-magyar'),
    tr: lingea('ispanyolca-turkce'),
    vi: lingea('taybannha-viet'),
    id: lingea('spanyol-indonesia'),
    hi: lingea('spanelsko-hindi'),
    uk: lingea('іспансько-украінськии'),
  },
};

/** The dictionary on the web for a language pair, or undefined where the language's usual one is the best there is. */
export function dictionarySite(target: string, native: string): DictionarySite | undefined {
  return DICTIONARY_SITES[target]?.[native];
}
