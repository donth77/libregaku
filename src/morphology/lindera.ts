import { furigana } from './furigana';
import { mergeMorphemes, type Lexicon, type LexiconEntry, type Morpheme } from './merge';
import type { Segmenter, Token } from './types';

/**
 * Tier 2 — real morphological analysis.
 *
 * The analyser itself runs in the offscreen document; this is the client side.
 * Tokenising is async and subtitles change on a frame timer, so results are
 * cached per cue text — the same line is never analysed twice.
 */

type Analysed = Morpheme;

/** What the offscreen document answers a 'tokenize' with. */
interface Analysis {
  ok?: boolean;
  tokens?: Analysed[];
  /** The dictionary's readings for the written forms merging asked about. */
  lexicon?: Record<string, LexiconEntry[]>;
  /** False when the dictionary could not be consulted, so a retry may know more. */
  complete?: boolean;
  error?: string;
}

export class LinderaSegmenter implements Segmenter {
  readonly tier = 2 as const;
  readonly hasLemma = true;

  readonly #cache = new Map<string, Token[]>();

  static async ensure(dict = 'ipadic'): Promise<{ ok: boolean; error?: string }> {
    await chrome.runtime.sendMessage({ type: 'ensure-offscreen' });
    const res = (await chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'load',
      dict,
    })) as { ok?: boolean; error?: string } | undefined;
    // No reply at all is a different fault from a refusal, and reporting it as
    // `undefined` is how it went unread for so long.
    if (!res) return { ok: false, error: 'the offscreen document did not answer' };
    return { ok: Boolean(res.ok), error: res.error };
  }

  static async status(): Promise<{ ready: boolean; phase: string; percent: number; error: string | null }> {
    const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'status' })) as
      | { ready: boolean; phase: string; percent: number; error: string | null }
      | undefined;
    return res ?? { ready: false, phase: 'unavailable', percent: 0, error: null };
  }

  async segment(text: string): Promise<Token[]> {
    const hit = this.#cache.get(text);
    if (hit) return hit;
    const { tokens, complete } = await segmentWith(text, analyse);
    // An analysis made before the dictionary loaded reads numbers and prefixed
    // words less well; keep it for this call only, so the line improves once
    // the dictionary is there.
    if (complete) {
      // Bounded: a long film is a few thousand lines, and they are short.
      if (this.#cache.size > 4000) this.#cache.clear();
      this.#cache.set(text, tokens);
    }
    return tokens;
  }
}

/** What the analyser answers for one piece of text. */
export type Analyse = (text: string) => Promise<Analysis & { tokens: Analysed[] }>;

/**
 * A line into words, with whatever analyser is given: the offscreen
 * document's here, the test harness's in Node, so both run the same steps.
 * `complete` is false when an answer could have known more — the dictionary
 * was not there yet.
 */
export async function segmentWith(text: string, analyse: Analyse): Promise<{ tokens: Token[]; complete: boolean }> {
  // Stretched vowels are read as ー, and dropped where IPADIC cannot read
  // them so; either way the words go back on the line as written.
  let used = forAnalysis(text);
  let res = await analyse(used.text);
  let analysed = toTokens(used.text, res.tokens, lexiconFrom(res.lexicon));
  const drop = marksToDrop(analysed, used);
  if (drop.size) {
    used = forAnalysis(text, drop);
    res = await analyse(used.text);
    analysed = toTokens(used.text, res.tokens, lexiconFrom(res.lexicon));
  }
  let out = used.text === text ? analysed : restretched(analysed, text, used.at);
  // A っ put in for stress — 全っ然 — is read without it where the kanji
  // either side then make one word, and goes back on the line as written.
  const stress = stressToDrop(out, text);
  if (stress.size) {
    const tried = forAnalysis(text, new Set([...drop, ...stress]));
    const again = await analyse(tried.text);
    const read = restretched(toTokens(tried.text, again.tokens, lexiconFrom(again.lexicon)), text, tried.at);
    if (stressRead(read, stress)) {
      out = read;
      res = again;
    }
  }
  return { tokens: out, complete: res.complete !== false };
}

/** One request to the offscreen document's analyser. */
async function analyse(text: string): Promise<Analysis & { tokens: Analysed[] }> {
  const res = (await chrome.runtime.sendMessage({ target: 'offscreen', type: 'tokenize', text })) as
    | Analysis
    | undefined;
  if (!res) throw new Error('the offscreen document did not answer');
  if (!res.ok || !res.tokens) throw new Error(res.error ?? 'tokenizer unavailable');
  return res as Analysis & { tokens: Analysed[] };
}

/** Marks that stretch a vowel in casual writing: は〜い, う～ん, ね~. */
const STRETCH = new Set(['〜', '～', '~', '〰']);
/** A small つ, which casual writing also puts inside a word for stress: 全っ然, 本っ当. */
const SOKUON = new Set(['っ', 'ッ']);
const KANJI = /[\u4E00-\u9FFF\u3400-\u4DBF々]/u;
const KANA = /[\p{sc=Hiragana}\p{sc=Katakana}]/u;
const HIRAGANA = /\p{sc=Hiragana}/u;

/** A line as the analyser is given it. */
export interface ForAnalysis {
  text: string;
  /** Where in the line each character of `text` came from, and one past the end. */
  at: number[];
  /** Positions in `text` of a stretch: a mark read as ー, or a ー after hiragana. */
  stretched: Set<number>;
}

/**
 * A line as the analyser should read it.
 *
 * IPADIC knows nothing of 〜 as a stretched vowel: は〜い came back as
 * は + 〜 + い, the い read as いる. Spelled with ー, as the dictionary spells
 * such words, it reads はーい, うーん and えーと — and う〜ん is not うん, so
 * the mark is not simply dropped. A run of marks is one. Those at `drop`
 * (positions in the line) are left out instead: where even ー leaves IPADIC
 * a lone ー, as in すごーい and かわいー, the word reads right without it.
 * A ー after katakana is part of the spelling and is never touched.
 */
export function forAnalysis(text: string, drop: ReadonlySet<number> = new Set()): ForAnalysis {
  let out = '';
  const at: number[] = [];
  const stretched = new Set<number>();
  let afterKana = false;
  let afterHiragana = false;
  let inRun = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    // A っ put in for stress, read without (stressToDrop).
    if (SOKUON.has(c) && drop.has(i)) continue;
    const mark = afterKana && STRETCH.has(c);
    const long = afterHiragana && c === 'ー';
    if (mark || long) {
      // A run is one stretch, and a dropped one takes the rest of its run with it.
      if ((mark && inRun) || drop.has(i)) {
        inRun = true;
        continue;
      }
      stretched.add(out.length);
      out += 'ー';
      at.push(i);
      inRun = true;
      continue;
    }
    out += c;
    at.push(i);
    inRun = false;
    afterKana = KANA.test(c);
    afterHiragana = HIRAGANA.test(c);
  }
  at.push(text.length);
  return { text: out, at, stretched };
}

/**
 * A っ put inside a word for stress, which split it for the analyser:
 * between two kanji, with no word spanning both. 全っ然 came back as 全 +
 * っ + 然, the 然 read as しか. 真っ赤 is spelled with its っ and comes back
 * whole, so it is left alone. `tokens` are on the line as written;
 * positions are in it.
 */
export function stressToDrop(tokens: readonly Token[], text: string): Set<number> {
  const drop = new Set<number>();
  for (let i = 1; i < text.length - 1; i++) {
    if (!SOKUON.has(text[i]!) || !KANJI.test(text[i - 1]!) || !KANJI.test(text[i + 1]!)) continue;
    if (tokens.some((t) => t.start <= i - 1 && t.end >= i + 2)) continue;
    drop.add(i);
  }
  return drop;
}

/** Read without them, each dropped っ sits inside one word with the kanji either side. */
export function stressRead(tokens: readonly Token[], drop: ReadonlySet<number>): boolean {
  return [...drop].every((i) => tokens.some((t) => t.start <= i - 1 && t.end >= i + 2));
}

/** Stretches IPADIC left on their own, as a word that is only ー: where they stand in the line. */
export function marksToDrop(tokens: readonly Token[], given: ForAnalysis): Set<number> {
  const drop = new Set<number>();
  for (const t of tokens) {
    if (!/^ー+$/.test(t.surface)) continue;
    const at = Array.from({ length: t.end - t.start }, (_, k) => t.start + k);
    if (!at.every((p) => given.stretched.has(p))) continue;
    for (const p of at) drop.add(given.at[p]!);
  }
  return drop;
}

/**
 * Tokens of an unstretched line, put back on the line as written. Each word
 * takes the marks that came after it, so は〜い is one word, looked up as
 * はい, and nothing on the line goes undrawn.
 */
export function restretched(tokens: readonly Token[], text: string, at: readonly number[]): Token[] {
  return tokens.map((t) => {
    const start = at[t.start] ?? t.start;
    const end = at[t.end] ?? text.length;
    return { ...t, start, end, surface: text.slice(start, end) };
  });
}

/**
 * Nothing but punctuation, symbols, spaces or a long-vowel mark: never a word,
 * whatever the analyser called it. IPADIC's pass over characters it has no
 * entry for groups ？ with the space after it, and reads ～ and ? on their
 * own, as nouns — which underlined them as new words.
 */
const MARKS_ONLY = /^[\p{P}\p{S}\p{Z}\sー]+$/u;

/** The offscreen document's answers as the merge pass consumes them. */
export function lexiconFrom(answers?: Record<string, LexiconEntry[]>): Lexicon | undefined {
  if (!answers) return undefined;
  return (form) => answers[form];
}

/**
 * Merge morphemes into words, then locate each in the original text.
 *
 * Lindera reports byte offsets; the DOM needs UTF-16 ones. Rather than convert,
 * walk the text and find each surface in order — which also survives the
 * analyser normalising a character away.
 */
export function toTokens(text: string, analysed: Analysed[], lexicon?: Lexicon): Token[] {
  const merged = spaced(text, analysed).flatMap((run) => mergeMorphemes(run, lexicon));
  const out: Token[] = [];
  let cursor = 0;

  for (const t of merged) {
    if (!t.surface) continue;
    const at = text.indexOf(t.surface, cursor);
    if (at < 0) continue;   // normalised; skip rather than misalign the rest
    cursor = at + t.surface.length;

    // IPADIC files punctuation under 記号, mostly.
    const punct = t.pos === '記号' || MARKS_ONLY.test(t.surface);
    out.push({
      surface: t.surface,
      start: at,
      end: cursor,
      lemma: t.lemma,
      reading: t.reading,
      pos: t.pos,
      content: t.content && !punct,
      punct,
      parts: t.parts.length > 1 ? t.parts : undefined,
      inflections: t.inflections.length ? t.inflections : undefined,
      lemmaReading: t.lemmaReading,
      lookup: t.lookup.length ? t.lookup : undefined,
    });
  }
  return out;
}

/**
 * The morphemes in the stretches a line writes without a space.
 *
 * The analyser drops spaces, so ありがとう ございます comes back as if it
 * were written together. A word merged across the space was then nowhere in
 * the line, and toTokens left it out — the whole phrase went missing. A space
 * the subtitle put there is a boundary, and merging stays inside it.
 */
function spaced(text: string, analysed: Analysed[]): Analysed[][] {
  const runs: Analysed[][] = [];
  let run: Analysed[] = [];
  let cursor = 0;
  for (const m of analysed) {
    const at = m.surface ? text.indexOf(m.surface, cursor) : -1;
    if (at >= 0) {
      if (run.length && /\s/.test(text.slice(cursor, at))) {
        runs.push(run);
        run = [];
      }
      cursor = at + m.surface.length;
    }
    run.push(m);
  }
  if (run.length) runs.push(run);
  return runs;
}

/** Ruby segments for a token, for the renderer. */
export function rubyFor(token: Token): ReturnType<typeof furigana> {
  return furigana(token.surface, token.reading);
}
