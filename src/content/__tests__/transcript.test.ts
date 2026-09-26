import { describe, expect, it } from 'vitest';
import { Transcript } from '../transcript';

describe('Transcript', () => {
  it('starts empty and accumulating', () => {
    const t = new Transcript();
    expect(t.mode).toBe('accumulating');
    expect(t.lines).toHaveLength(0);
  });

  it('records observed lines and reports as accumulating', () => {
    const t = new Transcript();
    t.observe('彼女は', 1);
    t.observe('日本語を', 5);
    expect(t.lines.map((l) => l.text)).toEqual(['彼女は', '日本語を']);
    expect(t.mode).toBe('accumulating');
  });

  it('deduplicates a line the player re-renders while it is displayed', () => {
    const t = new Transcript();
    t.observe('同じ', 1);
    t.observe('同じ', 1.2);
    t.observe('同じ', 1.4);
    expect(t.lines).toHaveLength(1);
  });

  it('keeps lines in time order when the viewer seeks backwards', () => {
    const t = new Transcript();
    t.observe('later', 30);
    t.observe('earlier', 10);
    expect(t.lines.map((l) => l.text)).toEqual(['earlier', 'later']);
  });

  it('a full track replaces anything accumulated and switches mode', () => {
    const t = new Transcript();
    t.observe('partial', 5);
    t.setFull([{ start: 0, end: 2, text: 'a' }, { start: 2, end: 4, text: 'b' }]);
    expect(t.mode).toBe('full');
    expect(t.lines.map((l) => l.text)).toEqual(['a', 'b']);
  });

  it('ignores observations once a full track is loaded', () => {
    const t = new Transcript();
    t.setFull([{ start: 0, end: 2, text: 'a' }]);
    t.observe('b', 10);
    expect(t.lines).toHaveLength(1);
  });

  it('finds the line covering a timestamp', () => {
    const t = new Transcript();
    t.setFull([
      { start: 0, end: 2, text: 'a' },
      { start: 5, end: 8, text: 'b' },
    ]);
    expect(t.activeAt(1)).toBe(0);
    expect(t.activeAt(6)).toBe(1);
  });

  it('reports no active line in a gap between cues', () => {
    const t = new Transcript();
    t.setFull([{ start: 0, end: 2, text: 'a' }, { start: 20, end: 22, text: 'b' }]);
    expect(t.activeAt(10)).toBe(-1);
    expect(t.activeAt(-1)).toBe(-1);
  });

  it('searches both languages, case-insensitively', () => {
    const t = new Transcript();
    t.setFull([
      { start: 0, end: 1, text: '日本語', secondary: 'Japanese' },
      { start: 1, end: 2, text: '英語', secondary: 'English' },
    ]);
    expect(t.search('日本')).toEqual([0]);
    expect(t.search('japan')).toEqual([0]);
    expect(t.search('')).toEqual([]);
  });

  it('notifies on change', () => {
    const t = new Transcript();
    let n = 0;
    t.onChange(() => n++);
    t.observe('a', 1);
    t.setFull([{ start: 0, end: 1, text: 'b' }]);
    expect(n).toBe(2);
  });
});

import { stamp } from '../sidebar';

describe('stamp', () => {
  it('formats under an hour as mm:ss', () => {
    expect(stamp(0)).toBe('00:00');
    expect(stamp(75)).toBe('01:15');
    expect(stamp(599)).toBe('09:59');
  });

  it('adds hours only when needed', () => {
    expect(stamp(3600)).toBe('1:00:00');
    expect(stamp(3725)).toBe('1:02:05');
  });

  it('clamps negatives rather than printing nonsense', () => {
    expect(stamp(-5)).toBe('00:00');
  });
});

describe('Transcript.activeAt with overlapping lines', () => {
  it('keeps a long line active after a shorter one inside it has ended', () => {
    const t = new Transcript();
    t.setFull([
      { start: 10, end: 20, text: 'sign' },
      { start: 11, end: 12, text: 'dialogue' },
    ]);
    expect(t.activeAt(11.5)).toBe(1);
    expect(t.activeAt(15)).toBe(0);
    expect(t.activeAt(25)).toBe(-1);
  });
});
