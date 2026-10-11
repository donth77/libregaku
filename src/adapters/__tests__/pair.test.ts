import { describe, expect, it } from 'vitest';
import { mergeRepeats, pairCues } from '../pair';

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

  it('gives a translation two lines on screen together share to the one it covers most', () => {
    // Netflix, 27:25: a line, and 何？ shown beside it, under one English line.
    const out = pairCues(
      [c(1645, 1647, '不安定な生活のまま結婚していいのか——'), c(1646, 1647, '何？')],
      [c(1645, 1647, "I wasn't sure whether I should get married when my life was so unstable,")],
    );
    expect(out[0]?.secondary).toBe("I wasn't sure whether I should get married when my life was so unstable,");
    expect(out[1]?.secondary).toBeUndefined();
  });

  it('still gives both halves of a sentence the captions split in two the one translation', () => {
    const out = pairCues([c(10, 12, '今日は'), c(12, 14, 'いい天気ですね')], [c(10, 14, 'The weather is nice today.')]);
    expect(out.map((x) => x.secondary)).toEqual(['The weather is nice today.', 'The weather is nice today.']);
  });

  it('does not repeat a translation the track itself splits at a cut', () => {
    const out = pairCues([c(0, 4, '行こう')], [c(0, 2, "Let's go."), c(2, 4, "Let's go.")]);
    expect(out[0]?.secondary).toBe("Let's go.");
  });
});

describe('mergeRepeats', () => {
  it('makes one line of the same words split across a cut', () => {
    const out = mergeRepeats([c(1645, 1646, '不安定な'), c(1646, 1647, '不安定な'), c(1646, 1647, '何？')]);
    expect(out).toEqual([c(1645, 1647, '不安定な'), c(1646, 1647, '何？')]);
  });

  it('keeps a line said twice with a real pause between', () => {
    expect(mergeRepeats([c(0, 1, 'はい'), c(3, 4, 'はい')])).toHaveLength(2);
  });
});
