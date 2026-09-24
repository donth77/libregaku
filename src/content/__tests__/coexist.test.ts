import { describe, expect, it } from 'vitest';
import { DEFAULT_BOTTOM, bottomOffset } from '../coexist';

describe('bottomOffset', () => {
  it('uses the default when nothing else is on screen', () => {
    expect(bottomOffset([])).toBe(DEFAULT_BOTTOM);
  });

  it('rises above a line occupying the bottom', () => {
    // Someone from 78%–90% down: we sit just above 78%.
    const off = bottomOffset([[0.78, 0.9]]);
    expect(off).toBeGreaterThan(DEFAULT_BOTTOM);
    expect(off).toBeCloseTo(24, 0);   // 22% up to clear it, plus the gap
  });

  it('never rises into the upper half, however tall the other line is', () => {
    expect(bottomOffset([[0.1, 0.95]])).toBeLessThanOrEqual(42);
  });

  it('ignores lines in the upper half — they are not competing for our space', () => {
    expect(bottomOffset([[0.05, 0.2]])).toBe(DEFAULT_BOTTOM);
  });

  it('stacks above the highest of several lower lines', () => {
    const off = bottomOffset([[0.85, 0.95], [0.7, 0.8]]);
    expect(off).toBeCloseTo(32, 0);
  });

  it('never drops below the default', () => {
    expect(bottomOffset([[0.95, 0.99]])).toBeGreaterThanOrEqual(DEFAULT_BOTTOM);
  });
});

import { mergeBands } from '../coexist';

describe('mergeBands', () => {
  it('joins the two lines of one subtitle block', () => {
    expect(mergeBands([[0.78, 0.84], [0.85, 0.91]])).toEqual([[0.78, 0.91]]);
  });

  it('keeps genuinely separate blocks apart', () => {
    expect(mergeBands([[0.10, 0.18], [0.80, 0.90]])).toEqual([[0.10, 0.18], [0.80, 0.90]]);
  });

  it('is order independent', () => {
    expect(mergeBands([[0.85, 0.91], [0.78, 0.84]])).toEqual([[0.78, 0.91]]);
  });
});

describe('bottomOffset with a merged two-line block', () => {
  it('clears the whole block, not just its lower line', () => {
    // Two stacked lines from 78% to 91%: we must sit above 78%, not 85%.
    expect(bottomOffset([[0.78, 0.84], [0.85, 0.91]])).toBeCloseTo(24, 0);
  });
});

describe('bottomOffset ignores container-shaped bands', () => {
  it('is not fooled by a full-player wrapper', () => {
    // .nflxmultisubs-primary-wrapper measures as the entire frame.
    expect(bottomOffset([[0, 1]])).toBe(DEFAULT_BOTTOM);
  });

  it('still clears a real line when a wrapper is also present', () => {
    expect(bottomOffset([[0, 1], [0.82, 0.9]])).toBeCloseTo(20, 0);
  });

  it('rejects anything taller than a subtitle block could be', () => {
    expect(bottomOffset([[0.4, 0.95]])).toBe(DEFAULT_BOTTOM);
  });

  it('sits just above a normal one-line subtitle', () => {
    // A line from 86%–92% down: ~16% up, not halfway up the video.
    const off = bottomOffset([[0.86, 0.92]]);
    expect(off).toBeGreaterThan(DEFAULT_BOTTOM);
    expect(off).toBeLessThan(20);
  });
});

describe('bottomOffset with a chosen floor', () => {
  it('sits at the floor when nothing else is on screen', () => {
    expect(bottomOffset([], 25)).toBe(25);
  });

  it('a low floor still rises above another line', () => {
    expect(bottomOffset([[0.78, 0.9]], 4)).toBeCloseTo(24, 0);
  });

  it('a high floor wins over a line it already clears', () => {
    expect(bottomOffset([[0.86, 0.92]], 25)).toBe(25);
  });

  it('never sinks below the floor, even against the ceiling', () => {
    expect(bottomOffset([[0.6, 0.7]], 33)).toBeGreaterThanOrEqual(33);
    expect(bottomOffset([[0.5, 0.7]], 33)).toBeGreaterThanOrEqual(33);
  });
});
