import type { LemmaHints } from './lemma';

/**
 * What Portuguese forms need said of them that Wiktionary's table does not
 * say (lemma.ts, as Spanish's does in spanish.ts): which words a form is
 * nearly always a form of. é is ser before it is "yeah", foi ser and ir before
 * "done", são "are" before "healthy". Add to a list only on evidence from
 * running Portuguese (compare against Tatoeba).
 */
export const PORTUGUESE: LemmaHints = {
  // In order: foi is ser before ir, as fue is in Spanish.
  first: [
    'ser', 'estar', 'ter', 'haver', 'ir', 'fazer', 'poder', 'dizer', 'dar', 'ver', 'saber', 'querer', 'vir', 'ficar',
  ],
  common: [],
  // tenho feito, tinha dito, havia chegado: the compound tenses.
  auxiliaries: ['ter', 'haver'],
  // Articles and the pronouns that stand for a person: not alguém, nada or tudo, which are words to learn.
  grammar: [
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'eu', 'tu', 'você', 'ele', 'ela', 'nós', 'vós', 'vocês', 'eles', 'elas',
    'me', 'te', 'se', 'lhe', 'lhes', 'nos', 'vos', 'mim', 'ti', 'si', 'lo', 'la', 'los', 'las',
  ],
  subjects: {
    eu: 'first-person singular', tu: 'second-person singular', você: 'third-person singular', ele: 'third-person singular',
    ela: 'third-person singular', nós: 'first-person plural', vós: 'second-person plural', vocês: 'third-person plural',
    eles: 'third-person plural', elas: 'third-person plural',
  },
  between: ['não', 'me', 'te', 'se', 'lhe', 'lhes', 'nos', 'vos', 'o', 'a', 'os', 'as', 'já', 'nunca', 'sempre', 'também'],
};

/**
 * What stands apart in a hyphenated Portuguese word: the pronoun after a verb
 * (diga-me, chama-se). A verb with o or a written onto it (ajudá-lo, fazê-la)
 * is one word to the dictionary, which has it as a form of the verb.
 */
export const APART_PT = /^(me|te|se|lhe|lhes|nos|vos|o|a|os|as|no|na|nos|nas)$/;
