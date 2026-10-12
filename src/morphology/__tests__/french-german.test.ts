import { describe, expect, it } from 'vitest';
import { APART, FRENCH, splitElisions, straighten } from '../french';
import {
  adjectiveStem, compoundKeys, deeperKeys, derivedOf, formKeys, joinedKeys, participleOf, prefixVerb, splitCompound, stemKeys,
} from '../compound';
import { hyphenKeys, joinHyphenated } from '../hyphen';
import { joinSeparable, separableKeys } from '../separable';
import { GERMAN, GERMAN_COMPOUNDS, splitClitics } from '../german';
import { IntlSegmenter } from '../intl';
import { lemmaTokens, type FormInfo, type Forms } from '../lemma';

/**
 * French and German to their dictionary forms, over rows as Wiktionary's own
 * (wiktionary-to-yomitan, 2026-10-04) has them, cut down. What the real files
 * make of 20,000 sentences from Tatoeba was read when the hints were written.
 */

const v = (lemma: string, tags: string, senses = 6) => ({ lemma, tags: [tags], pos: 'v', senses });
const word = (kind: string[], of: FormInfo['of'] = [], senses = 2): FormInfo => ({ word: true, kind, senses, of });
const form = (...of: FormInfo['of']): FormInfo => ({ word: false, senses: 0, kind: [], of });

const FR: Forms = {
  est: word(['n'], [v('être', 'third-person singular present indicative', 12)], 2),
  fait: word(['n'], [v('faire', 'third-person singular present indicative', 20), v('faire', 'past participle', 20)], 3),
  mangé: form(v('manger', 'past participle')),
  a: word(['n', 'prep'], [v('avoir', 'third-person singular present indicative', 14)], 4),
  "l'": word(['artic', 'pron'], [], 2),
  "n'": word(['contr'], [], 1),
  "j'": form({ lemma: 'je', tags: ['clitic form'], pos: 'pron', senses: 2 }),
  ai: form(v('avoir', 'first-person singular present indicative', 14)),
  eau: word(['n'], [], 3),
  homme: word(['n'], [], 4),
  aujourd: word(['n'], [], 1),
  "aujourd'hui": word(['adv'], [], 2),
  il: word(['pron'], [], 2),
};

const tokens = (text: string, locale: string, prepare = (t: ReturnType<IntlSegmenter['segment']>) => t) =>
  prepare(new IntlSegmenter(locale).segment(text));

describe('French elisions', () => {
  it('reads l\'eau and n\'est as two words each, where the line puts them', () => {
    const out = splitElisions(tokens("l'eau n'est pas", 'fr')).filter((t) => !t.punct);
    expect(out.map((t) => t.surface)).toEqual(["l'", 'eau', "n'", 'est', 'pas']);
    expect(out.map((t) => [t.start, t.end])).toEqual([[0, 2], [2, 5], [6, 8], [8, 11], [12, 15]]);
  });

  it("leaves c'est-à-dire to be joined whole", () => {
    expect(splitElisions(tokens("c'est-à-dire", 'fr')).filter((t) => !t.punct).map((t) => t.surface)).toEqual(["c'est", 'à', 'dire']);
    expect(splitElisions(tokens("c'est bon", 'fr')).filter((t) => !t.punct).map((t) => t.surface)).toEqual(["c'", 'est', 'bon']);
  });

  it('splits the curly apostrophe too, and leaves a word that has an apostrophe in it whole', () => {
    expect(splitElisions(tokens('qu’il', 'fr')).map((t) => t.surface)).toEqual(['qu’', 'il']);
    for (const whole of ["aujourd'hui", "quelqu'un", "presqu'île"]) {
      expect(splitElisions(tokens(whole, 'fr')).map((t) => t.surface)).toEqual([whole]);
    }
  });

  it('finds the dictionary form of the word and the little word before it', () => {
    const out = lemmaTokens(splitElisions(tokens("j'ai l'homme", 'fr')), FR, 'fr', FRENCH, straighten).filter((t) => !t.punct);
    expect(out.map((t) => t.lemma)).toEqual(['je', 'avoir', "l'", 'homme']);
  });

  it('looks up a curly apostrophe as the dictionary writes it', () => {
    const out = lemmaTokens(splitElisions(tokens('J’ai', 'fr')), FR, 'fr', FRENCH, straighten).filter((t) => !t.punct);
    expect(out.map((t) => t.lemma)).toEqual(['je', 'avoir']);
  });
});

describe('a form that is two persons, and a spelling that is not another word', () => {
  const CONNAITRE: Forms = {
    je: word(['pron'], [], 2),
    tu: word(['pron'], [], 2),
    il: word(['pron'], [], 2),
    connaître: word(['v'], [], 5),
    connaissais: form(
      { ...v('connaître', 'first/second-person singular imperfect indicative/indicative', 5) },
      // The post-1990 spelling is filed as a word of its own, and under it as another way of writing connaître.
      { ...v('connaitre', 'first/second-person singular imperfect indicative', 1), spellingOf: ['connaître'] },
    ),
  };
  const say = (text: string, locale = 'fr') =>
    lemmaTokens(splitElisions(tokens(text, locale)), CONNAITRE, locale, FRENCH, straighten).filter((t) => !t.punct);

  it('reads je connaissais as first person only, and tu connaissais as second', () => {
    expect(say('je connaissais')[1]?.inflections).toEqual(['first-person singular imperfect indicative']);
    expect(say('tu connaissais')[1]?.inflections).toEqual(['second-person singular imperfect indicative']);
  });

  it('keeps the pronoun through the little words between: je ne connaissais, tu me connaissais', () => {
    expect(say('je ne connaissais')[2]?.inflections).toEqual(['first-person singular imperfect indicative']);
    expect(say('tu ne me connaissais')[3]?.inflections).toEqual(['second-person singular imperfect indicative']);
  });

  it('does not take the second pronoun for who does it: je vous connaissais is still I', () => {
    // vous is who was known, not the one who knew.
    expect(say('je vous connaissais')[2]?.inflections).toEqual(['first-person singular imperfect indicative']);
  });

  it('shows both persons where there is no pronoun to say which', () => {
    expect(say('connaissais')[0]?.inflections).toEqual([
      'first-person singular imperfect indicative', 'second-person singular imperfect indicative',
    ]);
  });

  it('does not name the 1990 spelling as another word it may be a form of, though it stays a lookup away', () => {
    const out = say('je connaissais')[1];
    expect(out?.inflections?.some((l) => l.startsWith('or '))).toBe(false);
    expect(out?.lookup?.map((l) => l.key)).toContain('connaitre');
  });
});

describe('French dictionary forms', () => {
  const lemmas = (text: string): string[] =>
    lemmaTokens(tokens(text, 'fr'), FR, 'fr', FRENCH).filter((t) => !t.punct).map((t) => t.lemma ?? t.surface);

  it('takes est and a for the verbs, not "east" or the letter', () => {
    expect(lemmas('il est là')).toEqual(['il', 'être', 'là']);
    expect(lemmas('il a mangé')).toEqual(['il', 'avoir', 'manger']);
  });

  it('takes fait for faire, not "a fact"', () => {
    expect(lemmas('il a fait')).toEqual(['il', 'avoir', 'faire']);
    expect(lemmas('fait')).toEqual(['faire']);
  });
});

const DE: Forms = {
  war: word(['n'], [v('sein', 'first/third-person singular preterite', 30)], 2),
  ist: form(v('sein', 'third-person singular present indicative', 30)),
  meine: form({ lemma: 'meiner', tags: ['nominative feminine'], pos: 'pron', senses: 3 }, { lemma: 'mein', tags: ['nominative feminine'], pos: 'det', senses: 2 }),
  tun: word(['v'], [v('tunen', 'first-person plural present indicative', 1)], 5),
  wir: word(['pron'], [], 2),
  Haus: word(['n'], [], 7),
  Häuser: form({ lemma: 'Haus', tags: ['nominative plural'], pos: 'n', senses: 7 }),
};

describe('articles and pronouns, which are not words to learn unless the setting says so', () => {
  // As the German file has them: der is an article in one row and a pronoun in others, den a pronoun only.
  const forms: Forms = {
    der: word(['artic', 'pron'], [], 9),
    den: word(['pron'], [], 2),
    ich: word(['pron'], [], 2),
    // A pronoun's kind says more than "pronoun": she and they are 'pron fem pl'.
    sie: word(['pron', 'fem', 'pl'], [], 4),
    // "Nothing" is a pronoun too, and a word to learn: the file calls it indefinite.
    nichts: word(['pron', 'neut', 'indef'], [], 2),
    Jacke: word(['n'], [], 2),
    Jacken: form({ lemma: 'Jacke', tags: ['nominative plural'], pos: 'n', senses: 2 }),
    // Other things too, so words in their own right: "all" is a determiner, an adverb and a noun as well as a pronoun.
    tout: word(['adv', 'det', 'n', 'pron'], [], 9),
    // An article that is spelt like a noun is still the article.
    la: word(['artic', 'pron', 'n'], [], 5),
  };
  const counted = (text: string, grammarCounts = false): Array<[string, boolean | undefined]> =>
    lemmaTokens(tokens(text, 'de'), forms, 'de', GERMAN, undefined, grammarCounts)
      .filter((t) => !t.punct).map((t) => [t.surface, t.content]);

  it('leaves der and den alike, and ich, out of the words to learn', () => {
    expect(counted('Der ist nicht bei den Jacken.')).toEqual([
      ['Der', false], ['ist', true], ['nicht', true], ['bei', true], ['den', false], ['Jacken', true],
    ]);
    expect(counted('ich')).toEqual([['ich', false]]);
    expect(counted('sie')).toEqual([['sie', false]]);
    expect(counted('la')).toEqual([['la', false]]);
  });

  it('goes by the language\'s own list, whatever else the dictionary calls a word: tu and ce are skipped, quelqu\'un is not', () => {
    const fr: Forms = {
      tu: word(['pron', 'ptcl'], [], 3), ce: word(['det', 'pron'], [], 4), je: word(['pron', 'sg'], [], 2),
      "quelqu'un": word(['pron'], [], 2), rien: word(['pron', 'n'], [], 3), maison: word(['n'], [], 3),
    };
    const content = (text: string): Array<boolean | undefined> =>
      lemmaTokens(tokens(text, 'fr'), fr, 'fr', FRENCH, straighten).filter((t) => !t.punct).map((t) => t.content);
    expect(content('je tu ce')).toEqual([false, false, false]);
    expect(content("quelqu'un rien maison")).toEqual([true, true, true]);
  });

  it('keeps a word that is a pronoun and other things besides, and "nothing" and "someone"', () => {
    expect(counted('tout')).toEqual([['tout', true]]);
    expect(counted('nichts')).toEqual([['nichts', true]]);
  });

  it('counts them all when the setting is on', () => {
    expect(counted('Der ist bei den Jacken', true).every(([, content]) => content)).toBe(true);
  });
});

describe('hyphenated words', () => {
  const forms: Forms = { 'peut-être': word(['adv'], [], 2), 'arc-en-ciel': word(['n'], [], 2), 'a-t-il': word(['v'], [], 1), 'ciel': word(['n'], [], 3) };
  const joined = (text: string): string[] =>
    joinHyphenated(tokens(text, 'fr'), forms, straighten, 'fr').filter((t) => !t.punct).map((t) => t.surface);

  it('puts peut-être back together, with the positions of the whole', () => {
    const out = joinHyphenated(tokens('Il vient peut-être.', 'fr'), forms, straighten, 'fr').filter((t) => !t.punct);
    expect(out.map((t) => [t.surface, t.start, t.end])).toEqual([['Il', 0, 2], ['vient', 3, 8], ['peut-être', 9, 18]]);
  });

  it('joins a run of three: arc-en-ciel', () => {
    expect(joined('un arc-en-ciel')).toEqual(['un', 'arc-en-ciel']);
  });

  it('leaves a verb and its pronoun as two words, and a word the dictionary lacks', () => {
    expect(joined('veux-tu dis-moi')).toEqual(['veux', 'tu', 'dis', 'moi']);
    // a-t-il is a, t and il, whatever the dictionary says of the whole.
    expect(joined('a-t-il')).toEqual(['a', 't', 'il']);
  });

  it('makes a word of a hyphenated run the dictionary lacks, where its parts are words it has: Alpha-Version', () => {
    const de: Forms = { Alpha: word(['n'], [], 2), Version: word(['n'], [], 3) };
    const out = joinHyphenated(tokens('Die Alpha-Version', 'de'), de, (s) => s, 'de', /^$/).filter((t) => !t.punct);
    expect(out.map((t) => t.surface)).toEqual(['Die', 'Alpha-Version']);
    expect(out[1]).toMatchObject({ parts: ['Alpha', 'Version'], compound: ['Alpha', 'Version'] });
    // The dictionary asked only once the line is read: with no rule for it, the pieces stay pieces.
    expect(joinHyphenated(tokens('Die Alpha-Version', 'de'), de, (s) => s, 'de').filter((t) => !t.punct).length).toBe(3);
    // Nor where the last part is no word.
    expect(joinHyphenated(tokens('Alpha-Xyzzy', 'de'), de, (s) => s, 'de', /^$/).filter((t) => !t.punct).length).toBe(2);
  });

  it('leaves a French verb and its pronoun apart, and asks about their parts', () => {
    const fr: Forms = { dis: word(['v'], [], 2), moi: word(['pron'], [], 2), anti: word(['pref'], [], 1), inflammatoire: word(['adj'], [], 1) };
    expect(joinHyphenated(tokens('dis-moi', 'fr'), fr, straighten, 'fr', APART).filter((t) => !t.punct).map((t) => t.surface)).toEqual(['dis', 'moi']);
    expect(joinHyphenated(tokens('anti-inflammatoire', 'fr'), fr, straighten, 'fr', APART).filter((t) => !t.punct).map((t) => t.surface)).toEqual(['anti-inflammatoire']);
    expect(hyphenKeys(tokens('dis-moi', 'fr'), straighten, 'fr')).toEqual(expect.arrayContaining(['dis', 'Moi', 'moi']));
  });

  it('asks about each way a run may be joined, and nothing for words with no hyphen', () => {
    expect(hyphenKeys(tokens('un arc-en-ciel', 'fr'), straighten, 'fr')).toEqual(expect.arrayContaining(['arc-en-ciel', 'arc-en', 'en-ciel']));
    expect(hyphenKeys(tokens('un arc', 'fr'), straighten, 'fr')).toEqual([]);
  });
});

describe('French puis, then', () => {
  it('is "then" and not a form of pouvoir', () => {
    const forms: Forms = {
      puis: word(['adv'], [v('pouvoir', 'first-person singular present indicative', 15)], 2),
      pouvoir: word(['v'], [], 15),
    };
    expect(lemmaTokens(tokens('puis', 'fr'), forms, 'fr', FRENCH)[0]?.lemma).toBe('puis');
  });
});

describe('German verb and \'s', () => {
  it('splits geht\'s into geht and \'s, curly or straight', () => {
    for (const text of ["geht's", 'geht’s']) {
      expect(splitClitics(tokens(text, 'de')).map((t) => t.surface)).toEqual(['geht', text.slice(4)]);
    }
    expect(splitClitics(tokens('Tom\'s', 'de')).map((t) => t.surface)).toEqual(['Tom', "'s"]);
    expect(splitClitics(tokens('Haus', 'de')).map((t) => t.surface)).toEqual(['Haus']);
  });
});

describe('German adjective endings', () => {
  it('says "accusative singular masculine" once, not once each for strong, weak and mixed', () => {
    const forms: Forms = {
      betriebenen: form(
        { lemma: 'betrieben', tags: ['accusative singular masculine strong'], pos: 'adj', senses: 1 },
        { lemma: 'betrieben', tags: ['accusative singular masculine weak'], pos: 'adj', senses: 1 },
        { lemma: 'betrieben', tags: ['accusative singular masculine mixed'], pos: 'adj', senses: 1 },
        // As the real file runs them together.
        { lemma: 'betrieben', tags: ['accusative singular masculine strong/weak/mixed'], pos: 'adj', senses: 1 },
      ),
      betrieben: word(['adj'], [], 1),
    };
    const t = lemmaTokens(tokens('betriebenen', 'de'), forms, 'de', GERMAN)[0];
    expect(t?.inflections).toEqual(['accusative-case singular masculine']);
  });
});

describe('German compounds', () => {
  const rules = GERMAN_COMPOUNDS;
  const forms: Forms = {
    // Riesen is a form of Riese and of Ries, and riesen a form of the verb reisen.
    Riesen: form({ lemma: 'Ries', tags: ['dative plural'], pos: 'n', senses: 1 }, { lemma: 'Riese', tags: ['genitive singular'], pos: 'n', senses: 3 }),
    riesen: form({ lemma: 'reisen', tags: ['third-person plural present'], pos: 'v', senses: 2 }),
    Gruppen: form({ lemma: 'Gruppe', tags: ['nominative plural'], pos: 'n', senses: 4 }),
    Sitzungen: form({ lemma: 'Sitzung', tags: ['nominative plural'], pos: 'n', senses: 2 }),
    Riese: word(['n'], [], 3),
    Schlange: word(['n'], [], 4),
    Arbeit: word(['n'], [], 3),
    Zimmer: word(['n'], [], 3),
    Haus: word(['n'], [], 5),
    Schlüssel: word(['n'], [], 3),
    der: word(['artic'], [], 3),
    und: word(['conj'], [], 2),
  };

  it('cuts a word the dictionary lacks into the two it has', () => {
    expect(splitCompound('Riesenschlange', forms, rules)).toEqual({ parts: ['Riesen', 'schlange'], lemmas: ['Riese', 'Schlange'] });
    expect(splitCompound('Hausschlüssel', forms, rules)).toEqual({ parts: ['Haus', 'schlüssel'], lemmas: ['Haus', 'Schlüssel'] });
  });

  it('takes a plural last part for the word it is a form of: Gruppensitzungen is Gruppe and Sitzung', () => {
    expect(splitCompound('Gruppensitzungen', forms, rules)).toEqual({ parts: ['Gruppen', 'sitzungen'], lemmas: ['Gruppe', 'Sitzung'] });
  });

  it('keeps the case the word is written in: Riesen is Riese, not the verb riesen', () => {
    expect(splitCompound('Riesenschlange', forms, rules)?.lemmas).toEqual(['Riese', 'Schlange']);
  });

  it('allows for the letter German puts between the parts: Arbeits-zimmer', () => {
    expect(splitCompound('Arbeitszimmer', forms, rules)).toEqual({ parts: ['Arbeits', 'zimmer'], lemmas: ['Arbeit', 'Zimmer'] });
  });

  it('cuts three where the first part is itself two: Donaudampfschiff', () => {
    const big: Forms = {
      ...forms,
      Donau: word(['name'], [], 2), Dampf: word(['n'], [], 3), Schiff: word(['n'], [], 4),
    };
    // Cut once: Donaudampf is not a word, so the first pass finds none.
    expect(splitCompound('Donaudampfschiff', big, rules, 1)).toBeNull();
    expect(deeperKeys('Donaudampfschiff', big, rules)).toEqual(expect.arrayContaining(['Donau', 'Dampf']));
    expect(splitCompound('Donaudampfschiff', big, rules)).toEqual({
      parts: ['Donau', 'dampf', 'schiff'], lemmas: ['Donau', 'Dampf', 'Schiff'],
    });
  });

  it('reads an adjective with an ending the dictionary lacks as the adjective: knorpeligen is knorpelig', () => {
    const adj: Forms = { knorpelig: word(['adj'], [], 2), Haus: word(['n'], [], 5) };
    expect(stemKeys('knorpeligen', rules)).toEqual(['knorpelig']);
    expect(adjectiveStem('knorpeligen', adj, rules)).toEqual({ lemma: 'knorpelig' });
    // A noun is not an adjective with an ending: Hause is not Hau.
    expect(adjectiveStem('Hausen', adj, rules)).toBeNull();
  });

  it('does not cut a participle as treib + endes, but cuts Wochen + ende', () => {
    const f: Forms = {
      ...forms,
      treib: form({ lemma: 'treiben', tags: ['imperative'], pos: 'v', senses: 9 }),
      endes: form({ lemma: 'Ende', tags: ['genitive'], pos: 'n', senses: 4 }),
      Woche: word(['n'], [], 3), Wochen: form({ lemma: 'Woche', tags: ['plural'], pos: 'n', senses: 3 }),
      Ende: word(['n'], [], 4), ende: form({ lemma: 'Ende', tags: ['nominative'], pos: 'n', senses: 4 }),
    };
    expect(splitCompound('treibendes', f, rules)).toBeNull();
    expect(splitCompound('Wochenende', f, rules)?.lemmas).toEqual(['Woche', 'Ende']);
  });

  it('cuts a verb with a little prefix: abspeichern is ab and speichern', () => {
    const f: Forms = { ...forms, speichern: word(['v'], [], 3), ab: word(['prep', 'adv'], [], 4) };
    expect(splitCompound('abspeichern', f, rules)).toEqual({ parts: ['ab', 'speichern'], lemmas: ['ab', 'speichern'] });
  });

  it('finds nothing in a word that is not two words, nor in a cut that leaves little words of grammar', () => {
    expect(splitCompound('Tatoeba', forms, rules)).toBeNull();
    expect(splitCompound('Derschlange', forms, rules)).toBeNull();
    expect(splitCompound('Hausund', forms, rules)).toBeNull();
  });

  it('asks the dictionary about every way to cut a word, with and without its linking letter', () => {
    const keys = compoundKeys('Arbeitszimmer', rules);
    expect(keys).toEqual(expect.arrayContaining(['Arbeit', 'Arbeits', 'Zimmer', 'zimmer']));
    expect(keys.length).toBeLessThan(400);
  });
});

describe('separated German verbs', () => {
  const rules = GERMAN_COMPOUNDS;
  const forms: Forms = {
    gehe: form(v('gehen', 'first-person singular present indicative', 9)),
    gehen: word(['v'], [], 9),
    weggehen: word(['v'], [], 2),
    Berlin: word(['name'], [], 1),
    komme: form(v('kommen', 'first-person singular present indicative', 9)),
    aus: word(['prep'], [], 5),
    jetzt: word(['adv'], [], 2),
    ich: word(['pron'], [], 2),
  };
  const line = (text: string) => lemmaTokens(tokens(text, 'de'), forms, 'de', GERMAN);

  it('asks about the verb and its prefix together, for a prefix that ends its clause', () => {
    expect(separableKeys(line('Ich gehe jetzt weg.'), rules)).toEqual(expect.arrayContaining(['weggehen']));
    expect(separableKeys(line('Ich komme aus Berlin.'), rules)).toEqual([]);
  });

  it('reads gehe and weg as weggehen, the prefix no longer a word to learn', () => {
    const out = joinSeparable(line('Ich gehe jetzt weg.'), forms, rules).filter((t) => !t.punct);
    expect(out.map((t) => [t.surface, t.lemma])).toEqual([['Ich', 'ich'], ['gehe', 'weggehen'], ['jetzt', 'jetzt'], ['weg', 'weggehen']]);
    expect(out[1]?.parts).toEqual(['gehe', 'weg']);
    expect(out[3]?.content).toBe(false);
  });

  it('leaves a clause alone when the dictionary has no such verb, or the prefix has a noun after it', () => {
    expect(joinSeparable(line('Ich gehe jetzt ab.'), forms, rules).filter((t) => !t.punct).map((t) => t.lemma)).toEqual(['ich', 'gehen', 'jetzt', 'ab']);
    expect(joinSeparable(line('Ich komme aus Berlin.'), forms, rules).filter((t) => !t.punct)[1]?.lemma).toBe('kommen');
  });
});

describe('German forms the dictionary does not list', () => {
  const rules = GERMAN_COMPOUNDS;
  const forms: Forms = {
    wackeln: word(['v'], [], 3),
    treiben: word(['v'], [], 9),
    speichern: word(['v'], [], 3),
    abspeichern: word(['v'], [], 1),
    pumpen: word(['v'], [], 2),
    geschrieben: form({ lemma: 'schreiben', tags: ['past participle'], pos: 'v', senses: 6 }),
    schreiben: word(['v'], [], 6),
    kriegten: form({ lemma: 'kriegen', tags: ['first/third-person plural preterite'], pos: 'v', senses: 4 }),
    aufkriegen: word(['v'], [], 1),
    Knorpel: word(['n'], [], 2),
    '-ig': word(['suf'], [], 2),
    wendig: word(['adj'], [], 2),
    '-keit': word(['suf'], [], 1),
    Haus: word(['n'], [], 5),
  };

  it('reads a present participle as its verb, whatever ending it has: wackelnden, treibendes', () => {
    expect(participleOf('wackelnden', forms, rules)).toEqual({ lemma: 'wackeln', label: 'present participle' });
    expect(participleOf('treibendes', forms, rules)).toEqual({ lemma: 'treiben', label: 'present participle' });
    expect(participleOf('Hausend', forms, rules)).toBeNull();
  });

  it('reads abzuspeichern as the "to" form of abspeichern', () => {
    expect(formKeys('abzuspeichern', rules)).toEqual(expect.arrayContaining(['speichern']));
    expect(joinedKeys('abzuspeichern', forms, rules)).toEqual(['abspeichern']);
    expect(prefixVerb('abzuspeichern', forms, rules)).toEqual({ lemma: 'abspeichern', label: 'infinitive' });
  });

  it('reads a participle with an adjective ending as its verb: geschriebenen, and not Setzer as a verb', () => {
    expect(adjectiveStem('geschriebenen', forms, rules)).toEqual({ lemma: 'schreiben', label: 'past participle' });
    const f: Forms = { ...forms, setz: form({ lemma: 'setzen', tags: ['second-person singular imperative'], pos: 'v', senses: 9 }) };
    expect(prefixVerb('Aussetzer', f, rules)).toBeNull();
  });

  it('gives the prefix and the verb apart where the dictionary lacks the two together', () => {
    expect(prefixVerb('wegzupumpen', forms, rules)).toEqual({
      lemma: 'wegpumpen', label: 'infinitive', parts: { parts: ['weg', 'zupumpen'], lemmas: ['weg', 'pumpen'] },
    });
  });

  it('reads a prefix verb in a form of its own: festgeschriebenen, aufkriegten', () => {
    expect(prefixVerb('festgeschriebenen', forms, rules)).toMatchObject({ lemma: 'festschreiben', label: 'past participle' });
    expect(prefixVerb('aufkriegten', forms, rules)).toEqual({ lemma: 'aufkriegen', label: 'first/third-person plural preterite' });
  });

  it('reads a word made with a suffix as the word and the suffix: knorpeligen, Wendigkeit', () => {
    expect(derivedOf('knorpeligen', forms, rules)).toEqual({ parts: ['knorpel', 'igen'], lemmas: ['Knorpel', '-ig'] });
    expect(derivedOf('Wendigkeit', forms, rules)).toEqual({ parts: ['Wendig', 'keit'], lemmas: ['wendig', '-keit'] });
    // No such suffix in the dictionary, no such base: nothing.
    expect(derivedOf('Hauslos', forms, rules)).toBeNull();
    expect(derivedOf('Xyzig', forms, rules)).toBeNull();
  });
});

describe('German dictionary forms', () => {
  const lemmas = (text: string): string[] =>
    lemmaTokens(tokens(text, 'de'), DE, 'de', GERMAN).filter((t) => !t.punct).map((t) => t.lemma ?? t.surface);

  it('takes war for sein', () => {
    expect(lemmas('es war')).toEqual(['es', 'sein']);
  });

  it('takes meine for mein, the shorter word, before meiner', () => {
    expect(lemmas('meine Häuser')).toEqual(['mein', 'Haus']);
  });

  it('keeps a verb that is itself the infinitive after a pronoun: wir tun is tun, not a form of tunen', () => {
    expect(lemmas('wir tun')).toEqual(['wir', 'tun']);
  });

  it('names the German cases as cases, not as the Spanish pronouns that share their names', () => {
    const forms: Forms = {
      dem: form({ lemma: 'der', tags: ['dative singular definite masculine/neuter'], pos: 'art', senses: 9 }),
      den: form({ lemma: 'der', tags: ['accusative singular masculine'], pos: 'art', senses: 9 }),
    };
    const say = (surface: string): string[] | undefined =>
      lemmaTokens(tokens(surface, 'de'), forms, 'de', GERMAN)[0]?.inflections;
    expect(say('dem')).toEqual(['dative-case singular masculine', 'dative-case singular neuter']);
    expect(say('den')).toEqual(['accusative-case singular masculine']);
  });

  it('finds a noun by the capital it is written with', () => {
    expect(lemmas('Häuser')).toEqual(['Haus']);
  });
});
