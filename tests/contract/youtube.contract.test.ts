import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';

/**
 * Canary tests. These hit the live site, so they are excluded from `pnpm test`
 * and run on a schedule instead — their job is to notice YouTube changing
 * shape, which unit tests structurally cannot.
 */

// Old, stable, heavily-translated. Unlikely to be deleted or lose its captions.
const VIDEO = 'iG9CE55wbtY';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function watchPage(id: string): Promise<string> {
  const res = await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, {
    headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' },
  });
  expect(res.ok, `YouTube returned HTTP ${res.status}`).toBe(true);
  return res.text();
}

describe('youtube contract', () => {
  it('yt.player-response — the page still embeds a caption track list', async () => {
    const html = await watchPage(VIDEO);
    const found = /"captionTracks":\[/.test(html);
    expect(found, describeFailure('yt.player-response')).toBe(true);
  }, 30_000);

  it('yt.track-fields — tracks still carry baseUrl, languageCode, and kind', async () => {
    const html = await watchPage(VIDEO);
    const m = html.match(/"captionTracks":(\[.*?\])/);
    expect(m, describeFailure('yt.player-response')).toBeTruthy();

    const tracks = JSON.parse(m![1]!) as Array<Record<string, unknown>>;
    expect(tracks.length, describeFailure('yt.track-fields')).toBeGreaterThan(0);

    for (const t of tracks) {
      expect(typeof t.baseUrl, describeFailure('yt.track-fields')).toBe('string');
      expect(typeof t.languageCode, describeFailure('yt.track-fields')).toBe('string');
    }

    // The human/auto distinction is what `check-captions` and track selection rely on.
    const kinds = new Set(tracks.map((t) => t.kind ?? 'human'));
    expect([...kinds].every((k) => k === 'human' || k === 'asr'), describeFailure('yt.track-fields')).toBe(true);
  }, 30_000);

  it('yt.track-fields — this reference video still has a human Japanese track', async () => {
    const html = await watchPage(VIDEO);
    const m = html.match(/"captionTracks":(\[.*?\])/);
    const tracks = JSON.parse(m![1]!) as Array<{ languageCode?: string; kind?: string }>;
    const ja = tracks.find((t) => t.languageCode?.startsWith('ja') && t.kind !== 'asr');
    expect(
      ja,
      `Reference video ${VIDEO} lost its human Japanese track. Pick a new one; this is\n` +
        `a fixture problem, not necessarily a YouTube change.`,
    ).toBeTruthy();
  }, 30_000);
});
