import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ankiCall, ankiTry } from '../rpc';
import { flushCards, queueCard, queuedCards } from '../card-queue';
import type { NewCard } from '../client';
import { FIELDS, MODEL_NAME } from '../model';
import { FakeAnki, FakeStorage } from './fake-anki';

vi.mock('../rpc', async () => {
  const { AnkiUnavailable } = await vi.importActual<typeof import('../rpc')>('../rpc');
  return { AnkiUnavailable, ankiCall: vi.fn(), ankiTry: vi.fn() };
});

/**
 * Cards made while Anki was closed wait in the browser, one storage key each,
 * and go in the next time Anki answers — in the order they were made, with
 * their recording fetched then rather than stored.
 */

const fake = new FakeAnki();
const store = new FakeStorage();
vi.stubGlobal('chrome', { storage: store.api });

const card = (expression: string, deck = 'Mining'): NewCard => ({
  deck, expression, reading: expression, meaning: `${expression} meaning`, tags: ['libregaku'],
});
const waiting = () => Object.keys(store.local).filter((k) => k.startsWith('libregaku.cards.pending.'));
const inAnki = () => fake.notes.map((n) => n.fields.Expression);

beforeEach(() => {
  fake.notes = [];
  fake.calls = [];
  fake.models = { [MODEL_NAME]: [...FIELDS] };
  fake.decks = new Set(['Default', 'Mining']);
  fake.offline = false;
  fake.refuseWords.clear();
  fake.media.clear();
  fake.onCall = null;
  store.reset();
  vi.mocked(ankiCall).mockReset().mockImplementation(fake.call as typeof ankiCall);
  vi.mocked(ankiTry).mockReset().mockImplementation(fake.try as typeof ankiTry);
});

describe('keeping a card', () => {
  it('stores it under a key of its own, without any recording bytes', async () => {
    const r = await queueCard({
      card: { ...card('猫'), audio: { data: 'SUQz', filename: 'libregaku_猫.mp3' } },
      word: '猫',
      audio: { word: '猫', reading: 'ねこ', lang: 'ja' },
    });
    expect(r).toBe('queued');
    expect(waiting()).toHaveLength(1);
    const [kept] = await queuedCards();
    expect(kept?.card).not.toHaveProperty('audio');
    expect(kept?.audio).toEqual({ word: '猫', reading: 'ねこ', lang: 'ja' });
  });

  it('keeps one card for a word pressed twice, but another for a different deck', async () => {
    expect(await queueCard({ card: card('猫'), word: '猫' })).toBe('queued');
    expect(await queueCard({ card: card('猫'), word: '猫' })).toBe('already');
    expect(await queueCard({ card: card('猫', 'Japanese::Core'), word: '猫' })).toBe('queued');
    expect(waiting()).toHaveLength(2);
  });

  it('says so when the browser will not store it', async () => {
    store.api.local.set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await queueCard({ card: card('猫'), word: '猫' })).toBe('failed');
  });

  it('ignores whatever else is in storage, and entries it cannot read', async () => {
    store.local['libregaku.overrides'] = { 猫: 'known' };
    store.local['libregaku.cards.pending.broken'] = { card: { deck: '', expression: '' }, word: 'x', at: 1 };
    store.local['libregaku.cards.pending.junk'] = 'not a card';
    expect(await queuedCards()).toEqual([]);
  });
});

describe('adding the waiting cards', () => {
  it('asks Anki nothing when no card is waiting', async () => {
    expect(await flushCards()).toEqual({ words: [], added: 0, duplicates: 0, remaining: 0 });
    expect(fake.calls).toEqual([]);
  });

  it('leaves everything waiting while Anki is closed', async () => {
    await queueCard({ card: card('猫'), word: '猫' });
    fake.offline = true;
    expect(await flushCards()).toBeNull();
    expect(waiting()).toHaveLength(1);
  });

  it('adds them oldest first, each with its recording, and takes them off the queue', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000);
    await queueCard({ card: card('食べる'), word: '食べる', audio: { word: '食べる', reading: 'たべる', lang: 'ja' } });
    vi.setSystemTime(2_000);
    await queueCard({ card: card('猫'), word: '猫' });
    vi.useRealTimers();

    const audioFor = vi.fn(async (want: { word: string }) => ({ data: 'SUQzBA==', filename: `libregaku_${want.word}.mp3` }));
    const r = await flushCards(audioFor);

    expect(r).toEqual({ words: ['食べる', '猫'], added: 2, duplicates: 0, remaining: 0 });
    expect(inAnki()).toEqual(['食べる', '猫']);
    // Only the card that wanted a recording asked for one.
    expect(audioFor).toHaveBeenCalledOnce();
    expect(fake.notes[0]?.fields.Audio).toBe('[sound:libregaku_食べる.mp3]');
    expect(fake.media.get('libregaku_食べる.mp3')).toBe('SUQzBA==');
    expect(fake.notes[1]?.fields.Audio).toBe('');
    expect(waiting()).toEqual([]);
  });

  it('still adds the card when its recording cannot be had', async () => {
    await queueCard({ card: card('猫'), word: '猫', audio: { word: '猫', lang: 'ja' } });
    const r = await flushCards(async () => { throw new Error('jpod101 is down'); });
    expect(r?.added).toBe(1);
    expect(fake.notes[0]?.fields.Audio).toBe('');
  });

  it('drops a card Anki already has, and still reports the word as carded', async () => {
    fake.add({ Expression: '猫', Reading: '', Meaning: '', Sentence: '', SentenceMeaning: '', Source: '', Audio: '', Image: '' }, { deck: 'Mining' });
    await queueCard({ card: card('猫'), word: '猫' });
    expect(await flushCards()).toEqual({ words: ['猫'], added: 0, duplicates: 1, remaining: 0 });
    expect(waiting()).toEqual([]);
  });

  it('keeps a card Anki refuses, says why, and adds the rest', async () => {
    fake.refuseWords.add('猫');
    await queueCard({ card: card('猫'), word: '猫' });
    await queueCard({ card: card('犬'), word: '犬' });
    const r = await flushCards();
    expect(r?.added).toBe(1);
    expect(r?.remaining).toBe(1);
    expect(r?.error).toContain('猫');
    expect(inAnki()).toEqual(['犬']);
    expect((await queuedCards()).map((q) => q.card.expression)).toEqual(['猫']);
  });

  it('makes the deck again when it is gone', async () => {
    fake.decks = new Set(['Default']);
    await queueCard({ card: card('猫', 'Japanese::Mining'), word: '猫' });
    expect((await flushCards())?.added).toBe(1);
    expect(fake.decks.has('Japanese::Mining')).toBe(true);
  });

  it('stops where Anki went away, and keeps the rest', async () => {
    await queueCard({ card: card('猫'), word: '猫' });
    await queueCard({ card: card('犬'), word: '犬' });
    // Anki closes just after taking the first card.
    fake.onCall = (action) => {
      if (action === 'addNote') fake.offline = true;
    };
    const r = await flushCards();
    expect(r).toEqual({ words: ['猫'], added: 1, duplicates: 0, remaining: 1 });
    expect((await queuedCards()).map((q) => q.card.expression)).toEqual(['犬']);
  });

  it('adds each card once when asked twice at the same time', async () => {
    await queueCard({ card: card('猫'), word: '猫' });
    const [a, b] = await Promise.all([flushCards(), flushCards()]);
    expect(inAnki()).toEqual(['猫']);
    expect(a?.added).toBe(1);
    expect(b).toEqual({ words: [], added: 0, duplicates: 0, remaining: 0 });
  });

  it('reports a note type it cannot write to, and keeps every card', async () => {
    fake.models.Libregaku = ['Expression', 'Reading'];
    await queueCard({ card: card('猫'), word: '猫' });
    const r = await flushCards();
    expect(r?.error).toContain('missing');
    expect(r?.remaining).toBe(1);
    expect(waiting()).toHaveLength(1);
  });
});
