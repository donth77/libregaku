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
  /** IPADIC 活用形 — 命令形, 未然ウ接続, 仮定形 … */
  conjForm?: string;
  /** IPADIC 活用型, on a verb — 一段, 五段・ラ行, サ変・スル … */
  conjType?: string;
  /** IPADIC 品詞 — 動詞, 名詞, 助動詞, … */
  pos?: string;
  /** IPADIC 品詞細分類1 — サ変接続, 非自立, 接尾, … */
  pos1?: string;
  /** IPADIC 基本形 */
  lemma?: string;
  /** IPADIC 読み, katakana */
  reading?: string;
  /**
   * The word in kanji, where it is written in kana and UniDic says which word
   * it is: 側 for そば, 方 for ほう (src/morphology/repair.ts). IPADIC has no
   * such thing to say.
   */
  kanji?: string;
  /**
   * The word as UniDic reads it, where that is not as IPADIC does: 金 read かね
   * where IPADIC has きん (src/morphology/repair.ts). Taken where the
   * dictionary bears it out (secondOpinions()).
   */
  second?: SecondReading;
  /** IPADIC takes the word for a country's name: 米, べい, America, as a newspaper writes it (countryNames()). */
  country?: boolean;
  /** IPADIC takes the word for a person's given name: 夏子, 時雄 (repair.ts). */
  given?: boolean;
  /**
   * A verb written in kana, in kanji as an expression of the dictionary's
   * writes it: 覚める for さめ in 目がさめた, which is 目が覚める (phrasedVerbs()).
   */
  phrased?: string;
  /** A verb written in kana: what it follows, as the dictionary is asked (followedVerbs()). */
  follows?: string;
}

/** A word in kanji as the second analyser reads it, where the first reads it another way. */
export interface SecondReading {
  /** Of the word as written, in katakana. */
  reading: string;
  /** Its dictionary form, where the two differ on that: 降る for 降り, which IPADIC takes for 降りる. */
  lemma?: string;
  conjForm?: string;
  /**
   * What kind of word it is, where the two differ on that too: 家 in 明日家に, an
   * ending to IPADIC, and 今 in 今受験生, a prefix. The word is then the second
   * analyser's whole.
   */
  pos?: string;
  pos1?: string;
  /** A word of Japanese's own, or with a part that is: かね, where きん came from Chinese. */
  native?: boolean;
}

/** One way to look a token up, with what the analyser knows about it. */
export interface LookupKey {
  key: string;
  /** Reading of `key`, in katakana — tells 私【わたし】 from 私【あたし】. */
  reading?: string;
  /** IPADIC "品詞,細分類1" — tells この the determiner from この the numeral. */
  pos?: string;
  /**
   * The analyser's name for the word, in kanji, where it is written in kana —
   * tells そば, beside (側), from そば, the noodles (蕎麦), which the dictionary
   * has under one spelling and cannot tell apart.
   */
  spelling?: string;
  /**
   * How the verb conjugates, as IPADIC names it, where the form it is in says
   * so — tells いら in いらない, 要る (五段・ラ行), from 居る (一段).
   */
  conj?: string;
  /**
   * What a verb in kana follows: a noun and its particle, ピアノ|を, a noun
   * alone, 年|, or nothing that says, ''. The dictionary knows by it which
   * verb it is: ひく after ピアノ|を is 弾く (src/dict/kana-verbs.ts).
   */
  follows?: string;
}

/** One dictionary word a written form stands for. */
export interface LexiconEntry {
  /** The dictionary's headword. */
  word: string;
  /** Its reading, in hiragana. */
  reading: string;
  /** Its first sense's JMdict part of speech codes. */
  pos?: string[];
  /** The dictionary marks the word as one in common use. */
  common?: boolean;
  /** The dictionary marks the word as usually written in kana. */
  kana?: boolean;
  /** On the first word only: the dictionary ranks it above the next for a reason, not by their order in its file. */
  leads?: boolean;
}

/**
 * What the dictionary says a written form reads as, most likely first — or
 * undefined when it has no such word. Supplied by whoever holds the
 * dictionary; merging never waits on it, and without it merely knows less.
 */
export type Lexicon = (form: string) => LexiconEntry[] | undefined;

export interface MergedToken {
  surface: string;
  lemma?: string;
  reading?: string;
  pos?: string;
  /** The morphemes this was built from, for the inflection trace. */
  parts: string[];
  /** What the endings do, in order — "conditional", "past", "polite". */
  inflections: string[];
  content: boolean;
  /** Reading of the lemma, when the analysis pins it down. */
  lemmaReading?: string;
  /** Dictionary keys to try, best first. */
  lookup: LookupKey[];
  /**
   * The dictionary form of the word as the line uses it, where the dictionary
   * lists it under another: 勉強する for 勉強しています, whose word is 勉強.
   */
  usedAs?: string;
  /**
   * A person's name that is also a word: 未来ちゃん is Miku, not the future.
   * Its reading is a guess and it is not vocabulary to learn.
   */
  name?: boolean;
  /** A name the analyser knows as one (Korean 크레이머): the card says no dictionary lists it. */
  properName?: boolean;
}

/**
 * What each ending contributes.
 *
 * The merge pass already decides which morphemes are endings; naming them is
 * nearly free from there, and it is the difference between showing a learner
 * 行け + ば and telling them it is a conditional. Keyed by dictionary form,
 * since that is what the analyser reports regardless of how it is written.
 */
const GRAMMAR: Record<string, string> = {
  // tense and politeness
  た: 'past', だ: 'past', ます: 'polite', です: 'polite',
  // negation
  ない: 'negative', ぬ: 'negative', ん: 'negative', ず: 'negative', へん: 'negative',
  // Kansai: 食べはる, someone eating who is owed respect
  はる: 'honorific',
  // 待ちたまえ, やめたまえ: an order from above, as a boss or a villain gives it
  たまえ: 'imperative',
  まい: 'negative intent',
  // conditionals
  ば: 'conditional', たら: 'conditional', なら: 'conditional',
  と: 'whenever',
  // voice: れる follows a godan or する stem, whose potential is a verb of its
  // own (待てる), so it is passive; られる is either
  れる: 'passive', られる: 'passive or potential',
  せる: 'causative', させる: 'causative',
  // desire and inclination
  たい: 'want to', たがる: 'seems to want to',
  // evidentiality
  そう: 'seems', よう: 'seems', みたい: 'seems like',
  らしい: 'apparently', べき: 'ought to', はず: 'supposed to',
  つもり: 'intends to', かもしれない: 'might',
  // connective
  て: 'te-form', で: 'te-form', たり: 'listing', だり: 'listing',
  ながら: 'while', つつ: 'while', ので: 'because', のに: 'even though',
  ため: 'in order to', ように: 'so that',
  // helper verbs
  いる: 'ongoing', おる: 'ongoing', ある: 'resulting state',
  しまう: 'completely, or regrettably',
  おく: 'in advance', みる: 'try doing',
  いく: 'going forward', くる: 'coming to be',
  もらう: 'receive the favour', くれる: 'someone does for me',
  あげる: 'do for someone', やる: 'do for someone',
  // spoken contractions, which subtitles are full of
  てる: 'ongoing', でる: 'ongoing', とく: 'in advance', どく: 'in advance',
  ちゃう: 'completely, or regrettably', じゃう: 'completely, or regrettably',
  ちまう: 'completely, or regrettably', じまう: 'completely, or regrettably',
  く: 'going forward',
  なきゃ: 'must', なくちゃ: 'must', ちゃ: 'must not',
  // after the stem: 待ち + すぎる, 待ち + やすい, 待ち + なさい
  すぎる: 'too much', 過ぎる: 'too much', やすい: 'easy to', にくい: 'hard to', づらい: 'hard to', がたい: 'hard to',
  始める: 'start to', 出す: 'start to', 続ける: 'keep on', 終わる: 'finish', 終える: 'finish',
  直す: 'again', 合う: 'each other', 切る: 'completely', 込む: 'thoroughly', 回る: 'around', まくる: 'non-stop',
  かける: 'start to', なさる: 'polite command', くださる: 'please', ほしい: 'want someone to',
};

/** Helper verbs and adjectives that follow a verb's stem as part of its form: 待ち + すぎる, 待ち + やすい. */
const STEM_HELPERS = new Set([
  'すぎる', '過ぎる', '始める', '出す', '続ける', '終わる', '終える', '直す', '合う', '切る', '込む', '回る',
  'まくる', 'かける', 'なさる', 'やすい', 'にくい', 'づらい', 'がたい',
]);

/**
 * Endings whose surface says more than their dictionary form.
 *
 * たら and なら are the 仮定形 of た and だ, so by dictionary form they read
 * as "past"; なきゃ is a form of ない, which reads as "negative". Each is
 * really a conditional or an obligation, and the surface is what says so.
 */
const SURFACE_GRAMMAR: Record<string, string> = {
  たら: 'conditional', だら: 'conditional', なら: 'conditional',
  なきゃ: 'must', なくちゃ: 'must',
};

/**
 * Forms carried by the conjugation itself rather than by a separate morpheme.
 *
 * An imperative or a volitional has no ending to look up — 行け and 行こう are
 * inflections of 行く with nothing appended — so they are invisible to a table
 * keyed on morphemes. IPADIC records them in 活用形, which is why that column
 * is now read.
 */
function fromConjugation(m: Morpheme): string | null {
  const f = m.conjForm ?? '';
  if (f.startsWith('命令')) return 'imperative';
  if (f === '未然ウ接続') return 'volitional';
  if (f === '仮定形') return null;   // the ば that follows already says so
  return null;
}

/** What one ending contributes, given what comes before and after it, or null for nothing. */
function labelAt(morphemes: Morpheme[], i: number, out: string[]): string | null {
  const m = morphemes[i]!;
  const prev = morphemes[i - 1];
  const next = morphemes[i + 1];
  const lemma = m.lemma ?? m.surface;
  // だろう, でしょう: a guess, not a past or a politeness alone.
  if ((lemma === 'だ' || lemma === 'です') && next?.lemma === 'う' && next.pos === '助動詞') return 'probably';
  // The う of だろう and ましょう: already said, by the form before it.
  if (lemma === 'う' && m.pos === '助動詞') return null;
  if (lemma === 'だ' && !SURFACE_GRAMMAR[m.surface]) {
    // 読ん + だ is the past; そう + だ, べき + だ is "is".
    return prev?.pos === '動詞' ? 'past' : null;
  }
  // 待たさ + れる after a causative is the causative-passive: made to wait.
  if ((lemma === 'れる' || lemma === 'られる') && out.includes('causative')) return 'passive';
  // 来ら + れる is 来られる, which is as often "can come".
  if (lemma === 'れる' && prev?.lemma === '来る') return 'passive or potential';
  // 待つ + そう + だ is hearsay, "I hear"; 待ち + そう is "looks like".
  if (m.surface === 'そう' && m.pos1 === '特殊') return 'hearsay';
  // 食べなくちゃ: なく + ちゃ is an obligation, not a negative and a ban.
  if ((m.surface === 'ちゃ' || m.surface === 'じゃ') && prev?.surface === 'なく') {
    const neg = out.lastIndexOf('negative');
    if (neg >= 0) out.splice(neg, 1);
    return 'must';
  }
  // 待たず + に: without doing it.
  if (m.surface === 'に' && prev?.surface === 'ず') {
    const neg = out.lastIndexOf('negative');
    if (neg >= 0) out.splice(neg, 1);
    return 'without';
  }
  return SURFACE_GRAMMAR[m.surface] ?? GRAMMAR[lemma] ?? GRAMMAR[m.surface] ?? null;
}

function grammarOf(morphemes: Morpheme[]): string[] {
  const out: string[] = [];

  for (const [i, m] of morphemes.entries()) {
    // The head is the word itself, not an ending — but its own conjugation
    // still carries meaning when nothing follows it.
    if (i > 0) {
      const label = labelAt(morphemes, i, out);
      if (label && !out.includes(label)) out.push(label);
    }
    // なさい and ください are their own requests, not a bare imperative.
    if (m.lemma === 'なさる' || m.lemma === 'くださる') continue;
    const conj = fromConjugation(m);
    if (conj && !out.includes(conj)) out.push(conj);
  }

  return out;
}

const AUX_VERBS = new Set(['いる', 'ある', 'おく', 'しまう', 'みる', 'いく', 'くる', 'もらう', 'くれる', 'あげる']);

/**
 * Spoken contractions of て + helper. IPADIC emits them as 非自立 verbs with
 * no て in front — 食べ + てる, 行っ + ちゃう, 見 + とく — so the helper-verb
 * rule, which waits for て, never saw them.
 */
const CONTRACTIONS = new Set(['てる', 'でる', 'ちゃう', 'じゃう', 'ちまう', 'じまう', 'とく', 'どく']);

/**
 * Conjunctive particles that are part of a verb's conjugation, not separate
 * words: て/で (te-form), ば (conditional), たり/だり (representative listing),
 * ちゃ/じゃ (contracted ては/では).
 *
 * The rest of 接続助詞 join *clauses* rather than inflect a verb — が, から,
 * ので, のに, けれど, し. Attaching those would swallow the remainder of the
 * sentence into one token, so the list is a whitelist rather than a category.
 */
const CONJUGATIONAL_PARTICLES = new Set(['て', 'で', 'ば', 'たり', 'だり', 'ちゃ', 'じゃ', 'ながら', 'つつ']);
const FUNCTION_POS = new Set(['助詞', '助動詞', '記号', 'フィラー']);

/*
 * ござる — the polite "to be" of ございます — is a word, though IPADIC files it
 * as an auxiliary after an interjection or a copula: ありがとう + ござい + まし
 * + た, こちら + で + ござい + ます. As an auxiliary it was grammar: never
 * underlined or looked up, and ありがとうございました lost the entry JMdict
 * has for it. So it joins the interjection, or the で, into one expression,
 * and on its own it is a verb.
 */
const isGozaru = (m: Morpheme): boolean => m.lemma === 'ござる';
const isCopulaDe = (m: Morpheme | undefined): boolean => m?.surface === 'で' && m.lemma === 'だ';
/** Function words — but not ござる, whatever IPADIC calls it. */
const functional = (m: Morpheme | undefined): boolean =>
  Boolean(m && FUNCTION_POS.has(m.pos ?? '') && !isGozaru(m));

/**
 * Is this group inflecting a verb or adjective?
 *
 * The head alone is not enough: 勉強 heads a noun group until する attaches to
 * it, after which the whole thing conjugates like a verb.
 */
function isVerbal(group: Morpheme[]): boolean {
  const head = group[0];
  if (head?.pos === '動詞' || head?.pos === '形容詞') return true;
  // ござる conjugates — ございました — whatever IPADIC calls it.
  return group.some((m) => m.pos === '動詞' || isGozaru(m));
}

/** Does `cur` continue the word this `group` started? */
function attaches(group: Morpheme[], cur: Morpheme): boolean {
  const prev = group[group.length - 1]!;

  // A dash that opens a line of dialogue, -そう, is a mark, not a noun for a suffix to attach to. (ー, in おめーら, is
  // part of a word, and ・ between numbers joins them.)
  if (prev.pos === '記号' || /^[-‐‑–—―−－]+$/.test(prev.surface)) return false;

  // ありがとう + ござい, で + ござい: the set phrases ございます makes.
  if (isGozaru(cur) && (prev.pos === '感動詞' || isCopulaDe(prev))) return true;

  /*
   * Auxiliaries inflect verbs and adjectives — 食べ+まし+た, 来+た, 高+かっ+た —
   * and there the auxiliary is part of the conjugation.
   *
   * After a noun it is not. ワールド + です is a noun and a copula: two words a
   * learner looks up separately, and です is not an inflection of ワールド.
   */
  // 楽しそう + だ: そう after a stem is "seems", a word that is done; the だ, です or でし after it is the
  // copula, a word of its own (楽しそうだね is 楽しそう, だ, ね). After the plain form it is hearsay, and だ is
  // part of it (待つそうだ), which IPADIC tags そう differently.
  if (cur.pos === '助動詞' && prev.surface === 'そう' && prev.pos1 === '接尾') return false;

  if (cur.pos === '助動詞') return isVerbal(group);

  /*
   * 勉強 + する / 勉強 + し — and only する. Any verb used to qualify, so when
   * speech dropped a particle, 勉強(を)頑張って became one word looked up as
   * 勉強する, and 頑張る could not be reached at all.
   */
  if (cur.pos === '動詞' && cur.lemma === 'する' && prev.pos === '名詞' && prev.pos1 === 'サ変接続') return true;

  // し+て+いる, うまくいけ+ば, 行っ+たり, 待ち+ながら — endings, not words.
  // たり is a 並立助詞 to IPADIC, the rest 接続助詞.
  if (
    cur.pos === '助詞' &&
    (cur.pos1 === '接続助詞' || cur.pos1 === '並立助詞') &&
    CONJUGATIONAL_PARTICLES.has(cur.surface) &&
    isVerbal(group)
  ) {
    return true;
  }

  // 待ち + すぎる, 待ち + やすい, 待ち + なさい: a helper on the stem, where the
  // dictionary has no compound for the two (joinCompoundVerbs).
  if (
    (cur.pos === '動詞' || cur.pos === '形容詞') && cur.pos1 === '非自立' && STEM_HELPERS.has(cur.lemma ?? '') &&
    prev.pos === '動詞' && prev.conjForm === '連用形'
  ) {
    return true;
  }

  // 待って + ほしい: wanting someone to do it.
  if (cur.pos === '形容詞' && cur.lemma === 'ほしい' && (prev.surface === 'て' || prev.surface === 'で')) return true;

  // 待つ + そう + だ: hearsay, after a verb as it ends a sentence.
  if (cur.surface === 'そう' && cur.pos1 === '特殊' && isVerbal(group)) return true;

  // 待たず + に: "without", part of the negative.
  if (cur.surface === 'に' && cur.pos === '助詞' && prev.surface === 'ず' && isVerbal(group)) return true;

  /*
   * 補助動詞 — helper verbs — only ever follow the て-form: 持って+いく,
   * して+しまう. Without that requirement いく attached to anything before it,
   * so うまく + いけ merged and the group took the adjective's dictionary form:
   * hovering うまくいけば produced 上手い.
   */
  if (
    cur.pos === '動詞' &&
    (cur.pos1 === '非自立' || AUX_VERBS.has(cur.lemma ?? '')) &&
    (prev.surface === 'て' || prev.surface === 'で')
  ) {
    return true;
  }

  // 知っ + てる, し + ちゃっ + た: the contraction already contains its て.
  if (cur.pos === '動詞' && cur.pos1 === '非自立' && CONTRACTIONS.has(cur.lemma ?? '') && isVerbal(group)) {
    return true;
  }

  // 二 + 十 + 歳: IPADIC gives each figure of a numeral its own morpheme.
  if (cur.pos1 === '数' && prev.pos1 === '数') return true;

  // 先生 + 方, 私 + たち, 3 + 人
  if (cur.pos1 === '接尾') return true;

  // お + 金, ご + 飯, 第 + 3 — but never a prefix swallowing a particle.
  if (prev.pos === '接頭詞' && !FUNCTION_POS.has(cur.pos ?? '')) return true;

  return false;
}

/**
 * Corrections to the analyser's own choices, applied before merging.
 *
 * 行っ is both 行く and 行う in IPADIC's eyes, and it picks 行う often enough
 * — 昨日行ったよ — to read "went" as "carried out", with ruby おこなった.
 * In speech it is 行く far more often than not.
 */
function normalise(m: Morpheme): Morpheme {
  if (m.lemma === '行う' && m.surface.startsWith('行っ')) {
    return { ...m, lemma: '行く', reading: `イ${m.surface.slice(1).replace(/っ/g, 'ッ')}` };
  }
  return m;
}

function groups(morphemes: Morpheme[]): Morpheme[][] {
  const out: Morpheme[][] = [];
  let group: Morpheme[] = [];
  for (const m of morphemes.map(normalise)) {
    // Never let a trailing particle start absorbing things — except the で
    // of でございます, which ござる joins, and a group ござる is part of.
    const opens = !functional(group[0]) || group.some(isGozaru) || (group.length === 1 && isCopulaDe(group[0]) && isGozaru(m));
    if (group.length && opens && attaches(group, m)) {
      group.push(m);
    } else {
      if (group.length) out.push(group);
      group = [m];
    }
  }
  if (group.length) out.push(group);
  return out;
}

/* ── Readings and lemmas ─────────────────────────────────────────── */

const KANA_ONLY = /^[ぁ-ゖァ-ヺー・ゝゞヽヾ]*$/;
const toKatakana = (s: string): string =>
  s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

const posOf = (m: Morpheme): string | undefined => (m.pos ? (m.pos1 ? `${m.pos},${m.pos1}` : m.pos) : undefined);

/**
 * The reading of a morpheme's dictionary form, from the reading of its
 * inflected one: 行っ read イッ is 行く read イク, 開い read ヒライ is 開く
 * read ヒラク. What lets a lookup of 開く pick ひらく rather than あく.
 */
export function lemmaReadingOf(m: Morpheme): string | undefined {
  const { surface, lemma, reading } = m;
  if (!lemma || !reading) return undefined;
  if (lemma === surface) return reading;
  if (KANA_ONLY.test(lemma)) return toKatakana(lemma);
  if (lemma === '来る') return 'クル';   // 来 reads キ or コ; the verb is クル
  let n = 0;
  while (n < surface.length && n < lemma.length && surface[n] === lemma[n]) n++;
  const tail = surface.slice(n);
  const lemmaTail = lemma.slice(n);
  if (!n || !KANA_ONLY.test(tail) || !KANA_ONLY.test(lemmaTail)) return undefined;
  const kanaTail = toKatakana(tail);
  if (!reading.endsWith(kanaTail)) return undefined;
  return reading.slice(0, reading.length - kanaTail.length) + toKatakana(lemmaTail);
}

const FULL_WIDTH = (s: string): string =>
  s.replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));

const KANJI_DIGITS = '〇一二三四五六七八九';

/** 2 → 二, 10 → 十, 24 → 二十四. Only up to 99, where JMdict has compounds. */
function kanjiNumerals(s: string): string | null {
  let ok = true;
  const out = s.replace(/[0-9０-９]+/g, (run) => {
    const n = Number(run.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0)));
    if (!Number.isInteger(n) || n < 1 || n > 99) {
      ok = false;
      return run;
    }
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return (tens ? `${tens > 1 ? KANJI_DIGITS[tens] : ''}十` : '') + (ones ? KANJI_DIGITS[ones] : '');
  });
  return ok && out !== s ? out : null;
}

/** Spellings to try for a run of morphemes, and whether each was converted. */
function variants(raw: string, numeric: boolean): Array<[string, boolean]> {
  const out: Array<[string, boolean]> = [[raw, false]];
  if (numeric) {
    // JMdict files some compounds under full-width figures: １０分 is its own
    // entry, "ten minutes", where 十分 is also "enough".
    const wide = FULL_WIDTH(raw);
    if (wide !== raw) out.push([wide, true]);
    const kanji = kanjiNumerals(raw);
    if (kanji) out.push([kanji, true]);
  }
  return out.filter(([form]) => !KANA_ONLY.test(form));
}

/** Where a word could lie inside a noun group, longest first. */
function spans(group: Morpheme[]): Array<{ i: number; j: number; numeric: boolean }> {
  const core = Math.max(0, group.findIndex((m) => m.pos !== '接頭詞'));
  const numeric = group.some((m) => m.pos1 === '数');
  const out: Array<{ i: number; j: number; numeric: boolean }> = [];
  for (let j = group.length - 1; j >= core; j--) {
    for (const i of core > 0 ? [0, core] : [0]) {
      if (j > i) out.push({ i, j, numeric });
    }
  }
  return out;
}

const join = (group: Morpheme[], i: number, j: number): string =>
  group.slice(i, j + 1).map((m) => m.surface).join('');

/** Counter-like senses: 十分 as "ten minutes" is a noun; as "enough" it is not. */
const NOUNISH = new Set(['n', 'num', 'ctr', 'n-adv', 'n-t', 'n-suf', 'suf']);

interface Found {
  i: number;
  j: number;
  form: string;
  /** Present when the form reads exactly one way. */
  entry?: LexiconEntry;
}

/**
 * The longest run of the group the dictionary knows as one word.
 *
 * A converted spelling only counts when it is unambiguous: 2人 is certainly
 * 二人【ふたり】, but 1日 is いちにち or ついたち, and a guess there would put
 * the wrong reading over it. A form found as written but with several readings
 * still names the word; it just does not get a reading.
 *
 * `seen` collects the ambiguous spellings passed over on the way, which are
 * still worth looking up: 一日 says more about 1日 than 日 alone does.
 */
function resolve(group: Morpheme[], lexicon: Lexicon | undefined, seen: string[]): Found | null {
  if (!lexicon) return null;
  for (const { i, j, numeric } of spans(group)) {
    for (const [form, converted] of variants(join(group, i, j), numeric)) {
      const hits = lexicon(form)?.filter((e) => !numeric || !e.pos || e.pos.some((p) => NOUNISH.has(p)));
      if (!hits?.length) continue;
      if (hits.length === 1) return { i, j, form, entry: hits[0] };
      if (!converted) return { i, j, form };
      seen.push(form);
    }
  }
  return null;
}

/** Katakana reading of the whole group, given one for the run i..j. */
function around(group: Morpheme[], i: number, j: number, inner: string): string | undefined {
  const outside = [...group.slice(0, i), ...group.slice(j + 1)];
  if (outside.some((m) => !m.reading)) return undefined;
  return (
    group.slice(0, i).map((m) => m.reading).join('') +
    inner +
    group.slice(j + 1).map((m) => m.reading).join('')
  );
}

function lookupKeys(...keys: Array<[string | undefined, string | undefined, string | undefined]>): LookupKey[] {
  const out: LookupKey[] = [];
  for (const [key, reading, pos] of keys) {
    if (!key || out.some((k) => k.key === key)) continue;
    out.push({ key, ...(reading ? { reading } : {}), ...(pos ? { pos } : {}) });
  }
  return out;
}

/*
 * Potential verbs. IPADIC lists 保てる, 会える, 帰れる as verbs of their own,
 * each its own dictionary form, but JMdict files nearly all of them under the
 * godan verb they come from: it has 保つ and no 保てる. So the potential is
 * undone — the e-row kana before る goes back to the u-row — and the
 * dictionary has to agree that what comes out is a godan verb of that row.
 * れる also takes the spoken potential that drops ら, 見れる and 来れる, back
 * to an ichidan or くる verb.
 */
const POTENTIAL: Record<string, { kana: string; reading: string; classes: string[] }> = {
  え: { kana: 'う', reading: 'ウ', classes: ['v5u', 'v5u-s'] },
  け: { kana: 'く', reading: 'ク', classes: ['v5k', 'v5k-s'] },
  げ: { kana: 'ぐ', reading: 'グ', classes: ['v5g'] },
  せ: { kana: 'す', reading: 'ス', classes: ['v5s'] },
  て: { kana: 'つ', reading: 'ツ', classes: ['v5t'] },
  ね: { kana: 'ぬ', reading: 'ヌ', classes: ['v5n'] },
  べ: { kana: 'ぶ', reading: 'ブ', classes: ['v5b'] },
  め: { kana: 'む', reading: 'ム', classes: ['v5m'] },
  れ: { kana: 'る', reading: 'ル', classes: ['v5r', 'v5r-i', 'v1', 'vk'] },
};

interface Potential {
  word: string;
  reading?: string;
  /** JMdict conjugation classes the word must have for this to be its potential. */
  classes: string[];
}

/** The verb a potential-shaped verb would be the potential of: 保てる → 保つ. */
function potentialOf(m: Morpheme, lemmaReading: string | undefined): Potential | undefined {
  const lemma = m.lemma;
  if (m.pos !== '動詞' || m.pos1 !== '自立' || !lemma || lemma.length < 3 || !lemma.endsWith('る')) return undefined;
  const row = POTENTIAL[lemma[lemma.length - 2]!];
  if (!row) return undefined;
  const word = lemma.slice(0, -2) + row.kana;
  const reading = word === '来る' ? 'クル'
    : lemmaReading?.endsWith('ル') ? lemmaReading.slice(0, -2) + row.reading : undefined;
  return { word, reading, classes: row.classes };
}

/** The dictionary has `p.word` as a verb of the right class, and nothing under the potential itself. */
function confirmed(p: Potential, lemma: string, lexicon: Lexicon | undefined): boolean {
  if (!lexicon || lexicon(lemma)?.length) return false;
  return Boolean(lexicon(p.word)?.some((e) => e.pos?.some((code) => p.classes.includes(code))));
}

/*
 * Kanji compounds the analyser split but the dictionary has whole. IPADIC
 * knows 灯篭 and not 灯籠, so 灯籠 comes back as 灯 + 籠, read あかり and かご;
 * JMdict has it, read とうろう. A run of kanji nouns with a lone kanji among
 * them is asked about whole, and joined where the dictionary has the word —
 * with the dictionary's reading, since the parts' readings are what went
 * wrong. Names and numbers stay out: 田中 + 家 is not a compound to look for.
 */
const KANJI_ONLY = /^[\u4E00-\u9FFF\u3400-\u4DBF々〆ヶ]+$/u;
const COMPOUND_POS1 = new Set(['一般', '接尾', 'サ変接続', '形容動詞語幹', '副詞可能']);
/** Characters, at most: 石灯籠, 灯籠流し are as long as it is worth reaching. */
const COMPOUND_MAX = 4;
const KATAKANA_ONLY = /^[ァ-ヺー]+$/;
/** Characters, at most, of a loanword written as one: ワンルームマンション. */
const KATAKANA_MAX = 12;

function compoundable(m: Morpheme): boolean {
  if (!KANJI_ONLY.test(m.surface)) return false;
  // 日本 + 中, 日 + 米: a country's name is the one name that makes words — 日本中, にほんじゅう, and 日米.
  if (m.pos === '名詞') return COMPOUND_POS1.has(m.pos1 ?? '') || Boolean(m.country);
  // IPADIC also splits a compound it does not know into one-kanji verb stems
  // in this form: 盗撮 comes back as 盗(る) + 撮(る), each read と.
  return m.pos === '動詞' && m.surface.length === 1 && (m.conjForm ?? '').startsWith('体言接続特殊');
}

/**
 * A numeral before a lone kanji IPADIC has no reading for: 二択, 三択. The
 * kanji is a counter of sorts, unknown to it, so the pair is split with the
 * kanji unread. Only that: numbers with words IPADIC knows are merged as
 * counters already, and 一日 stays as the numeral group reads it.
 */
function numberBeforeUnread(run: Morpheme[], k: number): boolean {
  const next = run[k + 1];
  return run.length === 2 && k === 0 && run[0]?.pos1 === '数' && KANJI_ONLY.test(run[0].surface) &&
    next !== undefined && !next.reading && next.surface.length === 1 && compoundable(next);
}

/** The run i..j, written out, if it could be a compound split apart: else undefined. */
function compoundAt(morphemes: Morpheme[], i: number, j: number): string | undefined {
  const run = morphemes.slice(i, j + 1);
  // ワン + シーン: loanwords written as one, which either analyser cuts where it knows the halves.
  if (run.length >= 2 && run.length <= 3 && run.every((m) => m.pos === '名詞' && KATAKANA_ONLY.test(m.surface))) {
    const whole = run.map((m) => m.surface).join('');
    return whole.length <= KATAKANA_MAX ? whole : undefined;
  }
  if (run.length < 2 || !run.every((m, k) => compoundable(m) || numberBeforeUnread(run, k)) || !run.some((m) => m.surface.length === 1)) return undefined;
  const form = run.map((m) => m.surface).join('');
  return form.length <= COMPOUND_MAX ? form : undefined;
}

/** Every run worth asking the dictionary about whole. */
function compoundQueries(morphemes: Morpheme[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < morphemes.length; i++) {
    for (let j = i + 1; j < morphemes.length && j < i + COMPOUND_MAX; j++) {
      const form = compoundAt(morphemes, i, j);
      if (form) out.push(form);
    }
  }
  return out;
}

/** The morphemes, with each compound the dictionary has put back together — the longest it has. */
function joinCompounds(morphemes: Morpheme[], lexicon: Lexicon | undefined): Morpheme[] {
  if (!lexicon) return morphemes;
  const out: Morpheme[] = [];
  for (let i = 0; i < morphemes.length;) {
    let joined: Morpheme | undefined;
    let next = i + 1;
    for (let j = Math.min(morphemes.length - 1, i + COMPOUND_MAX - 1); j > i && !joined; j--) {
      const form = compoundAt(morphemes, i, j);
      const hits = form ? lexicon(form) : undefined;
      if (!form || !hits?.length) continue;
      // One reading, or none: 一日 is いちにち or ついたち, and guessing is worse than not saying.
      const readings = new Set(hits.map((h) => h.reading));
      joined = {
        // イメージ + チェンジ + した: what takes する still does, joined.
        surface: form, lemma: form, pos: '名詞', pos1: morphemes[j]?.pos1 === 'サ変接続' ? 'サ変接続' : '一般',
        reading: readings.size === 1 ? toKatakana(hits[0]!.reading) : undefined,
      };
      next = j + 1;
    }
    out.push(joined ?? morphemes[i]!);
    i = next;
  }
  return out;
}

/*
 * Compound verbs the analyser split. IPADIC knows most as words — 書き込む,
 * 振り返る, 落ち込む — but splits a few into a stem and one of its helper
 * verbs: 入れ込む came back as 入れ + 込む, two words looked up apart. Where
 * JMdict has the compound as a verb, the two are one word again; where it
 * does not — 食べ始める, 読み終わる — they stay as they are.
 */

/**
 * The compound a verb stem and the helper verb after it would make: 入れ + 込ん
 * → 入れ込む. Not the helpers that are grammar — 来てる is 来る ongoing, not a
 * verb 来てる — and not a stem of する: 賞賛し合う is 賞賛する + 合う, and
 * joining し + 合う took the する from 賞賛.
 */
function compoundVerbAt(morphemes: Morpheme[], i: number): string | undefined {
  const stem = morphemes[i];
  const helper = morphemes[i + 1];
  if (!stem || !helper || stem.pos !== '動詞' || stem.pos1 !== '自立' || stem.conjForm !== '連用形') return undefined;
  if (stem.lemma === 'する') return undefined;
  if (helper.pos !== '動詞' || helper.pos1 !== '非自立' || !helper.lemma) return undefined;
  if (AUX_VERBS.has(helper.lemma) || CONTRACTIONS.has(helper.lemma)) return undefined;
  return stem.surface + helper.lemma;
}

const VERB_CODE = /^v(1|5|k|s-i|z)/;

function joinCompoundVerbs(morphemes: Morpheme[], lexicon: Lexicon | undefined): Morpheme[] {
  if (!lexicon) return morphemes;
  const out: Morpheme[] = [];
  for (let i = 0; i < morphemes.length; i++) {
    const form = compoundVerbAt(morphemes, i);
    const stem = morphemes[i]!;
    const helper = morphemes[i + 1];
    if (form && helper && lexicon(form)?.some((e) => e.pos?.some((p) => VERB_CODE.test(p)))) {
      out.push({
        surface: stem.surface + helper.surface,
        lemma: form,
        reading: stem.reading && helper.reading ? stem.reading + helper.reading : undefined,
        pos: '動詞', pos1: '自立', conjForm: helper.conjForm,
      });
      i++;
      continue;
    }
    out.push(stem);
  }
  return out;
}

/**
 * A verb stem made a noun by a noun suffix: 食べ + 放題, 使い + 方. Not the
 * voice endings — させる, られる are suffixes too in IPADIC, but verbs.
 */
function nounSuffixed(group: Morpheme[]): boolean {
  const last = group[group.length - 1];
  return group.length > 1 && last?.pos === '名詞' && last.pos1 === '接尾';
}

/** The noun of a group that is a noun made a verb by する: 勉強 of 勉強 + し + て + いる. */
function suruNoun(group: Morpheme[]): Morpheme | undefined {
  const at = Math.max(0, group.findIndex((m) => m.pos !== '接頭詞'));
  const [lead, next] = [group[at], group[at + 1]];
  return lead?.pos === '名詞' && lead.pos1 === 'サ変接続' && next?.pos === '動詞' && next.lemma === 'する' ? lead : undefined;
}

/*
 * A name followed by the ending a person's name takes. IPADIC tags 未来 a
 * proper noun here, and it is also the word for the future; the dictionary
 * has the word, and its reading is not the name's (みく). A proper noun is
 * taken for a name, and a common one only before ちゃん or くん, so 運転手さん
 * and 赤ちゃん are what they were.
 */
const PERSON_SUFFIX = new Set(['ちゃん', 'くん', '君', 'さん', '様', 'さま', '殿']);

/** Words IPADIC may tag as a name and an ending, which are words: never taken for a name. */
const WORDS_WITH_SUFFIX = new Set([
  '赤ちゃん', '坊ちゃん', '嬢ちゃん', 'お嬢ちゃん', '姉ちゃん', '兄ちゃん', 'お姉ちゃん', 'お兄ちゃん',
  '爺ちゃん', '婆ちゃん', '父ちゃん', '母ちゃん', 'おじいちゃん', 'おばあちゃん', 'おじちゃん', 'おばちゃん',
  '神様', '仏様', '王様', '殿様', '奥様', '皆様', '皆さん', 'お客様', 'お客さん', '旦那様', '旦那さん', '奥さん',
]);

function namedLike(group: Morpheme[]): boolean {
  const [head, tail] = group;
  if (group.length !== 2 || head?.pos !== '名詞' || tail?.pos1 !== '接尾' || !PERSON_SUFFIX.has(tail.surface)) return false;
  if (WORDS_WITH_SUFFIX.has(head.surface + tail.surface)) return false;
  // A proper noun, as IPADIC tags 未来 there; or, where an analyser has no names to tag (UniDic's 未来 is a
  // common noun), a common one before the endings of a child's or a friend's name, ちゃん and くん. Not さん:
  // 運転手さん and お客さん are not names.
  return head.pos1 === '固有名詞' || (head.pos1 === '一般' && ['ちゃん', 'くん', '君'].includes(tail.surface));
}

/**
 * Written forms merging would like the dictionary's view of: noun groups
 * built from a prefix, a number, or suffixes, whose word — and whose reading
 * — the morphemes alone cannot give. Ask for these, then merge with the
 * answers.
 */
export function lexiconQueries(morphemes: Morpheme[]): string[] {
  const out = new Set(queriesFor(morphemes));
  // 米は: what the dictionary has under a country's one-letter name that stands as a word.
  morphemes.forEach((m, i) => {
    if (standsAlone(morphemes, i)) out.add(m.surface);
  });
  if (!morphemes.some((m) => m.second)) return [...out];
  // A word the two analysers read differently: which words the dictionary has under the spelling, and what
  // the line would ask about read the other way, since which reading is merged waits on the answer.
  for (const form of queriesFor(morphemes.map((m) => (m.second ? taking(m, m.second) : m)))) out.add(form);
  morphemes.forEach((m, i) => {
    if (!m.second) return;
    out.add(m.second.lemma ?? m.lemma ?? m.surface).add(m.lemma ?? m.surface);
    const whole = affixed(morphemes, i);
    if (whole) out.add(whole);
    for (const form of expressionsAt(morphemes, i)) out.add(form);
    const potential = potentialOf(m, undefined);
    if (potential && m.lemma) out.add(m.lemma).add(potential.word);
  });
  return [...out];
}

function queriesFor(morphemes: Morpheme[]): string[] {
  const out = new Set<string>(compoundQueries(morphemes));
  // 食べ放題: whether a verb's stem and the noun after it are one word.
  morphemes.forEach((m, i) => {
    const noun = morphemes[i + 1];
    if (m.pos === '動詞' && m.conjForm === '連用形' && noun?.pos === '名詞' && noun.pos1 === '一般' && KANJI_ONLY.test(noun.surface)) {
      out.add(m.surface + noun.surface);
    }
  });
  // 言いはる: whether the stem and 張る make a verb, which is not the Kansai honorific.
  morphemes.forEach((m, i) => {
    const stem = morphemes[i - 1];
    if (m.lemma === 'はる' && m.pos === '動詞' && stem?.pos === '動詞') out.add(`${stem.surface}張る`);
  });
  // 旅する: whether the dictionary has a noun's する verb as a word of its own. Asked of any noun before する,
  // since which of them する joins is settled later (マネして, in spoken()).
  morphemes.forEach((m, i) => {
    const verb = morphemes[i + 1];
    if (m.pos === '名詞' && verb?.pos === '動詞' && verb.lemma === 'する') out.add(`${m.surface}する`);
  });
  // 今世紀: whether the dictionary has 今 and the noun after it as a word, which is then こん and not いま.
  morphemes.forEach((m, i) => {
    const noun = morphemes[i + 1];
    if (m.surface === '今' && m.pos === '接頭詞' && noun) out.add(`今${noun.surface}`);
    // 今朝家: whether 今 and the noun's first letter are a time word, and the rest a word (spoken()).
    if (m.surface === '今' && m.pos === '接頭詞' && noun && noun.surface.length > 1) out.add(`今${noun.surface[0]}`).add(noun.surface.slice(1)).add(noun.surface);
  });

  // 目がさめる: whether a verb in kana and the noun before it are an expression, which says which verb it is.
  morphemes.forEach((_, i) => {
    for (const { form } of phrasesAt(morphemes, i)) out.add(form);
  });
  // 就活: a kanji word IPADIC has no reading for, whose reading the dictionary has.
  for (const m of morphemes) if (!m.reading && m.pos === '名詞' && KANJI_ONLY.test(m.surface)) out.add(m.surface);
  for (let i = 0; i < morphemes.length; i++) {
    const verb = compoundVerbAt(morphemes, i);
    if (verb) out.add(verb);
  }
  for (const group of groups(morphemes)) {
    // 保てる: whether the dictionary has it, and whether it has 保つ.
    const potential = group[0] ? potentialOf(group[0], undefined) : undefined;
    if (potential && group[0]?.lemma) out.add(group[0].lemma).add(potential.word);
    if (group.length < 2) continue;
    if (isVerbal(group)) {
      // 食べ + 放題, 使い + 方: a verb stem made into a noun by a suffix.
      if (nounSuffixed(group)) {
        for (const [form] of variants(join(group, 0, group.length - 1), false)) out.add(form);
      }
      continue;
    }
    for (const { i, j, numeric } of spans(group)) {
      for (const [form] of variants(join(group, i, j), numeric)) out.add(form);
    }
    // 未来ちゃん: whether the name is also a word.
    if (namedLike(group)) out.add(group[0]!.surface);
  }
  return [...out];
}

function merge(group: Morpheme[], lexicon: Lexicon | undefined): MergedToken {
  const head = group[0]!;
  // A prefix is never the word: お金 is not a kind of お.
  const at = Math.max(0, group.findIndex((m) => m.pos !== '接頭詞'));
  const lead = group[at]!;
  const surface = group.map((m) => m.surface).join('');
  // A kanji word IPADIC has no reading for (就活) takes the dictionary's, where that is one reading.
  const readOf = (m: Morpheme): string | undefined => {
    if (m.reading) return m.reading;
    const hits = m.pos === '名詞' && KANJI_ONLY.test(m.surface) ? lexicon?.(m.surface) : undefined;
    const readings = new Set((hits ?? []).map((h) => h.reading));
    return readings.size === 1 ? toKatakana([...readings][0]!) : undefined;
  };
  const reading = group.every((m) => readOf(m)) ? group.map((m) => readOf(m)).join('') : undefined;
  const common = {
    surface,
    parts: group.map((m) => m.surface),
    inflections: grammarOf(group),
    // A group is vocabulary if its head is, even when the tail is grammar.
    content: head.pos ? !functional(head) || group.some(isGozaru) : true,
  };

  /*
   * ございます and what it makes: ありがとう + ございました is ありがとうございます,
   * で + ございます is でございます — both expressions JMdict has — and ござい +
   * ます on its own is ござる.
   */
  const g = group.findIndex(isGozaru);
  if (g >= 0) {
    const before = group.slice(0, g);
    const lemma = before.length ? `${before.map((m) => m.surface).join('')}ございます` : 'ござる';
    const lemmaReading = before.length
      ? before.every((m) => m.reading) ? `${before.map((m) => m.reading).join('')}ゴザイマス` : undefined
      : 'ゴザル';
    return {
      ...common, content: true, lemma, reading, pos: before.length ? '表現' : '動詞', lemmaReading,
      lookup: lookupKeys(
        [lemma, lemmaReading, undefined],
        [surface, reading, undefined],
        // Failing the expression, the word it was built on.
        [before[0]?.lemma ?? before[0]?.surface, before[0]?.reading, before[0] ? posOf(before[0]) : undefined],
        ['ござる', 'ゴザル', '動詞'],
      ),
    };
  }

  /*
   * A noun made a verb by する: 勉強している, ゲームしましょう. The verb's
   * dictionary form is the noun plus する, and the word is the noun: what a
   * dictionary lists (JMdict has 勉強, marked as taking する, and no 勉強する),
   * what a card is made for, and so what is matched against Anki and marked.
   * Taken for a word of its own, 勉強している stayed new with a card for 勉強
   * in Anki, and marking it known put 勉強する in the list beside 勉強. The
   * verb's form goes with it (usedAs), for the card to show and for a card or
   * a mark written that way. Where the dictionary has the verb as a word —
   * 旅する, 恋する, 損する — that is the word.
   */
  if (suruNoun(group)) {
    const verb = `${lead.surface}する`;
    const verbReading = lead.reading ? `${lead.reading}スル` : undefined;
    // お待ちしております: IPADIC keeps the honorific noun whole, and the dictionary has only 待ち beneath the prefix.
    const bare = /^[おご][一-鿿]/.test(lead.surface) ? lead.surface.slice(1) : undefined;
    const lookup = lookupKeys(
      [verb, verbReading, '動詞'], [lead.surface, lead.reading, posOf(lead)],
      [bare, bare && lead.reading ? lead.reading.slice(1) : undefined, posOf(lead)],
    );
    if (lexicon?.(verb)?.length) return { ...common, lemma: verb, reading, pos: lead.pos, lemmaReading: verbReading, lookup };
    return { ...common, lemma: lead.surface, usedAs: verb, reading, pos: lead.pos, lemmaReading: lead.reading, lookup };
  }

  if (isVerbal(group)) {
    if (nounSuffixed(group)) {
      const hits = lexicon?.(surface);
      if (hits?.length === 1) {
        const entry = hits[0]!;
        const r = toKatakana(entry.reading);
        return {
          ...common, lemma: entry.word, reading: r, pos: '名詞', lemmaReading: r,
          lookup: lookupKeys([entry.word, r, '名詞'], [lead.lemma, lemmaReadingOf(lead), posOf(lead)]),
        };
      }
    }
    const lemma = lead.lemma ?? lead.surface;
    const lemmaReading = lemmaReadingOf(lead);
    const potential = potentialOf(lead, lemmaReading);
    if (potential && confirmed(potential, lemma, lexicon)) {
      // The word is 保つ — what a card is made for, and what status matches.
      return {
        ...common,
        inflections: ['potential', ...common.inflections.filter((g) => g !== 'potential')],
        lemma: potential.word, reading, pos: lead.pos, lemmaReading: potential.reading,
        lookup: lookupKeys(
          [potential.word, potential.reading, posOf(lead)],
          [lemma, lemmaReading, posOf(lead)],
          [surface, reading, posOf(lead)],
        ),
      };
    }
    return {
      ...common, lemma, reading, pos: lead.pos, lemmaReading,
      lookup: lookupKeys(
        [lemma, lemmaReading, posOf(lead)],
        [surface, reading, posOf(lead)],
        // Without the dictionary's word on it, 保てる may still be 保つ.
        [potential?.word, potential?.reading, posOf(lead)],
      ),
    };
  }

  if (group.length === 1) {
    const lemma = head.lemma ?? head.surface;
    const lemmaReading = lemmaReadingOf(head);
    // IPADIC keeps some honorific nouns whole — お待ち — where JMdict has
    // only the noun beneath the prefix.
    const bare = /^[おご][一-鿿]/.test(lemma) ? lemma.slice(1) : undefined;
    return {
      ...common, lemma, reading, pos: head.pos, lemmaReading,
      lookup: lookupKeys(
        [lemma, lemmaReading, posOf(head)],
        [surface, reading, posOf(head)],
        [bare, bare && lemmaReading ? lemmaReading.slice(1) : undefined, posOf(head)],
      ),
    };
  }

  /*
   * A noun group: prefix, number, suffixes. Its word is whatever the
   * dictionary knows — お寿司 or else 寿司, 運転手 out of 運転手さん, 一人 —
   * and so is its reading. Gluing the morphemes' readings together is wrong
   * exactly where it matters: 一人 is not いちにん, 一回 not いちかい, 先生方
   * not せんせいかた.
   */
  const numeric = group.some((m) => m.pos1 === '数');
  const ambiguous: string[] = [];
  const found = resolve(group, lexicon, ambiguous);
  const counter = numeric ? [...group].reverse().find((m) => m.pos1 === '接尾') : undefined;
  const coreLemma = lead.lemma ?? lead.surface;

  let lemma: string;
  let tokenReading: string | undefined;
  let lemmaReading: string | undefined;
  if (found?.entry) {
    lemma = found.entry.word;
    lemmaReading = toKatakana(found.entry.reading);
    tokenReading = around(group, found.i, found.j, lemmaReading) ?? (numeric ? undefined : reading);
  } else if (found) {
    lemma = found.form;
    tokenReading = numeric ? undefined : reading;
  } else {
    // Unknown to the dictionary, or it has not loaded: a number keeps its
    // surface and loses its reading rather than wearing a wrong one; anything
    // else is looked up by its noun.
    lemma = numeric ? surface : coreLemma;
    tokenReading = numeric ? undefined : reading;
    lemmaReading = numeric ? undefined : lemmaReadingOf(lead);
  }

  // A name that is also a word: its reading is a guess, and it is not for learning.
  const name = namedLike(group) && Boolean(lexicon?.(head.surface)?.length);

  return {
    ...common,
    ...(name ? { content: false, name: true } : {}),
    lemma,
    reading: name ? undefined : tokenReading,
    pos: lead.pos,
    lemmaReading,
    lookup: lookupKeys(
      [lemma, lemmaReading, posOf(lead)],
      [surface, tokenReading, posOf(lead)],
      ...ambiguous.map((form): [string, undefined, string | undefined] => [form, undefined, posOf(lead)]),
      // 3匹 has no entry of its own, but 匹 does, and says what it counts —
      // which is more than the number does.
      [counter?.lemma ?? counter?.surface, counter?.reading, counter ? posOf(counter) : undefined],
      [coreLemma, lemmaReadingOf(lead), posOf(lead)],
    ),
  };
}

/**
 * Two single kanji the dictionary has no word for: 事 + the suffix 談, in a
 * subtitle that meant 示談 and was typed 事談. Merged, the group was looked
 * up as its noun — 事, こと, "thing" — under all of 事談, which said
 * something the line does not. As two words, each is what it is. A longer
 * noun keeps its suffix: 学生達 is still 学生.
 */
function unknownPair(group: Morpheme[], lexicon: Lexicon | undefined): boolean {
  const [head, tail] = group;
  if (!lexicon || group.length !== 2 || !head || !tail) return false;
  if (head.pos !== '名詞' || head.pos1 === '数' || tail.pos1 !== '接尾') return false;
  if (head.surface.length !== 1 || tail.surface.length !== 1 || !KANJI_ONLY.test(head.surface + tail.surface)) return false;
  return !lexicon(head.surface + tail.surface)?.length;
}

/*
 * Forms said in more than one word: 待たなければ + ならない is "must", 待って
 * + も + いい "may". The words stay apart — ならない and いい are words of their
 * own — and the verb carries the name of what they make together, in place
 * of the pieces it would otherwise list ("negative · conditional").
 */
const MUST_FOLLOW = /^(ならない|ならぬ|ならん|なりません|いけない|いけません|だめ|ダメ)/;
const MAY_FOLLOW = /^(いい|よい|良い|かまわない|構わない|大丈夫)/;

function constructions(tokens: MergedToken[]): MergedToken[] {
  const say = (t: MergedToken, drop: string[], label: string): void => {
    t.inflections = [...t.inflections.filter((g) => !drop.includes(g)), label];
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (!t.inflections.length) continue;
    const next = tokens[i + 1]?.surface ?? '';
    const after = tokens[i + 2]?.surface ?? '';
    if (/(なければ|なけりゃ|なくては|なくちゃ|なきゃ)$/.test(t.surface) && MUST_FOLLOW.test(next)) {
      say(t, ['negative', 'conditional', 'te-form'], 'must');
    } else if (/[てで]$/.test(t.surface) && next === 'は' && MUST_FOLLOW.test(after)) {
      say(t, ['te-form'], 'must not');
    } else if (/なくて$/.test(t.surface) && next === 'も' && MAY_FOLLOW.test(after)) {
      say(t, ['negative', 'te-form'], "don't have to");
    } else if (/[てで]$/.test(t.surface) && next === 'も' && MAY_FOLLOW.test(after)) {
      say(t, ['te-form'], 'may');
    }
  }
  return tokens;
}

/*
 * A second opinion on which word a spelling is.
 *
 * 金 is かね, money, and きん, gold; 後 is あと, のち and ご; 角 is かど and かく.
 * IPADIC picks one whatever the line says — 金がない is キン to it, or キム, a
 * surname — and it takes a word for an ending or a prefix wherever one could
 * stand: 家 in 明日家に is か, as in 専門家, and 今 in 今受験生 is こん. UniDic
 * reads these better, and is no more to be trusted alone: every 米 is べい,
 * America, to it, 分別 is ぶんべつ, and 階 is きざはし, an old word for stairs.
 *
 * So a word in kanji the two read differently (repair.ts hands UniDic's
 * reading on as `second`) is UniDic's only where the dictionary has a word
 * spelled and read so, and one of three things holds. The dictionary ranks
 * that word first of the spelling's — the two of them against IPADIC. Or it
 * has no word read as IPADIC reads it, voiced or not: 金星 is カナボシ to
 * IPADIC, a surname, and 預ける アヅケル. Or the word is one of Japanese's
 * own, かね and not きん, and a common one: speech says those, where IPADIC's
 * newspapers have the reading from Chinese. Not one the dictionary says is
 * usually written in kana, though: the line wrote kanji, and 辛い is からい
 * more often than the つらい UniDic always makes it. A word IPADIC took for an
 * ending, a prefix or a name need not be common: 的 after の is まと, a
 * target, whatever the dictionary marks.
 *
 * Not a verb IPADIC reads as the potential of another: 弾ける is ひける, "can
 * play", where UniDic knows only はじける, to burst. The dictionary lists no
 * potentials, so it has nothing to say between them, and IPADIC's stands.
 * Nor an ending or a prefix that makes a word the dictionary has with what it
 * is on: 先生方 is せんせいがた, where UniDic has 方 on its own, ほう.
 *
 * Before any of that, the line itself may say. Where the word begins an
 * expression the dictionary has — 実を言うと, じつをいうと; 実を結ぶ, みをむすぶ;
 * 方がいい, ほうがいい — it reads as the expression does, whichever of the two
 * that is: 実 is み and じつ as often as each other, and nothing else tells
 * them apart.
 *
 * Measured against Tatoeba's word index, which names the dictionary word for
 * each word of its sentences (scripts/compare-unidic.mjs, READINGS=1): of
 * 128,175 words in kanji it gives a reading, 1,282 that were misread come
 * right and 57 that were right go wrong, and 116,587 read as the index has
 * them, 90.96 in a hundred. Of the 57, 21 are 下 said もと and 何 said なん,
 * which the index does not tell from した and なに. The rest is UniDic's own:
 * 方 a person where it is a side, 綿 as わた where it is cloth, 臭い as におい.
 * Words it reads one way whatever the line says are named below (habit()),
 * and 金 is read by the line alone (goldOrMoney()).
 */

/** An ending, a prefix or a name: what IPADIC makes of a word where one could stand. */
export const bound = (pos: string | undefined, pos1: string | undefined): boolean =>
  pos1 === '接尾' || pos === '接頭詞' || pos1 === '固有名詞';

/** A reading with its first sound unvoiced, as the word is outside a compound: ドオリ is トオリ, バコ and パコ are ハコ. */
const VOICING = 'ガカギキグクゲケゴコザサジシズスゼセゾソダタヂチヅツデテドトバハビヒブフベヘボホパハピヒプフペヘポホ';
export const unvoiced = (reading: string): string => {
  const at = VOICING.indexOf(reading[0] ?? ' ');
  return at >= 0 && at % 2 === 0 ? VOICING[at + 1]! + reading.slice(1) : reading;
};

/** The word as the second analyser reads it. */
function taking(m: Morpheme, s: SecondReading): Morpheme {
  const { second: _second, ...mine } = m;
  return {
    ...mine,
    reading: s.reading,
    lemma: s.lemma ?? m.lemma ?? m.surface,
    conjForm: s.pos ? s.conjForm : s.conjForm ?? m.conjForm,
    ...(s.pos ? { pos: s.pos, pos1: s.pos1 } : {}),
  };
}

/** IPADIC reads the verb as the potential of one the dictionary has, read so: 弾ける, ひける, of 弾く, ひく. */
function readAsPotential(m: Morpheme, lexicon: Lexicon): boolean {
  const own = lemmaReadingOf(m);
  const p = potentialOf(m, own);
  if (!own || !m.lemma || !p?.reading) return false;
  if (lexicon(m.lemma)?.some((e) => toKatakana(e.reading) === own)) return false;
  return Boolean(lexicon(p.word)?.some((e) => toKatakana(e.reading) === p.reading && e.pos?.some((c) => p.classes.includes(c))));
}

/** The word an ending or a prefix makes with the one it is on, as written: 先生方, 今世紀. */
function affixed(morphemes: Morpheme[], i: number): string | undefined {
  const m = morphemes[i]!;
  const [prev, next] = [morphemes[i - 1], morphemes[i + 1]];
  if (m.pos1 === '接尾' && prev) return prev.surface + m.surface;
  if (m.pos === '接頭詞' && next) return m.surface + next.surface;
  return undefined;
}

/**
 * What an expression beginning at a word would be written as: the word and
 * the next two or three, as written or with the last in its dictionary form.
 * 実を言うと, 間を置く (from 間を置いて), 金がない. Not the word and one more:
 * 後に is のちに, "later", in the dictionary, and あと after の, 授業の後に.
 */
function expressionsAt(morphemes: Morpheme[], i: number): string[] {
  const out: string[] = [];
  let run = morphemes[i]!.surface;
  for (let j = i + 1; j <= i + 3 && j < morphemes.length; j++) {
    const m = morphemes[j]!;
    if (m.pos === '記号') break;
    if (j > i + 1 && m.lemma && m.lemma !== m.surface) out.push(run + m.lemma);
    run += m.surface;
    if (j > i + 1) out.push(run);
  }
  return out;
}

const toHiragana = (s: string): string => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/**
 * Which of two readings of a word an expression of the dictionary's, begun by
 * that word in the line, reads it by: the first, the second, or neither where
 * the line has no such expression or it could be read with either.
 */
function byExpression(morphemes: Morpheme[], i: number, readings: [string, string], lexicon: Lexicon): 0 | 1 | undefined {
  const next = morphemes[i + 1];
  // What follows the word in the expression's reading, where the line writes it in kana: を in じつをいうと.
  const after = next && KANA_ONLY.test(next.surface) ? toHiragana(next.surface) : '';
  const [a, b] = readings.map((r) => toHiragana(r) + after) as [string, string];
  let found: 0 | 1 | undefined;
  for (const form of expressionsAt(morphemes, i)) {
    for (const e of lexicon(form) ?? []) {
      const said = toHiragana(e.reading);
      const fits = [said.startsWith(a), said.startsWith(b)];
      if (fits[0] === fits[1]) continue;
      const which = fits[0] ? 0 : 1;
      if (found !== undefined && found !== which) return undefined;
      found = which;
    }
  }
  return found;
}

/*
 * Readings that are UniDic's habit and not the line's. The dictionary bears
 * each out — it ranks ふう, a manner, above かぜ, the wind, having more to say
 * of it — so nothing above stops them, and against Tatoeba's word index each
 * put right readings wrong:
 *
 *   - 風 is ふう to it before に, 風にゆれる and 風に吹き払われた too. The manner
 *     is said after こんな, そんな and どういう, which spoken() reads.
 *   - 数 on its own is すう, "several", which is 数 before what it counts: 数人,
 *     数日. On its own it is かず, every time of 122.
 *   - 空く is あく to it in お腹を空かせた and お腹が空かない, which are すく,
 *     as IPADIC has them, in all ten of Tatoeba's sentences.
 *   - 一足 is ひとあし, a step, of shoes as well: 靴を一足買った is いっそく. A
 *     step is 一足先に, 一足早く, 一足違い.
 *   - 下 after の and before で is もと, "under" a law, a teacher or the sun,
 *     and so テーブルの下で and 机の下で are too. It is もと under what is no
 *     thing to be beneath, and した otherwise.
 */
const UNDER = new Set([
  '法', '法律', '憲法', '規則', '主義', '体制', '政権', '制度', '支配', '統治', '指導', '指揮', '監督', '管理', '監視', '保護', '条件', '状況',
  '環境', '気候', '影響', '前提', '原則', '方針', '名', '名目', '旗', '許可', '了解', '合意', '約束', '契約', '白日', '太陽', '陽光', '日差し',
  '月明かり', '星空', '青空',
]);
const A_STEP = new Set(['先', 'お先', '早い', '早く', '遅れ', '遅れる', '違い']);

/** The word as it reads, where UniDic's reading of it is its habit: else undefined. */
function habit(morphemes: Morpheme[], i: number, s: SecondReading): Morpheme | undefined {
  const { second: _second, ...mine } = morphemes[i]!;
  const [before, prev, next, after] = [morphemes[i - 2], morphemes[i - 1], morphemes[i + 1], morphemes[i + 2]];
  if (mine.surface === '風' && s.reading === 'フウ') {
    // 知った風な口: a way of seeming, before な and what seems so. Not 強い風なの.
    const seeming = next?.surface === 'な' && after?.pos === '名詞' && after.pos1 !== '非自立';
    return seeming ? undefined : mine;
  }
  if (mine.surface === '数' && s.reading === 'スウ') return mine;
  if (mine.surface.startsWith('空') && mine.reading?.startsWith('スカ') && s.reading.startsWith('アカ')) return mine;
  if (mine.surface === '一足' && s.reading === 'ヒトアシ') return A_STEP.has(next?.lemma ?? next?.surface ?? '') ? undefined : mine;
  if (mine.surface !== '下' || s.reading !== 'モト') return undefined;
  // 彼の下で働く, 音楽家の下で: under a person, who is no table. Not これの下, nor 家の下.
  const who = before?.surface ?? '';
  const person = (before?.pos1 === '代名詞' && !/^[こそあど]/.test(who)) || (who.length > 1 && /(家|者|師|生|授|長|匠|方|司|人)$/.test(who));
  if (prev?.surface === 'の' && (UNDER.has(who) || person)) return undefined;
  // した, and a word of its own: IPADIC may have the ending か there, 一つ下の階.
  return mine.reading === 'シタ' ? mine : { ...taking(morphemes[i]!, s), reading: 'シタ' };
}

function secondOpinions(morphemes: Morpheme[], lexicon: Lexicon | undefined): Morpheme[] {
  if (!morphemes.some((m) => m.second)) return morphemes;
  return morphemes.map((m, i) => {
    const s = m.second;
    if (!s) return m;
    const { second: _second, ...mine } = m;
    const usual = habit(morphemes, i, s);
    if (usual) return usual;
    if (!lexicon) return mine;
    const theirs = taking(m, s);
    const reading = lemmaReadingOf(theirs);
    const entries = reading && theirs.lemma ? lexicon(theirs.lemma) : undefined;
    const entry = entries?.find((e) => toKatakana(e.reading) === reading);
    if (!entries || !entry || readAsPotential(mine, lexicon)) return mine;
    const whole = affixed(morphemes, i);
    if (whole && lexicon(whole)?.length) return mine;
    const said = m.reading ? byExpression(morphemes, i, [m.reading, s.reading], lexicon) : undefined;
    if (said !== undefined) return said === 0 ? mine : theirs;
    const first = entries[0] === entry && entry.leads === true && theirs.lemma === (m.lemma ?? m.surface);
    const was = lemmaReadingOf(mine);
    const unlisted = !lexicon(m.lemma ?? m.surface)?.some((e) => [was, was && unvoiced(was)].includes(toKatakana(e.reading)));
    const freed = s.pos !== undefined && bound(m.pos, m.pos1) && !bound(s.pos, s.pos1);
    const own = s.native === true && (freed || (entry.common === true && !entry.kana));
    return first || unlisted || own ? theirs : mine;
  });
}

/*
 * 金 on its own: かね, money, nine times in ten, and きん, gold.
 *
 * Neither analyser can be asked. IPADIC reads every one きん. UniDic goes by
 * the word before: かね in 金がない, きん in だまして金を取った and 金を払おう,
 * which are money, and かね in 金と銀 and 金を掘る, which are gold. So the line
 * says which. It is gold beside another metal or a medal (金と銀, 鉄は金より
 * 硬い), as what a thing is made of or priced in (金の指輪, 金の価格, 金で
 * できている), as what is dug and panned (金を掘る), in 沈黙は金 and 光るもの
 * すべてが金ではない, and before a sum (金一万円); it is Friday beside another
 * day (月・水・金); and it is money everywhere else.
 *
 * Against Tatoeba's word index, which says which each 金 is: of 504 that are
 * money, 503 read かね, where 483 did; of 54 that are gold, 40 read きん, where
 * 4 did (金の鶴, 金が見つかった and 金に変わる added five, and changed no other
 * sentence). The rest is gold that nothing beside it says so: 金は水より
 * ずっと重い, 悲願である金, and a few the index has as gold that are money.
 */
const METALS = new Set(['銀', '銅', '鉄', '鉛', '錫', '真鍮', '白金', 'プラチナ', '金属', '貴金属', 'メダル', 'メッキ', '鉱山', '鉱脈', '砂金']);
/** What gold is priced by and made into: 金の価格, 金の指輪, 金の延べ棒. */
const OF_GOLD = new Set([
  '価格', '値段', '相場', '延べ', '延べ棒', '指輪', '指環', '時計', '腕時計', '鎖', '首輪', '首飾り', 'ネックレス', '腕輪', 'ブレスレット',
  'イヤリング', '冠', '王冠', '杯', 'カップ', 'スプーン', '皿', '像', '塊', '粒', '粉', '箔', '糸', '卵', 'メダル', '産出', '採掘', '鶴',
]);
/** What is done to gold and not to money. */
const TO_GOLD = new Set(['掘る', '掘り当てる', '掘り出す', '採る', '採掘', '発掘', '産出', '産する', '精錬', '探し求める', 'より分ける', '分離', '含む']);
const FOUND = new Set(['見つかる', '採れる', '取れる', '出土', '発見']);
const MADE_OF = new Set(['できる', '出来る', '作る', 'つくる', '覆う', '飾る']);
const DAYS = new Set(['月', '火', '水', '木', '土', '日']);

/** Whether the 金 at `i` is gold, or a Friday, by what stands with it in the line. */
function gold(morphemes: Morpheme[], i: number): boolean {
  const word = (m: Morpheme | undefined): string => m?.lemma ?? m?.surface ?? '';
  const [prev, next, after] = [morphemes[i - 1], morphemes[i + 1], morphemes[i + 2]];
  if (next?.pos1 === '数') return true;
  if (morphemes.some((m, k) => k !== i && METALS.has(word(m)))) return true;
  // 月・水・金: a day among days, with a mark between them.
  if ([morphemes[i - 2], after].some((m) => m !== undefined && DAYS.has(m.surface)) && [prev, next].some((m) => m?.pos === '記号')) return true;
  if (next?.surface === 'の' && OF_GOLD.has(word(after))) return true;
  // 金でできている, 金で作った: what a thing is made of. Not 金でできぬ事, what money cannot do.
  if (next?.surface === 'で' && MADE_OF.has(word(after)) && ['て', 'た'].includes(morphemes[i + 3]?.surface ?? '')) return true;
  if (next?.surface === 'を' && TO_GOLD.has(word(after))) return true;
  // 金が見つかった, 金が採れる; 金に変わる, as what a touch or a stone turns things to.
  if (next?.surface === 'が' && FOUND.has(word(after))) return true;
  if (next?.surface === 'に' && word(after) === '変わる') return true;
  const before = morphemes.slice(0, i);
  if (before.some((m) => m.surface === '沈黙' || m.surface === '雄弁')) return true;
  return before.some((m) => ['光る', '輝く'].includes(word(m))) && before.some((m) => m.surface === 'もの');
}

function goldOrMoney(morphemes: Morpheme[]): Morpheme[] {
  if (!morphemes.some((m) => m.surface === '金')) return morphemes;
  return morphemes.map((m, i) => {
    if (m.surface !== '金' || m.pos !== '名詞') return m;
    const [prev, next] = [morphemes[i - 1], morphemes[i + 1]];
    // A word of its own: not an ending (前払金, which the analysers call one), not Mr Kim (金さん), and not the
    // first half of a word, 金メッキ. 俺金ない and 金全部 are 金 on its own beside another word.
    if (m.pos1 !== '一般' && !(m.pos1 === '固有名詞' && !PERSON_SUFFIX.has(next?.surface ?? '') && next?.pos1 !== '接尾')) return m;
    if (prev?.pos === '接頭詞' || (next?.pos === '名詞' && ['一般', 'サ変接続', '接尾', '固有名詞'].includes(next.pos1 ?? ''))) return m;
    const { second: _second, ...word } = m;
    return { ...word, pos1: '一般', reading: gold(morphemes, i) ? 'キン' : 'カネ' };
  });
}

/*
 * 綿 on its own: めん, cotton as cloth (綿のシャツ, 綿100%, 上質の綿でできて
 * いる, ウールと綿), and わた otherwise, the plant and the fluff (綿を植える,
 * 綿畑, 綿は水を吸収する, 綿あめ, 白い綿の絨毯). Each analyser reads it one
 * way or the other whatever the line says.
 *
 * Of Tatoeba's 20 sentences with 綿 alone, all 20 read so, where 6 did; the
 * word index has 12 of them, and agrees on each.
 */
const CLOTH = new Set([
  'シャツ', 'Ｔシャツ', 'スカート', '靴下', 'ブラウス', 'シーツ', 'パン', 'ズボン', 'パンツ', 'ジーンズ', 'セーター', '下着', 'タオル', '服', '生地',
  '布', '製', '素材', '混', 'ウール', '羊毛', '絹', '麻', 'ナイロン', 'ポリエステル', '化繊', '100', '１００', '%', '％',
]);

function cottonOrFluff(morphemes: Morpheme[]): Morpheme[] {
  if (!morphemes.some((m) => m.surface === '綿')) return morphemes;
  return morphemes.map((m, i) => {
    if (m.surface !== '綿' || m.pos !== '名詞') return m;
    const [next, after] = [morphemes[i + 1], morphemes[i + 2]];
    const word = (x: Morpheme | undefined): string => x?.lemma ?? x?.surface ?? '';
    const cloth = morphemes.some((x, k) => k !== i && CLOTH.has(word(x))) || (next?.surface === 'で' && ['できる', '出来る'].includes(word(after)));
    const { second: _second, ...rest } = m;
    return { ...rest, reading: cloth ? 'メン' : 'ワタ' };
  });
}

/*
 * 方 after a word that describes it: ほう, a side or way (買う方が好き, 欲しい
 * 方を選ぶ), or かた, a person said with respect (秘書の方ですね, 伊藤さんという
 * 方がお見えになった).
 *
 * IPADIC reads every one ほう; UniDic reads it かた after most verbs and
 * adjectives, in 欲しい方を選んで too, and the dictionary bears both out. So
 * the line says which. It is a person where it is asked for or announced
 * (方はどなた, 次の方どうぞ, 方がお見えになった, 方いらっしゃいますか), named
 * (〜さんという方), spoken of with respect (支持される方, 送っていただいた方),
 * a kind of person with nothing weighed against them (男性の方は, 高齢者の方や),
 * or praised (いい方ですね). It is a side where it is liked, better or
 * cheaper (方が好き, 方がいい), chosen, taken or faced (方を選ぶ), gone toward
 * (方に行く), or one of two (二つのうちで).
 *
 * Against Tatoeba's word index, 454 of 481 read as it has them, where 416
 * did: 69 かた where 39 did, and 385 ほう where 377 did. 69 sentences change,
 * every one for the better. Most of the 27 left the index has wrong (値段の高い
 * 方, 彼の方から are ほう); the rest are said of someone with nothing beside
 * them to say so: 疑わない方のため, 提出されていない方は.
 */
const ASKED_FOR = new Set(['どなた', 'どちら様', 'どうぞ', 'いらっしゃる', 'おいで', 'お越し']);
const CALLED = new Set(['という', 'とかいう', 'っていう']);
const SAYING = new Set(['言う', 'いう', 'おっしゃる', '申す']);
const HONOURED_TITLES = new Set(['さん', '様', '氏', 'くん', '君', 'ちゃん', '先生']);
/** Who is spoken of as 〜の方: 秘書の方, 男性の方, 初診の方. Words ending 者, 員, 人 and the like need no listing. */
const KINDS_OF_PERSON = new Set([
  '秘書', '記者', '男性', '女性', '男', '女', '相手', '読者', '新入生', '担当', '応募', '初診', '家族', '在住', '未満', '係', '先生', 'お客',
  '客', '会員', '患者', '利用', '参加', '希望', '来場', '出席', '年配', '目上', '近所', '業者', '妊娠中',
]);
const PERSONAL_ENDING = /(者|員|官|主|様|士|師|客|人)$/;
/** One of two, or one before others: 後者の方, 両者の方 are sides. */
const NOT_PEOPLE = new Set(['後者', '前者', '両者', '人', '本人']);
const AFTER_A_PERSON = new Set(['です', 'だ', 'で', 'は', 'も', '、', 'や', 'の', 'にとって', 'どうぞ', 'ね', '」', 'と', 'から']);
/** Words that weigh one thing against another. */
const WEIGHED = /(より|うちで|の中で|どちら|どっち|ではなく|じゃなく)/;
const ONE_OF_TWO = /(うちで|の中で|どちら|どっち)/;
const GONE_TOWARD = /^(行く|いく|来る|向かう|進む|走る|歩く|曲がる|逃げる|飛ぶ|動く)$/;
const CHOSEN = /^(選ぶ|取る|ください|下さい|買う|もらう|向く|見る)$/;

/** Whether the 方 at `i` is a person (true) or a side (false), by what stands with it; undefined where the line does not say. */
function person(morphemes: Morpheme[], i: number): boolean | undefined {
  const word = (m: Morpheme | undefined): string => m?.lemma ?? m?.surface ?? '';
  const [p3, p2, prev, next, after] = [morphemes[i - 3], morphemes[i - 2], morphemes[i - 1], morphemes[i + 1], morphemes[i + 2]];
  const line = morphemes.map((m) => m.surface).join('');
  // What is said of it, past a particle: 方はどなた, 方がお見えになった, 方が来られた.
  const k = morphemes[i + 1]?.pos === '助詞' || morphemes[i + 1]?.surface === '、' ? i + 2 : i + 1;
  const [t, t2, t3, t4] = [morphemes[k], morphemes[k + 1], morphemes[k + 2], morphemes[k + 3]];
  if (ASKED_FOR.has(word(t))) return true;
  const becomes = t3?.surface === 'に' && word(t4) === 'なる';
  // Not ご自宅の方へご連絡した: what is done toward it, said humbly.
  if (t && !['に', 'へ'].includes(next?.surface ?? '') && /^[おご]/.test(t.surface) && (t.pos === '接頭詞'
    ? t2?.pos === '動詞' || (t2?.pos1 === 'サ変接続' && t2.surface !== '得') || becomes
    : t.pos === '名詞' && t2?.surface === 'に' && word(t3) === 'なる')) return true;
  if (t?.pos === '動詞' && t2?.pos === '動詞' && t2.pos1 === '接尾' && ['れる', 'られる'].includes(word(t2)) && ['来る', 'おる', '見える', '帰る'].includes(word(t))) return true;
  // 伊藤さんという方, ブラウンさんとおっしゃる方.
  const called = CALLED.has(prev?.surface ?? '') || (SAYING.has(word(prev)) && ['と', 'とか'].includes(p2?.surface ?? ''));
  const named = morphemes.slice(Math.max(0, i - 4), i).some((m) => m.pos1 === '固有名詞' || (m.pos1 === '接尾' && HONOURED_TITLES.has(m.surface)));
  if (called && named) return true;
  // 支持される方, 送っていただいた方: said of them with respect. Not される方がいい.
  const respect = (prev?.pos === '動詞' && prev.pos1 === '接尾' && ['れる', 'られる'].includes(word(prev))) || (prev?.surface === 'た' && word(p2) === 'いただく');
  if (respect && !['が', 'へ', 'を'].includes(next?.surface ?? '') && !WEIGHED.test(line)) return true;
  // 秘書の方です, 男性の方は, 高齢者の方や. Not 告発人の方に向き直った, nor 男性の方が女性より.
  const kind = p2?.pos1 === '接尾' && p3 ? p3.surface + p2.surface : p2?.surface ?? '';
  const ofKind = !NOT_PEOPLE.has(kind) && (KINDS_OF_PERSON.has(kind) || KINDS_OF_PERSON.has(word(p2)) || (kind.length > 1 && PERSONAL_ENDING.test(kind)));
  if (prev?.surface === 'の' && ofKind && AFTER_A_PERSON.has(next?.surface ?? '。') && !WEIGHED.test(line)) return true;
  // いい方ですね, よさそうな方ですね.
  if ((prev?.pos === '形容詞' || prev?.surface === 'な') && next?.surface === 'です' && after?.surface === 'ね' && !WEIGHED.test(line)) return true;
  // 買う方が好き, 使う方が結局は安い, 欲しい方を選ぶ, 違う方に行く, 二つのうちで役に立つ方.
  if (next?.surface === 'が' && (after?.pos === '形容詞' || after?.pos1 === '形容動詞語幹' || after?.pos === '副詞' || after?.pos1 === '副詞可能' ||
    ['得', 'まし', 'いい', 'よい'].includes(word(after)))) return false;
  if (['に', 'へ'].includes(next?.surface ?? '') && after?.pos === '動詞' && GONE_TOWARD.test(word(after))) return false;
  if (next?.surface === 'を' && CHOSEN.test(word(after))) return false;
  if (ONE_OF_TWO.test(line)) return false;
  return undefined;
}

function personOrSide(morphemes: Morpheme[]): Morpheme[] {
  if (!morphemes.some((m) => m.surface === '方')) return morphemes;
  return morphemes.map((m, i) => {
    if (m.surface !== '方' || m.pos !== '名詞' || m.pos1 !== '非自立') return m;
    const who = person(morphemes, i);
    if (who === undefined) return m;
    const reading = who ? 'カタ' : 'ホウ';
    if (m.reading === reading && !m.second) return m;
    const { second: _second, ...word } = m;
    return { ...word, reading };
  });
}

/*
 * A country's one-letter name, where a word stands.
 *
 * 米 is べい, America, to IPADIC wherever a line begins with it, and to UniDic
 * nearly everywhere: 米は暖かい国でできる, 米の値段が下がった. Both learnt it
 * from newspapers, and neither is a second opinion on the other. The name
 * stands before what it is joined to — 米大統領, 日米, 仏政府 — and a word of
 * its own before a particle is the word: the one the dictionary ranks first
 * under the spelling, where that leads. 米 is rice, 仏 a Buddha, 露 dew.
 *
 * All 35 of Tatoeba's sentences with 米 so placed are rice.
 */

/** Whether a country's one-letter name stands as a word of its own: nothing joined before it, a particle after. */
function standsAlone(morphemes: Morpheme[], i: number): boolean {
  const m = morphemes[i]!;
  const [prev, next] = [morphemes[i - 1], morphemes[i + 1]];
  return Boolean(m.country) && !m.second && m.surface.length === 1 && next?.pos === '助詞' && prev?.pos !== '名詞' && prev?.pos !== '接頭詞';
}

function countryNames(morphemes: Morpheme[], lexicon: Lexicon | undefined): Morpheme[] {
  if (!lexicon || !morphemes.some((m) => m.country)) return morphemes;
  return morphemes.map((m, i) => {
    if (!standsAlone(morphemes, i)) return m;
    const first = lexicon(m.surface)?.[0];
    if (!first?.leads || toKatakana(first.reading) === m.reading) return m;
    const { country: _country, ...word } = m;
    return { ...word, reading: toKatakana(first.reading), pos1: '一般' };
  });
}

/**
 * Words the analyser cuts wrongly that speech makes of two or more.
 *
 * たびに is "each time", a word of its own where たび alone is 足袋 or 度:
 * the analyser tags the one in たびに a dependent noun. Where a form could
 * be either of two things, the words around it decide, and it is left as the
 * analyser had it when they do not.
 * Kansai speech: せえへん is しない, which IPADIC reads as せ, the verb え and
 * へん; おらん and おらんかった are いない and いなかった, with おら taken for a
 * noun. Each is put back the way it goes together; the rest of Kansai-ben
 * (食べへん, 行かへん) is cut right already.
 */
/** The spoken contractions that follow a verb as endings: しちゃう, 読んじゃう, 見てる, やっとく. */
const CONTRACTION_HELPERS = new Set(['ちゃう', 'じゃう', 'ちまう', 'じまう', 'とく', 'どく', 'てる', 'でる']);

/** Whether the word before a noun describes it: この, 彼の, 速い, 投げた, or another noun joined to it. */
function describes(prev: Morpheme | undefined): boolean {
  if (!prev) return false;
  if (prev.pos === '助詞') return prev.pos1 === '連体化' || prev.surface === 'の';
  return ['連体詞', '接頭詞', '形容詞', '動詞', '助動詞', '名詞'].includes(prev.pos ?? '');
}

/**
 * What こん, "this", counts: a term, a session or a season in a run of them.
 * 今学期, 今会期, 今大会. Those the dictionary has as words need no listing:
 * 今世紀, 今年度, 今シーズン, 今国会.
 */
const THIS_ONE = new Set(['学期', '会期', '大会', '四半期', '半期', 'クール', 'シリーズ', '公演', '議会', '定例会', '月号', '週号']);

/**
 * 今 and a noun that both analysers have a name for, so that neither is a
 * second opinion on the other: 今本 and 今道 are surnames to them, 今金 one too
 * and a town of five thousand. In a line each is いま and the noun — 今本を読んで
 * いる, 今金の持ち合わせがない, 今道を横切っている, all ten of Tatoeba's sentences
 * with one. The noun, and how it reads there.
 */
const NOW_AND: Record<string, [noun: string, reading: string]> = { 今本: ['本', 'ホン'], 今金: ['金', 'カネ'], 今道: ['道', 'ミチ'] };

/** Time words that begin with 今, which an analyser may cut as 今 and a word: 今朝家, 今日取り. */
/** What IPADIC reads as も and a verb after に: もたれる, もたれかかる. */
const LEAN = new Set(['たれる', 'たれかかる', 'たれかける']);
const NOW_WORDS = new Set(['今朝', '今日', '今晩', '今夜', '今年', '今月', '今週', '今度', '今回']);

/** Words that ask or say in what way: after one, 風 is ふう and not the wind. */
const MANNER = new Set(['こんな', 'そんな', 'あんな', 'どんな', 'こういう', 'そういう', 'ああいう', 'どういう']);

function spoken(morphemes: Morpheme[], lexicon: Lexicon | undefined): Morpheme[] {
  const out: Morpheme[] = [];
  for (let i = 0; i < morphemes.length; i++) {
    const m = morphemes[i]!;
    const next = morphemes[i + 1];
    const after = morphemes[i + 2];
    /*
     * A time word and what follows it, read by both analysers as 今 and a word they know: 今朝家を出た is 今朝
     * and 家, not 今 and 朝家 (ちょうか), and 今日取りに来て is 今日 and 取り. Where the dictionary has 今 and the
     * first letter as a time word, the rest as a word, and the two together as no common word (朝家 is a rare one).
     */
    if (m.surface === '今' && m.pos === '接頭詞' && next?.pos === '名詞' && lexicon && next.surface.length > 1) {
      const [head, rest] = [`今${next.surface[0]}`, next.surface.slice(1)];
      const when = NOW_WORDS.has(head) ? lexicon(head)?.[0] : undefined;
      const fetch = next.surface === '日取り' && after?.surface === 'に' && after.pos === '助詞';
      const word = fetch ? undefined : lexicon(rest)?.[0];
      if (when && (fetch || (word && !lexicon(next.surface)?.some((e) => e.common)))) {
        out.push({ surface: head, lemma: head, reading: toKatakana(when.reading), pos: '名詞', pos1: '副詞可能' });
        out.push(fetch
          ? { surface: '取り', lemma: '取る', reading: 'トリ', pos: '動詞', pos1: '自立', conjForm: '連用形', conjType: '五段・ラ行' }
          : { surface: rest, lemma: rest, reading: toKatakana(word!.reading), pos: '名詞', pos1: '一般' });
        i++;
        continue;
      }
    }
    /*
     * 目下 is めした, those beneath one, as a person: 目下の者, 目下に対して. Otherwise it is もっか, "at present":
     * 目下のところ, 目下元気だ, 目下マイアミにいる, which one analyser or both read めした. Five of Tatoeba's 20
     * sentences with it change, all five to もっか.
     */
    if (m.surface === '目下' && m.pos === '名詞') {
      const person = next?.surface === 'の' ? ['者', '人', 'もの', '方'].includes(after?.surface ?? '') : next?.pos === '助詞' && next.surface !== 'は';
      const { second: _second, ...word } = m;
      out.push({ ...word, reading: person ? 'メシタ' : 'モッカ' });
      continue;
    }
    // 壁にもたれる: IPADIC reads も and たれる, "drip too", in 15 of Tatoeba's 32 lines with it. After に it is the verb.
    if (m.surface === 'も' && m.pos === '助詞' && out[out.length - 1]?.surface === 'に' && next?.pos === '動詞' &&
      LEAN.has(next.lemma ?? '')) {
      out.push({ ...next, surface: `も${next.surface}`, lemma: `も${next.lemma}`, reading: `モ${next.reading ?? ''}` });
      i++;
      continue;
    }
    // 来たまえに: た and 前, "before he came", written in kana. IPADIC takes たまえ for a name.
    if (m.surface === 'たまえ' && m.pos1 === '固有名詞' && morphemes[i - 1]?.pos === '動詞' && next?.surface === 'に') {
      out.push({ surface: 'た', lemma: 'た', reading: 'タ', pos: '助動詞' }, { surface: 'まえ', lemma: '前', reading: 'マエ', pos: '名詞', pos1: '副詞可能' });
      continue;
    }
    /*
     * 今 before a noun is いま, "now", far more often than こん, "this": 今宿題をしている, 今台所にいる, 今人気の,
     * 今金欠で. Both analysers take it for the prefix wherever a noun follows, so neither is a second opinion on
     * the other. It is the prefix where the dictionary has the two as a word, and before what こん counts.
     * 74 of Tatoeba's sentences change, 72 of them to "now" as they should; in the other two both analysers
     * cut the line wrongly to begin with (今朝家を出た is 今朝 and 家), which the rule above puts right. 今学期 and 今会期, 15 more, stay こん.
     */
    if (m.surface === '今' && m.pos === '接頭詞' && m.reading === 'コン' && next && lexicon &&
      !lexicon(`今${next.surface}`)?.length && !THIS_ONE.has(next.surface)) {
      out.push({ surface: '今', lemma: '今', reading: 'イマ', pos: '名詞', pos1: '副詞可能' });
      continue;
    }
    /*
     * 間中, "all through": 夜の間中, その間中. IPADIC has it only as a surname, まなか, or cuts it 間 (かん) and
     * 中. After の or その it is the word: all nine of Tatoeba's
     * sentences with it, and no other line changes.
     */
    const throughout = m.surface === '間中' && m.pos1 === '固有名詞' ? 1
      : m.surface === '間' && next?.surface === '中' && next.pos1 === '接尾' ? 2 : 0;
    const prev = out[out.length - 1];
    if (throughout && (prev?.surface === 'の' || prev?.pos === '連体詞') && !PERSON_SUFFIX.has(morphemes[i + throughout]?.surface ?? '')) {
      out.push({ surface: '間中', lemma: '間中', reading: 'アイダジュウ', pos: '名詞', pos1: '副詞可能' });
      i += throughout - 1;
      continue;
    }
    // 今本, 今金, 今道: a name before what a name takes (今本さん, 今金町) or called out on its own, and two words otherwise.
    const nowAnd = m.pos1 === '固有名詞' ? NOW_AND[m.surface] : undefined;
    if (nowAnd && next && next.pos !== '記号' && next.pos1 !== '接尾') {
      out.push(
        { surface: '今', lemma: '今', reading: 'イマ', pos: '名詞', pos1: '副詞可能' },
        { surface: nowAnd[0], lemma: nowAnd[0], reading: nowAnd[1], pos: '名詞', pos1: '一般' },
      );
      continue;
    }
    // IPADIC tags that たび a dependent noun; UniDic does not, and there it is the one after a verb or その.
    if (m.surface === 'たび' && next?.surface === 'に' && next.pos === '助詞' &&
      (m.pos1 === '非自立' || (m.pos === '名詞' && ['動詞', '助動詞', '連体詞'].includes(morphemes[i - 1]?.pos ?? '')))) {
      out.push({ surface: 'たびに', lemma: 'たびに', reading: 'タビニ', pos: '副詞', pos1: '一般' });
      i++;
      continue;
    }
    /*
     * たまに: "now and then", or a ball (たま) and に. The sentence says which:
     * a たま that something describes is the noun — そのたまに, 彼のたまに,
     * 速いたまに — and one that nothing does is the adverb, as after は, でも,
     * or at the start of the line. IPADIC picks the noun in both.
     */
    // The same, the other way: UniDic takes every たまに for the adverb, そのたまに too.
    if (m.surface === 'たまに' && m.pos === '副詞' && describes(morphemes[i - 1])) {
      out.push({ surface: 'たま', lemma: 'たま', reading: 'タマ', pos: '名詞', pos1: '一般' }, { surface: 'に', lemma: 'に', reading: 'ニ', pos: '助詞', pos1: '格助詞' });
      continue;
    }
    if (m.surface === 'たま' && m.pos === '名詞' && next?.surface === 'に' && next.pos === '助詞' && !describes(morphemes[i - 1])) {
      out.push({ surface: 'たまに', lemma: 'たまに', reading: 'タマニ', pos: '副詞', pos1: '一般' });
      i++;
      continue;
    }
    /*
     * もん and もの after what a sentence says: 言ってましたもんね, 嫌いだもん.
     * There it is the particle that gives a reason, "you know", and not a
     * thing — and not 門, a gate, which is what もん alone is looked up as.
     * IPADIC calls both a dependent noun. Ending the sentence after a verb,
     * an adjective or an ending, it is the particle; before だ or a particle
     * (そんなもんだ, うまいもん食べたい) it is もの, a thing, said short.
     */
    if ((m.surface === 'もん' && m.pos === '名詞') || (m.surface === 'もの' && m.pos === '名詞' && m.pos1 === '非自立')) {
      const before = morphemes[i - 1];
      const last = !next || next.pos === '記号' || (next.pos === '助詞' && next.pos1 === '終助詞');
      const said = m.surface === 'もん'
        ? ['助動詞', '動詞', '形容詞'].includes(before?.pos ?? '')
        : before?.pos === '助動詞' && ['だ', 'です'].includes(before.surface);   // だもの, not なもの
      if (last && said) {
        out.push({ ...m, pos: '助詞', pos1: '終助詞' });
        continue;
      }
      if (m.surface === 'もん') {
        out.push({ ...m, lemma: 'もの' });
        continue;
      }
    }
    /*
     * す for です, as people say it: 詳しいんすか, いいんすよ, そうすね. IPADIC
     * has っす and not す, so it reads すか as a noun (a miss, a blank), す as
     * する and すね as すねる. Where it follows something and ends the sentence,
     * or goes on to a particle as です would, it is です said short; すか with
     * a particle after it (すかを引いた) stays the noun.
     */
    const prior = morphemes[i - 1];
    const closes = (x: Morpheme | undefined): boolean => !x || x.pos === '記号' || (x.pos === '助詞' && x.pos1 !== '格助詞' && x.pos1 !== '係助詞');
    const desu = (surface: string): Morpheme => ({ surface, lemma: 'です', reading: 'ス', pos: '助動詞' });
    if (prior && prior.pos !== '助詞' && prior.pos !== '記号') {
      if (m.surface === 'すか' && m.pos === '名詞' && closes(next)) {
        out.push(desu('す'), { surface: 'か', lemma: 'か', reading: 'カ', pos: '助詞', pos1: '副助詞／並立助詞／終助詞' });
        continue;
      }
      if (m.surface === 'すね' && m.lemma === 'すねる' && (!next || next.pos === '記号')) {
        out.push(desu('す'), { surface: 'ね', lemma: 'ね', reading: 'ネ', pos: '助詞', pos1: '終助詞' });
        continue;
      }
      if (m.surface === 'す' && m.lemma === 'する' && next?.pos === '助詞' && closes(next)) {
        out.push(desu('す'));
        continue;
      }
    }
    /*
     * わけない: "there is no way that", or "easy" — 詳しいわけない, そんなわけ
     * ない. IPADIC reads most of them as わける, to divide, in the negative.
     * All 50 of Tatoeba's sentences with it are the expression, and the rule
     * here reads them so; the verb needs something to divide, so it stays
     * the verb after を, に or で (ケーキをわけない).
     */
    if (m.surface === 'わけ' && next?.lemma === 'ない' &&
      (m.pos === '名詞' || (m.lemma === 'わける' && !['を', 'に', 'で'].includes(prior?.surface ?? '')))) {
      out.push({
        surface: `わけ${next.surface}`, lemma: 'わけない', reading: `ワケ${next.reading ?? ''}`,
        pos: '形容詞', pos1: '自立', conjForm: next.conjForm,
      });
      i++;
      continue;
    }
    // なっちゃう: IPADIC may call the ちゃう after a verb independent, and leave it a word of its own.
    if (CONTRACTION_HELPERS.has(m.lemma ?? '') && m.pos === '動詞' && m.pos1 === '自立' &&
      ['動詞', '助動詞'].includes(out[out.length - 1]?.pos ?? '')) {
      out.push({ ...m, pos1: '非自立' });
      continue;
    }
    /*
     * マネして: a word written in katakana for emphasis, before する. IPADIC takes
     * マネ for a name or a plain noun, and the dictionary has マネ, a manager,
     * under that spelling and 真似, copying, under its reading. A noun that is
     * done with する is the kind that takes it, サ変接続, and said so the
     * dictionary ranks 真似 first.
     */
    if (m.pos === '名詞' && ['一般', '固有名詞'].includes(m.pos1 ?? '') && /^[ァ-ヶー]{2,}$/.test(m.surface) &&
      ((next?.pos === '動詞' && next.lemma === 'する') || (next?.surface === 'を' && after?.lemma === 'する'))) {
      out.push({ ...m, pos1: 'サ変接続' });
      continue;
    }
    /*
     * 損した, 恋してる, 得する: a noun and する that the dictionary has as a verb of its own, where IPADIC knows the
     * noun only as a plain one and leaves the two apart. Said to take する, they are one word, and the
     * dictionary's. Not after a prefix (全損した is 全損) or a word that describes a noun: どの位したら is
     * どのくらい. Of the 24 so placed in Tatoeba's sentences, 23 are the verb: と目される, 恋しちゃった, 毒される.
     */
    if (m.pos === '名詞' && m.pos1 === '一般' && KANJI_ONLY.test(m.surface) && next?.pos === '動詞' && next.lemma === 'する' &&
      !['接頭詞', '連体詞'].includes(morphemes[i - 1]?.pos ?? '')) {
      const verb = lexicon?.(`${m.surface}する`)?.find((e) => e.pos?.some((code) => code.startsWith('vs')));
      // Read as the verb reads it: 目される is もくされる, where 目 alone is め.
      const said = verb ? toKatakana(verb.reading) : '';
      if (said.endsWith('スル')) {
        out.push({ ...m, pos1: 'サ変接続', reading: said.slice(0, -2) });
        continue;
      }
    }
    /*
     * くれえ: くらい, "about", as rough speech says it — どのくれえ, それくれえ分かる, 少しくれえ待て. IPADIC has
     * くれる and a noise there. It is the particle after a word no verb's stem follows (どの, その), and after
     * それ, 少し or a number where the line goes on. 助けてくれえ and これくれえ！ are the verb, drawn out.
     */
    // As IPADIC has it, くれ and a noise; or whole from UniDic, which takes it for 黒い said roughly.
    const pieces = m.surface === 'くれ' && m.lemma === 'くれる' && next !== undefined && /^[えぇ]+$/.test(next.surface);
    const whole = /^くれ[えぇ]+$/.test(m.surface) && m.pos === '形容詞';
    if (pieces || whole) {
      const led = morphemes[i - 1];
      const follows = pieces ? after : next;
      const measures = led?.pos1 === '代名詞' || led?.pos === '副詞' || led?.pos1 === '数' || led?.pos1 === '接尾';
      if (led?.pos === '連体詞' || (measures && follows && follows.pos !== '記号')) {
        out.push({ surface: pieces ? `くれ${next.surface}` : m.surface, lemma: 'くらい', reading: 'クレエ', pos: '助詞', pos1: '副助詞' });
        if (pieces) i++;
        continue;
      }
      // 助けてくれえ, やめてくれえ！: the verb, called out. The え is its own, and no word after it.
      if (pieces && (!after || after.pos === '記号')) {
        out.push({ ...m, surface: `くれ${next.surface}`, reading: `${m.reading ?? 'クレ'}エ` });
        i++;
        continue;
      }
    }
    /*
     * 何 is なん before t, d and n — 何ですか, 何だ, 何と言った, 何の用, 何て, 何なの — and なに before the
     * rest: 何が, 何を, 何か, 何も. IPADIC reads every one なに and UniDic every one なん, so neither is a
     * second opinion on the other. Before a particle or an ending only (何内緒 is not なん), and not before に,
     * which is said both ways: 何になりたい is なにに.
     */
    if (m.surface === '何' && m.reading === 'ナニ' && m.pos === '名詞' && next && ['助詞', '助動詞'].includes(next.pos ?? '') &&
      /^[タチツテトダヂヅデドナヌネノ]/.test(next.reading ?? toKatakana(next.surface))) {
      out.push({ ...m, reading: 'ナン' });
      continue;
    }
    /*
     * 風 after こんな, そんな, どんな or こういう is ふう, a way of doing: あんな風に怒らなくても, どんな風ですか.
     * IPADIC reads half of them かぜ, the wind, and UniDic's ふう is no guide (habit(), above).
     */
    // ああいう and という come cut in two.
    const inWhatWay = MANNER.has(morphemes[i - 1]?.surface ?? '') ||
      (morphemes[i - 1]?.surface === 'いう' && ['こう', 'そう', 'ああ', 'どう', 'と'].includes(morphemes[i - 2]?.surface ?? ''));
    // The way is how something is done or is: に, だ, で. どういう風の吹き回し and どんな風も are the wind.
    const done = !next || next.pos === '記号' || next.pos === '助動詞' || ['に', 'で', 'を', 'じゃ', 'って'].includes(next.surface);
    if (m.surface === '風' && m.pos === '名詞' && m.reading === 'カゼ' && inWhatWay && done) {
      out.push({ ...m, reading: 'フウ' });
      continue;
    }
    /*
     * 間: あいだ, "while" or "between", after a verb, an adjective, or の — 検討する間,
     * 長い間, 夏休みの間, AとBの間. IPADIC reads it ま wherever it is not
     * after a noun. ま, a pause or a space, is 間もなく, いつの間にか, 控えの間,
     * つかの間, 一瞬の間, and 間を置く; those it already had right, or are named here.
     * Of the 790 Tatoeba sentences with の間, all but a handful are あいだ.
     */
    const before = morphemes[i - 1];
    // いつの間にか: one word, "before one knows it", cut by UniDic into five.
    if (m.surface === 'いつ' && next?.surface === 'の' && after?.surface === '間' && morphemes[i + 3]?.surface === 'に' && morphemes[i + 4]?.surface === 'か') {
      out.push({ surface: 'いつの間にか', lemma: 'いつの間にか', reading: 'イツノマニカ', pos: '副詞', pos1: '一般' });
      i += 4;
      continue;
    }
    // 間もなく: one word, "before long", where an analyser cuts it into 間, も and なく.
    if (m.surface === '間' && next?.surface === 'も' && after?.surface === 'なく') {
      out.push({ surface: '間もなく', lemma: '間もなく', reading: 'マモナク', pos: '副詞', pos1: '一般' });
      i += 2;
      continue;
    }
    // And the other way: UniDic reads every 間 あいだ. A pause or a space is ま — 間を置く, 少し間がある, with
    // nothing before it saying whose — and 控えの間, つかの間, いつの間に, 一瞬の間.
    if (m.surface === '間' && m.pos === '名詞' && m.reading === 'アイダ' &&
      ((['控え', 'つか', 'いつ', '一瞬', '沈黙', '絶妙'].includes(morphemes[i - 2]?.surface ?? '') && before?.surface === 'の') ||
        (!describes(before) && next?.pos === '助詞'))) {
      out.push({ ...m, reading: 'マ' });
      continue;
    }
    if (m.surface === '間' && m.pos === '名詞' && m.reading === 'マ' && before &&
      (['動詞', '形容詞', '助動詞'].includes(before.pos ?? '') || (before.pos === '助詞' && before.pos1 === '連体化')) &&
      next?.surface !== 'も' && !(next?.surface === 'に' && after?.surface === 'か') &&
      !['控え', 'つか', 'いつ', '一瞬', '沈黙', '絶妙'].includes(morphemes[i - 2]?.surface ?? '')) {
      out.push({ ...m, reading: 'アイダ' });
      continue;
    }
    /*
     * そっか: "oh, right", そうか said short. IPADIC cuts it into そっ, which it
     * calls a pronoun, and か. Where it starts what is said — every case in
     * Tatoeba — it is the one word; after a verb's stem (時間つぶそっか, つぶそうか)
     * it is not, and is left.
     */
    if (m.surface === 'そっ' && next && /^か[ーあぁ〜]*$/.test(next.surface) &&
      (!before || before.pos === '記号' || before.pos === '感動詞')) {
      // そっかー, そっかあ: drawn out, and still the one word.
      const long = after && /^[ーあぁ〜]+$/.test(after.surface) ? after.surface : '';
      out.push({ surface: `そっ${next.surface}${long}`, lemma: 'そっか', reading: 'ソッカ', pos: '感動詞' });
      i += long ? 2 : 1;
      continue;
    }
    /*
     * Words UniDic cuts in two that are one in every dictionary, IPADIC's among them: どうも, and でも and
     * だって where they start what is said (でもたまに思う, だって嫌いだもん).
     */
    if (m.surface === 'どう' && next?.surface === 'も' && next.pos === '助詞') {
      out.push({ surface: 'どうも', lemma: 'どうも', reading: 'ドウモ', pos: '副詞', pos1: '一般' });
      i++;
      continue;
    }
    if ((!before || before.pos === '記号') && ((m.surface === 'で' && next?.surface === 'も') || (m.surface === 'だ' && next?.surface === 'って')) &&
      m.pos !== '名詞' && next.pos === '助詞') {
      const whole = m.surface + next.surface;
      out.push({ surface: whole, lemma: whole, reading: whole === 'でも' ? 'デモ' : 'ダッテ', pos: '接続詞' });
      i++;
      continue;
    }
    // 食べ + 放題: a verb's stem and a noun that the dictionary has as one word, which UniDic leaves as two.
    if (m.pos === '動詞' && m.conjForm === '連用形' && next?.pos === '名詞' && next.pos1 === '一般' && KANJI_ONLY.test(next.surface)) {
      const whole = m.surface + next.surface;
      const hits = lexicon?.(whole);
      if (hits?.length) {
        const readings = new Set(hits.map((h) => h.reading));
        out.push({
          surface: whole, lemma: whole, pos: '名詞', pos1: '一般',
          ...(readings.size === 1 ? { reading: toKatakana(hits[0]!.reading) } : {}),
        });
        i++;
        continue;
      }
    }
    // ユーチューバーとかも: とか, "and the like", and も. IPADIC, at the end of a line, reads と and かも, a duck.
    if (m.surface === 'と' && m.pos === '助詞' && next?.surface === 'かも' && next.pos === '名詞') {
      out.push(
        { surface: 'とか', lemma: 'とか', reading: 'トカ', pos: '助詞', pos1: '並立助詞' },
        { surface: 'も', lemma: 'も', reading: 'モ', pos: '助詞', pos1: '係助詞' },
      );
      i++;
      continue;
    }
    /*
     * 〜たまえ: an order, on a verb's stem — やめたまえ, 来たまえ, 連絡してくれたまえ. Neither analyser reads it
     * after a stem that is also the form before た: IPADIC has やめ, た, and ま and え as two noises, UniDic
     * やめた and まえ, 前. On a stem that is no such form (守りたまえ) IPADIC has たまえ whole, as a woman's
     * name. All 41 of Tatoeba's sentences with it are the order.
     */
    const order = (surface: string): Morpheme => ({ surface, lemma: 'たまえ', reading: 'タマエ', pos: '助動詞', conjForm: '命令ｅ' });
    const onStem = out[out.length - 1]?.pos === '動詞' && ['連用形', '連用タ接続'].includes(out[out.length - 1]?.conjForm ?? '');
    // An order ends what is said: nothing after it, a mark, or よ, ね, or the と of "he said". 来たまえに帰った is 来た前に.
    const ended = (x: Morpheme | undefined): boolean => !x || x.pos === '記号' || (x.pos === '助詞' && ['よ', 'ね', 'な', 'と'].includes(x.surface));
    if (onStem && m.surface === 'た' && m.pos === '助動詞' && next?.surface === 'ま' && next.pos === 'フィラー' && after?.pos === 'フィラー' &&
      (after.surface === 'えと' || (after.surface === 'え' && ended(morphemes[i + 3])))) {
      out.push(order('たまえ'));
      // 助けたまえと祈った: the と is what was said.
      if (after.surface === 'えと') out.push({ surface: 'と', lemma: 'と', reading: 'ト', pos: '助詞', pos1: '格助詞' });
      i += 2;
      continue;
    }
    if (onStem && (m.surface === 'たまえ' || m.surface === '給え') && m.pos !== '助動詞' && ended(next)) {
      out.push(order(m.surface));
      continue;
    }
    // Where nothing closes the line IPADIC has まえ, 前, as UniDic does: くれたまえ.
    if (onStem && m.surface === 'た' && m.pos === '助動詞' && next?.surface === 'まえ' && next.pos === '名詞' && ended(after)) {
      out.push(order('たまえ'));
      i++;
      continue;
    }
    if (m.surface === 'せ' && m.lemma === 'する' && next?.surface === 'え' && after?.surface === 'へん') {
      out.push(m, { surface: 'えへん', lemma: 'へん', reading: 'エヘン', pos: '助動詞' });
      i += 2;
      continue;
    }
    // 食べはる: はる after a verb is the honorific ending, not the verb 張る or 貼る.
    // Only on a verb's stem, where the honorific goes: 紙をはる is the verb. And not where the stem and
    // 張る are a verb of their own, 言い張る: that needs the dictionary, and waits for it.
    const stem = out[out.length - 1];
    if (m.lemma === 'はる' && m.pos === '動詞' && stem?.pos === '動詞' &&
      ['連用形', '未然形'].includes(stem.conjForm ?? '') && lexicon && !lexicon(`${stem.surface}張る`)?.length) {
      out.push({ ...m, pos: '助動詞', pos1: undefined });
      continue;
    }
    // ちゃうねん: ちゃう on its own is Kansai's 違う, "to differ", not the ending of しちゃう.
    if (m.lemma === 'ちゃう' && (m.pos === '動詞' || m.pos === '助動詞') && !['動詞', '助動詞'].includes(out[out.length - 1]?.pos ?? '')) {
      out.push({ ...m, lemma: '違う', pos: '動詞', pos1: '自立' });
      continue;
    }
    // Only where the sentence ends on it or goes on as a verb's would: おらんよ, おらんかった.
    const ends = !after || after.surface === 'かっ' || ['助詞', '助動詞', '記号'].includes(after.pos ?? '');
    if (m.surface === 'おら' && m.pos === '名詞' && next?.surface === 'ん' && ends) {
      const past = after?.surface === 'かっ';
      out.push(
        { surface: 'おら', lemma: 'おる', reading: 'オラ', pos: '動詞', pos1: '自立', conjForm: '未然形' },
        past
          ? { surface: 'んかっ', lemma: 'ない', reading: 'ンカッ', pos: '助動詞', conjForm: '連用タ接続' }
          : { surface: 'ん', lemma: 'ん', reading: 'ン', pos: '助動詞' },
      );
      i += past ? 2 : 1;
      continue;
    }
    out.push(m);
  }
  return out;
}

/*
 * Which verb a kana spelling is, from the words it stands with.
 *
 * さめる is 覚める, to wake, and 冷める, to cool; たつ is 立つ, 経つ, 建つ and 絶つ;
 * とる is 取る, 撮る and 採る. Written in kana, the card opened on whichever the
 * dictionary lists first. But 目がさめた is 目が覚める, an expression the
 * dictionary has — and has under 目がさめる too, as the line writes it — and
 * its own spelling says which verb. So with 腹がたつ, 役にたつ, 写真をとる,
 * 夜があける and 家をたてる. Where the dictionary writes the expression's verb
 * in kana itself (汗をかく, 風邪をひく) there is nothing to learn from it.
 *
 * In Tatoeba's sentences 1,330 verbs in kana stand in such an expression,
 * and for 411 of them the card's first entry changes: 責任をとる to 取る from
 * 摂る, to have a meal; 床につく to 就く from 吐く, to breathe out; 途方にくれる
 * to 暮れる from くれる, to give; 時間がたつ to 経つ from 立つ, to stand.
 */

/** The particles an expression's noun is joined to its verb by, and what は and も stand in for. */
const JOINS: Record<string, string[]> = { が: ['が'], を: ['を'], に: ['に'], は: ['が', 'を'], も: ['が', 'を'] };

/**
 * A verb in kana after a noun and a particle, as an expression would be written with each particle it may be:
 * 目がさめる. And with the verb as UniDic names it, 時間が経つ for 時間がたつ: its name alone is a guess (spelled(),
 * below), but an expression the dictionary has under it is the two of them agreeing.
 */
function phrasesAt(morphemes: Morpheme[], i: number): Array<{ form: string; joined: string }> {
  const [noun, particle, verb] = [morphemes[i - 2], morphemes[i - 1], morphemes[i]];
  if (verb?.pos !== '動詞' || verb.pos1 !== '自立' || !verb.lemma || !KANA_ONLY.test(verb.lemma)) return [];
  if (noun?.pos !== '名詞' || particle?.pos !== '助詞') return [];
  const verbs = [verb.lemma, ...(verb.kanji ? [verb.kanji] : [])];
  return (JOINS[particle.surface] ?? []).flatMap((joined) => verbs.map((v) => ({ form: `${noun.surface}${joined}${v}`, joined })));
}

function phrasedVerbs(morphemes: Morpheme[], lexicon: Lexicon | undefined): Morpheme[] {
  if (!lexicon) return morphemes;
  return morphemes.map((m, i) => {
    const found = new Set<string>();
    for (const { form, joined } of phrasesAt(morphemes, i)) {
      for (const e of lexicon(form) ?? []) {
        const at = e.word.indexOf(joined, 1);
        const verb = at > 0 ? e.word.slice(at + joined.length) : '';
        // The verb in kanji, ending as the line's does and read as it: 覚める for さめる.
        const tail = verb.replace(/^[^ぁ-ゖ]+/u, '');
        if (!verb || KANA_ONLY.test(verb) || !tail || !m.lemma!.endsWith(tail) || !e.reading.endsWith(toHiragana(m.lemma!))) continue;
        found.add(verb);
      }
    }
    return found.size === 1 ? { ...m, phrased: [...found][0]! } : m;
  });
}

/** The token with, before its other keys, the verb its expression says it is. */
function phrased(token: MergedToken, group: Morpheme[]): MergedToken {
  const lead = group.find((m) => m.pos !== '接頭詞') ?? group[0];
  if (!lead?.phrased || token.lookup.some((k) => k.key === lead.phrased)) return token;
  const reading = lead.lemma ? toKatakana(lead.lemma) : undefined;
  return { ...token, lookup: [{ key: lead.phrased, ...(reading ? { reading } : {}), ...(posOf(lead) ? { pos: posOf(lead) } : {}) }, ...token.lookup] };
}

/**
 * The token with, on the keys that look its word up, the word in kanji as the
 * analyser has it. Only the keys that are that word's own dictionary form or
 * the word as written: a key the dictionary gave for the whole group is
 * another word.
 *
 * A noun's name only. UniDic's name for a noun in kana is the word nine times
 * in ten where the dictionary would have shown another: そば is 側 and not
 * 蕎麦, バラ a rose, かぜ a cold. For a verb it is seven in ten: たつ is 経つ to
 * it whatever stands, 腹がたつ and 役にたつ too, and 目がさめた is 冷める, to
 * cool. So a verb keeps the dictionary's own order, but for the verbs below.
 *
 * Those are the verbs for which UniDic's name was never wrong where the
 * dictionary's first entry was another: うる in ありうる is 得る, not 売る;
 * パイプをくわえる 咥える, not 加える. Measured verb by verb over Tatoeba's word
 * index, and each of the 1,731 cards it changes in all of Tatoeba's sentences
 * read: 68 more open the verb the index names, none fewer. いけない, 1,598 of
 * them, opens 行ける and not 生ける, to arrange flowers. A verb goes in only
 * with no card put wrong. Left out for one: やむ (気にやむ is 病む), はく
 * (つばをはく), とける (靴ひもがとける), さす (油をさす), こえる, たたえる
 * (笑みをたたえる), かえす, かわく (のどがかわく), こむ; and とる, たつ, つく and
 * ひく, as often named wrong as right.
 */
const NAMED_VERBS = new Set<string>([
  'あやまる', 'いかる', 'いける', 'うたう', 'うる', 'かきわける', 'かする', 'くむ', 'くわえる', 'する',
  'すます', 'そう', 'とく', 'ねる', 'のっとる', 'ふかす', 'ぼける', 'もうける', 'ゆう', 'わずらう',
]);

function spelled(token: MergedToken, group: Morpheme[]): MergedToken {
  const lead = group.find((m) => m.pos !== '接頭詞') ?? group[0];
  if (!lead?.kanji || (lead.pos !== '名詞' && !(lead.pos === '動詞' && NAMED_VERBS.has(lead.lemma ?? '')))) return token;
  const own = new Set([lead.lemma, lead.surface]);
  return { ...token, lookup: token.lookup.map((k) => (own.has(k.key) ? { ...k, spelling: lead.kanji } : k)) };
}

/**
 * The token with, on the key that is its verb's dictionary form, how the verb
 * conjugates. A verb written in kana is several in the dictionary, and the
 * form in the line often fits only some: いら is 要る, 入る or 煎る, never 居る,
 * whose form before ない is い; かえ before た is 変える and not 帰る, which is
 * かえっ there.
 *
 * Not from a form that fits them all. The dictionary form says nothing — but
 * for a helper, which IPADIC has apart: うる in ありうる is 得る. いれば is 居る
 * and 要る alike. And before た or て the 五段 verbs run together: すった is
 * 吸う, 擦る and 刷る, and IPADIC's pick among them is a guess.
 *
 * Of 52,523 such verbs in Tatoeba's sentences, the card's first entry changes
 * for 167: いらない to 要る, a hundred times; ハゲてない to てる, "is doing",
 * from 照る, to shine; 絵をかえた to 替える from 帰る. None that was right is
 * wrong for it.
 */
const SAYS_NOTHING = new Set(['仮定形', '連用タ接続']);

function conjugated(token: MergedToken, group: Morpheme[]): MergedToken {
  const lead = group.find((m) => m.pos !== '接頭詞') ?? group[0];
  if (lead?.pos !== '動詞' || !lead.conjType || !lead.lemma || !KANA_ONLY.test(lead.lemma)) return token;
  if (SAYS_NOTHING.has(lead.conjForm ?? '') || (lead.conjForm === '基本形' && lead.pos1 !== '非自立')) return token;
  return { ...token, lookup: token.lookup.map((k) => (k.key === lead.lemma ? { ...k, conj: lead.conjType } : k)) };
}

/*
 * Which verb a kana spelling is where no expression says, from the words
 * before it: ピアノをひく is 弾く, 雨がやむ 止む, 駅につく 着く, 二年たつ 経つ.
 * And where nothing before it says, what it most often is: つく alone is 付く,
 * where the dictionary opened 吐く, to breathe out; とる 取る, not 摂る.
 *
 * The merge says only what the verb follows; the dictionary knows which verb
 * that makes it (src/dict/kana-verbs.ts, learned from Tatoeba), and weighs it
 * after how the verb conjugates, which says more where the form decides it.
 * Not after a verb's stem, where it is the second half of a compound, whatever
 * it most often is: ふざけあう is 合う.
 *
 * Learned from the half of Tatoeba's sentences with even ids and measured on
 * the other half, the card opens the verb the word index names for 17,617 of
 * its 17,946 verbs in kana, where it did for 17,213: 444 put right, 40 put
 * wrong. Of the 40, 21 are wrong (なすすべがない is 為す, not 成す;
 * 君がおこっている 怒る), 13 could be written either way (二食しかとらない,
 * ラジオをつける), and 6 are the index's own slips (電話がなる, which it has
 * as 成る).
 */

/** What stands before a verb, as kana-verbs.ts is keyed: a noun and its particle, 雨|が, or a noun alone, 年| in 二年たつ. */
export function before(morphemes: Morpheme[], i: number): string | undefined {
  const word = (m: Morpheme): string => m.lemma ?? m.surface;
  const [two, one] = [morphemes[i - 2], morphemes[i - 1]];
  if (one?.pos === '名詞') return `${word(one)}|`;
  if (one?.pos === '助詞' && two?.pos === '名詞') return `${word(two)}|${one.surface}`;
  return undefined;
}

function followedVerbs(morphemes: Morpheme[]): Morpheme[] {
  return morphemes.map((m, i) => {
    if (m.phrased || m.pos !== '動詞' || m.pos1 !== '自立' || !m.lemma || !KANA_ONLY.test(m.lemma)) return m;
    if (morphemes[i - 1]?.pos === '動詞') return m;
    return { ...m, follows: before(morphemes, i) ?? '' };
  });
}

/** The token with, on the key that is its verb's dictionary form, what the verb follows. */
function followed(token: MergedToken, group: Morpheme[]): MergedToken {
  const lead = group.find((m) => m.pos !== '接頭詞') ?? group[0];
  if (lead?.follows === undefined) return token;
  return { ...token, lookup: token.lookup.map((k) => (k.key === lead.lemma ? { ...k, follows: lead.follows } : k)) };
}

export function mergeMorphemes(morphemes: Morpheme[], lexicon?: Lexicon): MergedToken[] {
  const words = followedVerbs(phrasedVerbs(spoken(countryNames(cottonOrFluff(goldOrMoney(personOrSide(secondOpinions(morphemes, lexicon)))), lexicon), lexicon), lexicon));
  const token = (group: Morpheme[]): MergedToken => phrased(followed(conjugated(spelled(merge(group, lexicon), group), group), group), group);
  return constructions(groups(joinCompoundVerbs(joinCompounds(words, lexicon), lexicon)).flatMap((group) =>
    (unknownPair(group, lexicon) ? group.map((m) => token([m])) : [token(group)])));
}

/**
 * Every label merging can give an ending: the two tables', and the ones
 * written out above. The interface names each in the learner's language
 * (src/i18n/en/grammar.ts), and a test holds that table to naming every one.
 * The tables' are read from them; a label written out in a function has to
 * be listed here too, or it shows in English in every language.
 */
export const GRAMMAR_LABELS: readonly string[] = [...new Set([
  ...Object.values(GRAMMAR),
  ...Object.values(SURFACE_GRAMMAR),
  // fromConjugation
  'imperative', 'volitional',
  // labelAt
  'probably', 'past', 'passive', 'passive or potential', 'hearsay', 'must', 'without',
  // merge, for a potential verb undone to the verb it comes from
  'potential',
  // constructions
  'must', 'must not', "don't have to", 'may',
])];
