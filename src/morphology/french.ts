import type { LemmaHints } from './lemma';
import type { Token } from './types';

/**
 * What French forms need said of them that Wiktionary's table does not say
 * (lemma.ts, as Spanish's does in spanish.ts): which words a form is nearly
 * always a form of. est is "is" and also "east"; fait is a form of faire and
 * a noun, "a fact"; porte is "door" before it is "carries". Add to either
 * list only on that evidence, from running French (compare against Tatoeba).
 */
export const FRENCH: LemmaHints = {
  first: [
    'être', 'avoir', 'aller', 'faire', 'pouvoir', 'vouloir', 'devoir', 'savoir', 'voir', 'dire', 'venir',
    'prendre', 'falloir', 'mettre',
  ],
  common: [
    'aimer', 'parler', 'donner', 'penser', 'passer', 'trouver', 'croire', 'laisser', 'regarder', 'demander',
    'rester', 'arriver', 'tomber', 'sembler', 'appeler',
  ],
  // a mangé, est allé, ont dit: the compound tenses.
  auxiliaries: ['avoir', 'être'],
  // Articles and the pronouns that stand for a person: not le monde, quelqu'un or rien, which are words to learn.
  grammar: [
    'le', 'la', "l'", 'les', 'un', 'une', 'des', 'du', 'je', "j'", 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', "m'", 'te', "t'", 'se', "s'", 'lui', 'leur', 'moi', 'toi', 'soi', 'eux', 'ce', "c'", 'ça', 'y', 'en',
  ],
  // "Then", before "I can": 68 in 157,000 words of Tatoeba.
  keep: ['puis'],
  // j' is what splitElisions leaves of j'ai, j'étais.
  subjects: {
    je: 'first-person singular', "j'": 'first-person singular', tu: 'second-person singular',
    il: 'third-person singular', elle: 'third-person singular', on: 'third-person singular',
    nous: 'first-person plural', vous: 'second-person plural',
    ils: 'third-person plural', elles: 'third-person plural',
  },
  // ne, the pronouns a verb takes before it, and y and en: je ne le connaissais pas.
  between: ['ne', "n'", 'me', "m'", 'te', "t'", 'se', "s'", 'le', 'la', "l'", 'les', 'lui', 'leur', 'y', 'en', 'nous', 'vous'],
};

/**
 * The little words that lose their vowel before a word that starts with one,
 * and are written onto it with an apostrophe: l'eau, qu'il, n'est, j'ai.
 * Not aujourd'hui, quelqu'un or presqu'île, which are one word each.
 */
const ELIDED = /^(l|d|j|n|m|t|s|c|qu|jusqu|lorsqu|puisqu|quoiqu)(['’])(?=\p{L})/iu;

/**
 * The same line with each elision as two words, l' and eau: the dictionary
 * lists l' and the verb it joins, and a learner is learning both. Where each
 * piece starts is kept, so the line still reads as it was written.
 */
export function splitElisions(tokens: Token[]): Token[] {
  return tokens.flatMap((t, i) => {
    if (t.punct) return [t];
    const head = ELIDED.exec(t.surface);
    if (!head) return [t];
    // c'est-à-dire is one phrase, and the dictionary has it whole: joined again from c'est, -, à, -, dire.
    if (/^c['’]est$/i.test(t.surface) && tokens.slice(i + 1, i + 5).map((x) => x.surface).join('').toLowerCase() === '-à-dire') return [t];
    const cut = head[0].length;
    return [
      { ...t, surface: t.surface.slice(0, cut), end: t.start + cut },
      { ...t, surface: t.surface.slice(cut), start: t.start + cut },
    ];
  });
}

/**
 * What stands apart in a hyphenated French word: the pronoun after a verb (veux-tu, dis-moi, a-t-il) and
 * what is added to a word (celle-ci, là-bas). The dictionary has the ones that are words.
 */
export const APART = /^(je|tu|il|elle|on|nous|vous|ils|elles|moi|toi|lui|leur|le|la|les|y|en|ce|t|ci|là|même|mêmes)$/;

/** The curly apostrophe French is often typed with, as the dictionary writes it. */
export const straighten = (surface: string): string => surface.replace(/’/g, "'");
