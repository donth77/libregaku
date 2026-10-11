import { furigana } from '../morphology/furigana';
import type { Token } from '../morphology/types';
import { markPhrase, phraseAt, plainText, selectWhole, selectedWords, textFrom, type PhrasePick } from './phrase';

/**
 * The subtitle overlay.
 *
 * Everything lives in a shadow root: host pages have hostile CSS, and a shadow
 * boundary makes collisions structurally impossible rather than a bug class to
 * chase. Tokens are real DOM text — selectable, copyable, and legible to a
 * popup dictionary extension if the user runs one.
 */

/**
 * Pre-alpha: outline the text and log its geometry, so "nothing rendered" is
 * never ambiguous. Set false once the overlay is trusted on a given site.
 */
export const DEBUG_BOX = false;

const STYLE = `
  /* Inner-tree !important beats the outer document, so these cannot be
     overridden by the host page. \`all: initial\` used to live here and reset
     position/display out from under the layout — never reset the host. */
  :host {
    position: absolute !important;
    inset: 0 !important;
    display: block !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    contain: none !important;
    /* A query container, so text can be sized against the player's own box. */
    container-type: size !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    filter: none !important;
    clip-path: none !important;
  }
  .wrap {
    position: absolute; left: 0; right: 0;
    /*
     * Sized against the player, not the window: the same line should not be
     * a third larger in the default view than it is in theatre mode, and a
     * pillarboxed fullscreen should follow the picture's height rather than
     * the screen's width. cqmin takes the smaller side, so a 16:9 player
     * follows its height and a portrait one its width. The floor keeps
     * readings legible in a small embed; --scale is the learner's setting.
     */
    --size: calc(max(20px, 4.2cqmin) * var(--scale, 1));
    display: flex; flex-direction: column; align-items: center; gap: 10px;
    font-family: system-ui, -apple-system, "Hiragino Sans", "Yu Gothic", sans-serif;
    text-align: center; pointer-events: none;
  }
  .primary, .secondary {
    max-width: 88%; padding: 5px 14px; border-radius: 6px;
    background: rgba(0,0,0,.72); pointer-events: auto;
  }
  .primary:empty, .secondary:empty { display: none; }
  /*
   * Room for readings, above every row. A reading sits a little above its
   * word's box, so on a line that wraps, the second row's readings rose into
   * the first row's underlines. Each word keeps the space itself, which a
   * row gap would not: the line breaks a subtitle was written with are rows
   * of their own (.br) and would have doubled it.
   */
  .primary.has-ruby { padding-top: .2em; }
  .primary.has-ruby > .t, .primary.has-ruby > .p { margin-top: .3em; }
  /* No room for readings that are not showing: furigana off, or only on new words and none here. */
  .wrap.ruby-off .primary.has-ruby,
  .wrap:not(.ruby-all) .primary.has-ruby:not(.has-new-ruby) { padding-top: 0; }
  .wrap.ruby-off .primary.has-ruby > *,
  .wrap:not(.ruby-all) .primary.has-ruby:not(.has-new-ruby) > * { margin-top: 0; }
  .primary {
    font-size: var(--size); line-height: 1.8; color: #F2F5FC;
    display: flex; flex-wrap: wrap; justify-content: center;
    align-items: flex-end;      /* every token sits on one baseline */
    gap: 0 2px;
    /* Space for readings is reserved only when a line actually has any —
       otherwise every unannotated line carried a blank strip above it. */
    padding-top: 0;
    user-select: text;
  }
  .secondary { font-size: calc(var(--size) * .66); font-weight: 500; color: #D5DCEC; user-select: text; }
  /* Square corners: a rounded box bent each underline up at its ends. */
  .t { position: relative; padding: 0 1px 4px; cursor: pointer; }
  .p { position: relative; padding: 0 1px 4px; white-space: pre-wrap; }
  /* A line break in a flex row: a zero-height item as wide as the row pushes
     what follows onto the next one. A newline inside a span does not — it
     only made that span two lines tall beside the rest of the row. */
  .br { flex-basis: 100%; height: 0; }
  .t:hover { background: rgba(255,255,255,.15); }
  /*
   * A phrase: one band across its words, drawn by the words themselves
   * (markPhrase) with the browser's own highlight hidden. Each word fills its
   * own box, the same height for all, and the 2px gap after it.
   */
  .primary.phrased ::selection { background: transparent; }
  .t.inphrase, .p.inphrase { background: rgba(96, 140, 255, .48); border-radius: 0; }
  .t.inphrase:not(.phrase-last)::after, .p.inphrase:not(.phrase-last)::after {
    content: ''; position: absolute; top: 0; bottom: 0; left: 100%; width: 2px; background: inherit;
  }
  /*
   * Furigana is taken out of flow.
   *
   * A native <ruby> is taller than a bare token because its annotation sits in
   * the line box, so a line mixing 外国[がいこく] with a plain に had the two
   * sitting at different heights. Positioning rt absolutely gives every token
   * an identical box, and the row reserves the space once instead.
   */
  /* line-height 1 so the box hugs the glyphs; otherwise bottom:100% is
     measured against the row's 1.85 line-height and the reading floats. */
  .t ruby { display: inline-block; position: relative; line-height: 1; }
  .t rt {
    position: absolute; left: 50%; bottom: calc(100% + .04em);
    transform: translateX(-50%);
    font-size: .46em; font-weight: 400; line-height: 1;
    color: #B8C0D4; letter-spacing: .02em;
    white-space: nowrap; user-select: none; pointer-events: none;
  }
  /* Ruby only where it earns its place: words you have not learned yet. */
  .wrap:not(.ruby-all) .t:not([data-s="unknown"]):not([data-s="learning"]) rt { visibility: hidden; }
  .wrap.ruby-off rt { display: none; }
  .t[data-s="unknown"]  { box-shadow: inset 0 -2.5px 0 var(--lg-unknown, #E5806C); }
  .t[data-s="learning"] { box-shadow: inset 0 -1.5px 0 var(--lg-learning, #D9A64A); }
  .t[data-s="tracking"] { box-shadow: inset 0 -2px 0 var(--lg-tracking, #A78BFA); }
  .t[data-s="ignored"]  { box-shadow: none; }
  /*
   * Known is unmarked by default, which is where this parts company with
   * Migaku's green. The reward for progress is the screen growing quieter, and
   * that only reads if the baseline is bare. Some people would rather see the
   * system confirm what it thinks they know, so mark-known restores it.
   */
  .t[data-s="known"] { box-shadow: none; }
  .wrap.mark-known .t[data-s="known"] { box-shadow: inset 0 -1.5px 0 var(--lg-known, #63AF97); }
  /*
   * Listening practice: the line is there, unreadable, until the cursor
   * reaches it. The words are blurred and their box is not, so it still
   * shows when a line is being spoken and where to move the cursor to read it.
   */
  .wrap.blurred .primary > * { filter: blur(.3em); transition: filter .12s ease-out; }
  .wrap.blurred .primary:hover > *, .wrap.blurred .primary:focus-within > * { filter: none; }
  .hidden { display: none; }
  /* Hug the text. The wrapper is a full-width flex column, so outlining it
     drew a box across the whole player. */
  .debug .primary {
    outline: 2px dashed #E5806C;
    outline-offset: 2px;
    position: relative;
  }
  .debug .primary::before {
    content: 'libregaku';
    position: absolute; top: -15px; left: 0;
    font: 600 9px/1.4 ui-monospace, monospace; letter-spacing: .1em;
    color: #E5806C; text-transform: uppercase; pointer-events: none;
  }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

/** Statuses whose readings show when furigana is on for new words only. */
const isNew = (status: string): boolean => status === 'unknown' || status === 'learning';

export class Overlay {
  #host: HTMLElement;
  #root: ShadowRoot;
  #primary: HTMLElement;
  #secondary: HTMLElement;
  #onToken?: (t: Token, el: HTMLElement) => void;
  #onHover?: (t: Token | null, el: HTMLElement | null, shift?: boolean, phrase?: PhrasePick) => void;
  /**
   * `again` is a plain click on the phrase already marked, not a new one
   * picked. Returning false drops the phrase rather than keeping it marked.
   */
  #onPhrase?: (tokens: Token[], text: string, el: HTMLElement, again: boolean) => boolean | void;
  /** The press that is ending was on the marked phrase, without Shift. */
  #pressedPhrase = false;
  #onPress?: () => void;
  /** A selection just ended on the line; the click that follows is not a word's. */
  #selected = false;
  #statusOf: (t: Token) => string = () => 'unknown';
  #bottomPercent = 12;
  #bottomInset = 0;

  constructor(mount: HTMLElement) {
    this.#host = document.createElement('div');
    this.#host.className = 'libregaku-root';
    this.#root = this.#host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = STYLE;

    const wrap = document.createElement('div');
    wrap.className = DEBUG_BOX ? 'wrap debug' : 'wrap';

    this.#primary = document.createElement('div');
    this.#primary.className = 'primary';
    this.#secondary = document.createElement('div');
    this.#secondary.className = 'secondary hidden';

    wrap.append(this.#primary, this.#secondary);
    wrap.style.bottom = '12%';   // default; setAnchor overrides
    this.#root.append(style, wrap);
    mount.appendChild(this.#host);
    // On the document: a selection dragged from the box's edge leaves focus
    // on the page, and the copy event goes there rather than into this root.
    document.addEventListener('copy', this.#copy, true);
    document.addEventListener('selectionchange', this.#onSelection);

    this.#primary.addEventListener('click', (e) => {
      if (this.#selected) {
        this.#selected = false;
        return;
      }
      const el = (e.target as HTMLElement).closest('.t') as HTMLElement | null;
      if (!el || !this.#onToken) return;
      const raw = el.dataset.tok;
      if (raw) this.#onToken(JSON.parse(raw) as Token, el);
    });

    // A selection across words is a phrase (src/content/phrase.ts).
    this.#primary.addEventListener('mousedown', (e) => {
      this.#pressedPhrase = e.button === 0 && !e.shiftKey && Boolean((e.target as HTMLElement).closest?.('.inphrase'));
      if (e.button === 0 && (e.target as HTMLElement).closest?.('.t')) this.#onPress?.();
    });
    this.#primary.addEventListener('mouseup', () => {
      const picked = selectedWords(this.#root, this.#primary, '.t');
      if (picked.length < 2) return;
      const last = picked[picked.length - 1]!;
      const text = textFrom(picked[0]!, last);
      if (text === null) return;
      this.#selected = true;
      const tokens = picked.map((el) => JSON.parse(el.dataset.tok ?? '{}') as Token);
      const keep = this.#onPhrase?.(tokens, text, last, this.#pressedPhrase) !== false;
      // After the browser's own handling of the release, which collapses a
      // selection clicked inside: the phrase stays marked, to point at again,
      // unless that click was to put it away.
      const first = picked[0]!;
      setTimeout(() => (keep ? selectWhole(this.#root, first, last) : this.clearPhrase()), 0);
    });

    this.#primary.addEventListener('mouseover', (e) => {
      // A button held down is a selection being made, not a word being read.
      if ((e as MouseEvent).buttons & 1) return;
      const el = (e.target as HTMLElement).closest('.t') as HTMLElement | null;
      if (!el?.dataset.tok) return;
      this.#onHover?.(JSON.parse(el.dataset.tok) as Token, el, (e as MouseEvent).shiftKey, phraseAt(el, '.t'));
    });
    this.#primary.addEventListener('mouseout', (e) => {
      const el = (e.target as HTMLElement).closest('.t') as HTMLElement | null;
      if (!el) return;
      // Moving between two tokens is not a leave; the next mouseover follows.
      const to = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (to?.closest?.('.t')) return;
      this.#onHover?.(null, null);
    });
  }

  /** Unmark the phrase on the line, if one is marked. */
  clearPhrase(): void {
    if (!this.#primary.classList.contains('phrased')) return;
    (this.#root as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.()?.removeAllRanges();
  }

  /** Copying from the line copies it as it reads (see plainText). */
  #selFrame = 0;
  /** Redraw the phrase band as the selection moves, once a frame. */
  #onSelection = (): void => {
    if (this.#selFrame) return;
    this.#selFrame = requestAnimationFrame(() => {
      this.#selFrame = 0;
      this.#primary.classList.toggle('phrased', markPhrase(this.#root, this.#primary, '.t'));
    });
  };

  #copy = (e: ClipboardEvent): void => {
    const sel = (this.#root as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !e.clipboardData) return;
    const range = sel.getRangeAt(0);
    if (!this.#root.contains(range.commonAncestorContainer)) return;
    const text = plainText(range);
    if (!text) return;
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  };

  onToken(cb: (t: Token, el: HTMLElement) => void): void {
    this.#onToken = cb;
  }

  /**
   * Fires when a selection on the line covers two words or more, with the
   * words, the text from the first to the last as written (spaces and all),
   * and the last word's element to anchor a card to.
   */
  onPhrase(cb: (tokens: Token[], text: string, el: HTMLElement, again: boolean) => boolean | void): void {
    this.#onPhrase = cb;
  }

  /** Fires when a word is pressed — the start of a click, or of a selection. */
  onPress(cb: () => void): void {
    this.#onPress = cb;
  }



  /**
   * How each token is coloured. Supplied rather than computed here so the
   * renderer never learns what Anki is.
   */
  setStatusSource(fn: (t: Token) => string): void {
    this.#statusOf = fn;
    // Update the current line too, including paused and DOM-fallback captions.
    // Keeping the elements preserves focus and the popup's word anchor.
    let fresh = false;
    for (const el of this.#primary.querySelectorAll<HTMLElement>('.t')) {
      if (el.dataset.tok) el.dataset.s = fn(JSON.parse(el.dataset.tok) as Token);
      if (el.querySelector('rt') && isNew(el.dataset.s ?? '')) fresh = true;
    }
    this.#primary.classList.toggle('has-new-ruby', fresh);
  }

  /** Fires with a token on enter, and whether Shift was held then; with null on leave. */
  /** `phrase` is the phrase the word is part of, while one is marked on the line. */
  onHover(cb: (t: Token | null, el: HTMLElement | null, shift?: boolean, phrase?: PhrasePick) => void): void {
    this.#onHover = cb;
  }

  /**
   * Distance up from the bottom of the player, as a percentage of its height.
   * There is deliberately no top anchor: subtitles belong in the lower frame.
   */
  setBottom(percent: number): void {
    this.#bottomPercent = percent;
    this.#applyBottom();
  }

  /**
   * Extra height to clear, in pixels.
   *
   * When the panel shrinks the picture to sit beside it, the frame no longer
   * reaches the bottom of the player. A subtitle placed against the player
   * would sit on the letterbox below the picture instead of on it.
   */
  setBottomInset(px: number): void {
    this.#bottomInset = px;
    this.#applyBottom();
  }

  #applyBottom(): void {
    const wrap = this.#primary.parentElement;
    if (!wrap) return;
    wrap.style.bottom = this.#bottomInset
      ? `calc(${this.#bottomPercent}% + ${this.#bottomInset}px)`
      : `${this.#bottomPercent}%`;
  }

  /** Keep clear of the transcript panel while it is open over the player. */
  setRightInset(px: number): void {
    const wrap = this.#primary.parentElement;
    if (!wrap) return;
    wrap.style.right = `${px}px`;
  }

  /** Text size as a percentage of the default. Readings scale with it. */
  setSize(percent: number): void {
    this.#primary.parentElement?.style.setProperty('--scale', String(percent / 100));
  }

  /** always | unknown | never */
  /** Whether known words carry a green underline, as Migaku does. */
  setMarkKnown(on: boolean): void {
    this.#primary.parentElement?.classList.toggle('mark-known', on);
  }

  /**
   * The languages of the two lines, for the browser to draw each as its
   * own: kanji as Japanese draws them, under a page or an interface in Chinese.
   */
  setLanguages(learned: string, translation: string): void {
    this.#primary.lang = learned;
    this.#secondary.lang = translation;
  }

  /** The underline colours, as underlineVars gives them. */
  setColors(vars: Record<string, string>): void {
    for (const [name, value] of Object.entries(vars)) this.#host.style.setProperty(name, value);
  }

  /** Blur the line until the cursor is on it. */
  setBlurred(on: boolean): void {
    this.#primary.parentElement?.classList.toggle('blurred', on);
  }

  setRubyMode(mode: 'always' | 'unknown' | 'never'): void {
    const wrap = this.#primary.parentElement;
    wrap?.classList.toggle('ruby-all', mode === 'always');
    wrap?.classList.toggle('ruby-off', mode === 'never');
  }

  render(tokens: Token[], secondary?: string): void {
    if (DEBUG_BOX) {
      const h = this.#host.getBoundingClientRect();
      queueMicrotask(() => {
        const p = this.#primary.getBoundingClientRect();
        const cs = getComputedStyle(this.#host);
        console.log(
          `%c[libregaku]%c paint ${tokens.length} tokens\n` +
            `  host    ${Math.round(h.width)}×${Math.round(h.height)} @ ${Math.round(h.left)},${Math.round(h.top)}\n` +
            `  text    ${Math.round(p.width)}×${Math.round(p.height)} @ ${Math.round(p.left)},${Math.round(p.top)}\n` +
            `  host css display=${cs.display} position=${cs.position} z=${cs.zIndex} vis=${cs.visibility} opacity=${cs.opacity}`,
          'color:#8AA2E8', '',
        );
      });
    }
    this.#primary.replaceChildren();
    // Whether this line needs headroom at all.
    const annotated = tokens.filter((t) => !t.punct && furigana(t.surface, t.reading).some((x) => x.ruby));
    this.#primary.classList.toggle('has-ruby', annotated.length > 0);
    this.#primary.classList.toggle('has-new-ruby', annotated.some((t) => isNew(this.#statusOf(t))));
    this.#primary.classList.remove('phrased');
    for (const tok of tokens) {
      // Punctuation is text, not a word: rendered, never hoverable. The line
      // breaks a subtitle was written with are kept — two speakers, or the
      // author's own phrasing — as are breaks between cues shown together.
      if (tok.punct) {
        tok.surface.split('\n').forEach((piece, i) => {
          if (i) {
            const br = document.createElement('span');
            br.className = 'br';
            this.#primary.appendChild(br);
          }
          if (!piece.trim() && i) return;
          if (!piece) return;
          const plain = document.createElement('span');
          plain.className = 'p';
          plain.textContent = piece;
          this.#primary.appendChild(plain);
        });
        continue;
      }

      const segs = furigana(tok.surface, tok.reading);
      const annotated = segs.some((x) => x.ruby);

      const el = document.createElement('span');
      el.className = 't';
      el.dataset.s = this.#statusOf(tok);
      el.dataset.tok = JSON.stringify(tok);
      el.tabIndex = 0;

      if (!annotated) {
        el.textContent = tok.surface;
      } else {
        for (const seg of segs) {
          if (!seg.ruby) {
            el.appendChild(document.createTextNode(seg.text));
            continue;
          }
          const ruby = document.createElement('ruby');
          ruby.appendChild(document.createTextNode(seg.text));
          const rt = document.createElement('rt');
          rt.textContent = seg.ruby;
          ruby.appendChild(rt);
          el.appendChild(ruby);
        }
      }
      this.#primary.appendChild(el);
    }
    if (secondary) {
      this.#secondary.textContent = secondary;
      this.#secondary.classList.remove('hidden');
    } else {
      this.#secondary.classList.add('hidden');
    }
  }

  clear(): void {
    this.#primary.replaceChildren();
    this.#secondary.classList.add('hidden');
  }

  destroy(): void {
    document.removeEventListener('copy', this.#copy, true);
    document.removeEventListener('selectionchange', this.#onSelection);
    this.#host.remove();
  }
}
