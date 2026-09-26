import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ankiCall } from '../rpc';
import {
  MATURE_DAYS, NOTES_PER_REQUEST, buildStatusMap, deckQuery, lemmaReading, loadOverrides, setOverride,
} from '../status';

vi.mock('../rpc', () => ({ ankiCall: vi.fn() }));

/*
 * A collection, and an AnkiConnect that answers the searches the status layer
 * sends the way Anki would. The searches are the contract: if the code starts
 * asking something else, the fake refuses rather than guessing.
 */
interface Card { ivl: number; isNew?: boolean; suspended?: boolean }
interface Note { id: number; deck: string; tags?: string[]; fields: Record<string, string>; cards: Card[] }

let notes: Note[] = [];
let notesInfoSizes: number[] = [];

function matches(n: Note, cond: string): boolean {
  switch (cond) {
    case '-is:new': return n.cards.some((c) => !c.isNew);
    case 'is:suspended': return n.cards.some((c) => c.suspended);
    case `prop:ivl>=${MATURE_DAYS}`: return n.cards.some((c) => c.ivl >= MATURE_DAYS);
    case 'tag:libregaku': return (n.tags ?? []).some((t) => t === 'libregaku' || t.startsWith('libregaku::'));
    default: throw new Error(`the fake does not know "${cond}"`);
  }
}

async function anki(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  if (action === 'findNotes') {
    const q = String(params.query);
    const m = /^deck:(\*|"((?:[^"\\]|\\.)*)") (.+)$/.exec(q);
    if (!m) throw new Error(`unparseable search: ${q}`);
    const deck = m[1] === '*' ? null : (m[2] ?? '').replace(/\\(.)/g, '$1');
    return notes
      .filter((n) => deck === null || n.deck === deck || n.deck.startsWith(`${deck}::`))
      .filter((n) => matches(n, m[3] ?? ''))
      .map((n) => n.id);
  }
  if (action === 'notesInfo') {
    const ids = params.notes as number[];
    notesInfoSizes.push(ids.length);
    return ids.map((id) => {
      const n = notes.find((x) => x.id === id);
      if (!n) return {};
      const fields = Object.fromEntries(Object.entries(n.fields).map(([k, v], order) => [k, { value: v, order }]));
      return { noteId: n.id, fields, cards: n.cards.map((_, i) => n.id * 10 + i) };
    });
  }
  throw new Error(`status should not need "${action}"`);
}

let nextId = 1;
function note(expression: string, cards: Card[], extra: Partial<Note> & { reading?: string } = {}): Note {
  const fields: Record<string, string> = { Expression: expression };
  if (extra.reading !== undefined) fields.Reading = extra.reading;
  const n: Note = { id: nextId++, deck: 'Japanese', cards, ...extra, fields: extra.fields ?? fields };
  notes.push(n);
  return n;
}

const reviewed = (ivl: number, more: Partial<Card> = {}): Card => ({ ivl, ...more });
const fresh = (more: Partial<Card> = {}): Card => ({ ivl: 0, isNew: true, ...more });

/* chrome.storage, asynchronous like the real one and handing out copies. */
let local: Record<string, unknown> = {};
let sync: Record<string, unknown> = {};
const tick = () => new Promise((r) => setTimeout(r, 0));
const pick = (area: Record<string, unknown>, keys: string | string[]) =>
  Object.fromEntries((Array.isArray(keys) ? keys : [keys]).filter((k) => k in area).map((k) => [k, structuredClone(area[k])]));
const storage = {
  local: {
    get: vi.fn(async (keys: string | string[]) => { await tick(); return pick(local, keys); }),
    set: vi.fn(async (patch: Record<string, unknown>) => { await tick(); Object.assign(local, structuredClone(patch)); }),
  },
  sync: {
    get: vi.fn(async (keys: string | string[]) => { await tick(); return pick(sync, keys); }),
    set: vi.fn(async (patch: Record<string, unknown>) => { Object.assign(sync, patch); }),
    remove: vi.fn(async (key: string) => { delete sync[key]; }),
  },
};
vi.stubGlobal('chrome', { storage });

beforeEach(() => {
  notes = [];
  notesInfoSizes = [];
  nextId = 1;
  local = {};
  sync = {};
  vi.mocked(ankiCall).mockReset().mockImplementation(anki as typeof ankiCall);
  for (const area of [storage.local, storage.sync]) for (const fn of Object.values(area)) fn.mockClear();
});

describe('MATURE_DAYS', () => {
  it("matches Anki's own definition of a mature card", () => {
    expect(MATURE_DAYS).toBe(21);
  });
});

describe('Anki-derived status', () => {
  it('follows a card from learning to mature, and forgets a deleted card', async () => {
    const n = note('食べる', [reviewed(1)]);
    expect((await buildStatusMap('')).get('食べる')).toBe('learning');
    n.cards = [reviewed(MATURE_DAYS)];
    expect((await buildStatusMap('')).get('食べる')).toBe('known');
    notes = [];
    expect((await buildStatusMap('')).get('食べる')).toBe('unknown');
  });

  it('reads an unreviewed card in a premade deck as unknown, and never fetches it', async () => {
    // Import Core 6k, study 300: the other 5,700 were showing as "learning".
    note('猫', [fresh()], { deck: 'Core 6k' });
    const status = await buildStatusMap('');
    expect(status.get('猫')).toBe('unknown');
    expect(notesInfoSizes).toEqual([]);
  });

  it('reads a word mined with Libregaku as learning from the moment it is added', async () => {
    note('分かる', [fresh()], { tags: ['libregaku', 'libregaku::youtube'] });
    expect((await buildStatusMap('')).get('分かる')).toBe('learning');
  });

  it('takes a suspended card from its interval, never reading it as ignored', async () => {
    // Suspended leeches were vanishing, and so were decks suspended and
    // released a few cards at a time.
    note('犬', [reviewed(40, { suspended: true })]);
    note('鳥', [reviewed(3, { suspended: true })]);
    note('魚', [fresh({ suspended: true })]);
    const status = await buildStatusMap('');
    expect(status.get('犬')).toBe('known');
    expect(status.get('鳥')).toBe('learning');
    expect(status.get('魚')).toBe('unknown');
  });

  it('lets the most mature card decide, and never downgrades a word known in another note', async () => {
    note('見る', [fresh(), reviewed(30)]);
    note('聞く', [reviewed(2)]);
    note('聞く', [reviewed(50)], { deck: 'Other' });
    const status = await buildStatusMap('');
    expect(status.get('見る')).toBe('known');
    expect(status.get('聞く')).toBe('known');
  });

  it(`reads notes ${NOTES_PER_REQUEST} at a time rather than all at once`, async () => {
    for (let i = 0; i < 2500; i++) note(`語${i}`, [reviewed(1)]);
    const status = await buildStatusMap('');
    expect(notesInfoSizes).toEqual([1000, 1000, 500]);
    expect(status.size).toBe(2500);
  });

  it('skips a note deleted between the search and the read', async () => {
    note('消える', [reviewed(1)]);
    const real = anki;
    vi.mocked(ankiCall).mockImplementation((async (action: string, params?: Record<string, unknown>) =>
      action === 'notesInfo' ? [{}] : real(action, params)) as typeof ankiCall);
    await expect(buildStatusMap('')).resolves.toMatchObject({ size: 0 });
  });

  it('asks Anki only searches and note fields — never card data', async () => {
    note('食べる', [reviewed(30)]);
    await buildStatusMap('');
    const actions = vi.mocked(ankiCall).mock.calls.map(([a]) => a);
    expect(new Set(actions)).toEqual(new Set(['findNotes', 'notesInfo']));
  });
});

describe('deck scope', () => {
  it('reads the whole collection when no deck is chosen', () => {
    expect(deckQuery('')).toBe('deck:*');
  });

  it("escapes quotes, backslashes and Anki's * and _ wildcards", () => {
    expect(deckQuery('Core_2k "N5" \\ *')).toBe('deck:"Core\\_2k \\"N5\\" \\\\ \\*"');
  });

  it('keeps :: so a parent deck covers its subdecks', async () => {
    note('本', [reviewed(1)], { deck: 'Japanese::Mining' });
    note('車', [reviewed(1)], { deck: 'Spanish' });
    const status = await buildStatusMap('Japanese');
    expect(status.get('本')).toBe('learning');
    expect(status.get('車')).toBe('unknown');
  });

  it('finds a deck whose name has a quote and an underscore in it', async () => {
    note('空', [reviewed(1)], { deck: 'Anime "Frieren"_S1' });
    note('海', [reviewed(1)], { deck: 'Anime "Frieren"XS1' });
    const status = await buildStatusMap('Anime "Frieren"_S1');
    expect(status.get('空')).toBe('learning');
    expect(status.get('海')).toBe('unknown');
  });
});

describe('kana and kanji', () => {
  it('matches a word written in kana to a card written in kanji, by its reading', async () => {
    note('分かる', [reviewed(30)], { reading: 'わかる' });
    const status = await buildStatusMap('');
    expect(status.get('わかる')).toBe('known');
    expect(status.get('ワカル')).toBe('known');
  });

  it("reads our own note type's bracket furigana as the reading", async () => {
    note('分かる', [reviewed(2)], { reading: '分[わ]かる' });
    note('取り引き', [reviewed(2)], { reading: '取[と]り 引[ひ]き' });
    const status = await buildStatusMap('');
    expect(status.get('わかる')).toBe('learning');
    expect(status.get('とりひき')).toBe('learning');
  });

  it('reads furigana written into the expression field itself', async () => {
    note('分[わ]かる', [reviewed(30)]);
    const status = await buildStatusMap('');
    expect(status.get('分かる')).toBe('known');
    expect(status.get('わかる')).toBe('known');
  });

  it('matches a word in kanji to a card written only in kana, when the reading is given', async () => {
    note('できる', [reviewed(4)]);
    const status = await buildStatusMap('');
    expect(status.get('出来る', 'できる')).toBe('learning');
    expect(status.get('出来る', 'デキル')).toBe('learning');
    // Without the reading there is nothing to go on but the spelling.
    expect(status.get('出来る')).toBe('unknown');
  });

  it('never matches two different kanji spellings on their reading', async () => {
    note('紙', [reviewed(30)], { reading: 'かみ' });
    const status = await buildStatusMap('');
    expect(status.get('紙')).toBe('known');
    expect(status.get('神', 'かみ')).toBe('unknown');
    expect(status.get('神')).toBe('unknown');
  });

  it('ignores a reading field that does not belong to the word', async () => {
    note('食べる', [reviewed(30)], { reading: 'わかる' });
    expect((await buildStatusMap('')).get('わかる')).toBe('unknown');
  });

  it('finds the word and reading fields whatever their case', async () => {
    note('', [reviewed(30)], { fields: { word: '<b>分かる</b>', reading: 'わかる' } });
    const status = await buildStatusMap('');
    expect(status.get('分かる')).toBe('known');
    expect(status.get('わかる')).toBe('known');
  });

  it('reads escaped text back as text, never as furigana', async () => {
    // What addSentence now stores for a line with brackets in it.
    note('ねえ&#91;笑&#93;', [reviewed(1)], { tags: ['libregaku'] });
    const status = await buildStatusMap('');
    expect(status.get('ねえ[笑]')).toBe('learning');
    expect(status.get('ねえ')).toBe('unknown');
  });
});

describe('lemmaReading', () => {
  it('turns the reading of an inflected surface into the reading of its dictionary form', () => {
    expect(lemmaReading('食べる', '食べた', 'タベタ')).toBe('たべる');
    expect(lemmaReading('行く', '行った', 'イッタ')).toBe('いく');
    expect(lemmaReading('勉強する', '勉強した', 'ベンキョウシタ')).toBe('べんきょうする');
    expect(lemmaReading('出来る', '出来なかった', 'デキナカッタ')).toBe('できる');
  });

  it('knows the one verb whose kanji changes its reading', () => {
    expect(lemmaReading('来る', '来た', 'キタ')).toBe('くる');
  });

  it('passes an uninflected reading straight through, in hiragana', () => {
    expect(lemmaReading('綺麗', '綺麗', 'キレイ')).toBe('きれい');
  });

  it('gives up rather than guess', () => {
    expect(lemmaReading('食べる', '食べた')).toBeUndefined();
    expect(lemmaReading('分かる', '判った', 'ワカッタ')).toBeUndefined();
    expect(lemmaReading('食べる', '食べた', 'tabeta')).toBeUndefined();
  });
});

describe('hand marks', () => {
  it('keeps marks in local storage, not sync, whose 8 KB item limit a few hundred marks exhausted', async () => {
    expect(await setOverride('猫', 'known')).toBe(true);
    expect(local['libregaku.overrides']).toEqual({ 猫: 'known' });
    expect(storage.sync.set).not.toHaveBeenCalled();
    expect(await loadOverrides()).toEqual(new Map([['猫', 'known']]));
  });

  it('brings the old sync item over once, dropping legacy learning values, then removes it', async () => {
    sync['libregaku.overrides'] = { 食べる: 'learning', 猫: 'known', 犬: 'ignored' };
    expect(await loadOverrides()).toEqual(new Map([['猫', 'known'], ['犬', 'ignored']]));
    expect(local['libregaku.overrides']).toEqual({ 猫: 'known', 犬: 'ignored' });
    expect(local['libregaku.overrides.migrated']).toBe(true);
    expect(sync['libregaku.overrides']).toBeUndefined();
  });

  it('lets a mark written locally win over the sync copy', async () => {
    sync['libregaku.overrides'] = { 猫: 'known' };
    local['libregaku.overrides'] = { 猫: 'ignored' };
    expect((await loadOverrides()).get('猫')).toBe('ignored');
  });

  it('never brings back a cleared mark, even when the sync copy could not be removed', async () => {
    sync['libregaku.overrides'] = { 猫: 'known' };
    storage.sync.remove.mockRejectedValueOnce(new Error('sync unavailable'));
    expect(await setOverride('猫', null)).toBe(true);
    expect(sync['libregaku.overrides']).toEqual({ 猫: 'known' });
    expect(await loadOverrides()).toEqual(new Map());
  });

  it('reports a write that failed instead of swallowing it', async () => {
    storage.local.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    local['libregaku.overrides.migrated'] = true;
    expect(await setOverride('猫', 'known')).toBe(false);
  });

  it('never writes back a map it failed to read, which would erase every other mark', async () => {
    local = { 'libregaku.overrides': { 犬: 'ignored' }, 'libregaku.overrides.migrated': true };
    storage.local.get.mockRejectedValueOnce(new Error('storage unavailable'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await setOverride('猫', 'known')).toBe(false);
    expect(local['libregaku.overrides']).toEqual({ 犬: 'ignored' });
  });

  it('does not let two quick marks overwrite each other', async () => {
    const both = await Promise.all([setOverride('猫', 'known'), setOverride('犬', 'ignored')]);
    expect(both).toEqual([true, true]);
    expect(local['libregaku.overrides']).toEqual({ 猫: 'known', 犬: 'ignored' });
  });
});
