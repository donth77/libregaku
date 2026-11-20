import type { LemmaHints } from './lemma';
import type { Token } from './types';

/**
 * What Italian forms need said of them that Wiktionary's table does not say
 * (lemma.ts, as Spanish's does in spanish.ts): which words a form is nearly
 * always a form of. ha is avere before it is "ha!", era essere before "era",
 * sei "you are" before "six". Add to a list only on evidence from running
 * Italian (compare against Tatoeba).
 */
export const ITALIAN: LemmaHints = {
  first: [
    'essere', 'avere', 'fare', 'andare', 'potere', 'volere', 'dovere', 'sapere', 'stare', 'dire', 'venire', 'dare',
    'vedere',
  ],
  // Over a rarer verb of the same form: piove is piovere, "it rains", before piova; saliamo salire, "we go up",
  // before salare, "to salt". In every sentence of 20,000 from Tatoeba that has them.
  common: ['piovere', 'salire'],
  // ha mangiato, è andato, ho detto: the compound tenses.
  auxiliaries: ['avere', 'essere'],
  // Articles and the pronouns that stand for a person: not qualcuno, niente or tutto, which are words to learn.
  grammar: [
    'il', 'lo', 'la', "l'", 'i', 'gli', 'le', 'un', 'uno', 'una', "un'",
    'io', 'tu', 'lui', 'lei', 'noi', 'voi', 'loro', 'egli', 'ella', 'esso', 'essa',
    'mi', 'ti', 'si', 'ci', 'vi', 'ne', 'me', 'te', 'se', 'sé', 'ce', 've', "m'", "t'", "s'", "c'", "v'",
  ],
  // Italian often leaves the pronoun out, and where it is written it names the person: io parlavo, loro parlavano.
  subjects: {
    io: 'first-person singular', tu: 'second-person singular', lui: 'third-person singular', lei: 'third-person singular',
    noi: 'first-person plural', voi: 'second-person plural', loro: 'third-person plural',
  },
  between: ['non', 'mi', 'ti', 'si', 'ci', 'vi', 'lo', 'la', 'li', 'le', 'gli', 'ne', 'me', 'te', 'se', 'ce', 've', 'già', 'mai', 'sempre'],
};

/**
 * The little words that lose their vowel before a word that starts with one,
 * and are written onto it with an apostrophe: l'acqua, un'altra, dell'anno,
 * c'è. The dictionary has each of them, l' and dell' and c', as a word.
 */
const ELIDED =
  /^(l|un|d|c|n|m|t|s|v|gl|quest|quell|quand|cos|com|dov|tutt|sant|bell|grand|(?:de|a|da|ne|su|co|tra|fra)ll)(['’])(?=\p{L})/iu;

/**
 * A word cut short at its end, written with an apostrophe after it: un po',
 * di' ("say!"), va' ("go!"). The browser leaves the apostrophe apart; the
 * dictionary has the word with it.
 */
const TRUNCATED = /^(po|mo|be|di|fa|va|sta|da|to)$/i;

/**
 * The line with each elision as two words, l' and acqua, and each word cut
 * short with its apostrophe again, po'. Where each piece starts is kept, so the
 * line still reads as it was written.
 */
export function splitItalian(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const next = tokens[i + 1];
    if (!t.punct && TRUNCATED.test(t.surface) && next?.punct && /^['’]$/.test(next.surface) && next.start === t.end) {
      out.push({ ...t, surface: t.surface + next.surface, end: next.end });
      i++;
      continue;
    }
    const head = t.punct ? null : ELIDED.exec(t.surface);
    if (!head) {
      out.push(t);
      continue;
    }
    const cut = head[0].length;
    out.push({ ...t, surface: t.surface.slice(0, cut), end: t.start + cut }, { ...t, surface: t.surface.slice(cut), start: t.start + cut });
  }
  return out;
}
