import { flushCards, queuedCards } from '../anki/card-queue';
import { browseMarks, browseOurCards, createDeck, probe, type AnkiState } from '../anki/client';
import { ADDON_CODE, ADDON_URL, ANKI_PORT, ANKI_URL, extensionOrigin } from '../anki/endpoint';
import { defaultDeck } from '../anki/model';
import { cardAudio } from '../audio/card-audio';
import { flagChoices } from '../flags';
import { fill, languageLabel, languageName, ownName, ui, uiLocale } from '../i18n';
import { markSites, siteInfo, SITE_INFO_STYLE } from '../site-info';
import { copyText } from './share';
import {
  DEFAULTS, DEFINITION_LANGUAGES, cardDeck, featuresOf, setSetting, settings, type Settings, TARGET_LANGUAGES, targetVariant,
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
  /*
   * In the panel, a row's words line up with its heading's, and the row
   * reaches the band's edges, so its highlight while it has focus is as wide
   * as the band and keeps clear of the words. The blocks between rows line
   * up with them. The settings page sets its own (options.css).
   */
  .settings .set { margin: 0 -4px; padding: 12px 13px; }
  .settings .state { margin: 12px 9px; }
  .settings .btnrow { margin: 0 -4px; padding: 12px 13px; }
  .settings .steps { padding: 4px 0 2px; padding-inline: 27px 9px; }
  .settings .keys { padding: 14px 9px; }
  .settings .credits { margin: 0 -4px; padding: 12px 13px 14px; }
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
  /* Laid out from the right, in Arabic: a menu's arrow and a switch's knob go with it. */
  .set select:dir(rtl) { padding: 6px 10px 6px 28px; background-position: left 9px center; }
  .set input[type=checkbox]:dir(rtl)::before { left: auto; right: 2px; }
  .set input[type=checkbox]:dir(rtl):checked::before { transform: translateX(-14px); }
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
${SITE_INFO_STYLE}

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
 * own rules, and are drawn again by them.
 */
export function syncSettingsControls(root: ParentNode): void {
  const cur = settings();
  redrawDecks(root);
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
  redrawScripts(root);
  // The flag menu is the language's own, and only means something while the
  // badge is a flag; a change made in another tab arrives here.
  redrawFlags(root);
  const flagRow = root.querySelector('select[name=badgeFlag]')?.closest<HTMLElement>('.set');
  if (flagRow) flagRow.hidden = cur.languageBadge !== 'flag';
}

/**
 * How to draw a panel's deck lists again, by its "New cards go to" list. Each
 * language has decks of its own, so the lists change with the language being
 * learned — which can be changed on the page they are on.
 */
const deckLists = new WeakMap<Element, () => void>();

function redrawDecks(root: ParentNode): void {
  const list = root.querySelector('select[name=deck]');
  if (list) deckLists.get(list)?.();
}

/**
 * The ways the language being learned is written, as that menu's choices:
 * Chinese (Simplified), Chinese (Traditional), named by the browser in the
 * interface's language, with the one in use chosen. None for a language
 * written one way, whose row is hidden.
 */
function fillScripts(sel: HTMLSelectElement): void {
  const cur = settings();
  sel.replaceChildren();
  for (const tag of featuresOf(cur.target).scripts ?? []) {
    const o = document.createElement('option');
    o.value = tag;
    o.textContent = languageLabel(tag);
    sel.appendChild(o);
  }
  sel.value = targetVariant(cur);
}

function redrawScripts(root: ParentNode): void {
  const sel = root.querySelector<HTMLSelectElement>('select[name=script]');
  if (sel) fillScripts(sel);
}

/** Underline a colour row's name in the colour its picker holds. */
function swatch(input: HTMLInputElement): void {
  input.closest<HTMLElement>('.set')?.style.setProperty('--c', input.value);
}

/** What each flag menu was last drawn for: the language, the interface's language and the flag picked. */
const flagsDrawn = new WeakMap<HTMLSelectElement, string>();

function redrawFlags(root: ParentNode): void {
  const list = root.querySelector<HTMLSelectElement>('select[name=badgeFlag]');
  if (list) fillFlags(list);
}

/**
 * The badge's flags for the language being learned: its own first, then the
 * countries where it is spoken, then every other country by name, each as
 * its flag and the country's name. Drawn again only when the language, the
 * interface's language or the flag picked has changed.
 */
function fillFlags(sel: HTMLSelectElement): void {
  const { target, badgeFlag } = settings();
  const picked = badgeFlag[target] ?? '';
  const drawn = [target, uiLocale(), picked].join('\n');
  if (flagsDrawn.get(sel) === drawn) return;
  flagsDrawn.set(sel, drawn);
  sel.replaceChildren();
  const add = (value: string, text: string): HTMLOptionElement => {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = text;
    sel.appendChild(o);
    return o;
  };
  // A language whose own flag is a picture (flagSvg) gets the word alone: a menu shows only text.
  const own = TARGET_LANGUAGES.find((l) => l.code === target)?.flag;
  add('', own ? `${own} ${ui.settings.badgeFlagDefault}` : ui.settings.badgeFlagDefault);
  const { spoken, others } = flagChoices(target, uiLocale());
  // A flag typed in before there was a menu, and not one on it, stays offered, so it is never silently changed.
  if (picked && ![...spoken, ...others].some((c) => c.flag === picked)) add(picked, picked);
  for (const c of spoken) add(c.flag, `${c.flag} ${c.name}`);
  // A rule between the two groups, which cannot be picked.
  add('-', '──────────').disabled = true;
  for (const c of others) add(c.flag, `${c.flag} ${c.name}`);
  sel.value = picked;
}

/** A setting only some languages have a use for, such as Furigana. */
type Feature = 'readings' | 'characters' | 'definitions' | 'scripts';

/** Give a setting's row its name and its hint. */
function named(root: ParentNode, setting: keyof Settings, [name, hint]: [string, string]): void {
  const row = root.querySelector(`[data-setting=${setting}]`)?.closest('.set');
  const label = row?.querySelector('.name');
  if (label) label.textContent = name;
  const said = row?.querySelector('.hint');
  if (said) said.textContent = hint;
}

/** Rows that need what the target language lacks are hidden, and come back with it. */
function showFor(root: ParentNode, target: string, native = settings().native): void {
  const has = featuresOf(target);
  for (const row of Array.from(root.querySelectorAll<HTMLElement>('[data-needs]'))) {
    row.hidden = !has[row.dataset.needs as Feature];
  }
  // Two rows are named for what the language has: furigana or pinyin above
  // its words, kanji or simply characters on a card.
  const t = ui.settings;
  named(root, 'ruby', has.readings === 'pinyin' ? [t.pinyin, t.pinyinHint] : [t.ruby, t.rubyHint]);
  named(root, 'cardKanji', has.characters === 'hanzi' ? [t.cardHanzi, t.cardHanziHint] : [t.cardKanji, t.cardKanjiHint]);
  // Definitions follow your language; a language of their own only where the dictionary has none in it.
  const defs = root.querySelector('select[name=definitions]')?.closest<HTMLElement>('.set');
  if (!defs) return;
  const own = DEFINITION_LANGUAGES.some((l) => l.code === native);
  defs.hidden = !has.definitions || own;
  const hint = defs.querySelector('.hint');
  if (hint) hint.textContent = ui.settings.definitionsHintFor(languageName(native));
}

/*
 * Say plainly what each language actually gets. Tier 0 finds word boundaries
 * and nothing else, which means lookups match on the surface form — so an
 * inflected word may not find a card you already have. Better stated up
 * front than discovered as flakiness. Above that, the note goes by what the
 * language has — readings to draw, and of which kind — never by its name.
 * Read in the interface language when it is shown.
 */
export function tierNote(code: string): string {
  const tier = TARGET_LANGUAGES.find((l) => l.code === code)?.tier ?? 0;
  if (tier === 0) return ui.settings.supportBasic;
  const readings = featuresOf(code).readings;
  return ui.settings[readings === 'furigana' ? 'supportFull' : readings === 'pinyin' ? 'supportPinyin' : 'supportWords'];
}

let seq = 0;

export function buildSettings(onChange: Rerender, opts: SettingsPanelOptions = {}): HTMLElement {
  const root = document.createElement('div');
  root.className = 'settings';
  // Rows a language has no use for go as the target changes, here or elsewhere.
  root.addEventListener('change', (e) => {
    const which = (e.target as HTMLElement | null)?.dataset?.setting;
    if (which === 'target') showFor(root, (e.target as HTMLSelectElement).value);
    // The language's own decks, in place of those of the one just left.
    if (which === 'target') redrawDecks(root);
    // And the scripts it is written in, where there is more than one.
    if (which === 'target') redrawScripts(root);
    // Its own flags too, and the one picked for it.
    if (which === 'target') redrawFlags(root);
    if (which === 'native') showFor(root, settings().target, (e.target as HTMLSelectElement).value);
  });

  /*
   * Each group is a section of its own: a heading, a line saying what it is
   * for, and its rows. The narrow transcript panel shows them as one list
   * with small headings; the settings page lays each out as a card and links
   * to it by id from its contents. The id is the group's own, not made from
   * its heading, so links to it hold in every interface language.
   */
  let into: HTMLElement = root;
  const group = (id: string, title: string, about?: string): void => {
    const section = document.createElement('section');
    section.className = 'grp-section';
    section.id = `lg-${id}`;
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

  const t = ui.settings;

  group('languages', t.languagesHeading, t.languagesAbout);
  const target = select('target', t.target,
    // Limited is boundaries alone: no dictionary forms, so no lookups and no matching a word to its card.
    TARGET_LANGUAGES.map((l) => [l.code, l.tier > 0 ? languageLabel(l.code) : t.targetLimited(languageLabel(l.code))]),
    tierNote(settings().target));
  target.addEventListener('change', () => {
    const hint = target.closest('.set')?.querySelector('.hint');
    if (hint) hint.textContent = tierNote(target.value);
  });
  // Which script, for a language written in more than one: a video often has
  // subtitles in both. Not a data-setting: it holds one choice of each
  // language's, and fillScripts keeps it in step.
  const script = document.createElement('select');
  script.name = 'script';
  fillScripts(script);
  script.addEventListener('change', () => {
    const { target: lang, scripts } = settings();
    void setSetting('scripts', { ...scripts, [lang]: script.value });
    onChange();
  });
  row(t.script, script, t.scriptHint);
  needs(script, 'scripts');
  // Each language in itself, so yours can be found whatever the interface is in.
  // A translation chosen from the old, shorter list stays offered, so it is never silently changed.
  const translations = TRANSLATION_LANGUAGES.map((l): [string, string] => [l.code, ownName(l.code)]);
  const was = settings().native;
  if (!translations.some(([code]) => code === was)) {
    translations.push([was, ownName(was)]);
  }
  select('native', t.native, translations, t.nativeHint);
  // Shown only where the dictionary has no definitions in your language; showFor words its hint.
  select('definitions', t.definitions, DEFINITION_LANGUAGES.map((l) => [l.code, languageLabel(l.code)]),
    t.definitionsHint);

  group('looking-words-up', t.lookupHeading, t.lookupAbout);
  select('interaction', t.interaction,
    [['hover', t.interactionHover], ['shift', t.interactionShift], ['click', t.interactionClick]],
    t.interactionHint);
  check('hoverPause', t.hoverPause, t.hoverPauseHint);
  check('sidebarHover', t.sidebarHover, t.sidebarHoverHint);

  group('word-popup', t.popupHeading, t.popupAbout);
  check('cardMarks', t.cardMarks, t.cardMarksHint);
  check('cardTrack', t.cardTrack, t.cardTrackHint);
  check('cardDeckMenu', t.cardDeckMenu, t.cardDeckMenuHint);
  check('cardAddLine', t.cardAddLine, t.cardAddLineHint);
  needs(check('cardKanji', t.cardKanji, t.cardKanjiHint), 'characters');
  check('lookupElsewhere', t.lookupElsewhere, t.lookupElsewhereHint);

  group('subtitles', t.subtitlesHeading, t.subtitlesAbout);
  const ruby = select('ruby', t.ruby, [
    ['unknown', t.rubyUnknown], ['always', t.rubyAlways], ['never', t.rubyNever],
  ], t.rubyHint);
  needs(ruby, 'readings');
  check('blurPrimary', t.blurPrimary, t.blurPrimaryHint);
  select('subtitleSize', t.subtitleSize,
    ['70', '85', '100', '120', '140', '160'].map((v) => [v, t.subtitleSizeOption(Number(v))]),
    t.subtitleSizeHint);
  select('subtitleBottom', t.subtitleBottom, [
    ['4', t.subtitleBottomLowest], ['8', t.subtitleBottomLow], ['12', t.subtitleBottomNormal],
    ['18', t.subtitleBottomRaised], ['25', t.subtitleBottomHigh], ['33', t.subtitleBottomHighest],
  ], t.subtitleBottomHint);
  check('dualSubtitles', t.dualSubtitles, t.dualSubtitlesHint);

  group('underlines', t.underlinesHeading, t.underlinesAbout);
  check('underlines', t.underlines, t.underlinesHint);
  color('colorUnknown', t.colorUnknown, t.colorUnknownHint);
  color('colorLearning', t.colorLearning, t.colorLearningHint);
  color('colorTracking', t.colorTracking, t.colorTrackingHint);
  color('colorKnown', t.colorKnown, t.colorKnownHint);
  check('markKnown', t.markKnown, t.markKnownHint);
  {
    const set = document.createElement('div');
    set.className = 'set';
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = t.defaultColours;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'perm';
    reset.textContent = t.resetColours;
    reset.addEventListener('click', () => {
      for (const key of Object.keys(UNDERLINES) as UnderlineKey[]) void setSetting(key, DEFAULTS[key]);
      syncSettingsControls(root);
      onChange();
    });
    set.append(name, reset);
    add(set);
  }

  group('transcript', t.transcriptHeading, t.transcriptAbout);
  check('sidebarFollow', t.sidebarFollow, t.sidebarFollowHint);
  check('headerBar', t.headerBar, t.headerBarHint);
  const badge = select('languageBadge', t.languageBadge, [['flag', t.languageBadgeFlag], ['code', t.languageBadgeCode]],
    t.languageBadgeHint);
  // Only meaningful while the badge is a flag, so it is shown only then. No
  // data-setting: the setting holds a flag for each language, not one value for
  // syncSettingsControls to write back, so fillFlags keeps the menu in step.
  const flags = document.createElement('select');
  flags.name = 'badgeFlag';
  fillFlags(flags);
  flags.addEventListener('change', () => {
    const { target, badgeFlag } = settings();
    const next = { ...badgeFlag };
    // The default keeps nothing, so the language's own flag shows.
    if (flags.value) next[target] = flags.value;
    else delete next[target];
    void setSetting('badgeFlag', next);
    onChange();
  });
  const flagSet = row(t.badgeFlag, flags, t.badgeFlagHint);
  flagSet.hidden = settings().languageBadge !== 'flag';
  badge.addEventListener('change', () => { flagSet.hidden = badge.value !== 'flag'; });
  check('sidebarStats', t.sidebarStats, t.sidebarStatsHint);

  group('anki', t.ankiHeading, t.ankiAbout);
  const state = document.createElement('div');
  state.className = 'state';
  state.setAttribute('role', 'status');    // announces "Connected" without stealing focus
  state.textContent = t.ankiChecking;
  add(state);

  // Hidden until there is a collection to choose from: two dead dropdowns
  // reading "Connect Anki first" are furniture, not information.
  const deck = deckSelect('deck');
  const deckRow = row(t.deck, deck, t.deckHint);
  const scope = deckSelect('statusScope');
  const scopeRow = row(t.statusScope, scope, t.statusScopeHint);
  deckRow.hidden = true;
  scopeRow.hidden = true;
  const steps = ankiSteps();
  add(steps);
  add(ankiControls({ state, deck, deckRow, scope, scopeRow, steps }, onChange, opts));
  check('marksInAnki', t.marksInAnki, t.marksInAnkiHint);

  group('anki-cards', t.ankiCardsHeading, t.ankiCardsAbout);
  check('cardAudio', t.cardAudio, t.cardAudioHint);
  check('cardSentenceAudio', t.cardSentenceAudio, t.cardSentenceAudioHint);
  check('cardScreenshot', t.cardScreenshot, t.cardScreenshotHint);
  add(capturePermission());

  group('data-and-licences', t.creditsHeading);
  add(credits());

  showFor(root, settings().target);
  // Every hint that says "protected sites" says which they are.
  markSites(root, uiLocale());
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
    const a = document.createElement('a');
    a.href = ANKI_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = ui.settings.getAnki;
    li.append(...fill(ui.settings.installStep, { link: a }));
  });

  step('addon', (li) => {
    const b = document.createElement('b');
    b.textContent = ui.settings.addonMenu;
    li.append(...fill(ui.settings.addonStep, { menu: b }));
    li.appendChild(chip(ADDON_CODE));
    const a = document.createElement('a');
    a.href = ADDON_URL;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = ui.settings.aboutAnkiConnect;
    li.appendChild(a);
  });

  step('origin', (li) => {
    const b = document.createElement('b');
    b.textContent = ui.settings.originMenu;
    const code = document.createElement('code');
    code.textContent = 'webCorsOriginList';
    li.append(...fill(ui.settings.originStep, { menu: b, setting: code }));
    li.appendChild(chip(extensionOrigin()));
  });

  step('running', (li) => {
    li.textContent = ui.settings.runningStep;
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
  b.textContent = ui.settings.copy;
  b.setAttribute('aria-label', ui.settings.copyValue(value));
  b.addEventListener('click', (e) => {
    e.preventDefault();
    void copyText(value).then((ok) => {
      b.textContent = ok ? ui.settings.copied : ui.settings.copyFailed;
      setTimeout(() => { b.textContent = ui.settings.copy; }, 1600);
    });
  });
  wrap.append(code, b);
  return wrap;
}

/** A stored deck against Anki's list: fine, or gone from Anki. */
type DeckPick = 'ok' | 'missing';

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
function ankiControls(els: AnkiUi, onChange: Rerender, opts: SettingsPanelOptions): HTMLElement {
  const { state, deck, deckRow, scope, scopeRow, steps } = els;
  const t = ui.settings;

  const row = document.createElement('div');
  row.className = 'btnrow';
  const recheck = document.createElement('button');
  recheck.type = 'button';
  recheck.textContent = t.checkAgain;
  const newDeck = document.createElement('button');
  newDeck.type = 'button';
  newDeck.textContent = t.newDeck;
  newDeck.disabled = true;
  const browse = document.createElement('button');
  browse.type = 'button';
  browse.textContent = t.openCards;
  browse.disabled = true;
  const marks = document.createElement('button');
  marks.type = 'button';
  marks.textContent = t.openMarks;
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
   *
   * One deck is listed before Anki has it: the language's own (cardDeck),
   * where new cards go until another is picked. Its first card makes it, so
   * it is never one that has gone missing.
   */
  const fillDecks = (el: HTMLSelectElement, withAll: boolean, decks: string[], value: string): DeckPick => {
    el.replaceChildren();
    const add = (v: string, text: string, disabled = false): void => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = text;
      o.disabled = disabled;
      el.appendChild(o);
    };
    let pick: DeckPick = 'ok';
    const own = withAll ? null : defaultDeck(settings().target);
    if (withAll) add('', t.wholeCollection);
    else if (own && !decks.includes(own)) add(own, own);
    if (value && value !== own && !decks.includes(value)) {
      add(value, t.deckNotInAnki(value), true);
      pick = 'missing';
    }
    for (const d of decks) add(d, withAll ? t.deckAndSubdecks(d) : d);
    el.value = value;
    el.disabled = false;
    return pick;
  };

  /** Both lists, from Anki's decks and what is kept for the language being learned. */
  const fill = (decks: string[]): void => {
    const cur = settings();
    const pick = fillDecks(deck, false, decks, cardDeck(cur));
    warn(deckRow, pick === 'missing' ? t.deckMissing(cur.deck) : null);
    const scoped = fillDecks(scope, true, decks, cur.statusScope);
    warn(scopeRow, scoped === 'missing' ? t.statusScopeMissing(cur.statusScope) : apart());
  };
  /** Anki's decks as it last listed them, and what the lists were last drawn for. */
  let listed: string[] | null = null;
  let drawnFor = '';
  const drawn = (): string => {
    const cur = settings();
    return [cur.target, cur.deck, cur.statusScope].join('\n');
  };
  deckLists.set(deck, () => {
    if (!listed || drawn() === drawnFor) return;
    drawnFor = drawn();
    fill(listed);
  });

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
   * in; `news` is what this check did about them, a sentence each.
   */
  const show = (s: AnkiState, waiting = 0, news: string[] = []): void => {
    const connected = s.kind === 'connected';
    // Whole sentences, one after another, and the cards still waiting last.
    const line = (...sentences: string[]): string =>
      [...sentences, ...(waiting ? [t.cardsWaiting(waiting)] : [])].join(ui.common.sentenceGap);
    deckRow.hidden = !connected;
    scopeRow.hidden = !connected;
    newDeck.disabled = !connected;
    browse.disabled = !connected || s.cards === 0;
    marks.disabled = !connected;

    listed = s.kind === 'connected' ? s.decks : null;
    if (s.kind === 'connected') {
      drawnFor = drawn();
      fill(s.decks);
      state.className = 'state ok';
      state.textContent = line(
        t.ankiConnected,
        ...(s.installed === 'created' ? [t.noteTypeInstalled] : []),
        ...news,
        s.cards ? t.cardsMade(s.cards) : t.noCards,
      );
      need();
      return;
    }

    if (s.kind === 'offline') {
      state.className = 'state';
      state.textContent = line(t.ankiOffline(ANKI_PORT));
      need('install', 'addon', 'origin', 'running');
      return;
    }

    if (s.kind === 'blocked') {
      state.className = 'state warn';
      state.textContent = line(t.ankiBlocked);
      need('origin');
      return;
    }

    if (s.kind === 'occupied') {
      state.className = 'state warn';
      state.textContent = line(t.ankiOccupied(s.detail));
      need('running');
      return;
    }

    state.className = 'state bad';
    state.textContent = line(s.detail);
    need();
  };

  const refresh = async (): Promise<AnkiState> => {
    state.className = 'state';
    state.textContent = t.ankiChecking;
    recheck.disabled = true;
    try {
      let s = await probe();
      const news: string[] = [];
      if (s.kind === 'connected') {
        // Anki is here: cards kept while it was closed go in now.
        const r = await flushCards(cardAudio);
        if (r?.added) {
          news.push(t.cardsFlushed(r.added));
          s = await probe();   // the count it gave is from before them
        }
        if (r?.error && r.remaining) news.push(t.cardsNotFlushed(r.remaining, r.error));
      }
      show(s, (await queuedCards()).length, news);
      return s;
    } finally {
      recheck.disabled = false;
    }
  };

  /** The two decks disagree: cards would go where word status never looks. */
  const apart = (): string | null => {
    const cur = settings();
    const to = cardDeck(cur);
    return outsideScope(to, cur.statusScope) ? t.statusScopeOutside(to) : null;
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
    const name = prompt(t.newDeckPrompt);
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
  name.textContent = ui.settings.capture;
  markSites(name, uiLocale());
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
    const t = ui.settings;
    button.textContent = on ? t.captureRemove : canAsk ? t.captureAllow : t.captureAllowInSettings;
    button.hidden = on && !canAsk;
    hint.textContent = on ? t.captureAllowed : t.captureNeeded;
    // Which sites: on hover, and the help chapter on click.
    if (!markSites(hint, uiLocale())) hint.append(siteInfo(uiLocale()));
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
  const t = ui.settings;
  const KEYS: Array<[string[], string]> = [
    [['←', '→'], t.keyLine],
    [['↓'], t.keyReplay],
    [['↑'], t.keyTranslation],
    ...(settings().interaction === 'shift'
      ? [[['Shift'], t.keyShiftLookup]] as Array<[string[], string]>
      : []),
    [['A'], t.keyAdd],
    [['K'], t.keyKnown],
    // Named for what the language draws above its words; no key where it draws nothing.
    ...(featuresOf(settings().target).readings
      ? [[['R'], featuresOf(settings().target).readings === 'pinyin' ? t.keyPinyin : t.keyFurigana]] as Array<[string[], string]>
      : []),
    [['H'], t.keyBlur],
    [['B'], t.keySave],
    [['S'], t.keyTranscript],
    [['Esc'], t.keyClose],
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

  // The names are the projects' own, the same in every language.
  entry('JMdict · KANJIDIC2', 'https://www.edrdg.org/jmdict/j_jmdict.html', ui.settings.creditJmdict);
  entry('CC-CEDICT', 'https://www.mdbg.net/chinese/dictionary?page=cc-cedict', ui.settings.creditCedict);
  entry('Wiktionary', 'https://kaikki.org/', ui.settings.creditWiktionary);
  entry('Lindera · IPADIC · mecab-ko-dic', 'https://github.com/lindera/lindera', ui.settings.creditLindera);
  entry('Unihan', 'https://www.unicode.org/reports/tr38/', ui.settings.creditUnihan);
  entry('Jotoba · Jisho', 'https://jotoba.de/', ui.settings.creditJotoba);
  entry('Lingua Libre · Wikimedia Commons', 'https://commons.wikimedia.org/wiki/Commons:Lingua_Libre', ui.settings.creditCommons);
  entry('audio-cmn · Shtooka', 'https://github.com/hugolpz/audio-cmn', ui.settings.creditAudioCmn);
  entry('Lucide', 'https://lucide.dev/', ui.settings.creditLucide);

  const fine = document.createElement('dd');
  fine.className = 'fine';
  fine.textContent = ui.settings.licence;
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
 * The date is written as the interface language writes dates.
 */
export function builtLabel(iso = typeof __BUILT__ === 'string' ? __BUILT__ : ''): string {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return '';
  const when = new Intl.DateTimeFormat(uiLocale(), {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(at);
  return ui.settings.built(when);
}
