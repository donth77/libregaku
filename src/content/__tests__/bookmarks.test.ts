import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The store is the only part of saved lines that outlives a page, so it is the
 * part worth pinning down: identity across visits, and the promise that a save
 * and an unsave are the same gesture.
 */

let area: Record<string, unknown> = {};

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: area[key] }),
      set: async (patch: Record<string, unknown>) => {
        Object.assign(area, patch);
      },
    },
    onChanged: { addListener: () => {} },
  },
});

const load = async () => {
  vi.resetModules();
  return import('../bookmarks');
};

const line = (start: number, text: string) => ({
  id: '',
  site: 'netflix',
  video: '81234',
  title: 'Episode 1',
  url: 'https://www.netflix.com/watch/81234',
  text,
  start,
  end: start + 2,
  lang: 'ja',
  savedAt: 1000,
});

beforeEach(() => {
  area = {};
});

describe('saved lines', () => {
  it('gives a line the same id on every visit', async () => {
    const bm = await load();
    expect(bm.idFor('netflix', '81234', 12.34)).toBe('netflix:81234:12340');
    // Re-opening a video must recognise its own saves, so the id cannot carry
    // anything about *when* it was made.
    expect(bm.idFor('netflix', '81234', 12.34)).toBe(bm.idFor('netflix', '81234', 12.34));
  });

  it('saves, reports, and unsaves with one gesture', async () => {
    const bm = await load();
    const one = { ...line(10, 'これは'), id: bm.idFor('netflix', '81234', 10) };

    expect(await bm.toggle(one)).toBe(true);
    expect(await bm.has(one.id)).toBe(true);

    expect(await bm.toggle(one)).toBe(false);
    expect(await bm.has(one.id)).toBe(false);
  });

  it('does not duplicate a line saved twice', async () => {
    const bm = await load();
    const one = { ...line(10, 'これは'), id: bm.idFor('netflix', '81234', 10) };
    await bm.add(one);
    await bm.add(one);
    expect((await bm.list())).toHaveLength(1);
  });

  it('returns one video’s lines in spoken order', async () => {
    const bm = await load();
    for (const t of [30, 10, 20]) {
      await bm.add({ ...line(t, `line ${t}`), id: bm.idFor('netflix', '81234', t) });
    }
    await bm.add({ ...line(5, 'elsewhere'), id: bm.idFor('youtube', 'abc', 5), site: 'youtube', video: 'abc' });

    const mine = await bm.forVideo('netflix', '81234');
    expect(mine.map((b) => b.start)).toEqual([10, 20, 30]);
  });

  it('groups by video, most recently saved video first', async () => {
    const bm = await load();
    await bm.add({ ...line(10, 'old'), id: 'a', site: 'netflix', video: 'v1', savedAt: 100 });
    await bm.add({ ...line(20, 'new'), id: 'b', site: 'youtube', video: 'v2', savedAt: 900 });
    await bm.add({ ...line(5, 'older same video'), id: 'c', site: 'netflix', video: 'v1', savedAt: 50 });

    const groups = await bm.grouped();
    expect(groups.map((g) => g.video)).toEqual(['v2', 'v1']);
    // Inside a group the lines read like a shortened transcript.
    expect(groups[1]!.lines.map((b) => b.start)).toEqual([5, 10]);
  });

  it('survives a reload by reading back what was written', async () => {
    const first = await load();
    await first.add({ ...line(10, 'kept'), id: 'k' });

    const second = await load();      // fresh module, cold cache
    expect((await second.list()).map((b) => b.text)).toEqual(['kept']);
  });
});
