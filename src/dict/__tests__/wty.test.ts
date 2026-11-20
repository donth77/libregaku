import { describe, expect, it } from 'vitest';
import type { Entry } from '../jmdict';
import { formIn, kindOf, mergeByWord, onlyForm, readRow, type Inflection } from '../wty';

/*
 * Rows as wiktionary-to-yomitan publishes them — wty-es-en, wty-ko-en and
 * wty-zh-en, 2026.10.04 — copied from the term banks, each with the bank and
 * the row it came from. They are cut where they were long: an etymology to a
 * few words, a meaning's example sentences to one or none, and the meanings
 * a test has no use for. Nothing is rearranged; the nesting is the file's.
 */

/**
 * A row cut down to its list of meanings. The grammar and etymology ahead of
 * the list and the links after it are gone; CASA and SER_VERB keep theirs.
 */
const meanings = (term: string, tags: string, rules: string, items: unknown[], reading = ''): unknown => [
  term, reading, tags, rules, 0,
  [{ type: 'structured-content', content: [{ tag: 'ol', data: { content: 'glosses' }, content: items }] }],
  0, '',
];

/** es term_bank_1#1036 */
const CASA: unknown = ['casa', '', 'n fem', 'n', 0, [{ type: 'structured-content', content: [
  { tag: 'div', content: [{ tag: 'div', data: { content: 'preamble' }, content: [
    { tag: 'details', data: { content: 'details-entry-Grammar' }, content: [
      { tag: 'summary', data: { content: 'summary-entry' }, content: 'Grammar' },
      { tag: 'div', data: { content: 'Grammar-content' }, content: 'casa f (plural casas)' },
    ] },
    { tag: 'details', data: { content: 'details-entry-Etymology' }, content: [
      { tag: 'summary', data: { content: 'summary-entry' }, content: 'Etymology' },
      { tag: 'div', data: { content: 'Etymology-content' }, content: 'Inherited from Old Spanish casa, from La …' },
    ] },
  ] }] },
  { tag: 'ol', data: { content: 'glosses' }, content: [{ tag: 'li', content: [{ tag: 'div', content: ['house'] }] }] },
  { tag: 'div', data: { content: 'backlink' }, content: [
    { tag: 'a', href: 'https://en.wiktionary.org/wiki/casa#Spanish', content: 'Wiktionary' },
    ' | ',
    { tag: 'a', href: 'https://kaikki.org/dictionary/Spanish/meaning/c/ca/casa.html', content: 'Kaikki' },
  ] },
] }], 0, ''];

/** es term_bank_1#1389 */
const SER_VERB: unknown = ['ser', '', 'v', 'v', 0, [{ type: 'structured-content', content: [
  { tag: 'div', content: [{ tag: 'div', data: { content: 'preamble' }, content: [
    { tag: 'details', data: { content: 'details-entry-Grammar' }, content: [
      { tag: 'summary', data: { content: 'summary-entry' }, content: 'Grammar' },
      { tag: 'div', data: { content: 'Grammar-content' }, content: 'ser (first-person singular present soy, first-person …' },
    ] },
    { tag: 'details', data: { content: 'details-entry-Etymology' }, content: [
      { tag: 'summary', data: { content: 'summary-entry' }, content: 'Etymology' },
      { tag: 'div', data: { content: 'Etymology-content' }, content: 'Along the way, the verb absorbed Old Spa …' },
    ] },
  ] }] },
  { tag: 'ol', data: { content: 'glosses' }, content: [
    { tag: 'li', content: [{ tag: 'div', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'copulative', data: { content: 'tag', category: 'transitivity' }, content: 'cop' },
      ] },
      'to be (essentially or identified as)',
      { tag: 'details', data: { content: 'details-entry-examples' }, content: [
        { tag: 'summary', data: { content: 'summary-entry' }, content: '3 examples' },
        { tag: 'div', data: { content: 'extra-info' }, content: {
          tag: 'div',
          data: { content: 'example-sentence' },
          content: [
            { tag: 'div', data: { content: 'example-sentence-a' }, content: [
              'Yo ',
              { tag: 'span', data: { content: 'bold-text' }, content: 'soy' },
              ' de los Estados Unidos.',
            ] },
            { tag: 'div', data: { content: 'example-sentence-b' }, content: [
              'I ',
              { tag: 'span', data: { content: 'bold-text' }, content: 'am' },
              ' from the United States.',
            ] },
          ],
        } },
      ] },
    ] }] },
    { tag: 'li', content: [{ tag: 'div', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'auxiliary', data: { content: 'tag', category: 'transitivity' }, content: 'aux' },
      ] },
      'to be (in the passive voice sense)',
    ] }] },
    { tag: 'li', content: [{ tag: 'div', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'impersonal', data: { content: 'tag', category: 'transitivity' }, content: 'impers' },
      ] },
      'to exist; to occur',
    ] }] },
  ] },
  { tag: 'div', data: { content: 'backlink' }, content: [
    { tag: 'a', href: 'https://en.wiktionary.org/wiki/ser#Spanish', content: 'Wiktionary' },
    ' | ',
    { tag: 'a', href: 'https://kaikki.org/dictionary/Spanish/meaning/s/se/ser.html', content: 'Kaikki' },
  ] },
] }], 0, ''];

/** es term_bank_1#1390 */
const SER_NOUN = meanings('ser', 'n masc', 'n', [
  { tag: 'li', content: [{ tag: 'div', content: ['a being, organism'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['nature, essence'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['value, worth'] }] },
]);

/** es term_bank_1#6140 */
const COMO_ADVERB = meanings('como', 'adv', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['as (to such an extent or degree)'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['like, about (approximately)'] }] },
]);

/** es term_bank_1#6141 */
const COMO_CONJUNCTION = meanings('como', 'conj', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['as (introducing a basis of comparison or equality)'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['as, since (being that)'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['how (in which way)'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['if, unless (under the condition that)'] }] },
]);

/** es term_bank_1#6142 */
const COMO_PREPOSITION = meanings('como', 'prep', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['as (in the manner or role specified)'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['such as (for example)'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['like (similar to, reminiscent of)'] }] },
]);

/** es term_bank_1#9802 */
const PINA = meanings('piña', 'n fem', 'n', [
  { tag: 'li', content: [
    { tag: 'div', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'Bolivia', data: { content: 'tag', category: 'variety' }, content: '🇧🇴' },
        { tag: 'span', title: 'Cuba', data: { content: 'tag', category: 'variety' }, content: '🇨🇺' },
        { tag: 'span', title: 'Honduras', data: { content: 'tag', category: 'variety' }, content: '🇭🇳' },
        { tag: 'span', title: 'Paraguay', data: { content: 'tag', category: 'variety' }, content: '🇵🇾' },
        { tag: 'span', title: 'Venezuela', data: { content: 'tag', category: 'variety' }, content: '🇻🇪' },
      ] },
      'a punch',
    ] },
    { tag: 'ul', content: [{ tag: 'li', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'Argentina', data: { content: 'tag', category: 'variety' }, content: '🇦🇷' },
      ] },
      'fight',
    ] }] },
  ] },
  { tag: 'li', content: [{ tag: 'div', content: [
    { tag: 'div', data: { content: 'tags' }, content: [
      { tag: 'span', title: 'Argentina', data: { content: 'tag', category: 'variety' }, content: '🇦🇷' },
      { tag: 'span', title: 'colloquial', data: { content: 'tag', category: 'register' }, content: 'col' },
    ] },
    'collision, accident, crash',
  ] }] },
]);

/** es term_bank_1#9264 */
const OLVIDAR = meanings('olvidar', 'v', 'v', [
  { tag: 'li', content: [
    { tag: 'div', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'transitive verb', data: { content: 'tag', category: 'partOfSpeech' }, content: 'vt' },
      ] },
      'to forget',
    ] },
    { tag: 'ul', content: [{ tag: 'li', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'intransitive verb', data: { content: 'tag', category: 'partOfSpeech' }, content: 'vi' },
      ] },
      'to forget',
    ] }] },
  ] },
  { tag: 'li', content: [{ tag: 'div', content: ['to make forget'] }] },
]);

/** es term_bank_1#11415 */
const CANINO = meanings('canino', 'adj', 'adj', [
  { tag: 'li', content: [{ tag: 'div', content: ['canine'] }] },
  { tag: 'li', content: [{ tag: 'div', content: [
    { tag: 'div', data: { content: 'tags' }, content: [
      { tag: 'span', title: 'idiomatic', data: { content: 'tag', category: 'usage' }, content: 'idio' },
    ] },
    'ravenously hungry; hungry as a hog',
  ] }] },
  { tag: 'li', content: [{ tag: 'div', content: [
    { tag: 'div', data: { content: 'tags' }, content: [
      { tag: 'span', title: 'idiomatic', data: { content: 'tag', category: 'usage' }, content: 'idio' },
    ] },
    'ravenously hungry; hungry as a hog\nMarcos siempre estaba canino después de tomar su medicación.\n' +
      'Marcos was always hungry as a hog after taking his medication.',
  ] }] },
]);

/** es term_bank_1#11221 */
const GILIPOLLAS_ADJECTIVE = meanings('gilipollas', 'adj 🇪🇸 derog vulg', 'adj', [
  { tag: 'li', content: [{ tag: 'div', content: ['stupid'] }] },
]);

/** es term_bank_1#11222 */
const GILIPOLLAS_NOUN = meanings('gilipollas', 'n 🇪🇸 derog fem masc vulg', 'n', [
  { tag: 'li', content: [{ tag: 'div', content: ['dumbass'] }] },
]);

/** es term_bank_1#0 */
const GRATIS_ADJECTIVE = meanings('gratis', 'adj', 'adj', [
  { tag: 'li', content: [{ tag: 'div', content: ['free, without charge'] }] },
]);

/** es term_bank_1#1 */
const GRATIS_ADVERB = meanings('gratis', 'adv', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['free, without charge'] }] },
]);

/** es term_bank_1#52 */
const DE_LETTER = meanings('de', 'n fem', 'n', [
  { tag: 'li', content: [{ tag: 'div', content: ['The name of the Latin script letter D/d.'] }] },
]);

/** es term_bank_1#53 */
const DE_PREPOSITION = meanings('de', 'prep', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['of; \'s; used after the thing owned and before the owner'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['from (with the source or provenance of or at)'] }] },
]);

/** es term_bank_1#39 */
const Y_LETTER = meanings('y', 'char', '', [
  { tag: 'li', content: [{ tag: 'div', content: [
    'The twenty-sixth letter of the Spanish alphabet, called ye or i griega and written in the Latin script.',
  ] }] },
]);

/** es term_bank_1#40 */
const Y_CONJUNCTION = meanings('y', 'conj', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['and'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['plus, and'] }] },
]);

/** es term_bank_2#5105 */
const HACERLO = meanings('hacerlo', 'v', 'v', [
  { tag: 'li', content: [{ tag: 'div', content: ['infinitive of hacer combined with lo'] }] },
]);

/** es term_bank_1#16229 */
const DIGAME = meanings('dígame', 'v sg', 'v', [
  { tag: 'li', content: [{ tag: 'div', content: ['third-person singular imperative of decir combined with me; tell me'] }] },
]);

/** es term_bank_4#316 */
const JODERLA = meanings('joderla', 'v', 'v', [
  { tag: 'li', content: [{ tag: 'div', content: [
    { tag: 'div', data: { content: 'tags' }, content: [
      { tag: 'span', title: 'idiomatic', data: { content: 'tag', category: 'usage' }, content: 'idio' },
      { tag: 'span', title: 'vulgar', data: { content: 'tag', category: 'register' }, content: 'vulg' },
    ] },
    'to screw up; mess up (a plan)',
  ] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['infinitive of joder combined with la'] }] },
]);

/** es term_bank_1#792 */
const BIEN_ADVERB = meanings('bien', 'adv', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['well (adverbial form of bueno)'] }] },
]);

/** es term_bank_1#793 */
const BIEN_ADJECTIVE = meanings('bien', 'adj col fem masc', 'adj', [
  { tag: 'li', content: [{ tag: 'div', content: ['well-to-do; affluent; wealthy; upper-class'] }] },
]);

/** es term_bank_9#22958 */
const AJONJERA = meanings('ajonjera', 'n fem', 'n', [
  { tag: 'li', content: [
    { tag: 'div', content: ['any of several species of thistles or thistle-like plants in family Asteraceae:'] },
    { tag: 'ul', content: [
      { tag: 'li', content: ['in tribe Cardueae:'] },
      { tag: 'ul', content: [
        { tag: 'li', content: ['pine thistle (Chamaeleon gummifer, syn. Atractylis gummifera)'] },
        { tag: 'li', content: ['curly plumeless thistle (Carduus crispus)'] },
        { tag: 'li', content: ['stemless carline thistle (Carlina acaulis)'] },
      ] },
      { tag: 'li', content: ['in tribe Cichorieae:'] },
      { tag: 'ul', content: [
        { tag: 'li', content: ['rush skeletonweed (Chondrilla juncea)'] },
        { tag: 'li', content: ['misty andryala, Ragusa fleabane (Andryala ragusina)'] },
      ] },
    ] },
  ] },
]);

/** ko term_bank_1#1678 */
const HADA = meanings('하다', 'v', 'v', [
  { tag: 'li', content: [{ tag: 'div', content: [
    { tag: 'div', data: { content: 'tags' }, content: [
      { tag: 'span', title: 'transitive verb', data: { content: 'tag', category: 'partOfSpeech' }, content: 'vt' },
    ] },
    'to do; used to vaguely refer to almost any action, in particular',
  ] }] },
  { tag: 'li', content: [
    { tag: 'div', content: [
      { tag: 'div', data: { content: 'tags' }, content: [
        { tag: 'span', title: 'transitive verb', data: { content: 'tag', category: 'partOfSpeech' }, content: 'vt' },
      ] },
      'to do; used to vaguely refer to almost any action, in particular:',
    ] },
    { tag: 'ul', content: [
      { tag: 'li', content: ['to prepare, to make (food, clothes, etc.)'] },
      { tag: 'li', content: [
        { tag: 'div', data: { content: 'tags' }, content: [
          { tag: 'span', title: 'polite', data: { content: 'tag', category: 'register' }, content: 'polite' },
        ] },
        'to have, to eat',
      ] },
    ] },
  ] },
  { tag: 'li', content: [
    { tag: 'div', content: ['to say (that):'] },
    { tag: 'ul', content: [
      { tag: 'li', content: ['to say (that)'] },
      { tag: 'li', content: [
        { tag: 'div', data: { content: 'tags' }, content: [
          { tag: 'span', title: 'transitive verb', data: { content: 'tag', category: 'partOfSpeech' }, content: 'vt' },
        ] },
        'to call, to name',
      ] },
    ] },
  ] },
]);

/** ko term_bank_1#1648 */
const NUN = meanings('눈', '', '', [
  { tag: 'li', content: [
    { tag: 'div', content: ['More information(eumhun reading: 어릴 눈 (eoril nun))\n(MC reading: 嫩 (MC nwonH))'] },
    { tag: 'ul', content: [{ tag: 'li', content: ['嫩: soft, tender; young'] }] },
  ] },
]);

/** ko term_bank_1#1955 */
const SEON = meanings('선', '', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['先: first'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['先: first\n(MC reading: 先 (MC sen|senH))'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['線: line, wire, cable, route'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['線: line, wire, cable, route\n(MC reading: 線 (MC sjenH))'] }] },
]);

/** ko term_bank_1#17360 */
const TUNG = meanings('퉁', '', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['佟'] }] },
  { tag: 'li', content: [{ tag: 'div', content: ['佟:\n(MC reading: 佟 (MC downg))'] }] },
]);

/** ko term_bank_1#8122 */
const HON = meanings('혼', '', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['More information'] }] },
  { tag: 'li', content: [
    { tag: 'div', content: [
      'More information\n* 混: to mix\n(eumhun reading: 섞을 혼 (seokkeul hon))\n(MC reading: 混 (MC hwonX))\n' +
        '* 婚: to marry\n(eumhun reading: 혼인할 혼 (honinhal hon))\n(MC reading: 婚 (MC xwon)) …',
    ] },
    { tag: 'ul', content: [{ tag: 'li', content: ['* 混: to mix'] }, { tag: 'li', content: ['* 婚: to marry'] }] },
  ] },
]);

/** ko term_bank_1#2121 */
const NEUN = meanings('는', 'ptcl', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['See the entry at -는 (-neun).'] }] },
]);

/** ko term_bank_1#1777 */
const YO = meanings('요', 'ptcl', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['For the verb-final particle, see the entry at -요 (-yo).'] }] },
]);

/** ko term_bank_1#24098 */
const IDA = meanings('이다', 'ptcl', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['For the Korean copula ("to be"), see the entry at -이다 (-ida).'] }] },
]);

/** zh term_bank_1#129 */
const ANXIN = meanings('安心', 'adj vi', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['relieved; at ease'] }] },
], 'ānxīn');

/** zh term_bank_1#240 */
const PIE = meanings('丿', 'char', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['left-falling stroke, usually read as 撇'] }] },
], 'piě (pie³)');

/** zh term_bank_1#241 */
const YI = meanings('丿', 'char', '', [
  { tag: 'li', content: [{ tag: 'div', content: ['to arrive'] }] },
], 'yì (yi⁴)');

/* Rows that say what a form is a form of. These are short enough to be whole. */

/** es term_bank_13#12845 */
const HABLAMOS: unknown = ['hablamos', '', 'non-lemma', 'v', 0, [
  ['hablar', ['first-person plural indicative preterite']],
  ['hablar', ['first-person plural present indicative']],
  ['hablar', ['first-person plural present/preterite indicative']],
], 0, ''];
/** es term_bank_12#0 */
const PIES: unknown = ['pies', '', 'non-lemma', 'np', 0, [['pie', ['plural']]], 0, ''];
/** es term_bank_12#4244 */
const EL: unknown = ['el', '', 'non-lemma', '', 0, [['la', ['masculine']]], 0, ''];
/** es term_bank_34#15982 */
const ESTA: unknown = ['está', '', 'non-lemma', 'v', 0, [
  ['stá', ['alt-of']], ['stá', ['alternative']], ['stá', ['informal']],
], 0, ''];
/** es term_bank_37#16699 */
const FUE: unknown = ['fue', '', 'non-lemma', 'v', 0, [['fué', ['alt-of']], ['fué', ['archaic']]], 0, ''];
/** es term_bank_27#23559 */
const VIDEO: unknown = ['video', '', 'non-lemma', 'n', 0, [
  ['vídeo', ['alt-of']], ['vídeo', ['alternative Latin-America']], ['vídeo', ['masculine']],
], 0, ''];
/** es term_bank_12#3613 */
const LAS: unknown = ['las', '', 'non-lemma', '', 0, [['ustedes', ['accusative  ; you all']]], 0, ''];
/** es term_bank_31#16593 */
const DECIRSELO: unknown = ['decírselo', '', 'non-lemma', 'v', 0, [
  ['decir combined with indirect object le/les and direct object lo', ['infinitive']],
], 0, ''];
/** ko term_bank_3#24308 */
const GEOT: unknown = ['것', '', 'non-lemma', '', 0, [
  ['거', ['alt-of']], ['거', ['alternative']], ['거', ['dependent']],
], 0, ''];
/** ko term_bank_3#66 */
const YEOJA: unknown = ['女子', '', 'non-lemma', '', 0, [['여자', ['hanja form   woman; girl”)']]], 0, ''];
/** ko term_bank_17#12868 */
const NEGE: unknown = ['네게', '', 'non-lemma', '', 0, [['너', ['dative form  ; 네  + -게']]], 0, ''];
/** ko term_bank_3#268 */
const HWA: unknown = ['火', '', 'non-lemma', '', 0, [['화', ['hanja form   Mars”)']], ['화', ['hanja form   ”)']]], 0, ''];
/** ko term_bank_11#21847 */
const MONYANG: unknown = ['모냥', '', 'non-lemma', '', 0, [['모양(模樣)', ['dialectal form']]], 0, ''];
/** ko term_bank_4#2382 */
const DANGYEON: unknown = ['당연(當然)', '', 'non-lemma', '', 0, [
  ['당근', ['alt-of']], ['당근', ['alternative']], ['당근', ['humorous']], ['당근', ['slang']],
], 0, ''];

function entry(row: unknown, id = '0'): Entry {
  const got = readRow(row, id);
  if (!got || !('entry' in got)) throw new Error('not read as an entry');
  return got.entry;
}

function form(row: unknown): Inflection {
  const got = readRow(row, '0');
  if (!got || !('inflection' in got)) throw new Error('not read as a form');
  return got.inflection;
}

/** An entry's meanings, in order. */
const said = (e: Entry | undefined): string[] => (e?.senses ?? []).map((s) => s.glosses.join('; '));

describe('readRow, on a dictionary entry', () => {
  it('reads the meanings, and leaves the grammar, the etymology and the links out', () => {
    expect(readRow(CASA, '00001036')).toEqual({
      entry: {
        id: '00001036', word: 'casa', reading: undefined, common: false,
        senses: [{ pos: ['n', 'fem'], glosses: ['house'] }], kind: ['n', 'fem'],
      },
    });
  });

  it('gives each meaning its labels as codes, and leaves its example sentences out', () => {
    const ser = entry(SER_VERB);
    expect(ser.senses).toEqual([
      { pos: ['v'], glosses: ['to be (essentially or identified as)'], misc: ['cop'] },
      { pos: ['v'], glosses: ['to be (in the passive voice sense)'], misc: ['aux'] },
      { pos: ['v'], glosses: ['to exist; to occur'], misc: ['impers'] },
    ]);
    expect(JSON.stringify(ser)).not.toMatch(/Estados Unidos|United States|3 examples|Along the way|Wiktionary/);
  });

  it('reads a meaning nested under another as a meaning of its own, with its own labels only', () => {
    expect(entry(PINA).senses).toEqual([
      { pos: ['n', 'fem'], glosses: ['a punch'], misc: ['🇧🇴', '🇨🇺', '🇭🇳', '🇵🇾', '🇻🇪'] },
      { pos: ['n', 'fem'], glosses: ['fight'], misc: ['🇦🇷'] },
      { pos: ['n', 'fem'], glosses: ['collision, accident, crash'], misc: ['🇦🇷', 'col'] },
    ]);
  });

  it('follows a list nested straight inside a list, and takes the colon off what heads one', () => {
    expect(said(entry(AJONJERA))).toEqual([
      'any of several species of thistles or thistle-like plants in family Asteraceae',
      'in tribe Cardueae',
      'pine thistle (Chamaeleon gummifer, syn. Atractylis gummifera)',
      'curly plumeless thistle (Carduus crispus)',
      'stemless carline thistle (Carlina acaulis)',
      'in tribe Cichorieae',
      'rush skeletonweed (Chondrilla juncea)',
      'misty andryala, Ragusa fleabane (Andryala ragusina)',
    ]);
  });

  it('says a meaning once where the row has it twice, with the labels of both', () => {
    expect(entry(OLVIDAR).senses).toEqual([
      { pos: ['v'], glosses: ['to forget'], misc: ['vt', 'vi'] },
      { pos: ['v'], glosses: ['to make forget'] },
    ]);
    // 하다 says "to do; … in particular" and then, heading a list, "to do; … in particular:".
    expect(entry(HADA).senses).toEqual([
      { pos: ['v'], glosses: ['to do; used to vaguely refer to almost any action, in particular'], misc: ['vt'] },
      { pos: ['v'], glosses: ['to prepare, to make (food, clothes, etc.)'] },
      { pos: ['v'], glosses: ['to have, to eat'], misc: ['polite'] },
      { pos: ['v'], glosses: ['to say (that)'] },
      { pos: ['v'], glosses: ['to call, to name'], misc: ['vt'] },
    ]);
  });

  it('keeps only the first line of a meaning: here the rest is an example that strayed into it', () => {
    expect(entry(CANINO).senses).toEqual([
      { pos: ['adj'], glosses: ['canine'] },
      { pos: ['adj'], glosses: ['ravenously hungry; hungry as a hog'], misc: ['idio'] },
    ]);
  });

  it('puts the codes of a row in order: what kind of word it is, then how it is used', () => {
    const noun = entry(GILIPOLLAS_NOUN);
    expect(noun.kind).toEqual(['n', 'fem', 'masc', '🇪🇸', 'derog', 'vulg']);
    expect(noun.senses[0]?.pos).toEqual(noun.kind);
    expect(kindOf((noun.kind ?? []).join(' '))).toBe('noun, feminine, masculine, Spain, derogatory, vulgar');
  });

  it('is no entry where all it says is that the word is a verb with a pronoun on the end', () => {
    // hacerlo is found as a form of hacer, from the rows of forms.
    expect(readRow(HACERLO, '0')).toBeNull();
    // A row with something of its own to say stays, with all it says.
    expect(said(entry(DIGAME))).toEqual(['third-person singular imperative of decir combined with me; tell me']);
    expect(said(entry(JODERLA))).toEqual(['to screw up; mess up (a plan)', 'infinitive of joder combined with la']);
  });

  it('is no entry where all it does is point at another one', () => {
    // The particle is under -는, with a hyphen before it, where no word in a line is looked for.
    expect(readRow(NEUN, '0')).toBeNull();
    expect(readRow(YO, '0')).toBeNull();
    expect(readRow(IDA, '0')).toBeNull();
  });

  it('keeps a reading where the row has one', () => {
    expect(entry(ANXIN)).toMatchObject({ word: '安心', reading: 'ānxīn', kind: ['adj', 'vi'] });
  });

  it('reads bare text as a meaning, which the format allows and wty does not write', () => {
    expect(said(entry(['hola', '', 'intj', '', 0, ['hello'], 0, '']))).toEqual(['hello']);
  });
});

describe('readRow, on a Korean syllable and the characters read as it', () => {
  it('keeps a character that comes with a meaning, without the notes on how it was once read', () => {
    // No part of speech, and the first "meaning" is the caption of a folded table.
    expect(readRow(NUN, '7')).toEqual({
      entry: { id: '7', word: '눈', common: false, senses: [{ pos: [], glosses: ['嫩: soft, tender; young'] }] },
    });
    expect(said(entry(SEON))).toEqual(['先: first', '線: line, wire, cable, route']);
    expect(said(entry(HON))).toEqual(['混: to mix', '婚: to marry']);
  });

  it('has nothing to say of a syllable whose characters come with no meaning', () => {
    expect(readRow(TUNG, '0')).toBeNull();
  });
});

describe('readRow, on a form', () => {
  it('says what it is a form of, once for each way it is one', () => {
    expect(readRow(HABLAMOS, '0')).toEqual({
      inflection: {
        form: 'hablamos',
        of: [
          { lemma: 'hablar', tags: ['first-person plural indicative preterite'] },
          { lemma: 'hablar', tags: ['first-person plural present indicative'] },
          { lemma: 'hablar', tags: ['first-person plural present/preterite indicative'] },
        ],
        pos: 'v',
      },
    });
  });

  it('calls a plural noun a noun, and gives no part of speech where the row has none', () => {
    expect(form(PIES)).toEqual({ form: 'pies', of: [{ lemma: 'pie', tags: ['plural'] }], pos: 'n' });
    expect(form(EL)).toEqual({ form: 'el', of: [{ lemma: 'la', tags: ['masculine'] }] });
    expect('pos' in form(EL)).toBe(false);
  });

  it('turns round a row that files an odd spelling under the usual word', () => {
    expect(form(ESTA)).toEqual({ form: 'stá', of: [{ lemma: 'está', tags: ['alternative', 'informal'] }], pos: 'v' });
    expect(form(FUE)).toEqual({ form: 'fué', of: [{ lemma: 'fue', tags: ['alternative', 'archaic'] }], pos: 'v' });
    expect(form(GEOT)).toEqual({ form: '거', of: [{ lemma: '것', tags: ['alternative', 'dependent'] }] });
  });

  it('drops, from such a row, what it says the other way: video as the Latin American vídeo', () => {
    expect(form(VIDEO)).toEqual({ form: 'vídeo', of: [{ lemma: 'video', tags: ['alternative', 'masculine'] }], pos: 'n' });
  });

  it('ends a description at the gap where the word was cut out of it', () => {
    expect(form(YEOJA).of).toEqual([{ lemma: '여자', tags: ['hanja form'] }]);
    expect(form(NEGE).of).toEqual([{ lemma: '너', tags: ['dative form'] }]);
    expect(form(LAS).of).toEqual([{ lemma: 'ustedes', tags: ['accusative'] }]);
    // Two that differed only after the gap are then one.
    expect(form(HWA).of).toEqual([{ lemma: '화', tags: ['hanja form'] }]);
  });

  it('finds the verb in "decir combined with …", and leaves the rest to the description', () => {
    expect(form(DECIRSELO)).toEqual({
      form: 'decírselo',
      of: [{ lemma: 'decir', tags: ['infinitive combined with indirect object le/les and direct object lo'] }],
      pos: 'v',
    });
  });

  it('looks for a Korean word without the Chinese characters written after it', () => {
    expect(form(MONYANG)).toEqual({ form: '모냥', of: [{ lemma: '모양', tags: ['dialectal form'] }] });
    expect(form(DANGYEON)).toEqual({ form: '당근', of: [{ lemma: '당연', tags: ['alternative', 'humorous', 'slang'] }] });
  });

  it('takes a form with no description as a form all the same', () => {
    const casas = form(['casas', '', 'non-lemma', 'np', 0, [['casa']], 0, '']);
    expect(casas).toEqual({ form: 'casas', of: [{ lemma: 'casa', tags: [] }], pos: 'n' });
  });
});

describe('readRow, on what it cannot use', () => {
  const house = [{ tag: 'li', content: [{ tag: 'div', content: ['house'] }] }];

  it('answers null', () => {
    const useless: unknown[] = [
      null, undefined, 42, 'casa', {}, [], ['casa'],
      // No list of definitions, no headword, a headword that is not text.
      ['casa', '', 'n fem', 'n', 0, 'house', 0, ''],
      meanings('', 'n fem', 'n', house),
      meanings('   ', 'n fem', 'n', house),
      [42, '', 'n fem', 'n', 0, [], 0, ''],
      // An entry with no meanings: none listed, none with any text, no list marked as the meanings.
      ['casa', '', 'n fem', 'n', 0, [], 0, ''],
      meanings('casa', 'n fem', 'n', []),
      meanings('casa', 'n fem', 'n', [{ tag: 'li', content: [{ tag: 'div', content: ['  \n '] }] }]),
      ['casa', '', 'n fem', 'n', 0, [{ type: 'structured-content', content: [{ tag: 'ol', content: house }] }], 0, ''],
      ['casa', '', 'n fem', 'n', 0, [42, null, { type: 'image', path: 'casa.png' }], 0, ''],
      // A form of nothing, of things that are not words, and of itself.
      ['casas', '', 'non-lemma', 'np', 0, [], 0, ''],
      ['casas', '', 'non-lemma', 'np', 0, [[42, ['plural']], 'casa', null, [{}], ['', ['plural']]], 0, ''],
      ['casa', '', 'non-lemma', 'n', 0, [['casa', ['alternative']]], 0, ''],
    ];
    for (const row of useless) expect(readRow(row, '0')).toBeNull();
  });

  it('reads what it can of a row whose other fields are the wrong things', () => {
    const list = { tag: 'ol', data: { content: 'glosses' }, content: house };
    const odd = ['casa', 7, 42, {}, 'x', [{ type: 'structured-content', content: list }]];
    expect(readRow(odd, '9')).toEqual({
      entry: { id: '9', word: 'casa', common: false, senses: [{ pos: [], glosses: ['house'] }] },
    });
    expect(form(['casas', '', 'non-lemma', 7, 0, [['casa', 'plural'], ['caso', [42, 'plural', '']]]])).toEqual({
      form: 'casas', of: [{ lemma: 'casa', tags: ['plural'] }, { lemma: 'caso', tags: ['plural'] }],
    });
  });

  it('gives up on a row nested deeper than any real one, without running out of stack', () => {
    const deep = (inner: unknown, wrap: (x: unknown) => unknown): unknown => {
      let node = inner;
      for (let i = 0; i < 20_000; i++) node = wrap(node);
      return node;
    };
    const inDivs = (x: unknown): unknown => ({ tag: 'div', content: x });
    const list = { tag: 'ol', data: { content: 'glosses' }, content: house };

    // The meaning's text far down inside an item, in wrappers and in bare lists of one.
    expect(readRow(meanings('casa', 'n fem', 'n', [{ tag: 'li', content: deep('house', inDivs) }]), '0')).toBeNull();
    expect(readRow(meanings('casa', 'n fem', 'n', [{ tag: 'li', content: deep('house', (x) => [x]) }]), '0')).toBeNull();
    // The list of meanings itself far down, and a meaning under that many lists.
    const buried = [{ type: 'structured-content', content: deep(list, inDivs) }];
    expect(readRow(['casa', '', 'n fem', 'n', 0, buried, 0, ''], '0')).toBeNull();
    const nested = deep({ tag: 'li', content: ['house'] }, (x) => ({ tag: 'ul', content: [x] }));
    expect(readRow(meanings('casa', 'n fem', 'n', [nested]), '0')).toBeNull();
  });
});

describe('kindOf', () => {
  it('says a row’s tags in English: the part of speech, then what qualifies it', () => {
    expect(kindOf('n masc')).toBe('noun, masculine');
    expect(kindOf('v vt')).toBe('verb, transitive');
    expect(kindOf('name')).toBe('proper noun');
    expect(kindOf('adj')).toBe('adjective');
    expect(kindOf('adj fem masc reltnl')).toBe('adjective, feminine, masculine, relational');
    expect(kindOf('v vi irreg')).toBe('verb, intransitive, irregular');
  });

  it('says the grammar before the usage, whichever the file has first', () => {
    expect(kindOf('n 🇲🇽 masc')).toBe('noun, masculine, Mexico');
    expect(kindOf('n col masc')).toBe('noun, masculine, colloquial');
    expect(kindOf('col contr')).toBe('contraction, colloquial');
    expect(kindOf('name formal lit')).toBe('proper noun, formal, literary');
  });

  it('calls the file’s "western Germany" western, which is all it means on ustedes', () => {
    expect(kindOf('pron 🇵🇭 🇺🇸 🇩🇪⬅️ fem masc pl')).toBe('pronoun, feminine, masculine, plural, Philippines, US, western');
  });

  it('does not say plural twice', () => {
    expect(kindOf('n masc pl pl-only')).toBe('noun, masculine, plural only');
    expect(kindOf('n fem pl')).toBe('noun, feminine, plural');
  });

  it('leaves a tag it has no name for as it is written', () => {
    expect(kindOf('n zzz')).toBe('noun, zzz');
    expect(kindOf('🇲🇦 n masc')).toBe('noun, masculine, 🇲🇦');
    expect(kindOf('constructor toString')).toBe('constructor, toString');
  });

  it('says nothing for no tags', () => {
    expect(kindOf('')).toBe('');
    expect(kindOf('  ')).toBe('');
  });
});

describe('mergeByWord', () => {
  it('names three parts of speech at most, the one with most meanings first, and counts the rest', () => {
    const sense = (g: string) => ({ pos: [], glosses: [g] });
    const row = (id: string, kind: string[], meanings: number) =>
      ({ ...entry(SER_NOUN, id), word: 'tout', kind, senses: Array.from({ length: meanings }, (_, i) => sense(`${id}-${i}`)) });
    const [tout] = mergeByWord([
      row('1', ['adv', 'masc'], 2), row('2', ['det', 'masc'], 5), row('3', ['n', 'masc'], 1),
      row('4', ['pron', 'neut'], 3), row('5', ['adj', 'masc'], 1),
    ]);
    // A gender is said beside a noun only: here the noun is not among the three named.
    expect(tout?.kind).toEqual(['det', 'pron', 'adv', '+2']);
  });

  it('says a gender beside the noun it is the gender of, and not for an adjective', () => {
    const sense = (g: string) => ({ pos: [], glosses: [g] });
    const row = (id: string, kind: string[]) => ({ ...entry(SER_NOUN, id), word: 'x', kind, senses: [sense(id)] });
    // A noun first names its gender; a noun second leaves it to its meanings on the card.
    expect(mergeByWord([row('1', ['n', 'masc']), row('2', ['adj', 'fem', 'masc'])])[0]?.kind).toEqual(['n', 'masc', 'adj']);
    expect(mergeByWord([row('1', ['adj', 'fem', 'masc']), row('2', ['n', 'masc'])])[0]?.kind).toEqual(['adj', 'n']);
  });

  it('makes one entry of ser the verb and ser the noun', () => {
    const [ser, ...others] = mergeByWord([entry(SER_VERB, '00001389'), entry(SER_NOUN, '00001390')]);
    expect(others).toEqual([]);
    // The noun's gender is said beside its own meanings on the card, since ser is a verb first.
    expect(ser).toMatchObject({ id: '00001389', word: 'ser', common: false, kind: ['v', 'n'] });
    expect(ser?.senses.map((s) => [s.pos.join(' '), s.glosses[0]])).toEqual([
      ['v', 'to be (essentially or identified as)'],
      ['v', 'to be (in the passive voice sense)'],
      ['v', 'to exist; to occur'],
      ['n masc', 'a being, organism'],
      ['n masc', 'nature, essence'],
      ['n masc', 'value, worth'],
    ]);
    expect(ser?.senses[0]?.misc).toEqual(['cop']);
    expect(kindOf((ser?.kind ?? []).join(' '))).toBe('verb, noun');
  });

  it('names each part of speech of como once, its meanings in the file’s order', () => {
    const [como] = mergeByWord([entry(COMO_ADVERB, '1'), entry(COMO_CONJUNCTION, '2'), entry(COMO_PREPOSITION, '3')]);
    // The conjunction has the most meanings, so it is named first; the meanings stay in the file's order.
    expect(como?.kind).toEqual(['conj', 'prep', 'adv']);
    expect(como?.senses.map((s) => [s.pos.join(' '), s.glosses[0]])).toEqual([
      ['adv', 'as (to such an extent or degree)'],
      ['adv', 'like, about (approximately)'],
      ['conj', 'as (introducing a basis of comparison or equality)'],
      ['conj', 'as, since (being that)'],
      ['conj', 'how (in which way)'],
      ['conj', 'if, unless (under the condition that)'],
      ['prep', 'as (in the manner or role specified)'],
      ['prep', 'such as (for example)'],
      ['prep', 'like (similar to, reminiscent of)'],
    ]);
  });

  it('keeps different words apart, in the order each first appears', () => {
    const merged = mergeByWord([entry(SER_VERB, '1'), entry(CASA, '2'), entry(SER_NOUN, '3'), entry(COMO_ADVERB, '4')]);
    expect(merged.map((e) => [e.word, e.id, e.senses.length])).toEqual([['ser', '1', 6], ['casa', '2', 1], ['como', '4', 2]]);
  });

  it('leaves a word with one row as it was, and the rows it is given as they were', () => {
    const casa = entry(CASA);
    expect(mergeByWord([casa])[0]).toBe(casa);

    const rows = [entry(GRATIS_ADJECTIVE, '1'), entry(GRATIS_ADVERB, '2')];
    const before = JSON.stringify(rows);
    mergeByWord(rows);
    expect(JSON.stringify(rows)).toBe(before);
    expect(mergeByWord([])).toEqual([]);
  });

  it('says a meaning two rows share once, under both parts of speech', () => {
    const [gratis] = mergeByWord([entry(GRATIS_ADJECTIVE, '1'), entry(GRATIS_ADVERB, '2')]);
    expect(gratis?.kind).toEqual(['adj', 'adv']);
    expect(gratis?.senses).toEqual([{ pos: ['adj', 'adv'], glosses: ['free, without charge'] }]);
  });

  it('puts a row that only names a letter after the word’s own, whose id the entry takes', () => {
    const [de] = mergeByWord([entry(DE_LETTER, '00000052'), entry(DE_PREPOSITION, '00000053')]);
    expect(de).toMatchObject({ id: '00000053', kind: ['prep', 'n'] });
    expect(said(de)).toEqual([
      'of; \'s; used after the thing owned and before the owner',
      'from (with the source or provenance of or at)',
      'The name of the Latin script letter D/d.',
    ]);

    const [y] = mergeByWord([entry(Y_LETTER, '00000039'), entry(Y_CONJUNCTION, '00000040')]);
    expect(y).toMatchObject({ id: '00000040', kind: ['conj', 'char'] });
    expect(said(y).slice(0, 2)).toEqual(['and', 'plus, and']);
  });

  it('says how a word is used only where every row says so', () => {
    const [gilipollas] = mergeByWord([entry(GILIPOLLAS_ADJECTIVE, '1'), entry(GILIPOLLAS_NOUN, '2')]);
    expect(gilipollas?.kind).toEqual(['adj', 'n', '🇪🇸', 'derog', 'vulg']);

    // Colloquial is the adjective's alone, and stays with its meaning.
    const [bien] = mergeByWord([entry(BIEN_ADVERB, '1'), entry(BIEN_ADJECTIVE, '2')]);
    expect(bien?.kind).toEqual(['adv', 'adj']);
    expect(bien?.senses[1]?.pos).toEqual(['adj', 'fem', 'masc', 'col']);
  });

  it('keeps rows that are read differently apart', () => {
    const merged = mergeByWord([entry(PIE, '1'), entry(YI, '2')]);
    expect(merged.map((e) => [e.reading, e.senses[0]?.glosses[0]])).toEqual([
      ['piě (pie³)', 'left-falling stroke, usually read as 撇'],
      ['yì (yi⁴)', 'to arrive'],
    ]);
  });
});

describe('formIn: a verb row that is a form of another verb', () => {
  const li = (text: string) => ({ tag: 'li', content: [{ tag: 'div', content: [text] }] });
  const entryOf = (row: unknown): Entry => {
    const read = readRow(row, '1');
    if (!read || !('entry' in read)) throw new Error('not an entry');
    return read.entry;
  };

  it('files Italian sono and ha, rows of their own, as forms of essere and avere', () => {
    // it term_bank: sono is a row of its own, v sg, and is not among essere's forms.
    const sono = entryOf(meanings('sono', 'v sg', 'v', [li("first-person singular present indicative of essere: (I) am, I'm")]));
    expect(formIn(sono)).toEqual({ form: 'sono', of: [{ lemma: 'essere', tags: ['first-person singular present indicative'] }], pos: 'v' });
    const ha = entryOf(meanings('ha', 'v sg', 'v', [li('third-person singular present indicative of avere and (obsolete) havere')]));
    expect(formIn(ha)?.of).toEqual([{ lemma: 'avere', tags: ['third-person singular present indicative'] }]);
  });

  it('files a Portuguese verb with its pronoun written on as a form of the verb', () => {
    const ajudalo = entryOf(meanings('ajudá-lo', 'v abbv contr', 'v', [li('contraction of ajudar + o')]));
    expect(formIn(ajudalo)).toEqual({ form: 'ajudá-lo', of: [{ lemma: 'ajudar', tags: [] }], pos: 'v' });
  });

  it('keeps a row only as the form where it says nothing more, so the card opens the verb', () => {
    expect(onlyForm(entryOf(meanings('sono', 'v sg', 'v', [li("first-person singular present indicative of essere: (I) am, I'm")])))).toBe(true);
    // A meaning of its own beside the form: kept as a word as well.
    expect(onlyForm(entryOf(meanings('vale', 'v', 'v', [li('third-person singular present indicative of valere'), li('okay, all right')])))).toBe(false);
  });

  it('leaves a verb with a meaning of its own, and any row that is no verb', () => {
    expect(formIn(entryOf(meanings('parlare', 'v', 'v', [li('to speak, to talk')])))).toBeNull();
    expect(formIn(entryOf(meanings('ha', 'intj', '', [li('ah! (usually ironic or sarcastic)')])))).toBeNull();
  });
});
