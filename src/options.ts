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

/**
 * Which section is being read, from where each one's top is in the window:
 * the last to have passed a line a third of the way down. A page scrolled as
 * far as it goes is on its last section, which is too short ever to reach
 * that line.
 */
export function readingIndex(tops: readonly number[], viewport: number, atEnd: boolean): number {
  if (!tops.length) return -1;
  if (atEnd) return tops.length - 1;
  let at = 0;
  tops.forEach((top, i) => {
    if (top <= viewport / 3) at = i;
  });
  return at;
}

/** A section arrived at says so: it may be one the page could barely move to. */
function land(section: HTMLElement): void {
  section.classList.remove('landed');
  void section.offsetWidth;   // so a second pick plays it again
  section.classList.add('landed');
  section.addEventListener('animationend', () => section.classList.remove('landed'), { once: true });
}

/**
 * The page's contents, down the side: one link per section of the settings,
 * marked as the reader scrolls past it. A long page is only readable when you
 * can see where you are in it and jump to what you came for.
 */
function contents(nav: HTMLElement, panel: HTMLElement): void {
  const sections = Array.from(panel.querySelectorAll<HTMLElement>('.grp-section'));
  const links = new Map<HTMLElement, HTMLAnchorElement>();
  for (const section of sections) {
    const a = document.createElement('a');
    a.href = `#${section.id}`;
    a.textContent = section.querySelector('.grp')?.textContent ?? '';
    nav.appendChild(a);
    links.set(section, a);
  }

  /*
   * A section picked from here — or from the checklist's links — is the one
   * being read, wherever the page could bring it. The last few cannot reach
   * the top, and marking whatever the scroll position said made picking them
   * look like it did nothing. It stays picked until the page is moved by
   * hand; the scroll the pick itself starts does not count.
   */
  let picked: HTMLElement | null = null;
  let settling = false;

  const mark = (): void => {
    const page = document.documentElement;
    const scrolls = page.scrollHeight - window.innerHeight > 1;
    const atEnd = scrolls && window.scrollY + window.innerHeight >= page.scrollHeight - 2;
    const tops = sections.map((s) => s.getBoundingClientRect().top);
    const current = picked ?? sections[readingIndex(tops, window.innerHeight, atEnd)];
    for (const [section, a] of links) {
      if (section === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  let frame = 0;
  const soon = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      mark();
    });
  };

  document.addEventListener('click', (e) => {
    const href = (e.target as Element | null)?.closest?.('a[href^="#"]')?.getAttribute('href');
    const section = sections.find((s) => `#${s.id}` === href);
    if (!section) return;
    picked = section;
    settling = true;
    const from = window.scrollY;
    // Already as far as the page goes: no scroll is coming to end the settling.
    window.setTimeout(() => {
      if (window.scrollY === from) settling = false;
    }, 150);
    land(section);
    mark();
  });
  window.addEventListener('scroll', () => {
    if (!settling) picked = null;
    soon();
  }, { passive: true });
  window.addEventListener('scrollend', () => {
    settling = false;
  });
  // A wheel or a finger is the reader taking over, even partway through a pick's scroll.
  for (const type of ['wheel', 'touchstart'] as const) {
    window.addEventListener(type, () => {
      settling = false;
    }, { passive: true });
  }
  window.addEventListener('resize', soon);
  mark();
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
  const toc = document.querySelector<HTMLElement>('.toc');
  if (toc) contents(toc, panel);

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
    (stepLang.querySelector('.tick') as HTMLElement).textContent = langDone ? '✓' : '1';
    (stepAnki.querySelector('.tick') as HTMLElement).textContent = ankiDone ? '✓' : '2';
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
