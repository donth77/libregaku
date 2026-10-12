import { describe, expect, it } from 'vitest';
import { cueKey, fitOffset, pairsFrom, type Pair, type Timed } from '../apple-clock';

/** A film's subtitle cues: one line every 4 s, each different. */
function cuesOver(seconds: number): Timed[] {
  const out: Timed[] = [];
  for (let i = 0; i * 4 < seconds; i++) out.push({ text: `line ${i}`, start: i * 4 + 1 });
  return out;
}

/** What the player shows for each file cue: the file's time plus the session's offset. */
const player = (file: Timed[], offset: number): Timed[] => file.map((c) => ({ text: c.text, start: c.start + offset }));

describe('cueKey', () => {
  it('ignores tags, case and spacing', () => {
    expect(cueKey('<c.styledotEAC118>Hello   World</c>')).toBe('hello world');
    expect(cueKey('  아부지가\n지더러 ')).toBe('아부지가 지더러');
  });
});

describe('pairsFrom', () => {
  it('finds the offset without one, from the most common difference', () => {
    const file = cuesOver(600);
    const shown = player(file.slice(10, 40), 58.058);
    const pairs = pairsFrom(shown, file, null);
    expect(pairs.length).toBe(30);
    for (const p of pairs) expect(p.player - p.file).toBeCloseTo(58.058, 5);
  });

  it('matches a repeated line to the cue nearest its predicted time', () => {
    const file: Timed[] = [
      { text: 'Yes.', start: 100 },
      { text: 'Yes.', start: 400 },
    ];
    const shown: Timed[] = [{ text: 'Yes.', start: 158 }];
    expect(pairsFrom(shown, file, null)).toEqual([{ file: 100, player: 158 }]);
  });

  it('uses the offset once there is one, and drops cues it cannot place', () => {
    const file = cuesOver(200);
    const shown = player(file.slice(0, 5), 58);
    shown.push({ text: 'line 9', start: 999 });
    expect(pairsFrom(shown, file, 58).length).toBe(5);
  });
});

describe('fitOffset', () => {
  it('recovers the offset a session shares', () => {
    const file = cuesOver(600);
    const pairs: Pair[] = player(file, 56.473).map((p, i) => ({ file: file[i]!.start, player: p.start }));
    expect(fitOffset(pairs)).toBeCloseTo(56.473, 6);
  });

  it('ignores pairs that disagree with the rest', () => {
    const file = cuesOver(600);
    const pairs: Pair[] = player(file, 58).map((p, i) => ({ file: file[i]!.start, player: p.start }));
    pairs.push({ file: 100, player: 900 }, { file: 300, player: 20 });
    expect(fitOffset(pairs)).toBeCloseTo(58, 6);
  });

  it('refuses to decide from too few pairs', () => {
    expect(fitOffset([{ file: 1, player: 59 }])).toBeNull();
  });
});
