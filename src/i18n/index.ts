import { en, type Strings } from './en';
import { directionOf, localeOf, uiLanguageFor, type UiLanguage } from './languages';

export { UI_LANGUAGES, uiLanguageFor, type UiLanguage } from './languages';

/**
 * The interface's words, in the learner's own language.
 *
 * "Your language" (Settings.native) is the language a learner reads best, so
 * it decides three things: the translation under each line, the definitions,
 * and the words on the interface. Where the interface has not been written in
 * that language it is English, and so is any string a translation has not
 * reached yet.
 *
 * Chrome's own translations (_locales, chrome.i18n) always follow the
 * browser's language and cannot be pointed at another, so they are kept for
 * what only Chrome reads: the extension's name and description.
 *
 * The words are in en.ts, grouped by where they show, and each translation
 * has the same shape with any part left out. A string that needs a value is a
 * function, so each language puts the value where its grammar wants it and
 * counts in its own way.
 *
 * Read `ui` while building or updating what is on screen, never once at load:
 * its sections are refilled in place when the language changes, and
 * onUiLanguageChange says when.
 *
 * Only English is built in. Each other language is a file of its own,
 * dist/i18n/<code>.js, made from src/i18n/<code>.ts, loaded when it is chosen:
 * twenty tables in every page would be most of the page script.
 */

/** A translation: any of the English strings, in another language. */
export type Translation = { [S in keyof Strings]?: Partial<Strings[S]> };

/**
 * Where a language's words are, once its file has run: on the page's global
 * object, which is where a file loaded on its own can put them.
 */
interface Registry {
  strings?: Partial<Record<string, Translation>>;
}
const registry = (): Registry => ((globalThis as { __libregaku?: Registry }).__libregaku ??= {});

/** Make a language's words available: what each language's own file does, and tests. */
export function registerTranslation(lang: string, words: Translation): void {
  (registry().strings ??= {})[lang] = words;
}

function wordsFor(lang: UiLanguage): Translation | undefined {
  return lang === 'en' ? {} : registry().strings?.[lang];
}

/** How this page fetches a language's file: set once by each kind of page. */
let loader: ((lang: UiLanguage) => Promise<unknown>) | null = null;
/** Fetches under way, so a language asked for twice is fetched once. */
const fetching = new Map<UiLanguage, Promise<unknown>>();

export function setTranslationLoader(load: (lang: UiLanguage) => Promise<unknown>): void {
  loader = load;
}

const sections = (): Strings =>
  Object.fromEntries(Object.entries(en).map(([name, words]) => [name, { ...words }])) as Strings;

/** The words on screen, in the interface language. */
export const ui: Strings = /* @__PURE__ */ sections();

let current: UiLanguage = 'en';
const listeners = new Set<() => void>();

export function uiLanguage(): UiLanguage {
  return current;
}

/** The interface language as a locale: for Intl's dates and numbers, and for lang attributes. */
export function uiLocale(): string {
  return localeOf(current);
}

/** Whether the interface is laid out from the left or, for Arabic, from the right. */
export function uiDirection(): 'ltr' | 'rtl' {
  return directionOf(current);
}

/** The language last asked for: a file that arrives after another was asked for is not used. */
let wanted: UiLanguage = 'en';

function apply(lang: UiLanguage, words: Translation): void {
  if (lang === current) return;
  current = lang;
  for (const name of Object.keys(en) as Array<keyof Strings>) {
    Object.assign(ui[name], en[name], words[name]);
  }
  listeners.forEach((fn) => fn());
}

/**
 * Write the interface in the language for `native`, and tell whoever shows
 * it: at once where its file has been loaded, and once it arrives where not.
 */
export function setUiLanguage(native: string): void {
  void loadUiLanguage(native);
}

/**
 * The same, as something to await before drawing anything. English stays
 * when the language's file cannot be had.
 */
export async function loadUiLanguage(native: string): Promise<void> {
  const lang = uiLanguageFor(native);
  wanted = lang;
  if (!wordsFor(lang) && loader) {
    const fetch = fetching.get(lang) ?? loader(lang);
    fetching.set(lang, fetch);
    try {
      await fetch;
    } catch (e) {
      console.warn(`[libregaku] the interface in ${lang} could not be loaded:`, e);
    } finally {
      fetching.delete(lang);
    }
    if (wanted !== lang) return;   // another was asked for meanwhile
  }
  const words = wordsFor(lang);
  apply(words ? lang : 'en', words ?? {});
}

/** Called after the interface language changes, to redraw. Returns how to stop. */
export function onUiLanguageChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * A string with elements inside it, as pieces to append: `{menu}` in the
 * template is replaced by `values.menu`. The template decides where each
 * goes, because word order is the translation's to choose.
 */
export function fill(template: string, values: Record<string, string | Node>): Array<string | Node> {
  return template
    .split(/\{(\w+)\}/)
    .map((part, i) => (i % 2 ? values[part] ?? `{${part}}` : part))
    .filter((part) => part !== '');
}

/** A string by its path, "action.status", or null when there is none. */
function byPath(path: string): string | null {
  const [section, key] = path.split('.');
  const words = (ui as unknown as Record<string, Record<string, unknown> | undefined>)[section ?? ''];
  const value = words?.[key ?? ''];
  return typeof value === 'string' ? value : null;
}

const ATTRIBUTES = ['title', 'aria-label', 'placeholder'] as const;

/**
 * A page's own words, from its markup: data-i18n="action.toggleSidebar" sets
 * an element's text, and data-i18n-title, data-i18n-aria-label and
 * data-i18n-placeholder set those attributes. The markup keeps the English,
 * so the page reads right before this runs, and its lang follows.
 */
export function localize(root: Document | Element): void {
  const selector = ['[data-i18n]', ...ATTRIBUTES.map((a) => `[data-i18n-${a}]`)].join(', ');
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
    const text = el.dataset.i18n ? byPath(el.dataset.i18n) : null;
    if (text !== null) el.textContent = text;
    for (const attribute of ATTRIBUTES) {
      const path = el.getAttribute(`data-i18n-${attribute}`);
      const value = path ? byPath(path) : null;
      if (value !== null) el.setAttribute(attribute, value);
    }
  }
  const html = 'documentElement' in root ? root.documentElement : null;
  if (html) {
    html.lang = uiLocale();
    html.dir = uiDirection();
  }
}

const displayNames = new Map<string, Intl.DisplayNames | null>();
function namesIn(locale: string): Intl.DisplayNames | null {
  if (!displayNames.has(locale)) {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([locale], { type: 'language', languageDisplay: 'standard' });
    } catch {
      /* no Intl.DisplayNames: codes are shown as they are */
    }
    displayNames.set(locale, names);
  }
  return displayNames.get(locale) ?? null;
}

function nameOf(code: string, locale: string): string {
  try {
    return namesIn(locale)?.of(code) ?? code;
  } catch {
    return code;
  }
}

const capital = (s: string, locale: string): string => {
  try {
    return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1);
  } catch {
    return s;   // not a locale: a code from old or damaged storage, shown as it is
  }
};

/**
 * A language's name in the interface language, as it reads inside a sentence:
 * "Japanese", "japonés", "일본어". From Intl, so every language is named in
 * every other at no cost.
 */
export function languageName(code: string): string {
  return nameOf(code, uiLocale());
}

/** The same, as an item in a list or menu: "Japonés". */
export function languageLabel(code: string): string {
  return capital(languageName(code), uiLocale());
}

/**
 * A language being learned, as a menu item: as Intl names it, but for one
 * whose name covers another language that can be learned too. Intl calls
 * Mandarin "Chinese", and Cantonese is Chinese as well.
 */
export function learningLabel(code: string): string {
  return code === 'zh' ? ui.common.mandarin : languageLabel(code);
}

/**
 * The languages of a video's tracks, named for a sentence: each once, in the
 * order the reader's language sorts them, and past `most` a count of the
 * rest ("+24"). Netflix lists thirty-odd tracks, several to a language, and
 * their codes (pt-BR, zh-Hant) said little to anyone reading them.
 */
export function languageList(codes: readonly string[], most = 6): string[] {
  const names = [...new Set(codes.filter(Boolean).map(languageName))].sort(new Intl.Collator(uiLocale()).compare);
  return names.length > most ? [...names.slice(0, most - 1), `+${names.length - most + 1}`] : names;
}

/**
 * A language's name in itself — "Español", "한국어", "中文（简体）" — for
 * choosing your own language, which has to be findable from any interface
 * language, including one chosen by mistake. zh is Simplified Chinese there.
 */
export function ownName(code: string): string {
  const tag = code === 'zh' ? 'zh-Hans' : code;
  return capital(nameOf(tag, tag), tag);
}

/**
 * An ending's name ("past", "potential"), in the interface language. A label
 * with no name of its own is named word by word: a dictionary's tags for a
 * form ("first-person plural preterite") each have one, and a word without
 * (a verb, a rare tag) is shown as it is.
 */
export function grammarLabel(label: string): string {
  const names = ui.grammar as Record<string, string | undefined>;
  return names[label] ?? label.split(' ').map((word) => names[word] ?? word).join(' ');
}
