import { describe, expect, it } from 'vitest';
import { EDGE, FREE, SHUT, roomFor, sidesOf, type Drawn } from '../ruby-room';

/** The width of one reading character, in em of the text below, used throughout these. */
const UNIT = 0.48;

describe('roomFor', () => {
  it('asks for nothing when the reading fits', () => {
    expect(roomFor('予約', 'よやく', FREE, FREE, UNIT)).toBeNull();
    expect(roomFor('前', 'まえ', SHUT, SHUT, UNIT)).toBeNull();
  });

  it('lets a reading hang over kana on both sides, at no cost', () => {
    // わたし over 私, between kana: .44em too wide, .22em each way.
    expect(roomFor('私', 'わたし', FREE, FREE, UNIT)).toEqual({ left: 0, right: 0, lean: 0 });
    // At the start of a line too: a little of it hangs into the line's padding.
    expect(roomFor('私', 'わたし', EDGE, FREE, UNIT)).toEqual({ left: 0, right: 0, lean: 0 });
  });

  it('leans away from a neighbour that has a reading, and keeps a gap from it', () => {
    // 男 before 女: nothing may hang to the right, so it all goes left, and a hair more.
    const man = roomFor('男', 'おとこ', FREE, SHUT, UNIT)!;
    expect(man.left).toBe(0);
    expect(man.right).toBeCloseTo(0.04, 3);
    expect(man.lean).toBeCloseTo(-0.26, 3);
    const woman = roomFor('女', 'おんな', SHUT, FREE, UNIT)!;
    expect(woman.left).toBeCloseTo(0.04, 3);
    expect(woman.right).toBe(0);
    expect(woman.lean).toBeCloseTo(0.26, 3);
  });

  it('gives a long reading only the room that cannot hang over, on the side that needs it', () => {
    // うけたまわ over 承: 1.4em too wide. After 約, which has a reading; before り, which has none.
    const room = roomFor('承', 'うけたまわ', SHUT, FREE, UNIT)!;
    expect(room.left).toBeCloseTo(0.76, 3);
    expect(room.right).toBeCloseTo(0.24, 3);
    // The reading's middle is over the character's: the box's middle moved, the reading with it.
    expect(room.lean).toBeCloseTo((room.left - room.right) / 2, 3);
    // Between kana on both sides it needs less, evenly.
    expect(roomFor('承', 'うけたまわ', FREE, FREE, UNIT)).toEqual({ left: 0.24, right: 0.24, lean: 0 });
    // Shut in on both sides, it needs it all, and the gaps.
    expect(roomFor('承', 'うけたまわ', SHUT, SHUT, UNIT)).toEqual({ left: 0.76, right: 0.76, lean: 0 });
  });

  it('accounts for every part of the reading: room and overhang add up to its width', () => {
    for (const reading of ['あいう', 'あいうえ', 'あいうえお', 'あいうえおか']) {
      for (const before of [FREE, EDGE, SHUT]) {
        for (const after of [FREE, EDGE, SHUT]) {
          const room = roomFor('字', reading, before, after, UNIT)!;
          const excess = [...reading].length * UNIT - 1;
          expect(room.left).toBeGreaterThanOrEqual(0);
          expect(room.right).toBeGreaterThanOrEqual(0);
          // From the box's middle, the reading reaches half its width each way, moved by the lean.
          const box = 1 + room.left + room.right;
          const overLeft = (1 + excess) / 2 - room.lean - box / 2;
          const overRight = (1 + excess) / 2 + room.lean - box / 2;
          expect(overLeft).toBeLessThanOrEqual(before + 0.002);
          expect(overRight).toBeLessThanOrEqual(after + 0.002);
        }
      }
    }
  });
});

describe('sidesOf', () => {
  const plain = (text: string) => [{ text }];
  const read = (text: string, ruby: string) => [{ text, ruby }];

  it('is free beside kana and marks, shut beside a reading', () => {
    const line: Drawn[] = [plain('はい'), 'mark', [{ text: 'ご' }, { text: '予約', ruby: 'よやく' }], [{ text: '承', ruby: 'うけたまわ' }, { text: 'りました' }]];
    // 予約: after the ご of its own word, before 承, which has a reading.
    expect(sidesOf(line, 2, 1)).toEqual([FREE, SHUT]);
    // 承: after 予約, which has a reading; before its own りました.
    expect(sidesOf(line, 3, 0)).toEqual([SHUT, FREE]);
  });

  it('allows a little at either end of a line, and at a break in it', () => {
    const line: Drawn[] = [read('私', 'わたし'), plain('は'), 'break', read('頭', 'あたま')];
    expect(sidesOf(line, 0, 0)).toEqual([EDGE, FREE]);
    expect(sidesOf(line, 3, 0)).toEqual([EDGE, EDGE]);
  });

  it('is free beside a mark', () => {
    const line: Drawn[] = [plain('え'), 'mark', read('何', 'なに'), 'mark'];
    expect(sidesOf(line, 2, 0)).toEqual([FREE, FREE]);
  });
});
