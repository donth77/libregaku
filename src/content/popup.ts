import type { Status } from '../anki/status';
import { pronounce } from '../audio/pronounce';
import type { LookupResult } from '../dict/client';
import { readablePos } from '../dict/pos';
import type { Token } from '../morphology/types';
import { icon } from './icons';

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
  .card {
    pointer-events: auto;
    width: min(340px, 80vw);
    background: #12172A; color: #E8ECF6;
    border: 1px solid #2A3348; border-radius: 10px;
    box-shadow: 0 10px 40px -8px rgba(0,0,0,.75);
    font: 13px/1.5 system-ui, -apple-system, "Hiragino Sans", sans-serif;
    overflow: hidden;
  }
  .head { padding: 11px 14px 0; }
  .reading { font: 500 11px/1.4 ui-monospace, monospace; color: #8AA2E8; letter-spacing: .04em; }
  .word { font-size: 22px; font-weight: 600; line-height: 1.2; margin-top: 1px; }
  .meta {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    padding: 7px 14px 0; font: 500 11px/1.4 ui-monospace, monospace; color: #838DA8;
  }
  .badge { padding: 2px 7px; border-radius: 4px; background: #16281F; color: #63AF97; letter-spacing: .05em; }
  .tools { display: flex; gap: 5px; padding: 10px 14px; border-bottom: 1px solid #212939; }
  .tb {
    width: 28px; height: 28px; border-radius: 50%;
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
  .loading { padding: 14px; color: #D9A64A; font-size: 12px; }
  .marks { display: flex; gap: 6px; padding: 10px 14px; border-top: 1px solid #212939; }
  .mk {
    flex: 1; padding: 7px 8px; border-radius: 6px; cursor: pointer;
    font: 600 10px/1.2 ui-monospace, monospace; letter-spacing: .07em;
    text-transform: uppercase; border: 1px solid transparent;
  }
  .mk.known   { background: #16281F; color: #63AF97; border-color: #2A5245; }
  .mk.track   { background: #211A38; color: #A78BFA; border-color: #46396B; }
  .mk.ignore  { background: #1B2234; color: #838DA8; border-color: #2A3348; }
  .mk[aria-pressed="true"] { outline: 2px solid currentColor; outline-offset: -1px; }
  .mk:hover { filter: brightness(1.12); }
  .tb:hover { border-color: #8AA2E8; color: #E8ECF6; }
  .tb:focus-visible { outline: 2px solid #8AA2E8; outline-offset: 2px; }
  ol { margin: 0; padding: 10px 14px 10px 30px; }
  li { margin-bottom: 3px; color: #C7CFE2; }
  li:last-child { margin-bottom: 0; }
  .sense-pos { font: 500 10px/1.4 ui-monospace, monospace; color: #6B7490; letter-spacing: .05em; }
  .trace {
    padding: 9px 14px; border-top: 1px solid #212939;
    font: 11px/1.6 ui-monospace, monospace; color: #838DA8;
  }
  .trace b { color: #8AA2E8; font-weight: 600; }
  .grammar {
    margin-top: 4px; color: #D9A64A;
    font: 500 10px/1.5 ui-monospace, monospace; letter-spacing: .06em;
    text-transform: uppercase;
  }
  .empty { padding: 14px; color: #838DA8; }
  .toast {
    position: absolute; left: 50%; bottom: -26px; transform: translateX(-50%);
    background: #E8ECF6; color: #12172A; font: 600 10px/1 ui-monospace, monospace;
    letter-spacing: .06em; padding: 5px 9px; border-radius: 4px; opacity: 0;
    transition: opacity .15s; pointer-events: none; white-space: nowrap;
  }
  .toast.on { opacity: .95; }
  @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
`;

let host: HTMLElement | null = null;
let openFor: string | null = null;
let hideTimer = 0;
let overCard = false;

/** One card, ever. Opening a second closes the first. */
export function closePopup(): void {
  clearTimeout(hideTimer);
  host?.remove();
  host = null;
  openFor = null;
  overCard = false;
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
  onMark: (word: string, status: Status | null) => void;
  /** Resolves to a message for the toast, or throws with one. */
  onAddCard: (draft: CardDraft) => Promise<string>;
  /** Whether a card already exists, so the control can say so. */
  hasCard: boolean;
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
  closePopup();
  openFor = key;

  host = document.createElement('div');
  host.className = 'libregaku-popup';
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE;

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');
  card.addEventListener('mouseenter', () => {
    overCard = true;
    cancelPopupClose();
  });
  card.addEventListener('mouseleave', () => {
    overCard = false;
    closePopupSoon();
  });

  const top = entries[0];
  const word = top?.word ?? ctx.token.lemma ?? ctx.token.surface;
  const reading = top?.reading ?? ctx.token.reading;

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

  let toastT = 0;
  const say = (m: string): void => {
    toast.textContent = m;
    toast.classList.add('on');
    clearTimeout(toastT);
    toastT = window.setTimeout(() => toast.classList.remove('on'), 1500);
  };

  const button = (name: string, title: string, fn: (b: HTMLButtonElement) => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.className = 'tb';
    b.appendChild(icon(name));
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
    b.replaceChildren(icon('loader'));
    void pronounce(sayWord, sayReading)
      .then((spoken) => {
        // Say which source was used: a human recording and a synthesised one
        // are not equally trustworthy models to imitate.
        say(spoken.human ? `${word} · recording` : `${word} · synthesised`);
      })
      .catch(() => say('could not play audio'))
      .finally(() => {
        b.classList.remove('busy');
        b.replaceChildren(icon('volume'));
      });
  });
  /*
   * Adding a card is the point of the whole tool, so it is the widest control
   * and it states its outcome. A silent success is indistinguishable from a
   * silent failure, and mining is a decision the learner should see land.
   */
  const addBtn = button(ctx.hasCard ? 'check' : 'plus',
    ctx.hasCard ? 'Already in Anki — add another' : 'Add to Anki', (b) => {
      b.classList.add('busy');
      b.replaceChildren(icon('loader'));
      void ctx
        .onAddCard({
          expression: word,
          reading: reading ?? '',
          meaning: entries[0]?.senses.flatMap((x) => x.glosses).slice(0, 4).join('; ') ?? '',
          sentence: ctx.sentence,
        })
        .then((msg) => {
          say(msg);
          b.replaceChildren(icon('check'));
        })
        .catch((e: unknown) => {
          say(e instanceof Error ? e.message : String(e));
          b.replaceChildren(icon('plus'));
        })
        .finally(() => b.classList.remove('busy'));
    });
  addBtn.classList.add('add');
  if (ctx.hasCard) addBtn.classList.add('has');

  button('copy', 'Copy word', () => void navigator.clipboard.writeText(word).then(() => say('word copied')));
  button('quote', 'Copy sentence', () => void navigator.clipboard.writeText(ctx.sentence).then(() => say('sentence copied')));
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

  if (result.state === 'loading') {
    const e = document.createElement('div');
    e.className = 'loading';
    e.textContent = `Dictionary still loading — ${result.percent}%. Try again in a moment.`;
    card.appendChild(e);
  } else if (result.state === 'error') {
    const e = document.createElement('div');
    e.className = 'loading';
    e.textContent = `Dictionary unavailable: ${result.error}`;
    card.appendChild(e);
  } else if (!entries.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'No dictionary entry for this word.';
    card.appendChild(e);
  } else {
    const ol = document.createElement('ol');
    for (const sense of top!.senses.slice(0, 6)) {
      const li = document.createElement('li');
      li.textContent = sense.glosses.slice(0, 4).join('; ');
      ol.appendChild(li);
    }
    card.appendChild(ol);
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
    card.appendChild(tr);
  }

  /*
   * Marking is deliberately separate from carding.
   *
   * "I know this" and "I have a flashcard for this" are different facts, and
   * conflating them is how a learner ends up carding words they have known for
   * years. Anki can express the second; only the user can express the first,
   * so it is stored as an override and reconciled into Anki later as a tagged
   * suspended note.
   */
  const marks = document.createElement('div');
  marks.className = 'marks';
  const markKey = ctx.token.lemma ?? ctx.token.surface;

  const mark = (cls: string, label: string, next: Status | null): void => {
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

  place(host, card, mount, anchor);
}

/** Sit above the word, or below it when there is no room, never over it. */
function place(h: HTMLElement, card: HTMLElement, mount: HTMLElement, anchor: HTMLElement): void {
  const m = mount.getBoundingClientRect();
  const a = anchor.getBoundingClientRect();
  const w = card.offsetWidth || 340;
  const ch = card.offsetHeight || 200;

  let left = a.left - m.left + a.width / 2 - w / 2;
  left = Math.max(8, Math.min(left, m.width - w - 8));

  const above = a.top - m.top - ch - 10;
  const top = above >= 8 ? above : a.bottom - m.top + 10;

  h.style.left = `${left}px`;
  h.style.top = `${Math.max(8, Math.min(top, m.height - ch - 8))}px`;
}
