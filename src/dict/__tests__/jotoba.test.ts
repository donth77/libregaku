import { describe, expect, it } from 'vitest';
import { toEntries } from '../jotoba';

describe('jotoba toEntries', () => {
  it('maps a result into the same shape as a local entry', () => {
    const [e] = toEntries(
      [{ reading: { kanji: '食べる', kana: 'たべる' }, common: true,
         senses: [{ glosses: ['to eat'], pos: [{ Verb: 'Ichidan' }] }] }],
      '食べる',
    );
    expect(e).toMatchObject({ word: '食べる', reading: 'たべる', common: true });
    expect(e?.senses[0]?.glosses).toEqual(['to eat']);
  });

  it('flattens the object-shaped part of speech Jotoba returns', () => {
    const [e] = toEntries(
      [{ reading: { kanji: '見る' }, senses: [{ glosses: ['to see'], pos: [{ Verb: 'x' }, 'Transitive'] }] }],
      '見る',
    );
    expect(e?.senses[0]?.pos).toEqual(['Verb', 'Transitive']);
  });

  it('uses kana as the headword when there is no kanji', () => {
    const [e] = toEntries(
      [{ reading: { kana: 'すごい' }, senses: [{ glosses: ['amazing'] }] }],
      'すごい',
    );
    expect(e?.word).toBe('すごい');
    expect(e?.reading).toBeUndefined();
  });

  it('puts an exact match first', () => {
    const out = toEntries(
      [
        { reading: { kanji: '食べ物' }, senses: [{ glosses: ['food'] }] },
        { reading: { kanji: '食べる' }, senses: [{ glosses: ['to eat'] }] },
      ],
      '食べる',
    );
    expect(out[0]?.word).toBe('食べる');
  });

  it('skips results with no glosses', () => {
    expect(toEntries([{ reading: { kanji: 'x' }, senses: [] }], 'x')).toEqual([]);
  });
});
