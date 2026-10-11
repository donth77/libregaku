import type { MergedToken } from './merge';
import type { Token } from './types';

/**
 * From an analyser's words to tokens on the line, for every language the
 * analyser reads: the stretches a line writes without a space, and where each
 * merged word stands in the text.
 */

/**
 * Nothing but punctuation, symbols, spaces or a long-vowel mark: never a word,
 * whatever the analyser called it. IPADIC's pass over characters it has no
 * entry for groups ？ with the space after it, and reads ～ and ? on their
 * own, as nouns — which underlined them as new words.
 */
export const MARKS_ONLY = /^[\p{P}\p{S}\p{Z}\sー]+$/u;

/**
 * The morphemes in the stretches a line writes without a space.
 *
 * The analyser drops spaces, so ありがとう ございます comes back as if it
 * were written together. A word merged across the space was then nowhere in
 * the line, and placing left it out — the whole phrase went missing. A space
 * the subtitle put there is a boundary, and merging stays inside it.
 */
export function runsOf<M extends { surface: string }>(text: string, analysed: M[]): M[][] {
  const runs: M[][] = [];
  let run: M[] = [];
  let cursor = 0;
  for (const m of analysed) {
    const at = m.surface ? text.indexOf(m.surface, cursor) : -1;
    if (at >= 0) {
      if (run.length && /\s/.test(text.slice(cursor, at))) {
        runs.push(run);
        run = [];
      }
      cursor = at + m.surface.length;
    }
    run.push(m);
  }
  if (run.length) runs.push(run);
  return runs;
}

export interface Placing {
  /** Whether a merged word is punctuation, beyond being nothing but marks. */
  isPunct?: (t: MergedToken) => boolean;
  /**
   * Keep what stands between the words — the spaces — as text of its own.
   * A language written with spaces needs them drawn; Japanese leaves them out,
   * as it always has.
   */
  gaps?: boolean;
}

/**
 * Locate each merged word in the original text.
 *
 * Lindera reports byte offsets; the DOM needs UTF-16 ones. Rather than convert,
 * walk the text and find each surface in order — which also survives the
 * analyser normalising a character away.
 */
export function place(text: string, merged: MergedToken[], how: Placing = {}): Token[] {
  const out: Token[] = [];
  let cursor = 0;
  const gap = (to: number): void => {
    if (how.gaps && to > cursor) out.push({ surface: text.slice(cursor, to), start: cursor, end: to, punct: true });
  };

  for (const t of merged) {
    if (!t.surface) continue;
    const at = text.indexOf(t.surface, cursor);
    if (at < 0) continue;   // normalised; skip rather than misalign the rest
    gap(at);
    cursor = at + t.surface.length;

    const punct = Boolean(how.isPunct?.(t)) || MARKS_ONLY.test(t.surface);
    out.push({
      surface: t.surface,
      start: at,
      end: cursor,
      lemma: t.lemma,
      reading: t.reading,
      pos: t.pos,
      content: t.content && !punct,
      punct,
      parts: t.parts.length > 1 ? t.parts : undefined,
      inflections: t.inflections.length ? t.inflections : undefined,
      lemmaReading: t.lemmaReading,
      lookup: t.lookup.length ? t.lookup : undefined,
      ...(t.name ? { name: true } : {}),
    });
  }
  gap(text.length);
  return out;
}
