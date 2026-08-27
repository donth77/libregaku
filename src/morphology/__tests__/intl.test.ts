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

  it('drops punctuation and whitespace', () => {
    const toks = new IntlSegmenter('en').segment('hello, world!');
    expect(toks.map((t) => t.surface)).toEqual(['hello', 'world']);
  });
});
