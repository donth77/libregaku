/**
 * LANGUAGE-PAIRS.md, written from the code: what each language that can be
 * learned gets, and which dictionary explains its words for each language of
 * the learner's own. `node scripts/language-pairs.mjs` writes it, and a test
 * (src/__tests__/language-pairs.test.ts) fails when the page and the code
 * disagree, so the store listing's link never describes another build.
 */
import {
  DICTIONARIES, TARGET_LANGUAGES, TRANSLATION_LANGUAGES,
  dictionaryOf, fallbackDictionaryOf, featuresOf, ownDictionaryOf,
} from '../src/settings';
import { dictionarySite } from '../src/dict/sites';

/** Each dictionary by the name its makers give it, with where it comes from and its licence. */
const DICTIONARY_INFO: Record<string, { url: string; licence: string; about: string }> = {
  JMdict: {
    url: 'https://www.edrdg.org/jmdict/j_jmdict.html',
    licence: 'CC BY-SA 4.0',
    about: 'Japanese, by the Electronic Dictionary Research and Development Group, in English and eight other languages',
  },
  'CC-CEDICT': {
    url: 'https://www.mdbg.net/chinese/dictionary?page=cc-cedict',
    licence: 'CC BY-SA 4.0',
    about: 'Chinese explained in English, by MDBG and its contributors',
  },
  'CC-Canto': {
    url: 'https://cantonese.org/',
    licence: 'CC BY-SA 3.0',
    about: 'Cantonese explained in English, with Jyutping, by Pleco',
  },
  Wiktionary: {
    url: 'https://kaikki.org/',
    licence: 'CC BY-SA 4.0',
    about: 'Wiktionary’s editions, through kaikki.org and wiktionary-to-yomitan',
  },
  KRDict: {
    url: 'https://krdict.korean.go.kr/',
    licence: 'CC BY-SA 2.0 KR',
    about: 'Korea’s dictionary for learners, by the National Institute of Korean Language, in eleven languages',
  },
  WikDict: {
    url: 'https://www.wikdict.com/',
    licence: 'CC BY-SA 4.0',
    about: 'Wiktionary’s translations, by Karl Bartel through DBnary, made into a dictionary for each pair of languages',
  },
  CFDICT: {
    url: 'https://github.com/licryle/CxDICT',
    licence: 'CC BY-SA 4.0',
    about: 'Chinese explained in French, by chine.in, kept up to date by CxDICT',
  },
  HanDeDict: {
    url: 'https://handedict.zydeo.net/',
    licence: 'CC BY-SA 3.0',
    about: 'Chinese explained in German',
  },
};

/** A dictionary's name, from the id the code knows it by. */
export function dictionaryName(id: string): string {
  if (id === 'jmdict') return 'JMdict';
  if (id === 'cedict') return 'CC-CEDICT';
  if (id === 'canto') return 'CC-Canto';
  if (id === 'krdict') return 'KRDict';
  if (id === 'handedict') return 'HanDeDict';
  if (id.startsWith('cxdict')) return 'CFDICT';
  if (id.startsWith('wikdict-')) return 'WikDict';
  if (id.startsWith('wty-')) return 'Wiktionary';
  throw new Error(`no name for the dictionary ${id}: add it to scripts/language-pairs-page.ts`);
}

const READINGS = { furigana: 'Furigana', pinyin: 'Pinyin', jyutping: 'Jyutping' } as const;

const GETS: Record<0 | 1 | 2, string> = { 2: 'Full, with an analyser', 1: 'Full', 0: 'Words only' };

/**
 * How a word of a language is said, best first: the first source that has
 * the word is played. Kept by hand, from src/audio/recordings.ts.
 */
const RECORDINGS: Array<[string, string, string]> = [
  ['Japanese', 'JapanesePod101, then Lingua Libre', 'Both'],
  ['Korean', 'Wiktionary, then Lingua Libre, then Naver Dictionary (heard on the lookup card only)', 'The first two'],
  ['Chinese', 'audio-cmn, then Lingua Libre', 'Both'],
  ['Cantonese', 'Lingua Libre', 'Yes'],
  ['Spanish', 'Lingua Libre, then SpanishDict’s generated voice (the Pronounce button only)', 'Lingua Libre'],
  ['French', 'Lingua Libre', 'Yes'],
  ['German', 'Lingua Libre', 'Yes'],
];

export function languagePairsPage(): string {
  const lines: string[] = [];
  const p = (s = ''): void => void lines.push(s);
  const learned = TARGET_LANGUAGES.filter((l) => DICTIONARIES[l.code]);
  const natives = TRANSLATION_LANGUAGES;

  p('# Language pairs');
  p();
  p('What Libregaku does for each language you can learn, and which dictionary explains its words in your own language.');
  p();
  p('This page is written from the extension’s code by `node scripts/language-pairs.mjs`. A test fails when the two disagree.');
  p();
  p('## Languages you can learn');
  p();
  p('| Language | What you get | Dictionary | Above the words |');
  p('|---|---|---|---|');
  for (const t of TARGET_LANGUAGES) {
    const source = DICTIONARIES[t.code];
    const readings = featuresOf(t.code).readings;
    p(`| ${t.label} | ${GETS[t.tier]} | ${source ? dictionaryName(source) : '—'} | ${readings ? READINGS[readings] : '—'} |`);
  }
  p();
  p('- **Full**: a word is looked up, and matched to your Anki cards, in whatever form it is said: hablábamos finds hablar. The form is found in the dictionary’s list of each word’s forms.');
  p('- **Full, with an analyser**: the same, with the line split into words by an analyser that reads its grammar, as these languages need: 갔어요 finds 가다, and 食べて finds 食べる.');
  // Said only while some language is still only split into words.
  if (TARGET_LANGUAGES.some((t) => t.tier === 0)) {
    p('- **Words only**: the line is split into words, but there are no lookups yet, and a word matches a card only as it is written.');
  }
  p();
  p('## Your own language');
  p();
  p(`You can choose any of these ${natives.length}: ${natives.map((n) => n.label).join(', ')}. The interface follows it, and so do definitions where a dictionary in it exists.`);
  p();
  p('## Definitions, by the language you learn');
  p();
  p('Where a dictionary in your own language exists for a pair, a word is looked up there first, and in the language’s own dictionary when it has no entry. "Dictionary button" is the site a card’s dictionary button opens.');

  let own = 0;
  for (const t of learned) {
    p();
    p(`### Learning ${t.label}`);
    p();
    p('| Your language | Definitions in | Dictionaries, in the order asked | Dictionary button |');
    p('|---|---|---|---|');
    for (const n of natives) {
      const base = dictionaryOf(t.code, { native: n.code, definitions: n.code });
      const mine = ownDictionaryOf(t.code, { native: n.code });
      const fallback = fallbackDictionaryOf(t.code, { native: n.code });
      // JMdict comes in editions: in the learner's language where it has one.
      const jmdictOwn = base?.source === 'jmdict' && base.edition !== 'eng';
      const chain = [mine?.source, base?.source, fallback?.source].filter((s): s is string => Boolean(s)).map(dictionaryName);
      const definitions = mine ? `${n.label}, then English` : jmdictOwn ? n.label : 'English';
      if (mine || jmdictOwn) own++;
      const site = dictionarySite(t.code, n.code) ?? featuresOf(t.code).dictionary;
      p(`| ${n.label} | ${definitions} | ${[...new Set(chain)].join(', then ')} | ${site?.name ?? ''} |`);
    }
  }
  p();
  p(`Definitions are in your own language in ${own} of the ${learned.length * natives.length} pairs, and in English in the rest.`);
  p();
  p('## Recordings of a word');
  p();
  p('The Pronounce button plays the first of these that has the word. Only recordings licensed for reuse go on a card.');
  p();
  p('| Language | Recordings, best first | On a card |');
  p('|---|---|---|');
  for (const row of RECORDINGS) p(`| ${row.join(' | ')} |`);
  p();
  p('Where none has the word, your own recording address is tried, then your browser’s voice.');
  p();
  p('## The dictionaries');
  p();
  p('Each is downloaded from its source the first time a language needs it, and keeps its own licence.');
  p();
  for (const [name, d] of Object.entries(DICTIONARY_INFO)) p(`- [${name}](${d.url}): ${d.about}. ${d.licence}.`);
  return lines.join('\n') + '\n';
}
