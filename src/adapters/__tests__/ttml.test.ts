import { describe, expect, it } from 'vitest';
import { parseTtml } from '../ttml';
import { parseVtt } from '../netflix';

const wrap = (body: string, tickRate = '10000000') =>
  `<tt xmlns="http://www.w3.org/ns/ttml" ttp:tickRate="${tickRate}"
       xmlns:ttp="http://www.w3.org/ns/ttml#parameter"><body><div>${body}</div></body></tt>`;

describe('parseTtml', () => {
  it('converts ticks using the declared tickRate', () => {
    const cues = parseTtml(wrap('<p begin="10000000t" end="30000000t">彼女は</p>'));
    expect(cues).toEqual([{ start: 1, end: 3, text: '彼女は' }]);
  });

  it('reads clock times', () => {
    const cues = parseTtml(wrap('<p begin="00:00:01.500" end="00:00:03.500">test</p>'));
    expect(cues[0]?.start).toBeCloseTo(1.5);
    expect(cues[0]?.end).toBeCloseTo(3.5);
  });

  it('reads seconds and milliseconds', () => {
    expect(parseTtml(wrap('<p begin="2s" end="4s">a</p>'))[0]?.start).toBe(2);
    expect(parseTtml(wrap('<p begin="500ms" end="1s">a</p>'))[0]?.start).toBeCloseTo(0.5);
  });

  it('turns <br/> into a newline and keeps the rest inline', () => {
    const cues = parseTtml(wrap('<p begin="0s" end="1s">one<br/>two</p>'));
    expect(cues[0]?.text).toBe('one\ntwo');
  });

  it('honours a non-default tickRate', () => {
    const cues = parseTtml(wrap('<p begin="1000t" end="2000t">a</p>', '1000'));
    expect(cues[0]?.start).toBe(1);
  });

  it('skips cues with no begin, and sorts by start', () => {
    const cues = parseTtml(wrap(
      '<p begin="5s" end="6s">second</p><p end="1s">no begin</p><p begin="1s" end="2s">first</p>',
    ));
    expect(cues.map((c) => c.text)).toEqual(['first', 'second']);
  });

  it('returns empty for malformed XML rather than throwing', () => {
    expect(parseTtml('<tt><body><div><p begin=')).toEqual([]);
  });
});

describe('parseVtt', () => {
  it('parses cues with an index line', () => {
    const cues = parseVtt('WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\n日本語を\n');
    expect(cues).toEqual([{ start: 1, end: 3, text: '日本語を' }]);
  });

  it('keeps multi-line cue text', () => {
    const cues = parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\none\ntwo\n');
    expect(cues[0]?.text).toBe('one\ntwo');
  });

  it('ignores trailing cue settings on the timing line', () => {
    const cues = parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000 line:90%\nx\n');
    expect(cues[0]?.end).toBe(2);
  });
});
