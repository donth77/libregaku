import { afterEach, describe, expect, it, vi } from 'vitest';
import { LemmaSegmenter, type FormInfo, type Forms } from '../lemma';
import { TURKISH, TURKISH_LABELS, TURKISH_SUFFIXES, chooseTurkish, foldTurkish, turkishReadings, turkishSplits } from '../turkish';
import { grammar } from '../../i18n/en/grammar';

/**
 * Turkish, over rows as Wiktionary's (wiktionary-to-yomitan, 2026-10-22) has them, cut down. What the real file
 * makes of 20,000 Tatoeba sentences was read when this was written: 92.2% of words find an entry (83.2% as
 * written).
 */

const word = (kind: string[], senses = 2, of: FormInfo['of'] = []): FormInfo => ({ word: true, kind, senses, of });
const form = (...lemmas: Array<string | [string, string?]>): FormInfo => ({
  word: false, senses: 0, kind: [],
  of: lemmas.map((l) => (typeof l === 'string' ? { lemma: l, tags: [], senses: 2 } : { lemma: l[0], tags: [], pos: l[1], senses: 2 })),
});

describe('a Turkish word read by its suffixes', () => {
  const chains = (w: string): string[] => turkishReadings(w).map((r) => [r.stem, ...r.suffixes.map((s) => s.text)].join('+'));

  it('takes the suffixes off from the end, in the order Turkish puts them on', () => {
    expect(chains('evlerimizden')).toContain('ev+ler+imiz+den');
    expect(chains('gerektiğini')).toContain('gerek+tiğ+i+ni');
    expect(chains('değildim')).toContain('değil+di+m');
    expect(chains('yapabileceğimizi')).toContain('yap+abil+eceğ+imiz+i');
    // A possessive does not come after a case.
    expect(chains('evdem')).not.toContain('ev+de+m');
  });

  it('asks for a verb by its infinitive, and a stem with its last consonant as the dictionary writes it', () => {
    const keys = (w: string): string[] => turkishSplits(w).map((s) => s.key);
    expect(keys('geliyorum')).toContain('gelmek');
    expect(keys('gidiyor')).toContain('gitmek');
    expect(keys('kitabı')).toContain('kitap');
    expect(keys('bekliyor')).toContain('beklemek');
    expect(keys('okuyor')).toContain('okumak');
  });

  it('reads a name with its suffixes after an apostrophe as the name', () => {
    expect(turkishSplits("Ankara'da")[0]).toMatchObject({ key: 'Ankara', adds: ['locative'] });
  });

  it('keys a word without its circumflex as well', () => {
    expect(foldTurkish('şikâyet')).toBe('şikayet');
  });
});

describe('which reading of a Turkish word is taken', () => {
  const DICT: Forms = {
    ev: word(['n']),
    et: word(['n'], 3, [{ lemma: 'etmek', tags: [], senses: 5 }]),
    etmek: word(['v'], 5),
    etti: form('etmek'),
    kalem: word(['n']),
    kale: word(['n']),
    kalmak: word(['v']),
    gelme: word(['n'], 1, [{ lemma: 'gelmek', tags: [], senses: 5 }]),
    gelmek: word(['v'], 5),
    olmak: word(['v'], 9),
    olmadık: word(['adj']),
    gerçek: word(['n', 'adj']),
    gerçekten: word(['adv']),
    var: word(['adj', 'n']),
    varmak: word(['v']),
    vardı: form('varmak'),
    kim: word(['pron']),
    kimi: word(['det', 'pron'], 2, [{ lemma: 'kim', tags: [], senses: 2 }]),
    da: word(['conj']),
  };
  const key = (w: string, opening = true): string | null | undefined => {
    const c = chooseTurkish(w, DICT, opening);
    return c === null ? null : c?.key;
  };

  it('reads a word the dictionary has in its own right as itself', () => {
    expect(key('gerçekten')).toBeNull();
  });

  it('reads a form the table lists as the word it names, by the reading that leads there', () => {
    expect(key('etti')).toBe('etmek');
    expect(chooseTurkish('etti', DICT)?.adds).toEqual(['past']);
  });

  it('takes the longest stem the dictionary has', () => {
    expect(key('kalemim')).toBe('kalem');
    expect(key('evlerimizden')).toBe('ev');
  });

  it('reads a stem that is also a word through to the verb or little word it is a form of', () => {
    expect(key('gelmedi')).toBe('gelmek');
    expect(key('olmadığını')).toBe('olmak');
    expect(key('kimin')).toBe('kim');
  });

  it('reads var with the copula as "there was"', () => {
    expect(key('vardı')).toBe('var');
  });

  it('leaves a capital inside a sentence to a name', () => {
    expect(key('Dan', false)).toBeNull();
  });
});

describe('Turkish through the segmenter', () => {
  const DICT: Forms = { ev: word(['n']), gelmek: word(['v'], 5) };
  afterEach(() => vi.unstubAllGlobals());

  it('reads the stem as the word, and names each suffix', async () => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: async (msg: { forms: string[] }) =>
          ({ ok: true, forms: Object.fromEntries(msg.forms.filter((f) => DICT[f]).map((f) => [f, DICT[f]])) }),
      },
    });
    const segmenter = new LemmaSegmenter('tr', TURKISH, { attached: TURKISH_SUFFIXES });
    const [house, coming] = (await segmenter.segment('evlerimizden geliyorum')).filter((t) => !t.punct);
    expect(house).toMatchObject({ lemma: 'ev', parts: ['ev', 'ler', 'imiz', 'den'], inflections: ['plural', 'attached-our', 'ablative'] });
    expect(coming).toMatchObject({ lemma: 'gelmek', inflections: ['ongoing', 'first-person singular'] });
  });
});

describe('the names of the Turkish suffixes', () => {
  it('are in the interface', () => {
    const names = Object.keys(grammar);
    // first-person singular is named word by word.
    expect(TURKISH_LABELS.filter((l) => !names.includes(l) && !l.split(' ').every((w) => names.includes(w)))).toEqual([]);
  });
});
