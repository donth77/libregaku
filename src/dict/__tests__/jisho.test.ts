import { describe, expect, it } from 'vitest';
import { toEntries } from '../jisho';

const taberu = {
  slug: '食べる',
  is_common: true,
  japanese: [{ word: '食べる', reading: 'たべる' }],
  senses: [{ english_definitions: ['to eat'], parts_of_speech: ['Ichidan verb', 'Transitive verb'] }],
};

describe('jisho toEntries', () => {
  it('maps a result into the same shape as a local entry', () => {
    const [e] = toEntries([taberu], '食べる');
    expect(e).toMatchObject({ word: '食べる', reading: 'たべる', common: true });
    expect(e?.senses[0]?.glosses).toEqual(['to eat']);
  });

  it('maps readable part-of-speech names back to the codes the UI expands', () => {
    const [e] = toEntries([taberu], '食べる');
    expect(e?.senses[0]?.pos).toEqual(['v1', 'vt']);
  });

  it('uses the reading as the headword for kana-only words', () => {
    const [e] = toEntries(
      [{ slug: 'すごい', japanese: [{ reading: 'すごい' }], senses: [{ english_definitions: ['amazing'] }] }],
      'すごい',
    );
    expect(e?.word).toBe('すごい');
    expect(e?.reading).toBeUndefined();
  });

  it('puts an exact match ahead of the fuzzy ones Jisho also returns', () => {
    const fuzzy = { slug: '食べ物', japanese: [{ word: '食べ物', reading: 'たべもの' }],
                    senses: [{ english_definitions: ['food'] }] };
    expect(toEntries([fuzzy, taberu], '食べる')[0]?.word).toBe('食べる');
  });

  it('skips results with no usable definition', () => {
    expect(toEntries([{ slug: 'x', japanese: [{ word: 'x' }], senses: [] }], 'x')).toEqual([]);
  });
});
