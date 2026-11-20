import { describe, expect, it } from 'vitest';
import { IntlSegmenter } from '../intl';
import { lemmaTokens, type FormInfo, type Forms } from '../lemma';
import { THAI, joinRepeats, unrepeat } from '../thai';

/**
 * Thai to the dictionary's words, over the browser's own word boundaries and
 * rows as Wiktionary's (wiktionary-to-yomitan, 2026-10-22) has them, cut down.
 * What the real file makes of Tatoeba's 6,853 Thai sentences was read when
 * this was written: 98% of words find an entry, and nearly all the rest are names.
 */

const word = (kind: string[], senses = 2): FormInfo => ({ word: true, kind, senses, of: [] });
const words = (text: string) => joinRepeats(new IntlSegmenter('th').segment(text)).filter((t) => !t.punct);

describe('ๆ, which says the word before it again', () => {
  it('is one word with the word it repeats, written close or after a space', () => {
    expect(words('เด็กๆ เล่นกัน').map((t) => t.surface)).toEqual(['เด็กๆ', 'เล่น', 'กัน']);
    expect(words('จริง ๆ').map((t) => t.surface)).toEqual(['จริง ๆ']);
    expect(words('จริง ๆ').map((t) => [t.start, t.end])).toEqual([[0, 6]]);
  });

  it('is looked up as the word it repeats', () => {
    expect(unrepeat('เด็กๆ')).toBe('เด็ก');
    expect(unrepeat('จริง ๆ')).toBe('จริง');
    expect(unrepeat('ไป')).toBe('ไป');
  });
});

describe('Thai to its words', () => {
  const TH: Forms = {
    เข้าใจ: word(['v'], 1),
    // Given an entry of its own (GAPS in src/dict/sources.ts): the file has it only the wrong way round.
    มั้ย: word(['ptcl'], 1),
    จริง: word(['adj', 'adv'], 2),
  };
  const lemmas = (text: string) => lemmaTokens(words(text), TH, 'th', THAI, unrepeat).filter((t) => !t.punct).map((t) => t.lemma);

  it('reads a spoken particle as the word it is', () => {
    expect(lemmas('เข้าใจมั้ย')).toEqual(['เข้าใจ', 'มั้ย']);
  });

  it('reads a repeated word as the word', () => {
    expect(lemmas('จริง ๆ')).toEqual(['จริง']);
  });
});
