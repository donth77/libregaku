/**
 * The seam that keeps every language out of the renderer.
 *
 * Tier 0 (`Intl.Segmenter`) covers every language for zero bytes but yields
 * boundaries only. Tier 2 (lindera) adds `lemma` and `reading`. Nothing above
 * this file may branch on language — if it needs to, the seam is wrong.
 */

export interface Token {
  surface: string;
  /** UTF-16 offset into the cue text. */
  start: number;
  end: number;
  /** Dictionary form. Tier 2 only — this is the key matched against Anki. */
  lemma?: string;
  /** Reading for furigana / romanization. Tier 2 only. */
  reading?: string;
  pos?: string;
  /** A name the analyser knows as one (Korean 크레이머): no dictionary lists these, and the card says so where a lookup finds nothing. */
  properName?: boolean;
  /** True when the token is a content word worth looking up. */
  content?: boolean;
  /** Morphemes this token was merged from — 来た is ["来", "た"]. */
  parts?: string[];
  /**
   * A word made of two the dictionary has but not the whole: the dictionary's
   * word for each part, the last being what the whole is a kind of. Riesenschlange
   * is [Riese, Schlange], and `parts` the two as they are written.
   */
  compound?: string[];
  /**
   * A word that may be a word with a suffix on it: 한국식 is 한국 and -식. Tried only when the word itself has no
   * entry, as the dictionary's words for the parts, the suffix last.
   */
  derived?: string[];
  /** What the endings do — "conditional", "polite", "past". */
  inflections?: string[];
  /** Reading of `lemma`, when the analysis pins it down. Tier 2 only. */
  lemmaReading?: string;
  /**
   * How to look this token up: dictionary keys, best first, each carrying
   * what the analyser knows to tell homographs apart. Opaque above the
   * dictionary client — pass the token to `lookupToken`, never read this.
   * Tier 2 only; without it a lookup uses `lemma`, then `surface`.
   */
  lookup?: Array<{ key: string; reading?: string; pos?: string }>;
  /**
   * Punctuation and whitespace. Rendered so the line reads correctly, but
   * never interactive — nobody looks up a question mark.
   */
  punct?: boolean;
  /** A person's name that is also a word (未来ちゃん): read as a guess, and not counted as vocabulary. */
  name?: boolean;
}

/** A stretch of a word, and the reading drawn above it. */
export interface RubySegment {
  text: string;
  /** Absent when the stretch needs no annotation. */
  ruby?: string;
}

export interface Segmenter {
  readonly tier: 0 | 1 | 2;
  /** Whether this segmenter can supply `lemma`. The UI must say when it can't. */
  readonly hasLemma: boolean;
  segment(text: string): Token[] | Promise<Token[]>;
  /**
   * A word in pieces, each with the reading that goes above it: kana over
   * kanji, a syllable of pinyin over each character. One bare piece where the
   * language draws nothing above its words. What draws a line asks this, so
   * it never has to know which language it is drawing.
   */
  ruby(surface: string, reading?: string): RubySegment[];
}
