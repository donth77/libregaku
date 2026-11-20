import { afterEach, describe, expect, it, vi } from 'vitest';
import { HINDI, foldHindi, hindiEndings } from '../hindi';
import { LemmaSegmenter, type FormInfo, type Forms } from '../lemma';

/**
 * Hindi, over rows as Wiktionary's (wiktionary-to-yomitan, 2026-10-22) has
 * them, cut down, and the keys the dictionary keeps them under as well
 * (RESPELL in src/dict/sources.ts). What the real file makes of 16,479
 * Tatoeba sentences was read when this was written: 94.8% of words find an
 * entry, the commonest of the rest names.
 */

describe('the key a Hindi word is looked up by', () => {
  it('is the same however the word is spelt', () => {
    for (const [a, b] of [['हूँ', 'हूं'], ['ख़ूबसूरत', 'खूबसूरत'], ['ज़िन्दगी', 'ज़िंदगी'], ['कम्प्यूटर', 'कंप्यूटर'], ['बिल्कुल', 'बिलकुल'], ['गर्म', 'गरम']]) {
      expect(foldHindi(a!), `${a} and ${b}`).toBe(foldHindi(b!));
    }
  });
});

describe('the word a Hindi word may be by its ending', () => {
  it('reads the polite imperative as the verb, and -े as the word in -ा', () => {
    expect(hindiEndings('बताइए')).toEqual([{ key: 'बताना', label: 'imperative' }]);
    expect(hindiEndings('सुनिए')).toEqual([{ key: 'सुनना', label: 'imperative' }]);
    expect(hindiEndings('वाले')).toEqual([{ key: 'वाला' }]);
    expect(hindiEndings('घर')).toEqual([]);
  });
});

describe('Hindi through the segmenter', () => {
  const word = (kind: string[], senses = 2): FormInfo => ({ word: true, kind, senses, of: [] });
  const spelt = (lemma: string): FormInfo => ({ word: false, senses: 0, kind: [], of: [{ lemma, tags: ['alternative'], senses: 2 }] });
  const DICT: Forms = {
    बिल्कुल: word(['adv']),
    [foldHindi('बिल्कुल')]: spelt('बिल्कुल'),
    // पत्नी is a word, and a feminine form of पति, whose key it shares.
    पत्नी: { word: true, kind: ['n'], senses: 2, of: [{ lemma: 'पति', tags: ['feminine'], senses: 3 }] },
    पति: word(['n'], 3),
    बताना: word(['v']),
    वाला: word(['suf', 'adj']),
    है: { word: false, senses: 0, kind: [], of: [{ lemma: 'होना', tags: ['third-person singular present'], pos: 'v', senses: 9 }] },
    होना: word(['v'], 9),
  };

  afterEach(() => vi.unstubAllGlobals());

  const read = async (text: string) => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: async (msg: { forms: string[] }) =>
          ({ ok: true, forms: Object.fromEntries(msg.forms.filter((f) => DICT[f]).map((f) => [f, DICT[f]])) }),
      },
    });
    const segmenter = new LemmaSegmenter('hi', HINDI, { fold: (s) => s.normalize('NFC'), respell: foldHindi, endings: hindiEndings });
    return (await segmenter.segment(text)).filter((t) => !t.punct).map((t) => [t.surface, t.lemma]);
  };

  it('reads a word spelt otherwise than the dictionary has it as the dictionary’s word', async () => {
    expect(await read('बिलकुल')).toEqual([['बिलकुल', 'बिल्कुल']]);
  });

  it('reads a word the dictionary has as written as itself, whatever shares its key', async () => {
    expect(await read('पत्नी')).toEqual([['पत्नी', 'पत्नी']]);
  });

  it('reads a word it has nothing for by its ending: बताइए is बताना, वाले वाला', async () => {
    expect(await read('बताइए')).toEqual([['बताइए', 'बताना']]);
    expect(await read('वाले')).toEqual([['वाले', 'वाला']]);
  });

  it('reads है as होना', async () => {
    expect(await read('है')).toEqual([['है', 'होना']]);
  });
});
