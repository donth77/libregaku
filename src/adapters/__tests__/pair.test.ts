import { describe, expect, it } from 'vitest';
import { pairCues } from '../pair';

const c = (start: number, end: number, text: string) => ({ start, end, text });

describe('pairCues', () => {
  it('attaches the overlapping native line', () => {
    const out = pairCues([c(1, 3, '彼女は')], [c(0.8, 3.2, 'She is')]);
    expect(out[0]?.secondary).toBe('She is');
  });

  it('joins two secondary cues spanned by one primary', () => {
    const out = pairCues([c(0, 6, '長い行')], [c(0, 3, 'first'), c(3, 6, 'second')]);
    expect(out[0]?.secondary).toBe('first second');
  });

  it('leaves a cue alone when nothing overlaps', () => {
    const out = pairCues([c(10, 12, 'x')], [c(0, 1, 'y')]);
    expect(out[0]?.secondary).toBeUndefined();
  });

  it('ignores a shared edge, which is not real overlap', () => {
    const out = pairCues([c(2, 4, 'x')], [c(0, 2, 'before'), c(4, 6, 'after')]);
    expect(out[0]?.secondary).toBeUndefined();
  });

  it('applies a timing offset to the primary track', () => {
    const out = pairCues([c(0, 2, 'x')], [c(5, 7, 'shifted')], 5);
    expect(out[0]?.secondary).toBe('shifted');
  });

  it('returns the primary untouched when there is no secondary track', () => {
    const primary = [c(1, 2, 'x')];
    expect(pairCues(primary, [])).toBe(primary);
  });

  it('handles unsorted secondary input', () => {
    const out = pairCues([c(0, 10, 'x')], [c(6, 8, 'b'), c(1, 3, 'a')]);
    expect(out[0]?.secondary).toBe('a b');
  });
});
