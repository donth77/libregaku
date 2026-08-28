/**
 * Interface language.
 *
 * Three languages are in play and they answer different questions:
 *
 *   target   what is being learned          — chosen, drives the analyser
 *   native   what definitions appear in     — chosen, selects a JMdict edition
 *   ui       what the interface reads in    — this file
 *
 * The UI one is not a setting, because the browser already has that
 * preference and Chrome will honour it for us: with `default_locale` in the
 * manifest and `_locales/<lang>/messages.json` files present, `getMessage`
 * resolves against the browser's language and falls back to English on its
 * own. Adding a language becomes a data task rather than a code change.
 *
 * Deliberately not tied to `native`. Someone learning Japanese with Dutch
 * definitions may still want an English interface — tooling is often used in a
 * lingua franca — and forcing them together would make one choice impossible.
 *
 * Only English exists today, so this reports what it would use rather than
 * pretending to translate.
 */

export function uiLanguage(): string {
  try {
    return chrome.i18n?.getUILanguage?.() ?? 'en';
  } catch {
    return 'en';
  }
}

/** Locales with a message file. Grows as translations are contributed. */
export const TRANSLATED = ['en'];

export function uiLanguageSupported(): boolean {
  const base = uiLanguage().split('-')[0] ?? 'en';
  return TRANSLATED.includes(base);
}

/**
 * Look up a translated string, falling back to the text supplied at the call
 * site. The fallback is the English copy itself, so nothing reads as a missing
 * key while the message files are incomplete.
 */
export function t(key: string, fallback: string): string {
  try {
    return chrome.i18n?.getMessage?.(key) || fallback;
  } catch {
    return fallback;
  }
}
