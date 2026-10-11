import { afterEach, describe, expect, it, vi } from 'vitest';
import { KoreanSegmenter } from '../korean';
import { LINES } from './fixtures/ko-dic';

/**
 * The Korean segmenter's own part: what it asks the analyser, and how often.
 * What comes of the answers is merge-ko's, and tested there.
 */

/** The offscreen document, with the fixture for an analyser: what it was asked, in order. */
function analyser(): string[] {
  const asked: string[] = [];
  vi.stubGlobal('chrome', {
    runtime: {
      sendMessage: async (message: { type?: string; text?: string }) => {
        if (message.type !== 'tokenize') return undefined;
        asked.push(message.text ?? '');
        const tokens = LINES[message.text ?? ''];
        return tokens ? { ok: true, tokens } : { ok: false, error: 'not a line of the fixture' };
      },
    },
  });
  return asked;
}

afterEach(() => vi.unstubAllGlobals());

describe('KoreanSegmenter', () => {
  it('asks about each speaker\'s words on their own, with a full stop, and gives the cue back whole', async () => {
    const asked = analyser();
    const text = '- 저는 학생이에요\n- 그건 제 책이 아니에요';
    const tokens = await new KoreanSegmenter().segment(text);
    expect(asked).toEqual(['저는 학생이에요.', '그건 제 책이 아니에요.']);
    expect(tokens.map((t) => t.surface).join('')).toBe(text);
    for (const t of tokens) expect(text.slice(t.start, t.end)).toBe(t.surface);
    expect(tokens.filter((t) => t.content).map((t) => t.lemma)).toEqual(['저', '학생', '그거', '저', '책', '아니다']);
  });

  it('asks nothing about a cue of nothing but marks', async () => {
    const asked = analyser();
    expect(await new KoreanSegmenter().segment('♪ ~ ♪')).toEqual([{ surface: '♪ ~ ♪', start: 0, end: 5, punct: true }]);
    expect(asked).toEqual([]);
  });

  it('does not ask twice about a cue it has read', async () => {
    const asked = analyser();
    const segmenter = new KoreanSegmenter();
    const first = await segmenter.segment('"저는 학생이에요."');
    expect(await segmenter.segment('"저는 학생이에요."')).toBe(first);
    expect(asked).toEqual(['저는 학생이에요.']);
  });

  it('fails for the cue when the analyser cannot answer, so the caller can fall back on it', async () => {
    analyser();
    await expect(new KoreanSegmenter().segment('없는 줄')).rejects.toThrow('not a line of the fixture');
  });
});
