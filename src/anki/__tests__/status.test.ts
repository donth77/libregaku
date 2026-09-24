import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ankiCall } from '../rpc';
import { buildStatusMap, loadOverrides, MATURE_DAYS, setOverride } from '../status';

vi.mock('../rpc', () => ({ ankiCall: vi.fn() }));

let stored: Record<string, unknown> = {};
vi.stubGlobal('chrome', {
  storage: {
    sync: {
      get: async (key: string) => ({ [key]: stored[key] }),
      set: async (patch: Record<string, unknown>) => { Object.assign(stored, patch); },
    },
  },
});

beforeEach(() => {
  stored = {};
  vi.mocked(ankiCall).mockReset();
});

function collection(interval: number): void {
  vi.mocked(ankiCall)
    .mockResolvedValueOnce([1])
    .mockResolvedValueOnce([{ noteId: 1, cards: [2], fields: { Expression: { value: '食べる' } } }])
    .mockResolvedValueOnce([{ note: 1, interval, queue: 2 }]);
}

describe('MATURE_DAYS', () => {
  it("matches Anki's own definition of a mature card", () => {
    expect(MATURE_DAYS).toBe(21);
  });
});

describe('Anki-derived status', () => {
  it('follows a card from learning to mature, and forgets a deleted card', async () => {
    collection(1);
    expect((await buildStatusMap('')).get('食べる')).toBe('learning');
    collection(MATURE_DAYS);
    expect((await buildStatusMap('')).get('食べる')).toBe('known');
    vi.mocked(ankiCall).mockResolvedValueOnce([]);
    expect((await buildStatusMap('')).get('食べる')).toBe('unknown');
  });

  it('ignores legacy learning overrides so Anki can report maturity', async () => {
    stored['libregaku.overrides'] = { 食べる: 'learning' };
    collection(42);
    const status = await buildStatusMap('');
    const overrides = await loadOverrides();
    expect(overrides.get('食べる') ?? status.get('食べる')).toBe('known');
  });

  it('keeps deliberate manual marks and removes legacy learning values on the next write', async () => {
    stored['libregaku.overrides'] = { 食べる: 'learning', 猫: 'known', 犬: 'ignored' };
    await setOverride('見る', 'tracking');
    expect(stored['libregaku.overrides']).toEqual({ 猫: 'known', 犬: 'ignored', 見る: 'tracking' });
    await setOverride('猫', null);
    expect(await loadOverrides()).toEqual(new Map([['犬', 'ignored'], ['見る', 'tracking']]));
  });
});
