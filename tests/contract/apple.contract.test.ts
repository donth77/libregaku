import { describe, expect, it } from 'vitest';
import { languageOf } from '../../src/adapters/apple';
import { isAppleMediaUrl } from '../../src/adapters/apple-hosts';
import { cuesFromSegments, segmentUrls, subtitleRenditions, timestampOffset, type HlsRendition } from '../../src/adapters/hls';
import { describeFailure } from '../../src/assumptions';
import { trackLanguageMatch } from '../../src/settings';
import { fetchCheckingHops } from './hosts';

/**
 * Apple TV canaries.
 *
 * An episode cannot be played in CI: it needs an account and DRM. A title's
 * page is served to anyone, though, and it carries the HLS playlist of the
 * title's trailer, on the same host and path as an episode's. That playlist,
 * its subtitle renditions and their WebVTT segments answer without signing in,
 * so these read the real responses, with the parser and the host rule the
 * adapter itself uses.
 *
 * What this catches: the master playlist no longer listing subtitles the way
 * the adapter reads them, a rendition or segment moving to a host the adapter
 * drops or the manifest does not permit, and segments that are no longer
 * WebVTT with the timestamp map the adapter expects.
 * What it does not, and cannot without playing something:
 *   - apple.clock. The offset between the files and the player's clock is
 *     learned from the player's own text track, which only a playing video
 *     fills. src/adapters/__tests__/apple-clock.test.ts pins the fitting.
 *   - apple.native-hide. Whether the player still draws its captions with the
 *     browser's text track is only visible in a player.
 *   - apple.text-tracks. Which language and label the player gives each text
 *     track is only visible in a player. What is checked here is the playlist's
 *     side of it: that its Chinese is tagged in a way the adapter reads.
 *   - an episode's own playlist. It is the trailer's that is read here; an
 *     episode's is signed, and its segment URLs carry an access key.
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const HEADERS = { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' };

/** Titles whose pages have carried a trailer. More than one, so a title leaving the catalogue is not a red canary. */
const TITLES = [
  'https://tv.apple.com/us/show/pachinko/umc.cmc.17vf6g68dy89kk1l1nnb6min4',
  'https://tv.apple.com/us/show/drops-of-god/umc.cmc.497ttx33nudgzywis3i2bnvuk',
  'https://tv.apple.com/us/show/severance/umc.cmc.1srk2goyh2q2zdxcx605w8vtx',
];

interface Found {
  page: string;
  url: string;
  master: string;
  renditions: HlsRendition[];
}

let cached: Promise<Found> | null = null;

/** The first title page that names a playlist, and that playlist, fetched as the extension would be allowed to. */
function trailer(): Promise<Found> {
  if (cached) return cached;
  cached = (async () => {
    const tried: string[] = [];
    for (const page of TITLES) {
      const res = await fetch(page, { headers: HEADERS, redirect: 'follow' });
      if (!res.ok) {
        tried.push(`${page} returned HTTP ${res.status}`);
        continue;
      }
      // The page's data is JSON in the HTML; a slash may be written as \u002F.
      const html = (await res.text()).replace(/\\u002F/gi, '/').replace(/&amp;/g, '&');
      const url = /"hlsUrl":"(https:[^"]+\.m3u8[^"]*)"/.exec(html)?.[1];
      if (!url) {
        tried.push(`${page} names no hlsUrl`);
        continue;
      }
      const got = await fetchCheckingHops(url, { headers: HEADERS }, describeFailure('apple.master'));
      expect(got.ok, `the playlist on ${page} returned HTTP ${got.status}`).toBe(true);
      const master = await got.text();
      return { page, url: got.url || url, master, renditions: subtitleRenditions(master, got.url || url) };
    }
    throw new Error(
      `No title page gave a playlist to read:\n  ${tried.join('\n  ')}\n` +
        'Apple may have changed how a title page names its trailer, which makes this canary blind rather than the adapter broken.',
    );
  })();
  // A failure is not kept: the retries in vitest.contract.config.ts are for a blip, and fetch again.
  cached.catch(() => {
    cached = null;
  });
  return cached;
}

/** A rendition a learner would study, where there is one: dialogue, not forced. */
function pick(renditions: HlsRendition[]): HlsRendition | undefined {
  const usable = renditions.filter((r) => !r.forced && isAppleMediaUrl(r.uri));
  return usable.find((r) => r.language === 'ja') ?? usable.find((r) => r.language === 'ko') ?? usable.find((r) => r.language === 'en') ?? usable[0];
}

describe('apple tv contract', () => {
  it('apple.master — a title page names an HLS master playlist that lists subtitle renditions', async () => {
    const { page, url, master, renditions } = await trailer();
    expect(isAppleMediaUrl(url), `The playlist is served from ${new URL(url).host}, which the adapter does not take as Apple's.\n${describeFailure('apple.master')}`).toBe(true);
    expect(/#EXT-X-STREAM-INF/.test(master), `The playlist on ${page} lists no variants, so it is not a master playlist.\n${describeFailure('apple.master')}`).toBe(true);
    expect(
      renditions.length,
      `The master playlist lists no #EXT-X-MEDIA:TYPE=SUBTITLES rendition the parser can read.\n${describeFailure('apple.master')}`,
    ).toBeGreaterThan(0);

    const named = renditions.filter((r) => r.language && r.name && r.uri);
    expect(named.length, `Subtitle renditions no longer carry LANGUAGE, NAME and URI.\n${describeFailure('apple.master')}`).toBe(renditions.length);

    const kept = renditions.filter((r) => isAppleMediaUrl(r.uri));
    expect(
      kept.length,
      `Every rendition is on a host the adapter drops (first: ${renditions[0]?.uri.slice(0, 80)}).\n${describeFailure('apple.master')}`,
    ).toBeGreaterThan(0);
    const languages = new Set(kept.map((r) => r.language));

    // Apple tags Mandarin its own way (cmn-Hans); a tag the adapter cannot read as Chinese leaves its learner no track.
    const unread = kept.filter((r) => /中文/.test(r.name) && trackLanguageMatch(languageOf(r.language), 'zh') === 0);
    expect(
      unread.length,
      `A Chinese rendition is tagged ${unread[0]?.language}, which the adapter does not read as Chinese.\n${describeFailure('apple.master')}`,
    ).toBe(0);
    console.log(`  apple tv: ${renditions.length} subtitle renditions, ${languages.size} languages, from ${new URL(page).pathname.split('/')[3]}`);
  }, 90_000);

  it('apple.vtt-segments — a rendition is a playlist of WebVTT segments with the timestamp map the adapter expects', async () => {
    const { renditions } = await trailer();
    const rendition = pick(renditions);
    expect(rendition, `No rendition to read.\n${describeFailure('apple.vtt-segments')}`).toBeDefined();
    if (!rendition) return;

    const list = await fetchCheckingHops(rendition.uri, { headers: HEADERS }, describeFailure('apple.vtt-segments'));
    expect(list.ok, `The ${rendition.language} rendition's playlist returned HTTP ${list.status}`).toBe(true);
    const playlist = await list.text();
    const durations = [...playlist.matchAll(/^#EXTINF:([\d.]+)/gm)].map((m) => Number(m[1]));
    const urls = segmentUrls(playlist, rendition.uri);
    expect(urls.length, `The rendition's playlist lists no segments.\n${describeFailure('apple.vtt-segments')}`).toBeGreaterThan(0);
    expect(urls.every(isAppleMediaUrl), `A segment is on a host the adapter drops: ${urls.find((u) => !isAppleMediaUrl(u))}\n${describeFailure('apple.vtt-segments')}`).toBe(true);
    expect(Math.max(...durations), `A segment runs ${Math.max(...durations)} s; they have been about a minute.\n${describeFailure('apple.vtt-segments')}`).toBeLessThanOrEqual(121);

    const first = await fetchCheckingHops(urls[0] ?? '', { headers: HEADERS }, describeFailure('apple.vtt-segments'));
    expect(first.ok, `The first segment returned HTTP ${first.status}`).toBe(true);
    const vtt = await first.text();
    expect(vtt.trimStart().startsWith('WEBVTT'), `The segment is not WebVTT; it starts ${JSON.stringify(vtt.slice(0, 40))}.\n${describeFailure('apple.vtt-segments')}`).toBe(true);
    // MPEGTS:900000 against LOCAL:00:00:00 is ten seconds, the same in every segment.
    expect(timestampOffset(vtt), `The segment's X-TIMESTAMP-MAP is not MPEGTS:900000,LOCAL:00:00:00.\n${describeFailure('apple.vtt-segments')}`).toBe(10);

    // Every segment of the trailer, read as the adapter reads a film's.
    const texts = [vtt];
    for (const u of urls.slice(1, 4)) {
      const res = await fetchCheckingHops(u, { headers: HEADERS }, describeFailure('apple.vtt-segments'));
      if (res.ok) texts.push(await res.text());
    }
    const cues = cuesFromSegments(texts);
    expect(cues.length, `No cues were read from ${texts.length} segments.\n${describeFailure('apple.vtt-segments')}`).toBeGreaterThan(0);
    console.log(`  apple tv: ${rendition.language} rendition, ${urls.length} segments, ${cues.length} cues in the first ${texts.length}`);
  }, 120_000);
});
