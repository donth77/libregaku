import { flushCards, queuedCards } from '../anki/card-queue';
import { browseOurCards, createDeck, probe, type AnkiState } from '../anki/client';
import { ADDON_CODE, ADDON_URL, ANKI_PORT, ANKI_URL, extensionOrigin } from '../anki/endpoint';
import { cardAudio } from '../audio/card-audio';
import { copyText } from './share';
import {
  NATIVE_LANGUAGES, TARGET_LANGUAGES, setSetting, settings, type Settings,
} from '../settings';

/**
 * Settings, inside the sidebar — and on the options page, which mounts this
 * same component.
 *
 * Every one of these settings is something you want to change *while
 * watching*, having just noticed the furigana is too loud or the card opened
 * when you did not want it to. Making that a context switch is how settings
 * go unused. The options page still exists because Chrome sends people
 * there; building it from the same component means the two can never
 * disagree about what there is to set.
 *
 * Narrow column, so controls sit beside short labels and explanations run
 * underneath.
 */

export const PANEL_STYLE = `
  /*
   * One row shape for every setting.
   *
   * The first version mixed two — labels above selects, labels beside
   * checkboxes — which is why nothing lined up. A single grid handles both:
   * label left, control right, explanation spanning underneath. The Anki
   * rows use it too; they once had their own shape and no styles at all.
   */
  .settings { overflow-y: auto; flex: 1; padding-bottom: 24px; }

  .settings .grp {
    font: 600 11px/1 ui-monospace, monospace; letter-spacing: .14em;
    text-transform: uppercase; color: #8A94AF;
    margin: 0; padding: 22px 16px 9px;
  }
  .settings .grp:first-child { padding-top: 14px; }

  .set {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 16px; row-gap: 4px;
    padding: 13px 16px;
    border-top: 1px solid #171E2C;
  }
  label.set { cursor: pointer; }
  .set:focus-within { background: rgba(138, 162, 232, .05); }
  .set > .name { font-size: 14px; color: #DDE3F0; min-width: 0; }
  .set > .hint {
    grid-column: 1 / -1;
    font-size: 12px; line-height: 1.5; color: #8A94AF;
  }
  .set > .hint.warn { color: #D9A64A; }

  /* Native select, own chrome: the platform menu stays, the platform box goes. */
  .set select {
    justify-self: end; max-width: 190px; min-width: 0;
    appearance: none; -webkit-appearance: none;
    padding: 6px 28px 6px 10px; font: inherit; font-size: 13px;
    color: #E8ECF6; background-color: #12172A;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239AA4BF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>");
    background-repeat: no-repeat; background-position: right 9px center; background-size: 12px;
    border: 1px solid #2A3348; border-radius: 6px; cursor: pointer;
    text-overflow: ellipsis;
  }
  .set select:hover:not(:disabled) { border-color: #3B4A6B; }
  .set select:disabled { opacity: .45; cursor: default; }
  .set select:focus-visible { outline: 2px solid #8AA2E8; outline-offset: 1px; }

  /*
   * A switch, drawn on the checkbox itself so it keeps the input's keyboard
   * handling and semantics — the browser default floated out of the grid
   * cell and read as a form field rather than an on/off.
   */
  .set input[type=checkbox] {
    appearance: none; -webkit-appearance: none;
    justify-self: end; margin: 0; flex: none;
    width: 34px; height: 20px; border-radius: 10px;
    background: #2A3348; border: 1px solid #343E58;
    position: relative; cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
  }
  .set input[type=checkbox]::before {
    content: ''; position: absolute; top: 2px; left: 2px;
    width: 14px; height: 14px; border-radius: 50%; background: #9AA4BF;
    transition: transform .15s ease, background .15s ease;
  }
  .set input[type=checkbox]:checked { background: #8AA2E8; border-color: #8AA2E8; }
  .set input[type=checkbox]:checked::before { transform: translateX(14px); background: #0D111C; }
  .set input[type=checkbox]:focus-visible { outline: 2px solid #8AA2E8; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    .set input[type=checkbox], .set input[type=checkbox]::before { transition: none; }
  }

  .state {
    margin: 4px 16px 8px;
    font-size: 13px; line-height: 1.55; color: #838DA8;
    padding: 11px 13px; border-radius: 7px;
    background: #12172A; border: 1px solid #212939;
  }
  .state.ok   { color: #63AF97; border-color: #2A5245; background: #101F19; }
  /* Anki being closed is normal, so it is never painted as an error. */
  .state.warn { color: #D9A64A; border-color: #4A3A1E; background: #1F1A10; }
  .state.bad  { color: #E5806C; border-color: #4A2A24; background: #1F1412; }
  .btnrow { display: flex; gap: 6px; padding: 10px 16px 0; flex-wrap: wrap; }
  .btnrow button {
    font: 600 11px/1 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; padding: 8px 12px; border-radius: 6px;
    border: 1px solid #2A3348; background: #12172A; color: #B4BDD4; cursor: pointer;
  }
  .btnrow button:hover:not(:disabled) { border-color: #8AA2E8; color: #E8ECF6; }
  .btnrow button:focus-visible { outline: 2px solid #8AA2E8; outline-offset: 2px; }
  .btnrow button:disabled { opacity: .4; cursor: default; }

  /* A row's own display wins over the hidden attribute; say so. */
  .set[hidden], .steps[hidden], .state[hidden] { display: none; }

  /*
   * Connecting Anki, as steps rather than a sentence.
   *
   * Three of the four ways this fails are fixed in Anki's own menus, and the
   * fourth is a line of config. A message saying "not reachable" leaves the
   * learner to find all of that themselves, which is how an optional feature
   * becomes an unused one.
   */
  .steps { margin: 0; padding: 2px 16px 0 34px; color: #C2C9DC; font-size: 13px; line-height: 1.6; }
  .steps li { margin-bottom: 10px; }
  .steps li::marker { color: #8A94AF; font-variant-numeric: tabular-nums; }
  .steps b { color: #E8ECF6; font-weight: 600; }
  .steps a { color: #8AA2E8; }
  .chip {
    display: flex; align-items: center; gap: 6px; margin-top: 5px;
    background: #12172A; border: 1px solid #2A3348; border-radius: 6px;
    padding: 5px 5px 5px 9px;
  }
  .chip code {
    flex: 1; min-width: 0; overflow-x: auto; white-space: nowrap;
    font: 12px/1.5 ui-monospace, monospace; color: #B4BDD4;
  }
  .chip button {
    flex: none; font: 600 10px/1 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; padding: 6px 8px; border-radius: 4px;
    border: 1px solid #2A3348; background: #1A2138; color: #B4BDD4; cursor: pointer;
  }
  .chip button:hover { border-color: #8AA2E8; color: #E8ECF6; }

  .keys {
    display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center;
    gap: 9px 14px; margin: 0; padding: 4px 16px 6px;
  }
  .keys dt { display: flex; gap: 4px; }
  .keys dd { margin: 0; font-size: 13px; line-height: 1.4; color: #C2C9DC; }
  .keys kbd {
    min-width: 14px; padding: 4px 6px; text-align: center;
    font: 600 12px/1 system-ui, -apple-system, sans-serif; color: #E8ECF6;
    background: #12172A; border: 1px solid #2A3348; border-bottom-width: 2px; border-radius: 5px;
  }

  .credits { padding: 4px 16px 0; margin: 0; }
  .credits dt { margin-top: 12px; font-size: 13px; }
  .credits dt:first-child { margin-top: 4px; }
  .credits dt a { color: #B4BDD4; text-decoration: none; }
  .credits dt a:hover, .credits dt a:focus-visible { color: #8AA2E8; text-decoration: underline; }
  .credits dd { margin: 2px 0 0; font-size: 12px; line-height: 1.55; color: #8A94AF; }
  .credits .fine { margin-top: 12px; }
`;

type Rerender = () => void;

export interface SettingsPanelOptions {
  /**
   * "Check again" reached Anki. Nothing about the settings changed, so
   * nothing else would notice — but a collection that was closed a moment ago
   * is now worth reading word status from.
   */
  onAnkiConnected?: () => void;
}

/**
 * Put every control back in step with the stored settings.
 *
 * A panel can stay open while a setting changes somewhere else — the top
 * bar's furigana switch, the options page, another tab — and a control still
 * showing the old value is worse than none: using it writes that old value.
 * Only the rows built from a setting are touched; the deck lists have their
 * own rules.
 */
export function syncSettingsControls(root: ParentNode): void {
  const cur = settings();
  for (const el of Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]'))) {
    const value = cur[el.dataset.setting as keyof Settings];
    if (el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'checkbox') {
      (el as HTMLInputElement).checked = Boolean(value);
    } else if (el.value !== String(value)) {
      el.value = String(value);
    }
  }
}

/*
 * Say plainly what each language actually gets. Tier 0 finds word boundaries
 * and nothing else, which means lookups match on the surface form — so an
 * inflected word may not find a card you already have. Better stated up
 * front than discovered as flakiness.
 */
const TIER_NOTES: Record<0 | 1 | 2, string> = {
  2: 'Full support: dictionary forms, readings and furigana.',
  1: 'Words and lookups. No dictionary forms yet, so inflected words may not match a card.',
  0: 'Word boundaries only — no dictionary or readings for this language yet.',
};

export function tierNote(code: string): string {
  const tier = TARGET_LANGUAGES.find((l) => l.code === code)?.tier ?? 0;
  return TIER_NOTES[tier as 0 | 1 | 2];
}

let seq = 0;

export function buildSettings(onChange: Rerender, opts: SettingsPanelOptions = {}): HTMLElement {
  const root = document.createElement('div');
  root.className = 'settings';

  const group = (title: string): void => {
    const h = document.createElement('h2');
    h.className = 'grp';
    h.textContent = title;
    root.appendChild(h);
  };

  /**
   * One row: the label names the control, the hint describes it. Both are
   * wired for assistive tech, not just laid out to look related.
   */
  const row = (name: string, control: HTMLElement, hint?: string): HTMLElement => {
    const el = document.createElement('label');
    el.className = 'set';
    const label = document.createElement('span');
    label.className = 'name';
    label.textContent = name;
    el.append(label, control);
    if (hint) {
      const h = document.createElement('span');
      h.className = 'hint';
      h.id = `lg-hint-${++seq}`;
      h.textContent = hint;
      control.setAttribute('aria-describedby', h.id);
      el.appendChild(h);
    }
    root.appendChild(el);
    return el;
  };

  const select = <K extends keyof Settings>(
    key: K, name: string, options: Array<[string, string]>, hint?: string,
  ): HTMLSelectElement => {
    const sel = document.createElement('select');
    sel.name = key;
    sel.dataset.setting = key;
    for (const [value, text] of options) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = text;
      sel.appendChild(o);
    }
    sel.value = String(settings()[key]);
    sel.addEventListener('change', () => {
      // Options are strings; a numeric setting must not come back as one.
      const current = settings()[key];
      const value = (typeof current === 'number' ? Number(sel.value) : sel.value) as Settings[K];
      void setSetting(key, value);
      // Choosing a language is the decision the first-run checklist waits for.
      if (key === 'target' || key === 'native') void setSetting('configured', true);
      onChange();
    });
    row(name, sel, hint);
    return sel;
  };

  const check = <K extends keyof Settings>(key: K, name: string, hint?: string): void => {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = key;
    input.dataset.setting = key;
    input.setAttribute('role', 'switch');   // an on/off, and read out as one
    input.checked = Boolean(settings()[key]);
    input.addEventListener('change', () => {
      void setSetting(key, input.checked as Settings[K]);
      onChange();
    });
    row(name, input, hint);
  };

  group('Languages');
  const target = select('target', "I'm learning",
    TARGET_LANGUAGES.map((l) => [l.code, l.tier === 2 ? l.label : `${l.label} — limited`]),
    tierNote(settings().target));
  target.addEventListener('change', () => {
    const hint = target.closest('.set')?.querySelector('.hint');
    if (hint) hint.textContent = tierNote(target.value);
  });
  select('native', 'Translations in', NATIVE_LANGUAGES.map((l) => [l.code, l.label]),
    'Used for the second subtitle line.');

  group('Looking words up');
  select('interaction', 'Open the card on', [['hover', 'Hover'], ['click', 'Click']]);
  check('hoverPause', 'Pause while hovering', 'Stops the subtitle moving on mid-lookup.');
  check('sidebarHover', 'Preview here on hover', 'A short definition without leaving the transcript.');

  group('Subtitles');
  select('ruby', 'Furigana', [
    ['unknown', 'On new words'], ['always', 'Always'], ['never', 'Never'],
  ]);
  check('markKnown', 'Underline known words', 'Off by default: the screen gets quieter as you learn.');
  select('subtitleSize', 'Text size',
    ['70', '85', '100', '120', '140', '160'].map((v) => [v, `${v}%`]),
    'Relative to the player, so it holds its proportion in fullscreen.');
  select('subtitleBottom', 'Position', [
    ['4', 'Lowest'], ['8', 'Low'], ['12', 'Normal'], ['18', 'Raised'], ['25', 'High'], ['33', 'Highest'],
  ], 'A floor: another subtitle extension on the same player still gets stacked below ours.');
  check('dualSubtitles', 'Show a second subtitle line',
    "Your own language, from the source's own track — not machine translation. " +
    'Needs a full transcript, so it has no effect where only the current line is readable.');

  group('Transcript');
  check('sidebarOpen', 'Show the panel', 'Press S while watching to toggle it.');
  check('sidebarFollow', 'Follow playback',
    'Keeps the line being spoken in view. Scrolling pauses it; a button brings it back.');
  check('headerBar', 'Show the top bar', 'Appears when the cursor nears the top of the player.');
  check('sidebarStats', 'Show progress', 'Comprehension, per-line counts, and the ready-to-learn filter.');

  group('Keys');
  root.appendChild(keyList());

  group('Anki');
  const state = document.createElement('div');
  state.className = 'state';
  state.setAttribute('role', 'status');    // announces "Connected" without stealing focus
  state.textContent = 'Checking…';
  root.appendChild(state);

  // Hidden until there is a collection to choose from: two dead dropdowns
  // reading "Connect Anki first" are furniture, not information.
  const deck = deckSelect('deck');
  const deckRow = row('New cards go to', deck, 'One deck, for everything Libregaku creates.');
  const scope = deckSelect('statusScope');
  const scopeRow = row('Words you already know', scope,
    'Read to decide what to underline. Includes subdecks.');
  deckRow.hidden = true;
  scopeRow.hidden = true;
  check('cardAudio', 'Pronunciation on cards',
    'A recording of the word, when there is one. Never a synthesised voice.');

  const steps = ankiSteps();
  root.appendChild(steps);
  root.appendChild(ankiControls({ state, deck, deckRow, scope, scopeRow, steps }, onChange, opts));

  group('Data and licences');
  root.appendChild(credits());

  return root;
}

/** A deck list, empty until a collection is there to read. */
function deckSelect(name: string): HTMLSelectElement {
  const sel = document.createElement('select');
  sel.name = name;
  sel.disabled = true;
  return sel;
}

/**
 * How to connect Anki, in the order it has to be done.
 *
 * Each step is shown only when it is the one outstanding, so this is never a
 * wall of instructions for someone who is already connected.
 */
function ankiSteps(): HTMLElement {
  const ol = document.createElement('ol');
  ol.className = 'steps';

  const step = (need: string, build: (li: HTMLElement) => void): void => {
    const li = document.createElement('li');
    li.dataset.need = need;
    build(li);
    ol.appendChild(li);
  };

  step('install', (li) => {
    li.append('Install Anki on this computer and open it. ');
    const a = document.createElement('a');
    a.href = ANKI_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'Get Anki';
    li.appendChild(a);
  });

  step('addon', (li) => {
    const b = document.createElement('b');
    b.textContent = 'Tools → Add-ons → Get Add-ons…';
    li.append('In Anki: ', b, ', paste this code, then restart Anki.');
    li.appendChild(chip(ADDON_CODE));
    const a = document.createElement('a');
    a.href = ADDON_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'What this add-on is';
    li.appendChild(a);
  });

  step('origin', (li) => {
    const b = document.createElement('b');
    b.textContent = 'Tools → Add-ons → AnkiConnect → Config';
    const code = document.createElement('code');
    code.textContent = 'webCorsOriginList';
    li.append('In Anki: ', b, ', add this line to ', code, ', then restart Anki.');
    li.appendChild(chip(extensionOrigin()));
  });

  step('running', (li) => {
    li.textContent = 'Leave Anki running while you watch. Nothing is sent anywhere else.';
  });

  return ol;
}

/** A value worth copying, with a button that says it copied. */
function chip(value: string): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'chip';
  const code = document.createElement('code');
  code.textContent = value;
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Copy';
  b.setAttribute('aria-label', `Copy ${value}`);
  b.addEventListener('click', (e) => {
    e.preventDefault();
    void copyText(value).then((ok) => {
      b.textContent = ok ? 'Copied' : 'Select it';
      setTimeout(() => { b.textContent = 'Copy'; }, 1600);
    });
  });
  wrap.append(code, b);
  return wrap;
}

function cards(n: number): string {
  return `${n} card${n === 1 ? '' : 's'}`;
}

/** A stored deck against Anki's list: fine, never chosen, or gone from Anki. */
type DeckPick = 'ok' | 'unset' | 'missing';

interface AnkiUi {
  state: HTMLElement;
  deck: HTMLSelectElement;
  deckRow: HTMLElement;
  scope: HTMLSelectElement;
  scopeRow: HTMLElement;
  steps: HTMLElement;
}

/**
 * Anki is optional and often simply closed. Every state here is a statement of
 * fact rather than an error, because "not running" is normal — and each one
 * names the single thing left to do, because four different failures used to
 * arrive as the same sentence.
 */
function ankiControls(ui: AnkiUi, onChange: Rerender, opts: SettingsPanelOptions): HTMLElement {
  const { state, deck, deckRow, scope, scopeRow, steps } = ui;

  const row = document.createElement('div');
  row.className = 'btnrow';
  const recheck = document.createElement('button');
  recheck.type = 'button';
  recheck.textContent = 'Check again';
  const newDeck = document.createElement('button');
  newDeck.type = 'button';
  newDeck.textContent = 'New deck';
  newDeck.disabled = true;
  const browse = document.createElement('button');
  browse.type = 'button';
  browse.textContent = 'Open in Anki';
  browse.disabled = true;
  row.append(recheck, newDeck, browse);

  /** Show only the steps that are still in the way. */
  const need = (...names: string[]): void => {
    const wanted = new Set(names);
    steps.hidden = wanted.size === 0;
    for (const li of Array.from(steps.children)) {
      (li as HTMLElement).hidden = !wanted.has((li as HTMLElement).dataset.need ?? '');
    }
  };

  /**
   * Fill a deck list without choosing on the learner's behalf.
   *
   * What is stored is what is shown, even when Anki no longer has it. The list
   * used to fall back to whichever deck sorted first and save that, which put
   * mined cards in a deck nobody picked and ticked the first-run "pick a deck"
   * step for them. A status scope that had gone missing showed as "Whole
   * collection" while still reading the missing deck, so every word read as
   * unknown with nothing on screen to say why.
   */
  const fill = (el: HTMLSelectElement, withAll: boolean, decks: string[], value: string): DeckPick => {
    el.replaceChildren();
    const add = (v: string, text: string, disabled = false): void => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = text;
      o.disabled = disabled;
      el.appendChild(o);
    };
    let pick: DeckPick = 'ok';
    if (withAll) add('', 'Whole collection');
    else if (!value) {
      add('', 'Choose a deck…', true);
      pick = 'unset';
    }
    if (value && !decks.includes(value)) {
      add(value, `${value} — not in Anki`, true);
      pick = 'missing';
    }
    for (const d of decks) add(d, withAll ? `${d} (and subdecks)` : d);
    el.value = value;
    el.disabled = false;
    return pick;
  };

  /** Swap a row's explanation for a warning while something needs choosing. */
  const warn = (setting: HTMLElement, text: string | null): void => {
    const hint = setting.querySelector<HTMLElement>('.hint');
    if (!hint) return;
    hint.dataset.plain ??= hint.textContent ?? '';
    hint.textContent = text ?? hint.dataset.plain;
    hint.classList.toggle('warn', text !== null);
  };

  /**
   * `waiting` is how many cards made while Anki was closed are still to go
   * in; `news` is what this check did about them.
   */
  const show = (s: AnkiState, waiting = 0, news = ''): void => {
    const connected = s.kind === 'connected';
    const still = waiting ? ` ${cards(waiting)} waiting to go in.` : '';
    deckRow.hidden = !connected;
    scopeRow.hidden = !connected;
    newDeck.disabled = !connected;
    browse.disabled = !connected || s.cards === 0;

    if (s.kind === 'connected') {
      const cur = settings();
      const pick = fill(deck, false, s.decks, cur.deck);
      warn(deckRow,
        pick === 'unset'
          ? 'Choose one — until you do, new cards have nowhere to go.'
          : pick === 'missing'
            ? `Anki has no deck called “${cur.deck}” now. Choose where new cards go.`
            : null);
      const scoped = fill(scope, true, s.decks, cur.statusScope);
      warn(scopeRow,
        scoped === 'missing'
          ? `Anki has no deck called “${cur.statusScope}” now, so every word reads as unknown. Choose again.`
          : null);
      state.className = 'state ok';
      state.textContent =
        (s.installed === 'created' ? 'Connected. Note type installed. ' : 'Connected. ') + news +
        (s.cards ? `${cards(s.cards)} from Libregaku.` : 'No cards yet.') + still;
      need();
      return;
    }

    if (s.kind === 'offline') {
      state.className = 'state';
      state.textContent =
        `Anki is not answering on port ${ANKI_PORT}. That is normal when it is closed — ` +
        'cards you add wait here, and go in when it opens.' + still;
      need('install', 'addon', 'origin', 'running');
      return;
    }

    if (s.kind === 'blocked') {
      state.className = 'state warn';
      state.textContent = 'Anki is running, but AnkiConnect has not been told to allow this extension.' + still;
      need('origin');
      return;
    }

    if (s.kind === 'occupied') {
      state.className = 'state warn';
      state.textContent =
        `${s.detail} Close whatever is using the port, or Anki cannot have it.` + still;
      need('running');
      return;
    }

    state.className = 'state bad';
    state.textContent = s.detail + still;
    need();
  };

  const refresh = async (): Promise<AnkiState> => {
    state.className = 'state';
    state.textContent = 'Checking…';
    recheck.disabled = true;
    try {
      let s = await probe();
      let news = '';
      if (s.kind === 'connected') {
        // Anki is here: cards kept while it was closed go in now.
        const r = await flushCards(cardAudio);
        if (r?.added) {
          news = `Added the ${cards(r.added)} kept while it was closed. `;
          s = await probe();   // the count it gave is from before them
        }
        if (r?.error && r.remaining) news += `${cards(r.remaining)} could not be added: ${r.error} `;
      }
      show(s, (await queuedCards()).length, news);
      return s;
    } finally {
      recheck.disabled = false;
    }
  };

  deck.addEventListener('change', () => {
    void setSetting('deck', deck.value);
    warn(deckRow, null);
    onChange();
  });
  scope.addEventListener('change', () => {
    void setSetting('statusScope', scope.value);
    warn(scopeRow, null);
    onChange();
  });
  recheck.addEventListener('click', () => {
    void refresh().then((s) => {
      if (s.kind === 'connected') opts.onAnkiConnected?.();
    });
  });
  browse.addEventListener('click', () => void browseOurCards());
  newDeck.addEventListener('click', () => {
    const name = prompt('New deck name — use :: for subdecks, e.g. Japanese::Mining');
    if (!name?.trim()) return;
    void createDeck(name.trim()).then(() => setSetting('deck', name.trim())).then(refresh);
  });

  void refresh();
  return row;
}

/** The player's keys (src/content/keys.ts), where someone looking for them will look. */
function keyList(): HTMLElement {
  const dl = document.createElement('dl');
  dl.className = 'keys';
  const KEYS: Array<[string[], string]> = [
    [['←', '→'], 'The line before, the line after'],
    [['↓'], 'This line again'],
    [['↑'], 'Second line on or off'],
    [['A'], 'Add a card for the word looked up'],
    [['K'], 'Mark it known, while its card is open'],
    [['R'], 'Furigana: off, new words, all'],
    [['B'], 'Save the line'],
    [['S'], 'Show or hide this panel'],
    [['Esc'], 'Close the card'],
  ];
  for (const [keys, what] of KEYS) {
    const dt = document.createElement('dt');
    for (const k of keys) {
      const kbd = document.createElement('kbd');
      kbd.textContent = k;
      dt.appendChild(kbd);
    }
    const dd = document.createElement('dd');
    dd.textContent = what;
    dl.append(dt, dd);
  }
  return dl;
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
    'Dictionary data © the Electronic Dictionary Research and Development Group, used under ' +
    'CC BY-SA 4.0. Repackaged as JSON by jmdict-simplified.');
  entry('Lindera · IPADIC', 'https://github.com/lindera/lindera',
    'Morphological analysis. MIT; IPADIC carries its own terms.');
  entry('Jotoba · Jisho', 'https://jotoba.de/',
    'Consulted while the local dictionary downloads. Both serve JMdict.');
  entry('Lucide', 'https://lucide.dev/', 'Interface icons, ISC.');

  const fine = document.createElement('dd');
  fine.className = 'fine';
  fine.textContent = 'Libregaku is MIT. Dictionary data is downloaded at runtime, not redistributed.';
  dl.appendChild(fine);
  return dl;
}
