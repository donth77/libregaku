import { analyse, LineCache } from './analyser';
import type { MergedToken } from './merge';
import { place } from './place';
import type { RubySegment, Segmenter, Token } from './types';

/**
 * Chinese, from the analyser in the offscreen document.
 *
 * The analyser splits the line into dictionary words and the dictionary
 * gives each its reading. Chinese does not inflect, so the word as written is
 * the word to look up and the word a card is made for.
 */

/** A word as the offscreen document reports it: the text, and its pinyin where the dictionary has it. */
export interface ZhWord {
  surface: string;
  /** Pinyin with tone marks, a space between syllables: xué xiào. */
  reading?: string;
}

const HAN = /\p{sc=Han}/u;

/**
 * The analyser's words as tokens on the line.
 *
 * Only a word written in Chinese characters is a word to learn: subtitles
 * carry names in Latin letters and numbers in digits, and those are not
 * vocabulary. Spaces are kept, because Chinese subtitles use them where
 * prose would use a comma.
 */
export function zhTokens(text: string, words: ZhWord[]): Token[] {
  const merged: MergedToken[] = words.map((w) => {
    const word = HAN.test(w.surface);
    return {
      surface: w.surface,
      lemma: word ? w.surface : undefined,
      reading: word ? w.reading : undefined,
      parts: [],
      inflections: [],
      content: word,
      lemmaReading: word ? w.reading : undefined,
      lookup: word ? [{ key: w.surface, reading: w.reading }] : [],
    };
  });
  return place(text, merged, { gaps: true });
}

/**
 * Pinyin over the characters it reads: one syllable to each.
 *
 * The dictionary writes a word's reading as its syllables with spaces
 * between, one for each character, so the two line up by counting. When the
 * counts differ — a reading for a phrase put together from its words, a
 * headword with a letter in it — the reading goes over the whole word rather
 * than over the wrong characters.
 */
export function zhRuby(surface: string, reading?: string): RubySegment[] {
  const syllables = reading?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!syllables.length) return [{ text: surface }];
  const chars = Array.from(surface);
  const han = chars.filter((c) => HAN.test(c)).length;
  if (!han) return [{ text: surface }];
  // A syllable for every character, or one for each Chinese character only.
  const each = syllables.length === chars.length;
  if (!each && syllables.length !== han) return [{ text: surface, ruby: syllables.join(' ') }];

  const out: RubySegment[] = [];
  let next = 0;
  for (const c of chars) {
    if (!HAN.test(c)) {
      if (each) next++;
      const last = out[out.length - 1];
      // Letters and marks inside a word run together as plain text.
      if (last && !last.ruby) last.text += c;
      else out.push({ text: c });
      continue;
    }
    out.push({ text: c, ruby: syllables[next++] });
  }
  return out;
}

export class ChineseSegmenter implements Segmenter {
  readonly tier = 2 as const;
  readonly hasLemma = true;

  readonly #cache = new LineCache();

  async segment(text: string): Promise<Token[]> {
    const hit = this.#cache.get(text);
    if (hit) return hit;
    const res = await analyse<ZhWord>(text);
    const tokens = zhTokens(text, res.tokens);
    // Words read before the dictionary was in have no pinyin; keep them for
    // this call only, so the line gains its readings once it is.
    if (res.complete !== false) this.#cache.set(text, tokens);
    return tokens;
  }

  ruby(surface: string, reading?: string): RubySegment[] {
    return zhRuby(surface, reading);
  }
}
