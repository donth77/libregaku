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
  .settings { overflow-y: auto; flex: 1; padding: 4px 0 20px; }
  .grp {
    font: 600 10px/1.4 ui-monospace, monospace; letter-spacing: .13em;
    text-transform: uppercase; color: #6B7490;
    padding: 16px 13px 6px;
  }
  .field { padding: 7px 13px; }
  .field label { display: block; font-size: 12px; color: #C7CFE2; margin-bottom: 4px; }
  .field small { display: block; color: #6B7490; font-size: 11px; margin-top: 3px; line-height: 1.45; }
  .field select, .field input[type=text] {
    width: 100%; box-sizing: border-box; padding: 6px 8px; font: inherit; font-size: 12px;
    background: #12172A; color: #E8ECF6; border: 1px solid #2A3348; border-radius: 5px;
  }
  .check { display: flex; align-items: flex-start; gap: 9px; padding: 8px 13px; cursor: pointer; }
  .check input { margin-top: 2px; accent-color: #8AA2E8; }
  .check span { font-size: 12px; color: #C7CFE2; }
  .check small { display: block; color: #6B7490; font-size: 11px; margin-top: 2px; }
  .anki { padding: 8px 13px; font-size: 12px; }
  .anki .state { color: #838DA8; margin-bottom: 8px; line-height: 1.5; }
  .anki .state.ok { color: #63AF97; }
  .anki .state.bad { color: #E5806C; }
  .btnrow { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .btnrow button {
    font: 600 10px/1 ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase;
    padding: 7px 10px; border-radius: 5px; border: 1px solid #2A3348;
    background: #12172A; color: #B4BDD4; cursor: pointer;
  }
  .btnrow button:hover { border-color: #8AA2E8; color: #E8ECF6; }
  .btnrow button:disabled { opacity: .45; cursor: default; }
  .credits { padding: 6px 13px 0; font-size: 11px; color: #6B7490; line-height: 1.6; }
  .credits a { color: #838DA8; }
  .credits dt { color: #B4BDD4; margin-top: 8px; font-size: 11px; }
  .credits dd { margin: 1px 0 0; }
`;

type Rerender = () => void;

export function buildSettings(onChange: Rerender): HTMLElement {
  const root = document.createElement('div');
  root.className = 'settings';

  const group = (title: string): void => {
    const h = document.createElement('div');
    h.className = 'grp';
    h.textContent = title;
    root.appendChild(h);
  };

  const select = <K extends keyof Settings>(
    key: K, label: string, options: Array<[string, string]>, hint?: string,
  ): HTMLSelectElement => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const l = document.createElement('label');
    l.textContent = label;
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
    l.appendChild(sel);
    wrap.appendChild(l);
    if (hint) {
      const s = document.createElement('small');
      s.textContent = hint;
      wrap.appendChild(s);
    }
    root.appendChild(wrap);
    return sel;
  };

  const check = <K extends keyof Settings>(key: K, label: string, hint?: string): void => {
    const wrap = document.createElement('label');
    wrap.className = 'check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(settings()[key]);
    input.addEventListener('change', () => {
      void setSetting(key, input.checked as Settings[K]);
      onChange();
    });
    const text = document.createElement('span');
    text.textContent = label;
    if (hint) {
      const s = document.createElement('small');
      s.textContent = hint;
      text.appendChild(s);
    }
    wrap.append(input, text);
    root.appendChild(wrap);
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
