import { describe, expect, it } from 'vitest';
import { IntlSegmenter } from '../intl';

describe('IntlSegmenter', () => {
  it('reports tier 0 and no lemma, so the UI can say so', () => {
    const s = new IntlSegmenter('ja');
    expect(s.tier).toBe(0);
    expect(s.hasLemma).toBe(false);
  });

  it('segments Japanese without spaces', () => {
    const toks = new IntlSegmenter('ja').segment('彼女は日本語を勉強している');
    expect(toks.length).toBeGreaterThan(3);
    expect(toks.map((t) => t.surface).join('')).toContain('日本語');
  });

  it('returns offsets that index back into the source text', () => {
    const text = '彼女は日本語を勉強している';
    for (const t of new IntlSegmenter('ja').segment(text)) {
      expect(text.slice(t.start, t.end)).toBe(t.surface);
    }
  });

  it('marks punctuation and whitespace rather than dropping them', () => {
    // Dropping them loses the text: "え？ はい" rendered as "えはい".
    const toks = new IntlSegmenter('en').segment('hello, world!');
    expect(toks.filter((t) => t.content).map((t) => t.surface)).toEqual(['hello', 'world']);
    expect(toks.map((t) => t.surface).join('')).toBe('hello, world!');
  });
});

describe('IntlSegmenter punctuation', () => {
  it('keeps punctuation so the line still reads as written', () => {
    const toks = new IntlSegmenter('ja').segment('え？ はい');
    expect(toks.map((t) => t.surface).join('')).toBe('え？ はい');
  });

  it('marks punctuation and whitespace as non-interactive', () => {
    const toks = new IntlSegmenter('ja').segment('え？ はい');
    const punct = toks.filter((t) => t.punct).map((t) => t.surface);
    expect(punct).toContain('？');
    expect(toks.find((t) => t.surface === 'え')?.punct).toBeFalsy();
  });

  it('preserves spaces for space-delimited languages', () => {
    const toks = new IntlSegmenter('en').segment('hello, world!');
    expect(toks.map((t) => t.surface).join('')).toBe('hello, world!');
  });
});
