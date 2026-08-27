import {
  browseOurCards, countOurCards, createDeck, deckNames, ensureModel, isAvailable,
} from './anki/client';
import {
  DEFAULTS,
  onSettingsChange,
  settings as settingsSnapshot,
  NATIVE_LANGUAGES,
  TARGET_LANGUAGES,
  loadSettings,
  setSetting,
  type Settings,
} from './settings';

/** Options page. Every control writes straight through — no Save button. */

async function main(): Promise<void> {
  const s = await loadSettings();

  const bind = <K extends keyof Settings>(id: K, kind: 'select' | 'check'): void => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) return;

    if (kind === 'check') (el as HTMLInputElement).checked = Boolean(s[id] ?? DEFAULTS[id]);
    else (el as HTMLSelectElement).value = String(s[id] ?? DEFAULTS[id]);

    el.addEventListener('change', () => {
      const value = kind === 'check' ? (el as HTMLInputElement).checked : (el as HTMLSelectElement).value;
      void setSetting(id, value as Settings[K]);
    });
  };

  /*
   * Say plainly what each language actually gets. Tier 0 finds word boundaries
   * and nothing else, which means lookups match on the surface form — so an
   * inflected word may not find a card you already have. Better stated up
   * front than discovered as flakiness.
   */
  const NOTES: Record<0 | 1 | 2, string> = {
    2: 'Full support: dictionary forms, readings and furigana.',
    1: 'Words and lookups. No dictionary forms yet, so inflected words may not match.',
    0: 'Word boundaries only. Lookups match exactly what is on screen.',
  };

  // Seeing the page at all means the pair has been reviewed; a learner whose
  // pair happens to be the default should not be nagged forever.
  if (!s.configured) void setSetting('configured', true);

  const target = document.getElementById('target') as HTMLSelectElement;
  const note = document.getElementById('tierNote') as HTMLElement;
  for (const l of TARGET_LANGUAGES) {
    const o = document.createElement('option');
    o.value = l.code;
    o.textContent = l.label + (l.tier === 2 ? '' : ` — limited`);
    target.appendChild(o);
  }
  const showNote = (): void => {
    const tier = TARGET_LANGUAGES.find((l) => l.code === target.value)?.tier ?? 0;
    note.textContent = NOTES[tier];
  };
  target.value = s.target ?? DEFAULTS.target;
  showNote();
  target.addEventListener('change', () => {
    showNote();
    void setSetting('target', target.value);
    void setSetting('configured', true);
  });

  const native = document.getElementById('native') as HTMLSelectElement;
  for (const l of NATIVE_LANGUAGES) {
    const o = document.createElement('option');
    o.value = l.code;
    o.textContent = l.label;
    native.appendChild(o);
  }
  native.value = s.native ?? DEFAULTS.native;
  native.addEventListener('change', () => {
    void setSetting('native', native.value);
    void setSetting('configured', true);
  });

  void wireAnki(s);

  /*
   * A first run needs two decisions and nothing else. The language pair cannot
   * be guessed; the deck cannot either, and without one the Add button has
   * nowhere to put a card. Everything else on this page has a defensible
   * default, so the checklist covers exactly these two and then disappears.
   */
  const setup = document.getElementById('setup') as HTMLElement;
  const stepLang = document.getElementById('step-lang') as HTMLElement;
  const stepAnki = document.getElementById('step-anki') as HTMLElement;

  const refreshSetup = (): void => {
    const cur = { ...s, ...settingsSnapshot() };
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

  bind('interaction', 'select');
  bind('hoverPause', 'check');
  bind('sidebarHover', 'check');
  bind('sidebarStats', 'check');
  bind('ruby', 'select');
  bind('markKnown', 'check');
}

/**
 * Anki is optional and frequently absent — it is a desktop app that may simply
 * not be open. Every control here degrades to a plain statement of fact rather
 * than an error, because "Anki is closed" is a normal condition.
 */
async function wireAnki(s: Settings): Promise<void> {
  const status = document.getElementById('ankiStatus') as HTMLElement;
  const deck = document.getElementById('deck') as HTMLSelectElement;
  const scope = document.getElementById('statusScope') as HTMLSelectElement;
  const newDeck = document.getElementById('newDeck') as HTMLButtonElement;
  const count = document.getElementById('cardCount') as HTMLElement;
  const browse = document.getElementById('browse') as HTMLButtonElement;
  const check = document.getElementById('ankiCheck') as HTMLButtonElement;

  const refresh = async (): Promise<void> => {
    status.textContent = 'Checking…';
    status.className = '';
    deck.disabled = true;
    browse.disabled = true;

    if (!(await isAvailable())) {
      status.textContent = 'Not reachable — open Anki and install the AnkiConnect add-on.';
      status.className = 'bad';
      count.textContent = '—';
      return;
    }

    try {
      const created = await ensureModel();
      const decks = await deckNames();

      deck.replaceChildren();
      for (const d of decks) {
        const o = document.createElement('option');
        o.value = d;
        o.textContent = d;
        deck.appendChild(o);
      }
      deck.value = decks.includes(s.deck) ? s.deck : (decks[0] ?? '');
      deck.disabled = false;
      newDeck.disabled = false;
      if (deck.value && deck.value !== s.deck) void setSetting('deck', deck.value);

      // "Whole collection" stays first: it is the right default, since known
      // words are scattered and a narrow scope silently under-reports them.
      scope.replaceChildren();
      const all = document.createElement('option');
      all.value = '';
      all.textContent = 'Whole collection';
      scope.appendChild(all);
      for (const d of decks) {
        const o = document.createElement('option');
        o.value = d;
        o.textContent = `${d} (and subdecks)`;
        scope.appendChild(o);
      }
      scope.value = decks.includes(s.statusScope) ? s.statusScope : '';
      scope.disabled = false;

      status.textContent =
        created === 'created'
          ? 'Connected. Installed the Libregaku note type.'
          : 'Connected.';
      status.className = 'ok';

      const n = await countOurCards();
      count.textContent = n ? `${n} card${n === 1 ? '' : 's'}` : 'None yet';
      browse.disabled = n === 0;
    } catch (e) {
      status.textContent = String(e instanceof Error ? e.message : e);
      status.className = 'bad';
    }
  };

  deck.addEventListener('change', () => void setSetting('deck', deck.value));
  scope.addEventListener('change', () => void setSetting('statusScope', scope.value));
  newDeck.addEventListener('click', () => {
    const name = prompt('New deck name — use :: for subdecks, e.g. Japanese::Mining');
    if (!name?.trim()) return;
    void createDeck(name.trim())
      .then(() => setSetting('deck', name.trim()))
      .then(() => refresh());
  });
  browse.addEventListener('click', () => void browseOurCards());
  check.addEventListener('click', () => void refresh());
  await refresh();
}

void main();
