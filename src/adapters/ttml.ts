import type { Cue } from './types';

/**
 * TTML / imsc1, which is what Netflix serves.
 *
 * Times come in every shape TTML allows, and all of them appear in the wild:
 *   "619619619t"             ticks, divided by the root's ttp:tickRate
 *   "00:01:02.500"           clock
 *   "00:01:02:12"            clock with frames, at ttp:frameRate × ttp:frameRateMultiplier
 *   "62.5s" "500ms" "1.5m" "0.1h" "30f"   offsets
 * Netflix itself only uses ticks; the rest is so a file from anywhere else does
 * not silently parse to nothing, which is what a frame count used to do.
 *
 * Japanese tracks carry furigana as ruby: a container span holding a base span
 * (the kanji) and a text span (the reading). The roles are set inline with
 * tts:ruby or — as Netflix's own parser expects — on a <style> the span refers
 * to. Only the base belongs in the line. Keeping the reading too produced
 * 漢字かんじ, which the segmenter split into words that are not there, then
 * looked up, marked and counted.
 */

/** Stands in for <br> while whitespace is normalised. XML text cannot contain it. */
const BR = '\u0000';

/** Ruby roles whose text annotates the line rather than being part of it. */
const ANNOTATION = new Set(['text', 'textContainer', 'delimiter']);

/** Elements whose content is never part of the line. rt/rp are HTML-style ruby. */
const SILENT = new Set(['rt', 'rp', 'metadata', 'set']);

const OFFSET = /^(\d+(?:\.\d+)?)(h|ms|m|s|f|t)$/;
const CLOCK = /^(\d+):(\d+):(\d+(?:\.\d+)?)(?::(\d+)(?:\.(\d+))?)?$/;
/** mm:ss — not TTML, but older and hand-edited files use it. */
const SHORT_CLOCK = /^(\d+):(\d+(?:\.\d+)?)$/;

/**
 * East Asian wide characters, Hangul excepted. A line break between two of
 * these is layout, not a word boundary — CSS drops it for the same reason — so
 * pretty-printed XML must not put a space inside a Japanese sentence.
 */
const WIDE =
  /[⺀-〾ぁ-ㄯ㆐-䶿一-鿿豈-﫿︰-﹏！-ﾟ￠-￦\u{20000}-\u{3FFFD}]/u;

interface Rates {
  tick: number;
  frame: number;
  subFrame: number;
}

/** A name without its namespace prefix: "tts:ruby" -> "ruby". */
function bare(name: string): string {
  const i = name.indexOf(':');
  return i < 0 ? name : name.slice(i + 1);
}

/**
 * An attribute by local name, whatever prefix the document bound its
 * namespace to. Files spell tts:/ttp: however they like, and looking one up by
 * a single literal prefix silently misses the rest.
 */
function attr(el: Element, local: string): string | null {
  for (const a of Array.from(el.attributes)) {
    if (bare(a.localName || a.name) === local) return a.value;
  }
  return null;
}

function tagOf(el: Element): string {
  return bare(el.localName || el.nodeName).toLowerCase();
}

function positive(v: string | null): number | null {
  const n = v === null ? NaN : Number(v.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ratesOf(root: Element | null): Rates {
  const get = (name: string): string | null => (root ? attr(root, name) : null);
  const frameRate = positive(get('frameRate'));
  const [num, den] = (get('frameRateMultiplier') ?? '').trim().split(/\s+/).map(Number);
  const multiplier = num && den && Number.isFinite(num / den) ? num / den : 1;
  const frame = (frameRate ?? 30) * multiplier;
  const subFrame = positive(get('subFrameRate')) ?? 1;
  // TTML defaults an undeclared tick rate to frameRate × subFrameRate, or else
  // to 1. Files that use ticks without declaring a rate at all are written for
  // 10 MHz in practice, so that stays the default when there is no frame rate.
  const tick = positive(get('tickRate')) ?? (frameRate ? frame * subFrame : 10_000_000);
  return { tick, frame, subFrame };
}

/** A TTML time expression in seconds, or null when it is absent or unreadable. */
function parseTime(v: string | null, r: Rates): number | null {
  if (v === null) return null;
  const s = v.trim();

  const off = OFFSET.exec(s);
  if (off) {
    const n = Number(off[1]);
    switch (off[2]) {
      case 'h': return n * 3600;
      case 'm': return n * 60;
      case 's': return n;
      case 'ms': return n / 1000;
      case 'f': return n / r.frame;
      case 't': return n / r.tick;
    }
  }

  const clock = CLOCK.exec(s);
  if (clock) {
    const [, h, m, sec, frames, sub] = clock;
    let t = Number(h) * 3600 + Number(m) * 60 + Number(sec);
    if (frames !== undefined) {
      t += (Number(frames) + (sub !== undefined ? Number(sub) / r.subFrame : 0)) / r.frame;
    }
    return t;
  }

  const short = SHORT_CLOCK.exec(s);
  if (short) return Number(short[1]) * 60 + Number(short[2]);

  const n = Number(s);
  return s !== '' && Number.isFinite(n) ? n : null;
}

/**
 * When `el` is on screen, in seconds from the start of the document.
 *
 * TTML times are relative to the parent's begin (parallel time containment),
 * so a <div begin="100s"> moves every <p> inside it. A child also cannot
 * outlive its parent. Null when nothing on the path declares a begin, which
 * is a malformed cue rather than one that runs from zero.
 */
function interval(p: Element, r: Rates): { start: number; end: number | null } | null {
  const path: Element[] = [];
  for (let el: Element | null = p; el && tagOf(el) !== 'tt'; el = el.parentElement) path.unshift(el);

  let start = 0;
  let end: number | null = null;
  let timed = false;
  for (const el of path) {
    const b = parseTime(attr(el, 'begin'), r);
    const e = parseTime(attr(el, 'end'), r);
    const d = parseTime(attr(el, 'dur'), r);
    const from = start + (b ?? 0);
    let to: number | null = e !== null ? start + e : d !== null ? from + d : end;
    if (to !== null && end !== null) to = Math.min(to, end);
    timed = timed || b !== null;
    start = from;
    end = to;
  }
  return timed ? { start, end } : null;
}

/** <style xml:id="…"> elements by id, for spans that take their ruby role from one. */
function stylesOf(doc: Document): Map<string, Element> {
  const out = new Map<string, Element>();
  for (const el of Array.from(doc.querySelectorAll('style'))) {
    const id = attr(el, 'id');
    if (id) out.set(id, el);
  }
  return out;
}

/**
 * An element's ruby role: its own tts:ruby, else one from the styles it refers
 * to — later references win, and a style can refer on to others.
 */
function rubyOf(el: Element, styles: Map<string, Element>, path: Set<Element> = new Set()): string | null {
  const own = attr(el, 'ruby');
  if (own) return own.trim();
  const refs = (attr(el, 'style') ?? '').trim().split(/\s+/).filter(Boolean);
  for (let i = refs.length - 1; i >= 0; i--) {
    const style = styles.get(refs[i] ?? '');
    if (!style || path.has(style)) continue;
    const role = rubyOf(style, styles, new Set(path).add(style));
    if (role) return role;
  }
  return null;
}

/** Whether xml:space="preserve" applies to `el`, from itself or an ancestor. */
function preserves(el: Element): boolean {
  for (let at: Element | null = el; at; at = at.parentElement) {
    const space = attr(at, 'space');
    if (space) return space === 'preserve';
  }
  return false;
}

/** The character before index `i`, whole even when it is a surrogate pair. */
function charBefore(s: string, i: number): string {
  return Array.from(s.slice(Math.max(0, i - 2), i)).pop() ?? '';
}

function charAt(s: string, i: number): string {
  const cp = s.codePointAt(i);
  return cp === undefined ? '' : String.fromCodePoint(cp);
}

/**
 * One line's whitespace, as TTML's default xml:space treats it: runs collapse
 * to a space, and a run carrying a line break — indentation from pretty-printed
 * XML — disappears entirely between two CJK characters.
 */
function collapse(line: string): string {
  return line
    .replace(/[ \t\r\n]+/g, (run: string, at: number, all: string) =>
      /[\r\n]/.test(run) && WIDE.test(charBefore(all, at)) && WIDE.test(charAt(all, at + run.length))
        ? ''
        : ' ',
    )
    .trim();
}

/** The words of a cue: ruby readings out, every <br> a line break, whitespace as rendered. */
function textOf(p: Element, styles: Map<string, Element>): string {
  const out: string[] = [];
  const walk = (node: Node, preserve: boolean): void => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === 3 || child.nodeType === 4) {
        // Text and CDATA. Under xml:space="preserve" a line feed is a line break.
        const t = child.nodeValue ?? '';
        out.push(preserve ? t.replace(/\r\n?|\n/g, BR) : t);
        continue;
      }
      if (child.nodeType !== 1) continue;
      const el = child as Element;
      const tag = tagOf(el);
      if (tag === 'br') {
        out.push(BR);
        continue;
      }
      if (SILENT.has(tag)) continue;
      const role = rubyOf(el, styles);
      if (role && ANNOTATION.has(role)) continue;
      const space = attr(el, 'space');
      walk(el, space ? space === 'preserve' : preserve);
    }
  };
  walk(p, preserves(p));

  return out
    .join('')
    .split(BR)
    .map(collapse)
    .filter(Boolean)
    .join('\n');
}

export function parseTtml(xml: string): Cue[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return [];

  const rates = ratesOf(doc.documentElement);
  const styles = stylesOf(doc);

  const cues: Cue[] = [];
  for (const p of Array.from(doc.querySelectorAll('p'))) {
    const span = interval(p, rates);
    if (!span) continue;
    const end = span.end ?? span.start + 4;
    if (end <= span.start) continue;

    const text = textOf(p, styles);
    if (!text) continue;

    cues.push({ start: span.start, end, text });
  }
  return cues.sort((a, b) => a.start - b.start);
}
