import { describe, expect, it } from 'vitest';
import { keysFor, rank, toEntry, type Entry, type RawWord } from '../jmdict';
import { untarSingle } from '../archive';

const raw: RawWord = {
  id: '1358280',
  kanji: [{ text: '食べる', common: true }],
  kana: [{ text: 'たべる', common: true }],
  sense: [
    { partOfSpeech: ['v1', 'vt'], gloss: [{ text: 'to eat', lang: 'eng' }] },
    { partOfSpeech: ['v1'], gloss: [{ text: 'to live on', lang: 'eng' }] },
  ],
};

describe('toEntry', () => {
  it('keeps the written form as headword and the kana as reading', () => {
    const e = toEntry(raw)!;
    expect(e.word).toBe('食べる');
    expect(e.reading).toBe('たべる');
    expect(e.senses).toHaveLength(2);
    expect(e.senses[0]?.glosses).toEqual(['to eat']);
  });

  it('uses kana as the headword when there is no kanji', () => {
    const e = toEntry({ id: '1', kana: [{ text: 'すごい' }], sense: [{ gloss: [{ text: 'amazing' }] }] })!;
    expect(e.word).toBe('すごい');
    expect(e.reading).toBeUndefined();
  });

  it('drops non-English glosses', () => {
    const e = toEntry({
      id: '1', kana: [{ text: 'あ' }],
      sense: [{ gloss: [{ text: 'ah', lang: 'eng' }, { text: 'ach', lang: 'ger' }] }],
    })!;
    expect(e.senses[0]?.glosses).toEqual(['ah']);
  });

  it('returns null when nothing usable remains', () => {
    expect(toEntry({ id: '1', kanji: [{ text: 'x' }], sense: [] })).toBeNull();
    expect(toEntry({ id: '1', sense: [{ gloss: [{ text: 'x' }] }] })).toBeNull();
  });
});

describe('keysFor', () => {
  it('indexes every written and read form', () => {
    expect(keysFor(raw).sort()).toEqual(['たべる', '食べる']);
  });

  it('de-duplicates', () => {
    expect(keysFor({ id: '1', kana: [{ text: 'あ' }, { text: 'あ' }] })).toEqual(['あ']);
  });
});

describe('rank', () => {
  const common: Entry = { id: '2', word: '音', reading: 'おと', common: true, senses: [] };
  const rare: Entry = { id: '1', word: '尾音', reading: 'おと', common: false, senses: [] };

  it('puts an exact written match first', () => {
    expect(rank([rare, common], '音')[0]).toBe(common);
  });

  it('prefers common words when neither is exact', () => {
    expect(rank([rare, common], 'おと')[0]).toBe(common);
  });

  it('is stable for equal candidates', () => {
    const a: Entry = { id: '1', word: 'x', common: false, senses: [] };
    const b: Entry = { id: '2', word: 'x', common: false, senses: [] };
    expect(rank([b, a], 'x').map((e) => e.id)).toEqual(['1', '2']);
  });
});

describe('untarSingle', () => {
  it('extracts the payload of a single-file tar', () => {
    const payload = new TextEncoder().encode('{"ok":true}');
    const tar = new Uint8Array(1024);
    tar.set(new TextEncoder().encode('x.json'), 0);
    tar.set(new TextEncoder().encode(payload.length.toString(8).padStart(11, '0')), 124);
    tar[156] = '0'.charCodeAt(0);
    tar.set(payload, 512);
    expect(new TextDecoder().decode(untarSingle(tar))).toBe('{"ok":true}');
  });

  it('throws rather than returning junk when there is no file', () => {
    expect(() => untarSingle(new Uint8Array(1024))).toThrow();
  });
});
