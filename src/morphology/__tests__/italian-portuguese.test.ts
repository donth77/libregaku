import { describe, expect, it } from 'vitest';
import { APART, straighten } from '../french';
import { joinHyphenated } from '../hyphen';
import { IntlSegmenter } from '../intl';
import { ITALIAN, splitItalian } from '../italian';
import { lemmaTokens, type FormInfo, type Forms } from '../lemma';
import { APART_PT, PORTUGUESE } from '../portuguese';

/**
 * Italian and Portuguese to their dictionary forms, over rows as Wiktionary's
 * own (wiktionary-to-yomitan, 2026-10-22) has them, cut down. What the real
 * files make of 20,000 sentences from Tatoeba each was read when the hints were
 * written.
 */

const v = (lemma: string, tags: string, senses = 6) => ({ lemma, tags: [tags], pos: 'v', senses });
const word = (kind: string[], of: FormInfo['of'] = [], senses = 2): FormInfo => ({ word: true, kind, senses, of });
const form = (...of: FormInfo['of']): FormInfo => ({ word: false, senses: 0, kind: [], of });

const tokens = (text: string, locale: string) => new IntlSegmenter(locale).segment(text);
const words = (out: ReturnType<typeof tokens>) => out.filter((t) => !t.punct);

describe('Italian elisions', () => {
  it("reads l'acqua, un'altra, dell'anno and c'è as two words each, where the line puts them", () => {
    const out = words(splitItalian(tokens("l'acqua un'altra dell'anno c'è", 'it')));
    expect(out.map((t) => t.surface)).toEqual(["l'", 'acqua', "un'", 'altra', "dell'", 'anno', "c'", 'è']);
    expect(out.slice(0, 2).map((t) => [t.start, t.end])).toEqual([[0, 2], [2, 7]]);
  });

  it("puts the apostrophe back on a word cut short: un po'", () => {
    expect(words(splitItalian(tokens("un po' di pane", 'it'))).map((t) => t.surface)).toEqual(['un', "po'", 'di', 'pane']);
  });

  it('splits the curly apostrophe too', () => {
    expect(words(splitItalian(tokens('l’uomo', 'it'))).map((t) => t.surface)).toEqual(['l’', 'uomo']);
  });
});

describe('Italian to its dictionary forms', () => {
  const IT: Forms = {
    // è and ha are rows of their own in the file, and forms of essere and avere through formIn (src/dict/wty.ts).
    è: word(['v', 'sg'], [v('essere', 'third-person singular present indicative', 30)], 1),
    ha: word(['intj', 'v', 'sg'], [v('avere', 'third-person singular present indicative', 20)], 2),
    mangiato: form(v('mangiare', 'past participle')),
    sei: word(['num', 'n'], [v('essere', 'second-person singular present indicative', 30)], 3),
    // A form of every article at once, before GAPS gives it an entry of its own.
    i: word(['artic'], [{ lemma: 'il', tags: ['plural masculine'], senses: 3 }, { lemma: 'la', tags: ['plural masculine'], senses: 9 }], 1),
    "l'": word(['artic', 'pron'], [], 2),
    acqua: word(['n'], [], 3),
    libri: form({ lemma: 'libro', tags: ['plural'], pos: 'n', senses: 2 }),
    tu: word(['pron'], [], 2),
  };
  const lemmas = (text: string) =>
    words(lemmaTokens(splitItalian(tokens(text, 'it')), IT, 'it', ITALIAN, straighten)).map((t) => t.lemma);

  it('reads the commonest verbs as the verbs, before a noun or an interjection of the same spelling', () => {
    expect(lemmas('è')).toEqual(['essere']);
    expect(lemmas('ha mangiato')).toEqual(['avere', 'mangiare']);
    expect(lemmas('tu sei')).toEqual(['tu', 'essere']);
  });

  it("reads i as the article it is, and l'acqua as the article and the noun", () => {
    expect(lemmas('i libri')).toEqual(['i', 'libro']);
    expect(lemmas("l'acqua")).toEqual(["l'", 'acqua']);
  });
});

describe('Portuguese to its dictionary forms', () => {
  const PT: Forms = {
    é: word(['intj', 'n'], [v('ser', 'third-person singular present indicative', 30), { lemma: 'É', tags: ['lowercase'], senses: 1 }], 2),
    foi: word(['intj'], [v('ir', 'third-person singular indicative preterite', 20), v('ser', 'third-person singular indicative preterite', 30)], 1),
    // A verb with its pronoun written on is a row of the file that only says so, and is kept as a form of the verb (onlyForm).
    'ajudá-lo': form({ lemma: 'ajudar', tags: [], pos: 'v', senses: 3 }),
    ajudá: form(),
    lo: word(['pron'], [], 1),
    ele: word(['pron'], [], 2),
    'diga-me': form(),
    diga: form(v('dizer', 'third-person singular present subjunctive', 10)),
    me: word(['pron'], [], 2),
  };
  const read = (text: string) => {
    const joined = joinHyphenated(tokens(text, 'pt'), PT, straighten, 'pt', APART_PT);
    return words(lemmaTokens(joined, PT, 'pt', PORTUGUESE, straighten));
  };

  it('reads é and foi as ser, before yeah and done', () => {
    expect(read('ele é').map((t) => t.lemma)).toEqual(['ele', 'ser']);
    expect(read('foi').map((t) => t.lemma)).toEqual(['ser']);
  });

  it('reads a verb with its pronoun written on as the verb, where the dictionary has the whole', () => {
    expect(read('ajudá-lo').map((t) => [t.surface, t.lemma])).toEqual([['ajudá-lo', 'ajudar']]);
  });

  it('keeps a pronoun that stands apart as a word of its own: diga-me', () => {
    expect(read('diga-me').map((t) => t.lemma)).toEqual(['dizer', 'me']);
  });
});

describe('a hyphenated whole the dictionary has only as a form', () => {
  const FR: Forms = {
    'grands-mères': form({ lemma: 'grand-mère', tags: ['plural'], pos: 'n', senses: 2 }),
    // Wiktionary lists the question too, as a form of sais-tu: it stays a verb and its pronoun, each a word to learn.
    'savez-vous': form({ lemma: 'sais-tu', tags: ['plural'], pos: 'phrase', senses: 1 }),
  };
  const joined = (text: string) => words(joinHyphenated(tokens(text, 'fr'), FR, straighten, 'fr', APART)).map((t) => t.surface);

  it('is joined, where no piece of it stands apart', () => {
    expect(joined('grands-mères')).toEqual(['grands-mères']);
  });

  it('is left in its pieces where one is a pronoun after a verb', () => {
    expect(joined('savez-vous')).toEqual(['savez', 'vous']);
  });
});
