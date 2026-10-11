/**
 * The languages the interface is written in, apart from the words themselves,
 * so a page with words of its own (the help) can follow the interface
 * language without carrying every table (src/i18n/index.ts).
 */

/**
 * By the code "Your language" stores: every language that list offers. zh
 * is Simplified, as that setting offers it, and pt is Brazil's.
 */
export const UI_LANGUAGES = [
  'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'it', 'ja', 'ko', 'nl',
  'pl', 'pt', 'ru', 'sv', 'th', 'tr', 'uk', 'vi', 'zh', 'zh-Hant',
] as const;
export type UiLanguage = typeof UI_LANGUAGES[number];

/** Each as a locale, for Intl and for lang attributes. */
const LOCALE: Record<UiLanguage, string> = {
  en: 'en', ar: 'ar', de: 'de', es: 'es', fr: 'fr', hi: 'hi', id: 'id', it: 'it', ja: 'ja', ko: 'ko', nl: 'nl',
  pl: 'pl', pt: 'pt-BR', ru: 'ru', sv: 'sv', th: 'th', tr: 'tr', uk: 'uk', vi: 'vi', zh: 'zh-CN', 'zh-Hant': 'zh-TW',
};

/** Languages written right to left: the interface is laid out from the right in them. */
const RIGHT_TO_LEFT = new Set<UiLanguage>(['ar']);

export function directionOf(lang: UiLanguage): 'ltr' | 'rtl' {
  return RIGHT_TO_LEFT.has(lang) ? 'rtl' : 'ltr';
}

/** The interface language for a learner's own: theirs where the interface is written in it, else English. */
export function uiLanguageFor(native: string): UiLanguage {
  return (UI_LANGUAGES as readonly string[]).includes(native) ? (native as UiLanguage) : 'en';
}

/**
 * The language a browser locale is written in, as "Your language" names it:
 * Traditional Chinese for Taiwan, Hong Kong and Macau, else the base language.
 */
export function languageOfLocale(tag: string): string {
  const lower = tag.toLowerCase();
  if (/^zh-(hant|tw|hk|mo)\b/.test(lower)) return 'zh-Hant';
  return lower.split(/[-_]/)[0] ?? '';
}

function browserLocale(): string {
  try {
    return navigator.language || '';
  } catch {
    return '';
  }
}

/**
 * The interface language as a locale. The browser's own where it is the same
 * language — en-GB's dates, es-MX's numbers — and otherwise the language's.
 */
export function localeOf(lang: UiLanguage, browser = browserLocale()): string {
  return browser && languageOfLocale(browser) === lang ? browser : LOCALE[lang];
}
