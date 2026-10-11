import type { LookupKey, MergedToken } from './merge';
import { place, runsOf } from './place';
import type { Token } from './types';

/**
 * Korean: from the analyser's morphemes to the words a learner thinks in.
 *
 * ko-dic cuts as fine as IPADIC does. 갔어요 comes back as 갔 + 어요, 공부하고
 * as 공부 + 하 + 고, 학교에 as 학교 + 에 — and nobody wants a card for 어요.
 * So a stem and its endings are one word, looked up as stem + 다; a noun and
 * the 하다 that makes a verb of it are one word; and a particle is a token of
 * its own beside the noun, as に and は are in Japanese.
 *
 * Each word keeps both halves, as merge.ts does: the surface for the line,
 * the dictionary form for matching against Anki.
 */

/** One unit as ko-dic reports it, as the offscreen analyser will read its row. */
export interface KoMorpheme {
  surface: string;
  /** ko-dic's tag: NNG, VV, JKS, EF — joined with + for a fused unit: VV+EP. */
  tag?: string;
  /** 'Inflect', 'Compound' or 'Preanalysis' when the unit is more than one morpheme. */
  type?: string;
  /** Its parts as ko-dic writes them: 가/VV/*+았/EP/*  */
  expression?: string;
}

/* ── Units and their pieces ──────────────────────────────────────── */

/** One morpheme inside a unit: 갔 is 가/VV and 았/EP. */
interface Piece {
  form: string;
  tag: string;
}

/** A unit as merging reads it. It is never cut: 갔 has no place to cut. */
interface Unit {
  surface: string;
  pieces: Piece[];
  /** The words inside a compound noun — 프랑스어 is 프랑스 + 어 — to look up when the whole is not in the dictionary. */
  inside?: string[];
  /** The stem ko-dic gave, where it was read again as another verb's: 몰 for the 모르 of 몰라서요. */
  other?: string;
}

/*
 * ko-dic spells a letter that joins the syllable before it three ways: ᆫ
 * (a final), ᄇ (an initial) and ㄴ, the letter on its own. One spelling,
 * the last, is what a table can be keyed on and what a card can show.
 */
const LETTER: Record<string, string> = {
  'ᆫ': 'ㄴ', 'ᆯ': 'ㄹ', 'ᆷ': 'ㅁ', 'ᆸ': 'ㅂ', 'ᆻ': 'ㅆ',
  'ᄂ': 'ㄴ', 'ᄅ': 'ㄹ', 'ᄆ': 'ㅁ', 'ᄇ': 'ㅂ', 'ᄊ': 'ㅆ',
};
const FINAL_LETTER: Record<string, number> = { 'ㄴ': 4, 'ㄹ': 8, 'ㅁ': 16, 'ㅂ': 17, 'ㅆ': 20 };
const SYLLABLE = 0xac00;
const isSyllable = (c: number): boolean => c >= SYLLABLE && c <= 0xd7a3;
/** The consonant a syllable starts with, as its number in a syllable: 11 for ㅇ, 18 for ㅎ. */
const initialOf = (c: number): number => (isSyllable(c) ? Math.floor((c - SYLLABLE) / 588) : -1);
/** The consonant a word's last syllable ends on: 0 for none, 4 for ㄴ, 8 for ㄹ. */
const finalOf = (s: string): number => {
  const c = s.charCodeAt(s.length - 1);
  return isSyllable(c) ? (c - SYLLABLE) % 28 : -1;
};
/** 알 from 아, 만들 from 만드; 언젠가 from 언젠간. */
const withFinal = (s: string, final: number): string =>
  s.slice(0, -1) + String.fromCharCode(s.charCodeAt(s.length - 1) - Math.max(0, finalOf(s)) + final);

/**
 * A piece as a learner would write it. ko-dic writes the 았 of 샀 as ㅏㅆ and
 * the 어요 of 봐요 as ㅏ요 — the vowel that merged into the stem, without the
 * ㅇ that would make it a syllable.
 */
function tidy(form: string): string {
  const letters = [...form].map((c) => LETTER[c] ?? c).join('');
  return letters.replace(/^([ㅏ-ㅣ])([ㄴㄹㅁㅂㅆ])?/u, (_, vowel: string, final: string | undefined) =>
    String.fromCharCode(SYLLABLE + (11 * 21 + (vowel.charCodeAt(0) - 0x314f)) * 28 + (final ? FINAL_LETTER[final] ?? 0 : 0)));
}

/** Stems that take endings and are words: verbs, adjectives, helper verbs, 아니다. */
const PREDICATE = new Set(['VV', 'VA', 'VX', 'VCN']);
/** Suffixes that make a verb or an adjective of the noun before them: 하, 되, 시키, 스럽, 롭, 답. */
const DERIVING = new Set(['XSV', 'XSA']);
const isEnding = (tag: string): boolean => tag.startsWith('E');
const isParticle = (tag: string): boolean => tag.startsWith('J');
/** Punctuation and symbols — but not Latin script (SL), hanja (SH) or figures (SN), which are S tags too. */
const isSymbol = (tag: string): boolean => tag.startsWith('S') && tag !== 'SL' && tag !== 'SH' && tag !== 'SN';

/** The pieces ko-dic lists for a fused unit, or none where it lists none that can be used. */
function piecesOf(expression: string | undefined): Piece[] {
  if (!expression) return [];
  const pieces = expression.split('+').map((part) => {
    const [form = '', tag = ''] = part.split('/');
    return { form: tidy(form), tag };
  });
  return pieces.some((p) => !p.form || !p.tag) ? [] : pieces;
}

function unitOf(m: Reread): Unit {
  const tag = (m.tag ?? '').split('+')[0] || 'UNKNOWN';
  const whole: Unit = { surface: m.surface, pieces: [{ form: m.surface, tag }] };
  const pieces = piecesOf(m.expression);
  if (!pieces.length) return whole;
  // A compound noun is one word, whatever it was built from.
  if (m.type !== 'Inflect') return { ...whole, inside: pieces.map((p) => p.form) };
  if (m.other) return { surface: m.surface, pieces, other: m.other };
  /*
   * A unit of one piece is a spelling: 우 is 울 before 는, and the stem is
   * what the dictionary form is made from. For anything but a stem the
   * written form is the word — ko-dic files the 아 of surprise under 아이.
   */
  if (pieces.length === 1) return PREDICATE.has(tag) || DERIVING.has(tag) ? { surface: m.surface, pieces } : whole;
  return { surface: m.surface, pieces };
}

/* ── What the analyser misreads ──────────────────────────────────── */

/**
 * A reading in the notation the tables below use: units apart by a space,
 * each `surface/tag`, with `=` before the pieces of a fused one —
 * `세요/EP+EF=시/EP+어요/EF`. The surfaces put together are the surface read,
 * so the word still stands where it stood on the line.
 */
function reading(spec: string): KoMorpheme[] {
  return spec.split(' ').map((unit) => {
    const [head = '', expression] = unit.split('=');
    const at = head.indexOf('/');
    const m: KoMorpheme = { surface: head.slice(0, at), tag: head.slice(at + 1) };
    return expression ? { ...m, type: 'Inflect', expression } : m;
  });
}

const keyOf = (m: KoMorpheme): string => `${m.surface}/${m.tag ?? ''}`;

/** A unit read again, with the stem ko-dic gave for it where that is still worth looking up. */
interface Reread extends KoMorpheme {
  other?: string;
}

/**
 * Units ko-dic misreads wherever they stand, and what they are.
 *
 * Counted on 15,941 Tatoeba sentences, read twice: as written, and without
 * the mark that ends them, which is how a subtitle line arrives. ko-dic
 * expects a full stop after a final ending; without one it takes the last
 * word of the line for a noun, and 주세요 for a name. The two counts after
 * each row are those two readings. A row is here only if its surface is
 * never, in speech, the word ko-dic took it for.
 */
const MISREAD: Record<string, string> = {
  '주세요/NNP': '주/VV 세요/EP+EF=시/EP+어요/EF',                // 0 / 126 — 물 좀 주세요
  '주십시오/NNG+VCP+EC': '주/VV 십시오/EP+EF=시/EP+ㅂ시오/EF',     // 0 / 19 — read as 주시 "gaze" + 이 + ㅂ시오
  '오/NR 십/NR 시오/NR': '오/VV 십시오/EP+EF=시/EP+ㅂ시오/EF',     // 0 / 3 — 어서 오십시오, read as five, ten, …
  '십/NR 시오/NR': '십시오/EP+EF=시/EP+ㅂ시오/EF',                // 1 / 6
  '아시나/NNP 요/VCP+EC': '아/VV 시/EP 나요/EF',                  // 0 / 8 — 혹시 아시나요
  '톰과/NNP': '톰/NNP 과/JC',                                    // 48 / 48 — a name ko-dic has with its particle on
  '만든/VV 다/EF': '만든다/VV+EF=만들/VV+ㄴ다/EF',                // 11 / 0 — 만든 taken for a stem
  '지가/EC+JKS': '지/EC 가/JKS',                                 // 4 / 4 — 쉽지가 않아, read as ㄹ지 "whether"
  '마셔요/VV+EP+EF': '마셔요/VV+EF=마시/VV+어요/EF',              // 3 / 0 — "drinks", read as 말 + 시 + 어요, "don't"
  // adverbs that are words of their own, taken apart as an adjective and 게
  '어떻/VA 게/EC': '어떻게/MAG',                                 // 134 / 130 — "how"; 어떻게 되세요 is not "comes to"
  '그렇/VA 게/EC': '그렇게/MAG',                                 // 88 / 82
  '이렇/VA 게/EC': '이렇게/MAG',                                 // 17 / 16
  '어째서/MAG+XSV+EC': '어째서/MAG',                             // 9 / 9 — "why", read as 어찌 + 하 + 아서
  '다시/VV 는/ETM': '다시/MAG 는/JX',                            // 6 / 6 — 다시는 "never again", read as 달 + 시 + 는
};

/**
 * Units misread where they open an eojeol.
 *
 * lindera's ko-dic takes no account of the space before a word, so a short
 * word that looks like an ending, a suffix or a particle is read as one,
 * hanging off nothing: the 게 of 많은 게 as the ending 게, the 두 of 두 명 as a
 * particle, 다 in 다 했어 as the ending 다. What opens an eojeol is a word, and
 * these are the words. A `$` after the key is for a unit that is all of its
 * eojeol. Counts as in MISREAD, of the times the unit opens one.
 */
const OPENING: Record<string, string> = {
  // 것, run together with its particle: 많은 게, 중요한 건, 쌀쌀한 걸, 잘 거다
  '게/EC $': '게/NNB+JKS=것/NNB+이/JKS',           // 98 / 94
  '건/EC $': '건/NNB+JX=것/NNB+ㄴ/JX',             // 75 / 73
  '걸/VCP+EF $': '걸/NNB+JKO=것/NNB+ㄹ/JKO',       // 10 / 0
  '거다/EC $': '거/NNB 다/VCP+EF=이/VCP+다/EF',     // 0 / 10
  // nouns that follow a modifier: 본 적이 있다, 만난 지 4년 — and see leant()
  '적/XSN': '적/NNB',                               // 131 / 129
  '지/EC $': '지/NNB',                              // 23 / 20
  // numbers, and what they count: 두 명, 세 시간, 몇 시죠 — and see numeral() for 한, yesOrYour() for 네
  '두/JX': '두/MM',                                 // 55 / 55
  '세/VV+EC $': '세/MM',                            // 33 / 33
  '시/EP': '시/NNBC',                               // 18 / 18
  // 이 단어, 다 했어, 별로, 이리 와, 무슨 일
  '이/VCP $': '이/MM',                              // 142 / 135
  '다/EC $': '다/MAG',                              // 85 / 79
  '별/XSN 로/JKB': '별로/MAG',                      // 20 / 20
  '이/VCP 리/EP $': '이리/MAG',                     // 2 / 2 — after a mark: 야, 너! 이리 와 봐
  '일/VCP+ETM': '일/NNG',                           // 17 / 15
  // 가다: 못 가, 학교에 가요, 버스로 갑니다
  '가/JKS': '가/VV',                                // 70 / 70
  '가요/VCP+EF': '가요/VV+EF=가/VV+아요/EF',        // 22 / 0
  '갑니다/XSN+VCP+EF': '갑니다/VV+EF=가/VV+ㅂ니다/EF',   // 8 / 0
  // 자다: 잘 자, 남자와 자고, 충분히 자는 것, 관에서 자지 않는다
  '자/EF': '자/VV+EF=자/VV+아/EF',                  // 9 / 0
  '자/EC': '자/VV+EC=자/VV+아/EC',                  // 4 / 13
  '자고/EC': '자/VV 고/EC',                         // 12 / 12
  '자는/ETM': '자/VV 는/ETM',                       // 6 / 6
  '자지/EC': '자/VV 지/EC',                         // 5 / 5
  // 서다: 앞에 서 있다, 확신이 안 서
  '서/EC $': '서/VV+EC=서/VV+어/EC',                // 14 / 14
  '서/EC 있/VX': '서/VV+EC=서/VV+어/EC 있/VX',      // 6 / 6
  // 나다: 병이 나요, 냄새 나, 멈추고 나서
  '나요/VCP+EF $': '나요/VV+EF=나/VV+아요/EF',      // 4 / 0
  '나요/EC $': '나요/VV+EF=나/VV+아요/EF',          // 0 / 4
  '나/EC $': '나/VV+EC=나/VV+아/EC',                // 0 / 5
  '나/NP 서/JKB $': '나/VX 서/EC',                  // 7 / 7 — read as "I" and a particle
  // 듣다 and 들다: 들은 거, 들을 수, 예를 들 수
  '들/XSN 은/JX': '들/VV 은/ETM',                   // 4 / 4
  '들/XSN 을/JKO': '들/VV 을/ETM',                  // 5 / 5
  '들/XSN $': '들/VV+ETM=들/VV+ㄹ/ETM',             // 2 / 2
  // 다르다: 너와 달라, read as 어다 + 이 + ㄹ라
  '달라/EC+VCP+EF': '달라/VA+EF=다르/VA+아/EF',     // 7 / 0
};

/** How a sentence is said: with 요 or 습니다 on its last word, or without. */
type Level = 'polite' | 'plain';

/** What stands either side of an eojeol, where the line is known. */
interface Around {
  /** The eojeol before it: none where the line opens with this one, and not given where the line is not known. */
  before?: KoMorpheme[];
  after?: KoMorpheme[];
  /** Nothing follows it on the line. */
  closing: boolean;
  /** How the sentence it stands in ends, where the line shows that. */
  said?: Level;
}

/** A reading, and how many units it is a reading of. */
type Fix = [spec: string, units: number];

/** The first morpheme of a unit, in its dictionary spelling: 않 for 않았, 말 for 마세요. */
const leadOf = (m: KoMorpheme | undefined): string => (m ? piecesOf(m.expression)[0]?.form ?? m.surface : '');
/** The tag a unit closes on: ETM for 할, which is 하/VV + ㄹ/ETM. */
const closeOf = (m: KoMorpheme | undefined): string => (m?.tag ?? '').split('+').pop() ?? '';

/** Native numerals as they stand before what they count, whatever ko-dic called them. */
const NUMERAL = new Set(['한', '두', '세', '네', '몇', '여러']);
/** Counters ko-dic reads as something else after a numeral: the 번 of 한 번 as 벌다, the 잔 of 두 잔 as an adjective. */
const COUNTER = new Set(['번', '잔', '살', '명', '개', '대', '권', '시', '달', '장', '병', '마리', '가지', '시간', '조각']);
/** Nouns that 한 before them modifies as "did", not counts as "one": 네가 한 일, 전에 한 말, 한 적이 없다. */
const DONE = new Set(['것', '거', '걸', '게', '건', '적', '줄', '일', '말', '짓', '후', '뒤', '다음']);
const NOMINAL_TAG = /^(NN|NR|NP|MM|SN)/;
const isNumber = (m: KoMorpheme | undefined): boolean =>
  Boolean(m && (m.tag === 'SN' || m.tag === 'NR' || NUMERAL.has(m.surface)));
const counts = (m: KoMorpheme | undefined): boolean => Boolean(m && (m.tag === 'NNBC' || COUNTER.has(m.surface)));

/**
 * A numeral or a counter ko-dic took for something else, told by its
 * neighbour. 한 alone in its eojeol is read as 하다 + ㄴ, "did" — 240 times,
 * of which 30 are: 네가 한 일, 한 적이 없다. The rest are "one": 한 번, 커피
 * 한 잔, 한 사람. And a counter after a number is a counter: the 번 of 한 번
 * is not 벌다 (32), nor the 잔 of 두 잔 an adjective (13). (네 has yesOrYour().)
 */
function numeral(m: KoMorpheme, alone: boolean, around: Around): string | undefined {
  const next = around.after?.[0];
  const tag = m.tag ?? '';
  if (alone && m.surface === '한' && /^(XSA|XSV|VV)\+ETM$/.test(tag)) {
    return next && DONE.has(next.surface) ? '한/VV+ETM=하/VV+ㄴ/ETM' : '한/MM';
  }
  if (COUNTER.has(m.surface) && !NOMINAL_TAG.test(tag) && isNumber(around.before?.at(-1))) return `${m.surface}/NNBC`;
  return undefined;
}

const isWord = (m: KoMorpheme): boolean => !isSymbol(m.tag ?? '');
/** An eojeol as it is written, without its marks. */
const written = (run: KoMorpheme[]): string => run.filter(isWord).map((m) => m.surface).join('');

/**
 * How a sentence ends when it is said politely: 가요, 가죠, 가십시오, and 니다
 * or 니까 after ㅂ — 갑니다, 갑니까, but not 아니다 or 가니까. Asked of the
 * letters, not the tags: ko-dic reads the 가요 that ends a line as "songs".
 */
const politely = (word: string): boolean =>
  /(?:요|죠|시오)$/u.test(word) || (/니[다까]$/u.test(word) && finalOf(word.slice(0, -2)) === FINAL_LETTER['ㅂ']);

/**
 * A full stop, a question or an exclamation mark among an eojeol's marks —
 * alone, or with the quotation mark ko-dic runs it into. Not the dots of a
 * pause, which come back as one unit inside a line and as three at its end.
 */
const ENDS_SENTENCE = /[?!？！。]|(?:^|[^.])\.(?:[^.]|$)/u;
const endsSentence = (run: KoMorpheme[]): boolean => ENDS_SENTENCE.test(run.map((m) => (isWord(m) ? ' ' : m.surface)).join(''));

/**
 * How the sentence each eojeol stands in ends — at the next mark that ends
 * one, or with the line. Politely by the letters of its last word; plainly
 * where that word closes on a verb's ending without them; and neither where
 * the line breaks off before the sentence is over, which is no evidence of
 * either: on a noun, or with no mark after an ending that joins clauses. 네
 * 오늘은 김치찌개를 만들고 goes on, and may well go on to 볼게요.
 */
function levels(runs: KoMorpheme[][]): Array<Level | undefined> {
  const out: Array<Level | undefined> = [];
  let level: Level | undefined;
  let ended = true;
  // Nothing but the end of the line has ended a sentence yet.
  let unmarked = true;
  for (let i = runs.length - 1; i >= 0; i--) {
    const run = runs[i]!;
    if (endsSentence(run)) {
      ended = true;
      unmarked = false;
    }
    const [last, prev] = run.filter(isWord).reverse();
    if (ended && last) {
      // 따를게 comes back as 따를 + 게, a noun: an ending all the same (CUT_ENDING).
      const verb = /^E[FC]$/.test(closeOf(last)) || rejoined(prev, last) !== undefined;
      const brokeOff = unmarked && Object.hasOwn(GOES_ON, tailOf(last));
      level = politely(written(run)) ? 'polite' : verb && !brokeOff ? 'plain' : undefined;
      ended = false;
      unmarked = false;
    }
    out[i] = level;
  }
  return out;
}

/** What ko-dic calls 네 alone in its eojeol, by where it stands: where a line opens, after a space, after a mark. */
const NE_TAG = /^(IC|XSN|EF|EC)$/;
const NOUN_TAG = /^NN[GPB]$/;

/**
 * 네 alone in its eojeol is three words — "yes", "your" (너 + 의) and "four"
 * — and ko-dic picks by what stands before it: "yes" where the line opens
 * (89 lines), a suffix after a space (76), an ending after a mark. That is
 * where it stands, not which it is. 75 of the 89 are "your": 네 잘못이
 * 아니야. And a "yes" after a dash or 아 comes back as the suffix — - 네
 * 알겠습니다, 아 네 감사합니다 — which Tatoeba has none of, since it writes
 * a comma after "yes", and a subtitle often has none. What does tell them
 * apart:
 *
 * - A counter after it: 네 명 is "four".
 * - How the sentence is said. "Yes" is polite and "your" is not, so where a
 *   sentence ends politely it is "yes" at the head of a clause (네 오늘은 …
 *   볼게요) and "four" inside one: 네 계절이 있어요, 네 곡은 … 입니다 (4).
 * - Otherwise, where it stands. Inside a clause it is "your": 그건 네
 *   책임이야 (62). At the head of one it is "your" before a noun, in a
 *   sentence that ends on a verb said plainly (72, every one of them) — and
 *   "yes" before anything else, or where the line breaks off and shows no
 *   verb. Called "yes" it is still looked up as 네, which has all three
 *   meanings; called "your" where it is not, it is the wrong word.
 */
function yesOrYour(m: KoMorpheme, opens: boolean, marked: boolean, around: Around): string | undefined {
  if (!NE_TAG.test(m.tag ?? '')) return undefined;
  const [next, second] = marked ? [] : around.after ?? [];
  if (counts(next)) return '네/MM';
  // The 거야 that ko-dic reads as ㄹ + 거 + 이 + 야 is a noun: 네 거야. And 감사 + 합니다 is a verb.
  const noun = next !== undefined
    && NOUN_TAG.test((unprefixed(next).tag ?? '').split('+')[0] ?? '')
    && !DERIVING.has((second?.tag ?? '').split('+')[0] ?? '');
  const yes = m.tag === 'IC' ? undefined : '네/IC';
  const your = '네/NP+JKG=너/NP+의/JKG';

  // A clause opens after an interjection or another 네 as well: 아 네 네.
  const head = opens || (around.before ?? []).filter(isWord).every((b) => b.tag === 'IC' || b.surface === '네');
  if (head) return noun && around.said === 'plain' ? your : yes;
  // Inside a clause it is only the suffix that is 네 misread.
  if (m.tag !== 'XSN') return undefined;
  if (around.said !== 'polite') return your;
  return noun ? '네/MM' : yes;
}

/**
 * Nouns that stand only after a modifier, where ko-dic reads something else:
 * the 줄 of 할 줄 알아요 as 주다 (77 of the 100 times 줄 opens an eojeol), 듯
 * as an ending, 만큼 and 대로 as particles. After a modifier comes a noun.
 * (적 and 지 are in OPENING: they are misread whatever comes before.)
 */
const AFTER_A_MODIFIER = new Set(['줄', '듯', '리', '뿐', '만큼', '대로']);
/**
 * And the same nouns run together with their particle into another noun:
 * the 수도 of 할 수도 있다 as "capital" (21), the 지도 of 할 지도 모른다 as
 * "map" (8), 리가 (4), 적도 "equator" (3), and 수가 where the line has no
 * mark (7). Each with the modifier it follows — 아름다운 수도 is a capital.
 */
const RUN_TOGETHER: Record<string, string> = { 수: 'ㄹ', 지: 'ㄹ', 리: 'ㄹ', 줄: 'ㄹ', 적: 'ㄴ' };
const ITS_PARTICLE: Record<string, string> = { 도: 'JX', 는: 'JX', 만: 'JX', 가: 'JKS' };

/** The last ending of a unit as the tables spell it: ㄹ for 할, 어서 for 와서. */
const tailOf = (m: KoMorpheme): string => keyed(piecesOf(m.expression).at(-1)?.form ?? m.surface);

/** The modifier ending a unit closes on — ㄹ for 할 — or nothing where it closes on none. */
function modifierOf(m: KoMorpheme | undefined): string {
  return m && closeOf(m) === 'ETM' ? tailOf(m) : '';
}

function leant(m: KoMorpheme, before: KoMorpheme | undefined): string | undefined {
  const modifier = modifierOf(before);
  if (!modifier) return undefined;
  if (AFTER_A_MODIFIER.has(m.surface) && !NOMINAL_TAG.test(m.tag ?? '')) return `${m.surface}/NNB`;
  const [noun = '', particle = ''] = [...m.surface];
  const tag = ITS_PARTICLE[particle];
  return m.tag === 'NNG' && m.surface.length === 2 && tag && RUN_TOGETHER[noun] === modifier ? `${noun}/NNB ${particle}/${tag}` : undefined;
}

/**
 * 나쁜 짓을 했다, 삶을 살았다: a noun and its particle, which ko-dic reads as
 * a verb and its modifier ending wherever the noun is a verb's stem too —
 * 짓다, 삶다. A modifier stands before a noun; with a verb after it, it was
 * a noun itself. 13 lines. Not before a helper (죽을 뻔했다) or another
 * modifier (먹을 남은 것).
 */
function particled(words: KoMorpheme[], next: KoMorpheme[] | undefined): string | undefined {
  const [stem, ending] = words;
  if (words.length !== 2 || !stem || !ending || stem.tag !== 'VV' || ending.tag !== 'ETM' || !next?.length) return undefined;
  const particle = ending.surface === '을' ? 'JKO' : ending.surface === '은' ? 'JX' : undefined;
  if (!particle || !/^(VV|XSV)/.test(next[0]!.tag ?? '') || closeOf(next.at(-1)) === 'ETM') return undefined;
  return `${stem.surface}/NNG ${ending.surface}/${particle}`;
}

/**
 * 가지 않아요, 가지 마: 가다 with the 지 a negative takes, which ko-dic reads
 * as 가지 "kind" or 가지다 "have" — 23 of the 41 times it opens an eojeol.
 * So with any noun in 지 before 않다 or 못하다, which no noun stands before
 * bare: 지지 않아 is 지다, not 지지 "support". 말다 does follow a noun — 아버지
 * 말고 is "not father" — so before it only 가지 is read again.
 */
function negated(m: KoMorpheme, next: KoMorpheme | undefined): string | undefined {
  if (m.expression || !m.surface.endsWith('지') || m.surface.length < 2 || !/^(NN|VX$|VV$)/.test(m.tag ?? '')) return undefined;
  if (!next || !/^(VX|VV)/.test(next.tag ?? '')) return undefined;
  const helper = leadOf(next);
  if (helper !== '않' && helper !== '못하' && !(helper === '말' && m.surface === '가지')) return undefined;
  return `${m.surface.slice(0, -1)}/VV 지/EC`;
}

/** What the eojeol either side says of the unit that opens this one. */
function byNeighbours(run: KoMorpheme[], i: number, end: number, opens: boolean, around: Around): Fix | undefined {
  const m = run[i]!;
  const alone = i + 1 === end;
  if (alone && m.surface === '네') {
    const which = yesOrYour(m, opens, end < run.length, around);
    return which ? [which, 1] : undefined;
  }
  const one = numeral(m, alone, around) ?? leant(m, around.before?.at(-1)) ?? (alone ? negated(m, around.after?.[0]) : undefined);
  if (one) return [one, 1];
  const two = particled(run.slice(i, end), around.after);
  return two ? [two, 2] : undefined;
}

/**
 * Endings ko-dic cuts in two where a sentence ends, the second half read as
 * a noun: 볼게 as 볼 + 게 (것이, 14 / 38 lines), 있으신가요 as 있으신 + 가요
 * (songs, 9 / 20), 외로운데 as 외로운 + 데 (a place, 4 / 3), 불러서요 as 불러
 * + 서요. Each with what the unit before it must close on to be the first
 * half: a modifier's ㄹ or ㄴ, or the connective 어.
 */
const CUT_ENDING: Record<string, [tag: string, form: string]> = {
  '게/NNB+JKS': ['ETM', 'ㄹ'], '게요/NNB+VCP+EC': ['ETM', 'ㄹ'], '가요/NNG': ['ETM', 'ㄴ'], '데/NNB': ['ETM', 'ㄴ'],
  '서요/NNG': ['EC', '어'], '야지/NNG': ['EC', '어'], '도요/NNG': ['EC', '어'], '죠/NNP': ['EC', '어야'],
};

/** `prev` and `m` as the one ending they are, if `prev` closes on its first half. */
function rejoined(prev: Reread | undefined, m: KoMorpheme): Reread | undefined {
  const half = CUT_ENDING[keyOf(m)];
  if (!prev || !half) return undefined;
  const pieces = piecesOf(prev.expression);
  const last = pieces.at(-1) ?? { form: prev.surface, tag: prev.tag ?? '' };
  if (last.tag !== half[0] || keyed(last.form) !== half[1]) return undefined;
  const ending = `${pieces.length ? last.form : prev.surface}${m.surface}/EF`;
  return {
    ...prev,
    surface: prev.surface + m.surface,
    tag: [...(prev.tag ?? '').split('+').slice(0, -1), 'EF'].join('+'),
    ...(pieces.length ? { type: 'Inflect', expression: [...pieces.slice(0, -1).map((p) => `${p.form}/${p.tag}`), ending].join('+') } : {}),
  };
}

/**
 * Verbs in 르 double the ㄹ before 아 and 어: 모르다 is 몰라, 부르다 불러.
 * ko-dic has the common forms whole — 몰라요, 몰라서, 몰랐 — and cuts the rest
 * at a stem in ㄹ it knows: 몰라서요 comes back as 몰 + 라서요, 몰다 "to drive"
 * with an ending no verb takes; 잘라야지 as 잘 + 라야지. A stem that really
 * ends in ㄹ keeps one ㄹ there — 몰아서요 — so two are the 르 verb's, and
 * the stem ko-dic read stays as the second thing to look up. What a stem in
 * ㄹ does take is left alone: 놀러 가요, 하지 말라고.
 *
 * Tatoeba hardly has these (빨라요 twice, on the lines without a mark):
 * they are the 서요, 야지 and 도요 that end a spoken sentence, and subtitles
 * are full of them. Of 13 common 르 verbs with 24 endings each, said four
 * ways, 9.9% of the forms were looked up as another word, and 2.9% still
 * are — 길러요 and 발라요, which ko-dic takes for names.
 */
const DOUBLED = /^(?:[라러](?=[서요도야라])|[랐렀])/u;
const UNDOUBLED: Record<string, string> = { 라: '아', 러: '어', 랐: '았', 렀: '었' };
/**
 * The ㄹ forms of the 르 verbs worth knowing by name. ko-dic may take one for
 * a noun or an adverb, before a copula that could not stand there: 달 + 라서요
 * is 달라서요, not "as it is the moon", which is 달이라서요. And only these are
 * read into 러요, which on any other stem is "in order to": 만들러요.
 */
const RIEUL_FORM = new Set([
  '몰', '빨', '달', '불', '골', '잘', '흘', '길', '눌', '올', '말', '발', '일', '굴', '찔', '질', '둘', '날', '갈',
  '서둘', '게을', '서툴', '머물',
]);
/** Those that are adjectives: 다르다, 빠르다, 게으르다, 서투르다. */
const RIEUL_ADJECTIVE = new Set(['달', '빨', '게을', '서툴']);
/**
 * Two verbs double the ㄹ another way: 놀라다 has the 라 in its stem, and
 * 들르다 loses only its 으 — 놀라요, 들러요. Each with the vowel that shows
 * it: 놀러요 is still 놀다, "to play".
 */
const DOUBLED_OTHERWISE: Record<string, [vowel: string, stem: string]> = { 놀: ['아', '놀라'], 들: ['어', '들르'] };

/** `a` and `b` as the verb form they are together, or undefined. */
function doubled(a: KoMorpheme, b: KoMorpheme | undefined): Reread | undefined {
  if (!b || a.expression || finalOf(a.surface) !== 8 || !DOUBLED.test(b.surface)) return undefined;
  const verb = /^V[VA]$/.test(a.tag ?? '');
  const otherwise = DOUBLED_OTHERWISE[a.surface];
  const vowel = UNDOUBLED[b.surface[0]!]!;
  if (otherwise) {
    if ((vowel === '아' || vowel === '았') !== (otherwise[0] === '아')) return undefined;
  } else if (!RIEUL_FORM.has(a.surface) && (!verb || b.surface.startsWith('러요'))) {
    return undefined;
  }
  // 랐 and 렀 are the past, with more to come; anything else is the ending, whatever ko-dic called it.
  const ending = /^[랐렀]/u.test(b.surface) ? 'EP' : closeOf(b) === 'EF' ? 'EF' : 'EC';
  if (ending === 'EP' && b.surface.length > 1) return undefined;
  const tag = RIEUL_ADJECTIVE.has(a.surface) ? 'VA' : verb ? a.tag ?? 'VV' : 'VV';
  return {
    surface: a.surface + b.surface,
    tag: `${tag}+${ending}`,
    type: 'Inflect',
    expression: `${otherwise?.[1] ?? `${withFinal(a.surface, 0)}르`}/${tag}+${vowel}${b.surface.slice(1)}/${ending}`,
    // 몰다 is a verb too, and what ko-dic said.
    ...(verb ? { other: a.surface } : {}),
  };
}

/**
 * Connectives: words in their own right — 하지만 "but", 그래도 "even so" —
 * and headwords in the dictionary, which ko-dic as often takes for the verb
 * they were made from: 하다 with the ending 지만, 그러다 with 어도. Where one
 * is all of an eojeol and opens a clause, it is the word. After anything else
 * it is still the verb: 운동은 잘 하지만 is "does it well, but", and 원한다면
 * 그래도 돼 "you may do so".
 *
 * 그래 is left to ko-dic, which tells the two apart: of 18 on Tatoeba, 9 are
 * "yes", and come back as that, and 9 are the verb — 왜 그래?, 나도 그래.
 */
const CONNECTIVE = new Set([
  '하지만', '그렇지만', '그러나', '그런데', '근데', '그래도',
  '그래서', '그러니까', '그러므로', '그러면', '그럼', '그리고', '왜냐하면',
  '어쨌든', '아무튼',
]);

/** The eojeol as the connective it is — with the 요 of 하지만요 a particle after it — or undefined. */
function connective(words: KoMorpheme[], opens: boolean): KoMorpheme[] | undefined {
  const text = words.map((m) => m.surface).join('');
  const polite = text.endsWith('요') && CONNECTIVE.has(text.slice(0, -1));
  if (!opens || !(polite || CONNECTIVE.has(text))) return undefined;
  const word = polite ? text.slice(0, -1) : text;
  return [{ surface: word, tag: 'MAJ' }, ...(polite ? [{ surface: '요', tag: 'JX' }] : [])];
}

/** The row of a table that reads the units at `i`, the longest first. */
function tabled(table: Record<string, string>, run: KoMorpheme[], i: number, end: number): Fix | undefined {
  for (const n of [3, 2, 1]) {
    if (i + n > run.length) continue;
    const key = run.slice(i, i + n).map(keyOf).join(' ');
    const fix = (i + n === end ? table[`${key} $`] : undefined) ?? table[key];
    if (fix) return [fix, n];
  }
  return undefined;
}

/**
 * 할 거야 at the end of a line comes back with 거야 as ㄹ + 거 + 이 + 야: a unit
 * that opens an eojeol with an ending nothing wrote (213 lines without the
 * mark). What is left without it is what was written.
 */
function unprefixed(m: KoMorpheme): KoMorpheme {
  const parts = (m.expression ?? '').split('+');
  let k = 0;
  while (k < parts.length - 1 && isEnding(parts[k]!.split('/')[1] ?? '')) k++;
  return k ? { ...m, tag: (m.tag ?? '').split('+').slice(k).join('+'), expression: parts.slice(k).join('+') } : m;
}

/**
 * What is left of 거야 is 거 + 이 + 야 in one unit, where with a full stop
 * ko-dic gives two: 거, and 야 the copula. Two here as well, so that a line
 * reads the same with its mark and without (the same 213). A unit is cut only
 * like this, between a noun and a copula written in syllables of their own:
 * 겁니다 and 건데 have the copula inside the noun's syllable, and stay whole.
 */
function apart(m: KoMorpheme): KoMorpheme[] {
  const parts = (m.expression ?? '').split('+');
  const tags = (m.tag ?? '').split('+');
  const at = parts.findIndex((p) => p.split('/')[1] === 'VCP');
  const noun = parts.slice(0, at).map((p) => p.split('/')[0]).join('');
  const nounFirst = at > 0 && tags.length === parts.length && tags[0]!.startsWith('N');
  if (!nounFirst || !noun || !m.surface.startsWith(noun) || m.surface.length === noun.length) return [m];
  return [
    { surface: noun, tag: tags.slice(0, at).join('+'), ...(at > 1 ? { type: m.type, expression: parts.slice(0, at).join('+') } : {}) },
    { surface: m.surface.slice(noun.length), tag: tags.slice(at).join('+'), type: m.type, expression: parts.slice(at).join('+') },
  ];
}

/** Nothing but endings, particles or the copula: what leans on a word before it. */
const leans = (m: KoMorpheme): boolean => (m.tag ?? '').split('+').every((t) => isEnding(t) || isParticle(t) || t === 'VCP');
/** A mark that closes what was quoted or bracketed, which a particle may follow: "무슨 일 있니?" 라고 물었다. */
const CLOSING_MARK = /["'”’」』)\]]$/u;

/** The eojeol with its misread units read again. */
function reread(run: KoMorpheme[], around: Around): Reread[] {
  // Where the words begin and end: what comes before and after is marks.
  let end = run.length;
  while (end > 0 && isSymbol(run[end - 1]!.tag ?? '')) end--;
  let start = 0;
  while (start < end && isSymbol(run[start]!.tag ?? '')) start++;

  // A clause opens with the line, or after a mark.
  const last = around.before?.at(-1);
  const opens = start > 0 || !last || isSymbol(last.tag ?? '');
  const word = connective(run.slice(start, end), opens);
  if (word) return [...run.slice(0, start), ...word, ...run.slice(end)];

  /*
   * And there, one unit alone in its eojeol has nothing to lean on. ko-dic
   * calls it an ending, a particle or the copula all the same, once a mark
   * stands before it and not the start of the line: after a dash 야! is the
   * copula, 와, is "and", and the 아 of 아 진짜 and the 어서 of 어서 와 are
   * endings (37 of Tatoeba's lines, each put after a dash; 4 as they are).
   * It is a word ko-dic did not know there, and a word as written is what
   * that is. Not after a quotation, which a particle does follow. And not
   * with more in its eojeol — the 고 of 고속도로, the 야 of a name 야니 —
   * where ko-dic has cut a word it did not know, and nothing here mends it.
   */
  const nothingBefore = start > 0
    || (around.before !== undefined && (!last || (isSymbol(last.tag ?? '') && !CLOSING_MARK.test(last.surface))));
  const stranded = nothingBefore && start + 1 === end;

  const out: Reread[] = [];
  let opening = true;

  for (let i = 0; i < run.length;) {
    const m = run[i]!;
    const prev = out.at(-1);
    // The eojeol's last word, where a sentence ends: at the end of the line, or before a mark.
    const closes = i + 1 === end && (around.closing || end < run.length);

    const whole = closes ? rejoined(prev, m) : undefined;
    if (whole) {
      out[out.length - 1] = whole;
      i++;
      continue;
    }
    const verb = doubled(m, run[i + 1]);
    if (verb) {
      out.push(verb);
      opening = false;
      i += 2;
      continue;
    }

    let fix = opening ? byNeighbours(run, i, end, opens, around) : undefined;
    // 가요 where a sentence ends is "goes", not 가요 "songs": 학교에 가요. 9 / 25.
    if (!fix && closes && keyOf(m) === '가요/NNG') fix = ['가요/VV+EF=가/VV+아요/EF', 1];
    // 누군가 + 가: the particle, read as the helper verb 가다. 17 / 16.
    if (!fix && keyOf(m) === '가/VX' && /^NP\+VCP\+E/.test(prev?.tag ?? '')) fix = ['가/JKS', 1];
    fix ??= tabled(MISREAD, run, i, end) ?? (opening ? tabled(OPENING, run, i, end) : undefined);

    if (fix) out.push(...reading(fix[0]));
    else if (stranded && i === start && leans(m)) out.push({ surface: m.surface, tag: 'UNKNOWN' });
    else out.push(...(opening ? apart(unprefixed(m)) : [m]));
    if (!isSymbol(m.tag ?? '')) opening = false;
    i += fix?.[1] ?? 1;
  }
  return out;
}

/* ── Which units make one word ───────────────────────────────────── */

/** What a noun suffix can follow: 사람 + 들, 우리 + 끼리, 개인 + 적, 이따금 + 씩. Not a figure — 30 + 대 is a number and a word. */
const TAKES_SUFFIX = new Set(['NNG', 'NNP', 'NNB', 'NNBC', 'NP', 'NR', 'XR', 'XSN', 'MAG', 'SL', 'SH', 'UNKNOWN']);
/** What 하다 and its like can make a verb of: 공부 + 하, 깨끗 + 하, 민주 + 화 + 하. */
const TAKES_DERIVING = new Set(['NNG', 'NNP', 'NNB', 'NP', 'XR', 'XSN', 'MAG', 'SL', 'SH', 'UNKNOWN']);
/** What a prefix can stand before: 비 + 공식, 제 + 1. Never a particle. */
const TAKES_PREFIX = new Set(['NNG', 'NNP', 'NNB', 'NNBC', 'NR', 'XR', 'SL', 'SH', 'SN', 'UNKNOWN']);

/** The first piece that is not a prefix: 비공식 is a kind of 공식, not of 비. */
function headAt(pieces: Piece[]): number {
  const at = pieces.findIndex((p) => p.tag !== 'XPN');
  return at < 0 ? 0 : at;
}

/**
 * 좋 + 아 + 하: an adjective made a verb, "to find it good" — and a word of
 * its own, 좋아하다, which is what a learner has a card for. ko-dic takes it
 * apart every time. Not 싶어하다, which is still 싶다: someone else's wanting.
 */
function feelsAt(pieces: Piece[], i: number): boolean {
  const stem = pieces[i - 2];
  const link = pieces[i - 1];
  const verb = pieces[i];
  if (!stem || !link || !verb || verb.form !== '하' || (verb.tag !== 'VX' && verb.tag !== 'VV')) return false;
  if (link.tag !== 'EC' || keyed(link.form) !== '어') return false;
  return stem.tag === 'VA' || stem.tag === 'XSA';
}

/** Does `cur` continue the word this `group` started? */
function attaches(group: Unit[], cur: Unit): boolean {
  const pieces = group.flatMap((u) => u.pieces);
  const head = pieces[headAt(pieces)]!;
  const last = pieces[pieces.length - 1]!;
  const lead = cur.pieces[0]!;

  // 비 + 공식, 제 + 1 — but never a prefix swallowing a particle.
  if (last.tag === 'XPN') return TAKES_PREFIX.has(lead.tag);

  /*
   * Endings follow a stem or another ending: 먹 + 었 + 어요, 이 + 에요. After
   * a noun they follow nothing — 친구 + 야 is a noun and what is left of the
   * copula, two words.
   */
  if (isEnding(lead.tag)) {
    // UNA is what ko-dic calls the 잖 of 거잖아, which it does not take apart.
    return PREDICATE.has(last.tag) || DERIVING.has(last.tag) || last.tag === 'VCP' || last.tag === 'UNA' ||
      last.tag === 'EP' || last.tag === 'EC' || last.tag === 'EF';
  }

  // 먹는데 + 요, 자랑스러워 + 요: the 요 that makes a verb form polite. After a noun it is a particle.
  if (lead.tag === 'JX' && cur.surface === '요') return last.tag === 'EC' || last.tag === 'EF';

  /*
   * Helper verbs written on to the verb: 해 + 보 + 자, 먹 + 고 + 싶 + 어요.
   * Only after a connective — a helper that starts its own eojeol, or follows
   * a noun (물 좀 주세요), is the verb of its own word.
   */
  const verbal = PREDICATE.has(head.tag) || head.tag === 'VCP' || pieces.some((p) => DERIVING.has(p.tag));
  if (lead.tag === 'VX' && verbal && last.tag === 'EC') return true;
  // 좋 + 아 + 하, where ko-dic calls 하 a verb rather than a helper.
  if (lead.tag === 'VV' && feelsAt([...pieces, lead], pieces.length)) return true;

  // 공부 + 하, 깨끗 + 하, 사용 + 되, 자랑 + 스럽.
  if (DERIVING.has(lead.tag)) return TAKES_DERIVING.has(last.tag);

  // 사람 + 들, 선생 + 님, 개인 + 적.
  if (lead.tag === 'XSN') return TAKES_SUFFIX.has(last.tag);

  return false;
}

function groups(units: Unit[]): Unit[][] {
  const out: Unit[][] = [];
  let group: Unit[] = [];
  for (const u of units) {
    if (group.length && attaches(group, u)) {
      group.push(u);
    } else {
      if (group.length) out.push(group);
      group = [u];
    }
  }
  if (group.length) out.push(group);
  return out;
}

/* ── Stems ───────────────────────────────────────────────────────── */

/**
 * Stems ko-dic gives without their ㄹ.
 *
 * A stem in ㄹ drops it before ㄴ, ㅂ and ㅅ: 알다 is 아는, 압니다, 아세요.
 * ko-dic knows 우 is 울 and 버 is 벌, but leaves these as it found them, and
 * 아 + 다 is no verb. Only stems that are nothing without the ㄹ are here.
 * Counted as in MISREAD, on the lines as written.
 */
const DROPPED_RIEUL = new Set([
  '아',     // 39 — 아는 사람, 아시다시피
  '만드',   // 12 — 만드는
  '드',     // 8 — 마음에 드는
  '머무',   // 3 — 머무는
  '노',     // 2 — 노는
]);

/**
 * Stems that are one verb with the ㄹ and another without, where before ㄴ
 * and ㅂ it is far more often the one with: 서울에 사는, 혼자 산다, 저는 혼자
 * 삽니다 are 살다 "live" 50 times of 56 on Tatoeba, and 사다 "buy" 6 times;
 * 차를 파는, 어디서 파는지 are 팔다 "sell" 4 times of 4. ko-dic says 사다 and
 * 파다 every time. The other verb stays as the second thing to look up.
 */
const LIKELIER_RIEUL: Record<string, string> = { 사: '살', 파: '팔' };

/**
 * Stems ko-dic gives as they sound before a vowel, and the verb each is.
 *
 * A ㄷ that becomes ㄹ: 걷다 is 걸어요, 걸으면. ko-dic reads the ㄹ form as a
 * stem of its own, which for 걸, 들, 물 is another verb — 걸다 hang, 들다
 * lift, 물다 bite — and for 깨달, 실, 일컬 is no verb. And a ㅅ that drops:
 * 짓다 is 지어요, 붓다 부었다, where a stem that really ended in the vowel
 * would have run together with the ending (지다 is 져요).
 */
const BEFORE_VOWEL: Record<string, string> = {
  걸: '걷', 들: '듣', 물: '묻', 실: '싣', 깨달: '깨닫', 일컬: '일컫',
  지: '짓', 부: '붓', 그: '긋', 나: '낫', 이: '잇', 저: '젓',
};
/** The ㄹ forms above that are verbs in their own right. */
const ALSO_RIEUL = new Set(['걸', '들', '물']);

interface Stem {
  stem: string;
  /** Another verb the form could be: 걷다 beside 걸다. */
  other?: string;
}

/**
 * The stem a dictionary form is made from, given what comes after it.
 * `spelt` says ko-dic spelt the stem out itself: the 돕 of 도와.
 *
 * 걸었어요 is 걸다 or 걷다 and nothing in the word says which, so it stays
 * ko-dic's 걸다 with 걷다 to look up as well. 걸으면 is 걷다 alone: a stem in
 * ㄹ takes no 으 — 걸다 gives 걸면 — so the 으 is the ㄷ verb's. And with 보다
 * on it, 물어 and 들어 are asking and listening: 물어보다, 들어 봐 — all 39
 * such on Tatoeba, none of them biting or lifting.
 */
function stemOf(head: Piece, next: Piece | undefined, after: Piece | undefined, spelt: boolean): Stem {
  const stem = head.form;
  const likelier = LIKELIER_RIEUL[stem];
  if (likelier && next && isEnding(next.tag) && /^[ㄴㅂ나-닣]/u.test(keyed(next.form))) return { stem: likelier, other: stem };
  if (spelt) return { stem };
  if (DROPPED_RIEUL.has(stem)) return { stem: withFinal(stem, 8) };
  const other = BEFORE_VOWEL[stem];
  if (other && next && isEnding(next.tag) && initialOf(next.form.charCodeAt(0)) === 11) {
    const tried = stem !== '걸' && next.tag === 'EC' && after?.form === '보';
    const certain = !ALSO_RIEUL.has(stem) || tried || /^[으은을음]/u.test(next.form);
    return certain ? { stem: other, other: stem } : { stem, other };
  }
  return { stem };
}

/* ── What the endings do ─────────────────────────────────────────── */

/**
 * An ending in the one spelling the tables are keyed on. Endings change with
 * the stem they join — 아요 or 어요 by its vowel, 으면 or 면 by whether it
 * ends in a consonant, 는데 or ㄴ데 by verb or adjective — and each pair is
 * one ending.
 */
function keyed(form: string): string {
  return form
    .replace(/^으(?=.)/u, '')
    .replace(/^[아여]/u, '어')
    .replace(/^[았였]/u, '었')
    .replace(/^을/u, 'ㄹ')
    .replace(/^은/u, 'ㄴ')
    .replace(/^[습읍]/u, 'ㅂ')
    .replace(/^음/u, 'ㅁ')
    .replace(/^는(?=.)/u, 'ㄴ');
}

/** Endings before the last: tense and respect. */
const PREFINAL: Record<string, string> = {
  었: 'past', 었었: 'past', 시: 'honorific', 겠: 'future or guess',
};

/**
 * Endings that join a clause to what follows, by what they add. A line that
 * stops on one with no mark after it has broken off mid-sentence (levels).
 */
const GOES_ON: Record<string, string | string[]> = {
  고: 'and', 며: 'and', 면: 'conditional', 다면: 'conditional', ㄴ다면: 'conditional', 라면: 'conditional',
  려면: ['intends to', 'conditional'],
  어서: 'because, or and then', 서: 'because, or and then', 니까: 'because', 므로: 'because', 느라: 'because', 느라고: 'because',
  지만: 'but', ㄴ데: 'but, or given that', ㄴ데도: 'even though', 어도: 'even if', 더라도: 'even if', 라도: 'even if',
  어야: 'must', 면서: 'while',
  러: 'in order to', 려고: 'intends to', 려: 'intends to', 고자: 'intends to', 도록: 'so that',
  거나: 'or', 든지: 'or', ㄴ지: 'whether', ㄹ지: 'whether',
  게: 'adverb form',
  // what someone said
  다고: 'quoting', ㄴ다고: 'quoting', 라고: 'quoting', 자고: 'quoting', 냐고: 'quoting',
};

/**
 * What each ending contributes, as GRAMMAR in merge.ts does for Japanese —
 * and by the same name wherever it does the same: 면 is "conditional" as ば
 * is, 어라 "imperative", 려고 "intends to". A polite 요 on the end is named
 * apart (endingLabels), so 는데요 is here as ㄴ데.
 *
 * Left out on purpose: 다, 어 and 지, which close a plain or casual sentence
 * and add nothing a learner needs named, and anything rare enough that a
 * name would be a guess.
 */
const ENDING: Record<string, string | string[]> = {
  // how the sentence is said
  ㅂ니다: 'formal polite', ㅂ니까: ['formal polite', 'question'], ㅂ니다만: ['formal polite', 'but'],
  ㅂ시오: ['formal polite', 'imperative'], ㅂ시다: "let's",
  ㄴ다: 'plain', 어라: 'imperative', 거라: 'imperative', 너라: 'imperative', 어야지: 'must',
  // asking, guessing, offering
  ㄴ가: 'question', 냐: 'question', 느냐: 'question',
  ㄹ까: 'shall we, or I wonder', ㄹ게: 'I will', ㄹ께: 'I will', ㄹ래: 'want to',
  // how the speaker knows
  네: 'just noticed', 구나: 'just noticed', ㄴ구나: 'just noticed', 군: 'just noticed', ㄴ군: 'just noticed',
  잖아: 'as you know', 잖니: 'as you know', 거든: 'because',
  대: 'hearsay', ㄴ대: 'hearsay', 래: 'hearsay',
  ...GOES_ON,
};

/**
 * Endings that mean something else where they close the sentence: 가니 is a
 * question, 가니 좋다 "since"; 가자 is "let's".
 */
const CLOSING: Record<string, string> = { 니: 'question', 나: 'question', 자: "let's" };
const JOINING: Record<string, string> = { 니: 'because', 나: 'but' };

/** Modifiers that say more than "modifier": a time, or a quotation. */
const MODIFIER: Record<string, string> = {
  ㄹ: 'future', 던: 'used to',
  다는: 'quoting', ㄴ다는: 'quoting', 라는: 'quoting', 자는: 'quoting', 냐는: 'quoting', 란: 'quoting', 단: 'quoting',
  려는: 'intends to',
};

/** The particle inside a fused word: 난 is 나 + 는, 그게 is 그것 + 이. */
const PARTICLE: Record<string, string> = { JX: 'topic', JKS: 'subject', JKO: 'object', JKG: 'possessive' };
const TOPIC = new Set(['는', '은', 'ㄴ']);

/**
 * What a helper verb means, by the ending before it. The same verb helps in
 * several ways — 먹고 있다 is ongoing, 앉아 있다 a state — so the name hangs
 * on the pair.
 */
const HELPER: Record<string, Record<string, string | string[]>> = {
  싶: { 고: 'want to' },
  있: { 고: 'ongoing', 어: 'resulting state' },
  계시: { 고: 'ongoing', 어: 'resulting state' },
  않: { 지: 'negative' },
  // 가지 못하다 is "cannot go", as 行けない is: the can-do form, and not.
  못하: { 지: ['potential', 'negative'] },
  // 가지 마: the command is in 말다's own ending.
  말: { 지: 'negative' },
  보: { 어: 'try doing', 나: 'seems', ㄴ가: 'seems' },
  주: { 어: 'do for someone', 어다: 'do for someone' },
  드리: { 어: 'do for someone', 어다: 'do for someone' },
  달: { 어: 'do for someone' },
  버리: { 어: 'completely, or regrettably' },
  놓: { 어: 'in advance' },
  두: { 어: 'in advance' },
  가: { 어: 'going forward' },
  오: { 어: 'coming to be' },
  대: { 어: 'keep on' },
  보이: { 어: 'seems' },
  하: { 어야: 'must', 게: 'causative', 려고: 'intends to', 려: 'intends to' },
  되: { 어야: 'must', 게: 'come to', 어도: 'may' },
  좋: { 어도: 'may' },
  괜찮: { 어도: 'may' },
  듯하: { ㄴ: 'seems', 는: 'seems', ㄹ: 'seems' },
};

/**
 * Helpers that mean the same written apart, as their own word: 먹고 싶어요,
 * 가지 않아요, 올 듯해요. Not 가다 and 오다, which after a space are as often
 * going and coming — 사 가다 is to buy and go.
 */
const APART = new Set(['싶', '있', '계시', '않', '못하', '말', '보', '주', '드리', '달', '버리', '놓', '두', '보이', '하', '되', '좋', '괜찮', '듯하']);

/** The ending a verb form closes on, and the names it was given — for what the next word makes of it. */
interface Tail {
  form: string;
  named: string[];
}

interface Named {
  labels: string[];
  tail?: Tail;
}

const listOf = (v: string | string[] | undefined): string[] => (v === undefined ? [] : typeof v === 'string' ? [v] : v);

/** The names of one closing or joining ending, with the 요 that makes it polite named apart. */
function endingLabels(form: string, closing: boolean): { base: string; labels: string[] } {
  const p = keyed(form);
  // 세요 is 시 + 어요.
  if (p === '세요' || p === '셔요') return { base: '어', labels: ['honorific', 'polite'] };
  if (p === '요') return { base: p, labels: ['polite'] };
  // 죠 is 지 + 요 run together: 가야죠 is 가야지 said politely.
  const polite = p.endsWith('요') || p.endsWith('죠');
  const base = p.endsWith('죠') ? `${p.slice(0, -1)}지` : polite ? p.slice(0, -1) : p;
  // 가나요 only ever asks: with 요 the ending closes a sentence wherever it stands.
  const found = (closing || polite ? CLOSING[base] : JOINING[base]) ?? ENDING[base];
  return { base, labels: [...listOf(found), ...(polite ? ['polite'] : [])] };
}

/** What a helper verb adds after an ending: nothing, where the pair has no name. */
function helped(helper: string, ending: string, head: Piece): string[] {
  // 예뻐지다 becomes pretty; 만들어지다 is made.
  if (helper === '지' && ending === '어') return [head.tag === 'VV' ? 'passive' : 'becomes'];
  return listOf(HELPER[helper]?.[ending]);
}

/** 해 주세요, 해 주십시오: a request, which is more than a favour said with respect. */
const REQUEST = new Set(['honorific polite', 'honorific formal polite imperative']);

function please(labels: string[]): string[] {
  const at = labels.indexOf('do for someone');
  return at >= 0 && REQUEST.has(labels.slice(at + 1).join(' ')) ? [...labels.slice(0, at), 'please'] : labels;
}

/**
 * What the pieces from `from` on do, in order.
 *
 * `closing` says the word ends a sentence. ko-dic tells a final ending (EF)
 * from a connective (EC) by the full stop after it, and a subtitle line often
 * has none — so the last ending of a sentence is read as final whatever its
 * tag. `squeezed` says the word is written with 잖.
 */
function labelsOf(pieces: Piece[], from: number, head: Piece, closing: boolean, squeezed: boolean): Named {
  const out: string[] = [];
  const push = (labels: string[]): string[] => {
    const added = labels.filter((l) => !out.includes(l));
    out.push(...added);
    return added;
  };
  const lastEnding = pieces.reduce((at, p, i) => (isEnding(p.tag) ? i : at), -1);
  let tail: Tail | undefined;

  for (let i = from; i < pieces.length; i++) {
    const p = pieces[i]!;
    const prev = pieces[i - 1];
    if (p.tag === 'EP') {
      push(listOf(PREFINAL[keyed(p.form)]));
      tail = undefined;
    } else if (p.tag === 'ETM') {
      const form = keyed(p.form);
      /*
       * 간 사람 is who went, 예쁜 꽃 just a pretty flower: ㄴ is the past on a
       * verb alone. Not on a 하다 word, where ko-dic's verb or adjective is
       * a guess — it calls 투명한 "transparent" a verb, and 말한 "said" an adjective.
       */
      const time = form === 'ㄴ' ? (head.tag === 'VV' && prev?.tag !== 'VX' ? 'past' : undefined) : MODIFIER[form];
      tail = { form, named: push([...listOf(time), 'modifier']) };
    } else if (p.tag === 'ETN') {
      tail = { form: keyed(p.form), named: push(['noun form']) };
    } else if (p.tag === 'EC' || p.tag === 'EF') {
      const last = closing && i === lastEnding;
      const { base, labels } = endingLabels(p.form, p.tag === 'EF' || last);
      /*
       * 가야 해 is 가 + 아야 run together, and 가야지 가 + 아야지. Not a 야
       * that ends a sentence, nor the one on 이야 and 아니야, which is their own.
       */
      const stem = Boolean(prev) && (prev!.tag === 'VV' || prev!.tag === 'VA' || prev!.tag === 'VX' || DERIVING.has(prev!.tag));
      const must = stem && (base === '야지' || (base === '야' && !last));
      tail = { form: must ? '어야' : base, named: push(must ? ['must', ...labels] : labels) };
    } else if (feelsAt(pieces, i)) {
      tail = undefined;   // part of the word: 좋아하다
    } else if (p.tag === 'VX') {
      // 했잖아 is 하 + 았 + 지 + 않 + 아 to ko-dic: "you know", not a negative.
      const labels = squeezed && p.form === '않' ? ['as you know'] : tail ? helped(p.form, tail.form, head) : [];
      // The helper names the pair, in place of what the ending said alone: 먹고 싶다 is not "and".
      if (labels.length && tail) for (const l of tail.named) if (out.includes(l)) out.splice(out.lastIndexOf(l), 1);
      push(labels);
      tail = undefined;
    } else if (p.tag === 'UNA' && p.form === '잖') {
      push(['as you know']);
    } else if (p.tag === 'JX' && p.form === '요') {
      push(['polite']);
    } else if (PARTICLE[p.tag] && (p.tag !== 'JX' || TOPIC.has(p.form))) {
      push([PARTICLE[p.tag]!]);
    } else if (!isParticle(p.tag)) {
      tail = undefined;
    }
  }
  return { labels: please(out), tail };
}

/* ── Words ───────────────────────────────────────────────────────── */

/**
 * Suffixes that leave the word what it was: 학생들 is 학생, 우리끼리 is 우리,
 * 런던행 "for London" is 런던. The rest make a new word — 개인적 is not 개인,
 * nor 선생님 선생 — and stay in the dictionary form.
 */
const LOOSE_SUFFIX = new Set(['들', '네', '이', '끼리', '씩', '쯤', '째', '별', '당', '행', '용', '짜리']);

/** Suffixes whose verb is, failing its own entry, the 하다 verb of the noun: 사용되다 under 사용하다. */
const OF_HADA = new Set(['되', '시키', '당하', '받']);

/** Spellings that are the same word to a learner: the 거 of 할 거야 is 것, and 재밌어 is 재미있다. */
const SAME_WORD: Record<string, string> = { 거: '것', 꺼: '것', 재밌: '재미있' };

/** Short forms the dictionary has only under the long one. */
const ALSO: Record<string, string> = { 뭐: '무엇', 아뇨: '아니요', 그치: '그렇지', 어딨다: '어디' };

/** Tags of words worth knowing. Particles, the copula, endings, figures and marks are not. */
function isContent(tag: string): boolean {
  return !(isParticle(tag) || isEnding(tag) || isSymbol(tag) || tag === 'VCP' || tag === 'SN');
}

function lookupKeys(pos: string, ...keys: Array<string | undefined>): LookupKey[] {
  const out: LookupKey[] = [];
  for (const key of keys) {
    if (!key || out.some((k) => k.key === key)) continue;
    out.push({ key, pos });
  }
  return out;
}

/** A merged word, with what the words around it need to know of it. */
interface Word {
  token: MergedToken;
  tail?: Tail;
  /** A copula is part of it: 이에요, 겁니다, 뭔가요. */
  copula: boolean;
  /** The other verb it could be, where nothing in the word says which: 묻다 for 물어. */
  other?: string;
}

/** The parts of a compound to look up when the whole is unknown: the longest first, and of two the later, which is its head. */
function insideOf(group: Unit[]): string[] {
  const inside = group.flatMap((u) => u.inside ?? []);
  return inside.map((form, i) => ({ form, i })).sort((a, b) => b.form.length - a.form.length || b.i - a.i).map((x) => x.form);
}

/** The text before the 하 of a 좋아하다 word: 좋아, 무서워, 궁금해. */
function beforeFeeling(group: Unit[], pieceAt: number): string {
  let seen = 0;
  let text = '';
  for (const u of group) {
    if (pieceAt >= seen + u.pieces.length) {
      text += u.surface;
      seen += u.pieces.length;
      continue;
    }
    // Fused with what comes before it — 무서워한다 — the 하 is the last syllable that starts with ㅎ.
    if (pieceAt > seen) {
      const chars = [...u.surface];
      let cut = chars.length;
      for (let i = chars.length - 1; i > 0; i--) {
        if (initialOf(chars[i]!.charCodeAt(0)) === 18) {
          cut = i;
          break;
        }
      }
      text += chars.slice(0, cut).join('');
    }
    break;
  }
  return text;
}

function build(group: Unit[], closing: boolean): Word {
  const surface = group.map((u) => u.surface).join('');
  const pieces = group.flatMap((u) => u.pieces);
  const at = headAt(pieces);
  const head = pieces[at]!;
  const pos = head.tag;
  const parts = pieces.map((p) => p.form);
  const copula = pieces.some((p) => p.tag === 'VCP');

  if (isSymbol(pos)) {
    return { token: { surface, pos, parts: [surface], inflections: [], content: false, lookup: [] }, copula: false };
  }

  // An ending with nothing to end, or a particle: grammar, shown and never counted.
  if (isEnding(pos) || isParticle(pos)) {
    const named = labelsOf(pieces, isEnding(pos) ? at : at + 1, head, closing, false);
    return {
      token: { surface, lemma: surface, pos, parts, inflections: named.labels, content: false, lookup: lookupKeys(pos, surface, head.form) },
      tail: isEnding(pos) ? named.tail : undefined,
      copula,
    };
  }

  const squeezed = /잖/u.test(surface) && pieces.some((p) => p.form === '않' && p.tag === 'VX');
  const named = labelsOf(pieces, at + 1, head, closing, squeezed);
  const common = { surface, pos, parts, inflections: named.labels, content: isContent(pos) };
  const tail = named.tail;

  // 이에요, 입니다, 예요: the copula and its endings.
  if (pos === 'VCP') {
    return { token: { ...common, lemma: '이다', lookup: lookupKeys(pos, '이다') }, tail, copula };
  }

  // A verb or adjective: stem + 다.
  if (PREDICATE.has(pos) || DERIVING.has(pos)) {
    const first = group[0]!;
    const spelt = first.pieces.length > 1 || first.pieces[0]!.form !== first.surface;
    const { stem, other = first.other } = stemOf(head, pieces[at + 1], pieces[at + 2], spelt);
    const lemma = `${SAME_WORD[stem] ?? stem}다`;
    const feeling = pieces.findIndex((_, i) => i > at && feelsAt(pieces, i));
    const felt = feeling >= 0 ? `${beforeFeeling(group, feeling)}하다` : undefined;
    return {
      token: { ...common, lemma: felt ?? lemma, lookup: lookupKeys(pos, felt, lemma, other ? `${other}다` : undefined, ALSO[lemma], surface) },
      tail,
      copula,
      // 물어 and 들어 with 보다 after a space: only the line shows it (constructions).
      other: other && ALSO_RIEUL.has(stem) && stem !== '걸' ? `${other}다` : undefined,
    };
  }

  // A noun, and what is joined to it.
  let end = at + 1;
  while (pieces[end]?.tag === 'XSN') end++;
  const prefix = parts.slice(0, at).join('');
  const core = pos === 'NNB' ? SAME_WORD[head.form] ?? head.form : head.form;
  const deriving = pieces[end] && DERIVING.has(pieces[end]!.tag) ? pieces[end]! : undefined;
  const suffixed = core + parts.slice(at + 1, end).join('');
  const whole = prefix + suffixed;
  const inside = insideOf(group);

  // 공부하고 is 공부하다; the dictionary may file it under the noun, so that is the next key.
  if (deriving) {
    const lemma = `${whole}${deriving.form}다`;
    const feeling = pieces.findIndex((_, i) => i > end && feelsAt(pieces, i));
    const felt = feeling >= 0 ? `${beforeFeeling(group, feeling)}하다` : undefined;
    return {
      token: {
        ...common,
        lemma: felt ?? lemma,
        lookup: lookupKeys(pos, felt, lemma, OF_HADA.has(deriving.form) ? `${whole}하다` : undefined, whole, suffixed, core, ...inside),
      },
      tail,
      copula,
    };
  }

  /*
   * 누군가, 뭔가, 어딘가: "someone", "something", "somewhere" — a word, which
   * ko-dic reads as the question 누구 + 이 + ㄴ가, "who is it?".
   */
  const rest = pieces.slice(end);
  if (pos === 'NP' && rest[0]?.tag === 'VCP' && rest[1] && keyed(rest[1].form) === 'ㄴ가' && rest.slice(2).every((p) => isParticle(p.tag))) {
    // 언젠간 is 언젠가 with the ㄴ of 는 on it.
    const some = rest.length === 2 ? surface : rest.length === 3 && finalOf(surface) > 0 ? withFinal(surface, 0) : undefined;
    if (some) {
      const particles = labelsOf(pieces, end + 2, head, closing, false).labels;
      return { token: { ...common, inflections: particles, lemma: some, lookup: lookupKeys(pos, some, core, ALSO[core]) }, copula: false };
    }
  }

  let kept = end;
  while (kept > at + 1 && LOOSE_SUFFIX.has(pieces[kept - 1]!.form)) kept--;
  const word = prefix + core + parts.slice(at + 1, kept).join('');
  return {
    token: { ...common, lemma: word, lookup: lookupKeys(pos, word, whole, suffixed, core, ALSO[core], surface, ...inside) },
    tail,
    copula,
  };
}

/** Marks that leave a sentence going: a comma, not a full stop or the quotation mark after one. */
const PAUSE = /^[,，、·:;]/u;

function wordsOf(run: KoMorpheme[], around: Around): Word[] {
  const all = groups(reread(run, around).map(unitOf));
  const markAt = (i: number): string | undefined => {
    const first = all[i]?.[0];
    return first && isSymbol(first.pieces[0]!.tag) ? first.surface : undefined;
  };
  // A word closes a sentence before a mark that ends one, or where the line ends.
  return all.map((group, i) => {
    const mark = markAt(i + 1);
    return build(group, mark !== undefined ? !PAUSE.test(mark) : around.closing && i === all.length - 1);
  });
}

/** The words in one stretch written without a space (an eojeol). */
export function mergeKorean(run: KoMorpheme[]): MergedToken[] {
  return wordsOf(run, { closing: false }).map((w) => w.token);
}

/* ── The line ────────────────────────────────────────────────────── */

/** Nouns a verb form leans on to say what neither says alone: 갈 + 때 is "when", 가기 + 때문 "because". */
const LEANS_ON: Record<string, Record<string, string>> = {
  ㄹ: { 때: 'when' },
  는: { 중: 'ongoing', 동안: 'while' },
  기: { 때문: 'because' },
};

const stemOfLemma = (w: Word | undefined): string => (w?.token.lemma?.endsWith('다') ? w.token.lemma.slice(0, -1) : '');
const isGrammar = (w: Word | undefined): boolean => Boolean(w && (isParticle(w.token.pos ?? '') || w.token.pos === 'VCP'));

/** 있다 after 할 수 or 본 적 says it is so, and 없다 that it is not. */
const IS_SO: Record<string, string[]> = { 있: [], 없: ['negative'] };

/** What the words after `words[i]` make of the ending it closes on: nothing, where they make nothing of it. */
function across(words: Word[], i: number, tail: string): string[] {
  const next = words[i + 1];
  if (!next) return [];
  const lemma = next.token.lemma ?? '';
  // 할 수가 있다, 본 적이 없다: a particle may stand between the noun and the verb.
  const so = IS_SO[stemOfLemma(isGrammar(words[i + 2]) ? words[i + 3] : words[i + 2])];

  const leant = LEANS_ON[tail]?.[lemma];
  if (leant) return [leant];
  // 할 수 있다 is "can do", as 待てる is, and 할 수 없다 the same and not.
  if (tail === 'ㄹ' && lemma === '수') return so ? ['potential', ...so] : [];
  if (tail === 'ㄴ' && lemma === '적') return so ? ['have done before', ...so] : [];
  if (lemma === '것' && (tail === 'ㄹ' || tail === 'ㄴ' || tail === '는')) {
    // 할 것 같다 seems so; 할 거예요, 할 겁니다 is the future.
    if (stemOfLemma(words[i + 2]) === '같') return ['seems'];
    return tail === 'ㄹ' && (next.copula || words[i + 2]?.token.pos === 'VCP') ? ['future or guess'] : [];
  }
  if (tail === '기' && lemma === '위하다') return ['in order to'];
  // 하면 안 돼요.
  if (tail === '면' && ((lemma === '안' && stemOfLemma(words[i + 2]) === '되') || lemma === '안되다')) return ['must not'];

  // 가지는 않아요, 가지도 못해요: the negative across a particle.
  const helper = tail === '지' && isParticle(next.token.pos ?? '') ? words[i + 2] : next;
  const stem = stemOfLemma(helper);
  if (!helper || !APART.has(stem)) return [];
  const labels = listOf(HELPER[stem]?.[tail]);
  if (labels[0] === 'do for someone' && REQUEST.has(helper.token.inflections.join(' '))) return ['please'];
  // 가지 않아도 돼요: the 않아도 that may is a need not.
  if (labels[0] === 'may' && words[i]!.token.lemma === '않다') return ["don't have to"];
  return labels;
}

/**
 * Forms said in more than one word: 먹고 + 싶어요 is "want to", 할 + 수 + 있다
 * "can". The words stay apart — 싶다 and 수 are words of their own — and the
 * verb carries the name of what they make together, in place of what its
 * ending would say alone ("and"), as merge.ts does for 待たなければ + ならない.
 */
function constructions(words: Word[]): Word[] {
  for (const [i, w] of words.entries()) {
    const tail = w.tail;
    if (!tail) continue;
    const labels = across(words, i, tail.form);
    if (!labels.length) continue;
    w.token.inflections = [...w.token.inflections.filter((l) => !tail.named.includes(l) && !labels.includes(l)), ...labels];
    // 물어 봐, 들어 봐: asking and listening, as when written together (stemOf).
    if (labels[0] === 'try doing' && w.other) {
      const lookup = w.token.lookup;
      w.token.lookup = [...lookup.filter((k) => k.key === w.other), ...lookup.filter((k) => k.key !== w.other)];
      w.token.lemma = w.other;
    }
  }
  return words;
}

/**
 * Every label these rules can give an ending: the tables', and the ones
 * written out in the functions above. The interface names each in the
 * learner's language (src/i18n/en/grammar.ts), as it does GRAMMAR_LABELS in
 * merge.ts — and many are the same labels, since a past is a past. A label
 * written out in a function has to be listed here too, or it shows in
 * English in every language.
 */
export const KO_GRAMMAR_LABELS: readonly string[] = [...new Set([
  ...Object.values(PREFINAL),
  ...Object.values(ENDING).flat(),
  ...Object.values(CLOSING),
  ...Object.values(JOINING),
  ...Object.values(MODIFIER),
  ...Object.values(PARTICLE),
  ...Object.values(HELPER).flatMap((byEnding) => Object.values(byEnding).flat()),
  ...Object.values(LEANS_ON).flatMap((byNoun) => Object.values(byNoun)),
  // endingLabels
  'honorific', 'polite',
  // labelsOf
  'past', 'modifier', 'noun form', 'must', 'as you know',
  // helped, please
  'passive', 'becomes', 'please',
  // across
  'potential', 'negative', 'have done before', 'seems', 'future or guess', 'in order to', 'must not', "don't have to",
])];

/**
 * A whole line: runsOf() + mergeKorean() + place() with gaps kept, punctuation
 * marked — and what only the line can say: where a sentence ends and how it
 * is said, what stands in the eojeol either side, and the forms said in more
 * than one word.
 */
export function koTokens(text: string, morphemes: KoMorpheme[]): Token[] {
  const runs = runsOf(text, morphemes);
  const said = levels(runs);
  const words = runs.flatMap((run, i) =>
    wordsOf(run, { before: runs[i - 1] ?? [], after: runs[i + 1], closing: i === runs.length - 1, said: said[i] }));
  return place(text, constructions(words).map((w) => w.token), { gaps: true, isPunct: (t) => isSymbol(t.pos ?? '') });
}

/* ── The cue ─────────────────────────────────────────────────────── */

/** What one speaker says in a cue, for the analyser to read on its own. */
export interface KoStretch {
  /** Where it starts in the cue. */
  start: number;
  /** It, as the cue has it: from its first letter or figure to the mark that ends it, or to its last letter. */
  text: string;
  /** It, as the analyser is to be asked: on one line, and ending in a full stop. */
  ask: string;
}

/** Where another speaker's line begins: a line break before a dash. */
const SPEAKER = /\n(?=\s*[-\u2010-\u2015\u2212])/u;
/**
 * A speaker's words, and the marks that end them. The words run from the
 * first letter or figure to the last — and a comma straight after it, which
 * ko-dic reads as the sentence going on, as it is: of 634 cues that stop at
 * a comma, 99.5% read as in the whole sentence with it kept, and 97.3% with
 * a full stop in its place. (And · and :, which it reads the same; not ; or
 * a wide comma, which it does not know.) The marks are what a sentence ends
 * on, the dots of one that trails off among them.
 */
const SPOKEN = /([\p{L}\p{N}](?:[\s\S]*[\p{L}\p{N}])?[,·:]*)([.?!。？！…]*)/u;

/** Each speaker's stretch of a cue: where it starts, its words, and its own last marks. */
function stretchesOf(cue: string): Array<{ start: number; words: string; marks: string }> {
  const out: Array<{ start: number; words: string; marks: string }> = [];
  let at = 0;
  for (const line of cue.split(SPEAKER)) {
    const spoken = SPOKEN.exec(line);
    if (spoken) out.push({ start: at + spoken.index, words: spoken[1] ?? '', marks: spoken[2] ?? '' });
    at += line.length + 1;   // and the line break the split took
  }
  return out;
}

/**
 * A cue, as the analyser reads it best.
 *
 * ko-dic reads a word by what stands either side, and a subtitle puts things
 * there that a sentence in a book does not. With no full stop after it, the
 * last word of a line is read as the middle of a sentence: 가야지 as a noun,
 * the 타자 of 버스 타자 as a batter. With a dash, a quotation mark or a
 * bracket before it, the first word is read as leaning on one: 야! as the
 * copula. And a line break is not a space to it: one sentence over two lines
 * comes back with other rows in 9 of 100.
 *
 * Of Tatoeba's 15,617 sentences, each shown these ways, the share that then
 * read as they do written out: 97.4% with no final mark, 96.1% after a dash
 * as well, 94.1% in straight quotes, 90.4% in brackets, 94.3% over two
 * lines, 93.1% as one of two speakers.
 *
 * So each speaker's words are read on their own, from their first letter to
 * their last, on one line and ending in a full stop: 100.0% of each of
 * those. What stands outside — the dash, the quotation marks, the ♪ — is
 * punctuation whatever the analyser would call it, and koCueTokens() puts it
 * back. A line break inside a speaker's words stays: a sentence over two
 * lines is one sentence.
 */
export function koStretches(cue: string): KoStretch[] {
  // Its own last mark is where the full stop goes: 가요? is asked as 가요.
  return stretchesOf(cue).map(({ start, words, marks }) => ({ start, text: words + marks, ask: `${words.replace(/\s+/gu, ' ')}.` }));
}

/**
 * A cue's tokens, from what the analyser answered for each of its stretches
 * (koStretches), in order. The full stop it was asked with comes back as a
 * row of its own, the last: it is the stretch's own last mark where the cue
 * has one, and left out where the line just stops — which koTokens() has to
 * know, to tell a sentence that ended from a line that broke off. Each
 * stretch is a line to koTokens(), and what stands between and around them
 * is kept as place() keeps the spaces between words, so every character of
 * the cue is under a token.
 */
export function koCueTokens(cue: string, answers: KoMorpheme[][]): Token[] {
  const out: Token[] = [];
  let cursor = 0;
  const between = (to: number): void => {
    if (to > cursor) out.push({ surface: cue.slice(cursor, to), start: cursor, end: to, punct: true });
    cursor = to;
  };
  for (const [i, stretch] of stretchesOf(cue).entries()) {
    between(stretch.start);
    const text = stretch.words + stretch.marks;
    const rows = answers[i] ?? [];
    const stop = rows.at(-1);
    const read = stop?.surface !== '.' ? rows : rows.slice(0, -1).concat(stretch.marks ? [{ ...stop, surface: stretch.marks }] : []);
    for (const t of koTokens(text, read)) out.push({ ...t, start: t.start + stretch.start, end: t.end + stretch.start });
    cursor = stretch.start + text.length;
  }
  between(cue.length);
  return out;
}
