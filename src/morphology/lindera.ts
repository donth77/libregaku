import { furigana } from './furigana';
import { mergeMorphemes, type Morpheme } from './merge';
import type { Segmenter, Token } from './types';

/**
 * Tier 2 — real morphological analysis.
 *
 * The analyser itself runs in the offscreen document; this is the client side.
 * Tokenising is async and subtitles change on a frame timer, so results are
 * cached per cue text — the same line is never analysed twice.
 */

type Analysed = Morpheme;

export class LinderaSegmenter implements Segmenter {
  readonly tier = 2 as const;
  readonly hasLemma = true;

  readonly #cache = new Map<string, Token[]>();

  static async ensure(dict = 'ipadic'): Promise<{ ok: boolean; error?: string }> {
    await chrome.runtime.sendMessage({ type: 'ensure-offscreen' });
    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'load',
      dict,
    })) as { ok?: boolean; error?: string } | undefined;
    return { ok: Boolean(res?.ok), error: res?.error };
  }

  static async status(): Promise<{ ready: boolean; phase: string; percent: number; error: string | null }> {
    const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'status' })) as
      | { ready: boolean; phase: string; percent: number; error: string | null }
      | undefined;
    return res ?? { ready: false, phase: 'unavailable', percent: 0, error: null };
  }

  async segment(text: string): Promise<Token[]> {
    const hit = this.#cache.get(text);
    if (hit) return hit;

    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'tokenize',
      text,
    })) as { ok?: boolean; tokens?: Analysed[]; error?: string } | undefined;

    if (!res?.ok || !res.tokens) throw new Error(res?.error ?? 'tokenizer unavailable');

    const out = toTokens(text, res.tokens);
    // Bounded: a long film is a few thousand lines, and they are short.
    if (this.#cache.size > 4000) this.#cache.clear();
    this.#cache.set(text, out);
    return out;
  }
}

/**
 * Merge morphemes into words, then locate each in the original text.
 *
 * Lindera reports byte offsets; the DOM needs UTF-16 ones. Rather than convert,
 * walk the text and find each surface in order — which also survives the
 * analyser normalising a character away.
 */
export function toTokens(text: string, analysed: Analysed[]): Token[] {
  const merged = mergeMorphemes(analysed);
  const out: Token[] = [];
  let cursor = 0;

  for (const t of merged) {
    if (!t.surface) continue;
    const at = text.indexOf(t.surface, cursor);
    if (at < 0) continue;   // normalised; skip rather than misalign the rest
    cursor = at + t.surface.length;

    out.push({
      surface: t.surface,
      start: at,
      end: cursor,
      lemma: t.lemma,
      reading: t.reading,
      pos: t.pos,
      content: t.content,
      // IPADIC files punctuation under 記号.
      punct: t.pos === '記号',
      parts: t.parts.length > 1 ? t.parts : undefined,
      inflections: t.inflections.length ? t.inflections : undefined,
    });
  }
  return out;
}

/** Ruby segments for a token, for the renderer. */
export function rubyFor(token: Token): ReturnType<typeof furigana> {
  return furigana(token.surface, token.reading);
}
