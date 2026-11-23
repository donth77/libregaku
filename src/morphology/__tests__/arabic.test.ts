import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARABIC, ARABIC_ATTACHED, ARABIC_LABELS, arabicClitics, chooseClitics, foldArabic, writtenPieces } from '../arabic';
import { LemmaSegmenter, type FormInfo, type Forms } from '../lemma';
import { grammar } from '../../i18n/en/grammar';

/**
 * Arabic, over rows as Wiktionary's (wiktionary-to-yomitan, 2026-10-22) has them, cut down. What the real file
 * makes of 20,000 Tatoeba sentences was read when this was written: 96.6% of words find an entry (75.9% as
 * written).
 */

const word = (kind: string[], senses = 2, of: FormInfo['of'] = []): FormInfo => ({ word: true, kind, senses, of });
const form = (...lemmas: Array<string | [string, string?]>): FormInfo => ({
  word: false, senses: 0, kind: [],
  of: lemmas.map((l) => (typeof l === 'string' ? { lemma: l, tags: [], senses: 2 } : { lemma: l[0], tags: [], pos: l[1], senses: 2 })),
});

describe('an Arabic word as the dictionary keys it', () => {
  it('has no vowels, shadda or stretch, and the Arabic letters for the Persian ی and ک', () => {
    expect(foldArabic('كِتَابٌ')).toBe('كتاب');
    expect(foldArabic('كلّ')).toBe('كل');
    expect(foldArabic('جداً')).toBe('جدا');
    expect(foldArabic('كتـــاب')).toBe('كتاب');
    expect(foldArabic('علی')).toBe('علي');
    // A hamza on its letter stays.
    expect(foldArabic('أَنْتَ')).toBe('أنت');
  });
});

describe('the little words written onto an Arabic word', () => {
  const keys = (w: string): string[] => arabicClitics(w).map((c) => `${c.parts.join('+')}=${c.key}`);

  it('takes off و, ف, ب, ل, ك, س and ال in front, in that order, and the pronouns behind', () => {
    expect(keys('وبكتابه')).toContain('و+ب+كتاب+ه=كتاب');
    expect(keys('بالقلم')).toContain('ب+ال+قلم=قلم');
    expect(keys('بالقلم')).toContain('ب+ال+قلم=القلم');
    expect(keys('سيكتب')).toContain('س+يكتب=يكتب');
    // س goes before a verb in the present only.
    expect(keys('سلام')).not.toContain('س+لام=لام');
  });

  it('reads لل as ل and ال, ت before a pronoun as ة, and علي as على and ي', () => {
    expect(keys('للبيت')).toContain('ل+ل+بيت=بيت');
    expect(keys('مدرستي')).toContain('مدرست+ي=مدرسة');
    expect(keys('عليه')).toContain('علي+ه=على');
    expect(keys('علي')).toContain('عل+ي=على');
  });

  it('reads a preposition with only its pronoun as the preposition', () => {
    expect(keys('لي')).toContain('ل+ي=ل');
    expect(keys('به')).toContain('ب+ه=ب');
  });

  it('puts no pronoun on يا, and spells a word the dictionary may spell otherwise last', () => {
    expect(keys('ياني')).not.toContain('يا+ني=يا');
    const all = arabicClitics('الى');
    expect(all.find((c) => c.key === 'إلى')?.respelt).toBe(true);
  });

  it('keeps each piece as the line writes it, vowels and all', () => {
    expect(writtenPieces('بِكِتَابِهِ', ['ب', 'كتاب', 'ه'])).toEqual(['بِ', 'كِتَابِ', 'هِ']);
  });
});

describe('which reading of an Arabic word is taken', () => {
  const DICT: Forms = {
    ل: word(['char', 'prep', 'conj']),
    لي: word(['v'], 1, [{ lemma: 'لوى', tags: [], senses: 2 }]),
    لك: word(['n'], 1),
    ذلك: word(['pron']),
    بذل: word(['v']),
    ب: word(['char', 'prep']),
    على: word(['prep']),
    عل: word(['ptcl', 'v']),
    علي: word(['v', 'adj']),
    أن: word(['conj']),
    إن: word(['conj', 'ptcl']),
    أنة: word(['n']),
    إلى: word(['prep']),
    جيران: form(['جار', 'n']),
    جيرا: form(['جير', 'n']),
    كتاب: word(['n']),
  };

  it('reads a word the dictionary lacks the way with fewest pieces, a little word in the middle first', () => {
    expect(chooseClitics('بذلك', DICT)?.key).toBe('ذلك');
    expect(chooseClitics('وكتابه', DICT)?.key).toBe('كتاب');
  });

  it('reads a pronoun on a preposition as that, though the dictionary lists the word as something rare', () => {
    expect(chooseClitics('لي', DICT)?.key).toBe('ل');
    expect(chooseClitics('لك', DICT)?.key).toBe('ل');
    expect(chooseClitics('علي', DICT)?.key).toBe('على');
  });

  it('leaves a little word as it is', () => {
    expect(chooseClitics('ذلك', DICT)).toBeNull();
  });

  it('spells as the line has it before as the dictionary may', () => {
    expect(chooseClitics('إنه', DICT)?.key).toBe('إن');
    expect(chooseClitics('الى', DICT)?.key).toBe('إلى');
  });

  it('puts ني on a verb or a little word only', () => {
    expect(chooseClitics('جيراني', DICT)?.key).toBe('جيران');
  });
});

describe('Arabic through the segmenter', () => {
  const DICT: Forms = {
    كتاب: word(['n']),
    ب: word(['char', 'prep']),
    ل: word(['char', 'prep']),
    لي: word(['v'], 1),
    كان: word(['v'], 9),
    يكون: form(['كان', 'v']),
  };
  afterEach(() => vi.unstubAllGlobals());

  const read = async (text: string) => {
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: async (msg: { forms: string[] }) =>
          ({ ok: true, forms: Object.fromEntries(msg.forms.filter((f) => DICT[f]).map((f) => [f, DICT[f]])) }),
      },
    });
    const segmenter = new LemmaSegmenter('ar', ARABIC, { fold: foldArabic, attached: ARABIC_ATTACHED });
    return (await segmenter.segment(text)).filter((t) => !t.punct);
  };

  it('reads the word in the middle, and names what the rest add', async () => {
    const [t] = await read('وبكتابه');
    expect(t?.lemma).toBe('كتاب');
    expect(t?.parts).toEqual(['و', 'ب', 'كتاب', 'ه']);
    // ه on a noun is "his".
    expect(t?.inflections).toEqual(['attached-and', 'attached-with', 'attached-his']);
  });

  it('names a pronoun on a preposition as who it is about', async () => {
    const [t] = await read('لي');
    expect(t?.lemma).toBe('ل');
    expect(t?.inflections).toEqual(['attached-me']);
  });

  it('reads the future as the verb it is a form of', async () => {
    const [t] = await read('سيكون');
    expect(t?.lemma).toBe('كان');
    expect(t?.inflections?.[0]).toBe('future');
  });
});

describe('the names of what is written onto an Arabic word', () => {
  it('are in the interface', () => {
    expect(Object.keys(grammar)).toEqual(expect.arrayContaining([...ARABIC_LABELS]));
  });
});
