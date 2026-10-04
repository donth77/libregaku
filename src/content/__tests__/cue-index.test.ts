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

describe('moving between lines', () => {
  const track = new CueIndex([cue(1, 3), cue(4, 6), cue(8, 10)]);

  it('replays the line playing, or the one just heard', () => {
    expect(track.replay(5)).toBe(4);
    expect(track.replay(7)).toBe(4);
    expect(track.replay(9)).toBe(8);
    expect(track.replay(0)).toBeNull();
  });

  it('goes back to the line before the one playing', () => {
    expect(track.previous(5)).toBe(1);
    expect(track.previous(9)).toBe(4);
    // On the first line there is nothing earlier: it starts again.
    expect(track.previous(2)).toBe(1);
    expect(track.previous(0)).toBeNull();
  });

  it('between lines, goes back to the one just heard', () => {
    expect(track.previous(7)).toBe(4);
    expect(track.previous(11)).toBe(8);
  });

  it('goes on to the next line, and nowhere after the last', () => {
    expect(track.next(0)).toBe(1);
    expect(track.next(2)).toBe(4);
    expect(track.next(7)).toBe(8);
    expect(track.next(9)).toBeNull();
  });

  it('counts a seek that landed just short of a line as being at it', () => {
    // Asked for 4, landed at 3.9: the next press must move on, not stay put.
    expect(track.next(3.9)).toBe(8);
    expect(track.previous(3.9)).toBe(1);
    expect(track.replay(3.9)).toBe(4);
  });

  it('steps back past a line two speakers start together', () => {
    const both = new CueIndex([cue(1, 3), cue(5, 8, 'upper'), cue(5, 8, 'lower'), cue(9, 10)]);
    expect(both.previous(6)).toBe(1);
    expect(both.next(6)).toBe(9);
    expect(both.replay(6)).toBe(5);
  });

  it('moves through the lines inside a long one', () => {
    const sign = new CueIndex([cue(10, 20), cue(11, 12), cue(13, 14)]);
    expect(sign.next(10.5)).toBe(11);
    expect(sign.previous(11.5)).toBe(10);
    expect(sign.next(11.5)).toBe(13);
  });

  it('has nowhere to go in an empty track', () => {
    const none = new CueIndex([]);
    expect(none.replay(1)).toBeNull();
    expect(none.previous(1)).toBeNull();
    expect(none.next(1)).toBeNull();
  });
});
