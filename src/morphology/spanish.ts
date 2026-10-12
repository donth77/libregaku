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
  // Articles and the pronouns that stand for a person: not nadie, alguien or todo, which are words to learn.
  grammar: [
    'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'yo', 'tú', 'vos', 'él', 'ella', 'usted', 'nosotros', 'nosotras',
    'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes', 'me', 'te', 'se', 'lo', 'le', 'les', 'nos', 'os', 'mí', 'ti', 'sí',
  ],
  // Spanish often leaves the pronoun out, and where it is written it names the person: yo hablaba, ellos hablaban.
  subjects: {
    yo: 'first-person singular', 'tú': 'second-person singular', vos: 'second-person singular',
    'él': 'third-person singular', ella: 'third-person singular', usted: 'third-person singular',
    nosotros: 'first-person plural', nosotras: 'first-person plural',
    vosotros: 'second-person plural', vosotras: 'second-person plural',
    ellos: 'third-person plural', ellas: 'third-person plural', ustedes: 'third-person plural',
  },
  between: ['no', 'se', 'me', 'te', 'lo', 'la', 'le', 'les', 'los', 'las', 'nos', 'os', 'ya', 'también', 'siempre', 'nunca'],
};
