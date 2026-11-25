import { describe, expect, it } from 'vitest';
import { betweenParts, elementTime, isoSeconds, joinPeriods, mediaTime, textTracks } from '../dash';

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

describe('textTracks, where each track is one whole file', () => {
  // Viki's shape: no SegmentTemplate, the Representation's BaseURL is the track, and its name an attribute.
  const WHOLE = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
  <Period id="0">
    <AdaptationSet id="1" contentType="audio" lang="ko-KR"><Representation id="a" mimeType="audio/mp4"/></AdaptationSet>
    <AdaptationSet contentType="text" lang="ko" label="한국어" mimeType="text/vtt">
      <Representation id="subtitle/ko" bandwidth="0">
        <BaseURL>https://api.viki.io/v4/videos/1v/auth_subtitles/ko.vtt?app=1&amp;token=t</BaseURL>
      </Representation>
    </AdaptationSet>
    <AdaptationSet contentType="text" lang="en" mimeType="text/vtt">
      <Representation id="subtitle/en" bandwidth="0"><BaseURL>en.vtt</BaseURL></Representation>
    </AdaptationSet>
    <AdaptationSet contentType="text" lang="fr" mimeType="text/vtt"><Representation id="subtitle/fr"/></AdaptationSet>
  </Period>
</MPD>`;
  const got = textTracks(WHOLE, 'https://manifest-viki.viki.io/v1/1v/manifest.mpd?sig=1');

  it('takes the BaseURL as the track, its entities decoded, and resolves a relative one', () => {
    expect(got.map((t) => t.urls)).toEqual([
      ['https://api.viki.io/v4/videos/1v/auth_subtitles/ko.vtt?app=1&token=t'],
      ['https://manifest-viki.viki.io/v1/1v/en.vtt'],
    ]);
  });

  it('names a track by its label attribute, else its language', () => {
    expect(got.map((t) => [t.language, t.label, t.role])).toEqual([['ko', '한국어', 'subtitle'], ['en', 'en', 'subtitle']]);
  });
});

// HBO Max's plan with ads, as its manifest lays an episode out: a card and an ad before the title, the
// title's first part, a break, the second part. Each part lists every language again, its file numbered on
// from the last, its lines timed on the title's own clock from the presentationTimeOffset.
const part = (start: string, duration: string, offset: number, n: number, length: number): string => `
  <Period id="${offset}" start="${start}" duration="${duration}">
    <AdaptationSet id="11" lang="en-GB" contentType="text"><Label>en-GB</Label><Role value="subtitle"/>
      <Representation mimeType="text/vtt" id="t0"><SegmentTemplate timescale="1000" presentationTimeOffset="${offset}" startNumber="${n}" media="t/321c14/t0/$Number$.vtt"><SegmentTimeline><S t="${offset}" d="${length}"/></SegmentTimeline></SegmentTemplate></Representation>
    </AdaptationSet>
    <AdaptationSet id="12" lang="th" contentType="text"><Label>th</Label><Role value="subtitle"/>
      <Representation mimeType="text/vtt" id="t1"><SegmentTemplate timescale="1000" presentationTimeOffset="${offset}" startNumber="${n}" media="t/321c14/t1/$Number$.vtt"><SegmentTimeline><S t="${offset}" d="${length}"/></SegmentTimeline></SegmentTemplate></Representation>
    </AdaptationSet>
  </Period>`;
const ad = (start: string, duration: string): string => `
  <Period start="${start}" duration="${duration}">
    <AdaptationSet lang="en-US" contentType="text"><Label>en-US CC</Label><Role value="caption"/>
      <Representation mimeType="text/vtt" id="c"><BaseURL>https://ads.example/cc.vtt</BaseURL></Representation>
    </AdaptationSet>
  </Period>`;
const WITH_ADS = `<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT26M22.723S">
  ${ad('PT0.000S', 'PT8.008S')}${ad('PT8.008S', 'PT15.015S')}
  ${part('PT23.023S', 'PT14M0.6S', 0, 1, 840600)}
  ${ad('PT14M23.623S', 'PT1M30.06S')}
  ${part('PT15M53.683S', 'PT10M29.04S', 840600, 2, 629040)}
</MPD>`;

describe('a title in parts, with ad breaks between them', () => {
  const tracks = textTracks(WITH_ADS, BASE);
  const title = tracks.filter((t) => t.urls.every((u) => u.includes('h264.io')));

  it("places each part on the <video>'s clock, and its lines on the title's", () => {
    expect(title.filter((t) => t.language === 'en-GB').map((t) => t.parts)).toEqual([
      [{ start: 23.023, end: 863.623, offset: 0 }],
      [{ start: 953.683, end: 1582.723, offset: 840.6 }],
    ]);
  });

  it('joins the parts into one track for each language, its files in order', () => {
    const joined = joinPeriods(title);
    expect(joined.map((t) => t.label)).toEqual(['en-GB', 'th']);
    expect(joined[0]?.urls).toEqual([
      'https://x.cf.prd.media.h264.io/gcs/abc/t/321c14/t0/1.vtt',
      'https://x.cf.prd.media.h264.io/gcs/abc/t/321c14/t0/2.vtt',
    ]);
    expect(joined[0]?.parts.map((p) => p.offset)).toEqual([0, 840.6]);
  });

  it("reads the <video>'s clock as the title's, through the breaks, and back", () => {
    const parts = joinPeriods(title)[0]?.parts ?? [];
    // 7:33.7 on the element, as the player showed it: 7:10.7 into the title.
    expect(mediaTime(parts, 453.692929)).toBeCloseTo(430.67, 2);
    // The second part's first line, at 14:03.36 of the title.
    expect(elementTime(parts, 843.36)).toBeCloseTo(956.443, 3);
    expect(mediaTime(parts, 956.443)).toBeCloseTo(843.36, 3);
    // Before the title and in the break: where the title is waiting.
    expect(mediaTime(parts, 5)).toBe(0);
    expect(mediaTime(parts, 900)).toBeCloseTo(840.6, 3);
    expect([betweenParts(parts, 5), betweenParts(parts, 453), betweenParts(parts, 900), betweenParts(parts, 1000)]).toEqual([true, false, true, false]);
  });

  it("leaves a title in one period, from the start, on the <video>'s clock", () => {
    const parts = textTracks(MPD, BASE)[0]?.parts ?? [];
    expect(parts).toEqual([{ start: 0, end: 2823.88, offset: 0 }]);
    expect([mediaTime(parts, 1234.5), elementTime(parts, 1234.5), betweenParts(parts, 1234.5)]).toEqual([1234.5, 1234.5, false]);
  });
});
