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
  .tb.busy { color: #8AA2E8; }
  .tb.busy svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .tb.busy svg { animation: none; } }
  .loading { padding: 14px; color: #D9A64A; font-size: 12px; }
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
  .empty { padding: 14px; color: #838DA8; }
  .attrib {
    display: flex; justify-content: space-between; gap: 8px;
    padding: 7px 14px; border-top: 1px solid #212939;
    font: 10px/1.4 ui-monospace, monospace; color: #5A6480; letter-spacing: .04em;
  }
  .attrib a { color: #6B7490; text-decoration: none; }
  .attrib a:hover { color: #8AA2E8; text-decoration: underline; }
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

interface Context {
  token: Token;
  /** The whole line, for copy-sentence. */
  sentence: string;
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
  const { parts, lemma, surface } = ctx.token;
  if (parts?.length && lemma && lemma !== surface) {
    const tr = document.createElement('div');
    tr.className = 'trace';
    tr.innerHTML = '';
    tr.append(document.createTextNode(parts.join(' + ') + '  →  '));
    const b = document.createElement('b');
    b.textContent = lemma;
    tr.appendChild(b);
    card.appendChild(tr);
  }

  /*
   * Attribution is a licence obligation, not a courtesy: JMdict is CC BY-SA
   * 4.0, which requires crediting the creator and linking the licence wherever
   * the material is used. The README is not where a user sees the data.
   */
  const attrib = document.createElement('div');
  attrib.className = 'attrib';
  const src = document.createElement('a');
  src.href = 'https://www.edrdg.org/jmdict/j_jmdict.html';
  src.target = '_blank';
  src.rel = 'noopener';
  src.textContent = 'JMdict · EDRDG';
  const lic = document.createElement('a');
  lic.href = 'https://creativecommons.org/licenses/by-sa/4.0/';
  lic.target = '_blank';
  lic.rel = 'noopener';
  lic.textContent = 'CC BY-SA 4.0';
  attrib.append(src, lic);
  if (result.state === 'ok') card.appendChild(attrib);

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
