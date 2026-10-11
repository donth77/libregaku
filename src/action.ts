import { queuedCards } from './anki/card-queue';
import { probe, type AnkiState } from './anki/client';
import { ANKI_PORT } from './anki/endpoint';
import type { CaptureFailure } from './audio/tab-capture';
import { loadUiLanguage, localize, setTranslationLoader, setUiLanguage, ui, uiLocale } from './i18n';
import { logo } from './logo';
import { loadSettings, onSettingsChange, settings } from './settings';
import { markSites, siteInfo } from './site-info';

/**
 * Toolbar popup.
 *
 * Answers the question the icon should answer: is this thing doing anything
 * here, and if not, why not. Clicking it previously did nothing at all, so
 * there was no way to tell an unsupported site from a broken extension.
 *
 * It also holds the subtitle track pickers. Those belong here rather than in
 * settings because track choice is per-video, not a preference — a video with
 * two Japanese tracks, or one where you want a different second language just
 * this once, had no way to be steered.
 */

interface PageState {
  supported: boolean;
  site: string | null;
  title: string | null;
  rendering: boolean;
  tracks: Array<{ id: string; lang: string; label: string; generated?: boolean; forced?: boolean }>;
  track: string | null;
  second: string | null;
  /** The title of the notice over the player, when there is one. */
  notice?: string | null;
  sidebarOpen: boolean;
  /** How a line's sound can be recorded here: from the video, from the tab, or not at all. */
  capture?: 'element' | 'tab' | null;
  /** Whether the tab's sound is already being captured. */
  capturing?: boolean;
}

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function askPage(tabId: number, msg: unknown): Promise<PageState | null> {
  try {
    return (await chrome.tabs.sendMessage(tabId, msg)) as PageState;
  } catch {
    // No content script here — an unsupported site, or one loaded before the
    // extension was installed.
    return null;
  }
}

/** A site as people write it: the content script reports its adapter's id, "netflix". */
function siteName(site: string | null): string {
  return ({ youtube: 'YouTube', netflix: 'Netflix', disney: 'Disney+', prime: 'Prime Video', max: 'Max' } as Record<string, string>)[site ?? ''] ?? String(site);
}

function describe(state: PageState | null): { text: string; cls: string } {
  if (!state) return { text: ui.action.notActive, cls: 'off' };
  if (!state.supported) return { text: ui.action.unsupported, cls: 'off' };
  if (!state.rendering) {
    return { text: ui.action.waitingForSubtitles(siteName(state.site)), cls: 'off' };
  }
  // The video has tracks and none is in use: the page's own notice says why,
  // and "active" would be the opposite of it.
  if (state.tracks.length && !state.track && state.notice) return { text: state.notice, cls: 'off' };
  return { text: state.title ? ui.action.activeOn(state.title) : ui.action.active, cls: 'ok' };
}

function fillTracks(
  sel: HTMLSelectElement,
  state: PageState,
  selected: string | null,
  noneLabel?: string,
): void {
  sel.replaceChildren();
  if (noneLabel) {
    const o = document.createElement('option');
    o.value = '';
    o.textContent = noneLabel;
    sel.appendChild(o);
  }
  for (const t of state.tracks) {
    // Netflix has a forced track for each audio language, each named "Off":
    // only the writing on screen, nothing to study, and a long list of Offs.
    // One stays while it is the one in use, so the menu still says what is.
    if (t.forced && t.id !== selected) continue;
    const o = document.createElement('option');
    o.value = t.id;
    // The track's name is the site's; only the mark for a generated one is ours.
    const name = t.label || t.lang;
    o.textContent = t.generated ? ui.action.generatedTrack(name) : name;
    sel.appendChild(o);
  }
  // Nothing loaded — the video has no subtitles in the language being learned,
  // say — is shown as nothing chosen, not as an empty box.
  if (!noneLabel && !state.tracks.some((t) => t.id === selected)) {
    const o = document.createElement('option');
    o.value = '';
    o.textContent = '—';
    o.disabled = true;
    sel.prepend(o);
  }
  sel.value = selected ?? '';
}

/** How often the open popup asks the page again, in ms. */
const FOLLOW_MS = 1000;

async function main(): Promise<void> {
  // The name in the header becomes the logo. The text stays in action.html
  // for as long as the script takes to arrive.
  const brand = document.querySelector('.brand');
  const mark = logo('lockup', 26, 'Libregaku');
  if (brand && mark) brand.replaceChildren(mark);

  $('openSettings').addEventListener('click', () => void chrome.runtime.openOptionsPage());

  const [tab] = await Promise.all([activeTab(), loadSettings()]);
  // The popup's own words in the learner's language, before anything below is
  // written over them. It is open for moments, so this is done once.
  // A language's words are a file of their own, imported when it is chosen.
  setTranslationLoader((lang) => import(chrome.runtime.getURL(`i18n/${lang}.js`)));
  await loadUiLanguage(settings().native);
  localize(document);
  onSettingsChange((s) => setUiLanguage(s.native));

  const state = tab?.id ? await askPage(tab.id, { type: 'lg-state' }) : null;

  const status = $('status');
  const track = $<HTMLSelectElement>('track');
  const second = $<HTMLSelectElement>('second');

  /**
   * The status line, the two track lists and the panel's button, as the page
   * has them now. Drawn again only when something in them changed, so a list
   * being read is not rebuilt under the pointer.
   */
  let drawn = '';
  let offered = false;
  const show = (now: PageState | null): void => {
    const key = JSON.stringify([now?.supported, now?.site, now?.title, now?.rendering, now?.tracks, now?.track, now?.second, now?.notice]);
    if (key === drawn) return;
    drawn = key;
    const { text, cls } = describe(now);
    status.textContent = text;
    status.className = `status ${cls}`;
    $('quick').hidden = !now?.supported;
    if (now?.supported && now.capture === 'tab' && tab?.id != null && !offered) {
      offered = true;
      void offerCapture(tab.id, now);
    }
    const listed = Boolean(now?.supported && now.tracks.length);
    $('tracks').hidden = !listed;
    if (!now || !listed) return;
    fillTracks(track, now, now.track);
    fillTracks(second, now, now.second, ui.action.noTranslation);
  };
  show(state);

  // Only the picker that changed. Sending both turned the second picker's
  // "None" — which is also what it shows when no second line happened to
  // load — into a deliberate choice whenever the first was changed.
  const apply = async (field: 'track' | 'second', value: string): Promise<void> => {
    if (!tab?.id) return;
    // Answered once the page has loaded the pick, or failed to.
    await chrome.tabs.sendMessage(tab.id, { type: 'lg-set-tracks', [field]: value }).catch(() => null);
    // What it loaded, which is not always what was asked: the subtitles'
    // track cannot also be the translation's, so one pick can move the other.
    show(await askPage(tab.id, { type: 'lg-state' }));
  };
  track.addEventListener('change', () => void apply('track', track.value));
  second.addEventListener('change', () => void apply('second', second.value));

  // The page may still be loading — itself, or its tracks — or starting over
  // after the language being learned was changed: all of this follows it
  // while the popup is open. A page with nothing of ours on it answers at once.
  if (tab?.id != null) {
    const tabId = tab.id;
    const follow = window.setInterval(() => void askPage(tabId, { type: 'lg-state' }).then(show), FOLLOW_MS);
    window.addEventListener('pagehide', () => window.clearInterval(follow), { once: true });
  }

  $('toggleSidebar').addEventListener('click', () => {
    if (tab?.id) void chrome.tabs.sendMessage(tab.id, { type: 'lg-toggle-sidebar' }).catch(() => null);
  });

  const anki = $('anki');
  const [ankiState, waiting] = await Promise.all([probe(), queuedCards()]);
  const { text: said, cls: tone } = describeAnki(ankiState, waiting.length);
  anki.className = tone;
  anki.textContent = said;
}

/**
 * Sentence audio where the video cannot be recorded directly. Chrome lets an
 * extension capture a tab's sound only after the learner invokes it on that
 * tab — opening this popup is that — and only with the permission granted,
 * which is asked for on the settings page: a permission prompt closes the
 * popup that asked.
 */
async function offerCapture(tabId: number, state: PageState): Promise<void> {
  const text = $('captureText');
  const go = $<HTMLButtonElement>('captureGo');
  const section = $('capture');
  // Already recording: nothing to ask, so nothing shown.
  if (state.capturing) return;
  section.hidden = false;
  const granted = await chrome.permissions.contains({ permissions: ['tabCapture'] }).catch(() => false);
  if (!granted) {
    text.textContent = ui.action.captureNeedsPermission;
    if (!markSites(text, uiLocale())) text.append(siteInfo(uiLocale()));
    go.textContent = ui.action.captureAllowInSettings;
    go.hidden = false;
    go.onclick = () => void chrome.runtime.openOptionsPage();
    return;
  }
  text.textContent = ui.action.captureReady;
  if (!markSites(text, uiLocale())) text.append(siteInfo(uiLocale()));
  go.textContent = ui.action.captureStart;
  go.hidden = false;
  go.onclick = async () => {
    go.disabled = true;
    const r = (await chrome.runtime.sendMessage({ type: 'tab-capture-start', tabId }).catch(() => null)) as
      | { ok?: boolean; error?: string; code?: CaptureFailure }
      | null;
    if (r?.ok) {
      section.hidden = true;
      return;
    }
    // The service worker names what went wrong; the words for it are the interface's.
    text.textContent = r?.code ? ui.errors[r.code] : r?.error ?? ui.action.captureFailed;
    go.disabled = false;
  };
}

/**
 * The states the settings panel distinguishes, in one line each, and how many
 * cards made while Anki was closed are still waiting to go in.
 *
 * This used to be a yes/no on whether anything answered, so a port held by
 * another program — or AnkiConnect refusing the extension — read "Anki not
 * running" while Anki sat open.
 */
export function describeAnki(s: AnkiState, waiting = 0): { text: string; cls: string } {
  const said = describeState(s);
  if (!waiting) return said;
  const more = s.kind === 'connected' ? ui.action.cardsToAdd(waiting) : ui.action.cardsWaiting(waiting);
  return { ...said, text: `${said.text} · ${more}` };
}

function describeState(s: AnkiState): { text: string; cls: string } {
  switch (s.kind) {
    case 'connected':
      return { text: ui.action.ankiConnected(s.cards), cls: 'ok' };
    case 'offline':
      return { text: ui.action.ankiOffline, cls: '' };
    case 'occupied':
      return { text: ui.action.ankiOccupied(ANKI_PORT), cls: 'bad' };
    case 'blocked':
      return { text: ui.action.ankiBlocked, cls: 'bad' };
    case 'busy':
      return { text: ui.action.ankiBusy, cls: 'bad' };
    case 'refused':
      return { text: s.detail || ui.action.ankiRefused, cls: 'bad' };
  }
}

void main();
