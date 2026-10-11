import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ankiCall, ankiTry } from '../rpc';
import { countOurCards } from '../client';
import { RELAYED_ACTIONS } from '../direct';
import { MARK_DECK, MARK_FIELDS, MARK_MODEL_NAME, markDeck } from '../model';
import { loadOverrides, marksIn, pendingMarks, setMark, syncMarks } from '../marks';
import { FakeAnki, FakeStorage, type FakeNote } from './fake-anki';

vi.mock('../rpc', async () => {
  const { AnkiUnavailable } = await vi.importActual<typeof import('../rpc')>('../rpc');
  return { AnkiUnavailable, ankiCall: vi.fn(), ankiTry: vi.fn() };
});

/**
 * Hand marks, kept in Anki as suspended notes of their own and cached here.
 * The page never waits on Anki; a sync writes what is queued and reads every
 * mark back, and what Anki holds is what every device then sees. Each mark is
 * in one language, and no language sees another's.
 */

const fake = new FakeAnki();
const store = new FakeStorage();
vi.stubGlobal('chrome', { storage: store.api });

const QUEUE = 'libregaku.marks.pending.byLanguage';
const CACHE = 'libregaku.marks.byLanguage';
const SEEDED = 'libregaku.marks.migrated';
/** Where marks were kept before each had a language: word → status, and word → change. */
const OLD_CACHE = 'libregaku.overrides';
const OLD_QUEUE = 'libregaku.marks.pending';
const SYNC_IMPORTED = 'libregaku.overrides.migrated';

/** A mark as another device would have left it in Anki: its language a tag, in that language's deck. */
function ankiMark(word: string, status: string, more: Partial<FakeNote> & { lang?: string } = {}): FakeNote {
  const { lang = 'ja', ...rest } = more;
  fake.models[MARK_MODEL_NAME] ??= [...MARK_FIELDS];
  fake.decks.add(MARK_DECK).add(markDeck(lang));
  return fake.add({ Word: word, Reading: '' }, {
    model: MARK_MODEL_NAME,
    deck: markDeck(lang),
    tags: ['libregaku', `libregaku::mark::${status}`, `libregaku::lang::${lang}`],
    cards: [{ suspended: true }],
    ...rest,
  });
}

/** One made before marks had a language: no tag for it, in the one deck they all shared. */
function oldMark(word: string, status: string, more: Partial<FakeNote> = {}): FakeNote {
  return ankiMark(word, status, { deck: MARK_DECK, tags: ['libregaku', `libregaku::mark::${status}`], ...more });
}

const markNotes = () => fake.notes.filter((n) => n.model === MARK_MODEL_NAME);
const tagged = (n: FakeNote, prefix: string) => n.tags.filter((t) => t.startsWith(prefix)).map((t) => t.slice(prefix.length));
/** One language's marks as Anki holds them: word → its status tags. */
const marksInAnki = (lang = 'ja') => new Map(markNotes()
  .filter((n) => tagged(n, 'libregaku::lang::').includes(lang))
  .map((n) => [n.fields.Word, tagged(n, 'libregaku::mark::')]));
const noteFor = (word: string, lang = 'ja') =>
  markNotes().find((n) => n.fields.Word === word && tagged(n, 'libregaku::lang::').includes(lang));
const sent = (action: string) => fake.calls.filter((c) => c.action === action);
/** A sync's marks for one language, or nothing when Anki could not be reached. */
const synced = async (lang = 'ja') => {
  const result = await syncMarks(lang);
  return result ? marksIn(result.marks, lang) : null;
};

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
  // Marks already kept by language, and past the one-time move out of sync
  // storage — as any install is once it has run this version.
  store.local[CACHE] = {};
  store.local[QUEUE] = {};
  store.local[SYNC_IMPORTED] = true;
  vi.mocked(ankiCall).mockReset().mockImplementation(fake.call as typeof ankiCall);
  vi.mocked(ankiTry).mockReset().mockImplementation(fake.try as typeof ankiTry);
});

describe('marking', () => {
  it('updates the cache and the queue at once, without asking Anki', async () => {
    expect(await setMark('ja', '猫', 'known')).toBe(true);
    expect(store.local[CACHE]).toEqual({ ja: { 猫: 'known' } });
    expect(store.local[QUEUE]).toMatchObject({ ja: { 猫: { status: 'known' } } });
    expect(fake.calls).toEqual([]);
    expect(await pendingMarks('ja')).toBe(1);
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known']]));
  });

  it('keeps marks in local storage, not sync, whose 8 KB item limit a few hundred marks exhausted', async () => {
    await setMark('ja', '猫', 'known');
    expect(store.api.sync.set).not.toHaveBeenCalled();
  });

  it('keeps the reading, in hiragana, for the note it will become', async () => {
    await setMark('ja', '分かる', 'known', 'ワカル');
    expect(store.local[QUEUE]).toMatchObject({ ja: { 分かる: { status: 'known', reading: 'わかる' } } });
  });

  it('queues nothing for clearing a word that was never marked', async () => {
    // Adding a card clears the word's mark, marked or not.
    expect(await setMark('ja', '猫', null)).toBe(true);
    expect(await pendingMarks('ja')).toBe(0);
  });

  it('resolves false only when browser storage refuses', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    store.api.local.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    expect(await setMark('ja', '猫', 'known')).toBe(false);
  });

  it('never writes back marks it failed to read, which would erase every other one', async () => {
    store.local[CACHE] = { ja: { 犬: 'ignored' } };
    store.api.local.get.mockRejectedValueOnce(new Error('storage unavailable'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await setMark('ja', '猫', 'known')).toBe(false);
    expect(store.local[CACHE]).toEqual({ ja: { 犬: 'ignored' } });
  });

  it('does not let two quick marks overwrite each other', async () => {
    const both = await Promise.all([setMark('ja', '猫', 'known'), setMark('ja', '犬', 'ignored')]);
    expect(both).toEqual([true, true]);
    expect(store.local[CACHE]).toEqual({ ja: { 猫: 'known', 犬: 'ignored' } });
  });
});

describe('a mark belongs to one language', () => {
  it('keeps the same spelling apart in two languages', async () => {
    // 人 is a word of both, and knowing one says nothing about the other.
    await setMark('ja', '人', 'known');
    await setMark('zh', '人', 'tracking');
    await setMark('es', 'gato', 'ignored');
    expect(await loadOverrides('ja')).toEqual(new Map([['人', 'known']]));
    expect(await loadOverrides('zh')).toEqual(new Map([['人', 'tracking']]));
    expect(await loadOverrides('es')).toEqual(new Map([['gato', 'ignored']]));
    expect(await loadOverrides('ko')).toEqual(new Map());
    expect(await pendingMarks('ja')).toBe(3);
  });

  it('clears a mark in one language and leaves the other language its own', async () => {
    await setMark('ja', '人', 'known');
    await setMark('zh', '人', 'tracking');
    await setMark('ja', '人', null);
    expect(await loadOverrides('ja')).toEqual(new Map());
    expect(await loadOverrides('zh')).toEqual(new Map([['人', 'tracking']]));
    // A language with nothing marked is not kept as an empty list.
    expect(store.local[CACHE]).toEqual({ zh: { 人: 'tracking' } });
  });

  it('takes a language code however it is written', async () => {
    await setMark('JA', '猫', 'known');
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known']]));
    expect(store.local[CACHE]).toEqual({ ja: { 猫: 'known' } });
  });

  it('gives each mark its language as a tag, and each language a deck of its own', async () => {
    await setMark('ja', '人', 'known');
    await setMark('zh', '人', 'tracking');
    await setMark('es', 'gato', 'ignored');
    const result = await syncMarks('ja');
    expect(result?.pending).toBe(0);
    expect(result?.marks).toEqual(new Map([
      ['ja', new Map([['人', 'known']])],
      ['zh', new Map([['人', 'tracking']])],
      ['es', new Map([['gato', 'ignored']])],
    ]));
    // Two notes for 人: Anki's duplicate check is kept to the deck, and each language has its own.
    expect(marksInAnki('ja')).toEqual(new Map([['人', ['known']]]));
    expect(marksInAnki('zh')).toEqual(new Map([['人', ['tracking']]]));
    expect(marksInAnki('es')).toEqual(new Map([['gato', ['ignored']]]));
    expect(noteFor('人', 'ja')?.deck).toBe('Libregaku::Marks::JA');
    expect(noteFor('人', 'zh')?.deck).toBe('Libregaku::Marks::ZH');
    expect(noteFor('gato', 'es')?.deck).toBe('Libregaku::Marks::ES');
    expect(sent('addNotes')).toHaveLength(1);
  });

  it('brings in the marks of every language, and shows each only its own', async () => {
    ankiMark('人', 'known');
    ankiMark('人', 'ignored', { lang: 'zh' });
    ankiMark('사람', 'tracking', { lang: 'ko' });
    const result = await syncMarks('zh');
    expect(marksIn(result!.marks, 'zh')).toEqual(new Map([['人', 'ignored']]));
    expect(await loadOverrides('ja')).toEqual(new Map([['人', 'known']]));
    expect(await loadOverrides('ko')).toEqual(new Map([['사람', 'tracking']]));
    // Nothing was a duplicate of anything: three words, three notes.
    expect(sent('deleteNotes')).toEqual([]);
    expect(markNotes()).toHaveLength(3);
  });

  it('changes a mark in one language without touching the same word in another', async () => {
    const ja = ankiMark('人', 'known');
    const zh = ankiMark('人', 'known', { lang: 'zh' });
    store.local[CACHE] = { ja: { 人: 'known' }, zh: { 人: 'known' } };
    store.local[SEEDED] = true;
    await setMark('zh', '人', 'ignored');
    await syncMarks('zh');
    expect(sent('addTags').map((c) => c.params.notes)).toEqual([[zh.id]]);
    expect(marksInAnki('ja')).toEqual(new Map([['人', ['known']]]));
    expect(marksInAnki('zh')).toEqual(new Map([['人', ['ignored']]]));
    await setMark('ja', '人', null);
    await syncMarks('ja');
    expect(sent('deleteNotes').map((c) => c.params)).toEqual([{ notes: [ja.id] }]);
    expect(marksInAnki('zh')).toEqual(new Map([['人', ['ignored']]]));
  });

  it('reads a language tag in whatever capitals Anki keeps it', async () => {
    // Anki keeps a tag as it first met it, so another note's capitals can come back on ours.
    ankiMark('人', 'known', { tags: ['Libregaku', 'Libregaku::Mark::Known', 'Libregaku::Lang::ZH'] });
    expect(await synced('zh')).toEqual(new Map([['人', 'known']]));
    expect(sent('addTags')).toEqual([]);
  });
});

describe('syncing with Anki', () => {
  it('returns null, and keeps every queued mark, when Anki cannot be reached', async () => {
    await setMark('ja', '猫', 'known');
    fake.offline = true;
    expect(await syncMarks('ja')).toBeNull();
    expect(await pendingMarks('ja')).toBe(1);
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known']]));
  });

  it('writes the queue in one call per kind of change, and suspends what it adds', async () => {
    // Two marks Anki already holds, which this browser has seen.
    const changed = ankiMark('犬', 'known');
    const cleared = ankiMark('鳥', 'ignored');
    store.local[CACHE] = { ja: { 犬: 'known', 鳥: 'ignored' } };
    store.local[SEEDED] = true;
    // Three new, one changed, one cleared.
    for (const [w, s] of [['猫', 'known'], ['魚', 'ignored'], ['虫', 'tracking']] as const) await setMark('ja', w, s);
    await setMark('ja', '犬', 'tracking');
    await setMark('ja', '鳥', null);

    const result = await syncMarks('ja');
    expect(result).toEqual({
      marks: new Map([['ja', new Map([['犬', 'tracking'], ['猫', 'known'], ['魚', 'ignored'], ['虫', 'tracking']])]]),
      pending: 0,
    });
    expect(sent('addNotes')).toHaveLength(1);
    expect((sent('addNotes')[0]?.params.notes as unknown[]).length).toBe(3);
    expect(sent('addTags').map((c) => c.params)).toEqual([{ notes: [changed.id], tags: 'libregaku libregaku::mark::tracking' }]);
    expect(sent('removeTags')).toHaveLength(1);
    expect(sent('deleteNotes').map((c) => c.params)).toEqual([{ notes: [cleared.id] }]);
    // Every mark card is suspended: nothing here ever enters review.
    expect(fake.find(`note:"${MARK_MODEL_NAME}" -is:suspended`)).toEqual([]);
    expect(markNotes().every((n) => n.deck === markDeck('ja'))).toBe(true);
    expect(marksInAnki()).toEqual(new Map([['犬', ['tracking']], ['猫', ['known']], ['魚', ['ignored']], ['虫', ['tracking']]]));
    // Nothing to tidy: no mark is in the deck they once shared.
    expect(sent('changeDeck')).toEqual([]);
    expect(await pendingMarks('ja')).toBe(0);
  });

  it('sends Anki nothing the service worker would refuse', async () => {
    ankiMark('犬', 'known');
    ankiMark('鳥', 'ignored');
    oldMark('蛇', 'known');
    store.local[CACHE] = { ja: { 犬: 'known', 鳥: 'ignored', 蛇: 'known' } };
    await setMark('ja', '猫', 'known');
    await setMark('ja', '犬', 'tracking');
    await setMark('ja', '鳥', null);
    await setMark('zh', '猫', 'ignored');
    await syncMarks('ja');
    expect(sent('changeDeck')).not.toEqual([]);
    expect(fake.calls.map((c) => c.action).filter((a) => !RELAYED_ACTIONS.has(a))).toEqual([]);
  });

  it('splits a long queue into batches of 500', async () => {
    // Stored as 600 setMark calls would leave it. Making those calls rewrote
    // the whole queue each time, slow enough on a busy machine to time out, and
    // the loop then ran on into the next tests' storage.
    const words = Array.from({ length: 600 }, (_, i) => `語${i}`);
    store.local[CACHE] = { ja: Object.fromEntries(words.map((w) => [w, 'ignored'])) };
    store.local[QUEUE] = { ja: Object.fromEntries(words.map((w, i) => [w, { status: 'ignored', at: i + 1 }])) };
    await syncMarks('ja');
    expect(sent('addNotes').map((c) => (c.params.notes as unknown[]).length)).toEqual([500, 100]);
    expect(marksInAnki().size).toBe(600);
  });

  it('installs the note type and the deck on first use, and checks the note type fits', async () => {
    await setMark('ja', '猫', 'known');
    await syncMarks('ja');
    expect(fake.models[MARK_MODEL_NAME]).toEqual(['Word', 'Reading']);
    expect(fake.decks.has(MARK_DECK)).toBe(true);
    expect(fake.decks.has('Libregaku::Marks::JA')).toBe(true);
  });

  it('brings in a mark made on another device', async () => {
    ankiMark('犬', 'tracking');
    expect(await synced()).toEqual(new Map([['犬', 'tracking']]));
    expect(await loadOverrides('ja')).toEqual(new Map([['犬', 'tracking']]));
  });

  it('drops a mark whose note was deleted in Anki', async () => {
    await setMark('ja', '猫', 'known');
    await syncMarks('ja');
    fake.notes = fake.notes.filter((n) => n.fields.Word !== '猫');
    expect(await synced()).toEqual(new Map());
    expect(await loadOverrides('ja')).toEqual(new Map());
  });

  it('lets a change queued here win over what Anki holds', async () => {
    ankiMark('猫', 'known');
    store.local[CACHE] = { ja: { 猫: 'known' } };
    await setMark('ja', '猫', 'ignored');
    expect((await synced())?.get('猫')).toBe('ignored');
    expect(marksInAnki().get('猫')).toEqual(['ignored']);
  });

  it('keeps a mark made while a sync was writing, for the next one', async () => {
    await setMark('ja', '猫', 'known');
    fake.onCall = async (action) => {
      if (action === 'addNotes') {
        fake.onCall = null;
        await setMark('ja', '鳥', 'tracking');
      }
    };
    const first = await syncMarks('ja');
    expect(marksIn(first!.marks, 'ja')).toEqual(new Map([['猫', 'known'], ['鳥', 'tracking']]));
    expect(first?.pending).toBe(1);
    expect((await syncMarks('ja'))?.pending).toBe(0);
    expect(marksInAnki().get('鳥')).toEqual(['tracking']);
  });

  it('clears a mark by deleting its note', async () => {
    await setMark('ja', '猫', 'known');
    await syncMarks('ja');
    await setMark('ja', '猫', null);
    await syncMarks('ja');
    expect(marksInAnki().has('猫')).toBe(false);
    expect(await loadOverrides('ja')).toEqual(new Map());
  });

  it('keeps the newest of two notes for one word, and deletes the other', async () => {
    // Two devices marked 猫 while offline; Anki's sync then holds both.
    const older = ankiMark('猫', 'known', { mod: 100 });
    ankiMark('猫', 'ignored', { mod: 200 });
    expect((await synced())?.get('猫')).toBe('ignored');
    expect(sent('deleteNotes').map((c) => c.params)).toEqual([{ notes: [older.id] }]);
    expect(marksInAnki()).toEqual(new Map([['猫', ['ignored']]]));
  });

  it('runs one sync at a time, and one more for anything asked meanwhile', async () => {
    await setMark('ja', '猫', 'known');
    const [a, b] = await Promise.all([syncMarks('ja'), syncMarks('ja')]);
    expect(a?.pending).toBe(0);
    expect(b?.pending).toBe(0);
    expect(sent('addNotes')).toHaveLength(1);
  });
});

describe('the first sync', () => {
  it('hands Anki every mark this browser already had, except where Anki has the word', async () => {
    store.local[CACHE] = { ja: { 猫: 'known', 犬: 'ignored' }, es: { gato: 'known' } };
    ankiMark('犬', 'tracking');
    // The same word in another language is not this one: it still goes to Anki.
    ankiMark('gato', 'ignored', { lang: 'pt' });
    const result = await syncMarks('ja');
    expect(marksIn(result!.marks, 'ja')).toEqual(new Map([['猫', 'known'], ['犬', 'tracking']]));
    expect(marksIn(result!.marks, 'es')).toEqual(new Map([['gato', 'known']]));
    expect(marksInAnki()).toEqual(new Map([['猫', ['known']], ['犬', ['tracking']]]));
    expect(marksInAnki('es')).toEqual(new Map([['gato', ['known']]]));
    expect(marksInAnki('pt')).toEqual(new Map([['gato', ['ignored']]]));
    expect(store.local[SEEDED]).toBe(true);
  });

  it('does it once: a mark deleted in Anki afterwards stays deleted', async () => {
    store.local[CACHE] = { ja: { 猫: 'known' } };
    await syncMarks('ja');
    fake.notes = [];
    expect(await synced()).toEqual(new Map());
    expect(sent('addNotes')).toHaveLength(1);
  });

  it('keeps what it queued when Anki goes away before writing it', async () => {
    store.local[CACHE] = { ja: { 猫: 'known' } };
    fake.onCall = (action) => {
      // Anki quits just before the notes are sent.
      if (action === 'createDeck') fake.offline = true;
    };
    expect(await syncMarks('ja')).toBeNull();
    expect(marksInAnki().size).toBe(0);
    expect(store.local[QUEUE]).toMatchObject({ ja: { 猫: { status: 'known' } } });
    expect(store.local[SEEDED]).toBe(true);
    fake.offline = false;
    fake.onCall = null;
    expect((await syncMarks('ja'))?.pending).toBe(0);
    expect(marksInAnki()).toEqual(new Map([['猫', ['known']]]));
  });
});

describe('when Anki refuses', () => {
  it('keeps the queue and says what to do about a mark note type edited out of shape', async () => {
    fake.models[MARK_MODEL_NAME] = ['Word'];
    await setMark('ja', '猫', 'known');
    const result = await syncMarks('ja');
    expect(result?.error).toContain('Reading');
    expect(result?.error).toContain('Manage Note Types');
    expect(result?.pending).toBe(1);
    expect(marksIn(result!.marks, 'ja')).toEqual(new Map([['猫', 'known']]));
    expect(sent('addNotes')).toEqual([]);
  });

  it('writes the rest when Anki refuses one note, and keeps that one queued', async () => {
    for (const w of ['猫', '犬', '鳥']) await setMark('ja', w, 'known');
    fake.refuseWords.add('犬');
    const result = await syncMarks('ja');
    expect(result?.error).toContain('犬');
    expect(result?.pending).toBe(1);
    expect(store.local[QUEUE]).toMatchObject({ ja: { 犬: { status: 'known' } } });
    expect(marksInAnki()).toEqual(new Map([['猫', ['known']], ['鳥', ['known']]]));
  });

  it('reads the outcome back rather than trusting how an older AnkiConnect reports it', async () => {
    fake.addNotesFailures = 'null';
    for (const w of ['猫', '犬']) await setMark('ja', w, 'known');
    fake.refuseWords.add('犬');
    const result = await syncMarks('ja');
    expect(result?.pending).toBe(1);
    expect(result?.error).toContain('did not add 1');
  });

  it('keeps the queue when the marks cannot be read back', async () => {
    await setMark('ja', '猫', 'known');
    let searches = 0;
    fake.onCall = (action) => {
      if (action === 'findNotes' && ++searches === 2) throw new Error('collection is not available');
    };
    const result = await syncMarks('ja');
    expect(result?.error).toBe('collection is not available');
    expect(result?.pending).toBe(1);
    expect(marksIn(result!.marks, 'ja')).toEqual(new Map([['猫', 'known']]));
  });
});

describe('marks from before they had a language', () => {
  /** A browser that last ran the version before: marks by word alone. */
  function before(cache: Record<string, string>, queue: Record<string, unknown> = {}): void {
    store.local = { [OLD_CACHE]: cache, [OLD_QUEUE]: queue, [SYNC_IMPORTED]: true };
  }

  it('gives each word the language it is written in, once, and keeps them by language from then on', async () => {
    before(
      { 猫: 'known', ねこ: 'ignored', コーヒー: 'known', 고양이: 'tracking', แมว: 'known', gato: 'ignored', 食べる: 'learning' },
      { 猫: { status: 'known', at: 5 }, gato: { status: 'ignored', at: 6 }, 犬: { status: null, at: 7 } },
    );
    // Kana and kanji are Japanese — the only language with a dictionary then;
    // Hangul and Thai name their own; anything else is taken to be in the
    // language being learned now.
    expect(await loadOverrides('es')).toEqual(new Map([['gato', 'ignored']]));
    expect(store.local[CACHE]).toEqual({
      ja: { 猫: 'known', ねこ: 'ignored', コーヒー: 'known' },
      ko: { 고양이: 'tracking' },
      th: { แมว: 'known' },
      es: { gato: 'ignored' },
    });
    expect(store.local[QUEUE]).toEqual({
      ja: { 猫: { status: 'known', at: 5 }, 犬: { status: null, at: 7 } },
      es: { gato: { status: 'ignored', at: 6 } },
    });
    expect(store.local[OLD_CACHE]).toBeUndefined();
    expect(store.local[OLD_QUEUE]).toBeUndefined();
    // Learning another language later does not move them again.
    expect(await loadOverrides('fr')).toEqual(new Map());
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known'], ['ねこ', 'ignored'], ['コーヒー', 'known']]));
  });

  it('keeps a mark made on the first page after the update, along with the old ones', async () => {
    before({ 猫: 'known' });
    expect(await setMark('ja', '犬', 'ignored')).toBe(true);
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known'], ['犬', 'ignored']]));
  });

  it('never brings back a mark cleared since, even when the old ones could not be removed', async () => {
    before({ 猫: 'known' });
    store.api.local.remove.mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await setMark('ja', '猫', null)).toBe(true);
    expect(store.local[OLD_CACHE]).toEqual({ 猫: 'known' });
    expect(await loadOverrides('ja')).toEqual(new Map());
  });

  it('tries again next time when the marks by language could not be stored', async () => {
    before({ 猫: 'known' });
    store.api.local.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    // Shown this session all the same.
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known']]));
    expect(store.local[CACHE]).toBeUndefined();
    expect(store.local[OLD_CACHE]).toEqual({ 猫: 'known' });
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known']]));
    expect(store.local[CACHE]).toEqual({ ja: { 猫: 'known' } });
  });

  it('tags the notes Anki holds with their language, and moves them out of the deck they all shared', async () => {
    const cat = oldMark('猫', 'known');
    const kor = oldMark('고양이', 'tracking');
    const esp = oldMark('gato', 'ignored');
    ankiMark('犬', 'known');
    store.local[SEEDED] = true;
    const result = await syncMarks('es');
    expect(result).toEqual({
      marks: new Map([
        ['ja', new Map([['猫', 'known'], ['犬', 'known']])],
        ['ko', new Map([['고양이', 'tracking']])],
        ['es', new Map([['gato', 'ignored']])],
      ]),
      pending: 0,
    });
    // The same notes, not new ones: tagged, and each in its language's deck.
    expect(noteFor('猫', 'ja')).toMatchObject({ id: cat.id, deck: 'Libregaku::Marks::JA' });
    expect(noteFor('고양이', 'ko')).toMatchObject({ id: kor.id, deck: 'Libregaku::Marks::KO' });
    expect(noteFor('gato', 'es')).toMatchObject({ id: esp.id, deck: 'Libregaku::Marks::ES' });
    expect(sent('addNotes')).toEqual([]);
    expect(sent('deleteNotes')).toEqual([]);
    expect(markNotes().some((n) => n.deck === MARK_DECK)).toBe(false);
    // Each still says what it said, and none came out of suspension.
    expect(marksInAnki('ja')).toEqual(new Map([['猫', ['known']], ['犬', ['known']]]));
    expect(fake.find(`note:"${MARK_MODEL_NAME}" -is:suspended`)).toEqual([]);

    // Done once: the next sync finds nothing to tag or move.
    fake.calls = [];
    await syncMarks('ja');
    expect(sent('addTags')).toEqual([]);
    expect(sent('changeDeck')).toEqual([]);
    // Japanese is being learned now, and gato is still Spanish: its tag says so.
    expect(await loadOverrides('es')).toEqual(new Map([['gato', 'ignored']]));
  });

  it('leaves a mark where a learner moved it, and still gives it its language', async () => {
    fake.decks.add('My marks');
    const mine = oldMark('猫', 'known', { deck: 'My marks' });
    store.local[SEEDED] = true;
    expect(await synced()).toEqual(new Map([['猫', 'known']]));
    expect(noteFor('猫', 'ja')).toMatchObject({ id: mine.id, deck: 'My marks' });
    expect(sent('changeDeck')).toEqual([]);
  });

  it('tells a word marked again in its own language from an old note in another', async () => {
    // An old note for 人, read as Japanese. Marking 人 in Chinese adds a note; it does not retag that one.
    const old = oldMark('人', 'known');
    store.local[CACHE] = { ja: { 人: 'known' } };
    store.local[SEEDED] = true;
    await setMark('zh', '人', 'ignored');
    await syncMarks('zh');
    expect(noteFor('人', 'ja')).toMatchObject({ id: old.id });
    expect(marksInAnki('ja')).toEqual(new Map([['人', ['known']]]));
    expect(marksInAnki('zh')).toEqual(new Map([['人', ['ignored']]]));
    expect(markNotes()).toHaveLength(2);
  });
});

describe('marks from when they were in sync storage', () => {
  it('brings the old sync item over once, dropping legacy learning values, then removes it', async () => {
    store.local = {};
    store.sync[OLD_CACHE] = { 食べる: 'learning', 猫: 'known', 犬: 'ignored' };
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known'], ['犬', 'ignored']]));
    expect(store.local[CACHE]).toEqual({ ja: { 猫: 'known', 犬: 'ignored' } });
    expect(store.local[SYNC_IMPORTED]).toBe(true);
    expect(store.sync[OLD_CACHE]).toBeUndefined();
  });

  it('lets a mark written locally win over the sync copy', async () => {
    store.local = { [OLD_CACHE]: { 猫: 'ignored' } };
    store.sync[OLD_CACHE] = { 猫: 'known' };
    expect((await loadOverrides('ja')).get('猫')).toBe('ignored');
  });

  it('never brings back a cleared mark, even when the sync copy could not be removed', async () => {
    store.local = {};
    store.sync[OLD_CACHE] = { 猫: 'known' };
    store.api.sync.remove.mockRejectedValueOnce(new Error('sync unavailable'));
    expect(await setMark('ja', '猫', null)).toBe(true);
    expect(store.sync[OLD_CACHE]).toEqual({ 猫: 'known' });
    expect(await loadOverrides('ja')).toEqual(new Map());
  });

  it('tries the sync copy again later when it could not be read', async () => {
    store.local = {};
    store.sync[OLD_CACHE] = { 猫: 'known' };
    store.api.sync.get.mockRejectedValueOnce(new Error('sync unavailable'));
    expect(await loadOverrides('ja')).toEqual(new Map());
    expect(await loadOverrides('ja')).toEqual(new Map([['猫', 'known']]));
  });
});

describe('what counts as our cards', () => {
  it('leaves hand marks out of the cards the extension made', async () => {
    ankiMark('猫', 'known');
    fake.add({ Expression: '犬' }, { tags: ['libregaku'] });
    expect(await countOurCards()).toBe(1);
  });
});
