/**
 * Pass 2 — fuse morphemes into the units a learner thinks in.
 *
 * Lindera is morphologically correct and pedagogically useless on its own:
 * 来た comes back as 来 + た, 勉強している as 勉強 + し + て + いる. Nobody wants
 * a card for た.
 *
 * Each merged token keeps both halves — the surface for display, the head's
 * dictionary form for matching against Anki. That split is the whole point:
 * without it, 来た never matches the 来る card you already have.
 */

export interface Morpheme {
  surface: string;
  /** IPADIC 品詞 — 動詞, 名詞, 助動詞, … */
  pos?: string;
  /** IPADIC 品詞細分類1 — サ変接続, 非自立, 接尾, … */
  pos1?: string;
  /** IPADIC 基本形 */
  lemma?: string;
  /** IPADIC 読み, katakana */
  reading?: string;
}

export interface MergedToken {
  surface: string;
  lemma?: string;
  reading?: string;
  pos?: string;
  /** The morphemes this was built from, for the inflection trace. */
  parts: string[];
  content: boolean;
}

const AUX_VERBS = new Set(['いる', 'ある', 'おく', 'しまう', 'みる', 'いく', 'くる', 'もらう', 'くれる', 'あげる']);

/**
 * Conjunctive particles that are part of a verb's conjugation, not separate
 * words: て/で (te-form), ば (conditional), たり/だり (representative listing).
 *
 * The rest of 接続助詞 join *clauses* rather than inflect a verb — が, から,
 * ので, のに, けれど, し. Attaching those would swallow the remainder of the
 * sentence into one token, so the list is a whitelist rather than a category.
 */
const CONJUGATIONAL_PARTICLES = new Set(['て', 'で', 'ば', 'たり', 'だり']);
const FUNCTION_POS = new Set(['助詞', '助動詞', '記号', 'フィラー']);

/**
 * Is this group inflecting a verb or adjective?
 *
 * The head alone is not enough: 勉強 heads a noun group until する attaches to
 * it, after which the whole thing conjugates like a verb.
 */
function isVerbal(group: Morpheme[]): boolean {
  const head = group[0];
  if (head?.pos === '動詞' || head?.pos === '形容詞') return true;
  return group.some((m) => m.pos === '動詞');
}

/** Does `cur` continue the word this `group` started? */
function attaches(group: Morpheme[], cur: Morpheme): boolean {
  const prev = group[group.length - 1]!;

  /*
   * Auxiliaries inflect verbs and adjectives — 食べ+まし+た, 来+た, 高+かっ+た —
   * and there the auxiliary is part of the conjugation.
   *
   * After a noun it is not. ワールド + です is a noun and a copula: two words a
   * learner looks up separately, and です is not an inflection of ワールド.
   */
  if (cur.pos === '助動詞') return isVerbal(group);

  // 勉強 + する / 勉強 + し
  if (cur.pos === '動詞' && prev.pos === '名詞' && prev.pos1 === 'サ変接続') return true;

  // し+て+いる, うまくいけ+ば, 行っ+たり — endings, not words.
  if (
    cur.pos === '助詞' &&
    cur.pos1 === '接続助詞' &&
    CONJUGATIONAL_PARTICLES.has(cur.surface) &&
    isVerbal(group)
  ) {
    return true;
  }

  // …て + いる, …て + しまう
  if (cur.pos === '動詞' && (cur.pos1 === '非自立' || AUX_VERBS.has(cur.lemma ?? ''))) return true;

  // 先生 + 方, 私 + たち
  if (cur.pos1 === '接尾') return true;

  // お + 金, ご + 飯
  if (prev.pos === '接頭詞') return true;

  return false;
}

export function mergeMorphemes(morphemes: Morpheme[]): MergedToken[] {
  const out: MergedToken[] = [];
  let group: Morpheme[] = [];

  const flush = (): void => {
    if (!group.length) return;

    const head = group[0]!;
    const surface = group.map((m) => m.surface).join('');
    const reading = group.every((m) => m.reading)
      ? group.map((m) => m.reading).join('')
      : undefined;

    // A サ変 noun's dictionary form is the noun plus する, not the noun alone.
    const suru = head.pos === '名詞' && head.pos1 === 'サ変接続' && group.length > 1;
    const lemma = suru ? `${head.surface}する` : (head.lemma ?? head.surface);

    out.push({
      surface,
      lemma,
      reading,
      pos: head.pos,
      parts: group.map((m) => m.surface),
      // A group is vocabulary if its head is, even when the tail is grammar.
      content: head.pos ? !FUNCTION_POS.has(head.pos) : true,
    });
    group = [];
  };

  for (const m of morphemes) {
    if (!group.length) {
      group = [m];
      continue;
    }
    // Never let a trailing particle start absorbing things.
    const head = group[0]!;
    if (!FUNCTION_POS.has(head.pos ?? '') && attaches(group, m)) {
      group.push(m);
    } else {
      flush();
      group = [m];
    }
  }
  flush();
  return out;
}
