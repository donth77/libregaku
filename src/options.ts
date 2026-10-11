import { PANEL_STYLE, buildSettings } from './content/settings-panel';
import { fill, loadUiLanguage, localize, onUiLanguageChange, setTranslationLoader, setUiLanguage, ui } from './i18n';
import { pageHeader } from './page-header';
import { cardDeck, loadSettings, onSettingsChange, setSetting, settings } from './settings';

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
 * confirming the deck on offer.
 *
 * Once made, it stays made. The step used to open again whenever the deck in
 * settings was not the one chosen here, which is every time another language
 * is learned: each has decks of its own. That brought "Get started" back for
 * someone long since started.
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

/** Done once the learner has chosen a deck here, whichever deck and language are in use now. */
export function deckStepDone(chosen: string): boolean {
  return Boolean(chosen);
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

/** The section being read, by where the sections sit in the window now. */
function readingSection(sections: readonly HTMLElement[]): HTMLElement | undefined {
  const page = document.documentElement;
  const scrolls = page.scrollHeight - window.innerHeight > 1;
  const atEnd = scrolls && window.scrollY + window.innerHeight >= page.scrollHeight - 2;
  const tops = sections.map((s) => s.getBoundingClientRect().top);
  return sections[readingIndex(tops, window.innerHeight, atEnd)];
}

/**
 * The page's contents, down the side: one link per section of the settings,
 * marked as the reader scrolls past it. A long page is only readable when you
 * can see where you are in it and jump to what you came for.
 *
 * Returns how to list the sections again, for when the settings are rebuilt
 * in another language: the links are named for the headings as they read.
 */
function contents(nav: HTMLElement, panel: HTMLElement): () => void {
  let sections: HTMLElement[] = [];
  const links = new Map<HTMLElement, HTMLAnchorElement>();

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
    const current = picked ?? readingSection(sections);
    for (const [section, a] of links) {
      if (section === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };

  const list = (): void => {
    sections = Array.from(panel.querySelectorAll<HTMLElement>('.grp-section'));
    links.clear();
    nav.replaceChildren();
    for (const section of sections) {
      const a = document.createElement('a');
      a.href = `#${section.id}`;
      a.textContent = section.querySelector('.grp')?.textContent ?? '';
      nav.appendChild(a);
      links.set(section, a);
    }
    // A section picked before a rebuild is still picked: the same section, built again.
    const was = picked?.id;
    picked = was ? sections.find((s) => s.id === was) ?? null : null;
  };
  list();
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
  return () => {
    list();
    mark();
  };
}

/**
 * The settings built again where they were, in a new interface language.
 * The control in use keeps the focus and its place in the window — or, with
 * none in use, the section being read keeps its place — however much longer
 * or shorter the words above it have become.
 */
function rebuild(old: HTMLElement): HTMLElement {
  const focused = document.activeElement && old.contains(document.activeElement) ? document.activeElement : null;
  const name = focused?.getAttribute('name') ?? '';
  const section = readingSection(Array.from(old.querySelectorAll<HTMLElement>('.grp-section')))?.id ?? '';
  const held = (root: HTMLElement): HTMLElement | null =>
    name
      ? Array.from(root.querySelectorAll<HTMLElement>('[name]')).find((el) => el.getAttribute('name') === name) ?? null
      : Array.from(root.querySelectorAll<HTMLElement>('.grp-section')).find((s) => s.id === section) ?? null;
  const top = held(old)?.getBoundingClientRect().top;

  const next = buildSettings(() => {});
  old.replaceWith(next);

  const now = held(next);
  if (now && top !== undefined) {
    const by = now.getBoundingClientRect().top - top;
    if (by) window.scrollTo(window.scrollX, window.scrollY + by);
  }
  if (name) now?.focus({ preventScroll: true });
  return next;
}

/**
 * Show the rows of `panel` that mention every word of `query`, in their name or
 * their hint, and the sections with any left; hide the rest, and the contents'
 * links to them. An empty query shows everything. True when something shows.
 *
 * Rows are hidden by a mark of their own (data-nomatch), never by `hidden`:
 * that is how a row the language has no use for stays out of sight, and
 * clearing the search must not bring it back.
 */
function filterSettings(panel: HTMLElement, toc: HTMLElement | null, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  let any = false;
  for (const section of Array.from(panel.querySelectorAll<HTMLElement>('.grp-section'))) {
    let shown = 0;
    for (const row of Array.from(section.querySelectorAll<HTMLElement>('.set'))) {
      const text = `${row.querySelector('.name')?.textContent ?? ''} ${row.querySelector('.hint')?.textContent ?? ''}`.toLowerCase();
      const ok = words.every((w) => text.includes(w));
      row.toggleAttribute('data-nomatch', !ok);
      if (ok) shown++;
    }
    // A section's own heading and line count too: searching "Anki" finds the section.
    const own = `${section.querySelector('.grp')?.textContent ?? ''} ${section.querySelector('.grp-about')?.textContent ?? ''}`.toLowerCase();
    const whole = words.length > 0 && words.every((w) => own.includes(w));
    if (whole) section.querySelectorAll<HTMLElement>('.set').forEach((r) => r.removeAttribute('data-nomatch'));
    const visible = whole || shown > 0 || !words.length;
    section.toggleAttribute('data-nomatch', !visible);
    if (section.id) toc?.querySelectorAll<HTMLElement>(`a[href="#${section.id}"]`).forEach((a) => a.toggleAttribute('data-nomatch', !visible));
    if (visible) any = true;
  }
  return any || !words.length;
}

async function main(): Promise<void> {
  // Both read before anything is drawn, so nothing below waits again: a
  // change of language always finds the whole page there to redraw.
  let [, chosen] = await Promise.all([loadSettings(), loadChosen()]);

  // The page in the learner's own language, which can be changed on it.
  // A language's words are a file of their own, imported when it is chosen.
  setTranslationLoader((lang) => import(chrome.runtime.getURL(`i18n/${lang}.js`)));
  await loadUiLanguage(settings().native);
  localize(document);
  const header = (): void => pageHeader('settings', { heading: ui.options.settingsLabel, other: ui.options.help });
  header();
  onSettingsChange((s) => setUiLanguage(s.native));

  const style = document.createElement('style');
  style.textContent = PANEL_STYLE;
  document.head.appendChild(style);
  const panel = document.getElementById('settings') as HTMLElement;
  let built = buildSettings(() => {});
  panel.appendChild(built);
  const toc = document.querySelector<HTMLElement>('.toc');
  const relist = toc ? contents(toc, panel) : null;

  // The search over the settings: rows that do not say what was typed are hidden, and so are sections left empty.
  const find = document.getElementById('q') as HTMLInputElement;
  const none = document.getElementById('none') as HTMLElement;
  const search = (): void => {
    find.placeholder = ui.options.searchSettings;
    find.setAttribute('aria-label', ui.options.searchSettings);
    const q = find.value.trim();
    const hits = filterSettings(panel, toc, q);
    // The first-run card is not a setting: while searching it only pushes the results down.
    document.getElementById('setup')?.toggleAttribute('data-nomatch', Boolean(q));
    none.hidden = hits || !q;
    none.textContent = fill(ui.options.noSettingsFound, { q }).join('');
  };
  find.addEventListener('input', search);
  search();

  /*
   * A first run needs two decisions and nothing else. The language pair cannot
   * be guessed. Nor can the deck: each language has one of its own for new
   * cards (cardDeck), and whether to use it or one the learner already has is
   * theirs to say. Everything else on this page has a defensible default, so
   * the checklist covers exactly these two and then disappears for good.
   */
  const setup = document.getElementById('setup') as HTMLElement;
  const stepLang = document.getElementById('step-lang') as HTMLElement;
  const stepAnki = document.getElementById('step-anki') as HTMLElement;
  const confirm = document.getElementById('confirmLang') as HTMLButtonElement;
  const confirmDeck = document.getElementById('confirmDeck') as HTMLButtonElement;

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
  // Keeping the deck on offer is one too, but only an explicit one. Nothing
  // is written for the language's own deck: its first card makes it.
  confirmDeck.addEventListener('click', () => choose(cardDeck(settings())));

  function refreshSetup(): void {
    const cur = settings();
    const langDone = Boolean(cur.configured);
    const ankiDone = deckStepDone(chosen);
    stepLang.classList.toggle('done', langDone);
    stepAnki.classList.toggle('done', ankiDone);
    (stepLang.querySelector('.tick') as HTMLElement).textContent = langDone ? '✓' : '1';
    (stepAnki.querySelector('.tick') as HTMLElement).textContent = ankiDone ? '✓' : '2';
    confirm.hidden = langDone;
    // The deck to keep: the one set, or the language's own until one is.
    confirmDeck.hidden = ankiDone;
    confirmDeck.textContent = ui.options.keepDeck(cardDeck(cur));
    setup.hidden = langDone && ankiDone;
  }

  onSettingsChange(refreshSetup);
  refreshSetup();

  /*
   * "Your language" is on this page, and the page follows it at once: the
   * settings are built again in the new language where the old ones were,
   * and the contents, the checklist and the page's own words after them.
   */
  onUiLanguageChange(() => {
    localize(document);
    header();
    built = rebuild(built);
    relist?.();
    search();
    refreshSetup();
  });
}

void main();
