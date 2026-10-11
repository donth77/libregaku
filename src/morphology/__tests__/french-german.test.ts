import { describe, expect, it } from 'vitest';
import { FRENCH, splitElisions, straighten } from '../french';
import { GERMAN } from '../german';
import { IntlSegmenter } from '../intl';
import { lemmaTokens, type FormInfo, type Forms } from '../lemma';

/**
 * French and German to their dictionary forms, over rows as Wiktionary's own
 * (wiktionary-to-yomitan, 2026-10-04) has them, cut down. What the real files
 * make of 20,000 sentences from Tatoeba was read when the hints were written.
 */

const v = (lemma: string, tags: string, senses = 6) => ({ lemma, tags: [tags], pos: 'v', senses });
const word = (kind: string[], of: FormInfo['of'] = [], senses = 2): FormInfo => ({ word: true, kind, senses, of });
const form = (...of: FormInfo['of']): FormInfo => ({ word: false, senses: 0, kind: [], of });

const FR: Forms = {
  est: word(['n'], [v('être', 'third-person singular present indicative', 12)], 2),
  fait: word(['n'], [v('faire', 'third-person singular present indicative', 20), v('faire', 'past participle', 20)], 3),
  mangé: form(v('manger', 'past participle')),
  a: word(['n', 'prep'], [v('avoir', 'third-person singular present indicative', 14)], 4),
  "l'": word(['artic', 'pron'], [], 2),
  "n'": word(['contr'], [], 1),
  "j'": form({ lemma: 'je', tags: ['clitic form'], pos: 'pron', senses: 2 }),
  ai: form(v('avoir', 'first-person singular present indicative', 14)),
  eau: word(['n'], [], 3),
  homme: word(['n'], [], 4),
  aujourd: word(['n'], [], 1),
  "aujourd'hui": word(['adv'], [], 2),
  il: word(['pron'], [], 2),
};

const tokens = (text: string, locale: string, prepare = (t: ReturnType<IntlSegmenter['segment']>) => t) =>
  prepare(new IntlSegmenter(locale).segment(text));

describe('French elisions', () => {
  it('reads l\'eau and n\'est as two words each, where the line puts them', () => {
    const out = splitElisions(tokens("l'eau n'est pas", 'fr')).filter((t) => !t.punct);
    expect(out.map((t) => t.surface)).toEqual(["l'", 'eau', "n'", 'est', 'pas']);
    expect(out.map((t) => [t.start, t.end])).toEqual([[0, 2], [2, 5], [6, 8], [8, 11], [12, 15]]);
  });

  it('splits the curly apostrophe too, and leaves a word that has an apostrophe in it whole', () => {
    expect(splitElisions(tokens('qu’il', 'fr')).map((t) => t.surface)).toEqual(['qu’', 'il']);
    for (const whole of ["aujourd'hui", "quelqu'un", "presqu'île"]) {
      expect(splitElisions(tokens(whole, 'fr')).map((t) => t.surface)).toEqual([whole]);
    }
  });

  it('finds the dictionary form of the word and the little word before it', () => {
    const out = lemmaTokens(splitElisions(tokens("j'ai l'homme", 'fr')), FR, 'fr', FRENCH, straighten).filter((t) => !t.punct);
    expect(out.map((t) => t.lemma)).toEqual(['je', 'avoir', "l'", 'homme']);
  });

  it('looks up a curly apostrophe as the dictionary writes it', () => {
    const out = lemmaTokens(splitElisions(tokens('J’ai', 'fr')), FR, 'fr', FRENCH, straighten).filter((t) => !t.punct);
    expect(out.map((t) => t.lemma)).toEqual(['je', 'avoir']);
  });
});

describe('a form that is two persons, and a spelling that is not another word', () => {
  const CONNAITRE: Forms = {
    je: word(['pron'], [], 2),
    tu: word(['pron'], [], 2),
    il: word(['pron'], [], 2),
    connaître: word(['v'], [], 5),
    connaissais: form(
      { ...v('connaître', 'first/second-person singular imperfect indicative/indicative', 5) },
      // The post-1990 spelling is filed as a word of its own, and under it as another way of writing connaître.
      { ...v('connaitre', 'first/second-person singular imperfect indicative', 1), spellingOf: ['connaître'] },
    ),
  };
  const say = (text: string, locale = 'fr') =>
    lemmaTokens(splitElisions(tokens(text, locale)), CONNAITRE, locale, FRENCH, straighten).filter((t) => !t.punct);

  it('reads je connaissais as first person only, and tu connaissais as second', () => {
    expect(say('je connaissais')[1]?.inflections).toEqual(['first-person singular imperfect indicative']);
    expect(say('tu connaissais')[1]?.inflections).toEqual(['second-person singular imperfect indicative']);
  });

  it('keeps the pronoun through the little words between: je ne connaissais, tu me connaissais', () => {
    expect(say('je ne connaissais')[2]?.inflections).toEqual(['first-person singular imperfect indicative']);
    expect(say('tu ne me connaissais')[3]?.inflections).toEqual(['second-person singular imperfect indicative']);
  });

  it('does not take the second pronoun for who does it: je vous connaissais is still I', () => {
    // vous is who was known, not the one who knew.
    expect(say('je vous connaissais')[2]?.inflections).toEqual(['first-person singular imperfect indicative']);
  });

  it('shows both persons where there is no pronoun to say which', () => {
    expect(say('connaissais')[0]?.inflections).toEqual([
      'first-person singular imperfect indicative', 'second-person singular imperfect indicative',
    ]);
  });

  it('does not name the 1990 spelling as another word it may be a form of, though it stays a lookup away', () => {
    const out = say('je connaissais')[1];
    expect(out?.inflections?.some((l) => l.startsWith('or '))).toBe(false);
    expect(out?.lookup?.map((l) => l.key)).toContain('connaitre');
  });
});

describe('French dictionary forms', () => {
  const lemmas = (text: string): string[] =>
    lemmaTokens(tokens(text, 'fr'), FR, 'fr', FRENCH).filter((t) => !t.punct).map((t) => t.lemma ?? t.surface);

  it('takes est and a for the verbs, not "east" or the letter', () => {
    expect(lemmas('il est là')).toEqual(['il', 'être', 'là']);
    expect(lemmas('il a mangé')).toEqual(['il', 'avoir', 'manger']);
  });

  it('takes fait for faire, not "a fact"', () => {
    expect(lemmas('il a fait')).toEqual(['il', 'avoir', 'faire']);
    expect(lemmas('fait')).toEqual(['faire']);
  });
});

const DE: Forms = {
  war: word(['n'], [v('sein', 'first/third-person singular preterite', 30)], 2),
  ist: form(v('sein', 'third-person singular present indicative', 30)),
  meine: form({ lemma: 'meiner', tags: ['nominative feminine'], pos: 'pron', senses: 3 }, { lemma: 'mein', tags: ['nominative feminine'], pos: 'det', senses: 2 }),
  tun: word(['v'], [v('tunen', 'first-person plural present indicative', 1)], 5),
  wir: word(['pron'], [], 2),
  Haus: word(['n'], [], 7),
  Häuser: form({ lemma: 'Haus', tags: ['nominative plural'], pos: 'n', senses: 7 }),
};

describe('German dictionary forms', () => {
  const lemmas = (text: string): string[] =>
    lemmaTokens(tokens(text, 'de'), DE, 'de', GERMAN).filter((t) => !t.punct).map((t) => t.lemma ?? t.surface);

  it('takes war for sein', () => {
    expect(lemmas('es war')).toEqual(['es', 'sein']);
  });

  it('takes meine for mein, the shorter word, before meiner', () => {
    expect(lemmas('meine Häuser')).toEqual(['mein', 'Haus']);
  });

  it('keeps a verb that is itself the infinitive after a pronoun: wir tun is tun, not a form of tunen', () => {
    expect(lemmas('wir tun')).toEqual(['wir', 'tun']);
  });

  it('names the German cases as cases, not as the Spanish pronouns that share their names', () => {
    const forms: Forms = {
      dem: form({ lemma: 'der', tags: ['dative singular definite masculine/neuter'], pos: 'art', senses: 9 }),
      den: form({ lemma: 'der', tags: ['accusative singular masculine'], pos: 'art', senses: 9 }),
    };
    const say = (surface: string): string[] | undefined =>
      lemmaTokens(tokens(surface, 'de'), forms, 'de', GERMAN)[0]?.inflections;
    expect(say('dem')).toEqual(['dative-case singular definite masculine', 'dative-case singular definite neuter']);
    expect(say('den')).toEqual(['accusative-case singular masculine']);
  });

  it('finds a noun by the capital it is written with', () => {
    expect(lemmas('Häuser')).toEqual(['Haus']);
  });
});
