import type { Ending, LemmaHints } from './lemma';

/**
 * What English forms need said of them that Wiktionary's table does not say
 * (lemma.ts, as Spanish's does in spanish.ts): which words a form is nearly
 * always a form of.
 *
 * Wiktionary has a word of its own for many a verb's past and participle:
 * said is an adjective ("the said house"), thought a noun, going a noun and an
 * adjective, been and done words of their own. A learner hovering any of them
 * in a line wants the verb. Measured over 20,000 Tatoeba sentences with
 * scripts/measure-forms.mjs; add to a list only on that evidence.
 */
export const ENGLISH: LemmaHints = {
  // The verbs whose forms are words of their own as well. In order, where a form is two of them.
  first: [
    'be', 'have', 'do', 'say', 'go', 'get', 'make', 'know', 'think', 'take', 'see', 'come', 'want', 'give', 'tell', 'find',
    'use', 'feel', 'leave', 'become', 'mean', 'keep', 'let', 'begin', 'hear', 'bring', 'hold', 'write', 'sit', 'stand',
    'lose', 'pay', 'meet', 'run', 'speak', 'understand', 'read', 'spend', 'grow', 'win', 'teach', 'buy', 'send', 'build',
    'fall', 'break', 'eat', 'drive', 'forget', 'catch', 'sell', 'wear', 'choose', 'fight', 'throw', 'drink', 'sleep',
  ],
  common: [],
  firstParticiples: true,
  // has gone, had seen, was taken, is going: the perfect, the passive and the progressive; and the same after a
  // contraction of have or be.
  auxiliaries: [
    'have', 'be', "I've", "you've", "we've", "they've", "I'm", "you're", "we're", "they're", "he's", "she's", "it's",
    "that's", "there's", "who's", "what's", "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't", "hadn't",
  ],
  // Adjectives after be, though the dictionary has each as a participle as well: I'm tired, he wasn't able to.
  adjectives: [
    'able', 'born', 'supposed', 'surprised', 'interested', 'interesting', 'married', 'willing', 'scared', 'worried',
    'tired', 'bored', 'boring', 'pleased', 'determined', 'missing', 'disappointed', 'embarrassed', 'annoyed',
    'terrified', 'frightened', 'shocked', 'excited', 'exciting', 'confused', 'satisfied', 'ashamed',
  ],
  // A noun follows these: a bee, his means, the left. (Not this or that, which as often stand alone: that made me.)
  determiners: ['a', 'an', 'the', 'my', 'your', 'his', 'her', 'its', 'our', 'their'],
  // Nouns before they are a form of a verb in `first`: the new building, the morning meeting.
  keep: ['building', 'meeting'],
  // I, written so wherever it stands; in lower case it is the letter.
  capitals: ['I', "I'm", "I've", "I'll", "I'd"],
  // Tom at the start of a line is the Tom of the lines before, not tom, "a male cat".
  names: true,
  // Articles and the pronouns that stand for a person: not someone, everything or nobody, which are words to learn.
  grammar: ['the', 'a', 'an', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'],
};

/**
 * A word the dictionary has nothing for, by its ending: a possessive, which Wiktionary does not list as a form
 * (Tom's, the dog's, the dogs'), is the word it is written onto.
 */
export function englishEndings(word: string): Ending[] {
  if (/[^']'s$/i.test(word)) return [{ key: word.slice(0, -2), label: 'possessive' }];
  if (/s'$/i.test(word)) return [{ key: word.slice(0, -1), label: 'possessive' }];
  return [];
}
