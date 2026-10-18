import type { OverrideStatus, Status } from '../anki/status';
import { pronounce } from '../audio/pronounce';
import type { Characters, LookupResult } from '../dict/client';
import { grammarLabel, ui, uiDirection, uiLocale } from '../i18n';
import type { Token } from '../morphology/types';
import { definitionLanguage, dictionaryOf, featuresOf, settings } from '../settings';
import { letterKey } from './keys';
import { icon } from './icons';
import { copyText } from './share';
import { TIP_STYLE, tooltips } from './tooltip';

/**
 * The lookup card.
 *
 * Opens on click, never on hover — a popup that follows the cursor makes
 * reading along with playing video impossible. It lives in its own shadow root
 * so the host page cannot restyle it, and it repositions to stay on screen
 * without ever covering the word it describes.
 */

const STYLE = `
  :host {
    /* Text starts where the interface's language starts: the page around sets left, which is wrong in Arabic. */
    text-align: start !important;
    position: absolute !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  }
  /*
   * A column whose middle scrolls. The card is capped to the room beside the
   * word, and what gives way is the list of senses — never the status
   * buttons, which used to be the part a short player cut off.
   */
  .card {
    pointer-events: auto;
    position: relative;
    display: flex; flex-direction: column;
    width: min(400px, 86vw); box-sizing: border-box;
    background: #12172A; color: #E8ECF6;
    border: 1px solid #2A3348; border-radius: 12px;
    box-shadow: 0 10px 40px -8px rgba(0,0,0,.75);
    font: 15px/1.5 system-ui, -apple-system, "Hiragino Sans", sans-serif;
    overflow: hidden;
  }
  .head, .meta, .tools, .marks { flex: none; }
  .body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; }
  .head { display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px 0; }
  .hw { flex: 1; min-width: 0; }
  .reading { font: 500 12px/1.4 ui-monospace, monospace; color: #B8C0D4; letter-spacing: .04em; }
  .word { font-size: 27px; font-weight: 600; line-height: 1.2; margin-top: 1px; }
  .meta {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 8px 16px 0; font: 500 12px/1.4 ui-monospace, monospace; color: #838DA8;
  }
  .badge { padding: 3px 8px; border-radius: 5px; background: #16281F; color: #63AF97; letter-spacing: .05em; }
  .tools { display: flex; gap: 7px; padding: 12px 16px; border-bottom: 1px solid #212939; }
  /* Who recorded the word just played, and under what licence: a link to its page. */
  .credit {
    flex: none; display: block; padding: 6px 16px; border-bottom: 1px solid #212939;
    font-size: 11px; line-height: 1.4; color: #8A94AF; text-decoration: none;
  }
  .credit[hidden] { display: none; }
  .credit:hover, .credit:focus-visible { color: #E8ECF6; text-decoration: underline; }
  .credit:focus-visible { outline: 2px solid #F2F5FC; outline-offset: -2px; }
  .tb {
    width: 34px; height: 34px; border-radius: 50%;
    border: 1px solid #2A3348; background: #1B2234; color: #B4BDD4;
    cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;
  }
  .tb svg { display: block; }
  .tb.busy { color: #F2F5FC; }
  .tb.busy svg, .mk[data-state="busy"] svg, .add[data-state="busy"] svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .tb.busy svg, .mk[data-state="busy"] svg, .add[data-state="busy"] svg { animation: none; }
  }
  .loading { padding: 16px; color: #D9A64A; font-size: 13.5px; }
  /* The marks: small toggles beside the word, each in its status colour, filled once made. */
  .marks { display: flex; gap: 6px; flex: none; margin-top: 2px; }
  .mk {
    width: 30px; height: 30px; padding: 0; border-radius: 50%; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid;
  }
  .mk svg { display: block; }
  .mk.known  { --c: var(--lg-known, #63AF97); }
  .mk.track  { --c: var(--lg-tracking, #A78BFA); }
  .mk.known, .mk.track { color: var(--c); border-color: color-mix(in srgb, var(--c) 38%, #141A2A); }
  .mk.ignore { color: #838DA8; border-color: #2A3348; }
  .mk.known[aria-pressed="true"], .mk.track[aria-pressed="true"] { background: var(--c); color: #0D111C; border-color: var(--c); }
  .mk.ignore[aria-pressed="true"] { background: #838DA8; color: #0D111C; border-color: #838DA8; }
  .mk:hover { filter: brightness(1.2); }
  /*
   * The one coral button: making a card of a word not learned yet, as the
   * underline marks it. The foot of the card, full width and named, because
   * it is what the card is for — beside the marks, it was taken for one.
   */
  .foot { display: flex; padding: 12px 16px; border-top: 1px solid #212939; }
  .add, .more {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px; cursor: pointer;
    background: #E5806C; color: #0D111C; border: 1px solid #E5806C;
  }
  .add {
    flex: 1; padding: 10px 12px; border-radius: 8px;
    font: 600 12px/1.2 ui-monospace, monospace; letter-spacing: .07em; text-transform: uppercase;
  }
  .add.done { background: #1B2234; color: #E8ECF6; border-color: #3A4560; }
  .add.has { background: #16281F; color: #63AF97; border-color: #2A5245; }
  /* Add and ▾ as one split button, ▾ where the line ends: on the right, or on the left in Arabic. */
  .more {
    width: 40px; padding: 0; border-radius: 0;
    border-start-end-radius: 8px; border-end-end-radius: 8px;
    border-inline-start-color: rgba(13,17,28,.4);
  }
  .foot:has(.more) .add { border-start-end-radius: 0; border-end-end-radius: 0; }
  .add:hover, .more:hover { filter: brightness(1.08); }
  .add:focus-visible, .more:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; }
  .deckmenu {
    position: absolute; inset-inline-end: 16px; bottom: 62px; z-index: 4;
    min-width: 200px; max-width: calc(100% - 32px); max-height: 240px; overflow-y: auto;
    padding: 6px; border-radius: 10px; background: #1B2234; border: 1px solid #2A3348;
    box-shadow: 0 10px 30px -8px rgba(0,0,0,.7);
  }
  .deckmenu[hidden] { display: none; }
  .deckmenu button {
    display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 10px;
    background: none; border: 0; border-radius: 6px; cursor: pointer; text-align: start;
    color: #C7CFE2; font: 13.5px/1.3 system-ui, -apple-system, sans-serif;
  }
  .deckmenu button:hover, .deckmenu button:focus-visible { background: #232C42; color: #E8ECF6; }
  .deckmenu button:focus-visible { outline: 2px solid #F2F5FC; outline-offset: -2px; }
  .deckmenu button.current { color: #E8ECF6; font-weight: 600; }
  .deckmenu-note { padding: 8px 10px; color: #8A94AF; font-size: 13px; }
  .tb:hover { border-color: #8A94AF; color: #E8ECF6; }
  /* The card itself, when it takes focus from the word it is for. */
  .card:focus-visible, .tb:focus-visible, .mk:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; }
  ol { margin: 0; padding: 12px 16px 12px 34px; }
  li[hidden] { display: none; }
  .more-senses {
    display: block; margin: -4px 16px 10px 34px; padding: 0; border: 0; background: none; cursor: pointer;
    color: #8A94AF; font: 12.5px/1.4 system-ui, -apple-system, sans-serif;
  }
  .more-senses:hover { color: #E8ECF6; text-decoration: underline; }
  /* A section past the meanings: one line until opened. */
  .fold { border-top: 1px solid #212939; }
  .fold-head {
    display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;
    padding: 10px 16px; border: 0; background: none; cursor: pointer; text-align: start;
    color: #8A94AF; font: 600 11px/1.4 ui-monospace, monospace; letter-spacing: .07em; text-transform: uppercase;
  }
  .fold-head:hover { color: #E8ECF6; background: #161C2C; }
  .fold-head:focus-visible { outline: 2px solid #F2F5FC; outline-offset: -2px; }
  .fold-head svg { flex: none; transition: transform .12s ease; }
  .fold.open .fold-head svg { transform: rotate(180deg); }
  .fold > [hidden] { display: none; }
  @media (prefers-reduced-motion: reduce) { .fold-head svg { transition: none; } }
  li { margin-bottom: 5px; color: #C7CFE2; }
  li:last-child { margin-bottom: 0; }
  .sense-pos { font: 500 11px/1.4 ui-monospace, monospace; color: #6B7490; letter-spacing: .05em; }
  .trace {
    padding: 11px 16px; border-top: 1px solid #212939;
    font: 12px/1.6 ui-monospace, monospace; color: #838DA8;
  }
  .trace b { color: #E8ECF6; font-weight: 600; }
  .leftovers { padding: 0 16px 10px; color: #8A94AF; font-size: 13px; line-height: 1.5; }
  .leftovers b { color: #E8ECF6; font-weight: 600; }
  .grammar {
    margin-top: 4px; color: #D9A64A;
    font: 500 11px/1.5 ui-monospace, monospace; letter-spacing: .06em;
    text-transform: uppercase;
  }
  .empty { padding: 16px; color: #838DA8; }
  .chars {
    display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline;
    gap: 7px 12px; padding: 0 16px 12px;
  }
  .kanji { font: 500 24px/1.1 "Hiragino Mincho ProN", "Yu Mincho", serif; color: #E8ECF6; }
  .kanji-mean { font-size: 13.5px; line-height: 1.4; color: #C7CFE2; }
  .kanji-read { display: block; font-size: 12px; line-height: 1.5; color: #B8C0D4; }
  .also { padding: 0 16px 12px; }
  .also-line {
    display: flex; gap: 10px; align-items: baseline; width: calc(100% + 12px);
    margin: 0 -6px; padding: 5px 6px; border: 0; border-radius: 6px;
    background: none; color: #C7CFE2; text-align: start; cursor: pointer;
    font: 14px/1.5 system-ui, -apple-system, "Hiragino Sans", sans-serif;
  }
  .also-line:hover { background: #1B2234; color: #E8ECF6; }
  .also-line:focus-visible { outline: 2px solid #F2F5FC; outline-offset: -2px; }
  .also-line .at { flex: none; font: 500 11.5px/1 ui-monospace, monospace; color: #8A94AF; font-variant-numeric: tabular-nums; }
  .also-line b { font-weight: 600; color: #E8ECF6; box-shadow: inset 0 -2px 0 #8A94AF; }
  .also-more { font-size: 12px; color: #8A94AF; padding: 4px 0 0; }
  button.also-more {
    display: block; margin: 0; border: 0; background: none; cursor: pointer;
    font: 12.5px/1.4 system-ui, -apple-system, sans-serif; color: #8A94AF; padding: 6px 0 0;
  }
  button.also-more:hover { color: #E8ECF6; text-decoration: underline; }
  button.also-more:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; }
  /*
   * Inside the card, over the status row while it shows. It used to hang
   * below the card, which near the bottom of a player was outside it, and an
   * error message there was never seen at all.
   */
  .toast {
    position: absolute; left: 16px; right: 16px; bottom: 12px;
    background: #E8ECF6; color: #12172A; font: 600 11px/1.4 ui-monospace, monospace;
    letter-spacing: .04em; padding: 7px 10px; border-radius: 5px; opacity: 0;
    transition: opacity .15s; pointer-events: none; text-align: center;
  }
  .toast.on { opacity: .97; }
  /* A button's label, over it on hover or focus (./tooltip.ts). */
  ${TIP_STYLE}
  @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
`;

/** Space kept between the card and the word it describes. */
const GAP = 10;
/** Space kept between the card and the edge of the player. */
const EDGE = 8;
/**
 * The least room worth placing a card in beside the word: the headword, the
 * toolbar, the status row and a line or two of senses. With less than this on
 * both sides, covering the word is the smaller loss.
 */
const MIN_ROOM = 240;
/** The card's size, for when layout cannot measure it. */
const CARD_WIDTH = 400;
const CARD_HEIGHT = 320;

let host: HTMLElement | null = null;
let openFor: string | null = null;
let hideTimer = 0;
let overCard = false;
let onClose: ((why: CloseReason) => void) | null = null;
/** What had focus when the card opened: it has it back when the card goes with focus in it. */
let returnFocus: HTMLElement | null = null;

/**
 * Why a card went away. `replaced` means another card took its place, so
 * whatever it was holding — a paused video — is still needed.
 */
export type CloseReason = 'closed' | 'replaced';

/** The word the open card is about, marked on its line while the card is open. */
let picked: HTMLElement | null = null;

function unpick(): void {
  picked?.classList.remove('picked');
  picked = null;
}

function dismiss(why: CloseReason): void {
  clearTimeout(hideTimer);
  unpick();
  const had = host !== null;
  const done = onClose;
  // Focus in the card (on the page, its host) goes back to what had it
  // before — the word, as a rule — if that is still there.
  const back = host && document.activeElement === host ? returnFocus : null;
  returnFocus = null;
  host?.remove();
  host = null;
  openFor = null;
  overCard = false;
  onClose = null;
  if (back?.isConnected) back.focus({ preventScroll: true });
  if (!had || !done) return;
  try {
    done(why);
  } catch (e) {
    console.warn('[libregaku] lookup card close handler failed:', e);
  }
}

/** One card, ever. Opening a second closes the first. */
export function closePopup(): void {
  dismiss('closed');
}

export function popupIsOpen(): boolean {
  return host !== null;
}

/** Which token the open card describes, so a re-hover is not a re-render. */
export function popupKey(): string | null {
  return openFor;
}

const cardKey = (token: Token): string => `${token.start}:${token.surface}`;

/** Whether the open card is this token's. */
export function popupShows(token: Token): boolean {
  return host !== null && openFor === cardKey(token);
}

/**
 * Close after a grace period, so the cursor can travel from the word to the
 * card without the card vanishing on the way.
 */
export function closePopupSoon(delay = 260): void {
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    if (!overCard) closePopup();
  }, delay);
}

export function cancelPopupClose(): void {
  clearTimeout(hideTimer);
}

/** What adding did, and how to take it back while that still makes sense. */
export interface Added {
  said: string;
  /** Take the card back out: Undo, for one added a moment ago by mistake. */
  undo?: () => Promise<string>;
}

const outcome = (out: string | Added): Added => (typeof out === 'string' ? { said: out } : out);

export interface CardDraft {
  expression: string;
  reading: string;
  meaning: string;
  sentence: string;
  /** The word in the language's other script, where it has one: some recordings are filed under it. */
  alt?: string;
}

/**
 * The card a lookup makes: the dictionary's headword and reading where it has
 * them, the word as it was said where it does not. One definition for the Add
 * button and the A key, so the two can never make different cards.
 */
export function draftFor(result: LookupResult, token: Token, sentence: string): CardDraft {
  const top = result.state === 'ok' ? result.entries[0] : undefined;
  const expression = top?.word ?? token.lemma ?? token.surface;
  return {
    expression,
    reading: top?.reading ?? readingFor(token, expression) ?? '',
    meaning: top?.senses.flatMap((x) => x.glosses).slice(0, 4).join('; ') ?? '',
    sentence,
    ...(top?.alt ? { alt: top.alt } : {}),
  };
}

/**
 * The analyser's reading of the word a card is about, where the dictionary
 * gives none: the token's own where the word is the token as written, and its
 * dictionary form's where it is that. Never the reading of the form on the
 * line over another word: しましょう, シマショウ, is not how する is read, and a
 * card headed ゲーム said ゲームシマショウ above it.
 */
function readingFor(token: Token, word: string): string | undefined {
  if (word === token.surface) return token.reading;
  return word === token.lemma ? token.lemmaReading : undefined;
}

/**
 * Whether a reading says more than the word it stands over: not スル over
 * する, nor ゲーム over ゲーム. Letter for letter as Intl compares them, the
 * script and the case aside, so a word written in kana is its own reading.
 */
function saysMore(reading: string, word: string, lang: string | undefined): boolean {
  try {
    return new Intl.Collator(lang || undefined, { sensitivity: 'accent' }).compare(reading, word) !== 0;
  } catch {
    return reading !== word;
  }
}

/**
 * Press the open card's Add button, the way the A key does: the same handler,
 * and the outcome said on the card exactly as for a click. False when no card
 * is open.
 */
export function pressAdd(): boolean {
  const b = host?.shadowRoot?.querySelector<HTMLButtonElement>('button.add');
  if (!b) return false;
  // Pressed again, the key says where the card is rather than undoing it or
  // sending Anki's window to the front.
  if (b.dataset.state === 'add') b.click();
  else if (b.dataset.state !== 'busy') sayOnCard?.(pressedAgain(b.dataset.state));
  return true;
}

/** What A says on a card past adding. */
function pressedAgain(state: string | undefined): string {
  switch (state) {
    case 'added': return ui.popup.alreadyAdded;
    case 'in': return ui.popup.alreadyInAnki;
    case 'waiting': return ui.popup.waitingForAnkiToOpen;
    default: return '';
  }
}

/** The open card's own line for saying things, for the A key. */
let sayOnCard: ((m: string) => void) | null = null;

interface Context {
  token: Token;
  /** The whole line, for copy-sentence. */
  sentence: string;
  /**
   * The token is a selected phrase: copying copies it as it was written,
   * not the dictionary form it was looked up by.
   */
  phrase?: boolean;
  /** Current status, from Anki or a hand mark. */
  status: Status;
  /**
   * The hand mark on this word, if any: what the status buttons show as
   * pressed, and what pressing one again takes off. Not the status — a word
   * Anki knows from a mature card has no mark to take off.
   */
  marked?: OverrideStatus | null;
  onMark: (word: string, status: OverrideStatus | null) => void;
  /** Resolves to what happened — a message, or one with a way to undo it — or throws with one. */
  onAddCard: (draft: CardDraft) => Promise<string | Added>;
  /** Make a card of the whole line instead. The same contract as onAddCard. */
  onAddLine?: () => Promise<string | Added>;
  /** Open Anki's own browser on the word's cards: what the Add button does once there is one. */
  onShowInAnki?: () => void;
  /** Leave the Add button, and the deck menu beside it, off the card. */
  noAdd?: boolean;
  /** The deck new cards go to, shown under the Add button. */
  deck?: string;
  /** Anki's decks, for picking another, once Anki answers. */
  decks?: Promise<string[]>;
  /**
   * New cards go to this deck from now on — made first, when `create`. With
   * it, Add has a menu of decks to add to. Resolves to the deck in use, and
   * a warning when that deck is one word status does not read.
   */
  onDeck?: (deck: string, create: boolean) => Promise<{ deck: string; warning?: string }>;
  /** A dictionary site for the word, where the language has one. */
  dictionary?: { name: string; url: string };
  /** The underline colours, which the mark buttons wear too. */
  colors?: Record<string, string>;
  /**
   * Whether Anki already holds a card for this word. The only thing the
   * "already in Anki" state is drawn from: a word marked known by hand, or
   * learning only because a card was just added, is not the same fact.
   */
  hasCard?: boolean;
  /** A card for it is waiting for Anki to open, rather than in Anki. */
  queued?: boolean;
  /**
   * The other lines of this video the word is in, once found. Shown when it
   * arrives, so a long transcript never holds up the definition.
   */
  elsewhere?: Promise<Array<{ start: number; text: string; match: string }>>;
  /** Play from one of those lines. */
  onSeek?: (start: number) => void;
  /**
   * Search the transcript for the word, for every line it is in: `query` for
   * the search box, `forms` as the word is written in its lines.
   */
  onSearch?: (query: string, forms: string[]) => void;
  /** The characters the word is written with, once looked up. */
  characters?: Promise<Characters>;
  /** What the prefix or suffix the lookup left out means (新 of 新名所), once looked up. */
  leftovers?: Promise<Array<{ part: string; reading?: string; meaning: string }>>;
  /** The language being learned, so the word is said in a voice for it. */
  lang?: string;
  /**
   * What the card should stay clear of, most important first — the subtitle
   * with its second line, then the line alone. See placeCard.
   */
  keepClear?: Element[];
  /**
   * The card went away, however it went: closed, dismissed with Escape or an
   * outside click, timed out after the cursor left, or replaced by another.
   */
  onClose?: (why: CloseReason) => void;
}

export function showPopup(
  mount: HTMLElement,
  anchor: HTMLElement,
  result: LookupResult,
  ctx: Context,
): void {
  const entries = result.state === 'ok' ? result.entries : [];
  const key = cardKey(ctx.token);
  if (openFor === key) {
    // Already showing this word. Clicked or pressed now, its card takes focus.
    const open = host?.shadowRoot?.querySelector<HTMLElement>('.card');
    if (open) focusCard(open, anchor);
    return;
  }
  dismiss('replaced');
  openFor = key;
  // The word shows which it is. A phrase is already marked as one, and keeps its own band.
  if (!anchor.classList.contains('inphrase')) {
    anchor.classList.add('picked');
    picked = anchor;
  }
  returnFocus = focused();

  host = document.createElement('div');
  host.className = 'libregaku-popup';
  // The card is written in the interface's language; what is in the language
  // being learned says so itself, so the browser draws each in its own fonts.
  host.lang = uiLocale();
  host.dir = uiDirection();
  const learned = ctx.lang ?? '';
  for (const [name, value] of Object.entries(ctx.colors ?? {})) host.style.setProperty(name, value);
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE;

  const top = entries[0];
  const word = top?.word ?? ctx.token.lemma ?? ctx.token.surface;
  // The reading of the word the card is headed by, and only where it says more than the word does.
  const own = top?.reading ?? readingFor(ctx.token, word);
  const reading = own && saysMore(own, word, ctx.lang) ? own : undefined;
  const hasCard = ctx.hasCard === true;

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', ui.popup.cardLabel(word));
  card.addEventListener('mouseenter', () => {
    overCard = true;
    cancelPopupClose();
  });
  card.addEventListener('mouseleave', () => {
    overCard = false;
    closePopupSoon();
  });
  // A click leaves focus where it was. A focused button here kept Space for
  // itself: the next Space pressed Add again instead of pausing the video.
  card.addEventListener('mousedown', (e) => {
    if ((e.target as Element | null)?.closest?.('button')) e.preventDefault();
  });

  const head = document.createElement('div');
  head.className = 'head';
  const hw = document.createElement('div');
  hw.className = 'hw';
  if (reading) {
    const r = document.createElement('div');
    r.className = 'reading';
    r.lang = learned;
    r.textContent = reading;
    hw.appendChild(r);
  }
  const w = document.createElement('div');
  w.className = 'word';
  w.lang = learned;
  w.textContent = word;
  hw.appendChild(w);
  // The marks, small, beside the word they are about (filled in below).
  const marks = document.createElement('div');
  marks.className = 'marks';
  head.append(hw, marks);
  card.appendChild(head);

  if (top) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    if (ctx.token.name) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = ui.popup.nameBadge;
      meta.appendChild(b);
    }
    if (top.common) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = ui.popup.commonBadge;
      meta.appendChild(b);
    }
    // What the entry says it is, where one entry gathers several parts of speech.
    const pos = partsOfSpeech(top.kind ?? top.senses[0]?.pos ?? []);
    if (pos) {
      const p = document.createElement('span');
      p.textContent = pos;
      meta.appendChild(p);
    }
    // The word in the language's other script: the traditional form of a simplified word.
    if (top.alt) {
      const a = document.createElement('span');
      a.className = 'alt';
      a.lang = learned;
      a.textContent = top.alt;
      meta.appendChild(a);
    }
    card.appendChild(meta);
  } else if (ctx.token.properName) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    const p = document.createElement('span');
    p.textContent = partsOfSpeech(['name']);
    meta.appendChild(p);
    card.appendChild(meta);
  }

  /* Toolbar. Pronounce works with no dependency at all — speechSynthesis is
     already in the browser, which is why the extension ships no audio. */
  const tools = document.createElement('div');
  tools.className = 'tools';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');

  let toastT = 0;
  // Failures stay up long enough to be read; a confirmation needs a glance.
  const say = (m: string, ms = 1500): void => {
    toast.textContent = m;
    toast.classList.add('on');
    clearTimeout(toastT);
    toastT = window.setTimeout(() => toast.classList.remove('on'), ms);
  };

  const button = (name: string, title: string, fn: (b: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.className = 'tb';
    b.appendChild(icon(name, 16));
    b.dataset.tip = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', () => fn(b));
    tools.appendChild(b);
    return b;
  };

  // The dictionary headword may differ from what is on screen (JMdict lists
  // 私 under わたし, the analyser may have read it わたくし). Ask for the
  // headword with the entry's own reading, which is the pair jpod101 keys on.
  const sayWord = top?.word ?? word;
  const sayReading = top?.reading ?? reading;

  // A free recording asks that its speaker and licence be said where it is
  // played (CC BY, CC BY-SA): a line under the buttons, linked to its page.
  const credit = document.createElement('a');
  credit.className = 'credit';
  credit.target = '_blank';
  credit.rel = 'noopener noreferrer';
  credit.hidden = true;

  button('volume', ui.popup.pronounce, (b) => {
    b.classList.add('busy');
    b.replaceChildren(icon('loader', 16));
    // Some recordings are filed under the word's other script.
    void pronounce(sayWord, sayReading, ctx.lang, top?.alt ? [top.alt] : [])
      .then((spoken) => {
        // Say which source was used: a human recording and a synthesised one
        // are not equally trustworthy models to imitate.
        say(spoken.human ? ui.popup.playedRecording(word) : ui.popup.playedSynthesised(word));
        credit.hidden = !spoken.credit;
        if (spoken.credit) {
          credit.textContent = ui.popup.recordingBy(spoken.credit.by, spoken.credit.licence);
          credit.href = spoken.credit.page;
        }
      })
      .catch(() => say(ui.popup.pronounceFailed, 4000))
      .finally(() => {
        b.classList.remove('busy');
        b.replaceChildren(icon('volume', 16));
      });
  });
  const failed = (e: unknown): string => (e instanceof Error ? e.message : String(e));
  sayOnCard = say;

  // The clipboard refuses without focus or permission, which a video page can
  // withhold; copyText falls back, and either way the result is said aloud.
  const copy = (text: string, done: string): void => {
    void copyText(text).then((ok) => (ok ? say(done) : say(ui.popup.copyFailed, 4000)));
  };
  // A sentence card: the line itself, with its sound and a still. Pressed
  // again once it is in, it takes the card back out.
  const onAddLine = ctx.onAddLine;
  if (onAddLine) {
    let back: (() => Promise<string>) | null = null;
    let settled = 0;
    button('linePlus', ui.popup.addSentence, (b) => {
      if (b.classList.contains('busy') || Date.now() - settled < SETTLE_MS) return;
      const undo = back;
      b.classList.add('busy');
      b.replaceChildren(icon('loader', 16));
      const done = (ico: string, tip: string): void => {
        b.classList.remove('busy');
        b.replaceChildren(icon(ico, 16));
        b.dataset.tip = tip;
        b.setAttribute('aria-label', tip);
        settled = Date.now();
      };
      if (undo) {
        void undo().then(
          (said) => { say(said); back = null; done('linePlus', ui.popup.addSentence); },
          (e: unknown) => { say(failed(e), 4000); done('check', ui.popup.undo); },
        );
        return;
      }
      void onAddLine().then(
        (out) => {
          const { said, undo: takeBack } = outcome(out);
          say(said);
          back = takeBack ?? null;
          done('check', back ? ui.popup.undo : ui.popup.sentenceAdded);
        },
        (e: unknown) => { say(failed(e), 4000); done('linePlus', ui.popup.addSentence); },
      );
    });
  }

  if (ctx.phrase) button('copy', ui.popup.copyPhrase, () => copy(ctx.token.surface, ui.popup.phraseCopied));
  else button('copy', ui.popup.copyWord, () => copy(word, ui.popup.wordCopied));
  button('quote', ui.popup.copySentence, () => copy(ctx.sentence, ui.popup.sentenceCopied));
  /*
   * A site for the human link, an API for the lookups — the distinction is
   * real. Calling someone's API implicates their terms, so that goes to one
   * that documents and permits it (Jotoba, for Japanese). Opening a page in a
   * new tab implicates nothing, so it goes to whichever site a learner would
   * rather land on — Jisho, for Japanese — and the language decides which
   * (settings.ts, featuresOf).
   */
  const site = ctx.dictionary;
  if (site) button('external', site.name, () => window.open(site.url, '_blank', 'noopener'));
  card.appendChild(tools);
  card.appendChild(credit);

  // Everything that can grow goes in one scrolling body, so a long entry
  // costs scrolling rather than the status row.
  const body = document.createElement('div');
  body.className = 'body';

  /*
   * A section past the meanings is one line until it is opened: the kanji,
   * the word's other lines. Each arrives when it is ready, so it goes in its
   * own place — the kanji above the other lines, `before` anything else
   * that has to come after it — and one opened stays open on the next card.
   */
  const fold = (before: Element | null, key: FoldKey, label: string, content: HTMLElement, fill: () => void): void => {
    const sec = document.createElement('div');
    sec.className = `fold ${key}-fold`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'fold-head';
    const text = document.createElement('span');
    text.textContent = label;
    toggle.append(text, icon('chevronDown', 14));
    let filled = false;
    const show = (open: boolean): void => {
      if (open && !filled) {
        fill();
        filled = true;
      }
      content.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      sec.classList.toggle('open', open);
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      if (open) openFolds.add(key);
      else openFolds.delete(key);
      show(open);
    });
    sec.append(toggle, content);
    // The kanji go above the other lines when the lines arrived first.
    const after = key === 'kanji' ? body.querySelector('.also-fold') : null;
    body.insertBefore(sec, after ?? before?.nextSibling ?? null);
    show(openFolds.has(key));
  };

  if (result.state === 'loading') {
    const e = document.createElement('div');
    e.className = 'loading';
    e.textContent = ui.popup.dictionaryLoading(result.percent);
    body.appendChild(e);
  } else if (result.state === 'error') {
    const e = document.createElement('div');
    e.className = 'loading';
    e.textContent = ui.popup.dictionaryUnavailable(result.error);
    body.appendChild(e);
  } else if (!entries.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    // A name is no word to look up: say what it is, and that it is not in a dictionary.
    e.textContent = ctx.token.properName ? ui.popup.noEntryName : ui.popup.noEntry;
    body.appendChild(e);
  } else {
    // The commonest words have the most senses: できる has ten. The first few
    // are what is meant nearly always; the rest wait to be asked for.
    const ol = document.createElement('ol');
    // The meanings run in their own language's direction: English ones left
    // to right, numbers on the left, under an Arabic interface too. And they
    // say which language that is, rather than passing for the interface's.
    ol.dir = 'auto';
    const said = top!.lang ?? meaningsLanguage(learned);
    if (said) ol.lang = said;
    const senses = top!.senses.slice(0, MAX_SENSES);
    // A word that is several parts of speech says which each meaning is, where it changes: tout is "all" as a
    // determiner and "totally" as an adverb. Only an entry gathered from rows of its own (top.kind) has them to say.
    const part = (sense: (typeof senses)[number]): string => (top!.kind ? sense.pos[0] ?? '' : '');
    const several = new Set(senses.map(part).filter(Boolean)).size > 1;
    senses.forEach((sense, i) => {
      const li = document.createElement('li');
      if (several && part(sense) && part(sense) !== (i ? part(senses[i - 1]!) : '')) {
        const tag = document.createElement('span');
        tag.className = 'sense-pos';
        // A noun's gender goes with it here, since the header names it only for a word that is a noun first.
        const gender = NOUN_PARTS.has(part(sense)) ? sense.pos.slice(1).filter((code) => GENDERS.has(code)) : [];
        tag.textContent = `${partsOfSpeech([part(sense), ...gender])} `;
        li.appendChild(tag);
      }
      li.append(sense.glosses.slice(0, 4).join('; '));
      li.hidden = i >= SENSES_SHOWN;
      ol.appendChild(li);
    });
    body.appendChild(ol);
    if (senses.length > SENSES_SHOWN) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'more-senses';
      more.textContent = ui.popup.moreMeanings(senses.length - SENSES_SHOWN);
      more.addEventListener('click', () => {
        const items = Array.from(ol.children) as HTMLElement[];
        for (const li of items) li.hidden = false;
        // Focus on the button goes to the first meaning it showed, not out of the card with the button.
        const next = items[SENSES_SHOWN];
        if (focused() === more && next) {
          next.tabIndex = -1;
          next.focus();
        }
        more.remove();
      });
      body.appendChild(more);
    }
  }

  if (ctx.characters) {
    const chars = document.createElement('div');
    chars.className = 'chars';
    const mine = host;
    void ctx.characters.then((c) => {
      if (host !== mine || !c.items.length) return;
      fold(body.querySelector('.trace') ? body.querySelector('.trace')! : null, 'kanji',
        `${characterName(c.label)} · ${c.items.map((k) => k.char).join(' ')}`, chars, () => fillCharacters(chars, c, learned));
    }, () => {});
  }

  // The inflection trace: what this token was built from, and where it leads.
  const { parts, surface, inflections } = ctx.token;
  // What the form on the line is a form of: 勉強する for 勉強しています, though the word is 勉強.
  const lemma = ctx.token.usedAs ?? ctx.token.lemma;
  const compound = Boolean(ctx.token.compound);
  if (parts?.length && lemma && (lemma !== surface || compound)) {
    const tr = document.createElement('div');
    tr.className = 'trace';
    tr.lang = learned;
    // Read left to right whatever the interface's direction: + and → take
    // the page's, and in Arabic the parts came out in the wrong order.
    tr.dir = 'ltr';
    // A compound is its parts and nothing more: Riesen + schlange, with no word it leads to.
    if (compound) {
      tr.append(document.createTextNode(parts.join(' + ')));
    } else {
      tr.append(document.createTextNode(`${parts.join(' + ')}  →  `));
      const b = document.createElement('b');
      b.textContent = lemma;
      tr.appendChild(b);
    }

    /*
     * Name what the endings do. The merge pass already decided which morphemes
     * are endings and why, so labelling them is nearly free — and it is the
     * difference between showing someone いけ + ば and telling them it is a
     * conditional.
     */
    if (inflections?.length) {
      const g = document.createElement('div');
      g.className = 'grammar';
      g.lang = uiLocale();
      g.dir = uiDirection();
      g.textContent = inflections.map(grammarLabel).join(' · ');
      tr.appendChild(g);
    }
    body.appendChild(tr);
  }
  if (ctx.leftovers) {
    const left = document.createElement('div');
    left.className = 'leftovers';
    left.lang = learned;
    const mine = host;
    void ctx.leftovers.then((found) => {
      // The card may have closed, or become another word's, meanwhile.
      if (host !== mine || !found.length) return;
      for (const { part, reading, meaning } of found) {
        const row = document.createElement('div');
        const b = document.createElement('b');
        b.textContent = part;
        row.append(b, document.createTextNode(`${reading ? `  ${reading}` : ''} · ${meaning}`));
        left.appendChild(row);
      }
      body.insertBefore(left, body.querySelector('.trace')?.nextSibling ?? null);
    }, () => {});
  }
  if (ctx.elsewhere) {
    const also = document.createElement('div');
    also.className = 'also';
    also.lang = learned;
    const mine = host;
    void ctx.elsewhere.then((lines) => {
      // The card may have closed, or become another word's, meanwhile.
      if (host !== mine || !lines.length) return;
      const search = ctx.onSearch;
      const showAll = search
        ? () => search(ctx.token.lemma ?? ctx.token.surface, [ctx.token.surface, ...lines.map((l) => l.match)])
        : undefined;
      fold(null, 'also', ui.popup.elsewhereCount(lines.length), also, () => fillAlso(also, lines, ctx.onSeek, showAll));
    }, () => {});
  }
  card.appendChild(body);

  /*
   * Marking is deliberately separate from carding.
   *
   * "I know this" and "I have a flashcard for this" are different facts, and
   * conflating them is how a learner ends up carding words they have known for
   * years. Anki can express the second; only the user can express the first,
   * so it is kept as a mark: in the browser at once, and in Anki as a tagged,
   * suspended note that follows the collection (src/anki/marks.ts).
   */
  const markKey = ctx.token.lemma ?? ctx.token.surface;

  /*
   * Adding a card is the point of the whole tool, so it is the foot of the
   * card, full width, named, and in the one colour kept for it, and it states
   * its outcome: a silent success is indistinguishable from a silent failure.
   * Once the card is in, the same button takes it back out for a while — a
   * card added by mistake is undone where it was made — and on a word Anki
   * already has, it opens it there.
   */
  const foot = document.createElement('div');
  foot.className = 'foot';
  let deckNow = ctx.deck ?? '';
  let back: (() => Promise<string>) | null = null;
  let settled = 0;
  const add = document.createElement('button');
  add.className = 'add';
  // Its key, where someone hovering the button will see it (src/content/keys.ts).
  letter(add, 'A');
  const show = (state: AddState, busyText = ui.popup.adding): void => {
    add.dataset.state = state;
    add.classList.toggle('has', state === 'in');
    add.classList.toggle('done', state === 'added' || state === 'waiting');
    const t = ui.popup;
    const [ico, text, tip] = ({
      add: ['plus', t.addToAnki, deckNow ? t.addToDeck(deckNow) : t.addToAnki],
      busy: ['loader', busyText, busyText],
      added: ['check', t.added, back ? t.undo : t.added],
      in: ['check', t.inAnki, t.showInAnki],
      waiting: ['check', t.waiting, t.waitingForAnki],
    } as const)[state];
    add.replaceChildren(icon(ico, 14), document.createTextNode(text));
    add.dataset.tip = tip;
    // Its name starts with what it shows: "Added — undo", not "Undo", so saying what is on it presses it.
    const name = state === 'add' ? t.addToAnki : state === 'added' && back ? t.addedUndo : tip;
    add.setAttribute('aria-label', name);
  };
  show(hasCard ? (ctx.queued ? 'waiting' : 'in') : 'add');
  /** Make the card, whatever the button shows — the deck menu adds to another deck even beside "In Anki". */
  const addNow = (then?: string): void => {
    show('busy');
    void ctx.onAddCard(draftFor(result, ctx.token, ctx.sentence)).then(
      (out) => {
        const { said, undo } = outcome(out);
        back = undo ?? null;
        settled = Date.now();
        show('added');
        say(then ? ui.popup.addedWithWarning(said, then) : said, then ? 5000 : 1500);
      },
      (e: unknown) => {
        say(failed(e), 4000);
        settled = Date.now();
        show(hasCard ? 'in' : 'add');
      },
    );
  };
  add.addEventListener('click', () => {
    const state = add.dataset.state;
    if (state === 'in') {
      ctx.onShowInAnki?.();
      return;
    }
    if (state === 'waiting') {
      say(ui.popup.goesInWhenAnkiOpens, 2500);
      return;
    }
    // A second press a moment after the first is impatience, not Undo.
    if (state === 'busy' || Date.now() - settled < SETTLE_MS) return;
    if (state === 'added') {
      const undo = back;
      if (!undo) return;
      show('busy', ui.popup.undoing);
      void undo().then(
        (said) => { say(said); back = null; settled = Date.now(); show('add'); },
        (e: unknown) => { say(failed(e), 4000); settled = Date.now(); show('added'); },
      );
      return;
    }
    addNow();
  });
  if (!ctx.noAdd) foot.appendChild(add);

  // The deck menu, when it is on: "Add to <deck>" for each of Anki's decks.
  // Picking one adds the card there, and new cards go there from then on.
  const onDeck = ctx.noAdd ? undefined : ctx.onDeck;
  if (onDeck) {
    // A button that shows a list of buttons: a disclosure, not a menu, which
    // would promise arrow keys and a screen reader's menu mode.
    const more = document.createElement('button');
    more.className = 'more';
    more.dataset.tip = ui.popup.otherDecks;
    more.setAttribute('aria-label', ui.popup.addToAnotherDeck);
    more.setAttribute('aria-expanded', 'false');
    more.setAttribute('aria-controls', 'deckmenu');
    more.appendChild(icon('chevronDown', 16));
    const menu = document.createElement('div');
    menu.className = 'deckmenu';
    menu.id = 'deckmenu';
    menu.hidden = true;
    let decks: readonly string[] = [];
    const mine = host;
    void ctx.decks?.then((d) => {
      if (host === mine) decks = d;
    }, () => {});
    const close = (): void => {
      // Focus in the list goes back to the button that opened it, rather than out of the card with the list.
      const within = menu.contains(focused());
      menu.hidden = true;
      more.setAttribute('aria-expanded', 'false');
      window.removeEventListener('keydown', onEscape, true);
      if (within) more.focus();
    };
    /*
     * Escape puts the list away and leaves the card open. On the window, as
     * the key comes down: the extension's own keys, on the document, close
     * the whole card on Escape (index.ts), before anything in here hears it.
     */
    const onEscape = (e: KeyboardEvent): void => {
      if (host !== mine) {
        window.removeEventListener('keydown', onEscape, true);
        return;
      }
      if (e.key !== 'Escape' || !e.composedPath().includes(card)) return;
      e.stopPropagation();
      close();
    };
    const pick = (name: string, create: boolean): void => {
      close();
      void onDeck(name, create).then(
        ({ deck, warning }) => {
          deckNow = deck;
          addNow(warning);
        },
        (e: unknown) => say(failed(e), 4000),
      );
    };
    const item = (text: string, onPick: () => void, current = false): void => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = current ? 'current' : '';
      b.append(icon(current ? 'check' : 'plus', 13), document.createTextNode(text));
      b.addEventListener('click', onPick);
      menu.appendChild(b);
    };
    more.addEventListener('click', (e) => {
      if (!menu.hidden) {
        close();
        return;
      }
      menu.replaceChildren();
      const list = deckNow && !decks.includes(deckNow) ? [deckNow, ...decks] : [...decks];
      if (!list.length) {
        const note = document.createElement('div');
        note.className = 'deckmenu-note';
        note.textContent = ui.popup.decksUnknown;
        menu.appendChild(note);
      }
      for (const d of list) item(ui.popup.addToDeck(d), () => pick(d, false), d === deckNow);
      // A deck can be made only with Anki answering.
      if (decks.length) {
        item(ui.popup.newDeck, () => {
          const name = prompt(ui.popup.newDeckPrompt)?.trim();
          if (name) pick(name, true);
          else close();
        });
      }
      menu.hidden = false;
      more.setAttribute('aria-expanded', 'true');
      window.addEventListener('keydown', onEscape, true);
      // Opened from the keyboard — a click with no mouse behind it counts no
      // presses, detail 0 — focus goes to the first deck. Opened with the
      // mouse it stays where it was, as for every button here, so Space
      // still reaches the video.
      if (e.detail === 0) menu.querySelector('button')?.focus();
    });
    card.addEventListener('click', (e) => {
      if (!menu.hidden && !(e.target as Element | null)?.closest?.('.deckmenu, .more')) close();
    });
    // The list right after its button, so Tab goes from one into the other.
    foot.append(more, menu);
  }

  /*
   * The marks: small, beside the word they are about. Known and Ignore by
   * default, Track when settings offer it — beside Add, as labelled buttons,
   * they were taken for Add. A mark the word already has always shows, so it
   * can come off again.
   */
  const mark = (cls: string, iconName: string, label: string, next: CardMark): void => {
    const on = ctx.marked === next;
    const b = document.createElement('button');
    b.className = `mk ${cls}`;
    b.appendChild(icon(iconName, 17));
    b.dataset.tip = on ? unmarkTip(next) : markTip(next);
    b.setAttribute('aria-label', label);
    if (next === 'known') letter(b, 'K');
    b.setAttribute('aria-pressed', String(on));
    b.addEventListener('click', () => {
      // Pressed again, the mark comes off. The card closes at once; where
      // the mark went is said over the player.
      void ctx.onMark(markKey, on ? null : next);
      closePopup();
    });
    marks.appendChild(b);
  };
  mark('known', 'circleCheck', ui.popup.knownButton, 'known');
  mark('track', 'target', ui.popup.trackButton, 'tracking');
  mark('ignore', 'ban', ui.popup.ignoreButton, 'ignored');
  card.appendChild(foot);

  card.appendChild(toast);
  tooltips(card, () => card.getBoundingClientRect());
  root.append(style, card);
  // Next to the word in the page's order, not after the panel and the bar:
  // Tab from the word goes into its card.
  const beside = anchor.getRootNode();
  if (beside instanceof ShadowRoot && beside.host.parentElement === mount) beside.host.after(host);
  else mount.appendChild(host);
  onClose = ctx.onClose ?? null;

  place(host, card, mount, anchor, ctx.keepClear ?? []);
  focusCard(card, anchor);
}

/** The element with focus, inside whatever shadow roots it is in. */
function focused(): HTMLElement | null {
  let el = document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return el instanceof HTMLElement ? el : null;
}

/**
 * Move focus into the card when the word it is for has focus: the word was
 * clicked, or pressed with Enter. A card that opens as the pointer rests on
 * a word leaves focus where it is. Either way, focus in the card goes back
 * to what had it when the card goes (dismiss).
 */
function focusCard(card: HTMLElement, anchor: HTMLElement): void {
  const from = focused();
  if (!from || !anchor.contains(from)) return;
  returnFocus = from;
  card.tabIndex = -1;
  card.focus({ preventScroll: true });
}

/**
 * Name a button's key in its tooltip, and to assistive tech. The label it is
 * read out by stays as it was: the key is announced as a shortcut, not as
 * part of the button's name.
 */
export function shortcut(b: HTMLElement, shown: string, aria: string): void {
  b.dataset.key = shown;
  b.setAttribute('aria-keyshortcuts', aria);
}

/** A letter key, as it is pressed now: alone, or with Alt and Shift where single keys are off. */
function letter(b: HTMLElement, key: string): void {
  const { shown, aria } = letterKey(key, settings().singleKeys);
  shortcut(b, shown, aria);
}

/** The Add button's states (showPopup). */
type AddState = 'add' | 'busy' | 'added' | 'in' | 'waiting';

/** Meanings shown before "+N more", and the most a card lists at all. */
const SENSES_SHOWN = 3;
const MAX_SENSES = 10;

/** The sections that open from one line, and which are open: an opened one stays open for the next card. */
type FoldKey = 'kanji' | 'also';
const openFolds = new Set<FoldKey>();

/** How soon after one press a second counts as its own, rather than the same impatience. */
const SETTLE_MS = 900;

/** The marks the card has buttons for. */
type CardMark = Exclude<OverrideStatus, 'unknown'>;

/** What each mark button does — what each one means is in settings, under Word popup. */
const markTip = (mark: CardMark): string =>
  ({ known: ui.popup.markKnownTip, tracking: ui.popup.trackTip, ignored: ui.popup.ignoreTip })[mark];

/** The same buttons once pressed: pressing again takes the mark off. */
const unmarkTip = (mark: CardMark): string =>
  ({ known: ui.popup.unmarkKnownTip, tracking: ui.popup.stopTrackingTip, ignored: ui.popup.stopIgnoringTip })[mark];

/**
 * The language a word's meanings are written in, where its entry does not
 * say: the one chosen for them where the dictionary comes in several, as
 * JMdict does, and otherwise the one edition there is — English.
 */
function meaningsLanguage(learned: string): string {
  const s = settings();
  const dictionary = dictionaryOf(learned, s);
  if (!dictionary) return '';
  return featuresOf(learned).definitions ? definitionLanguage(s) : dictionary.edition;
}

/** What a language calls the characters it is written with, for the heading over a word's. */
function characterName(id: string): string {
  const names: Record<string, unknown> = ui.popup.characterNames;
  const name = names[id];
  return typeof name === 'string' ? name : id;
}

/** The dictionary's codes for a noun's gender, said beside "noun" on a meaning. */
const GENDERS = new Set(['masc', 'fem', 'neut']);
/** The codes for the parts of speech that have a gender of their own: on an adjective it says only that there are two forms. */
const NOUN_PARTS = new Set(['n', 'name']);

/**
 * The parts of speech of a sense, by name. JMdict's codes ("v5k", "adj-na")
 * are precise and unreadable; a code with no name shows as it is rather than
 * being hidden, and a name two codes share shows once.
 */
export function partsOfSpeech(codes: readonly string[]): string {
  const names: Record<string, unknown> = ui.popup.partOfSpeech;
  const seen = new Set<string>();
  for (const c of codes) {
    const name = names[c];
    seen.add(typeof name === 'string' ? name : c);
  }
  return [...seen].join(', ');
}

/**
 * Each character of the word: what it means, and how it reads. The readings
 * are the dictionary's, dots and all — つと.める shows where the okurigana starts.
 */
function fillCharacters(el: HTMLElement, c: Characters, lang: string): void {
  for (const k of c.items) {
    const ch = document.createElement('div');
    ch.className = 'kanji';
    ch.lang = lang;
    ch.textContent = k.char;
    const info = document.createElement('div');
    info.className = 'kanji-mean';
    info.textContent = k.meanings.slice(0, 3).join(', ') || '—';
    const readings = [...k.on.slice(0, 2), ...k.kun.slice(0, 2)];
    if (readings.length) {
      const r = document.createElement('span');
      r.className = 'kanji-read';
      r.lang = lang;
      r.textContent = readings.join(' · ');
      info.appendChild(r);
    }
    el.append(ch, info);
  }
}

/** How many of a word's other lines the card lists before saying how many more. */
const ALSO_SHOWN = 4;

/** m:ss, or h:mm:ss past the hour. */
function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/**
 * The word's other lines, each one a way back to that moment: seeing a word
 * used three ways is how its meaning settles, and the best of the three is
 * often the sentence worth the card.
 */
function fillAlso(
  el: HTMLElement,
  lines: Array<{ start: number; text: string; match: string }>,
  onSeek?: (start: number) => void,
  onShowAll?: () => void,
): void {
  for (const line of lines.slice(0, ALSO_SHOWN)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'also-line';
    b.dataset.tip = ui.popup.playLine;
    const at = document.createElement('span');
    at.className = 'at';
    at.textContent = clock(line.start);
    const text = document.createElement('span');
    const i = line.match ? line.text.indexOf(line.match) : -1;
    if (i < 0) {
      text.textContent = line.text;
    } else {
      const word = document.createElement('b');
      word.textContent = line.match;
      text.append(line.text.slice(0, i), word, line.text.slice(i + line.match.length));
    }
    b.append(at, text);
    b.addEventListener('click', () => {
      onSeek?.(line.start);
      closePopup();
    });
    el.appendChild(b);
  }
  if (lines.length > ALSO_SHOWN) {
    // The rest are in the transcript: a search there, in the panel, finds them all.
    const more = document.createElement(onShowAll ? 'button' : 'div');
    more.className = 'also-more';
    more.lang = uiLocale();
    if (onShowAll) {
      (more as HTMLButtonElement).type = 'button';
      more.textContent = ui.popup.showAllInTranscript;
      more.addEventListener('click', () => {
        onShowAll();
        closePopup();
      });
    } else {
      more.textContent = ui.popup.elsewhereMore(lines.length - ALSO_SHOWN);
    }
    el.appendChild(more);
  }
}

/** A box in viewport coordinates — what getBoundingClientRect returns. */
export interface Box {
  left: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface Placement {
  /** Offsets within the mount. */
  left: number;
  top: number;
  /** The most height the card may take without reaching the word or the edge. */
  maxHeight: number;
  /** Where it went; `over` is the last resort, covering the word. */
  side: 'above' | 'below' | 'over';
}

/**
 * Where the card goes, relative to the mount.
 *
 * Clear of the line the word is in, not only of the word. The card is about
 * the word in that sentence; covering the rest of the line — or its
 * translation — hides the context it was opened to read. `keepClear` lists
 * what to keep in view, most first: the whole subtitle with its second line,
 * then the line alone. The word itself is always the last of them.
 *
 * Against each in turn: above it when the whole card fits there — subtitles
 * sit low, so that is where the room usually is — then below; then the
 * roomier side with the card's height capped to it, so its senses scroll.
 * Only when even the word leaves no usable room either side does the card
 * cover it, with its height capped to the player so the status row still fits.
 */
export function placeCard(
  mount: Box, anchor: Box, size: { width: number; height: number }, keepClear: Box[] = [],
): Placement {
  let left = anchor.left - mount.left + anchor.width / 2 - size.width / 2;
  left = Math.max(EDGE, Math.min(left, mount.width - size.width - EDGE));

  for (const clear of [...keepClear, anchor]) {
    const top = clear.top - mount.top;
    const bottom = clear.bottom - mount.top;
    const above = top - GAP - EDGE;
    const below = mount.height - bottom - GAP - EDGE;
    if (size.height <= above) return { left, top: top - GAP - size.height, maxHeight: above, side: 'above' };
    if (size.height <= below) return { left, top: bottom + GAP, maxHeight: below, side: 'below' };
    if (Math.max(above, below) >= MIN_ROOM) {
      return above >= below
        ? { left, top: EDGE, maxHeight: above, side: 'above' }
        : { left, top: bottom + GAP, maxHeight: below, side: 'below' };
    }
  }

  const wordTop = anchor.top - mount.top;
  const maxHeight = Math.max(0, mount.height - 2 * EDGE);
  const height = Math.min(size.height, maxHeight);
  const top = Math.max(EDGE, Math.min(wordTop - GAP - height, mount.height - height - EDGE));
  return { left, top, maxHeight, side: 'over' };
}

/**
 * Size the card to the player, then put it beside the word.
 *
 * The card used to keep its natural height whatever the player's, so at
 * YouTube's default size a long entry was pinned to the top of the player,
 * covered the word it described, and pushed its status row out of sight.
 */
function place(h: HTMLElement, card: HTMLElement, mount: HTMLElement, anchor: HTMLElement, keepClear: Element[]): void {
  const m = mount.getBoundingClientRect();
  const a = anchor.getBoundingClientRect();
  const clear = keepClear.map((el) => el.getBoundingClientRect());

  // Narrower than the card, as in a miniplayer: fit the width first, since
  // the width decides how tall the wrapped senses are.
  const room = m.width - 2 * EDGE;
  if (room > 0 && (card.offsetWidth || CARD_WIDTH) > room) card.style.width = `${room}px`;

  const size = { width: card.offsetWidth || CARD_WIDTH, height: card.offsetHeight || CARD_HEIGHT };
  const p = placeCard(m, a, size, clear);
  card.style.maxHeight = `${Math.floor(p.maxHeight)}px`;
  card.dataset.side = p.side;
  h.style.left = `${Math.round(p.left)}px`;
  // Above, the card hangs from its bottom edge. What fills in later — the
  // word's other lines, its kanji — then grows it upward into the room it
  // was given, rather than down over the line it was keeping clear of.
  if (p.side === 'above') {
    h.style.top = '';
    h.style.bottom = `${Math.round(m.height - p.top - Math.min(size.height, p.maxHeight))}px`;
  } else {
    h.style.bottom = '';
    h.style.top = `${Math.round(p.top)}px`;
  }
}
