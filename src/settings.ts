import arabLeagueFlag from './flags/arab-league.svg';
import { defaultDeck } from './anki/model';
import { languageOfLocale } from './i18n/languages';

/**
 * Settings, with defaults that work before anything is configured.
 *
 * Reads are cached and kept live by a storage listener, so hot paths never
 * await. Nothing here blocks rendering: a value that has not loaded yet falls
 * back to its default rather than delaying a frame.
 */

/**
 * Languages with a dictionary behind lookups, and which one (src/dict/sources.ts).
 * A language with none has no lookups at all, rather than every Spanish word
 * answered from a Japanese dictionary.
 */
export const DICTIONARIES: Record<string, string> = {
  ja: 'jmdict',
  ko: 'wty-ko-en',
  zh: 'cedict',
  yue: 'canto',
  es: 'wty-es-en',
  fr: 'wty-fr-en',
  de: 'wty-de-en',
};

/**
 * The dictionary for a language being learned, and which edition of it: the
 * one with definitions in the learner's language where it comes in several,
 * as JMdict does. The others are written in English only.
 */
export function dictionaryOf(
  lang: string, s: Pick<Settings, 'native' | 'definitions'>,
): { source: string; edition: string } | null {
  const source = DICTIONARIES[lang];
  if (!source) return null;
  return { source, edition: source === 'jmdict' ? jmdictEditionFor(definitionLanguage(s)) : 'en' };
}

/**
 * Dictionaries in the learner's own language where a language's own
 * (DICTIONARIES) is in another, by the language learned and then the
 * learner's. Only those worth the download: most of Wiktionary's editions
 * other than the English hold a few hundred words of these languages.
 */
export const OWN_DICTIONARIES: Record<string, Record<string, string>> = {
  // Wiktionary in Chinese and in Korean, which JMdict has no edition in.
  ja: { zh: 'wty-ja-zh', 'zh-Hant': 'wty-ja-zh', ko: 'wty-ja-ko' },
  // Korea's dictionary for learners, in each language it explains words in (Chinese: simplified).
  ko: Object.fromEntries(['ar', 'es', 'fr', 'id', 'ja', 'ru', 'th', 'vi', 'zh', 'zh-Hant'].map((l) => [l, 'krdict'])),
  // CFDICT (by way of CxDICT) and HanDeDict, as CC-CEDICT is written; Wiktionary in Japanese and Korean.
  zh: { fr: 'cxdict-fr', de: 'handedict', ja: 'wty-zh-ja', ko: 'wty-zh-ko' },
  // Wiktionary in French, Chinese and Polish: each nine words in ten of the commonest Spanish.
  // WikDict for German, Portuguese and Italian: Wiktionary's files in them hold a few thousand words, and WikDict's 10 to 12 thousand.
  es: {
    fr: 'wty-es-fr', zh: 'wty-es-zh', 'zh-Hant': 'wty-es-zh', pl: 'wty-es-pl',
    de: 'wikdict-es-de', pt: 'wikdict-es-pt', it: 'wikdict-es-it',
  },
  // French Wiktionary holds nearly all of German (98% of the English file's size); the rest each a quarter to a third of it.
  de: {
    fr: 'wty-de-fr', ru: 'wty-de-ru', zh: 'wty-de-zh', 'zh-Hant': 'wty-de-zh',
    // WikDict: 24,000 to 55,000 words each, of the 1% to 3% of the English file Wiktionary has in these.
    es: 'wikdict-de-es', pt: 'wikdict-de-pt', it: 'wikdict-de-it',
  },
  // Wiktionary in Chinese, Turkish, Vietnamese, Russian, Thai, Dutch and Polish: 13 to 30% of the English file's size.
  fr: {
    zh: 'wty-fr-zh', 'zh-Hant': 'wty-fr-zh', tr: 'wty-fr-tr', vi: 'wty-fr-vi', ru: 'wty-fr-ru', th: 'wty-fr-th',
    nl: 'wty-fr-nl', pl: 'wty-fr-pl',
    // WikDict: 29,000 to 69,000 words each, of the 3% to 5% of the English file Wiktionary has in these.
    es: 'wikdict-fr-es', pt: 'wikdict-fr-pt', it: 'wikdict-fr-it',
  },
};

/**
 * The dictionary in the learner's own language for a language pair, or null
 * where there is none. A word is looked up there first, and in the
 * language's own dictionary (dictionaryOf) when it is not there: a Japanese
 * word is explained in Chinese where Chinese Wiktionary has it, and in
 * English where it does not.
 */
export function ownDictionaryOf(lang: string, s: Pick<Settings, 'native'>): { source: string; edition: string } | null {
  const source = OWN_DICTIONARIES[lang]?.[s.native];
  return source ? { source, edition: s.native } : null;
}

/**
 * The languages that can be learned. `flag` is the player bar's badge: a
 * country standing for a language, so the one most learners of it mean —
 * Brazil for Portuguese, as most courses do. Arabic has no country's flag
 * here, so its badge is the Arab League's (`flagSvg`), which is no one state's.
 *
 * `tier` is what the language gets (src/morphology/index.ts): 2, an analyser
 * that reads its grammar; 1, the browser's word boundaries and a dictionary
 * that lists every inflected form; 0, boundaries alone — no dictionary
 * forms, so no lookups and no matching a word to its card.
 */
export const TARGET_LANGUAGES: Array<{ code: string; label: string; tier: 0 | 1 | 2; flag?: string; flagSvg?: string }> = [
  { code: 'ja', label: 'Japanese', tier: 2, flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', tier: 2, flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', tier: 2, flag: '🇨🇳' },
  // Its own language, not a kind of Chinese: what is said differs, and so are its readings, its words and its decks.
  { code: 'yue', label: 'Cantonese', tier: 2, flag: '🇭🇰' },
  { code: 'es', label: 'Spanish', tier: 1, flag: '🇪🇸' },
  { code: 'fr', label: 'French', tier: 1, flag: '🇫🇷' },
  { code: 'de', label: 'German', tier: 1, flag: '🇩🇪' },
  { code: 'it', label: 'Italian', tier: 0, flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese', tier: 0, flag: '🇧🇷' },
  { code: 'th', label: 'Thai', tier: 0, flag: '🇹🇭' },
  { code: 'en', label: 'English', tier: 0, flag: '🇺🇸' },
  { code: 'hi', label: 'Hindi', tier: 0, flag: '🇮🇳' },
  { code: 'ar', label: 'Arabic', tier: 0, flagSvg: arabLeagueFlag },
  { code: 'tr', label: 'Turkish', tier: 0, flag: '🇹🇷' },
];

/**
 * What a language's analysis and dictionary give the interface, so a button
 * that only makes sense for one language is asked about by what it needs,
 * never by the language's name (AGENTS.md, invariant 4).
 */
export interface LanguageFeatures {
  /**
   * Readings over words — the Furigana setting, its button in the bar, the R
   * key — by the name the language has for them, or false where its script
   * needs none.
   */
  readings: 'furigana' | 'pinyin' | 'jyutping' | false;
  /** The characters a word is written with, on its card, by what the language calls them. */
  characters: 'kanji' | 'hanzi' | false;
  /** A dictionary site to open a word in, from its card. */
  dictionary?: { name: string; url: (word: string) => string };
  /** Definitions in more than one language, so a choice of which. */
  definitions: boolean;
  /**
   * The ways the language is written, where a video can have subtitles in
   * more than one: each a tag a subtitle track is matched by
   * (trackLanguageMatch) and named by (languageLabel), the first being the
   * one used until the learner picks another (targetVariant).
   */
  scripts?: readonly string[];
  /** Articles and pronouns that are words of their own: der, le, yo. Its dictionary says which they are. */
  articles?: boolean;
}

const LANGUAGE_FEATURES: Record<string, LanguageFeatures> = {
  ja: {
    readings: 'furigana',
    characters: 'kanji',
    definitions: true,
    dictionary: { name: 'Jisho', url: (w) => `https://jisho.org/search/${encodeURIComponent(w)}` },
  },
  ko: {
    readings: false,
    characters: false,
    definitions: false,
    dictionary: { name: 'Naver', url: (w) => `https://korean.dict.naver.com/koendict/#/search?query=${encodeURIComponent(w)}` },
  },
  zh: {
    readings: 'pinyin',
    characters: 'hanzi',
    definitions: false,
    // Simplified first: what most learners of Mandarin study, and what HSK and most courses use.
    scripts: ['zh-Hans', 'zh-Hant'],
    dictionary: { name: 'MDBG', url: (w) => `https://www.mdbg.net/chinese/dictionary?page=worddict&wdqb=${encodeURIComponent(w)}` },
  },
  yue: {
    readings: 'jyutping',
    characters: 'hanzi',
    definitions: false,
    dictionary: { name: 'words.hk', url: (w) => `https://words.hk/zidin/wan/?q=${encodeURIComponent(w)}` },
  },
  es: {
    readings: false,
    characters: false,
    definitions: false,
    articles: true,
    dictionary: { name: 'SpanishDict', url: (w) => `https://www.spanishdict.com/translate/${encodeURIComponent(w)}` },
  },
  fr: {
    readings: false,
    characters: false,
    definitions: false,
    articles: true,
    dictionary: { name: 'Wiktionary', url: (w) => `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}#French` },
  },
  de: {
    readings: false,
    characters: false,
    definitions: false,
    articles: true,
    dictionary: { name: 'Wiktionary', url: (w) => `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}#German` },
  },
};

const NO_FEATURES: LanguageFeatures = { readings: false, characters: false, definitions: false };

export function featuresOf(lang: string): LanguageFeatures {
  return LANGUAGE_FEATURES[lang] ?? NO_FEATURES;
}

/**
 * Languages the dictionary can explain words in.
 *
 * Constrained by what JMdict actually publishes rather than by what would be
 * nice: these are the editions that exist. Offering a language with no edition
 * behind it would mean silently serving English while claiming otherwise.
 * Hungarian and Slovenian are here for that reason alone — as translations of
 * a subtitle they are rare, and that list is TRANSLATION_LANGUAGES.
 */
export const DEFINITION_LANGUAGES: Array<{ code: string; label: string; jmdict: string }> = [
  { code: 'en', label: 'English', jmdict: 'eng' },
  { code: 'nl', label: 'Dutch', jmdict: 'dut' },
  { code: 'fr', label: 'French', jmdict: 'fre' },
  { code: 'de', label: 'German', jmdict: 'ger' },
  { code: 'hu', label: 'Hungarian', jmdict: 'hun' },
  { code: 'ru', label: 'Russian', jmdict: 'rus' },
  { code: 'sl', label: 'Slovenian', jmdict: 'slv' },
  { code: 'es', label: 'Spanish', jmdict: 'spa' },
  { code: 'sv', label: 'Swedish', jmdict: 'swe' },
];

/** JMdict's three-letter code for a definitions language, or English. */
export function jmdictEditionFor(code: string): string {
  return DEFINITION_LANGUAGES.find((l) => l.code === code)?.jmdict ?? 'eng';
}

/**
 * Languages the translation under a subtitle can be in: the second subtitle
 * track the site carries. Any language a site translates into could be here;
 * these are the ones most learners speak, Japanese, Chinese and Korean among
 * them, so the same extension serves someone learning English from Japanese.
 */
export const TRANSLATION_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ru', label: 'Russian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'zh-Hant', label: 'Chinese (Traditional)' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'id', label: 'Indonesian' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
];

/**
 * The browser's language, as one of TRANSLATION_LANGUAGES: what "Your
 * language" is until someone chooses. Traditional Chinese for Taiwan, Hong
 * Kong and Macau; English where the browser's language is not on the list.
 */
export function browserLanguage(tag = browserTag()): string {
  const own = languageOfLocale(tag);
  return TRANSLATION_LANGUAGES.some((l) => l.code === own) ? own : 'en';
}

function browserTag(): string {
  try {
    return chrome.i18n.getUILanguage();
  } catch {
    return 'en';   // not in an extension context (tests)
  }
}

/**
 * How well a subtitle track's language answers for `want`: 2 for the language
 * itself, 1 for the same language in another script, 0 for none; more is
 * nearer. A site labels Chinese tracks by script (zh-Hans, zh-Hant) or by
 * place (zh-CN, zh-TW, zh-HK), and zh, as a language of your own, is Simplified.
 */
export function trackLanguageMatch(track: string, want: string): number {
  // Cantonese, written down, is not Mandarin, whatever its tag starts with.
  const cantonese = (tag: string): boolean => /^(yue|zh-yue)\b/i.test(tag);
  if (cantonese(want)) {
    if (cantonese(track)) return 2;
    // Few videos carry written Cantonese. What Cantonese speech is subtitled
    // in is written Chinese, and it is read aloud in Cantonese all the same:
    // Hong Kong's first, then Traditional, then any.
    const t = track.toLowerCase();
    if (!/^zh\b/.test(t)) return 0;
    if (/^zh-(hant-)?(hk|mo)\b/.test(t)) return 1.5;
    return /^zh-(hant|tw)\b/.test(t) ? 1 : 0.5;
  }
  if (cantonese(track)) return 0;
  const scriptOf = (tag: string): string | null => {
    const t = tag.toLowerCase();
    if (!/^zh\b/.test(t)) return null;
    return /^zh-(hant|tw|hk|mo)\b/.test(t) ? 'hant' : 'hans';
  };
  const wanted = scriptOf(want);
  if (wanted) {
    const got = scriptOf(track);
    return got === wanted ? 2 : got ? 1 : 0;
  }
  return track.startsWith(want) ? 2 : 0;
}

/** Where one language's cards go, and which deck says what is known in it. */
export interface LanguageDecks {
  deck: string;
  statusScope: string;
}

export interface Settings {
  /** BCP-47 of the language being learned. */
  target: string;
  /**
   * How each language written in more than one script is being learned, by
   * the language's code: Chinese as Simplified (zh-Hans) or Traditional (zh-Hant).
   * A language with nothing here is learned in the first of its scripts.
   * Read it through targetVariant().
   */
  scripts: Record<string, string>;
  /**
   * BCP-47 of the learner's own language: the translation under the subtitle,
   * the definitions wherever the dictionary is written in it, and the words
   * on the interface wherever it is (src/i18n). The browser's until chosen.
   */
  native: string;
  /**
   * The language definitions are written in when the dictionary has none in
   * `native` (DEFINITION_LANGUAGES). Read it through definitionLanguage().
   */
  definitions: string;
  /** False until the user has been through setup once. */
  configured: boolean;
  /**
   * How the lookup card opens: resting on a word, resting on it with Shift
   * held — so the cursor can cross a line without opening anything — or a click.
   */
  interaction: 'hover' | 'shift' | 'click';
  /** Grace period before a hover opens a card, in ms. */
  hoverDelay: number;
  /** Pause playback while the cursor is on a subtitle. */
  hoverPause: boolean;
  /** Ruby over unknown words only, always, or never. */
  ruby: 'unknown' | 'always' | 'never';
  /**
   * Blur the subtitle until the cursor is on it — listening practice. The
   * second line is left alone; ↑ hides that.
   */
  blurPrimary: boolean;
  /** Preview definitions on hover in the transcript panel. */
  sidebarHover: boolean;
  /** List the video's other lines with the word on its lookup card. */
  lookupElsewhere: boolean;
  /** A menu beside Add, for adding the card to another deck. */
  cardDeckMenu: boolean;
  /** Leave Add to Anki, and the deck menu beside it, off the card. */
  cardHideAdd: boolean;
  /** The word's kanji on its card, where the language has them. */
  cardKanji: boolean;
  /** The player bar names the language being learned by its flag, or by its code. */
  languageBadge: 'flag' | 'code';
  /**
   * The flag emoji the learner picked for the badge in place of the
   * language's own, by the language's code (src/flags.ts). A language with
   * none shows its own, and a flag picked for one never follows to another.
   */
  badgeFlag: Record<string, string>;
  /**
   * Hand marks — Known, Track, Ignore — kept in Anki, where they reach every
   * device. Off, they stay in this browser, waiting to go in if it comes on.
   */
  marksInAnki: boolean;
  /**
   * Where new cards go. One specific deck. Empty until one is chosen, and the
   * language's own deck is used till then: read it through cardDeck().
   */
  deck: string;
  /** Put a recording of the word on each new card, when one exists. */
  cardAudio: boolean;
  /** Record the line itself onto each new card; it plays once more while it records. */
  cardSentenceAudio: boolean;
  /** A still from the line on each new card, where the site's video can be copied. */
  cardScreenshot: boolean;
  /**
   * Which deck is read to decide what you already know. Empty means the whole
   * collection.
   *
   * Separate from `deck` on purpose. A learner's known words live all over
   * their collection — a core deck, an old textbook deck, a JLPT deck — while
   * new cards belong in one place. Using a single setting for both forces a
   * bad trade: scope status to the deck new cards go to and thousands of known words
   * read as unknown, or dump new cards into a broad parent deck.
   *
   * Anki's `deck:` search includes subdecks, so choosing "Japanese" covers
   * "Japanese::Netflix" and everything beside it.
   */
  statusScope: string;
  /**
   * `deck` and `statusScope` for each language that has been learned, by its
   * code. Changing `target` puts the ones in use away here and brings the new
   * language's back, so Spanish cards never land in the Japanese deck. Written
   * by setSetting alone; everything else reads `deck` and `statusScope`.
   */
  decks: Record<string, LanguageDecks>;
  /** Show comprehension and per-line counts in the transcript panel. */
  sidebarStats: boolean;
  /**
   * Keep the line being spoken in view as the video plays.
   *
   * Scrolling the transcript yourself pauses this — reading ahead is the
   * point of having the script — and a button brings the current line back.
   */
  sidebarFollow: boolean;
  /** Draw the underlines at all. Off leaves plain subtitles for someone who only wants to watch. */
  underlines: boolean;
  /** Underline known words too, rather than leaving them bare. */
  markKnown: boolean;
  /**
   * Underline articles and pronouns as words to learn, where the language has
   * them (featuresOf().articles): der, le, yo. Off, they are drawn and looked
   * up like any word and never counted as new, as a Japanese particle is.
   */
  underlineGrammar: boolean;
  /**
   * The underline for each word status, as #rrggbb. The subtitle, the
   * transcript and the popup's mark buttons all take theirs from these.
   */
  colorUnknown: string;
  colorLearning: string;
  colorTracking: string;
  colorKnown: string;
  /**
   * Show a native-language line beneath the target one.
   *
   * Only possible when a whole second track can be fetched. Reading rendered
   * captions gives one line at a time and no way to ask for another language,
   * so this has no effect there.
   */
  dualSubtitles: boolean;
  /** Draw the subtitles over the video. Off leaves the header, the transcript and the panel. */
  showSubtitles: boolean;
  /**
   * Subtitle text size, as a percentage of the default. The default is
   * relative to the viewport, so both hold their proportion in fullscreen.
   */
  subtitleSize: number;
  /**
   * How far up from the bottom of the player the line sits, as a percentage
   * of its height. A floor rather than a fixed place: sharing the player with
   * another subtitle extension still stacks our line above theirs.
   */
  subtitleBottom: number;
  /**
   * Whether the transcript panel is showing.
   *
   * Both the default and the remembered state, deliberately as one value: it
   * opens on arrival, S toggles it, and the toggle sticks. Two settings — a
   * default and a last-used — would only disagree with each other.
   */
  sidebarOpen: boolean;
  /**
   * The bar across the top of the player. Hidden until the cursor nears the
   * top, so it costs no screen while watching.
   */
  headerBar: boolean;
  /** Keep that bar down instead of letting it hide — the lock in the bar. */
  headerPinned: boolean;
  /**
   * The player's letter keys (A, K, R, H, B, S) act on their own. Off, each
   * needs Alt+Shift, so typing or speaking over the page sets nothing off
   * (WCAG 2.1.4). The arrows are the same either way.
   */
  singleKeys: boolean;
}

export const DEFAULTS: Settings = {
  target: 'ja',
  scripts: {},
  native: browserLanguage(),
  definitions: 'en',
  configured: false,
  interaction: 'hover',
  hoverDelay: 220,
  hoverPause: true,
  ruby: 'unknown',
  blurPrimary: false,
  sidebarHover: true,
  lookupElsewhere: true,
  cardDeckMenu: false,
  cardHideAdd: false,
  cardKanji: true,
  languageBadge: 'flag',
  badgeFlag: {},
  marksInAnki: true,
  deck: '',
  cardAudio: true,
  cardSentenceAudio: false,
  cardScreenshot: true,
  statusScope: '',
  decks: {},
  sidebarStats: true,
  sidebarFollow: true,
  underlines: true,
  markKnown: false,
  underlineGrammar: false,
  colorUnknown: '#e5806c',
  colorLearning: '#d9a64a',
  colorTracking: '#a78bfa',
  colorKnown: '#63af97',
  dualSubtitles: true,
  showSubtitles: true,
  subtitleSize: 85,
  subtitleBottom: 12,
  sidebarOpen: true,
  headerBar: true,
  headerPinned: false,
  singleKeys: true,
};

/** Furigana's three settings in the order the top bar and R step through them: off, new words, all. */
const RUBY_ORDER: ReadonlyArray<Settings['ruby']> = ['never', 'unknown', 'always'];

export function nextRuby(mode: Settings['ruby']): Settings['ruby'] {
  return RUBY_ORDER[(RUBY_ORDER.indexOf(mode) + 1) % RUBY_ORDER.length] ?? 'unknown';
}

const KEY = 'libregaku.settings';

let cached: Settings = { ...DEFAULTS };
let loaded = false;
/**
 * `here` is true when the change was made in this page, false when it arrived
 * from another tab or the options page. Most listeners ignore it; the panel's
 * open state uses it so that closing the panel in one tab does not close it
 * in every other tab too.
 */
type Listener = (s: Settings, here: boolean) => void;
const listeners = new Set<Listener>();

export function settings(): Settings {
  return cached;
}

export async function loadSettings(): Promise<Settings> {
  if (loaded) return cached;
  try {
    const got = await chrome.storage.sync.get(KEY);
    cached = withDefaults(got[KEY] as Partial<Settings> | undefined);
  } catch {
    cached = { ...DEFAULTS };
  }
  loaded = true;
  return cached;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  cached = withDecks(cached, { ...cached, [key]: value });
  listeners.forEach((fn) => fn(cached, true));
  try {
    await chrome.storage.sync.set({ [KEY]: cached });
  } catch {
    /* in-memory value still applies for this session */
  }
}

export function onSettingsChange(fn: Listener): void {
  listeners.add(fn);
}

/**
 * Stored settings over the defaults. Definitions used to follow the
 * translation language, so one chosen before they were apart is kept.
 */
/**
 * The language definitions are written in: the learner's own, where the
 * dictionary has definitions in it, and otherwise the one chosen for them.
 * One setting for most people, and a second only where it is needed.
 */
export function definitionLanguage(s: Pick<Settings, 'native' | 'definitions'>): string {
  if (DEFINITION_LANGUAGES.some((l) => l.code === s.native)) return s.native;
  return DEFINITION_LANGUAGES.some((l) => l.code === s.definitions) ? s.definitions : 'en';
}

export function withDefaults(stored: Partial<Settings> | undefined): Settings {
  const out = { ...DEFAULTS, ...stored };
  // A colour that is not one would paint no underline at all.
  for (const key of UNDERLINE_KEYS) {
    if (!/^#[0-9a-f]{6}$/i.test(out[key])) out[key] = DEFAULTS[key];
  }
  out.decks = decksFrom(out.decks);
  out.badgeFlag = flagsFrom(out.badgeFlag, out.target);
  out.scripts = scriptsFrom(out.scripts);
  return out;
}

/** The script picked for each language, with anything that is not one of that language's left out. */
function scriptsFrom(stored: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!stored || typeof stored !== 'object') return out;
  for (const [lang, script] of Object.entries(stored as Record<string, unknown>)) {
    if (typeof script === 'string' && featuresOf(lang).scripts?.includes(script)) out[lang] = script;
  }
  return out;
}

/** What the video shows: the subtitles and their translation, the subtitles alone, or neither. */
export type SubtitleView = 'both' | 'subtitles' | 'off';

export function subtitleView(s: Pick<Settings, 'showSubtitles' | 'dualSubtitles'>): SubtitleView {
  return !s.showSubtitles ? 'off' : s.dualSubtitles ? 'both' : 'subtitles';
}

/** The settings for the next view, the one the header button and ↑ step to: translation off, subtitles off, then both on. */
export function nextSubtitleView(s: Pick<Settings, 'showSubtitles' | 'dualSubtitles'>): Pick<Settings, 'showSubtitles' | 'dualSubtitles'> {
  switch (subtitleView(s)) {
    case 'both': return { showSubtitles: true, dualSubtitles: false };
    case 'subtitles': return { showSubtitles: false, dualSubtitles: false };
    default: return { showSubtitles: true, dualSubtitles: true };
  }
}

/**
 * The language being learned as its subtitles should be written: the
 * language itself, or, where it is written more than one way, the script the
 * learner picked — Simplified Chinese (zh-Hans) until they pick Traditional
 * (zh-Hant). What a video's tracks are matched against; decks, marks and
 * the dictionary go by the language alone.
 */
export function targetVariant(s: Pick<Settings, 'target' | 'scripts'>): string {
  const offered = featuresOf(s.target).scripts;
  if (!offered?.length) return s.target;
  const picked = s.scripts[s.target];
  return picked && offered.includes(picked) ? picked : offered[0] ?? s.target;
}

/**
 * The flag picked for each language, with anything that is not one left out.
 * It was once one flag for every language: that one goes to the language
 * being learned, so nobody loses their pick.
 */
function flagsFrom(stored: unknown, target: string): Record<string, string> {
  if (typeof stored === 'string') return stored ? { [target]: stored } : {};
  const out: Record<string, string> = {};
  if (!stored || typeof stored !== 'object') return out;
  for (const [lang, flag] of Object.entries(stored as Record<string, unknown>)) {
    if (typeof flag === 'string' && flag) out[lang] = flag;
  }
  return out;
}

/** The decks kept for each language, with anything that is not one left out. */
function decksFrom(stored: unknown): Record<string, LanguageDecks> {
  const out: Record<string, LanguageDecks> = {};
  if (!stored || typeof stored !== 'object') return out;
  for (const [lang, kept] of Object.entries(stored as Record<string, Partial<LanguageDecks> | null>)) {
    if (!kept || typeof kept !== 'object') continue;
    out[lang] = {
      deck: typeof kept.deck === 'string' ? kept.deck : '',
      statusScope: typeof kept.statusScope === 'string' ? kept.statusScope : '',
    };
  }
  return out;
}

/**
 * A change to the settings, with each language's decks kept in step.
 *
 * The decks in use are always written down under the language they are for.
 * When the language changes, the one being left keeps what it had and the
 * one arrived at gets its own back — none, the first time, so the first
 * card goes to that language's own deck (cardDeck) rather than to another
 * language's.
 */
export function withDecks(before: Settings, after: Settings): Settings {
  if (after.target === before.target) {
    const kept = after.decks[after.target];
    if (kept?.deck === after.deck && kept.statusScope === after.statusScope) return after;
    // A language never given a deck has nothing to keep yet.
    if (!kept && !after.deck && !after.statusScope) return after;
    return { ...after, decks: { ...after.decks, [after.target]: { deck: after.deck, statusScope: after.statusScope } } };
  }
  const decks = { ...before.decks, [before.target]: { deck: before.deck, statusScope: before.statusScope } };
  const next = decks[after.target] ?? { deck: '', statusScope: '' };
  return { ...after, deck: next.deck, statusScope: next.statusScope, decks };
}

/**
 * The deck new cards go to: the one chosen, or — until one is — the
 * language's own, Libregaku-JA and the like. A deck per language by default,
 * so that cards in two languages never land in one deck unless the learner
 * puts them there. The language's own deck may not exist yet: its first card
 * makes it (readyDeck in src/anki/deck.ts).
 */
export function cardDeck(s: Pick<Settings, 'deck' | 'target'>): string {
  return s.deck || defaultDeck(s.target);
}

/** The settings that hold an underline colour, and the status each one marks. */
export const UNDERLINES = {
  colorUnknown: 'unknown',
  colorLearning: 'learning',
  colorTracking: 'tracking',
  colorKnown: 'known',
} as const;
export type UnderlineKey = keyof typeof UNDERLINES;
const UNDERLINE_KEYS = Object.keys(UNDERLINES) as UnderlineKey[];

/**
 * The underline colours as CSS custom properties — --lg-unknown and so on —
 * for the host of a shadow root. They inherit across the shadow boundary, so
 * one element carries them to everything inside.
 */
export function underlineVars(s: Settings): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of UNDERLINE_KEYS) vars[`--lg-${UNDERLINES[key]}`] = s[key];
  return vars;
}

/** Put underline colours on an element, from underlineVars. */
export function applyVars(el: HTMLElement, vars: Record<string, string>): void {
  for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, value);
}

function same(a: Settings, b: Settings): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Settings>;
  for (const k of keys) {
    if (a[k] === b[k]) continue;
    // The settings that are not plain values, each language's decks and flags: compared by what they hold.
    if (typeof a[k] !== 'object' || JSON.stringify(a[k]) !== JSON.stringify(b[k])) return false;
  }
  return true;
}

// Keep every tab in step when a setting changes anywhere.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[KEY]) return;
    const next = withDefaults(changes[KEY].newValue as Partial<Settings> | undefined);
    // This tab's own write echoes back here after setSetting has already
    // applied and announced it. Announcing it twice ran every listener twice —
    // including the one that re-reads the whole Anki collection.
    if (same(next, cached)) return;
    cached = next;
    listeners.forEach((fn) => fn(cached, false));
  });
} catch {
  /* not in an extension context (tests) */
}
