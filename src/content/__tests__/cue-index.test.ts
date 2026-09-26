import { describe, expect, it } from 'vitest';
import { CueIndex } from '../cue-index';

const cue = (start: number, end: number, text = `${start}-${end}`) => ({ start, end, text });

describe('CueIndex', () => {
  it('finds the one cue covering a moment in an ordinary track', () => {
    const index = new CueIndex([cue(0, 2), cue(2.5, 4), cue(5, 7)]);
    expect(index.at(1)).toEqual([0]);
    expect(index.at(3)).toEqual([1]);
    expect(index.at(4.5)).toEqual([]);
    expect(index.at(99)).toEqual([]);
    expect(index.at(-1)).toEqual([]);
  });

  it('keeps a long cue on screen through shorter ones that start inside it', () => {
    // A sign held for ten seconds while three lines of dialogue pass under it.
    // The old binary search lost the sign at 12.5, 14.5, 17 and 19.
    const index = new CueIndex([cue(10, 20), cue(11, 12), cue(13, 14), cue(15, 16)]);
    expect(index.at(10.5)).toEqual([0]);
    expect(index.at(11.5)).toEqual([0, 1]);
    expect(index.at(12.5)).toEqual([0]);
    expect(index.at(14.5)).toEqual([0]);
    expect(index.at(15.5)).toEqual([0, 3]);
    expect(index.at(17)).toEqual([0]);
    expect(index.at(19)).toEqual([0]);
    expect(index.at(21)).toEqual([]);
  });

  it('returns both of two cues with the same times', () => {
    const index = new CueIndex([cue(5, 8, 'upper speaker'), cue(5, 8, 'lower speaker')]);
    expect(index.at(6)).toEqual([0, 1]);
  });

  it('treats both ends of a cue as inside it', () => {
    const index = new CueIndex([cue(1, 2), cue(2, 3)]);
    expect(index.at(1)).toEqual([0]);
    expect(index.at(2)).toEqual([0, 1]);
    expect(index.at(3)).toEqual([1]);
  });

  it('handles an empty track', () => {
    expect(new CueIndex([]).at(0)).toEqual([]);
  });
});
