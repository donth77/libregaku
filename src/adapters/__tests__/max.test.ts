import { describe, expect, it } from 'vitest';
import { asTracks, watchIdOf } from '../max';

const url = (n: number): string => `https://x.cf.prd.media.h264.io/gcs/a/t/h/t6/${n}.vtt`;

describe('watchIdOf', () => {
  it('reads the id from a watch page, and nothing from any other', () => {
    expect(watchIdOf('/video/watch/8779f57f-dc7f-4bfd-8ce2-6ed41044519f')).toBe('8779f57f-dc7f-4bfd-8ce2-6ed41044519f');
    expect(watchIdOf('/show/7888496f')).toBeNull();
  });
});

describe('asTracks', () => {
  it('gives each track a stable id by language and kind, and marks captions and forced', () => {
    const got = asTracks([
      { language: 'zh-Hans-CN', role: 'subtitle', label: 'zh-Hans-CN', urls: [url(1)] },
      { language: 'en-US', role: 'caption', label: 'en-US', urls: [url(1)] },
      { language: 'es-419', role: 'forced-subtitle', label: 'es-419', urls: [url(1)] },
      { language: 'zh-Hans-CN', role: 'subtitle', label: 'again', urls: [url(2)] },
    ]);
    expect(got.map((t) => t.id)).toEqual(['zh-Hans-CN:sub:0', 'en-US:cc:0', 'es-419:forced:0', 'zh-Hans-CN:sub:1']);
    expect([got[1]?.cc, got[2]?.forced]).toEqual([true, true]);
  });

  it('drops a track with any segment not on a Max host', () => {
    expect(asTracks([{ language: 'ja', role: 'subtitle', label: 'ja', urls: [url(1), 'https://evil.example/2.vtt'] }])).toEqual([]);
    expect(asTracks([{ language: 'ja', role: 'subtitle', label: 'ja', urls: ['http://x.h264.io/1.vtt'] }])).toEqual([]);
  });
});
