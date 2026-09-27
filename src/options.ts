import { PANEL_STYLE, buildSettings } from './content/settings-panel';
import { logo } from './logo';
import { loadSettings, onSettingsChange, setSetting, settings, type Settings } from './settings';

/**
 * Options page.
 *
 * Chrome sends people here, so it exists — but it is the same settings
 * component the transcript panel shows, mounted on a page, so the two can
 * never drift apart. Every control writes straight through; there is no
 * Save button. The page adds only what a first run needs: the checklist.
 */

/**
 * The deck the learner said new cards should go to, by name.
 *
 * A deck in settings is not proof anyone chose it: the settings panel used to
 * fill in the first deck Anki listed, and the checklist ticked itself on
 * that. So the step waits for a choice made here — picking from the list, or
 * confirming the deck already set — and stays open if the deck later changes
 * without one.
 */
const CHOSEN = 'libregaku.deckChosen';

async function loadChosen(): Promise<string> {
  try {
    const got = await chrome.storage.local.get(CHOSEN);
    return typeof got[CHOSEN] === 'string' ? (got[CHOSEN] as string) : '';
  } catch {
    return '';
  }
}

async function saveChosen(deck: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [CHOSEN]: deck });
  } catch {
    /* the step simply asks again next time */
  }
}

/** Done once a deck is set and it is the one the learner chose. */
export function deckStepDone(cur: Pick<Settings, 'deck'>, chosen: string): boolean {
  return Boolean(cur.deck) && cur.deck === chosen;
}

async function main(): Promise<void> {
  const h1 = document.querySelector('h1');
  const mark = logo('lockup', 46, 'Libregaku');
  if (h1 && mark) h1.replaceChildren(mark);

  await loadSettings();

  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  document.head.appendChild(style);
  const panel = document.getElementById('settings') as HTMLElement;
  panel.appendChild(buildSettings(() => {}));

  /*
   * A first run needs two decisions and nothing else. The language pair cannot
   * be guessed; the deck cannot either, and without one the Add button has
   * nowhere to put a card. Everything else on this page has a defensible
   * default, so the checklist covers exactly these two and then disappears.
   */
  const setup = document.getElementById('setup') as HTMLElement;
  const stepLang = document.getElementById('step-lang') as HTMLElement;
  const stepAnki = document.getElementById('step-anki') as HTMLElement;
  const confirm = document.getElementById('confirmLang') as HTMLButtonElement;
  const confirmDeck = document.getElementById('confirmDeck') as HTMLButtonElement;

  let chosen = await loadChosen();

  // An explicit confirmation, so a learner whose pair happens to match the
  // defaults has still made the choice rather than merely not noticed it.
  confirm.addEventListener('click', () => void setSetting('configured', true));

  const choose = (deck: string): void => {
    chosen = deck;
    void saveChosen(deck);
    refreshSetup();
  };

  // Picking a deck from the list is a choice. The panel writes the setting;
  // this only records that a person made it.
  panel.addEventListener('change', (e) => {
    const t = e.target as HTMLSelectElement | null;
    if (t?.name === 'deck' && t.value) choose(t.value);
  });
  // Keeping the deck already set is one too, but only an explicit one.
  confirmDeck.addEventListener('click', () => {
    const deck = settings().deck;
    if (deck) choose(deck);
  });

  function refreshSetup(): void {
    const cur = settings();
    const langDone = Boolean(cur.configured);
    const ankiDone = deckStepDone(cur, chosen);
    stepLang.classList.toggle('done', langDone);
    stepAnki.classList.toggle('done', ankiDone);
    (stepLang.querySelector('.tick') as HTMLElement).textContent = langDone ? '✓' : '○';
    (stepAnki.querySelector('.tick') as HTMLElement).textContent = ankiDone ? '✓' : '○';
    confirm.hidden = langDone;
    // Offer to keep a deck only when there is one to keep.
    confirmDeck.hidden = ankiDone || !cur.deck;
    confirmDeck.textContent = cur.deck ? `Use ${cur.deck} for new cards` : '';
    setup.hidden = langDone && ankiDone;
  }

  onSettingsChange(refreshSetup);
  refreshSetup();
}

void main();
