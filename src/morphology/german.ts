import type { LemmaHints } from './lemma';

/**
 * What German forms need said of them that Wiktionary's table does not say
 * (lemma.ts, as Spanish's does in spanish.ts). war is "was" and also a word
 * of its own; meine is a form of mein and of meiner. Add to either list only
 * on that evidence, from running German (compare against Tatoeba).
 */
export const GERMAN: LemmaHints = {
  first: [
    'sein', 'haben', 'werden', 'können', 'müssen', 'wollen', 'sollen', 'dürfen', 'mögen', 'wissen', 'gehen',
    'machen', 'geben', 'kommen', 'sehen', 'sagen',
  ],
  // Over the longer word a form is just as well a form of: meine is mein's, before meiner's.
  common: ['mein', 'dein', 'sein', 'ihr', 'unser', 'euer', 'kein', 'dieser', 'jener', 'welcher', 'solcher'],
  // hat gemacht, ist gegangen, wird gesehen: the compound tenses.
  auxiliaries: ['haben', 'sein', 'werden'],
  // The cases, not the Spanish pronouns of the same names.
  renamed: { accusative: 'accusative-case', dative: 'dative-case' },
  // sie is she, they and the formal you, so it says nothing.
  subjects: {
    ich: 'first-person singular', du: 'second-person singular', er: 'third-person singular', es: 'third-person singular',
    wir: 'first-person plural', ihr: 'second-person plural',
  },
  between: ['nicht', 'auch', 'nie', 'immer', 'dann', 'jetzt', 'schon', 'noch', 'mich', 'dich', 'ihn', 'uns', 'euch', 'mir', 'dir', 'ihm'],
};
