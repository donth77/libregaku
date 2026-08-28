import { isAvailable, countOurCards } from './anki/client';

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
      text: 'Not active on this page. Open a video on YouTube or Netflix — and if you just installed or reloaded the extension, refresh the tab.',
      cls: 'off',
    };
  }
  if (!state.supported) return { text: 'Not a supported site.', cls: 'off' };
  if (!state.rendering) {
    return { text: `Waiting for subtitles on ${state.site}. Make sure they are switched on.`, cls: 'off' };
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

    const apply = (): void => {
      if (!tab?.id) return;
      void chrome.tabs.sendMessage(tab.id, {
        type: 'lg-set-tracks',
        track: track.value,
        second: second.value,
      });
    };
    track.addEventListener('change', apply);
    second.addEventListener('change', apply);
  }

  if (state?.supported) {
    $('quick').hidden = false;
    $('toggleSidebar').addEventListener('click', () => {
      if (tab?.id) void chrome.tabs.sendMessage(tab.id, { type: 'lg-toggle-sidebar' });
    });
  }

  const anki = $('anki');
  if (await isAvailable()) {
    const n = await countOurCards().catch(() => 0);
    anki.className = 'ok';
    anki.textContent = `Anki connected · ${n} card${n === 1 ? '' : 's'}`;
  } else {
    anki.className = '';
    anki.textContent = 'Anki not running — words show as unknown';
  }
}

void main();
