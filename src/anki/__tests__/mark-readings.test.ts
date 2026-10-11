import { beforeEach, describe, expect, it, vi } from 'vitest';

const local: Record<string, unknown> = {};

beforeEach(() => {
  vi.resetModules();
  for (const k of Object.keys(local)) delete local[k];
  const get = async (keys: string | string[]): Promise<Record<string, unknown>> =>
    Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter((k) => k in local).map((k) => [k, local[k]]));
  vi.stubGlobal('chrome', {
    storage: {
      local: { get, set: async (o: Record<string, unknown>) => void Object.assign(local, o), remove: async () => {} },
      sync: { get: async () => ({}), remove: async () => {} },
    },
  });
});

describe('how marked words are read', () => {
  it('is not kept by marking: only the page, having checked it, keeps one', async () => {
    const { loadMarkReadings, setMark } = await import('../marks');
    expect(await setMark('ja', '行く', 'known', 'イク')).toBe(true);
    expect((await loadMarkReadings('ja')).size).toBe(0);
  });

  it('is kept when the page finds it later, and only if it is kana', async () => {
    const { keepMarkReading, loadMarkReadings, setMark } = await import('../marks');
    await setMark('ja', '全部', 'known');
    expect((await loadMarkReadings('ja')).size).toBe(0);
    await keepMarkReading('ja', '全部', 'ぜんぶ');
    await keepMarkReading('ja', '全国', 'zenkoku');
    expect([...(await loadMarkReadings('ja'))]).toEqual([['全部', 'ぜんぶ']]);
  });
});
