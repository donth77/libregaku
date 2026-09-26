import type { OverrideStatus, Status } from '../anki/status';
import { pronounce } from '../audio/pronounce';
import type { LookupResult } from '../dict/client';
import { readablePos } from '../dict/pos';
import type { Token } from '../morphology/types';
import { icon } from './icons';
import { copyText } from './share';

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
  .head { padding: 14px 16px 0; }
  .reading { font: 500 12px/1.4 ui-monospace, monospace; color: #8AA2E8; letter-spacing: .04em; }
  .word { font-size: 27px; font-weight: 600; line-height: 1.2; margin-top: 1px; }
  .meta {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 8px 16px 0; font: 500 12px/1.4 ui-monospace, monospace; color: #838DA8;
  }
  .badge { padding: 3px 8px; border-radius: 5px; background: #16281F; color: #63AF97; letter-spacing: .05em; }
  .tools { display: flex; gap: 7px; padding: 12px 16px; border-bottom: 1px solid #212939; }
  .tb {
    width: 34px; height: 34px; border-radius: 50%;
    border: 1px solid #2A3348; background: #1B2234; color: #B4BDD4;
    cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;
  }
  .tb svg { display: block; }
  .tb.add { background: #1A2138; color: #8AA2E8; border-color: #3B4A6B; }
  .tb.add.has { background: #16281F; color: #63AF97; border-color: #2A5245; }
  .tb.busy { color: #8AA2E8; }
  .tb.busy svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .tb.busy svg { animation: none; } }
  .loading { padding: 16px; color: #D9A64A; font-size: 13.5px; }
  .marks { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #212939; }
  .mk {
    flex: 1; padding: 9px 10px; border-radius: 7px; cursor: pointer;
    font: 600 11.5px/1.2 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; border: 1px solid transparent;
  }
  .mk.known   { background: #16281F; color: #63AF97; border-color: #2A5245; }
  .mk.track   { background: #211A38; color: #A78BFA; border-color: #46396B; }
  .mk.ignore  { background: #1B2234; color: #838DA8; border-color: #2A3348; }
  .mk[aria-pressed="true"] { outline: 2px solid currentColor; outline-offset: -1px; }
  .mk:hover { filter: brightness(1.12); }
  .tb:hover { border-color: #8AA2E8; color: #E8ECF6; }
  .tb:focus-visible, .mk:focus-visible { outline: 2px solid #8AA2E8; outline-offset: 2px; }
  ol { margin: 0; padding: 12px 16px 12px 34px; }
  li { margin-bottom: 5px; color: #C7CFE2; }
  li:last-child { margin-bottom: 0; }
  .sense-pos { font: 500 11px/1.4 ui-monospace, monospace; color: #6B7490; letter-spacing: .05em; }
  .trace {
    padding: 11px 16px; border-top: 1px solid #212939;
    font: 12px/1.6 ui-monospace, monospace; color: #838DA8;
  }
  .trace b { color: #8AA2E8; font-weight: 600; }
  .grammar {
    margin-top: 4px; color: #D9A64A;
    font: 500 11px/1.5 ui-monospace, monospace; letter-spacing: .06em;
    text-transform: uppercase;
  }
  .empty { padding: 16px; color: #838DA8; }
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

/**
 * Why a card went away. `replaced` means another card took its place, so
 * whatever it was holding — a paused video — is still needed.
 */
export type CloseReason = 'closed' | 'replaced';

function dismiss(why: CloseReason): void {
  clearTimeout(hideTimer);
  const had = host !== null;
  const done = onClose;
  host?.remove();
  host = null;
  openFor = null;
  overCard = false;
  onClose = null;
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

export interface CardDraft {
  expression: string;
  reading: string;
  meaning: string;
  sentence: string;
}

interface Context {
  token: Token;
  /** The whole line, for copy-sentence. */
  sentence: string;
  /** Current status, so the matching control reads as pressed. */
  status: Status;
  onMark: (word: string, status: OverrideStatus | null) => void;
  /** Resolves to a message for the toast, or throws with one. */
  onAddCard: (draft: CardDraft) => Promise<string>;
  /**
   * Whether Anki already holds a card for this word. The only thing the
   * "already in Anki" state is drawn from: a word marked known by hand, or
   * learning only because a card was just added, is not the same fact.
   */
  hasCard?: boolean;
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
  const key = `${ctx.token.start}:${ctx.token.surface}`;
  if (openFor === key) return;   // already showing this word
  dismiss('replaced');
  openFor = key;

  host = document.createElement('div');
  host.className = 'libregaku-popup';
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE;

  const top = entries[0];
  const word = top?.word ?? ctx.token.lemma ?? ctx.token.surface;
  const reading = top?.reading ?? ctx.token.reading;
  const hasCard = ctx.hasCard === true;

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', `${word} — dictionary`);
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
  if (reading) {
    const r = document.createElement('div');
    r.className = 'reading';
    r.textContent = reading;
    head.appendChild(r);
  }
  const w = document.createElement('div');
  w.className = 'word';
  w.textContent = word;
  head.appendChild(w);
  card.appendChild(head);

  if (top) {
    const meta = document.createElement('div');
    meta.className = 'meta';
    if (top.common) {
      const b = document.createElement('span');
      b.className = 'badge';
      b.textContent = 'common';
      meta.appendChild(b);
    }
    const pos = readablePos(top.senses[0]?.pos ?? []);
    if (pos) {
      const p = document.createElement('span');
      p.textContent = pos;
      meta.appendChild(p);
    }
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
    b.title = title;
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

  button('volume', 'Pronounce', (b) => {
    b.classList.add('busy');
    b.replaceChildren(icon('loader', 16));
    void pronounce(sayWord, sayReading)
      .then((spoken) => {
        // Say which source was used: a human recording and a synthesised one
        // are not equally trustworthy models to imitate.
        say(spoken.human ? `${word} · recording` : `${word} · synthesised`);
      })
      .catch(() => say('could not play audio', 4000))
      .finally(() => {
        b.classList.remove('busy');
        b.replaceChildren(icon('volume', 16));
      });
  });
  /*
   * Adding a card is the point of the whole tool, so it is the widest control
   * and it states its outcome. A silent success is indistinguishable from a
   * silent failure, and mining is a decision the learner should see land.
   */
  const addBtn = button(hasCard ? 'check' : 'plus',
    hasCard ? 'Already in Anki — add another' : 'Add to Anki', (b) => {
      b.classList.add('busy');
      b.replaceChildren(icon('loader', 16));
      void ctx
        .onAddCard({
          expression: word,
          reading: reading ?? '',
          meaning: entries[0]?.senses.flatMap((x) => x.glosses).slice(0, 4).join('; ') ?? '',
          sentence: ctx.sentence,
        })
        .then((msg) => {
          say(msg);
          b.replaceChildren(icon('check', 16));
        })
        .catch((e: unknown) => {
          say(e instanceof Error ? e.message : String(e), 4000);
          b.replaceChildren(icon('plus', 16));
        })
        .finally(() => b.classList.remove('busy'));
    });
  addBtn.classList.add('add');
  if (hasCard) addBtn.classList.add('has');

  // The clipboard refuses without focus or permission, which a video page can
  // withhold; copyText falls back, and either way the result is said aloud.
  const copy = (text: string, done: string): void => {
    void copyText(text).then((ok) => (ok ? say(done) : say('could not copy — select the text instead', 4000)));
  };
  button('copy', 'Copy word', () => copy(word, 'word copied'));
  button('quote', 'Copy sentence', () => copy(ctx.sentence, 'sentence copied'));
  /*
   * Jisho for the human link, Jotoba for the API — the distinction is real.
   * Calling someone's API implicates their terms, so that goes to the one that
   * documents and permits it. Opening a web page in a new tab implicates
   * nothing, so it goes to whichever site a learner would rather land on: for
   * English speakers that is Jisho, with its conjugation tables, kanji
   * breakdowns and example sentences.
   */
  button('external', 'Open in Jisho', () => {
    window.open(`https://jisho.org/search/${encodeURIComponent(word)}`, '_blank', 'noopener');
  });
  card.appendChild(tools);

  // Everything that can grow goes in one scrolling body, so a long entry
  // costs scrolling rather than the status row.
  const body = document.createElement('div');
  body.className = 'body';

  if (result.state === 'loading') {
    const e = document.createElement('div');
    e.className = 'loading';
    e.textContent = `Dictionary still loading — ${result.percent}%. Try again in a moment.`;
    body.appendChild(e);
  } else if (result.state === 'error') {
    const e = document.createElement('div');
    e.className = 'loading';
    e.textContent = `Dictionary unavailable: ${result.error}`;
    body.appendChild(e);
  } else if (!entries.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'No dictionary entry for this word.';
    body.appendChild(e);
  } else {
    const ol = document.createElement('ol');
    for (const sense of top!.senses.slice(0, 6)) {
      const li = document.createElement('li');
      li.textContent = sense.glosses.slice(0, 4).join('; ');
      ol.appendChild(li);
    }
    body.appendChild(ol);
  }

  // The inflection trace: what this token was built from, and where it leads.
  const { parts, lemma, surface, inflections } = ctx.token;
  if (parts?.length && lemma && lemma !== surface) {
    const tr = document.createElement('div');
    tr.className = 'trace';
    tr.append(document.createTextNode(`${parts.join(' + ')}  →  `));
    const b = document.createElement('b');
    b.textContent = lemma;
    tr.appendChild(b);

    /*
     * Name what the endings do. The merge pass already decided which morphemes
     * are endings and why, so labelling them is nearly free — and it is the
     * difference between showing someone いけ + ば and telling them it is a
     * conditional.
     */
    if (inflections?.length) {
      const g = document.createElement('div');
      g.className = 'grammar';
      g.textContent = inflections.join(' · ');
      tr.appendChild(g);
    }
    body.appendChild(tr);
  }
  card.appendChild(body);

  /*
   * Marking is deliberately separate from carding.
   *
   * "I know this" and "I have a flashcard for this" are different facts, and
   * conflating them is how a learner ends up carding words they have known for
   * years. Anki can express the second; only the user can express the first,
   * so it is stored as an override in this browser. Reconciling overrides into
   * Anki as tagged suspended notes, so they follow the collection, is planned
   * and not built (AGENTS.md, invariant 1).
   */
  const marks = document.createElement('div');
  marks.className = 'marks';
  const markKey = ctx.token.lemma ?? ctx.token.surface;

  const mark = (cls: string, label: string, next: OverrideStatus): void => {
    const b = document.createElement('button');
    b.className = `mk ${cls}`;
    b.textContent = label;
    b.setAttribute('aria-pressed', String(ctx.status === next));
    b.addEventListener('click', () => {
      const value = ctx.status === next ? null : next;   // clicking again clears
      void ctx.onMark(markKey, value);
      say(value ? `marked ${value}` : 'cleared');
      closePopup();
    });
    marks.appendChild(b);
  };

  mark('known', 'Known', 'known');
  mark('track', 'Track', 'tracking');
  mark('ignore', 'Ignore', 'ignored');
  card.appendChild(marks);

  card.appendChild(toast);
  root.append(style, card);
  mount.appendChild(host);
  onClose = ctx.onClose ?? null;

  place(host, card, mount, anchor);
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
 * Above the word when it fits there — subtitles sit low, so that is where the
 * room usually is — and below when that fits instead. When neither side can
 * take the whole card, it goes on the roomier side with its height capped to
 * that room, so its senses scroll and the word stays visible. Only when both
 * sides are too small for a usable card does it cover the word, with its
 * height capped to the player so the status row still fits on screen.
 */
export function placeCard(mount: Box, anchor: Box, size: { width: number; height: number }): Placement {
  let left = anchor.left - mount.left + anchor.width / 2 - size.width / 2;
  left = Math.max(EDGE, Math.min(left, mount.width - size.width - EDGE));

  const wordTop = anchor.top - mount.top;
  const wordBottom = anchor.bottom - mount.top;
  const above = wordTop - GAP - EDGE;
  const below = mount.height - wordBottom - GAP - EDGE;

  if (size.height <= above) return { left, top: wordTop - GAP - size.height, maxHeight: above, side: 'above' };
  if (size.height <= below) return { left, top: wordBottom + GAP, maxHeight: below, side: 'below' };
  if (Math.max(above, below) >= MIN_ROOM) {
    return above >= below
      ? { left, top: EDGE, maxHeight: above, side: 'above' }
      : { left, top: wordBottom + GAP, maxHeight: below, side: 'below' };
  }

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
function place(h: HTMLElement, card: HTMLElement, mount: HTMLElement, anchor: HTMLElement): void {
  const m = mount.getBoundingClientRect();
  const a = anchor.getBoundingClientRect();

  // Narrower than the card, as in a miniplayer: fit the width first, since
  // the width decides how tall the wrapped senses are.
  const room = m.width - 2 * EDGE;
  if (room > 0 && (card.offsetWidth || CARD_WIDTH) > room) card.style.width = `${room}px`;

  const size = { width: card.offsetWidth || CARD_WIDTH, height: card.offsetHeight || CARD_HEIGHT };
  const p = placeCard(m, a, size);
  card.style.maxHeight = `${Math.floor(p.maxHeight)}px`;
  card.dataset.side = p.side;
  h.style.left = `${Math.round(p.left)}px`;
  h.style.top = `${Math.round(p.top)}px`;
}
