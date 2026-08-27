import type { Entry } from '../dict/jmdict';
import { readablePos } from '../dict/pos';
import type { Token } from '../morphology/types';

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
    width: 27px; height: 27px; border-radius: 50%;
    border: 1px solid #2A3348; background: #1B2234; color: #B4BDD4;
    cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; padding: 0;
  }
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

export function closePopup(): void {
  host?.remove();
  host = null;
}

export function popupIsOpen(): boolean {
  return host !== null;
}

interface Context {
  token: Token;
  /** The whole line, for copy-sentence. */
  sentence: string;
}

export function showPopup(
  mount: HTMLElement,
  anchor: HTMLElement,
  entries: Entry[],
  ctx: Context,
): void {
  closePopup();

  host = document.createElement('div');
  host.className = 'libregaku-popup';
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE;

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'dialog');

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

  const button = (glyph: string, title: string, fn: () => void): void => {
    const b = document.createElement('button');
    b.className = 'tb';
    b.textContent = glyph;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', fn);
    tools.appendChild(b);
  };

  button('▶', 'Pronounce', () => {
    if (!('speechSynthesis' in window)) return say('no speech synthesis here');
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'ja-JP';
    u.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    say(`🔊 ${word}`);
  });
  button('⧉', 'Copy word', () => void navigator.clipboard.writeText(word).then(() => say('word copied')));
  button('¶', 'Copy sentence', () => void navigator.clipboard.writeText(ctx.sentence).then(() => say('sentence copied')));
  button('↗', 'Open in jisho.org', () => {
    window.open(`https://jisho.org/search/${encodeURIComponent(word)}`, '_blank', 'noopener');
  });
  card.appendChild(tools);

  if (!entries.length) {
    const e = document.createElement('div');
    e.className = 'empty';
    e.textContent = 'No dictionary entry found.';
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
