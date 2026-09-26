import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ankiCall, ankiTry } from '../rpc';
import { countOurCards } from '../client';
import { RELAYED_ACTIONS } from '../direct';
import { MARK_DECK, MARK_FIELDS, MARK_MODEL_NAME } from '../model';
import { loadOverrides, pendingMarks, setMark, syncMarks } from '../marks';
import { FakeAnki, FakeStorage, type FakeNote } from './fake-anki';

vi.mock('../rpc', async () => {
  const { AnkiUnavailable } = await vi.importActual<typeof import('../rpc')>('../rpc');
  return { AnkiUnavailable, ankiCall: vi.fn(), ankiTry: vi.fn() };
});

/**
 * Hand marks, kept in Anki as suspended notes of their own and cached here.
 * The page never waits on Anki; a sync writes what is queued and reads every
 * mark back, and what Anki holds is what every device then sees.
 */

const fake = new FakeAnki();
const store = new FakeStorage();
vi.stubGlobal('chrome', { storage: store.api });

const PENDING = 'libregaku.marks.pending';
const CACHE = 'libregaku.overrides';

/** A mark as another device would have left it in Anki. */
function ankiMark(word: string, status: string, more: Partial<FakeNote> = {}): FakeNote {
  fake.models[MARK_MODEL_NAME] ??= [...MARK_FIELDS];
  fake.decks.add(MARK_DECK);
  return fake.add({ Word: word, Reading: '' }, {
    model: MARK_MODEL_NAME, deck: MARK_DECK, tags: ['libregaku', `libregaku::mark::${status}`],
    cards: [{ suspended: true }], ...more,
  });
}

const marksInAnki = () => new Map(fake.notes
  .filter((n) => n.model === MARK_MODEL_NAME)
  .map((n) => [n.fields.Word, n.tags.filter((t) => t.startsWith('libregaku::mark::')).map((t) => t.slice(17))]));
const sent = (action: string) => fake.calls.filter((c) => c.action === action);

beforeEach(async () => {
  fake.notes = [];
  fake.calls = [];
  fake.models = { Libregaku: fake.models.Libregaku ?? [] };
  fake.decks = new Set(['Default']);
  fake.offline = false;
  fake.onCall = null;
  fake.refuseWords.clear();
  fake.addNotesFailures = 'throw';
  store.reset();
  // Past the one-time move out of sync storage, as any install by now is.
  store.local['libregaku.overrides.migrated'] = true;
  vi.mocked(ankiCall).mockReset().mockImplementation(fake.call as typeof ankiCall);
  vi.mocked(ankiTry).mockReset().mockImplementation(fake.try as typeof ankiTry);
});

describe('marking', () => {
  it('updates the cache and the queue at once, without asking Anki', async () => {
    expect(await setMark('猫', 'known')).toBe(true);
    expect(store.local[CACHE]).toEqual({ 猫: 'known' });
    expect(store.local[PENDING]).toMatchObject({ 猫: { status: 'known' } });
    expect(fake.calls).toEqual([]);
    expect(await pendingMarks()).toBe(1);
    expect(await loadOverrides()).toEqual(new Map([['猫', 'known']]));
  });

  it('keeps the reading, in hiragana, for the note it will become', async () => {
    await setMark('分かる', 'known', 'ワカル');
    expect(store.local[PENDING]).toMatchObject({ 分かる: { status: 'known', reading: 'わかる' } });
  });

  it('queues nothing for clearing a word that was never marked', async () => {
    // Adding a card clears the word's mark, marked or not.
    expect(await setMark('猫', null)).toBe(true);
    expect(await pendingMarks()).toBe(0);
  });

  it('resolves false only when browser storage refuses', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.api.local.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    expect(await setMark('猫', 'known')).toBe(false);
  });
});

describe('syncing with Anki', () => {
  it('returns null, and keeps every queued mark, when Anki cannot be reached', async () => {
    await setMark('猫', 'known');
    fake.offline = true;
    expect(await syncMarks()).toBeNull();
    expect(await pendingMarks()).toBe(1);
    expect(await loadOverrides()).toEqual(new Map([['猫', 'known']]));
  });

  it('writes the queue in one call per kind of change, and suspends what it adds', async () => {
    // Two marks Anki already holds, which this browser has seen.
    const changed = ankiMark('犬', 'known');
    const cleared = ankiMark('鳥', 'ignored');
    store.local[CACHE] = { 犬: 'known', 鳥: 'ignored' };
    store.local['libregaku.marks.migrated'] = true;
    // Three new, one changed, one cleared.
    for (const [w, s] of [['猫', 'known'], ['魚', 'ignored'], ['虫', 'tracking']] as const) await setMark(w, s);
    await setMark('犬', 'tracking');
    await setMark('鳥', null);

    const result = await syncMarks();
    expect(result).toEqual({
      marks: new Map([['犬', 'tracking'], ['猫', 'known'], ['魚', 'ignored'], ['虫', 'tracking']]),
      pending: 0,
    });
    expect(sent('addNotes')).toHaveLength(1);
    expect((sent('addNotes')[0]?.params.notes as unknown[]).length).toBe(3);
    expect(sent('addTags').map((c) => c.params)).toEqual([{ notes: [changed.id], tags: 'libregaku libregaku::mark::tracking' }]);
    expect(sent('removeTags')).toHaveLength(1);
    expect(sent('deleteNotes').map((c) => c.params)).toEqual([{ notes: [cleared.id] }]);
    // Every mark card is suspended: nothing here ever enters review.
    expect(fake.find(`note:"${MARK_MODEL_NAME}" -is:suspended`)).toEqual([]);
    expect(fake.notes.filter((n) => n.model === MARK_MODEL_NAME).every((n) => n.deck === MARK_DECK)).toBe(true);
    expect(marksInAnki()).toEqual(new Map([['犬', ['tracking']], ['猫', ['known']], ['魚', ['ignored']], ['虫', ['tracking']]]));
    expect(await pendingMarks()).toBe(0);
  });

  it('sends Anki nothing the service worker would refuse', async () => {
    ankiMark('犬', 'known');
    ankiMark('鳥', 'ignored');
    store.local[CACHE] = { 犬: 'known', 鳥: 'ignored' };
    await setMark('猫', 'known');
    await setMark('犬', 'tracking');
    await setMark('鳥', null);
    await syncMarks();
    expect(fake.calls.map((c) => c.action).filter((a) => !RELAYED_ACTIONS.has(a))).toEqual([]);
  });

  it('splits a long queue into batches of 500', async () => {
    for (let i = 0; i < 600; i++) await setMark(`語${i}`, 'ignored');
    await syncMarks();
    expect(sent('addNotes').map((c) => (c.params.notes as unknown[]).length)).toEqual([500, 100]);
    expect(marksInAnki().size).toBe(600);
  });

  it('installs the note type and the deck on first use, and checks the note type fits', async () => {
    await setMark('猫', 'known');
    await syncMarks();
    expect(fake.models[MARK_MODEL_NAME]).toEqual(['Word', 'Reading']);
    expect(fake.decks.has(MARK_DECK)).toBe(true);
  });

  it('brings in a mark made on another device', async () => {
    ankiMark('犬', 'tracking');
    expect((await syncMarks())?.marks).toEqual(new Map([['犬', 'tracking']]));
    expect(await loadOverrides()).toEqual(new Map([['犬', 'tracking']]));
  });

  it('drops a mark whose note was deleted in Anki', async () => {
    await setMark('猫', 'known');
    await syncMarks();
    fake.notes = fake.notes.filter((n) => n.fields.Word !== '猫');
    expect((await syncMarks())?.marks).toEqual(new Map());
    expect(await loadOverrides()).toEqual(new Map());
  });

  it('lets a change queued here win over what Anki holds', async () => {
    ankiMark('猫', 'known');
    store.local[CACHE] = { 猫: 'known' };
    await setMark('猫', 'ignored');
    expect((await syncMarks())?.marks.get('猫')).toBe('ignored');
    expect(marksInAnki().get('猫')).toEqual(['ignored']);
  });

  it('keeps a mark made while a sync was writing, for the next one', async () => {
    await setMark('猫', 'known');
    fake.onCall = async (action) => {
      if (action === 'addNotes') {
        fake.onCall = null;
        await setMark('鳥', 'tracking');
      }
    };
    const first = await syncMarks();
    expect(first?.marks).toEqual(new Map([['猫', 'known'], ['鳥', 'tracking']]));
    expect(first?.pending).toBe(1);
    expect((await syncMarks())?.pending).toBe(0);
    expect(marksInAnki().get('鳥')).toEqual(['tracking']);
  });

  it('clears a mark by deleting its note', async () => {
    await setMark('猫', 'known');
    await syncMarks();
    await setMark('猫', null);
    await syncMarks();
    expect(marksInAnki().has('猫')).toBe(false);
    expect(await loadOverrides()).toEqual(new Map());
  });

  it('keeps the newest of two notes for one word, and deletes the other', async () => {
    // Two devices marked 猫 while offline; Anki's sync then holds both.
    const older = ankiMark('猫', 'known', { mod: 100 });
    ankiMark('猫', 'ignored', { mod: 200 });
    expect((await syncMarks())?.marks.get('猫')).toBe('ignored');
    expect(sent('deleteNotes').map((c) => c.params)).toEqual([{ notes: [older.id] }]);
    expect(marksInAnki()).toEqual(new Map([['猫', ['ignored']]]));
  });

  it('runs one sync at a time, and one more for anything asked meanwhile', async () => {
    await setMark('猫', 'known');
    const [a, b] = await Promise.all([syncMarks(), syncMarks()]);
    expect(a?.pending).toBe(0);
    expect(b?.pending).toBe(0);
    expect(sent('addNotes')).toHaveLength(1);
  });
});

describe('the first sync', () => {
  it('hands Anki every mark this browser already had, except where Anki has the word', async () => {
    store.local[CACHE] = { 猫: 'known', 犬: 'ignored' };
    ankiMark('犬', 'tracking');
    const result = await syncMarks();
    expect(result?.marks).toEqual(new Map([['猫', 'known'], ['犬', 'tracking']]));
    expect(marksInAnki()).toEqual(new Map([['猫', ['known']], ['犬', ['tracking']]]));
    expect(store.local['libregaku.marks.migrated']).toBe(true);
  });

  it('does it once: a mark deleted in Anki afterwards stays deleted', async () => {
    store.local[CACHE] = { 猫: 'known' };
    await syncMarks();
    fake.notes = [];
    expect((await syncMarks())?.marks).toEqual(new Map());
    expect(sent('addNotes')).toHaveLength(1);
  });

  it('keeps what it queued when Anki goes away before writing it', async () => {
    store.local[CACHE] = { 猫: 'known' };
    fake.onCall = (action) => {
      // Anki quits just before the notes are sent.
      if (action === 'createDeck') fake.offline = true;
    };
    expect(await syncMarks()).toBeNull();
    expect(marksInAnki().size).toBe(0);
    expect(store.local[PENDING]).toMatchObject({ 猫: { status: 'known' } });
    expect(store.local['libregaku.marks.migrated']).toBe(true);
    fake.offline = false;
    fake.onCall = null;
    expect((await syncMarks())?.pending).toBe(0);
    expect(marksInAnki()).toEqual(new Map([['猫', ['known']]]));
  });
});

describe('when Anki refuses', () => {
  it('keeps the queue and says what to do about a mark note type edited out of shape', async () => {
    fake.models[MARK_MODEL_NAME] = ['Word'];
    await setMark('猫', 'known');
    const result = await syncMarks();
    expect(result?.error).toContain('Reading');
    expect(result?.error).toContain('Manage Note Types');
    expect(result?.pending).toBe(1);
    expect(result?.marks).toEqual(new Map([['猫', 'known']]));
    expect(sent('addNotes')).toEqual([]);
  });

  it('writes the rest when Anki refuses one note, and keeps that one queued', async () => {
    for (const w of ['猫', '犬', '鳥']) await setMark(w, 'known');
    fake.refuseWords.add('犬');
    const result = await syncMarks();
    expect(result?.error).toContain('犬');
    expect(result?.pending).toBe(1);
    expect(store.local[PENDING]).toMatchObject({ 犬: { status: 'known' } });
    expect(marksInAnki()).toEqual(new Map([['猫', ['known']], ['鳥', ['known']]]));
  });

  it('reads the outcome back rather than trusting how an older AnkiConnect reports it', async () => {
    fake.addNotesFailures = 'null';
    for (const w of ['猫', '犬']) await setMark(w, 'known');
    fake.refuseWords.add('犬');
    const result = await syncMarks();
    expect(result?.pending).toBe(1);
    expect(result?.error).toContain('did not add 1');
  });

  it('keeps the queue when the marks cannot be read back', async () => {
    await setMark('猫', 'known');
    let searches = 0;
    fake.onCall = (action) => {
      if (action === 'findNotes' && ++searches === 2) throw new Error('collection is not available');
    };
    const result = await syncMarks();
    expect(result?.error).toBe('collection is not available');
    expect(result?.pending).toBe(1);
    expect(result?.marks).toEqual(new Map([['猫', 'known']]));
  });
});

describe('what counts as our cards', () => {
  it('leaves hand marks out of the cards the extension made', async () => {
    ankiMark('猫', 'known');
    fake.add({ Expression: '犬' }, { tags: ['libregaku'] });
    expect(await countOurCards()).toBe(1);
  });
});
