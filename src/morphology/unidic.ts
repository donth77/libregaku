import type { Morpheme } from './merge';

/**
 * UniDic's words as the merge rules read them.
 *
 * merge.ts was written against IPADIC: its part-of-speech names, its
 * conjugation names, and the morphemes' shape. UniDic is a better Japanese
 * dictionary — it knows ヤバい, すげえ, もん the particle, 偶に as たまに, and
 * reads 間 after a verb as あいだ — so its words are put into that shape here,
 * and the merge goes on as before.
 *
 * Lindera's UniDic columns: 0–3 part of speech, 4 conjugation type, 5
 * conjugation form, 6 the lemma's reading, 7 the lemma, 8 the surface as
 * written, 9 its pronunciation (long vowels as ー), 10 the written base form,
 * 11 its pronunciation, 12 the word's origin.
 */

export interface UnidicWord {
  surface: string;
  details: string[];
}

const col = (d: string[], i: number): string | undefined => (d[i] && d[i] !== '*' ? d[i] : undefined);

/** UniDic's word classes as IPADIC's [part of speech, detail]. */
function classOf(d: string[]): [pos: string, pos1?: string] {
  const [a, b, c] = [col(d, 0), col(d, 1), col(d, 2)];
  switch (a) {
    case '名詞':
      switch (b) {
        case '普通名詞':
          return ['名詞', c === 'サ変可能' || c === 'サ変形状詞可能' ? 'サ変接続' : c === '副詞可能' ? '副詞可能' : c === '形状詞可能' ? '形容動詞語幹' : '一般'];
        case '固有名詞': return ['名詞', '固有名詞'];
        case '数詞': return ['名詞', '数'];
        default: return ['名詞', '一般'];
      }
    case '代名詞': return ['名詞', '代名詞'];
    // そう and よう on a stem: IPADIC's suffix そう, "seems"; そう as hearsay is its 特殊.
    case '形状詞': return b === '助動詞語幹' ? ['名詞', (col(d, 7) ?? '').endsWith('伝聞') ? '特殊' : '接尾'] : ['名詞', '形容動詞語幹'];
    case '連体詞': return ['連体詞'];
    case '副詞': return ['副詞', '一般'];
    case '接続詞': return ['接続詞'];
    case '感動詞': return ['感動詞'];
    case 'フィラー': return ['フィラー'];
    case '動詞': return ['動詞', '自立'];
    case '形容詞': return ['形容詞', '自立'];
    case '助動詞': return ['助動詞'];
    case '助詞':
      switch (b) {
        case '格助詞': return ['助詞', '格助詞'];
        case '係助詞': return ['助詞', '係助詞'];
        case '接続助詞': return ['助詞', '接続助詞'];
        case '終助詞': return ['助詞', '終助詞'];
        case '副助詞': return ['助詞', '副助詞'];
        case '準体助詞': return ['助詞', '連体化'];
        default: return ['助詞', b];
      }
    case '接頭辞': return ['接頭詞', '名詞接続'];
    case '接尾辞': return b === '名詞的' ? ['名詞', '接尾'] : b === '動詞的' ? ['動詞', '非自立'] : b === '形容詞的' ? ['形容詞', '非自立'] : ['名詞', '接尾'];
    case '補助記号': return ['記号', b === '読点' ? '読点' : b === '句点' ? '句点' : '一般'];
    case '空白': return ['記号', '空白'];
    default: return [a ?? '未知語'];
  }
}

/** UniDic's forms as IPADIC names them: 連用形-促音便 is 連用タ接続, 終止形-一般 is 基本形. */
function formOf(d: string[]): string | undefined {
  const f = col(d, 5);
  if (!f) return undefined;
  if (/^連用形-(促音便|撥音便|イ音便|ウ音便)$/.test(f)) return '連用タ接続';
  if (f.startsWith('連用形')) return '連用形';
  if (f.startsWith('終止形') || f.startsWith('連体形')) return '基本形';
  if (f.startsWith('未然形')) return f.includes('セ') ? '未然ウ接続' : '未然形';
  if (f.startsWith('仮定形')) return '仮定形';
  if (f.startsWith('意志推量形')) return '未然ウ接続';
  if (f.startsWith('命令形')) return '命令形';
  if (f.startsWith('語幹')) return 'ガル接続';
  return f;
}

const KATAKANA_LONG = /ー/;
const KANA_WORD = /^[ぁ-ゖァ-ヺー]+$/;
const KATAKANA = /[ァ-ヺ]/;
const toHiragana = (t: string): string => t.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const toKatakana = (t: string): string => t.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const VOWEL_OF: Record<string, string> = {};
for (const [row, vowel] of [['アカガサザタダナハバパマヤラワァャ', 'ア'], ['イキギシジチヂニヒビピミリィ', 'イ'], ['ウクグスズツヅヌフブプムユルゥュヴ', 'ウ'], ['エケゲセゼテデネヘベペメレェ', 'イ'], ['オコゴソゾトドノホボポモヨロヲォョ', 'ウ']] as const) {
  for (const k of row) VOWEL_OF[k] = vowel;
}

/**
 * The kana reading of the word as written: UniDic gives the pronunciation,
 * with ー for a long vowel (トーキョー), and the lemma's reading in kana
 * (トウキョウ). Where the two are as long as each other, the lemma's kana fill
 * in each ー; where they are not (an inflected word), the vowel the ー lengthens
 * is written out, ウ after o and e, as the common spelling does.
 */
export function kanaReading(pron: string | undefined, lemmaReading: string | undefined): string | undefined {
  if (!pron) return undefined;
  if (!KATAKANA_LONG.test(pron)) return pron;
  const aligned = lemmaReading && lemmaReading.length === pron.length ? lemmaReading : undefined;
  let out = '';
  [...pron].forEach((c, i) => {
    if (c !== 'ー') {
      out += c;
      return;
    }
    // The lemma's own kana where it is a vowel in the same place (オオキク from オオキイ, トウキョウ); else the vowel lengthened.
    const kana = aligned?.[i];
    out += kana && 'アイウエオ'.includes(kana) ? kana : VOWEL_OF[out[out.length - 1] ?? ''] ?? 'ー';
  });
  return out;
}

/** The sentence as IPADIC-shaped morphemes. A word is read with the ones beside it. */
export function fromUnidic(words: readonly UnidicWord[]): Morpheme[] {
  const out: Morpheme[] = [];
  words.forEach((w, i) => {
    const d = w.details;
    let [pos, pos1] = classOf(d);
    const prev = words[i - 1];
    const prevForm = prev?.details[5] ?? '';
    // UniDic names a word with its sense after a hyphen: そう-様態, セックス-sex.
    const lemma = col(d, 7)?.replace(/-.*$/, '');
    const base = col(d, 10);
    // What is written in kana reads as it is written (すげえ is スゲエ, not the スゲー it is said as).
    let reading = KANA_WORD.test(w.surface) ? toKatakana(w.surface) : kanaReading(col(d, 9), col(d, 6));
    // 私 is わたし far more often than the わたくし UniDic gives it.
    if (w.surface === '私' && reading === 'ワタクシ') reading = 'ワタシ';

    // そう after a plain form is hearsay (待つそうだ), IPADIC's 特殊; on a stem it is "seems", its suffix.
    if (d[0] === '形状詞' && d[1] === '助動詞語幹' && w.surface === 'そう' && /^(終止形|連体形)/.test(prevForm)) pos1 = '特殊';
    // 回, 分, 人 after a number are counters, IPADIC's suffixes.
    if (d[0] === '名詞' && d[2] === '助数詞可能' && prev?.details[1] === '数詞') pos1 = '接尾';
    // たり and だり list what was done: IPADIC's 並立助詞, which the merge takes for an ending.
    if (d[0] === '助詞' && (w.surface === 'たり' || w.surface === 'だり')) pos1 = '並立助詞';
    // A verb or adjective that may be a helper is one only after a て-form (or a stem), as IPADIC says it.
    if ((pos === '動詞' || pos === '形容詞') && d[1] === '非自立可能' &&
      ((prev?.details[0] === '助詞' && (prev.surface === 'て' || prev.surface === 'で')) || prev?.details[0] === '動詞')) {
      pos1 = '非自立';
    }
    // ない after a verb's or an adjective's stem is the negative ending, an auxiliary to IPADIC: 食べない, ヤバくない.
    if (col(d, 7) === '無い' && (prev?.details[0] === '動詞' || (prev?.details[0] === '形容詞' && prevForm.startsWith('連用形')))) {
      pos = '助動詞';
      pos1 = undefined;
    }
    // A verb's stem before です or だ, or が, を or の, is a noun, as IPADIC has it: おススメです is お勧め, not
    // 勧める said politely, and しつけが is しつけ.
    const after = words[i + 1];
    const named = d[0] === '動詞' && d[5] === '連用形-一般' && after !== undefined && (
      (after.details[0] === '助動詞' && ['です', 'だ'].includes(col(after.details, 7) ?? '')) ||
      (after.details[0] === '助詞' && ['が', 'を', 'の'].includes(after.surface)));
    if (named) {
      pos = '名詞';
      pos1 = '一般';
    }

    const m: Morpheme = { surface: w.surface, pos };
    if (pos1) m.pos1 = pos1;
    /*
     * The dictionary form as it is written: する and ない, not UniDic's 為る and 無い. An ending is named by
     * its lemma (す is です, っす is です), and so is a word written in katakana for effect: やばい for ヤバい.
     */
    // Looked up as it is said: すすめ for ススメ.
    if (named) m.lemma = KANA_WORD.test(w.surface) ? toHiragana(w.surface) : w.surface;
    else if (lemma || base) {
      let form = pos === '助動詞' && d[0] === '助動詞' ? lemma ?? base
        : base && !(KATAKANA.test(base) && lemma && !KATAKANA.test(lemma)) ? base : lemma;
      // A word written in kana keeps its kana: UniDic's 駄目 for ダメ, 林檎 for リンゴ, 為る for する is not the
      // word on the learner's card. An inflected one takes the lemma's own reading, in hiragana.
      if (form && KANA_WORD.test(w.surface) && /[一-鿿]/.test(form)) {
        const own = col(d, 6);
        form = (d[5] ?? '').match(/^(終止形|連体形)/) || !col(d, 5) ? w.surface : own ? toHiragana(own) : w.surface;
      }
      // 感じる, not UniDic's 感ずる, which is the same verb said in the old way.
      if (form && /ずる$/.test(form) && /じ|ぜ/.test(w.surface)) form = form.replace(/ずる$/, 'じる');
      m.lemma = form;
    }
    if (reading) m.reading = reading;
    const form = named ? undefined : formOf(d);
    if (form) m.conjForm = form;

    // 行こう, 食べよう, だろう: one word to UniDic; to IPADIC a stem and う, which the merge names "volitional".
    if ((d[5] ?? '').startsWith('意志推量形') && w.surface.length > 1 && w.surface.endsWith('う')) {
      const stem = w.surface.slice(0, -1);
      // だろ and でしょ are 未然形 to IPADIC, a verb's stem 未然ウ接続.
      out.push({ ...m, surface: stem, conjForm: pos === '助動詞' ? '未然形' : '未然ウ接続', ...(reading ? { reading: reading.slice(0, -1) } : {}) });
      out.push({ surface: 'う', lemma: 'う', reading: 'ウ', pos: '助動詞', conjForm: '基本形' });
      return;
    }
    out.push(m);
  });
  return out;
}
