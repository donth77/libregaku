import type { LemmaHints } from './lemma';

/**
 * What Spanish forms need said of them that Wiktionary's table does not say
 * (lemma.ts): which words a form is nearly always a form of.
 *
 * The table lists what a form can be, with no count of how often. era is a
 * form of ser and also the noun "era"; son is "they are" and also "sound";
 * creo is "I believe" and "I create". Measured over 40,000 Tatoeba
 * sentences, these few verbs are where reading the noun, or the wrong verb,
 * was wrong nearly every time. Add to either list only on that evidence.
 */
export const SPANISH: LemmaHints = {
  // The verbs every sentence leans on. In order: fue and fui are ser before ir.
  first: [
    'ser', 'estar', 'haber', 'tener', 'hacer', 'poder', 'decir', 'ver', 'ir', 'dar', 'saber', 'querer',
    'venir', 'salir', 'poner',
  ],
  // Over a rarer verb of the same form (creo: crear), or a noun seldom meant
  // (mira "gunsight", espera "wait", llama "flame", deja, queda, toma).
  common: ['creer', 'sentir', 'mirar', 'esperar', 'llamar', 'dejar', 'quedar', 'hablar', 'tomar', 'pensar'],
  // ha pasado, he hecho, había dicho: the perfect tenses.
  auxiliaries: ['haber'],
};
