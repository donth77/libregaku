/**
 * Settings, with defaults that work before anything is configured.
 *
 * Reads are cached and kept live by a storage listener, so hot paths never
 * await. Nothing here blocks rendering: a value that has not loaded yet falls
 * back to its default rather than delaying a frame.
 */

/**
 * Languages the segmenter can do more than find boundaries for.
 *
 * Japanese only, for now. Lindera also ships ko-dic and cc-cedict, but their
 * feature columns are laid out differently from IPADIC's and the analyser
 * reads IPADIC's positions, so Chinese came out with English glosses as its
 * "readings" and Korean with part-of-speech tags as lemmas. Each needs its own
 * column mapping before it can be offered as more than boundaries.
 */
export const TIER2_LANGS: Record<string, string> = {
  ja: 'ipadic',
};

/**
 * Languages with a dictionary behind lookups. JMdict is Japanese; offering
 * lookups in any other language would answer every Spanish word from a
 * Japanese dictionary.
 */
export const DICTIONARIES: Record<string, string> = {
  ja: 'jmdict',
};

/**
 * The languages that can be learned. `flag` is the player bar's badge: a
 * country standing for a language, so the one most learners of it mean —
 * Brazil for Portuguese, as most courses do.
 */
export const TARGET_LANGUAGES: Array<{ code: string; label: string; tier: 0 | 1 | 2; flag: string }> = [
  { code: 'ja', label: 'Japanese', tier: 2, flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', tier: 0, flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese', tier: 0, flag: '🇨🇳' },
  { code: 'es', label: 'Spanish', tier: 0, flag: '🇪🇸' },
  { code: 'fr', label: 'French', tier: 0, flag: '🇫🇷' },
  { code: 'de', label: 'German', tier: 0, flag: '🇩🇪' },
  { code: 'it', label: 'Italian', tier: 0, flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese', tier: 0, flag: '🇧🇷' },
  { code: 'th', label: 'Thai', tier: 0, flag: '🇹🇭' },
];

/**
 * What a language's analysis and dictionary give the interface, so a button
 * that only makes sense for one language is asked about by what it needs,
 * never by the language's name (AGENTS.md, invariant 4).
 */
export interface LanguageFeatures {
  /** Readings over words: the Furigana setting, its button in the bar, the R key. */
  readings: boolean;
  /** The characters a word is written with, on its card. */
  characters: boolean;
  /** A dictionary site to open a word in, from its card. */
  dictionary?: { name: string; url: (word: string) => string };
  /** Definitions in more than one language, so a choice of which. */
  definitions: boolean;
}

const LANGUAGE_FEATURES: Record<string, LanguageFeatures> = {
  ja: {
    readings: true,
    characters: true,
    definitions: true,
    dictionary: { name: 'Jisho', url: (w) => `https://jisho.org/search/${encodeURIComponent(w)}` },
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
  { code: 'zh', label: 'Chinese' },
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

export interface Settings {
  /** BCP-47 of the language being learned. */
  target: string;
  /** BCP-47 of the language to show translations in: the second subtitle line. */
  native: string;
  /** The language the dictionary explains words in (DEFINITION_LANGUAGES). */
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
  /**
   * Track beside Known and Ignore on the card. Off by default: beside Add it
   * was taken for Add, and a purple underline with no card is for few.
   */
  cardTrack: boolean;
  /** Known and Ignore beside the word on its card. */
  cardMarks: boolean;
  /** A menu beside Add, for adding the card to another deck. */
  cardDeckMenu: boolean;
  /** The button for a card of the whole line. */
  cardAddLine: boolean;
  /** The word's kanji on its card, where the language has them. */
  cardKanji: boolean;
  /** The player bar names the language being learned by its flag, or by its code. */
  languageBadge: 'flag' | 'code';
  /**
   * Hand marks — Known, Track, Ignore — kept in Anki, where they reach every
   * device. Off, they stay in this browser, waiting to go in if it comes on.
   */
  marksInAnki: boolean;
  /**
   * Where new cards go. One specific deck.
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
  /** Show comprehension and per-line counts in the transcript panel. */
  sidebarStats: boolean;
  /**
   * Keep the line being spoken in view as the video plays.
   *
   * Scrolling the transcript yourself pauses this — reading ahead is the
   * point of having the script — and a button brings the current line back.
   */
  sidebarFollow: boolean;
  /** Underline known words too, rather than leaving them bare. */
  markKnown: boolean;
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
}

export const DEFAULTS: Settings = {
  target: 'ja',
  native: 'en',
  definitions: 'en',
  configured: false,
  interaction: 'hover',
  hoverDelay: 220,
  hoverPause: true,
  ruby: 'unknown',
  blurPrimary: false,
  sidebarHover: true,
  lookupElsewhere: true,
  cardTrack: false,
  cardMarks: true,
  cardDeckMenu: false,
  cardAddLine: true,
  cardKanji: true,
  languageBadge: 'flag',
  marksInAnki: true,
  deck: '',
  cardAudio: true,
  cardSentenceAudio: true,
  cardScreenshot: true,
  statusScope: '',
  sidebarStats: true,
  sidebarFollow: true,
  markKnown: false,
  colorUnknown: '#e5806c',
  colorLearning: '#d9a64a',
  colorTracking: '#a78bfa',
  colorKnown: '#63af97',
  dualSubtitles: true,
  subtitleSize: 100,
  subtitleBottom: 12,
  sidebarOpen: true,
  headerBar: true,
  headerPinned: false,
};

/** Furigana's three settings in the order the top bar and R step through them: off, new words, all. */
const RUBY_ORDER: ReadonlyArray<Settings['ruby']> = ['never', 'unknown', 'always'];

export function nextRuby(mode: Settings['ruby']): Settings['ruby'] {
  return RUBY_ORDER[(RUBY_ORDER.indexOf(mode) + 1) % RUBY_ORDER.length] ?? 'unknown';
}

/** A furigana setting as the top bar and the player name it. */
export function rubyLabel(mode: Settings['ruby']): string {
  return mode === 'unknown' ? 'new words' : mode;
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
  cached = { ...cached, [key]: value };
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
export function withDefaults(stored: Partial<Settings> | undefined): Settings {
  const out = { ...DEFAULTS, ...stored };
  if (!stored?.definitions && stored?.native && DEFINITION_LANGUAGES.some((l) => l.code === stored.native)) {
    out.definitions = stored.native;
  }
  // A colour that is not one would paint no underline at all.
  for (const key of UNDERLINE_KEYS) {
    if (!/^#[0-9a-f]{6}$/i.test(out[key])) out[key] = DEFAULTS[key];
  }
  return out;
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
  for (const k of keys) if (a[k] !== b[k]) return false;
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
