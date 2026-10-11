import { flushCards, queuedCards } from '../anki/card-queue';
import { browseMarks, browseOurCards, createDeck, probe, type AnkiState } from '../anki/client';
import { ADDON_CODE, ADDON_URL, ANKI_PORT, ANKI_URL, extensionOrigin } from '../anki/endpoint';
import { cardAudio } from '../audio/card-audio';
import { copyText } from './share';
import {
  DEFAULTS, DEFINITION_LANGUAGES, featuresOf, setSetting, settings, type Settings, TARGET_LANGUAGES,
  TRANSLATION_LANGUAGES, UNDERLINES, type UnderlineKey,
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
  .settings { overflow-y: auto; flex: 1; padding: 2px 12px 28px; }

  /*
   * A section's heading is a band of its own — larger, heavier, on a shade —
   * so it reads as the start of a group and never as one more setting: a
   * title the size of a setting's name was taken for one.
   */
  .settings .grp-section { margin: 0; padding: 18px 0 6px; }
  .settings .grp-head {
    margin: 0 -4px 4px; padding: 11px 12px 12px; border-radius: 9px;
    background: #182033; border: 1px solid #263048;
  }
  .settings .grp {
    margin: 0; padding: 0; letter-spacing: -.01em;
    font: 700 17px/1.25 system-ui, -apple-system, sans-serif; color: #F2F5FC;
  }
  .settings .grp-about { margin: 4px 0 0; font-size: 12.5px; line-height: 1.45; color: #A3ACC4; }
  /* The rows under a heading start without a line of their own: the band ends the heading. */
  .settings .grp-rows > .set:first-child { border-top: 0; }

  .set {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 14px; row-gap: 4px;
    padding: 12px 4px;
    border-top: 1px solid #1C2436;
  }
  label.set { cursor: pointer; }
  .set:focus-within { background: rgba(242, 245, 252, .04); }
  .set > .name { font-size: 14px; font-weight: 500; color: #E8ECF6; min-width: 0; }
  .set > .hint {
    grid-column: 1 / -1;
    font-size: 12.5px; line-height: 1.5; color: #A3ACC4;
  }
  .set > .hint.warn { color: #E2B866; }

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
  .set select:hover:not(:disabled) { border-color: #4A5470; }
  .set select:disabled { opacity: .45; cursor: default; }
  .set select:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 1px; }

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
  .set input[type=checkbox]:checked { background: #E8ECF6; border-color: #E8ECF6; }
  .set input[type=checkbox]:checked::before { transform: translateX(14px); background: #0D111C; }
  .set input[type=checkbox]:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    .set input[type=checkbox], .set input[type=checkbox]::before { transition: none; }
  }

  /*
   * Where Anki stands, as a line of text rather than a box, led by a dot
   * whose colour is the state the text names: connected, needs a hand, or
   * failed. Grey when it is simply closed — that is normal, not an error.
   */
  .state {
    display: flex; gap: 9px; align-items: flex-start;
    margin: 12px 4px; font-size: 13px; line-height: 1.55; color: #A3ACC4;
  }
  .state::before {
    content: ''; flex: none; width: 8px; height: 8px; margin-top: .45em;
    border-radius: 50%; background: #5A6480;
  }
  .state.ok   { color: #7CC3AC; }
  .state.ok::before   { background: #63AF97; }
  .state.warn { color: #E2B866; }
  .state.warn::before { background: #D9A64A; }
  .state.bad  { color: #EE927E; }
  .state.bad::before  { background: #E5806C; }
  .btnrow { display: flex; gap: 6px; padding: 12px 4px; flex-wrap: wrap; border-top: 1px solid #1C2436; }
  .btnrow button {
    font: 500 12.5px/1 system-ui, -apple-system, sans-serif; letter-spacing: 0;
    text-transform: none; padding: 8px 12px; border-radius: 7px;
    border: 1px solid #2A3348; background: #12172A; color: #C7CFE2; cursor: pointer;
  }
  .btnrow button:hover:not(:disabled) { border-color: #8A94AF; color: #F2F5FC; }
  .btnrow button:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; }
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
  .steps { margin: 0; padding: 4px 4px 2px 22px; color: #C7CFE2; font-size: 13px; line-height: 1.6; }
  .steps li { margin-bottom: 10px; }
  .steps li::marker { color: #8A94AF; font-variant-numeric: tabular-nums; }
  .steps b { color: #E8ECF6; font-weight: 600; }
  .steps a { color: #E8ECF6; text-decoration-color: #8A94AF; text-underline-offset: 3px; }
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
    border: 1px solid #2A3348; background: #182033; color: #B4BDD4; cursor: pointer;
  }
  .chip button:hover { border-color: #8A94AF; color: #F2F5FC; }

  .keys {
    display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center;
    gap: 10px 14px; margin: 0; padding: 14px 4px;
  }
  .keys dt { display: flex; gap: 4px; }
  .keys dd { margin: 0; font-size: 13px; line-height: 1.4; color: #C2C9DC; }
  .keys kbd {
    min-width: 14px; padding: 4px 6px; text-align: center;
    font: 600 12px/1 system-ui, -apple-system, sans-serif; color: #E8ECF6;
    background: #12172A; border: 1px solid #2A3348; border-bottom-width: 2px; border-radius: 5px;
  }

  /*
   * A colour: the platform's picker, in a box the size of a select. The
   * row's name is underlined in the colour, the way a word will be.
   */
  .set input[type=color] {
    justify-self: end; width: 46px; height: 28px; padding: 3px; margin: 0;
    background: #12172A; border: 1px solid #2A3348; border-radius: 6px; cursor: pointer;
  }
  .set input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
  .set input[type=color]::-webkit-color-swatch { border: 0; border-radius: 3px; }
  .set input[type=color]:hover { border-color: #4A5470; }
  .set input[type=color]:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 1px; }
  .set.color > .name { justify-self: start; padding-bottom: 2px; }
  .set.color > .name[data-s="unknown"]  { box-shadow: inset 0 -2.5px 0 var(--c); }
  .set.color > .name[data-s="learning"] { box-shadow: inset 0 -1.5px 0 var(--c); }
  .set.color > .name[data-s="tracking"] { box-shadow: inset 0 -2px 0 var(--c); }
  .set.color > .name[data-s="known"]    { box-shadow: inset 0 -1.5px 0 var(--c); }

  .set .perm {
    justify-self: end; font: 500 12.5px/1 system-ui, -apple-system, sans-serif; letter-spacing: 0;
    text-transform: none; padding: 8px 12px; border-radius: 7px; cursor: pointer;
    border: 1px solid #2A3348; background: #12172A; color: #C7CFE2;
  }
  .set .perm:hover { border-color: #8A94AF; color: #F2F5FC; }
  .set .perm:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; }

  .credits { padding: 12px 4px 14px; margin: 0; border-top: 1px solid #1C2436; }
  .credits dt { margin-top: 12px; font-size: 13px; }
  .credits dt:first-child { margin-top: 4px; }
  .credits dt a { color: #B4BDD4; text-decoration: none; }
  .credits dt a:hover, .credits dt a:focus-visible { color: #F2F5FC; text-decoration: underline; }
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
    if (el.type === 'color') swatch(el as HTMLInputElement);
  }
  showFor(root, cur.target);
}

/** Underline a colour row's name in the colour its picker holds. */
function swatch(input: HTMLInputElement): void {
  input.closest<HTMLElement>('.set')?.style.setProperty('--c', input.value);
}

/** A setting only some languages have a use for, such as Furigana. */
type Feature = 'readings' | 'characters' | 'definitions';

/** Rows that need what the target language lacks are hidden, and come back with it. */
function showFor(root: ParentNode, target: string): void {
  const has = featuresOf(target);
  for (const row of Array.from(root.querySelectorAll<HTMLElement>('[data-needs]'))) {
    row.hidden = !has[row.dataset.needs as Feature];
  }
}

/*
 * Say plainly what each language actually gets. Tier 0 finds word boundaries
 * and nothing else, which means lookups match on the surface form — so an
 * inflected word may not find a card you already have. Better stated up
 * front than discovered as flakiness.
 */
const TIER_NOTES: Record<0 | 1 | 2, string> = {
  2: 'Full support, including readings and furigana.',
  1: "Lookups work, but an inflected word may not match its card yet.",
  0: 'Basic support: words are split, but there is no dictionary or readings yet.',
};

export function tierNote(code: string): string {
  const tier = TARGET_LANGUAGES.find((l) => l.code === code)?.tier ?? 0;
  return TIER_NOTES[tier as 0 | 1 | 2];
}

let seq = 0;

export function buildSettings(onChange: Rerender, opts: SettingsPanelOptions = {}): HTMLElement {
  const root = document.createElement('div');
  root.className = 'settings';
  // Rows a language has no use for go as the target changes, here or elsewhere.
  root.addEventListener('change', (e) => {
    if ((e.target as HTMLElement | null)?.dataset?.setting === 'target') {
      showFor(root, (e.target as HTMLSelectElement).value);
    }
  });

  /*
   * Each group is a section of its own: a heading, a line saying what it is
   * for, and its rows. The narrow transcript panel shows them as one list
   * with small headings; the settings page lays each out as a card and links
   * to it by id from its contents.
   */
  let into: HTMLElement = root;
  const group = (title: string, about?: string): void => {
    const section = document.createElement('section');
    section.className = 'grp-section';
    section.id = `lg-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    const head = document.createElement('div');
    head.className = 'grp-head';
    const h = document.createElement('h2');
    h.className = 'grp';
    h.textContent = title;
    head.appendChild(h);
    if (about) {
      const p = document.createElement('p');
      p.className = 'grp-about';
      p.textContent = about;
      head.appendChild(p);
    }
    const rows = document.createElement('div');
    rows.className = 'grp-rows';
    section.append(head, rows);
    root.appendChild(section);
    into = rows;
  };
  const add = (el: HTMLElement): void => {
    into.appendChild(el);
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
    add(el);
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

  /** A row shown only while the target language has `feature`. */
  const needs = (control: HTMLElement, feature: Feature): void => {
    const set = control.closest<HTMLElement>('label.set');
    if (!set) return;
    set.dataset.needs = feature;
    set.hidden = !featuresOf(settings().target)[feature];
  };

  const check = <K extends keyof Settings>(key: K, name: string, hint?: string): HTMLInputElement => {
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
    return input;
  };

  /**
   * A colour, from the platform's picker. Dragging in the picker repaints the
   * row's own underline; letting go saves it, and the subtitle follows.
   */
  const color = (key: UnderlineKey, name: string, hint: string): HTMLInputElement => {
    const input = document.createElement('input');
    input.type = 'color';
    input.name = key;
    input.dataset.setting = key;
    input.value = settings()[key];
    const set = row(name, input, hint);
    set.classList.add('color');
    set.querySelector('.name')?.setAttribute('data-s', UNDERLINES[key]);
    swatch(input);
    input.addEventListener('input', () => swatch(input));
    input.addEventListener('change', () => {
      void setSetting(key, input.value);
      onChange();
    });
    return input;
  };

  group('Languages', "Choose the language you're learning and the languages used to explain it.");
  const target = select('target', "I'm learning",
    TARGET_LANGUAGES.map((l) => [l.code, l.tier === 2 ? l.label : `${l.label} — limited`]),
    tierNote(settings().target));
  target.addEventListener('change', () => {
    const hint = target.closest('.set')?.querySelector('.hint');
    if (hint) hint.textContent = tierNote(target.value);
  });
  // A translation chosen from the old, shorter list stays offered, so it is never silently changed.
  const translations = TRANSLATION_LANGUAGES.map((l): [string, string] => [l.code, l.label]);
  const was = settings().native;
  if (!translations.some(([code]) => code === was)) {
    translations.push([was, DEFINITION_LANGUAGES.find((l) => l.code === was)?.label ?? was]);
  }
  select('native', 'Translation language', translations,
    "Shown under the subtitles you're learning, when the video has subtitles in this language.");
  needs(select('definitions', 'Definition language', DEFINITION_LANGUAGES.map((l) => [l.code, l.label]),
    'The language word definitions are written in. Only these are available.'), 'definitions');

  group('Looking words up', 'Choose how and when word lookups appear.');
  select('interaction', 'Look words up on',
    [['hover', 'Hover'], ['shift', 'Hover with Shift held'], ['click', 'Click']],
    'Clicking a word always works too.');
  check('hoverPause', 'Pause while looking up', 'Pauses the video while your pointer is on a word.');
  check('sidebarHover', 'Quick definitions in the transcript',
    'Shows a short definition when you point at a word in the transcript.');

  group('Word popup', 'Choose what the popup shows when you look up a word.');
  check('cardMarks', 'Known and Ignore buttons',
    "Known hides a word's underline; Ignore leaves it out of counts. Neither adds a card.");
  check('cardTrack', 'Track button',
    "Gives words you want to notice a purple underline. Doesn't add a card.");
  check('cardDeckMenu', 'Deck menu',
    'Adds a ▾ next to Add to Anki for choosing another deck. New cards then go there.');
  check('cardAddLine', 'Sentence cards',
    'Adds a button that makes a card from the whole sentence, with its audio and a screenshot.');
  needs(check('cardKanji', 'Kanji breakdown', "Shows each kanji's meanings and readings."), 'characters');
  check('lookupElsewhere', 'Examples from this video',
    'Shows other sentences in this video that use the word. Click one to play it.');

  group('Subtitles', 'Adjust how subtitles look on the video.');
  const ruby = select('ruby', 'Furigana', [
    ['unknown', 'On new words'], ['always', 'Always'], ['never', 'Never'],
  ], 'Readings above kanji. Press R to switch while watching.');
  needs(ruby, 'readings');
  check('blurPrimary', 'Blur subtitles',
    'For listening practice: subtitles stay blurred until you point at them. Press H to switch.');
  select('subtitleSize', 'Text size',
    ['70', '85', '100', '120', '140', '160'].map((v) => [v, `${v}%`]),
    'Scales with the player, so it looks the same in fullscreen.');
  select('subtitleBottom', 'Position', [
    ['4', 'Lowest'], ['8', 'Low'], ['12', 'Normal'], ['18', 'Raised'], ['25', 'High'], ['33', 'Highest'],
  ], 'How high subtitles sit. Another subtitle extension on the same player stays below them.');
  check('dualSubtitles', 'Show translation',
    "Shows subtitles in your translation language under the ones you're learning. They come from the site, " +
    'not machine translation, and need a full transcript of the video.');

  group('Underlines', 'Each colour shows how well you know a word. Click one to change it.');
  color('colorUnknown', 'New words', 'Words with no card in Anki.');
  color('colorLearning', 'Learning', "Words with a card that isn't mature yet.");
  color('colorTracking', 'Tracked', "Words you're tracking.");
  color('colorKnown', 'Known', 'Words with a mature card, or marked known.');
  check('markKnown', 'Underline known words', 'Off by default, so the screen gets quieter as you learn.');
  {
    const set = document.createElement('div');
    set.className = 'set';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = 'Default colours';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'perm';
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => {
      for (const key of Object.keys(UNDERLINES) as UnderlineKey[]) void setSetting(key, DEFAULTS[key]);
      syncSettingsControls(root);
      onChange();
    });
    set.append(name, reset);
    add(set);
  }

  group('Transcript', 'The panel beside the video that lists every subtitle line.');
  check('sidebarOpen', 'Show the transcript panel', 'Press S to show or hide it while watching.');
  check('sidebarFollow', 'Scroll with the video',
    'Keeps the current line in view. Scrolling yourself pauses this; a button resumes it.');
  check('headerBar', 'Show the player bar', 'Appears along the top of the video when your pointer is near it.');
  select('languageBadge', 'Language badge', [['flag', 'Flag'], ['code', 'Code']],
    "How the player bar shows the language you're learning.");
  check('sidebarStats', 'Count new words',
    'Shows new-word counts on each line, your known-word percentage, and the filters that use them.');

  group('Anki', 'Connect Anki, choose where new cards go, and which decks count as words you know.');
  const state = document.createElement('div');
  state.className = 'state';
  state.setAttribute('role', 'status');    // announces "Connected" without stealing focus
  state.textContent = 'Checking…';
  add(state);

  // Hidden until there is a collection to choose from: two dead dropdowns
  // reading "Connect Anki first" are furniture, not information.
  const deck = deckSelect('deck');
  const deckRow = row('New cards go to', deck, 'The deck every new card is added to.');
  const scope = deckSelect('statusScope');
  const scopeRow = row('Read known words from', scope,
    'Cards in these decks decide which words are underlined. Includes subdecks.');
  deckRow.hidden = true;
  scopeRow.hidden = true;
  const steps = ankiSteps();
  add(steps);
  add(ankiControls({ state, deck, deckRow, scope, scopeRow, steps }, onChange, opts));
  check('marksInAnki', 'Keep marks in Anki',
    'Saves Known, Track and Ignore as hidden notes in Anki (Libregaku::Marks) so they sync to your other ' +
    'devices. Off: they stay in this browser.');

  group('Anki cards', "Choose what's added to each new card, besides the word, reading, meaning and sentence.");
  check('cardAudio', 'Word audio',
    'A recording of the word, when one exists. Never a synthetic voice.');
  check('cardSentenceAudio', 'Sentence audio',
    'Records the sentence by playing it once more. On Netflix, this needs the permission below.');
  check('cardScreenshot', 'Screenshot',
    'A still of the scene. Not available on Netflix, which blocks it.');
  add(capturePermission());

  group('Data and licences');
  add(credits());

  return root;
}

/** A deck list, empty until a collection is there to read. */
/**
 * New cards go to a deck the word status does not read: a word carded there
 * stays underlined as new however long it has been learned. Whole collection
 * (an empty scope) reads every deck.
 */
export function outsideScope(deck: string, scope: string): boolean {
  return Boolean(deck && scope) && deck !== scope && !deck.startsWith(`${scope}::`);
}

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
    li.append('In Anki, go to ', b, ', paste this code, then restart Anki.');
    li.appendChild(chip(ADDON_CODE));
    const a = document.createElement('a');
    a.href = ADDON_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = 'About AnkiConnect';
    li.appendChild(a);
  });

  step('origin', (li) => {
    const b = document.createElement('b');
    b.textContent = 'Tools → Add-ons → AnkiConnect → Config';
    const code = document.createElement('code');
    code.textContent = 'webCorsOriginList';
    li.append('In Anki, go to ', b, ', add this line to ', code, ', then restart Anki.');
    li.appendChild(chip(extensionOrigin()));
  });

  step('running', (li) => {
    li.textContent = 'Keep Anki open while you watch. Cards go straight to Anki on this computer.';
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
  browse.textContent = 'Open cards in Anki';
  browse.disabled = true;
  const marks = document.createElement('button');
  marks.type = 'button';
  marks.textContent = 'Open marks in Anki';
  marks.disabled = true;
  row.append(recheck, newDeck, browse, marks);

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
   * new cards in a deck nobody picked and ticked the first-run "pick a deck"
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
    marks.disabled = !connected;

    if (s.kind === 'connected') {
      const cur = settings();
      const pick = fill(deck, false, s.decks, cur.deck);
      warn(deckRow,
        pick === 'unset'
          ? "Choose a deck. Cards can't be added until you do."
          : pick === 'missing'
            ? `Anki no longer has a deck called “${cur.deck}”. Choose another.`
            : null);
      const scoped = fill(scope, true, s.decks, cur.statusScope);
      warn(scopeRow,
        scoped === 'missing'
          ? `Anki no longer has a deck called “${cur.statusScope}”, so every word shows as new. Choose another.`
          : apart());
      state.className = 'state ok';
      state.textContent =
        (s.installed === 'created' ? 'Connected. Note type installed. ' : 'Connected. ') + news +
        (s.cards ? `${cards(s.cards)} made with Libregaku.` : 'No cards yet.') + still;
      need();
      return;
    }

    if (s.kind === 'offline') {
      state.className = 'state';
      state.textContent =
        `Anki isn't responding on port ${ANKI_PORT}. That's expected while it's closed: ` +
        'new cards wait here and are added when it opens.' + still;
      need('install', 'addon', 'origin', 'running');
      return;
    }

    if (s.kind === 'blocked') {
      state.className = 'state warn';
      state.textContent = "Anki is running, but AnkiConnect doesn't allow this extension yet." + still;
      need('origin');
      return;
    }

    if (s.kind === 'occupied') {
      state.className = 'state warn';
      state.textContent =
        `${s.detail} Close the program using it so Anki can.` + still;
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
          news = `Added ${cards(r.added)} made while Anki was closed. `;
          s = await probe();   // the count it gave is from before them
        }
        if (r?.error && r.remaining) news += `${cards(r.remaining)} couldn't be added: ${r.error} `;
      }
      show(s, (await queuedCards()).length, news);
      return s;
    } finally {
      recheck.disabled = false;
    }
  };

  /** The two decks disagree: cards would go where word status never looks. */
  const apart = (): string | null => {
    const { deck: to, statusScope: read } = settings();
    return outsideScope(to, read)
      ? `New cards go to “${to}”, which isn't included here, so words you add will stay underlined as new. ` +
        'Choose a deck that contains it, or Whole collection.'
      : null;
  };
  deck.addEventListener('change', () => {
    void setSetting('deck', deck.value).then(() => warn(scopeRow, apart()));
    warn(deckRow, null);
    onChange();
  });
  scope.addEventListener('change', () => {
    void setSetting('statusScope', scope.value).then(() => warn(scopeRow, apart()));
    warn(scopeRow, null);
    onChange();
  });
  recheck.addEventListener('click', () => {
    void refresh().then((s) => {
      if (s.kind === 'connected') opts.onAnkiConnected?.();
    });
  });
  browse.addEventListener('click', () => void browseOurCards());
  marks.addEventListener('click', () => void browseMarks());
  newDeck.addEventListener('click', () => {
    const name = prompt('Name the new deck. Use :: for a subdeck, e.g. Japanese::Netflix');
    if (!name?.trim()) return;
    void createDeck(name.trim()).then(() => setSetting('deck', name.trim())).then(refresh);
  });

  void refresh();
  return row;
}

/**
 * Netflix's video is encrypted, so its sentence audio has to come from
 * capturing the tab — an optional permission, asked for here and never at
 * install. A content script cannot ask for a permission, so in the
 * transcript panel this opens the settings page, which can.
 */
function capturePermission(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'set';
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = 'Sentence audio on Netflix';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'perm';
  const hint = document.createElement('span');
  hint.className = 'hint';
  el.append(name, button, hint);

  const canAsk = typeof chrome.permissions?.request === 'function';
  const PERM = { permissions: ['tabCapture'] };
  const granted = async (): Promise<boolean> => {
    try {
      if (canAsk) return await chrome.permissions.contains(PERM);
      const r = (await chrome.runtime.sendMessage({ type: 'capture-permission' })) as { granted?: boolean } | undefined;
      return Boolean(r?.granted);
    } catch {
      return false;
    }
  };
  const paint = async (): Promise<void> => {
    const on = await granted();
    button.dataset.on = String(on);
    button.textContent = on ? 'Remove' : canAsk ? 'Allow' : 'Allow in settings';
    button.hidden = on && !canAsk;
    hint.textContent = on
      ? 'Allowed. On each Netflix tab, click the Libregaku icon and choose Record sentence audio here.'
      : 'Netflix protects its video, so sentence audio is recorded from the tab. This needs your permission.';
  };
  button.addEventListener('click', () => {
    if (!canAsk) {
      void chrome.runtime.sendMessage({ type: 'open-options' }).catch(() => {});
      return;
    }
    const change = button.dataset.on === 'true' ? chrome.permissions.remove(PERM) : chrome.permissions.request(PERM);
    void change.catch(() => false).then(paint);
  });
  void paint();
  return el;
}

/**
 * The player's keys as a view of their own in the transcript panel. They are
 * reference for while a video plays, not settings, so they are not in the
 * settings — and the panel, beside the player, is where they are used.
 */
export function keysView(): HTMLElement {
  const root = document.createElement('div');
  root.className = 'settings keysview';
  const section = document.createElement('section');
  section.className = 'grp-section';
  const rows = document.createElement('div');
  rows.className = 'grp-rows';
  rows.appendChild(keyList());
  section.append(rows);
  root.appendChild(section);
  return root;
}

/** The player's keys (src/content/keys.ts), as a list of key and what it does. */
function keyList(): HTMLElement {
  const dl = document.createElement('dl');
  dl.className = 'keys';
  const KEYS: Array<[string[], string]> = [
    [['←', '→'], 'Previous or next line'],
    [['↓'], 'Replay the line'],
    [['↑'], 'Show or hide the translation'],
    ...(settings().interaction === 'shift'
      ? [[['Shift'], 'Hold to look up the word under the pointer']] as Array<[string[], string]>
      : []),
    [['A'], 'Add the word in the popup to Anki'],
    [['K'], 'Mark the word in the popup as known'],
    ...(featuresOf(settings().target).readings
      ? [[['R'], 'Switch furigana: off, new words, all']] as Array<[string[], string]>
      : []),
    [['H'], 'Blur or unblur subtitles'],
    [['B'], 'Save the current line'],
    [['S'], 'Show or hide the transcript panel'],
    [['Esc'], 'Close the popup'],
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

  entry('JMdict · KANJIDIC2', 'https://www.edrdg.org/jmdict/j_jmdict.html',
    'Dictionary and kanji data © the Electronic Dictionary Research and Development Group, used ' +
    'under CC BY-SA 4.0. Repackaged as JSON by jmdict-simplified.');
  entry('Lindera · IPADIC', 'https://github.com/lindera/lindera',
    'Splits Japanese into words. MIT licence; IPADIC has its own terms.');
  entry('Jotoba · Jisho', 'https://jotoba.de/',
    'Used for lookups while the dictionary downloads. Both use JMdict.');
  entry('Lucide', 'https://lucide.dev/', 'Icons. ISC licence.');

  const fine = document.createElement('dd');
  fine.className = 'fine';
  fine.textContent = 'Libregaku is MIT-licensed. Dictionary data is downloaded from its sources, not bundled.';
  dl.appendChild(fine);
  const built = builtLabel();
  if (built) {
    const when = document.createElement('dd');
    when.className = 'fine built';
    when.textContent = built;
    dl.appendChild(when);
  }
  return dl;
}

/**
 * When this copy was built, in words. An unpacked extension keeps running the
 * code it loaded until it is reloaded, and this is how to tell which that is.
 */
export function builtLabel(iso = typeof __BUILT__ === 'string' ? __BUILT__ : ''): string {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return '';
  const when = new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(at);
  return `This copy was built ${when}.`;
}
