import { describe, expect, it } from 'vitest';
import { parseJson3 } from '../youtube';

describe('parseJson3', () => {
  it('converts events to cues in seconds', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 1500, dDurationMs: 2000, segs: [{ utf8: '彼女は' }, { utf8: '日本語を' }] },
      ],
    });
    expect(cues).toEqual([{ start: 1.5, end: 3.5, text: '彼女は日本語を' }]);
  });

  it('drops empty and whitespace-only events', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: '\n' }] },
        { tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: '   ' }] },
        { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: 'ok' }] },
      ],
    });
    expect(cues).toHaveLength(1);
    expect(cues[0]?.text).toBe('ok');
  });

  it('skips events with no start time, and sorts by start', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 5000, dDurationMs: 1000, segs: [{ utf8: 'second' }] },
        { dDurationMs: 1000, segs: [{ utf8: 'no start' }] },
        { tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: 'first' }] },
      ],
    });
    expect(cues.map((c) => c.text)).toEqual(['first', 'second']);
  });

  it('defaults a missing duration rather than producing NaN', () => {
    const cues = parseJson3({ events: [{ tStartMs: 0, segs: [{ utf8: 'x' }] }] });
    expect(cues[0]?.end).toBeGreaterThan(0);
    expect(Number.isFinite(cues[0]?.end)).toBe(true);
  });

  it('tolerates a missing events array', () => {
    expect(parseJson3({})).toEqual([]);
  });
});
