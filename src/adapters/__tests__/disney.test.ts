import { describe, expect, it, vi } from 'vitest';
import { cuesFromSegments, DisneyAdapter, playIdOf, programmeSegments } from '../disney';

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

describe('DisneyAdapter', () => {
  const HOST = 'https://varnish16-c20-jfk1-dss-vod-dssc-shield.tr.na.prod.dssedge.com';
  const master = (url: string, ...subtitles: string[]): void => {
    window.dispatchEvent(new MessageEvent('message', {
      source: window,
      data: {
        source: 'libregaku',
        kind: 'dp-master',
        url,
        text: ['#EXTM3U', ...subtitles, '#EXT-X-STREAM-INF:BANDWIDTH=1800000,SUBTITLES="sub-main"', 'r/1800k.m3u8'].join('\n'),
      },
    }));
  };
  const sub = (language: string, name: string): string =>
    `#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="sub-main",NAME="${name}",LANGUAGE="${language}",FORCED=NO,URI="r/composite_${language}_NORMAL.m3u8"`;

  it("keeps the title's tracks when the clip played inside it brings a playlist of its own", async () => {
    const disney = new DisneyAdapter();
    const changed = vi.fn();
    disney.onTracks(changed);
    master(`${HOST}/dvt2=exp=1795640067~url=%2Fps01%2Fdisney%2Fb77a%2F/ps01/disney/b77a/ctr-all.m3u8`, sub('ja', 'Japanese'), sub('en', 'English'));
    expect(changed).toHaveBeenCalledTimes(1);
    // An unencrypted clip under /int/, whose only subtitles are "No linguistic content".
    master(`${HOST}/int/ps01/disney/c876/unenc-all.m3u8`, sub('zxx', 'No linguistic content'));
    expect(changed).toHaveBeenCalledTimes(1);
    expect((await disney.listTracks()).map((t) => t.lang)).toEqual(['ja', 'en']);
  });
});
