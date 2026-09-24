import { PANEL_STYLE, buildSettings } from './content/settings-panel';
import { loadSettings, onSettingsChange, setSetting, settings } from './settings';

/**
 * Options page.
 *
 * Chrome sends people here, so it exists — but it is the same settings
 * component the transcript panel shows, mounted on a page, so the two can
 * never drift apart. Every control writes straight through; there is no
 * Save button. The page adds only what a first run needs: the checklist.
 */
async function main(): Promise<void> {
  await loadSettings();

  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  document.head.appendChild(style);
  (document.getElementById('settings') as HTMLElement).appendChild(buildSettings(() => {}));

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

  // An explicit confirmation, so a learner whose pair happens to match the
  // defaults has still made the choice rather than merely not noticed it.
  confirm.addEventListener('click', () => void setSetting('configured', true));

  const refreshSetup = (): void => {
    const cur = settings();
    const langDone = Boolean(cur.configured);
    const ankiDone = Boolean(cur.deck);
    stepLang.classList.toggle('done', langDone);
    stepAnki.classList.toggle('done', ankiDone);
    (stepLang.querySelector('.tick') as HTMLElement).textContent = langDone ? '✓' : '○';
    (stepAnki.querySelector('.tick') as HTMLElement).textContent = ankiDone ? '✓' : '○';
    setup.hidden = langDone && ankiDone;
  };

  onSettingsChange(refreshSetup);
  refreshSetup();
}

void main();
