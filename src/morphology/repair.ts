import type { Morpheme } from './merge';

/**
 * UniDic's second opinion on IPADIC's reading of a line.
 *
 * IPADIC cuts a line the way a learner reads it — ので, という, 彼ら and 本当に are
 * words there — and the merge rules are written for it. UniDic cuts finer, in
 * a place or two in most lines, so it does not replace IPADIC. But IPADIC's
 * word list is from 2007, and it reads kana badly:
 *
 *   - 彼はいつ来ますか comes back は, い, つ — いる and an ending from the
 *     classical language — though IPADIC has いつ, and scores it a hair behind.
 *     So with いただけませんか (い, た, だけ) and いかが (いか, a squid, and が).
 *   - Words it lists only in kanji come back in pieces when they are written
 *     in kana: ひげ is ひ and げ, そろばん is そろ, ば, ん.
 *   - 住んでたんだよ comes back with たん, a noun, where it is た and ん.
 *   - 癒やす, 就活, ググる and モテる are not in it at all. It gives a piece with
 *     no reading and no dictionary form, and cuts what follows wrongly.
 *
 * UniDic reads all of these right. So a line is read by both, and UniDic
 * decides three things, each only where the two cut the line differently:
 *
 *   1. A word in kana that IPADIC cut up. Where UniDic has one word and
 *      IPADIC pieces, and the pieces are not a verb with its endings or a
 *      particle and a word (stands()), the word is taken: from IPADIC's own
 *      other readings where one keeps it whole — the words are then still
 *      IPADIC's, as the merge rules expect — and from UniDic where none does.
 *   2. A noun that is endings. Where IPADIC has a noun in hiragana and UniDic
 *      reads only endings and particles there, IPADIC's reading that cuts it
 *      as UniDic does is taken.
 *   3. Words IPADIC does not have. The stretch around one — out to where the
 *      two agree a word ends — is UniDic's, if UniDic knew every word in it.
 *
 * UniDic is wrong too — 彼女はやるたびに is はやる, "to be in fashion", to it, and
 * 邪魔をしたくはない is したく, "preparations" — so each of these is kept narrow,
 * by reading every line that changes: scripts/compare-unidic.mjs.
 *
 * Measured on all 248,924 of Tatoeba's sentences and the test videos' 428
 * subtitle lines: 3,186 sentences change in their words, one in eighty, and 38
 * subtitle lines; 2,481 more only gain the reading of a word in katakana. Of
 * 130 changed lines drawn at random, none read worse. Some of UniDic's own
 * misreadings do come through, each seen once or twice: くれえ, "about", as
 * 黒い; グル, a guru, as ぐる, "in league"; うわっ as a verb.
 */

/** One of IPADIC's readings of a stretch of text, and its cost: the lower, the likelier. */
export interface Reading {
  words: Morpheme[];
  cost: number;
}

/**
 * IPADIC's readings of a stretch with no mark or space in it: the likeliest
 * first, each cut differently, none costing more than `within` above the first.
 */
export type Others = (text: string, within: number) => Reading[];

/**
 * How far behind its likeliest reading IPADIC's others are asked for, in its
 * own cost: a word in its list costs a few thousand. いつ is 112 to 805 behind
 * い and つ, いただけ 814, いかが 1112, た and ん 1791 behind たん, だ and い 2320
 * behind だい, イヤホン 2011 behind イヤ and ホン.
 */
export const WITHIN = 4000;

const HIRAGANA = /^[ぁ-ゖー]+$/u;
const KANA = /^[ぁ-ゖァ-ヺー]+$/u;
const KANJI = /^[\p{sc=Han}々]$/u;
const WORDLIKE = /[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}]/u;
/** What attaches to a word, or follows it, and is not a word a learner looks up. */
const GRAMMAR = new Set(['助詞', '助動詞']);
const INFLECTS = new Set(['動詞', '形容詞', '助動詞']);
/** What follows a person's name. */
const PERSON = new Set(['さん', 'ちゃん', 'くん', '君', '様', 'さま', '殿', '氏', '先生']);

/** A piece the analyser had no word for: no dictionary form, and not a mark or a number. */
export function unknown(m: Morpheme): boolean {
  return !m.lemma && m.pos !== '記号' && WORDLIKE.test(m.surface);
}

/** What UniDic did not know: no word for it, or a kana it could only call a symbol (ケ and モナー for ケモナー). */
const unread = (m: Morpheme): boolean => WORDLIKE.test(m.surface) && (!m.lemma || m.pos === '記号');

const ends = (ms: readonly Morpheme[]): number[] => {
  let at = 0;
  return ms.map((m) => (at += m.surface.length));
};
const textOf = (ms: readonly Morpheme[]): string => ms.map((m) => m.surface).join('');

/** A stretch of the line between two places where both analysers end a word, and each one's words in it. */
interface Span {
  from: number;
  to: number;
  mine: Morpheme[];
  theirs: Morpheme[];
  /** Where `mine` starts among IPADIC's words. */
  at: number;
  /** IPADIC's word after the stretch. */
  next?: Morpheme;
}

/** The line as stretches both analysers agree the ends of, or null where they do not cover the same text. */
function spans(mine: readonly Morpheme[], theirs: readonly Morpheme[]): Span[] | null {
  const ea = ends(mine);
  const eb = ends(theirs);
  if (!ea.length || ea[ea.length - 1] !== eb[eb.length - 1]) return null;
  const shared = new Set(eb);
  const out: Span[] = [];
  let j = 0;
  let from = 0;
  for (let i = 0; i < mine.length;) {
    let e = i;
    while (!shared.has(ea[e]!)) e++;
    const to = ea[e]!;
    let f = j;
    while (eb[f]! < to) f++;
    out.push({ from, to, mine: mine.slice(i, e + 1), theirs: theirs.slice(j, f + 1), at: i, next: mine[e + 1] });
    i = e + 1;
    j = f + 1;
    from = to;
  }
  return out;
}

/* ── Whether IPADIC's pieces are a word with its endings ─────────── */

/** Endings of the classical language, which IPADIC finds in kana it has no word for: い and つ, こり, ご and り. */
const CLASSICAL = new Set(['つ', 'き', 'り', 'じ']);
/** Particles that are part of a conjugation, and the forms they follow. */
const ON_TE = new Set(['て', 'で', 'たり', 'だり', 'ちゃ', 'じゃ']);
const TE_FORMS = new Set(['連用タ接続', '連用形', '連用テ接続']);
const ENDS_A_CLAUSE = (form: string | undefined): boolean =>
  form === '基本形' || form === '音便基本形' || (form ?? '').startsWith('命令');
/** Endings that need a verb before them: after a particle there is none. */
const NEEDS_A_VERB = new Set(['ます', 'たい', 'ぬ', 'れる', 'られる', 'せる', 'させる']);

/** Whether `b` may follow `a` as its ending, or as a particle after it, by the form `a` is in. */
function follows(a: Morpheme, b: Morpheme): boolean {
  const form = a.conjForm;
  const lemma = b.lemma ?? b.surface;
  if (b.pos === '助動詞') {
    if (CLASSICAL.has(lemma)) return false;
    if (lemma === 'ます' || lemma === 'たい') return form === '連用形';
    if (lemma === 'た') return form === '連用タ接続' || form === '連用形';
    if (lemma === 'ない' || lemma === 'ぬ' || lemma === 'ん' || lemma === 'ず') return form === '未然形' || form === '連用テ接続' || form === '連用形';
    if (lemma === 'う') return form === '未然ウ接続';
    return true;
  }
  if (b.pos === '助詞') {
    if (b.surface === 'ど') return false;
    if (ON_TE.has(b.surface)) return TE_FORMS.has(form ?? '');
    if (b.surface === 'ば') return form === '仮定形';
    if (b.surface === 'ながら' || b.surface === 'つつ') return form === '連用形';
    if ((b.surface === 'は' || b.surface === 'も' || b.surface === 'に') && form === '連用形') return true;
    return ENDS_A_CLAUSE(form);
  }
  // 食べ + られ, 見 + すぎる, 知っ + てる: a helper on a stem.
  if ((b.pos === '動詞' || b.pos === '形容詞') && (b.pos1 === '接尾' || b.pos1 === '非自立')) return true;
  // なく + なる: an adjective's く and なる.
  if (b.pos === '動詞' && lemma === 'なる') return form === '連用テ接続';
  // 行った + ん, 行く + の.
  if (b.pos === '名詞' && b.pos1 === '非自立') return ENDS_A_CLAUSE(form);
  // よ + さ, 来 + そう.
  if (b.pos === '名詞' && b.pos1 === '接尾' && (b.surface === 'さ' || b.surface === 'そう')) return form === 'ガル接続' || form === '連用形';
  return false;
}

/**
 * Whether IPADIC's pieces stand, where UniDic has one word for them: a
 * particle and what follows it (は and やる, where UniDic has はやる), or a
 * verb or adjective with endings that fit the form it is in (し and たく,
 * where UniDic has したく), or a noun and the particle that ends a clause.
 * い and つ do not — つ is no ending of today's language — nor い, た and だけ
 * before ませ, which has no verb to attach to.
 */
function stands(s: Span): boolean {
  const lead = s.mine[0]!;
  if (lead.pos === '助詞') return true;
  // まじ and か, where a clause ends: UniDic's まじか is 間近, "close at hand".
  const closes = s.mine.length === 2 && lead.pos === '名詞' && s.mine[1]!.pos === '助詞' && (s.mine[1]!.pos1 ?? '').includes('終助詞');
  if (closes && (!s.next || s.next.pos === '記号')) return true;
  if (!INFLECTS.has(lead.pos ?? '') || (lead.pos === '助動詞' && CLASSICAL.has(lead.lemma ?? ''))) return false;
  if (!s.mine.every((m, k) => k === 0 || follows(s.mine[k - 1]!, m))) return false;
  const last = s.mine[s.mine.length - 1]!;
  return !(last.pos === '助詞' && s.next?.pos === '助動詞' && NEEDS_A_VERB.has(s.next.lemma ?? ''));
}

/* ── What UniDic asks of IPADIC's other readings ─────────────────── */

/** A stretch IPADIC should cut as UniDic does. */
interface Want {
  from: number;
  to: number;
  /** Where a word should end inside it: nowhere, for a word to keep whole. */
  cuts: number[];
  /** UniDic's word, for one to keep whole. */
  word?: Morpheme;
}

const inflects = (m: Morpheme): boolean => m.pos === '動詞' || m.pos === '形容詞';
/** A particle a noun takes: が, を, に, は, も, の. */
const marksANoun = (m: Morpheme | undefined): boolean =>
  m?.pos === '助詞' && ['格助詞', '係助詞', '連体化'].includes(m.pos1 ?? '');
/** An ending or a particle, as IPADIC names them: ん and の after a verb are nouns to it. */
const grammatical = (m: Morpheme): boolean => GRAMMAR.has(m.pos ?? '') || (m.pos === '名詞' && m.pos1 === '非自立');

/** What UniDic's reading of a stretch asks for, if anything. */
function wanted(s: Span): Want | null {
  if (s.mine.some(unknown) || s.theirs.some(unread)) return null;
  const text = textOf(s.mine);
  if (s.theirs.length === 1 && s.mine.length > 1 && KANA.test(text)) {
    // An ending or a particle to UniDic (たがっ, てっ, って): the merge rules read IPADIC's pieces for those.
    if (GRAMMAR.has(s.theirs[0]!.pos ?? '') || stands(s)) return null;
    return { from: s.from, to: s.to, cuts: [], word: s.theirs[0] };
  }
  if (s.mine.length === 1 && s.theirs.length > 1 && HIRAGANA.test(text)) {
    const noun = s.mine[0]!;
    if (noun.pos !== '名詞' || (noun.pos1 !== '一般' && noun.pos1 !== 'サ変接続')) return null;
    if (!s.theirs.every((m) => GRAMMAR.has(m.pos ?? ''))) return null;
    // かねを貸して: what a particle marks is the noun, 金, and no か and ね.
    if (marksANoun(s.next)) return null;
    return { from: s.from, to: s.to, cuts: ends(s.theirs).slice(0, -1).map((e) => s.from + e) };
  }
  return null;
}

const breaksRun = (m: Morpheme): boolean => m.pos === '記号' || !m.surface.trim();

/**
 * IPADIC's words with, in each run between marks, the likeliest of its
 * readings that cuts the wanted stretches as asked: and what was asked that
 * no reading of its gives, for UniDic's words to be taken there.
 */
function choose(mine: readonly Morpheme[], all: readonly Span[], others: Others | undefined): { words: Morpheme[]; unmet: Want[] } {
  const wants = all.map(wanted);
  const unmet: Want[] = [];
  if (!wants.some(Boolean)) return { words: [...mine], unmet };
  const ea = ends(mine);
  const out: Morpheme[] = [];
  for (let i = 0; i < mine.length;) {
    if (breaksRun(mine[i]!)) {
      out.push(mine[i]!);
      i++;
      continue;
    }
    let e = i;
    while (e + 1 < mine.length && !breaksRun(mine[e + 1]!)) e++;
    const run = mine.slice(i, e + 1);
    const start = i === 0 ? 0 : ea[i - 1]!;
    const asked = wants.filter((w, k): w is Want => w !== null && all[k]!.at >= i && all[k]!.at <= e);
    // The mark that closes the run is read with it: a run reads differently where nothing follows.
    const mark = mine[e + 1]?.pos === '記号' && mine[e + 1]!.surface.trim() ? mine[e + 1] : undefined;
    const read = asked.length && others ? better(run, start, asked, others, mark) : { words: run, unmet: asked };
    out.push(...read.words);
    unmet.push(...read.unmet);
    i = e + 1;
  }
  return { words: out, unmet };
}

/** A reading's words, each with where it is in the line. */
type Placed = Array<{ from: number; to: number; word: Morpheme }>;

const placeFrom = (words: readonly Morpheme[], start: number): Placed => {
  let at = start;
  return words.map((word) => ({ from: at, to: (at += word.surface.length), word }));
};

/**
 * What a reading makes of a stretch that was asked about: 'given' where it
 * cuts it as asked, 'other' where it cuts it so and has another word there
 * than UniDic's, and nothing where it cuts it differently.
 *
 * A word to keep whole must be the same kind of word to both, one that
 * inflects or one that does not: くれたまえ is まえ, 前, to UniDic, and 舞え,
 * "dance!", to IPADIC, and neither is right. A verb's stem to one is the
 * same word as the other's noun: おそれ, ためらい. The pieces of a noun must be
 * endings and particles to IPADIC too: い after だ is a particle, not いる.
 */
function makes(reading: Placed, w: Want): 'given' | 'other' | null {
  if (w.word) {
    const whole = reading.find((p) => p.from === w.from && p.to === w.to)?.word;
    if (!whole) return null;
    const stemOf = (verb: Morpheme, noun: Morpheme): boolean => inflects(verb) && verb.conjForm === '連用形' && noun.pos === '名詞';
    return inflects(whole) === inflects(w.word) || stemOf(w.word, whole) || stemOf(whole, w.word) ? 'given' : 'other';
  }
  const cut = new Set(reading.map((p) => p.to));
  if (!w.cuts.every((c) => cut.has(c))) return null;
  return reading.every((p) => p.to <= w.from || p.from >= w.to || grammatical(p.word)) ? 'given' : 'other';
}

/**
 * The run as its likeliest reading that gives the most of what was asked, or
 * as it was, and what was asked that none of its readings has. A run is read
 * on its own, with the mark that closes it, to be asked about, and is left
 * alone where that reads it differently from how the line did. Only what is
 * cut differently is taken from the other reading: a word both have stays as
 * the line had it.
 */
function better(
  run: Morpheme[], start: number, asked: readonly Want[], others: Others, mark?: Morpheme,
): { words: Morpheme[]; unmet: Want[] } {
  const text = textOf(run);
  const closed = mark ? [...run, mark] : run;
  const readings = others(textOf(closed), WITHIN)
    .filter((r) => !mark || r.words[r.words.length - 1]?.surface === mark.surface)
    .map((r) => (mark ? { ...r, words: r.words.slice(0, -1) } : r));
  const first = readings[0];
  if (!first || first.words.length !== run.length || first.words.some((w, k) => w.surface !== run[k]!.surface)) {
    return { words: run, unmet: [...asked] };
  }
  const had = placeFrom(run, start);
  let best: Placed | null = null;
  let given: Want[] = [];
  /** A word to keep whole that some reading has as another kind of word than UniDic: the two do not agree, and it is left. */
  const disputed = new Set<Want>();
  for (const reading of readings.slice(1)) {
    // A reading of part of the run is no reading of it.
    if (textOf(reading.words) !== text) continue;
    const placed = placeFrom(reading.words, start);
    const gave: Want[] = [];
    for (const w of asked) {
      const made = makes(placed, w);
      if (made === 'given') gave.push(w);
      else if (made === 'other' && w.word) disputed.add(w);
    }
    if (gave.length <= given.length) continue;
    // Only what was asked about, and the word either side of it, may be cut differently: 何をしていたんだい
    // has だ and い for だい in a reading that also makes い, た and ん into いたん, "ached".
    const loose = (p: { from: number; to: number }): boolean => gave.some((w) => p.to >= w.from && p.from <= w.to);
    if (!had.every((p) => loose(p) || placed.some((q) => q.from === p.from && q.to === p.to))) continue;
    given = gave;
    best = placed;
  }
  const unmet = asked.filter((w) => !given.includes(w) && !disputed.has(w));
  if (!best) return { words: run, unmet };
  const words = best.map((p) => had.find((q) => q.from === p.from && q.to === p.to)?.word ?? p.word);
  return { words, unmet };
}

/**
 * IPADIC's words with UniDic's where IPADIC had none: each stretch that holds
 * a word IPADIC did not know, if UniDic knew every word in it, and each
 * stretch in `asked`. A word IPADIC kept whole is never cut up — a name (ムーリエル is
 * ムー and リエル to UniDic), a compound in katakana — only read. Not even
 * that for a lone kanji, UniDic's reading of 択 alone being a guess, nor
 * before さん: ヒラリさん is no ひらり, "lightly". What follows a
 * word that turns out to inflect (モテ, a noun to IPADIC, and ない after it an
 * adjective) was read as if after a noun, so its endings are UniDic's too, as
 * far as the two differ.
 */
function borrow(all: readonly Span[], asked: readonly Want[]): Morpheme[] {
  const out: Morpheme[] = [];
  let inflecting = false;
  for (const s of all) {
    const theirs = s.theirs[0]!;
    const lacking = s.mine.some(unknown);
    if (lacking || asked.some((w) => w.from === s.from && w.to === s.to)) {
      const alone = lacking && s.mine.length === 1;
      const kept = alone && (s.theirs.length > 1 || KANJI.test(s.mine[0]!.surface) || PERSON.has(s.next?.surface ?? ''));
      const take = !kept && !s.theirs.some(unread);
      out.push(...(take ? s.theirs : s.mine));
      inflecting = take && INFLECTS.has(s.theirs[s.theirs.length - 1]!.pos ?? '');
      continue;
    }
    const ending = theirs.pos === '助動詞' || (theirs.pos === '助詞' && theirs.pos1 === '接続助詞');
    if (inflecting && s.mine.length === 1 && s.theirs.length === 1 && ending && s.mine[0]!.pos !== theirs.pos) {
      out.push(theirs);
      continue;
    }
    out.push(...s.mine);
    inflecting = false;
  }
  return out;
}

/**
 * `ipadic` as UniDic's reading of the same line corrects it. Unchanged where
 * the two do not cover the same text. Without `others`, IPADIC's other
 * readings cannot be asked for, and what UniDic corrects is UniDic's words.
 */
export function repair(ipadic: readonly Morpheme[], unidic: readonly Morpheme[], others?: Others): Morpheme[] {
  const first = spans(ipadic, unidic);
  if (!first) return [...ipadic];
  const chosen = choose(ipadic, first, others);
  if (!chosen.unmet.length && !chosen.words.some(unknown)) return chosen.words;
  const then = spans(chosen.words, unidic);
  return then ? borrow(then, chosen.unmet) : chosen.words;
}
