import { describe, expect, it } from 'vitest';
import { grammar } from '../../i18n/en/grammar';
import { IntlSegmenter } from '../intl';
import { FORM_LABELS, lemmaOf, lemmaTokens, type FormInfo, type Forms } from '../lemma';
import { SPANISH } from '../spanish';

/**
 * Spanish words to their dictionary forms, from the dictionary's table of
 * inflected forms. The rows here are Wiktionary's own, as
 * wiktionary-to-yomitan publishes them, with the number of meanings each
 * word has there.
 */

const v = (lemma: string, tags: string, senses = 3) => ({ lemma, tags: [tags], pos: 'v', senses });
const n = (lemma: string, tags: string, senses = 2) => ({ lemma, tags: [tags], pos: 'np', senses });
const word = (kind: string[], of: FormInfo['of'] = [], senses = 2): FormInfo => ({ word: true, kind, senses, of });
const form = (...of: FormInfo['of']): FormInfo => ({ word: false, senses: 0, kind: [], of });

const FORMS: Forms = {
  // Verbs, and forms that are nothing else.
  hablar: word(['v'], [v('fabular', 'alt-of', 1)]),
  hablábamos: form(v('hablar', 'first-person plural imperfect indicative')),
  hablamos: form(
    v('hablar', 'first-person plural indicative preterite'), v('hablar', 'first-person plural present indicative'),
    v('hablar', 'first-person plural present/preterite indicative'),
  ),
  hablaría: form(v('hablar', 'first-person singular conditional'), v('hablar', 'third-person singular conditional')),
  puede: form(v('poder', 'third-person singular present indicative')),
  ser: word(['v', 'n'], [], 6),
  // The letter e, plural; and "is".
  es: form(n('e', 'plural', 3), v('ser', 'third-person singular present indicative', 6)),
  fue: form(
    v('ir', 'third-person singular indicative preterite', 9), v('ser', 'third-person singular indicative preterite', 6),
    v('fué', 'alt-of', 0), v('fué', 'archaic', 0),
  ),
  // her is an old form of haber with no entry of its own.
  ha: form(v('her', 'first/third-person singular present subjunctive', 0), v('haber', 'third-person singular present indicative', 5)),
  he: word(['n', 'adv'], [v('haber', 'first-person singular present indicative', 5)], 2),
  // Nouns that are also forms of a verb.
  era: word(['n'], [v('ser', 'first/third-person singular imperfect indicative/indicative', 6)], 4),
  son: word(['n'], [v('ser', 'third-person plural present indicative', 6)], 3),
  vino: word(['n'], [v('venir', 'third-person singular indicative preterite', 5), v('llamar al pan, pan, y al vino, vino', 'form', 1)], 2),
  casa: word(['n'], [v('casar', 'informal second-person singular imperative'), v('casar', 'third-person singular present indicative')], 1),
  Casa: word(['name'], [], 1),
  mira: word(['n'], [v('mirar', 'informal second-person singular imperative'), v('mirar', 'third-person singular present indicative')], 2),
  hecho: word(['n', 'adj'], [v('hacer', 'masculine singular past participle', 9)], 3),
  visto: word(['adj'], [v('vestir', 'first-person singular present indicative', 4), v('ver', 'masculine singular past participle', 8)], 1),
  estados: form(v('estar', 'plural masculine past participle', 7), n('estado', 'plural', 6)),
  haciendo: form(v('hacendar', 'first-person singular present indicative', 1), v('hacer', 'gerund', 9)),
  // Words of a fixed stock that are also forms of a verb.
  como: word(['adv', 'conj', 'prep'], [v('comer', 'first-person singular present indicative')], 9),
  entre: word(['prep'], [v('entrar', 'first/third-person singular present subjunctive/subjunctive', 5)], 5),
  fuera: word(['adv'], [v('ser', 'first/third-person singular imperfect subjunctive', 6), v('ir', 'first/third-person singular imperfect subjunctive', 9)], 2),
  // Two words a form may equally be a form of.
  creo: form(v('crear', 'first-person singular present indicative', 3), v('creer', 'first-person singular present indicative', 3)),
  vive: form(v('vivar', 'first/third-person singular present subjunctive', 1), v('vivir', 'third-person singular present indicative', 4)),
  cosas: form(v('coser', 'second-person singular present subjunctive', 2), n('cosa', 'plural', 5)),
  niñas: form({ lemma: 'niño', tags: ['plural feminine'], pos: 'n', senses: 2 }, n('niña', 'plural', 2)),
  estos: form(v('éstos', 'alt-of', 1), { lemma: 'este', tags: ['masculine plural'], pos: 'adj', senses: 3 }),
  stá: form(v('está', 'alt-of', 0)),
  // What leads to a noun or a verb.
  el: word(['artic'], [], 2),
  la: word(['artic', 'pron', 'n'], [], 4),
  lo: word(['pron', 'artic'], [], 2),
  mi: word(['det'], [], 2),
  se: word(['pron'], [], 5),
  dónde: word(['adv'], [], 1),
  España: word(['name'], [], 3),
  no: word(['adv', 'intj', 'n'], [], 4),
};

const lemma = (surface: string, opts: Parameters<typeof lemmaOf>[2] = {}) =>
  lemmaOf(surface, FORMS, { hints: SPANISH, ...opts }).lemma;

describe('lemmaOf', () => {
  it('resolves an inflected form to its dictionary form, and says what form it is', () => {
    expect(lemmaOf('hablábamos', FORMS)).toEqual({
      lemma: 'hablar', inflections: ['first-person plural imperfect indicative'], lookup: ['hablar', 'hablábamos'],
    });
  });

  it('names at most two readings of a form, and not their sum', () => {
    expect(lemmaOf('hablamos', FORMS).inflections).toEqual([
      'first-person plural indicative preterite', 'first-person plural present indicative',
    ]);
  });

  it('gives the conditional mood a label of its own, apart from the Japanese "if"', () => {
    expect(lemmaOf('hablaría', FORMS).inflections).toEqual([
      'first-person singular conditional-mood', 'third-person singular conditional-mood',
    ]);
  });

  it('has a name in the interface for every word it lists', () => {
    expect(Object.keys(grammar)).toEqual(expect.arrayContaining([...FORM_LABELS]));
  });

  it('reads a conjugated form of the commonest verbs as the verb, whatever else it is', () => {
    // The plural of the letter e; an era; a sound; a letter's name.
    expect(lemma('es')).toBe('ser');
    expect(lemma('era')).toBe('ser');
    expect(lemma('son')).toBe('ser');
    expect(lemma('he')).toBe('haber');
    // An old form with no entry of its own is no candidate beside haber.
    expect(lemma('ha')).toBe('haber');
    // In the hints' order: fue is ser before ir. An old spelling with no entry is not named, but stays a lookup away.
    expect(lemmaOf('fue', FORMS, { hints: SPANISH })).toEqual({
      lemma: 'ser', inflections: ['third-person singular indicative preterite', 'or ir'],
      lookup: ['ser', 'ir', 'fué', 'fue'],
    });
    expect(lemma('haciendo')).toBe('hacer');
  });

  it('keeps the noun after an article, and only after one that is nothing else', () => {
    expect(lemma('vino', { expecting: 'article' })).toBe('vino');
    expect(lemma('era', { expecting: 'article' })).toBe('era');
    // After la, lo or mi the verb still wins: lo era, la he visto.
    expect(lemma('era', { expecting: 'noun' })).toBe('ser');
    expect(lemma('vino')).toBe('venir');
  });

  it('does not take a participle for the verb, except after haber', () => {
    expect(lemma('estados')).toBe('estado');
    expect(lemma('hecho')).toBe('hecho');
    expect(lemma('hecho', { expecting: 'participle' })).toBe('hacer');
    // After haber the participle, before the verb it is a plain form of: he visto.
    expect(lemma('visto', { expecting: 'participle' })).toBe('ver');
  });

  it('keeps a word of a fixed stock as itself', () => {
    expect(lemmaOf('como', FORMS, { hints: SPANISH })).toEqual({ lemma: 'como', inflections: [], lookup: ['como', 'comer'] });
    expect(lemma('entre')).toBe('entre');
    // A wish or a command gives way to it; a statement does not.
    expect(lemma('fuera')).toBe('fuera');
  });

  it('goes by the word before: a verb after a pronoun, a noun after a possessive', () => {
    expect(lemma('casa')).toBe('casa');
    expect(lemma('casa', { expecting: 'noun' })).toBe('casa');
    expect(lemmaOf('casa', FORMS, { hints: SPANISH, expecting: 'verb' })).toMatchObject({
      lemma: 'casar', inflections: ['third-person singular present indicative', 'informal second-person singular imperative', 'or casa'],
    });
    expect(lemma('estados', { expecting: 'noun' })).toBe('estado');
  });

  it('reads a noun seldom meant as the common verb it is a form of', () => {
    expect(lemma('mira')).toBe('mirar');
    expect(lemma('mira', { expecting: 'article' })).toBe('mira');
    // Without the hints, a word in its own right stays itself.
    expect(lemmaOf('mira', FORMS).lemma).toBe('mira');
  });

  it('chooses between two words a form belongs to: the plainest, the most direct, the commoner', () => {
    expect(lemma('vive')).toBe('vivir');     // a statement before a wish
    expect(lemma('cosas')).toBe('cosa');
    expect(lemma('niñas')).toBe('niña');     // "plural" before "plural feminine"
    expect(lemma('creo')).toBe('creer');     // the hints
    expect(lemmaOf('creo', FORMS).lemma).toBe('crear');   // without them, the dictionary's order
    expect(lemma('estos')).toBe('este');     // an inflection before a respelling
  });

  it('follows a respelling when that is all a form is', () => {
    expect(lemmaOf('stá', FORMS)).toMatchObject({ lemma: 'está', inflections: ['alt-of'] });
    // A respelling does not make a word a form of another.
    expect(lemma('hablar')).toBe('hablar');
  });

  it('never takes a saying the form stands in for a word it is a form of', () => {
    expect(lemmaOf('vino', FORMS, { hints: SPANISH }).lookup).toEqual(['venir', 'vino']);
  });

  it('reads a capital as written inside a sentence, and in lower case at its start', () => {
    expect(lemma('Casa')).toBe('Casa');
    expect(lemma('Casa', { first: true })).toBe('casa');
    expect(lemma('Dónde', { first: true })).toBe('dónde');
    expect(lemma('Dónde')).toBe('dónde');
    expect(lemma('España', { first: true })).toBe('España');
  });

  it('reads a line all in capitals in lower case', () => {
    expect(lemma('CASA')).toBe('casa');
    expect(lemma('PUEDE')).toBe('poder');
  });

  it('keeps a word the dictionary does not know as it is written', () => {
    expect(lemmaOf('Xochitl', FORMS)).toEqual({ lemma: 'Xochitl', inflections: [], lookup: ['Xochitl'] });
  });
});

describe('lemmaTokens', () => {
  const words = (text: string) => lemmaTokens(new IntlSegmenter('es').segment(text), FORMS, 'es', SPANISH);
  const lemmas = (text: string) => words(text).filter((t) => !t.punct).map((t) => t.lemma);

  it('gives each word its dictionary form and keeps the line as written', () => {
    const text = '¿Dónde hablábamos? No puede ser.';
    const tokens = words(text);
    expect(tokens.map((t) => t.surface).join('')).toBe(text);
    expect(lemmas(text)).toEqual(['dónde', 'hablar', 'no', 'poder', 'ser']);
  });

  it('carries the trace the card draws: the word as said, and what its ending says', () => {
    const [said] = words('hablábamos');
    expect(said).toMatchObject({
      surface: 'hablábamos', lemma: 'hablar', parts: ['hablábamos'],
      inflections: ['first-person plural imperfect indicative'],
      lookup: [{ key: 'hablar' }, { key: 'hablábamos' }],
    });
    // A word already in its dictionary form has no trace.
    expect(words('ser')[0]?.parts).toBeUndefined();
  });

  it('reads a word by the one before it', () => {
    expect(lemmas('el vino')).toEqual(['el', 'vino']);
    expect(lemmas('se casa')).toEqual(['se', 'casar']);
    expect(lemmas('mi casa')).toEqual(['mi', 'casa']);
    // la and lo are pronouns as well as articles: la he visto.
    expect(lemmas('lo he visto')).toEqual(['lo', 'haber', 'ver']);
    expect(lemmas('ha hecho')).toEqual(['haber', 'hacer']);
    // Punctuation between two words breaks what the first led to.
    expect(lemmas('el, vino')).toEqual(['el', 'venir']);
  });

  it('treats the word after a full stop as the start of a sentence', () => {
    expect(lemmas('Fue así. Casa blanca')).toEqual(['ser', 'así', 'casa', 'blanca']);
    expect(lemmas('La Casa blanca')).toEqual(['la', 'Casa', 'blanca']);
  });

  it('says each of two readings run together on its own, and each once', () => {
    // "first/third-person … indicative/indicative" is the first person and the third.
    expect(lemmaOf('era', FORMS, { hints: SPANISH }).inflections).toEqual([
      'first-person singular imperfect indicative', 'third-person singular imperfect indicative', 'or era',
    ]);
    // "present/preterite" beside "present" and "preterite" adds nothing.
    expect(lemmaOf('hablamos', FORMS).inflections).toHaveLength(2);
  });

  it('does not count an article as a word to learn, though it is looked up like any other', () => {
    const tokens = words('la casa de el vino');
    expect(tokens.filter((t) => !t.punct).map((t) => [t.surface, t.content])).toEqual([
      ['la', false], ['casa', true], ['de', true], ['el', false], ['vino', true],
    ]);
    expect(tokens[0]).toMatchObject({ lemma: 'la', lookup: [{ key: 'la' }] });
  });

  it('does not count a number as a word to learn', () => {
    const tokens = words('Tiene 25 casa');
    expect(tokens.find((t) => t.surface === '25')).toMatchObject({ content: false });
    expect(tokens.find((t) => t.surface === 'casa')?.content).toBe(true);
  });
});
