import { isAvailable, deckNames, ensureModel, browseOurCards, countOurCards, createDeck } from '../anki/client';
import {
  NATIVE_LANGUAGES, TARGET_LANGUAGES, setSetting, settings, type Settings,
} from '../settings';

/**
 * Settings, inside the sidebar.
 *
 * The options page still exists and is where Chrome sends people, but it is a
 * separate tab — and every one of these settings is something you want to
 * change *while watching*, having just noticed the furigana is too loud or the
 * card opened when you did not want it to. Making that a context switch is
 * how settings go unused.
 *
 * Narrow column, so controls sit under their labels rather than beside them.
 */

export const PANEL_STYLE = `
  /*
   * One row shape for every setting.
   *
   * The first version mixed two — labels above selects, labels beside
   * checkboxes — which is why nothing lined up. A single grid handles both:
   * label left, control right, explanation spanning underneath.
   */
  .settings { overflow-y: auto; flex: 1; padding-bottom: 24px; }

  .grp {
    font: 600 10px/1 ui-monospace, monospace; letter-spacing: .14em;
    text-transform: uppercase; color: #6B7490;
    padding: 20px 14px 8px;
  }
  .grp:first-child { padding-top: 14px; }

  .set {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 14px; row-gap: 3px;
    padding: 11px 14px;
    border-top: 1px solid #171E2C;
  }
  label.set { cursor: pointer; }
  .set > .name { font-size: 12.5px; color: #DDE3F0; min-width: 0; }
  .set > .hint {
    grid-column: 1 / -1;
    font-size: 11px; line-height: 1.5; color: #6B7490;
  }

  .set select {
    justify-self: end; max-width: 168px;
    padding: 5px 7px; font: inherit; font-size: 12px;
    background: #12172A; color: #E8ECF6;
    border: 1px solid #2A3348; border-radius: 5px;
  }
  .set select:focus-visible { outline: 2px solid #8AA2E8; outline-offset: 1px; }

  /* Sized and reset explicitly — a shadow root inherits none of the page's
     form styling, and the browser default floated out of the grid cell. */
  .set input[type=checkbox] {
    justify-self: end; margin: 0; width: 15px; height: 15px;
    accent-color: #8AA2E8; flex: none;
  }

  .anki { padding: 11px 14px; }
  .anki .state {
    font-size: 11.5px; line-height: 1.55; color: #838DA8;
    padding: 9px 11px; border-radius: 6px;
    background: #12172A; border: 1px solid #212939;
  }
  .anki .state.ok  { color: #63AF97; border-color: #2A5245; background: #101F19; }
  .anki .state.bad { color: #E5806C; border-color: #4A2A24; background: #1F1412; }
  .btnrow { display: flex; gap: 6px; margin-top: 9px; flex-wrap: wrap; }
  .btnrow button {
    font: 600 10px/1 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; padding: 7px 11px; border-radius: 5px;
    border: 1px solid #2A3348; background: #12172A; color: #B4BDD4; cursor: pointer;
  }
  .btnrow button:hover:not(:disabled) { border-color: #8AA2E8; color: #E8ECF6; }
  .btnrow button:disabled { opacity: .4; cursor: default; }

  .credits { padding: 4px 14px 0; margin: 0; }
  .credits dt { margin-top: 11px; font-size: 11.5px; }
  .credits dt:first-child { margin-top: 4px; }
  .credits dt a { color: #B4BDD4; text-decoration: none; }
  .credits dt a:hover { color: #8AA2E8; text-decoration: underline; }
  .credits dd { margin: 2px 0 0; font-size: 11px; line-height: 1.55; color: #6B7490; }
`;

type Rerender = () => void;

export function buildSettings(onChange: Rerender): HTMLElement {
  const root = document.createElement('div');
  root.className = 'settings';

  const hintEl = (text: string): HTMLElement => {
    const el = document.createElement('span');
    el.className = 'hint';
    el.textContent = text;
    return el;
  };

  const group = (title: string): void => {
    const h = document.createElement('div');
    h.className = 'grp';
    h.textContent = title;
    root.appendChild(h);
  };

  const select = <K extends keyof Settings>(
    key: K, name: string, options: Array<[string, string]>, hint?: string,
  ): void => {
    const row = document.createElement('label');
    row.className = 'set';

    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = name;

    const sel = document.createElement('select');
    for (const [value, text] of options) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      sel.appendChild(o);
    }
    sel.value = String(settings()[key]);
    sel.addEventListener('change', () => {
      void setSetting(key, sel.value as Settings[K]);
      onChange();
    });

    row.append(label, sel);
    if (hint) row.appendChild(hintEl(hint));
    root.appendChild(row);
  };

  const check = <K extends keyof Settings>(key: K, name: string, hint?: string): void => {
    const row = document.createElement('label');
    row.className = 'set';

    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = name;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(settings()[key]);
    input.addEventListener('change', () => {
      void setSetting(key, input.checked as Settings[K]);
      onChange();
    });

    row.append(label, input);
    if (hint) row.appendChild(hintEl(hint));
    root.appendChild(row);
  };

  group('Languages');
  select('target', "I'm learning",
    TARGET_LANGUAGES.map((l) => [l.code, l.tier === 2 ? l.label : `${l.label} — limited`]),
    'Limited means word boundaries without dictionary forms, so inflected words may not match a card.');
  select('native', 'Translations in', NATIVE_LANGUAGES.map((l) => [l.code, l.label]));

  group('Looking words up');
  select('interaction', 'Open the card on', [['hover', 'Hover'], ['click', 'Click']]);
  check('hoverPause', 'Pause while hovering', 'Stops the subtitle moving on mid-lookup.');
  check('sidebarHover', 'Preview here on hover', 'A short definition without leaving the transcript.');

  group('Subtitles');
  select('ruby', 'Furigana', [
    ['unknown', 'On unknown words'], ['always', 'Always'], ['never', 'Never'],
  ]);
  check('markKnown', 'Underline known words', 'Off by default: the screen gets quieter as you learn.');
  check('dualSubtitles', 'Show a second subtitle line',
    "Your own language, from the source's own track — not machine translation. " +
    'Needs a full transcript, so it has no effect where only the current line is readable.');

  group('Transcript');
  check('sidebarOpen', 'Show the panel', 'Press S while watching to toggle it.');
  check('sidebarStats', 'Show progress', 'Comprehension, per-line counts, and the i+1 filter.');

  group('Anki');
  root.appendChild(ankiSection(onChange));

  group('Data and licences');
  root.appendChild(credits());

  return root;
}

/**
 * Anki is optional and often simply closed. Every state here is a statement of
 * fact rather than an error, because "not running" is normal.
 */
function ankiSection(onChange: Rerender): HTMLElement {
  const box = document.createElement('div');
  box.className = 'anki';

  const state = document.createElement('div');
  state.className = 'state';
  state.textContent = 'Checking…';

  const deckWrap = document.createElement('div');
  deckWrap.className = 'field';
  const deckLabel = document.createElement('label');
  deckLabel.textContent = 'New cards go to';
  const deck = document.createElement('select');
  deck.disabled = true;
  deckLabel.appendChild(deck);
  deckWrap.appendChild(deckLabel);

  const scopeWrap = document.createElement('div');
  scopeWrap.className = 'field';
  const scopeLabel = document.createElement('label');
  scopeLabel.textContent = 'Words you already know';
  const scope = document.createElement('select');
  scope.disabled = true;
  scopeLabel.appendChild(scope);
  scopeWrap.appendChild(scopeLabel);
  const scopeHint = document.createElement('small');
  scopeHint.textContent = 'Read to decide what to underline. Includes subdecks.';
  scopeWrap.appendChild(scopeHint);

  const row = document.createElement('div');
  row.className = 'btnrow';
  const recheck = document.createElement('button');
  recheck.textContent = 'Check';
  const newDeck = document.createElement('button');
  newDeck.textContent = 'New deck';
  newDeck.disabled = true;
  const browse = document.createElement('button');
  browse.textContent = 'Open in Anki';
  browse.disabled = true;
  row.append(recheck, newDeck, browse);

  box.append(state, deckWrap, scopeWrap, row);

  const refresh = async (): Promise<void> => {
    state.className = 'state';
    state.textContent = 'Checking…';

    if (!(await isAvailable())) {
      state.className = 'state bad';
      state.textContent = 'Not reachable. Open Anki with the AnkiConnect add-on installed.';
      return;
    }
    try {
      const created = await ensureModel();
      const decks = await deckNames();
      const cur = settings();

      const fill = (el: HTMLSelectElement, withAll: boolean, value: string): void => {
        el.replaceChildren();
        if (withAll) {
          const o = document.createElement('option');
          o.value = '';
          o.textContent = 'Whole collection';
          el.appendChild(o);
        }
        for (const d of decks) {
          const o = document.createElement('option');
          o.value = d;
          o.textContent = withAll ? `${d} (and subdecks)` : d;
          el.appendChild(o);
        }
        el.value = decks.includes(value) ? value : withAll ? '' : (decks[0] ?? '');
        el.disabled = false;
      };

      fill(deck, false, cur.deck);
      fill(scope, true, cur.statusScope);
      newDeck.disabled = false;
      if (deck.value && deck.value !== cur.deck) void setSetting('deck', deck.value);

      const n = await countOurCards();
      browse.disabled = n === 0;
      state.className = 'state ok';
      state.textContent =
        (created === 'created' ? 'Connected. Note type installed. ' : 'Connected. ') +
        (n ? `${n} card${n === 1 ? '' : 's'} from Libregaku.` : 'No cards yet.');
    } catch (e) {
      state.className = 'state bad';
      state.textContent = e instanceof Error ? e.message : String(e);
    }
  };

  deck.addEventListener('change', () => {
    void setSetting('deck', deck.value);
    onChange();
  });
  scope.addEventListener('change', () => {
    void setSetting('statusScope', scope.value);
    onChange();
  });
  recheck.addEventListener('click', () => void refresh());
  browse.addEventListener('click', () => void browseOurCards());
  newDeck.addEventListener('click', () => {
    const name = prompt('New deck name — use :: for subdecks, e.g. Japanese::Mining');
    if (!name?.trim()) return;
    void createDeck(name.trim()).then(() => setSetting('deck', name.trim())).then(refresh);
  });

  void refresh();
  return box;
}

/** Attribution belongs where someone can reach it, not only in a README. */
function credits(): HTMLElement {
  const dl = document.createElement('dl');
  dl.className = 'credits';

  const entry = (title: string, href: string, body: string): void => {
    const dt = document.createElement('dt');
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = title;
    dt.appendChild(a);
    const dd = document.createElement('dd');
    dd.textContent = body;
    dl.append(dt, dd);
  };

  entry('JMdict', 'https://www.edrdg.org/jmdict/j_jmdict.html',
    'Dictionary data © the Electronic Dictionary Research and Development Group, used under CC BY-SA 4.0.');
  entry('Lindera · IPADIC', 'https://github.com/lindera/lindera',
    'Morphological analysis. MIT; IPADIC carries its own terms.');
  entry('Jotoba · Jisho', 'https://jotoba.de/',
    'Consulted while the local dictionary downloads. Both serve JMdict.');
  entry('Lucide', 'https://lucide.dev/', 'Interface icons, ISC.');

  const fine = document.createElement('dd');
  fine.style.marginTop = '10px';
  fine.textContent = 'Libregaku is MIT. Dictionary data is downloaded at runtime, not redistributed.';
  dl.appendChild(fine);
  return dl;
}
