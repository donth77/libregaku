import { queuedCards } from './anki/card-queue';
import { probe, type AnkiState } from './anki/client';
import { ANKI_PORT } from './anki/endpoint';
import { logo } from './logo';

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
  tracks: Array<{ id: string; lang: string; label: string; generated?: boolean }>;
  track: string | null;
  second: string | null;
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

function describe(state: PageState | null): { text: string; cls: string } {
  if (!state) {
    return {
      text: 'Not active on this page. Open a YouTube or Netflix video. If you just installed or reloaded Libregaku, reload the tab.',
      cls: 'off',
    };
  }
  if (!state.supported) return { text: 'Libregaku works on YouTube and Netflix.', cls: 'off' };
  if (!state.rendering) {
    return { text: `Waiting for subtitles on ${state.site}. Make sure they're turned on.`, cls: 'off' };
  }
  return { text: state.title ? `Active — ${state.title}` : 'Active on this video.', cls: 'ok' };
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
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = `${t.label || t.lang}${t.generated ? ' (auto)' : ''}`;
    sel.appendChild(o);
  }
  sel.value = selected ?? '';
}

async function main(): Promise<void> {
  // The name in the header becomes the logo. The text stays in action.html
  // for as long as the script takes to arrive.
  const brand = document.querySelector('.brand');
  const mark = logo('lockup', 26, 'Libregaku');
  if (brand && mark) brand.replaceChildren(mark);

  $('openSettings').addEventListener('click', () => void chrome.runtime.openOptionsPage());

  const tab = await activeTab();
  const state = tab?.id ? await askPage(tab.id, { type: 'lg-state' }) : null;

  const { text, cls } = describe(state);
  const status = $('status');
  status.textContent = text;
  status.className = `status ${cls}`;

  if (state?.supported && state.tracks.length) {
    $('tracks').hidden = false;
    const track = $<HTMLSelectElement>('track');
    const second = $<HTMLSelectElement>('second');
    fillTracks(track, state, state.track);
    fillTracks(second, state, state.second, 'None');

    // Only the picker that changed. Sending both turned the second picker's
    // "None" — which is also what it shows when no second line happened to
    // load — into a deliberate choice whenever the first was changed.
    const apply = (field: 'track' | 'second', value: string): void => {
      if (!tab?.id) return;
      void chrome.tabs.sendMessage(tab.id, { type: 'lg-set-tracks', [field]: value });
    };
    track.addEventListener('change', () => apply('track', track.value));
    second.addEventListener('change', () => apply('second', second.value));
  }

  if (state?.supported && state.capture === 'tab' && tab?.id != null) void offerCapture(tab.id, state);

  if (state?.supported) {
    $('quick').hidden = false;
    $('toggleSidebar').addEventListener('click', () => {
      if (tab?.id) void chrome.tabs.sendMessage(tab.id, { type: 'lg-toggle-sidebar' });
    });
  }

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
    text.textContent = "Recording sentence audio here needs permission to capture this tab's sound.";
    go.textContent = 'Allow in settings';
    go.hidden = false;
    go.onclick = () => void chrome.runtime.openOptionsPage();
    return;
  }
  text.textContent = "Netflix's sound can be recorded only after you turn it on for this tab.";
  go.textContent = 'Record sentence audio here';
  go.hidden = false;
  go.onclick = async () => {
    go.disabled = true;
    const r = (await chrome.runtime.sendMessage({ type: 'tab-capture-start', tabId }).catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (r?.ok) {
      section.hidden = true;
      return;
    }
    text.textContent = r?.error ?? "Chrome couldn't record this tab.";
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
  const n = `${waiting} card${waiting === 1 ? '' : 's'}`;
  return {
    ...said,
    text: s.kind === 'connected' ? `${said.text} · ${n} still to add` : `${said.text} · ${n} waiting for Anki`,
  };
}

function describeState(s: AnkiState): { text: string; cls: string } {
  switch (s.kind) {
    case 'connected':
      return { text: `Anki connected · ${s.cards} card${s.cards === 1 ? '' : 's'} from Libregaku`, cls: 'ok' };
    case 'offline':
      return { text: 'Anki not running — words show as unknown', cls: '' };
    case 'occupied':
      return { text: `Another program is using port ${ANKI_PORT}, so Anki cannot be reached`, cls: 'bad' };
    case 'blocked':
      return { text: 'Anki refused this extension — Settings has the line to add', cls: 'bad' };
    case 'busy':
      return { text: 'Anki did not answer — it may be busy syncing', cls: 'bad' };
    case 'refused':
      return { text: s.detail || 'Anki refused the request', cls: 'bad' };
  }
}

void main();
