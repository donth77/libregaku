import { describe, expect, it } from 'vitest';
import { cuesFromSegments, playIdOf, programmeSegments } from '../disney';

describe('playIdOf', () => {
  it('reads the id from a play page, and nothing from any other', () => {
    expect(playIdOf('/play/2f874c68-6a63-4d59-bb4c-abf05d8a5285')).toBe('2f874c68-6a63-4d59-bb4c-abf05d8a5285');
    expect(playIdOf('/en-gb/video/abc')).toBe('abc');
    expect(playIdOf('/browse/entity-123')).toBeNull();
  });
});

describe('programmeSegments', () => {
  it('drops the card before the programme where the programme is marked', () => {
    expect(programmeSegments(['a/1-DUB_CARD/pts_0.vtt', 'a/f78a-MAIN/pts_0.vtt', 'a/f78a-MAIN/pts_9.vtt']))
      .toEqual(['a/f78a-MAIN/pts_0.vtt', 'a/f78a-MAIN/pts_9.vtt']);
  });

  it('keeps everything where nothing is marked', () => {
    expect(programmeSegments(['a/0.vtt', 'a/1.vtt'])).toEqual(['a/0.vtt', 'a/1.vtt']);
  });
});

describe('cuesFromSegments', () => {
  const seg = (map: string, body: string): string => `WEBVTT\nX-TIMESTAMP-MAP=${map}\n\n${body}\n`;

  it('leaves times alone when every segment shares one offset', () => {
    const cues = cuesFromSegments([
      seg('MPEGTS:900000,LOCAL:00:00:00.000', '00:00:01.000 --> 00:00:02.000\n一'),
      seg('MPEGTS:900000,LOCAL:00:00:00.000', '00:04:01.000 --> 00:04:02.000\n二'),
    ]);
    expect(cues.map((c) => [c.start, c.text])).toEqual([[1, '一'], [241, '二']]);
  });

  it('shifts a segment by how far its offset is from the first', () => {
    const cues = cuesFromSegments([
      seg('MPEGTS:0,LOCAL:00:00:00.000', '00:00:01.000 --> 00:00:02.000\n一'),
      seg('MPEGTS:900000,LOCAL:00:00:00.000', '00:00:01.000 --> 00:00:02.000\n二'),
    ]);
    expect(cues.map((c) => c.start)).toEqual([1, 11]);
  });

  it('keeps a cue listed in two segments once', () => {
    const body = '00:03:59.000 --> 00:04:01.000\n跨ぐ';
    const cues = cuesFromSegments([seg('MPEGTS:0,LOCAL:00:00:00.000', body), seg('MPEGTS:0,LOCAL:00:00:00.000', body)]);
    expect(cues).toHaveLength(1);
  });
});
