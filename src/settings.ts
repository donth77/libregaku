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

export const TARGET_LANGUAGES: Array<{ code: string; label: string; tier: 0 | 1 | 2 }> = [
  { code: 'ja', label: 'Japanese', tier: 2 },
  { code: 'ko', label: 'Korean', tier: 0 },
  { code: 'zh', label: 'Chinese', tier: 0 },
  { code: 'es', label: 'Spanish', tier: 0 },
  { code: 'fr', label: 'French', tier: 0 },
  { code: 'de', label: 'German', tier: 0 },
  { code: 'it', label: 'Italian', tier: 0 },
  { code: 'pt', label: 'Portuguese', tier: 0 },
  { code: 'th', label: 'Thai', tier: 0 },
];

/**
 * Languages definitions can appear in.
 *
 * Constrained by what JMdict actually publishes rather than by what would be
 * nice: these are the editions that exist. Offering a language with no edition
 * behind it would mean silently serving English while claiming otherwise.
 */
export const NATIVE_LANGUAGES: Array<{ code: string; label: string; jmdict: string }> = [
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

/** JMdict's three-letter code for a native language, or English. */
export function jmdictEditionFor(code: string): string {
  return NATIVE_LANGUAGES.find((l) => l.code === code)?.jmdict ?? 'eng';
}

export interface Settings {
  /** BCP-47 of the language being learned. */
  target: string;
  /** BCP-47 of the language to show translations in. */
  native: string;
  /** False until the user has been through setup once. */
  configured: boolean;
  /** How the lookup card opens. */
  interaction: 'hover' | 'click';
  /** Grace period before a hover opens a card, in ms. */
  hoverDelay: number;
  /** Pause playback while the cursor is on a subtitle. */
  hoverPause: boolean;
  /** Ruby over unknown words only, always, or never. */
  ruby: 'unknown' | 'always' | 'never';
  /** Preview definitions on hover in the transcript panel. */
  sidebarHover: boolean;
  /**
   * Where new cards go. One specific deck.
   */
  deck: string;
  /** Put a recording of the word on each new card, when one exists. */
  cardAudio: boolean;
  /**
   * Which deck is read to decide what you already know. Empty means the whole
   * collection.
   *
   * Separate from `deck` on purpose. A learner's known words live all over
   * their collection — a core deck, an old textbook deck, a JLPT deck — while
   * new cards belong in one place. Using a single setting for both forces a
   * bad trade: scope status to the mining deck and thousands of known words
   * read as unknown, or dump new cards into a broad parent deck.
   *
   * Anki's `deck:` search includes subdecks, so choosing "Japanese" covers
   * "Japanese::Mining" and everything beside it.
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
  configured: false,
  interaction: 'hover',
  hoverDelay: 220,
  hoverPause: true,
  ruby: 'unknown',
  sidebarHover: true,
  deck: '',
  cardAudio: true,
  statusScope: '',
  sidebarStats: true,
  sidebarFollow: true,
  markKnown: false,
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
    cached = { ...DEFAULTS, ...(got[KEY] as Partial<Settings> | undefined) };
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

function same(a: Settings, b: Settings): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Settings>;
  for (const k of keys) if (a[k] !== b[k]) return false;
  return true;
}

// Keep every tab in step when a setting changes anywhere.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[KEY]) return;
    const next = { ...DEFAULTS, ...(changes[KEY].newValue as Partial<Settings> | undefined) };
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
