import { Window } from 'happy-dom';
import { describe, expect, it, type TestContext } from 'vitest';
import { textTracks } from '../../src/adapters/dash';
import { cuesFromSegments } from '../../src/adapters/hls';
import { asTracks, isWatchPage, manifestVideo } from '../../src/adapters/viki';
import { describeFailure } from '../../src/assumptions';

/**
 * Viki canaries.
 *
 * An episode cannot be played in CI: it needs a Viki account (a free one) and
 * DRM. A trailer's page is served to anyone, though, and names the trailer's
 * DASH manifest on the same host and path as an episode's; that manifest, and
 * the WebVTT file each of its text tracks is, answer without signing in. So
 * these read the real responses, with the adapter's own reading of them.
 *
 * What this catches: vk.manifest, the manifest no longer listing its tracks as
 * whole WebVTT files the way the adapter reads them, or listing them anywhere
 * but api.viki.io; vk.subtitle-files, a track's file no longer readable from
 * the page or no longer WebVTT; and a trailer's page no longer at
 * /videos/<id>v.
 * What it does not, and cannot without playing something:
 *   - vk.caption-dom and vk.video. The player's subtitle box and its <video>
 *     are only in a playing player. src/adapters/__tests__ pins how we read
 *     them; nothing checks them here.
 *   - an episode's own manifest. A signed-in episode's carries the session's
 *     token where a trailer's has none; host, path and shape were the same
 *     when both were read on 2 November 2026.
 *   - whether a file's cue times are on the <video>'s clock. That was seen in
 *     a playing episode, not here.
 */

// The adapter reads a manifest with DOMParser, which Node has not got. happy-dom's alone: its fetch would
// apply a browser's cross-origin rules to these requests.
globalThis.DOMParser ??= new Window().DOMParser as unknown as typeof DOMParser;

/** Trailers of four shows. More than one, so a title leaving the catalogue is not a red canary. */
const TRAILERS = ['1172969v', '1273991v', '1273634v', '1188807v'];

interface Found {
  page: string;
  video: string;
  url: string;
  mpd: string;
}

let cached: Promise<Found | { blocked: string }> | null = null;

/** The first trailer whose page names its manifest, and that manifest. */
function trailer(): Promise<Found | { blocked: string }> {
  cached ??= (async () => {
    const refused: string[] = [];
    for (const video of TRAILERS) {
      const page = `https://www.viki.com/videos/${video}`;
      const res = await fetch(page);
      if (!res.ok) {
        refused.push(`${video}: HTTP ${res.status}`);
        continue;
      }
      // The page's own data names the manifest, as a JSON string.
      const named = new RegExp(`"(https:[^"]*manifest-viki\\.viki\\.io/v1/${video}/[^"]*manifest\\.mpd[^"]*)"`).exec(await res.text());
      if (!named?.[1]) continue;
      const url = JSON.parse(`"${named[1]}"`) as string;
      const answer = await fetch(url);
      expect(answer.ok, `${url.split('?')[0]} returned HTTP ${answer.status}.\n${describeFailure('vk.manifest')}`).toBe(true);
      return { page, video, url, mpd: await answer.text() };
    }
    // Every page refused: this runner was turned away, which says nothing about Viki's shape.
    if (refused.length === TRAILERS.length) return { blocked: refused.join('; ') };
    throw new Error(`No trailer's page named its manifest.\n${describeFailure('vk.manifest')}`);
  })();
  return cached;
}

function inconclusive(ctx: TestContext, why: string): never {
  // A GitHub annotation, so an inconclusive day is visible on the run.
  console.log(`::warning title=Viki canary inconclusive::${why} — this runner cannot see Viki's pages`);
  return ctx.skip() as never;
}

describe('viki contract', () => {
  it('vk.manifest — a trailer\'s page names its manifest, whose tracks are whole WebVTT files on api.viki.io', async (ctx) => {
    const found = await trailer();
    if ('blocked' in found) inconclusive(ctx, found.blocked);
    expect(isWatchPage(found.page), `${found.page} is not a page the adapter runs on.\n${describeFailure('vk.address')}`).toBe(true);
    expect(manifestVideo(found.url), `${found.url.split('?')[0]} does not name its video where the adapter reads it.\n${describeFailure('vk.manifest')}`).toBe(found.video);

    const listed = textTracks(found.mpd, found.url);
    const tracks = asTracks(listed, found.video);
    console.log(`  viki: trailer ${found.video}, ${tracks.length} tracks: ${tracks.map((t) => t.language).join(', ')}`);
    expect(tracks.length, `The manifest lists no subtitle track the adapter reads.\n${describeFailure('vk.manifest')}`).toBeGreaterThan(0);
    expect(
      tracks.length,
      `The manifest lists ${listed.length} text tracks and the adapter keeps ${tracks.length}: the rest are not one file on api.viki.io.\n${describeFailure('vk.manifest')}`,
    ).toBe(listed.length);
  }, 60_000);

  it('vk.subtitle-files — a track\'s file is WebVTT with cues, readable from the page', async (ctx) => {
    const found = await trailer();
    if ('blocked' in found) inconclusive(ctx, found.blocked);
    const tracks = asTracks(textTracks(found.mpd, found.url), found.video);
    const track = tracks.find((t) => t.language === 'en') ?? tracks[0];
    expect(track, `No track to read.\n${describeFailure('vk.manifest')}`).toBeDefined();

    const res = await fetch(track?.urls[0] ?? '', { headers: { origin: 'https://www.viki.com' } });
    expect(res.ok, `${track?.language} returned HTTP ${res.status}.\n${describeFailure('vk.subtitle-files')}`).toBe(true);
    const allowed = res.headers.get('access-control-allow-origin');
    expect(
      allowed === '*' || allowed === 'https://www.viki.com',
      `The file does not let the page read it (Access-Control-Allow-Origin: ${allowed}).\n${describeFailure('vk.subtitle-files')}`,
    ).toBe(true);

    const body = await res.text();
    const cues = cuesFromSegments([body]);
    expect(body.trimStart().startsWith('WEBVTT') && cues.length > 0, `The ${track?.language} file is not WebVTT with cues.\n${describeFailure('vk.subtitle-files')}`).toBe(true);
    expect(cues.every((c) => c.end > c.start)).toBe(true);
    console.log(`  viki: ${track?.language} file, ${cues.length} cues`);
  }, 60_000);
});
