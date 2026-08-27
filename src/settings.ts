/**
 * Settings, with defaults that work before anything is configured.
 *
 * Reads are cached and kept live by a storage listener, so hot paths never
 * await. Nothing here blocks rendering: a value that has not loaded yet falls
 * back to its default rather than delaying a frame.
 */

export interface Settings {
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
}

export const DEFAULTS: Settings = {
  interaction: 'hover',
  hoverDelay: 220,
  hoverPause: true,
  ruby: 'unknown',
  sidebarHover: true,
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
