import { describe, expect, it } from 'vitest';
import { ENGLISH, englishEndings } from '../english';
import { straighten } from '../french';
import { IntlSegmenter } from '../intl';
import { lemmaTokens, type FormInfo, type Forms } from '../lemma';

/**
 * English to its dictionary forms, over rows as Wiktionary's own (wiktionary-to-yomitan, 2026-10-22) has them,
 * cut down. What the real file makes of 20,000 sentences from Tatoeba was read when the hints were written.
 */

const v = (lemma: string, tags: string, senses = 20) => ({ lemma, tags: [tags], pos: 'v', senses });
const word = (kind: string[], of: FormInfo['of'] = [], senses = 2): FormInfo => ({ word: true, kind, senses, of });
const form = (...of: FormInfo['of']): FormInfo => ({ word: false, senses: 0, kind: [], of });
const PAST = 'first/second/third-person singular past';

const EN: Forms = {
  I: word(['pron'], [], 6),
  i: word(['letter', 'n', 'num'], [], 4),
  he: word(['pron'], [], 4),
  said: word(['adj', 'det'], [v('say', PAST, 17), v('say', 'past past participle simple and', 17)], 2),
  thought: word(['n'], [v('think', PAST, 11)], 6),
  saw: word(['n', 'v'], [v('see', PAST, 25)], 15),
  going: word(['v', 'n', 'adj'], [v('go', 'present gerund participle and', 97)], 11),
  am: form(v('be', 'first-person singular present indicative simple', 28)),
  is: form(v('be', 'third-person singular present indicative simple', 28)),
  was: form(v('be', 'first/third-person singular past', 28)),
  has: form(v('have', 'third-person singular present indicative simple', 30)),
  "I'm": word(['contr'], [], 1),
  "wasn't": word(['contr'], [], 1),
  been: word(['v', 'rare'], [v('be', 'past participle', 28)], 4),
  come: word(['v', 'n'], [{ lemma: 'cum', tags: ['past participle'], pos: 'v', senses: 8 }], 32),
  tired: word(['adj'], [v('tire', 'past past participle simple and', 13)], 5),
  able: word(['adj', 'v'], [v('can', 'present participle suppletive', 34)], 16),
  trying: word(['adj'], [v('try', 'present gerund participle and', 20)], 2),
  the: word(['artic'], [], 8),
  new: word(['adj'], [], 10),
  building: word(['n'], [v('build', 'present gerund participle and', 12)], 4),
  Mary: word(['name'], [], 10),
  mary: form({ lemma: 'marry', tags: ['alternative'], senses: 11 }, { lemma: 'Mary', tags: ['alternative'], pos: 'n', senses: 10 }),
  favorite: form({ lemma: 'favourite', tags: ['alternative'], pos: 'adj', senses: 10 }),
  // a is a pronoun and a verb as well to the dictionary; bee an obsolete participle of be.
  a: word(['artic', 'pron', 'v', 'n'], [], 42),
  bee: word(['n', 'obs'], [v('be', 'past participle', 28)], 7),
  his: word(['det', 'pron'], [], 3),
  means: word(['n'], [v('mean', 'third-person singular present indicative simple', 12)], 6),
  // blew is blow's past, and an old spelling of blue.
  all: word(['det', 'pron', 'adv'], [], 9),
  blew: form(v('blow', PAST, 30), { lemma: 'blue', tags: ['alternative', 'obsolete'], pos: 'adj', senses: 20 }),
};

const tokens = (text: string) => new IntlSegmenter('en').segment(text);
const lemmas = (text: string) =>
  lemmaTokens(tokens(text), EN, 'en', ENGLISH, straighten).filter((t) => !t.punct).map((t) => t.lemma);

describe('English to its dictionary forms', () => {
  it('reads I as the pronoun, first in a sentence too, where in lower case it is the letter', () => {
    expect(lemmas('I said')).toEqual(['I', 'say']);
    expect(lemmas('he said I was')).toEqual(['he', 'say', 'I', 'be']);
  });

  it('reads a past or a participle of a common verb as the verb, though the dictionary has it as a word', () => {
    expect(lemmas('he said')).toEqual(['he', 'say']);
    expect(lemmas('thought')).toEqual(['think']);
    expect(lemmas('he saw')).toEqual(['he', 'see']);
    expect(lemmas('going')).toEqual(['go']);
  });

  it('reads the participle after be or have, and after a contraction of them', () => {
    expect(lemmas('has been')).toEqual(['have', 'be']);
    expect(lemmas("I'm going")).toEqual(["I'm", 'go']);
    expect(lemmas('has trying')).toEqual(['have', 'try']);
  });

  it('keeps a common verb that is its own participle: has come is come, not a form of cum', () => {
    expect(lemmas('has come')).toEqual(['have', 'come']);
  });

  it('keeps the adjectives it lists after be: I am tired, he was not able to', () => {
    expect(lemmas('am tired')).toEqual(['be', 'tired']);
    expect(lemmas("wasn't able")).toEqual(["wasn't", 'able']);
  });

  it('reads the word after an article or a possessive as a noun where it is one: a bee, his means', () => {
    expect(lemmas('a bee')).toEqual(['a', 'bee']);
    expect(lemmas('his means')).toEqual(['his', 'means']);
  });

  it('never takes the word a form is only another spelling of for the kind expected: all blew is blow', () => {
    expect(lemmas('all blew')).toEqual(['all', 'blow']);
  });

  it('keeps a noun it lists before the verb it is also a form of', () => {
    expect(lemmas('the new building')).toEqual(['the', 'new', 'building']);
  });

  it('reads a capital that opens a sentence as the word, where the lower case is only another spelling', () => {
    expect(lemmas('Mary')).toEqual(['Mary']);
  });

  it('reads an American spelling as the word Wiktionary files it under', () => {
    expect(lemmas('favorite')).toEqual(['favourite']);
  });
});

describe('English possessives', () => {
  it("reads Tom's and the dogs' as the word the ending is written onto", () => {
    expect(englishEndings("Tom's")).toEqual([{ key: 'Tom', label: 'possessive' }]);
    expect(englishEndings("dogs'")).toEqual([{ key: 'dogs', label: 'possessive' }]);
    expect(englishEndings('dogs')).toEqual([]);
  });
});
