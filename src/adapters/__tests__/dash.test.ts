import { describe, expect, it } from 'vitest';
import { isoSeconds, textTracks } from '../dash';

const BASE = 'https://x.cf.prd.media.h264.io/gcs/abc/dash.mpd?sig=1';

const MPD = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT47M3.88S">
  <Period id="0" duration="PT47M3.88S" start="PT0S">
    <AdaptationSet id="3" lang="cmn-CN" contentType="audio"><Representation id="a1" mimeType="audio/mp4"/></AdaptationSet>
    <AdaptationSet id="17" lang="zh-Hans-CN" contentType="text">
      <Label>zh-Hans-CN</Label>
      <Role schemeIdUri="urn:mpeg:dash:role:2011" value="subtitle"></Role>
      <Representation mimeType="text/vtt" bandwidth="20" id="t6">
        <SegmentTemplate media="t/321c14/t6/$Number$.vtt" startNumber="1" timescale="1000">
          <SegmentTimeline><S t="0" d="840600"/><S t="840600" d="629040"/><S t="1469640" d="568000" r="1"/></SegmentTimeline>
        </SegmentTemplate>
      </Representation>
    </AdaptationSet>
    <AdaptationSet id="18" lang="en-US" contentType="text">
      <Role value="caption"/>
      <Representation mimeType="text/vtt" id="t4">
        <SegmentTemplate media="t/321c14/t4/$Number%03d$.vtt" startNumber="0" timescale="1000" duration="1000000"/>
      </Representation>
    </AdaptationSet>
    <AdaptationSet id="20" contentType="image"><Representation id="i"><SegmentTemplate media="i/x/images-$Number$.jpg" startNumber="1"/></Representation></AdaptationSet>
  </Period>
</MPD>`;

describe('isoSeconds', () => {
  it('reads an ISO 8601 duration', () => {
    expect(isoSeconds('PT47M3.88S')).toBeCloseTo(2823.88, 2);
    expect(isoSeconds('PT1H')).toBe(3600);
    expect(isoSeconds('nonsense')).toBeNull();
    expect(isoSeconds(null)).toBeNull();
  });
});

describe('textTracks', () => {
  const got = textTracks(MPD, BASE);

  it('lists text tracks only, in order, with their role and language', () => {
    expect(got.map((t) => [t.language, t.role])).toEqual([['zh-Hans-CN', 'subtitle'], ['en-US', 'caption']]);
  });

  it('numbers a timeline\'s segments, repeats included, against the manifest\'s URL', () => {
    const zh = got[0];
    expect(zh?.urls).toEqual([
      'https://x.cf.prd.media.h264.io/gcs/abc/t/321c14/t6/1.vtt',
      'https://x.cf.prd.media.h264.io/gcs/abc/t/321c14/t6/2.vtt',
      'https://x.cf.prd.media.h264.io/gcs/abc/t/321c14/t6/3.vtt',
      'https://x.cf.prd.media.h264.io/gcs/abc/t/321c14/t6/4.vtt',
    ]);
  });

  it('counts fixed-length segments across the period, from startNumber, padded', () => {
    const en = got[1];
    expect(en?.urls).toHaveLength(3);
    expect(en?.urls[0]).toMatch(/t4\/000\.vtt$/);
    expect(en?.urls[2]).toMatch(/t4\/002\.vtt$/);
  });

  it('is empty for anything that is not a manifest', () => {
    expect(textTracks('<html></html>', BASE)).toEqual([]);
    expect(textTracks('not xml <<<', BASE)).toEqual([]);
  });
});
