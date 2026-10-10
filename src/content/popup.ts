import type { OverrideStatus, Status } from '../anki/status';
import { pronounce } from '../audio/pronounce';
import type { Characters, LookupResult } from '../dict/client';
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
  .chars {
    display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline;
    gap: 7px 12px; padding: 10px 16px 12px; border-top: 1px solid #212939;
  }
  .chars-head {
    grid-column: 1 / -1; font: 600 11px/1.4 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; color: #8A94AF;
  }
  .kanji { font: 500 24px/1.1 "Hiragino Mincho ProN", "Yu Mincho", serif; color: #E8ECF6; }
  .kanji-mean { font-size: 13.5px; line-height: 1.4; color: #C7CFE2; }
  .kanji-read { display: block; font-size: 12px; line-height: 1.5; color: #8AA2E8; }
  .also { padding: 10px 16px 12px; border-top: 1px solid #212939; }
  .also-head {
    font: 600 11px/1.4 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; color: #8A94AF; margin-bottom: 4px;
  }
  .also-line {
    display: flex; gap: 10px; align-items: baseline; width: calc(100% + 12px);
    margin: 0 -6px; padding: 5px 6px; border: 0; border-radius: 6px;
    background: none; color: #C7CFE2; text-align: left; cursor: pointer;
    font: 14px/1.5 system-ui, -apple-system, "Hiragino Sans", sans-serif;
  }
  .also-line:hover { background: #1B2234; color: #E8ECF6; }
  .also-line:focus-visible { outline: 2px solid #8AA2E8; outline-offset: -2px; }
  .also-line .at { flex: none; font: 500 11.5px/1 ui-monospace, monospace; color: #6B7490; font-variant-numeric: tabular-nums; }
  .also-line b { font-weight: 600; color: #E8ECF6; box-shadow: inset 0 -2px 0 #8AA2E8; }
  .also-more { font-size: 12px; color: #6B7490; padding: 4px 0 0; }
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

/**
 * The card a lookup makes: the dictionary's headword and reading where it has
 * them, the word as it was said where it does not. One definition for the Add
 * button and the A key, so the two can never make different cards.
 */
export function draftFor(result: LookupResult, token: Token, sentence: string): CardDraft {
  const top = result.state === 'ok' ? result.entries[0] : undefined;
  return {
    expression: top?.word ?? token.lemma ?? token.surface,
    reading: top?.reading ?? token.reading ?? '',
    meaning: top?.senses.flatMap((x) => x.glosses).slice(0, 4).join('; ') ?? '',
    sentence,
  };
}

/**
 * Press the open card's Add button, the way the A key does: the same handler,
 * and the outcome said on the card exactly as for a click. False when no card
 * is open.
 */
export function pressAdd(): boolean {
  const b = host?.shadowRoot?.querySelector<HTMLButtonElement>('.tb.add');
  if (!b) return false;
  b.click();
  return true;
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
  /** A card for it is waiting for Anki to open, rather than in Anki. */
  queued?: boolean;
  /**
   * The other lines of this video the word is in, once found. Shown when it
   * arrives, so a long transcript never holds up the definition.
   */
  elsewhere?: Promise<Array<{ start: number; text: string; match: string }>>;
  /** Play from one of those lines. */
  onSeek?: (start: number) => void;
  /** The characters the word is written with, once looked up. */
  characters?: Promise<Characters>;
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
   * silent failure, and making a card is a decision the learner should see land.
   */
  const addBtn = button(hasCard ? 'check' : 'plus',
    hasCard
      ? ctx.queued ? 'Waiting for Anki to open — add another' : 'Already in Anki — add another'
      : 'Add to Anki',
    (b) => {
      // One card per press, however impatient the second click or key.
      if (b.classList.contains('busy')) return;
      b.classList.add('busy');
      b.replaceChildren(icon('loader', 16));
      void ctx
        .onAddCard(draftFor(result, ctx.token, ctx.sentence))
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
  // Its key, where someone hovering the button will see it (src/content/keys.ts).
  shortcut(addBtn, 'A', 'A');

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

  if (ctx.characters) {
    const chars = document.createElement('div');
    chars.className = 'chars';
    chars.hidden = true;
    body.appendChild(chars);
    const mine = host;
    void ctx.characters.then((c) => {
      if (host !== mine || !c.items.length) return;
      fillCharacters(chars, c);
      chars.hidden = false;
    }, () => {});
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
  if (ctx.elsewhere) {
    const also = document.createElement('div');
    also.className = 'also';
    also.hidden = true;
    body.appendChild(also);
    const mine = host;
    void ctx.elsewhere.then((lines) => {
      // The card may have closed, or become another word's, meanwhile.
      if (host !== mine || !lines.length) return;
      fillAlso(also, lines, ctx.onSeek);
      also.hidden = false;
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
  const marks = document.createElement('div');
  marks.className = 'marks';
  const markKey = ctx.token.lemma ?? ctx.token.surface;

  const mark = (cls: string, label: string, next: OverrideStatus): void => {
    const b = document.createElement('button');
    b.className = `mk ${cls}`;
    b.textContent = label;
    if (next === 'known') {
      b.title = label;
      shortcut(b, 'K', 'K');
    }
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

/**
 * Name a button's key in its tooltip, and to assistive tech. The label it is
 * read out by stays as it was: the key is announced as a shortcut, not as
 * part of the button's name.
 */
export function shortcut(b: HTMLElement, shown: string, aria: string): void {
  b.title = `${b.title} (${shown})`;
  b.setAttribute('aria-keyshortcuts', aria);
}

/**
 * Each character of the word: what it means, and how it reads. The readings
 * are the dictionary's, dots and all — つと.める shows where the okurigana starts.
 */
function fillCharacters(el: HTMLElement, c: Characters): void {
  const head = document.createElement('div');
  head.className = 'chars-head';
  head.textContent = c.label;
  el.appendChild(head);
  for (const k of c.items) {
    const ch = document.createElement('div');
    ch.className = 'kanji';
    ch.textContent = k.char;
    const info = document.createElement('div');
    info.className = 'kanji-mean';
    info.textContent = k.meanings.slice(0, 3).join(', ') || '—';
    const readings = [...k.on.slice(0, 2), ...k.kun.slice(0, 2)];
    if (readings.length) {
      const r = document.createElement('span');
      r.className = 'kanji-read';
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
): void {
  const head = document.createElement('div');
  head.className = 'also-head';
  head.textContent = lines.length === 1 ? 'Once more in this video' : `${lines.length} more times in this video`;
  el.appendChild(head);
  for (const line of lines.slice(0, ALSO_SHOWN)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'also-line';
    b.title = 'Play from here';
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
    const more = document.createElement('div');
    more.className = 'also-more';
    more.textContent = `and ${lines.length - ALSO_SHOWN} more — the transcript's search finds them all`;
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
