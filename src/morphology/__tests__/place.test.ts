import { describe, expect, it } from 'vitest';
import type { MergedToken } from '../merge';
import { place, runsOf } from '../place';

/** Words from an analyser, put back on the line they came from. */

const word = (surface: string, more: Partial<MergedToken> = {}): MergedToken =>
  ({ surface, parts: [], inflections: [], content: true, lookup: [], ...more });

describe('runsOf', () => {
  it('splits what the analyser returns at the spaces the line was written with', () => {
    const morphemes = ['학교', '에', '갔', '어요'].map((surface) => ({ surface }));
    expect(runsOf('학교에 갔어요', morphemes).map((run) => run.map((m) => m.surface))).toEqual([['학교', '에'], ['갔', '어요']]);
  });

  it('keeps a line with no spaces as one run', () => {
    const morphemes = ['我们', '去', '学校'].map((surface) => ({ surface }));
    expect(runsOf('我们去学校', morphemes)).toHaveLength(1);
  });
});

describe('place', () => {
  it('finds each word in the line, in order', () => {
    const tokens = place('学校に行く', [word('学校'), word('に', { content: false }), word('行く')]);
    expect(tokens.map((t) => [t.surface, t.start, t.end])).toEqual([['学校', 0, 2], ['に', 2, 3], ['行く', 3, 5]]);
  });

  it('leaves the spaces out unless asked to keep them, as Japanese always has', () => {
    const words = [word('ありがとう'), word('ございます')];
    expect(place('ありがとう ございます', words).map((t) => t.surface)).toEqual(['ありがとう', 'ございます']);
  });

  it('keeps what stands between the words as text of its own, for a language written with spaces', () => {
    const text = ' 학교에  갔어요 ';
    const tokens = place(text, [word('학교'), word('에', { content: false }), word('갔어요')], { gaps: true });
    expect(tokens.map((t) => t.surface)).toEqual([' ', '학교', '에', '  ', '갔어요', ' ']);
    expect(tokens.map((t) => t.surface).join('')).toBe(text);
    expect(tokens.filter((t) => t.punct).map((t) => t.surface)).toEqual([' ', '  ', ' ']);
    // A gap is drawn, never looked up.
    expect(tokens[0]).toMatchObject({ start: 0, end: 1, punct: true });
    expect(tokens[0]?.content).toBeUndefined();
  });

  it('never counts punctuation as a word, whatever the analyser called it', () => {
    const tokens = place('뭐?', [word('뭐'), word('?')], { gaps: true });
    expect(tokens[1]).toMatchObject({ surface: '?', punct: true, content: false });
    const tagged = place('a…', [word('a'), word('…', { pos: 'SE' })], { isPunct: (t) => t.pos === 'SE' });
    expect(tagged[1]?.punct).toBe(true);
  });

  it('skips a word the analyser changed beyond finding, without misplacing the rest', () => {
    const tokens = place('가 나', [word('가'), word('XX'), word('나')], { gaps: true });
    expect(tokens.map((t) => t.surface)).toEqual(['가', ' ', '나']);
  });
});
