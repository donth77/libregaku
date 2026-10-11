import { describe, expect, it } from 'vitest';
import { attributesOf, segmentUrls, subtitleRenditions, timestampOffset } from '../hls';

const BASE = 'https://vod.media.dssott.com/token=abc/ps01/disney/id/master.m3u8';

describe('attributesOf', () => {
  it('keeps a comma inside quotes', () => {
    expect(attributesOf('TYPE=SUBTITLES,NAME="English, SDH",FORCED=NO')).toEqual({
      TYPE: 'SUBTITLES', NAME: 'English, SDH', FORCED: 'NO',
    });
  });
});

describe('subtitleRenditions', () => {
  const master = [
    '#EXTM3U',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",NAME="日本語",LANGUAGE="ja",URI="r/composite_128k_ja.m3u8"',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="sub",NAME="日本語 [CC]",LANGUAGE="ja",FORCED=NO,CHARACTERISTICS="public.accessibility.transcribes-spoken-dialog",URI="r/composite_ja_SDH.m3u8"',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="sub",NAME="ไทย",LANGUAGE="th",FORCED=NO,URI="r/composite_th_NORMAL.m3u8"',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="sub",NAME="English",LANGUAGE="en",FORCED=YES,URI="r/composite_en_FORCED.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=1800000,SUBTITLES="sub"',
    'r/composite_1800k.m3u8',
  ].join('\n');

  it('lists subtitles only, with URLs that keep the token in the path', () => {
    const got = subtitleRenditions(master, BASE);
    expect(got.map((r) => r.language)).toEqual(['ja', 'th', 'en']);
    expect(got[0]?.uri).toBe('https://vod.media.dssott.com/token=abc/ps01/disney/id/r/composite_ja_SDH.m3u8');
  });

  it('tells captions and forced tracks from plain subtitles', () => {
    const [ja, th, en] = subtitleRenditions(master, BASE);
    expect([ja?.cc, ja?.forced]).toEqual([true, false]);
    expect([th?.cc, th?.forced]).toEqual([false, false]);
    expect(en?.forced).toBe(true);
  });
});

describe('segmentUrls', () => {
  it('resolves each segment against the playlist, in order', () => {
    const playlist = '#EXTM3U\n#EXTINF:240.1,\nx/f78a-MAIN/06/pts_0.vtt\n#EXTINF:232.0,\nx/f78a-MAIN/06/pts_240115.vtt\n#EXT-X-ENDLIST\n';
    expect(segmentUrls(playlist, 'https://e.dssedge.com/t/r/composite_ja_SDH.m3u8')).toEqual([
      'https://e.dssedge.com/t/r/x/f78a-MAIN/06/pts_0.vtt',
      'https://e.dssedge.com/t/r/x/f78a-MAIN/06/pts_240115.vtt',
    ]);
  });
});

describe('timestampOffset', () => {
  it('reads MPEGTS against LOCAL, in either order', () => {
    expect(timestampOffset('WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n')).toBe(10);
    expect(timestampOffset('WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:02.000,MPEGTS:900000\n')).toBe(8);
  });

  it('is null without a map', () => {
    expect(timestampOffset('WEBVTT\n\n00:01.000 --> 00:02.000\nあ\n')).toBeNull();
  });
});
