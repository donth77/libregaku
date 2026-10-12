import { describe, expect, it } from 'vitest';
import { cueKey, fitClock, fitLine, pairsFrom, type Pair, type Timed } from '../apple-clock';

/** A film's subtitle cues: one line every 4 s, each different. */
function cuesOver(seconds: number): Timed[] {
  const out: Timed[] = [];
  for (let i = 0; i * 4 < seconds; i++) out.push({ text: `line ${i}`, start: i * 4 + 1 });
  return out;
}

/** What the player shows for each file cue, on its own clock. */
const player = (file: Timed[], a: number, b: number): Timed[] => file.map((c) => ({ text: c.text, start: a * c.start + b }));

describe('cueKey', () => {
  it('ignores tags, case and spacing', () => {
    expect(cueKey('<c.styledotEAC118>Hello   World</c>')).toBe('hello world');
    expect(cueKey('  아부지가\n지더러 ')).toBe('아부지가 지더러');
  });
});

describe('pairsFrom', () => {
  it('finds the offset without a clock, from the most common difference', () => {
    const file = cuesOver(600);
    const shown = player(file.slice(10, 40), 1, 58).map((c) => ({ ...c, start: c.start }));
    const pairs = pairsFrom(shown, file, null);
    expect(pairs.length).toBe(30);
    for (const p of pairs) expect(p.player - p.file).toBeCloseTo(58, 5);
  });

  it('matches a repeated line to the cue nearest its predicted time', () => {
    const file: Timed[] = [
      { text: 'Yes.', start: 100 },
      { text: 'Yes.', start: 400 },
    ];
    const shown: Timed[] = [{ text: 'Yes.', start: 158 }];
    const pairs = pairsFrom(shown, file, null);
    expect(pairs).toEqual([{ file: 100, player: 158 }]);
  });

  it('uses a clock once there is one, and drops cues it cannot place', () => {
    const file = cuesOver(200);
    const clock = { a: 1, b: 58 };
    const shown = player(file.slice(0, 5), 1, 58);
    shown.push({ text: 'line 9', start: 999 });
    const pairs = pairsFrom(shown, file, clock);
    expect(pairs.length).toBe(5);
  });
});

describe('fitClock', () => {
  it('recovers a drifting clock across a whole film', () => {
    const file = cuesOver(3000);
    const shown = player(file, 0.99778, 58.3);
    const pairs: Pair[] = shown.map((p, i) => ({ file: file[i]!.start, player: p.start }));
    const clock = fitClock(pairs);
    expect(clock).not.toBeNull();
    expect(clock!.a).toBeCloseTo(0.99778, 4);
    expect(clock!.b).toBeCloseTo(58.3, 1);
  });

  it('keeps the rate at one over a short span', () => {
    const file = cuesOver(120);
    const pairs: Pair[] = player(file, 1, 58.06).map((p, i) => ({ file: file[i]!.start, player: p.start }));
    const clock = fitClock(pairs);
    expect(clock).toEqual({ a: 1, b: expect.any(Number) });
    expect(clock!.b).toBeCloseTo(58.06, 2);
  });

  it('ignores pairs that disagree with the rest', () => {
    const file = cuesOver(600);
    const pairs: Pair[] = player(file, 1, 58).map((p, i) => ({ file: file[i]!.start, player: p.start }));
    pairs.push({ file: 100, player: 900 }, { file: 300, player: 20 });
    const clock = fitClock(pairs);
    expect(clock!.b).toBeCloseTo(58, 2);
  });

  it('refuses to fit too few pairs', () => {
    expect(fitClock([{ file: 1, player: 59 }])).toBeNull();
  });
});

describe('fitLine', () => {
  it('is exact for points on a line', () => {
    const line = fitLine([
      { file: 0, player: 5 },
      { file: 10, player: 25 },
    ]);
    expect(line.a).toBeCloseTo(2, 10);
    expect(line.b).toBeCloseTo(5, 10);
  });
});
