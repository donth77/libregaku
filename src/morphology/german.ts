import type { CompoundRules } from './compound';
import type { LemmaHints } from './lemma';
import type { Token } from './types';

/** What German puts between the parts of a compound: Arbeit-s-zimmer, Hund-e-hütte, Frau-en-arzt. */
export const GERMAN_COMPOUNDS: CompoundRules = {
  minPart: 3,
  links: ['s', 'es', 'n', 'en', 'e', 'er', 'ens'],
  prefixes: ['ab', 'an', 'auf', 'aus', 'ein', 'mit', 'nach', 'vor', 'weg', 'zu', 'um', 'her', 'hin', 'los'],
  endings: /^end(e|es|er|en|em)?$/,
  adjectiveEndings: ['e', 'en', 'em', 'er', 'es'],
  participle: 'd',
  verbPrefixes: [
    'zusammen', 'entgegen', 'zurück', 'heraus', 'herein', 'hinaus', 'hinein', 'herum', 'hervor', 'vorbei', 'weiter', 'wieder',
    'heran', 'empor', 'durch', 'unter', 'über', 'fest', 'fort', 'hoch', 'nach', 'auf', 'aus', 'bei', 'ein', 'mit', 'vor', 'weg',
    'her', 'hin', 'los', 'ab', 'an', 'um', 'zu',
  ],
  infinitiveMarker: 'zu',
  suffixes: ['keit', 'heit', 'schaft', 'ung', 'lich', 'isch', 'haft', 'los', 'bar', 'sam', 'ig', 'chen', 'lein'],
};

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
  // Articles and the pronouns that stand for a person: not nichts, jemand or man, which are words to learn.
  grammar: [
    'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
    'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mich', 'dich', 'ihn', 'uns', 'euch', 'mir', 'dir', 'ihm', 'ihnen', 'sich',
  ],
  // The cases, not the Spanish pronouns of the same names.
  renamed: { accusative: 'accusative-case', dative: 'dative-case' },
  // Which ending an adjective takes depends on the article before it, and is no part of what the word is.
  omit: ['strong', 'weak', 'mixed', 'without-article', 'definite', 'indefinite', 'subjunctive-i', 'subjunctive-ii'],
  // sie is she, they and the formal you, so it says nothing.
  subjects: {
    ich: 'first-person singular', du: 'second-person singular', er: 'third-person singular', es: 'third-person singular',
    wir: 'first-person plural', ihr: 'second-person plural',
  },
  between: ['nicht', 'auch', 'nie', 'immer', 'dann', 'jetzt', 'schon', 'noch', 'mich', 'dich', 'ihn', 'uns', 'euch', 'mir', 'dir', 'ihm'],
};

/** Where "geht's" and "sag's" end: es, run on to the verb with an apostrophe. */
const CLITIC_S = /^(\p{L}+)(['’]s)$/u;

/**
 * The line with each verb and its 's as two words: geht and 's, which the
 * dictionary has as a form of es.
 */
export function splitClitics(tokens: Token[]): Token[] {
  return tokens.flatMap((t) => {
    const m = t.punct ? null : CLITIC_S.exec(t.surface);
    if (!m) return [t];
    const cut = (m[1] ?? '').length;
    return [
      { ...t, surface: t.surface.slice(0, cut), end: t.start + cut },
      { ...t, surface: t.surface.slice(cut), start: t.start + cut },
    ];
  });
}
