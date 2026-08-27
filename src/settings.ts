/**
 * Settings, with defaults that work before anything is configured.
 *
 * Reads are cached and kept live by a storage listener, so hot paths never
 * await. Nothing here blocks rendering: a value that has not loaded yet falls
 * back to its default rather than delaying a frame.
 */

/** Languages the segmenter can do more than find boundaries for. */
export const TIER2_LANGS: Record<string, string> = {
  ja: 'ipadic',
  ko: 'ko-dic',
  zh: 'cc-cedict',
};

export const TARGET_LANGUAGES: Array<{ code: string; label: string; tier: 0 | 1 | 2 }> = [
  { code: 'ja', label: 'Japanese', tier: 2 },
  { code: 'ko', label: 'Korean', tier: 2 },
  { code: 'zh', label: 'Chinese', tier: 2 },
  { code: 'es', label: 'Spanish', tier: 1 },
  { code: 'fr', label: 'French', tier: 1 },
  { code: 'de', label: 'German', tier: 1 },
  { code: 'it', label: 'Italian', tier: 1 },
  { code: 'pt', label: 'Portuguese', tier: 1 },
  { code: 'th', label: 'Thai', tier: 0 },
];

export const NATIVE_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ja', label: 'Japanese' },
];

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
  /** Deck new cards go to, and the deck read for word status. */
  deck: string;
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
};

const KEY = 'libregaku.settings';

let cached: Settings = { ...DEFAULTS };
let loaded = false;
const listeners = new Set<(s: Settings) => void>();

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
  listeners.forEach((fn) => fn(cached));
  try {
    await chrome.storage.sync.set({ [KEY]: cached });
  } catch {
    /* in-memory value still applies for this session */
  }
}

export function onSettingsChange(fn: (s: Settings) => void): void {
  listeners.add(fn);
}

// Keep every tab in step when a setting changes anywhere.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !changes[KEY]) return;
    cached = { ...DEFAULTS, ...(changes[KEY].newValue as Partial<Settings> | undefined) };
    listeners.forEach((fn) => fn(cached));
  });
} catch {
  /* not in an extension context (tests) */
}
