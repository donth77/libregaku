/**
 * Adjectives IPADIC does not know the way they are written in speech.
 *
 * Katakana where hiragana belongs, ヤバい, ウザい, キモい: IPADIC knows やばい
 * and not ヤバい, so ヤバくない comes back as the noun ヤバ, then く and ない as
 * two adjectives. And rough speech, which runs ai and oi together into ee:
 * すげえ for すごい, でけえ for でかい, やべー, くせー, きたねぇ. IPADIC has none of
 * these; it cuts them up into verbs, particles and fillers.
 *
 * Both are read once more with the word written the way IPADIC knows it, the
 * same length character for character; where that gives an adjective across
 * the place that was changed, its analysis is taken, with the surfaces put
 * back as they were written.
 *
 * An adjective turning up is not enough to go on. カレー written out is からい,
 * "spicy"; そのレース is そ, のろい, ス; アライさん is 荒い; おめえ, "you", is
 * おもい, "heavy". Each of those was once read so. So a word is written out
 * only where it could be one of these:
 *   - katakana is an adjective's stem, its ending in hiragana after it. アライ
 *     has its い inside, and クラウチさん has more katakana after the くら;
 *   - a long vowel inside a katakana word is its spelling: ケーキ, レース;
 *   - a katakana word the analyser knows as written is that word: カレー;
 *   - the adjective starts in the katakana the vowel is in, not in a particle
 *     before it: でケー is not でかい;
 *   - where the same place written another way is a word that is no
 *     adjective, it is left: くれえ is くらい, おめえ is おまえ.
 * Measured on every Tatoeba sentence (scripts/compare-unidic.mjs, REREAD=1).
 */

const KATAKANA = 'ァ-ヶ';
const IS_KATAKANA = new RegExp(`[${KATAKANA}ー]`, 'u');
/**
 * A whole katakana run, then what an adjective's ending starts with: い, く,
 * かっ, けれ, さ, そう, すぎ.
 */
const RUN = new RegExp(`(?<![${KATAKANA}ー])[${KATAKANA}]{2,6}(?=い|く|かっ|け[れり]|さ|そう|すぎ)`, 'gu');

const toHiragana = (s: string): string =>
  s.replace(new RegExp(`[${KATAKANA}]`, 'gu'), (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/** A word of an analysis, as the analyser gives it. */
export interface Word {
  surface: string;
  /** 形容詞. */
  adjective: boolean;
  /** In the analyser's list: not a piece it had no word for. */
  known: boolean;
  /** An adjective's bare stem, as it stands before すぎる and そう. */
  stem?: boolean;
}

/** A word of an analysis and where it is. */
export interface Placed extends Word {
  start: number;
  end: number;
}

const placeAll = <W extends Word>(words: readonly W[]): Array<W & Placed> => {
  let at = 0;
  return words.map((w) => {
    const p = { ...w, start: at, end: at + w.surface.length };
    at += w.surface.length;
    return p;
  });
};

/** The katakana runs an adjective's ending follows, [start, end). */
export function runs(text: string): Array<[number, number]> {
  return [...text.matchAll(RUN)].map((m) => [m.index, m.index + m[0].length]);
}

/**
 * Whether an adjective stands over the run with its ending after it: the run
 * is its stem. It ends past the run (ヤバ and い), or is a bare stem ending
 * with it (キツ before すぎる).
 */
export function stemIn(placed: readonly Placed[], [start, end]: [number, number]): boolean {
  return placed.some((p) => p.adjective && p.start <= start && (p.end > end || (p.end === end && p.stem === true)));
}

/* ── ai and oi run together into ee ─────────────────────────────── */

/** The kana of the え row, and the あ and お row kana it comes from: げ from が or ご. */
const E_ROW: Record<string, [a: string, o: string]> = {
  け: ['か', 'こ'], げ: ['が', 'ご'], せ: ['さ', 'そ'], ぜ: ['ざ', 'ぞ'], て: ['た', 'と'], で: ['だ', 'ど'],
  ね: ['な', 'の'], べ: ['ば', 'ぼ'], め: ['ま', 'も'], れ: ['ら', 'ろ'], へ: ['は', 'ほ'], ぺ: ['ぱ', 'ぽ'],
};
/** An え-row kana and what lengthens it: げ + え, げ + ぇ, げ + ー, in either kana. */
const CONTRACTED = /[けげせぜてでねべめれへぺケゲセゼテデネベメレヘペ][えぇーエェ]/gu;

/** One place a contraction may be. */
export interface Contraction {
  /** [start, end) of the two characters. */
  at: [number, number];
  /** Where the katakana it is written in starts, where it is in katakana. */
  from?: number;
  /** The text with it written out: ai, then oi. An adjective, if this is one. */
  candidates: [string, string];
  /** Written out the third way, ae: おまえ for おめえ. Never an adjective. */
  other: string;
}

/**
 * The places in `text` that may be a contraction, each with the text written
 * out in full. Katakana it is written in is put in hiragana, as the analyser
 * knows the words: スッゲえ is read as すっげえ. A long vowel with katakana
 * after it is a word's spelling, and a word that starts with one is ねえ,
 * "hey". Nothing is taken for a contraction here; the analysis says whether
 * the written-out word is an adjective.
 */
export function contractions(text: string): Contraction[] {
  const found: Contraction[] = [];
  for (const m of text.matchAll(CONTRACTED)) {
    const at = m.index;
    const row = E_ROW[toHiragana(text[at]!)];
    if (!row || at === 0) continue;
    const katakana = IS_KATAKANA.test(text[at]!);
    const after = text[at + 2];
    // ケーキ, レース: the word goes on in katakana, so the long vowel is its spelling.
    if (katakana && after && IS_KATAKANA.test(after)) continue;
    let from = at;
    if (katakana) while (from > 0 && IS_KATAKANA.test(text[from - 1]!)) from--;
    const written = (kana: string, tail: string): string =>
      text.slice(0, from) + toHiragana(text.slice(from, at)) + kana + tail + text.slice(at + 2);
    found.push({
      at: [at, at + 2], ...(katakana ? { from } : {}),
      candidates: [written(row[0], 'い'), written(row[1], 'い')], other: written(row[0], 'え'),
    });
  }
  return found;
}

/**
 * Whether an adjective starts before the contraction and reaches over it: the
 * written-out word is one adjective, not a noun and an ending. Where the
 * contraction is in katakana, the adjective starts no earlier than that
 * katakana does, at `from`.
 */
export function adjectiveOver(placed: readonly Placed[], at: [number, number], from?: number): boolean {
  return placed.some((p) => p.adjective && p.start < at[0] && p.end >= at[1] && (from === undefined || p.start >= from));
}

/** Whether a word that is no adjective reaches over the place: くらい, おまえ. */
const otherWordOver = (placed: readonly Placed[], at: [number, number]): boolean =>
  placed.some((p) => p.known && !p.adjective && p.start < at[0] && p.end >= at[1]);

/**
 * `text` read again with its katakana adjectives and its contracted ones
 * written out, if that is what they are: the words analysed, each paired with
 * where it stands in what was written (the surfaces are the analyser's of the
 * written-out text, the same length as the original), or null where nothing
 * changed.
 */
export function reread<W extends Word>(text: string, analyse: (text: string) => W[]): { words: W[]; text: string } | null {
  let current = text;
  let words: W[] | null = null;

  // One run at a time: a name in katakana in the same line (クラウチさんはヤバい) stays as it is written.
  for (const run of runs(text)) {
    const candidate = current.slice(0, run[0]) + toHiragana(current.slice(run[0], run[1])) + current.slice(run[1]);
    const tried = analyse(candidate);
    if (!stemIn(placeAll(tried), run)) continue;
    current = candidate;
    words = tried;
  }

  let first: Placed[] | null = null;
  for (const found of contractions(current)) {
    // カレー: a katakana word the analyser knows as it is written.
    if (found.from !== undefined) {
      first ??= placeAll(analyse(text));
      if (first.some((p) => p.known && p.start < found.at[0] && p.end >= found.at[1])) continue;
    }
    for (const [k, candidate] of found.candidates.entries()) {
      const tried = analyse(candidate);
      if (!adjectiveOver(placeAll(tried), found.at, found.from)) continue;
      // The same place written another way is a word, and no adjective: くらい for くれえ, おまえ for おめえ.
      const others = k === 0 ? [found.other] : [found.candidates[0], found.other];
      if (others.some((other) => otherWordOver(placeAll(analyse(other)), found.at))) break;
      current = candidate;
      words = tried;
      break;
    }
  }
  return words ? { words, text: current } : null;
}
