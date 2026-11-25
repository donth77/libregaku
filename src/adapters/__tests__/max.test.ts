import { describe, expect, it } from 'vitest';
import { asTracks, isWatchPage, partsOf, watchIdOf } from '../max';

const url = (n: number): string => `https://x.cf.prd.media.h264.io/gcs/a/t/h/t6/${n}.vtt`;
/** The whole title, one period from the start. */
const whole = [{ start: 0, end: Infinity, offset: 0 }];

describe('watchIdOf', () => {
  it('reads the id from a watch page, and nothing from any other', () => {
    expect(watchIdOf('/video/watch/8779f57f-dc7f-4bfd-8ce2-6ed41044519f')).toBe('8779f57f-dc7f-4bfd-8ce2-6ed41044519f');
    expect(watchIdOf('/show/7888496f')).toBeNull();
  });
});

describe('isWatchPage', () => {
  it('knows a watch page on the old host and the new, and nothing else', () => {
    expect(isWatchPage('https://play.hbomax.com/video/watch/8779f57f/1')).toBe(true);
    expect(isWatchPage('https://www.hbomax.com/video/watch/8779f57f/1')).toBe(true);
    expect(isWatchPage('https://www.hbomax.com/')).toBe(false);
    expect(isWatchPage('https://www.hbomax.com/auth/login')).toBe(false);
    expect(isWatchPage('https://www.hbomax.com.evil.example/video/watch/8779f57f')).toBe(false);
  });
});

describe('asTracks', () => {
  it('gives each track a stable id by language and kind, and marks captions and forced', () => {
    const got = asTracks([
      { language: 'zh-Hans-CN', role: 'subtitle', label: 'zh-Hans-CN', urls: [url(1)], parts: whole },
      { language: 'en-US', role: 'caption', label: 'en-US', urls: [url(1)], parts: whole },
      { language: 'es-419', role: 'forced-subtitle', label: 'es-419', urls: [url(1)], parts: whole },
      { language: 'zh-Hans-CN', role: 'subtitle', label: 'again', urls: [url(2)], parts: whole },
    ]);
    expect(got.map((t) => t.id)).toEqual(['zh-Hans-CN:sub:0', 'en-US:cc:0', 'es-419:forced:0', 'zh-Hans-CN:sub:1']);
    expect([got[1]?.cc, got[2]?.forced]).toEqual([true, true]);
  });

  it('lists each language once where the title comes in parts, with every part on the clock', () => {
    const part = (start: number, offset: number, n: number) => [
      { language: 'en-GB', role: 'subtitle', label: 'en-GB', urls: [url(n)], parts: [{ start, end: start + 600, offset }] },
      { language: 'th', role: 'subtitle', label: 'th', urls: [url(n)], parts: [{ start, end: start + 600, offset }] },
    ];
    const adCaptions = { language: 'en-US', role: 'caption', label: 'en-US CC', urls: ['https://ads.example/cc.vtt'], parts: [{ start: 0, end: 23, offset: 0 }] };
    const got = asTracks([adCaptions, ...part(23, 0, 1), ...part(653, 600, 2), ...part(1300, 1200, 3)]);
    expect(got.map((t) => t.id)).toEqual(['en-GB:sub:0', 'th:sub:0']);
    expect(got[0]?.urls).toEqual([url(1), url(2), url(3)]);
    expect(partsOf(got).map((p) => p.start)).toEqual([23, 653, 1300]);
  });

  it('drops a track with any segment not on an HBO Max host', () => {
    expect(asTracks([{ language: 'ja', role: 'subtitle', label: 'ja', urls: [url(1), 'https://evil.example/2.vtt'], parts: whole }])).toEqual([]);
    expect(asTracks([{ language: 'ja', role: 'subtitle', label: 'ja', urls: ['http://x.h264.io/1.vtt'], parts: whole }])).toEqual([]);
  });
});
