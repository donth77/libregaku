import { keysFor as cedictKeys, parseLine, rank as cedictRank, toEntry as cedictEntry } from './cedict';
import { fetchBytes, gunzipText } from './download';
import type { Entry, RankHint } from './jmdict';
import type { CharacterInfo } from './kanji';
import { JMDICT, lookup, type Batch, type Source } from './store';
import { mergeByWord, readRow } from './wty';
import { zipFiles } from './zip';

/**
 * The dictionaries, one for each language that has one, by the names
 * settings.ts gives them (DICTIONARIES).
 *
 * JMdict is in store.ts, where it has always been. The others are read
 * here: each is somebody else's file in somebody else's format, and this is
 * the one place that says where it comes from and what a row of it means.
 */

/** Rows to a transaction: enough to be few, few enough not to hold the store long. */
const ROWS = 5000;

/** An id that sorts as a number does, so entries come back in their file's order. */
const idOf = (n: number): string => String(n).padStart(8, '0');

/* ── CC-CEDICT ──────────────────────────────────────────────────── */

/**
 * MDBG publishes the current file and nothing else: there is no release to
 * pin, and the address has not changed in fifteen years. The format is one
 * line a word, unchanged for longer. What is stored is marked with the day it
 * was fetched (store.ts), and replaced only when FORMAT here is bumped.
 */
export const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

/** How many characters of a word the card describes; a word is rarely longer. */
const CHARACTERS = 12;

export const CEDICT: Source = {
  id: 'cedict',
  db: 'libregaku-dict-cedict',
  release: 'mdbg',
  format: 1,
  rank: cedictRank,
  async read(_edition, onDownload) {
    const lines = (await gunzipText(await fetchBytes(CEDICT_URL, onDownload))).split('\n');
    if (lines.length < 1000) throw new Error('libregaku: dictionary contained no words');
    return (async function* (): AsyncGenerator<Batch> {
      for (let i = 0; i < lines.length; i += ROWS) {
        const end = Math.min(i + ROWS, lines.length);
        const entries: Batch['entries'] = [];
        for (let j = i; j < end; j++) {
          const row = parseLine(lines[j] ?? '');
          if (row) entries.push({ entry: cedictEntry(row, idOf(j)), keys: cedictKeys(row) });
        }
        yield { entries, percent: Math.round((end / lines.length) * 100) };
      }
    })();
  },
  /**
   * Each character of a word, from its own entry: 学 "to learn", 校 "school".
   * Its readings stand where a kanji's do on the card — the commonest first.
   */
  async characters(chars) {
    const found = await Promise.all(
      chars.slice(0, CHARACTERS).map(async (char): Promise<CharacterInfo | null> => {
        const entries = await lookup(char, undefined, CEDICT);
        const top = entries[0];
        if (!top) return null;
        const readings = [...new Set(entries.map((e) => e.reading).filter((r): r is string => Boolean(r)))];
        return { char, meanings: top.senses.flatMap((s) => s.glosses).slice(0, 4), on: readings.slice(0, 3), kun: [] };
      }),
    );
    return found.filter((c): c is CharacterInfo => c !== null);
  },
};

/* ── Wiktionary, by way of kaikki.org and wiktionary-to-yomitan ───── */

/**
 * The commit of the published files this build reads, pinned as JMdict's
 * release is: the files under "latest" are replaced with every update, and a
 * commit is not. A bump here is a deliberate data update, and FORMAT below
 * goes with it only if the reader (wty.ts) had to change.
 */
const WTY_COMMIT = '2f21ac1b3bf2e7b9a7339f13cf601a68a950036c';
const WTY_REVISION = '2026.10.04';

/** A Wiktionary dictionary: `target` words explained in `native`. */
export function wtyUrl(target: string, native: string): string {
  return (
    `https://huggingface.co/datasets/daxida/wty-release/resolve/${WTY_COMMIT}/` +
    `latest/dict/${target}/${native}/wty-${target}-${native}.zip`
  );
}

/** A word, or a word's main meaning, that the published file leaves out. */
interface Gap {
  word: string;
  /** What kind of word it is, in the file's codes. */
  kind: string[];
  glosses: string[];
  /** Its own inflected forms the file leaves out with it. */
  forms?: Array<{ form: string; tags: string[] }>;
}

/**
 * What the published files leave out, by the language the words are of.
 *
 * Wiktionary files muy, tu and buen as shortened forms of other words —
 * mucho, tuyo, bueno — and the converter drops such an entry without a trace:
 * no meaning, and nothing to say what it is a form of. For others it keeps
 * the entry and loses the sense everyone means: mi is there as the note and
 * the Greek letter and not as "my", al as "upon" and not "to the". They are
 * few, and among the commonest words there are: over 3.2 million words of
 * Tatoeba the Spanish ones with no entry were four in five of the words in
 * lower case that had none, muy alone one word in 340. Looking up muy and
 * finding nothing is not a dictionary. So they are given here, in our own
 * words, ahead of whatever the file has for the same word, and the list
 * stays this short: a word joins it by that count, not by a guess.
 */
const GAPS: Record<string, Gap[]> = {
  es: [
    { word: 'muy', kind: ['adv'], glosses: ['very'] },
    { word: 'mi', kind: ['det'], glosses: ['my'], forms: [{ form: 'mis', tags: ['plural'] }] },
    {
      word: 'tu', kind: ['det'], glosses: ['your (said to one person addressed as tú)'],
      forms: [{ form: 'tus', tags: ['plural'] }],
    },
    { word: 'su', kind: ['det'], glosses: ['his, her, its, their; your (said to someone addressed as usted)'] },
    { word: 'una', kind: ['artic', 'fem'], glosses: ['a, an (before a feminine noun)'] },
    { word: 'al', kind: ['contr'], glosses: ['to the (a and el, written as one word)'] },
    { word: 'buen', kind: ['adj'], glosses: ['good (bueno, before a masculine singular noun)'] },
    { word: 'algún', kind: ['det'], glosses: ['some, any (alguno, before a masculine singular noun)'] },
    { word: 'cualquier', kind: ['det'], glosses: ['any, whichever (cualquiera, before a noun)'] },
    { word: 'primer', kind: ['adj'], glosses: ['first (primero, before a masculine singular noun)'] },
    { word: 'tercer', kind: ['adj'], glosses: ['third (tercero, before a masculine singular noun)'] },
    { word: 'san', kind: ['adj'], glosses: ['Saint (santo, before a man’s name)'] },
    { word: 'quizás', kind: ['adv'], glosses: ['perhaps, maybe'] },
  ],
  // Spoken Korean's two commonest short forms: the file has 뭐 only as a form
  // of 무엇, and 거 only as the reading of a Chinese character.
  ko: [
    { word: '뭐', kind: ['pron'], glosses: ['what (무엇, as it is said)'] },
    { word: '거', kind: ['n'], glosses: ['thing; the fact that (것, as it is said)'] },
    // The copula: under 이다 the file has "to carry on the head" and "to tile
    // a roof", and for "to be" only a line that points at -이다.
    { word: '이다', kind: ['v'], glosses: ['to be (after a noun)'] },
    /*
     * The particles. Wiktionary keeps each on a page named with a hyphen
     * before it, -를 and -까지, and the file files it there: a spelling no
     * word in a line has. Under the form alone it has whatever else is spelt
     * that way — 이 "this" and "tooth", 에서 Esau, 보다 "to see" — or a row
     * that calls 를 another way to write 이거, or nothing at all. One word in
     * four of Tatoeba's Korean is a particle, 24,714 in 15,941 sentences, and
     * none was answered by an entry that says what it does. Here is every
     * spelling of one with ten or more among them, and 하고, which speech has
     * for 와: 99 in 100 of them. All but 야, which ko-dic calls a particle as
     * often when it is the copula: 감자야, "it is a potato". Each spelling has
     * a line of its own, since which is said depends on the sound before it.
     * PARTICLE, below, is how a particle finds its line and no other word does.
     */
    { word: '이', kind: ['ptcl'], glosses: ['marks the subject (after a consonant)'] },
    { word: '가', kind: ['ptcl'], glosses: ['marks the subject (after a vowel)'] },
    { word: '께서', kind: ['ptcl'], glosses: ['marks the subject (with respect)'] },
    { word: '은', kind: ['ptcl'], glosses: ['marks the topic (after a consonant)'] },
    { word: '는', kind: ['ptcl'], glosses: ['marks the topic (after a vowel)'] },
    { word: '을', kind: ['ptcl'], glosses: ['marks the object (after a consonant)'] },
    { word: '를', kind: ['ptcl'], glosses: ['marks the object (after a vowel)'] },
    { word: '의', kind: ['ptcl'], glosses: ['’s, of'] },
    { word: '에', kind: ['ptcl'], glosses: ['at, in, on (a place or a time); to (a place)'] },
    { word: '에서', kind: ['ptcl'], glosses: ['at, in (where something is done); from (a place)'] },
    {
      word: '서', kind: ['ptcl'],
      glosses: ['at, in; from (에서, as it is said)', 'marks the subject, after a number of people (둘이서, the two together)'],
    },
    { word: '에게', kind: ['ptcl'], glosses: ['to (a person)'] },
    { word: '한테', kind: ['ptcl'], glosses: ['to (a person; spoken)'] },
    { word: '께', kind: ['ptcl'], glosses: ['to (a person, with respect)'] },
    { word: '으로', kind: ['ptcl'], glosses: ['to, toward; by, with, using; as (after a consonant other than ㄹ)'] },
    { word: '로', kind: ['ptcl'], glosses: ['to, toward; by, with, using; as (after a vowel or ㄹ)'] },
    { word: '과', kind: ['ptcl'], glosses: ['and; with (after a consonant)'] },
    { word: '와', kind: ['ptcl'], glosses: ['and; with (after a vowel)'] },
    { word: '하고', kind: ['ptcl'], glosses: ['and; with (spoken)'] },
    { word: '이랑', kind: ['ptcl'], glosses: ['and; with (spoken, after a consonant)'] },
    { word: '랑', kind: ['ptcl'], glosses: ['and; with (spoken, after a vowel)'] },
    { word: '이나', kind: ['ptcl'], glosses: ['or; or something; as many as (after a consonant)'] },
    { word: '나', kind: ['ptcl'], glosses: ['or; or something; as many as (after a vowel)'] },
    { word: '도', kind: ['ptcl'], glosses: ['also, too; even'] },
    { word: '만', kind: ['ptcl'], glosses: ['only, just'] },
    { word: '뿐', kind: ['ptcl'], glosses: ['only, nothing but'] },
    { word: '밖에', kind: ['ptcl'], glosses: ['only, nothing but (with a negative)'] },
    { word: '조차', kind: ['ptcl'], glosses: ['even'] },
    { word: '까지', kind: ['ptcl'], glosses: ['until, up to, as far as; even'] },
    { word: '부터', kind: ['ptcl'], glosses: ['from, since, starting with'] },
    { word: '보다', kind: ['ptcl'], glosses: ['than'] },
    { word: '처럼', kind: ['ptcl'], glosses: ['like, as'] },
    { word: '같이', kind: ['ptcl'], glosses: ['like, as'] },
    { word: '만큼', kind: ['ptcl'], glosses: ['as much as, as … as'] },
    { word: '대로', kind: ['ptcl'], glosses: ['as, according to'] },
    { word: '마다', kind: ['ptcl'], glosses: ['every, each'] },
    { word: '이라고', kind: ['ptcl'], glosses: ['marks what was said, or what something is called (after a consonant)'] },
    { word: '라고', kind: ['ptcl'], glosses: ['marks what was said, or what something is called (after a vowel)'] },
    { word: '요', kind: ['ptcl'], glosses: ['makes what is said polite'] },
  ],
};

/**
 * How a language's analyser tags a particle, where its dictionary has to be
 * told: ko-dic's tags for one all start with J — 를 is JKO, 는 JX.
 *
 * A particle is spelt like other words and is none of them. So a token the
 * analyser calls one is answered by a particle's own entry, which GAPS gives,
 * or not at all: never by 이 "tooth", nor by a word the rows of forms take it
 * for — the 마자 of 하자마자 is in the file as "let us smash", a form of 마다.
 * Nothing is an answer too. The 엔 of 이번엔 is 에 and 는 run together, the
 * file has only the yen under it, and the analyser's next key, 에, is asked.
 * Any other token is answered as it always was, by the other words of that
 * spelling, with the particle's entry after theirs.
 *
 * An ending (E…) is left as it was. What ko-dic calls an ending standing
 * alone is as often a verb it did not know — the 진다 of 서쪽으로 진다, the
 * 자니 of 아직도 자니 — and the rows of forms are what find 지다 and 자다.
 */
const PARTICLE: Record<string, RegExp> = { ko: /^J/ };

/**
 * A row that is a particle's. The file puts the part of speech first among a
 * row's codes, so 반입자, "an antiparticle", which is 'n ptcl', is not one.
 */
const ofParticle = (row: Entry): boolean => row.kind?.[0] === 'ptcl';

/**
 * One Wiktionary dictionary as a source.
 *
 * The zip holds the entries in files of a few thousand rows each, and they
 * are unpacked and stored one at a time: Spanish is 346 MB unpacked, which is
 * more than should ever be held at once. A row is a word, or an inflected
 * form with the word it is a form of; the forms are what find hablar from
 * hablábamos (store.ts, formsOf).
 */
function wty(target: string, native: string): Source {
  const id = `wty-${target}-${native}`;
  const particle = PARTICLE[target];
  /** The token is one the analyser calls a particle. */
  const isParticle = (hint?: RankHint): boolean => Boolean(particle && hint?.pos && particle.test(hint.pos));
  return {
    id,
    db: `libregaku-dict-${id}`,
    release: WTY_REVISION,
    // Bumped when the reader (wty.ts) or the words added here (GAPS) change what is stored.
    format: 3,
    rank: (entries: Entry[], key: string, hint?: RankHint) => {
      // One row for each part of speech a word has; the card shows one entry.
      const rows = entries.filter((e) => e.word === key);
      if (!particle) return mergeByWord(rows);
      // A particle's rows are an entry apart (PARTICLE): all that answers a
      // particle, and what comes last for any other word.
      const own = mergeByWord(rows.filter(ofParticle));
      return isParticle(hint) ? own : [...mergeByWord(rows.filter((row) => !ofParticle(row))), ...own];
    },
    followsForms: (hint) => !isParticle(hint),
    async read(_edition, onDownload) {
      const number = (name: string): number => Number(/(\d+)\.json$/.exec(name)?.[1] ?? 0);
      const banks = zipFiles(await fetchBytes(wtyUrl(target, native), onDownload))
        .filter((f) => /^term_bank_\d+\.json$/.test(f.name))
        .sort((a, b) => number(a.name) - number(b.name));
      if (!banks.length) throw new Error('libregaku: dictionary contained no words');
      return (async function* (): AsyncGenerator<Batch> {
        let n = 0;
        // First, what the file leaves out: numbered ahead of its rows, so a
        // meaning given here leads the entry it is merged into.
        const gaps = GAPS[target] ?? [];
        if (gaps.length) {
          yield {
            entries: gaps.map((gap) => ({
              entry: {
                id: idOf(n++), word: gap.word, common: false, kind: gap.kind,
                senses: gap.glosses.map((g) => ({ pos: gap.kind, glosses: [g] })),
              },
              keys: [gap.word],
            })),
            inflections: gaps.flatMap((gap) => (gap.forms ?? []).map((f) => ({
              form: f.form, of: [{ lemma: gap.word, tags: f.tags }], pos: gap.kind[0],
            }))),
            percent: 0,
          };
        }
        for (const [at, bank] of banks.entries()) {
          const rows = JSON.parse(new TextDecoder().decode(await bank.bytes())) as unknown;
          if (!Array.isArray(rows)) continue;
          for (let i = 0; i < rows.length; i += ROWS) {
            const batch: Required<Omit<Batch, 'percent'>> = { entries: [], inflections: [] };
            for (const raw of rows.slice(i, i + ROWS) as unknown[]) {
              const row = readRow(raw, idOf(n++));
              if (!row) continue;
              if ('entry' in row) batch.entries.push({ entry: row.entry, keys: [row.entry.word] });
              else batch.inflections.push(row.inflection);
            }
            const within = Math.min(1, (i + ROWS) / rows.length);
            yield { ...batch, percent: Math.round(((at + within) / banks.length) * 100) };
          }
        }
      })();
    },
  };
}

export const SOURCES: Record<string, Source> = {
  [JMDICT.id]: JMDICT,
  [CEDICT.id]: CEDICT,
  'wty-ko-en': wty('ko', 'en'),
  'wty-es-en': wty('es', 'en'),
};
