import { afterEach, describe, expect, it, vi } from 'vitest';
import { textTracks } from '../dash';
import { cuesFromSegments } from '../hls';
import { VikiAdapter, asTracks, isWatchPage, languageOf, manifestVideo, watchIdOf } from '../viki';

const VIDEO = '1172595v';
const file = (video: string, lang: string, host = 'api.viki.io'): string =>
  `https://${host}/v4/videos/${video}/auth_subtitles/${lang}.vtt?app=100000a&amp;stream_id=1&amp;token=t`;
const text = (lang: string, label: string, url: string): string =>
  `<AdaptationSet contentType="text" lang="${lang}" label="${label}" mimeType="text/vtt">` +
  `<Representation id="subtitle/${lang}" bandwidth="0"><BaseURL>${url}</BaseURL></Representation></AdaptationSet>`;

/** Viki's manifest as its player is served it, cut down: the tokens and signatures are made up. */
const MPD = `<?xml version="1.0" encoding="UTF-8"?>
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" profiles="urn:mpeg:dash:profile:isoff-on-demand:2011">
  <Period id="0">
    <AdaptationSet id="1" contentType="audio" lang="ko-KR"><Representation id="a" mimeType="audio/mp4"/></AdaptationSet>
    <AdaptationSet id="2" contentType="video"><Representation id="v" mimeType="video/mp4"/></AdaptationSet>
    <AdaptationSet mimeType="image/jpeg"><Representation id="thumbs"/></AdaptationSet>
    ${text('zt', '繁體中文', file(VIDEO, 'zt'))}
    ${text('zh', '简体中文', file(VIDEO, 'zh'))}
    ${text('ko', '한국어', file(VIDEO, 'ko'))}
    ${text('en', 'English', file(VIDEO, 'en'))}
    ${text('fr', 'Français', file('999v', 'fr'))}
    ${text('es', 'Español', file(VIDEO, 'es', 'api.viki.io.evil.example'))}
  </Period>
</MPD>`;
const MANIFEST_URL = `https://manifest-viki.viki.io/v1/${VIDEO}/cloudfront/main/mpd/vtt/viki/high/hd/ww/dt2_dt3/manifest.mpd?token=t&sig=s`;

describe('addresses', () => {
  it('reads the video from its page, with or without its name', () => {
    expect(watchIdOf('/videos/1172595v-search-episode-1')).toBe(VIDEO);
    expect(watchIdOf('/videos/1172595v')).toBe(VIDEO);
    expect(watchIdOf('/tv/37375c')).toBeNull();
  });

  it('knows a video page, and nothing else', () => {
    expect(isWatchPage('https://www.viki.com/videos/1172595v-search-episode-1')).toBe(true);
    expect(isWatchPage('https://www.viki.com/videos/1172595v?locale=en')).toBe(true);
    expect(isWatchPage('https://www.viki.com/tv/37375c')).toBe(false);
    expect(isWatchPage('https://www.viki.com.evil.example/videos/1172595v')).toBe(false);
  });

  it('reads the video a manifest is for, from Viki\'s manifest host only', () => {
    expect(manifestVideo(MANIFEST_URL)).toBe(VIDEO);
    expect(manifestVideo('https://cloudfront-3.vikiplatform.com/1193129v/dash/mpdhd.mpd')).toBeNull();
    expect(manifestVideo('https://manifest-viki.viki.io.evil.example/v1/1172595v/manifest.mpd')).toBeNull();
  });
});

describe('asTracks', () => {
  const tracks = asTracks(textTracks(MPD, MANIFEST_URL), VIDEO);

  it('lists this video\'s tracks on api.viki.io, Chinese by script', () => {
    expect(tracks.map((t) => [t.id, t.language, t.label])).toEqual([
      ['zh-Hant:0', 'zh-Hant', '繁體中文'],
      ['zh-Hans:0', 'zh-Hans', '简体中文'],
      ['ko:0', 'ko', '한국어'],
      ['en:0', 'en', 'English'],
    ]);
    expect(tracks[2]?.urls).toEqual([`https://api.viki.io/v4/videos/${VIDEO}/auth_subtitles/ko.vtt?app=100000a&stream_id=1&token=t`]);
  });

  it('leaves out another video\'s file, and a file anywhere else', () => {
    expect(tracks.map((t) => t.language)).not.toContain('fr');
    expect(tracks.map((t) => t.language)).not.toContain('es');
    expect(asTracks(textTracks(MPD, MANIFEST_URL), '999v').map((t) => t.language)).toEqual(['fr']);
  });

  it('keeps every other code as Viki writes it', () => {
    expect(['ko', 'ja', 'pt', 'sh'].map(languageOf)).toEqual(['ko', 'ja', 'pt', 'sh']);
  });
});

describe('a track\'s file', () => {
  it('is read whole, its italics taken out', () => {
    const vtt = 'WEBVTT\n\n1\n00:00:06.340 --> 00:00:11.720\n<i>장동윤</i>\n\n2\n00:59:46.870 --> 00:59:50.110\n근처에 있던 그 사람. 무슨 관계가 있을까?\n';
    expect(cuesFromSegments([vtt])).toEqual([
      { start: 6.34, end: 11.72, text: '장동윤' },
      { start: 3586.87, end: 3590.11, text: '근처에 있던 그 사람. 무슨 관계가 있을까?' },
    ]);
  });
});

describe('VikiAdapter', () => {
  const page = window as unknown as { happyDOM: { setURL(u: string): void } };
  const post = (url: string, body: string): void => {
    window.dispatchEvent(new MessageEvent('message', { data: { source: 'libregaku', kind: 'vk-mpd', url, text: body }, source: window }));
  };

  afterEach(() => vi.useRealTimers());

  it('takes the manifest of the video on the page, and not another\'s', async () => {
    vi.useFakeTimers();
    page.happyDOM.setURL('https://www.viki.com/videos/1172595v-search-episode-1');
    const adapter = new VikiAdapter();
    const heard = vi.fn();
    adapter.onTracks(heard);

    post(MANIFEST_URL.replace(VIDEO, '1193129v'), MPD);
    expect(await adapter.listTracks()).toEqual([]);

    post(MANIFEST_URL, MPD);
    expect(heard).toHaveBeenCalledTimes(1);
    expect((await adapter.listTracks()).map((t) => t.lang)).toEqual(['zh-Hant', 'zh-Hans', 'ko', 'en']);
    document.title = 'Search - Episode 1 | Rakuten Viki';
    expect(adapter.title()).toBe('Search - Episode 1');
    expect(adapter.deepLink(30)).toBe('https://www.viki.com/videos/1172595v');
  });

  it('drops the last episode\'s tracks when the next one opens', async () => {
    vi.useFakeTimers();
    page.happyDOM.setURL('https://www.viki.com/videos/1172595v-search-episode-1');
    const adapter = new VikiAdapter();
    const moved = vi.fn();
    adapter.onNavigate(moved);
    post(MANIFEST_URL, MPD);
    expect(await adapter.listTracks()).toHaveLength(4);

    page.happyDOM.setURL('https://www.viki.com/videos/1172596v-search-episode-2');
    vi.advanceTimersByTime(600);
    expect(moved).toHaveBeenCalledTimes(1);
    expect(await adapter.listTracks()).toEqual([]);
  });
});
