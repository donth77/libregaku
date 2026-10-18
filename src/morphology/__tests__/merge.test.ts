import { describe, expect, it } from 'vitest';
import { lexiconQueries, mergeMorphemes, type Lexicon, type LexiconEntry, type Morpheme, type SecondReading } from '../merge';

const m = (surface: string, pos?: string, pos1?: string, lemma?: string, reading?: string): Morpheme =>
  ({ surface, pos, pos1, lemma, reading });

describe('mergeMorphemes', () => {
  it('fuses a verb with its past auxiliary — the 来た case', () => {
    const out = mergeMorphemes([
      m('来', '動詞', '自立', '来る', 'キ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('来た');
    expect(out[0]?.lemma).toBe('来る');
    expect(out[0]?.reading).toBe('キタ');
    expect(out[0]?.parts).toEqual(['来', 'た']);
  });

  it('fuses a suru-noun and its する into one word, which is the noun', () => {
    const out = mergeMorphemes([
      m('勉強', '名詞', 'サ変接続', '勉強', 'ベンキョウ'),
      m('し', '動詞', '自立', 'する', 'シ'),
      m('て', '助詞', '接続助詞', 'て', 'テ'),
      m('いる', '動詞', '非自立', 'いる', 'イル'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('勉強している');
    // What a dictionary lists and a card is made for; the verb's own form goes with it.
    expect(out[0]).toMatchObject({ lemma: '勉強', usedAs: '勉強する', lemmaReading: 'ベンキョウ' });
  });

  it('fuses polite past onto a verb stem', () => {
    const out = mergeMorphemes([
      m('食べ', '動詞', '自立', '食べる', 'タベ'),
      m('まし', '助動詞', '*', 'ます', 'マシ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out[0]?.surface).toBe('食べました');
    expect(out[0]?.lemma).toBe('食べる');
  });

  it('keeps particles as their own tokens', () => {
    const out = mergeMorphemes([
      m('彼女', '名詞', '代名詞', '彼女', 'カノジョ'),
      m('は', '助詞', '係助詞', 'は', 'ハ'),
      m('日本語', '名詞', '一般', '日本語', 'ニホンゴ'),
    ]);
    expect(out.map((t) => t.surface)).toEqual(['彼女', 'は', '日本語']);
    expect(out[1]?.content).toBe(false);
  });

  it('attaches a prefix to the following noun', () => {
    const out = mergeMorphemes([
      m('お', '接頭詞', '名詞接続', 'お', 'オ'),
      m('金', '名詞', '一般', '金', 'カネ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('お金');
  });

  it('attaches a suffix', () => {
    const out = mergeMorphemes([
      m('私', '名詞', '代名詞', '私', 'ワタシ'),
      m('たち', '名詞', '接尾', 'たち', 'タチ'),
    ]);
    expect(out[0]?.surface).toBe('私たち');
  });

  it('does not let a particle absorb what follows it', () => {
    const out = mergeMorphemes([
      m('は', '助詞', '係助詞', 'は', 'ハ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out.map((t) => t.surface)).toEqual(['は', 'た']);
  });

  it('drops the reading when any morpheme lacks one, rather than inventing it', () => {
    const out = mergeMorphemes([
      m('来', '動詞', '自立', '来る', 'キ'),
      m('た', '助動詞', '*', 'た', undefined),
    ]);
    expect(out[0]?.reading).toBeUndefined();
  });

  it('reassembles to the original text', () => {
    const src = [
      m('彼女', '名詞', '代名詞', '彼女', 'カノジョ'),
      m('は', '助詞', '係助詞', 'は', 'ハ'),
      m('勉強', '名詞', 'サ変接続', '勉強', 'ベンキョウ'),
      m('し', '動詞', '自立', 'する', 'シ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ];
    expect(mergeMorphemes(src).map((t) => t.surface).join('')).toBe(
      src.map((x) => x.surface).join(''),
    );
  });
});

describe('copula after a noun', () => {
  it('keeps ワールド and です apart', () => {
    // です is a copula, not an inflection of the noun — two lookups.
    const out = mergeMorphemes([
      m('ワールド', '名詞', '一般', 'ワールド', 'ワールド'),
      m('です', '助動詞', '*', 'です', 'デス'),
    ]);
    expect(out.map((t) => t.surface)).toEqual(['ワールド', 'です']);
  });

  it('keeps 学生 and でし + た apart from the noun', () => {
    const out = mergeMorphemes([
      m('学生', '名詞', '一般', '学生', 'ガクセイ'),
      m('でし', '助動詞', '*', 'です', 'デシ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out[0]?.surface).toBe('学生');
    expect(out.length).toBeGreaterThan(1);
  });

  it('still attaches auxiliaries to a verb', () => {
    const out = mergeMorphemes([
      m('来', '動詞', '自立', '来る', 'キ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('来た');
  });

  it('still attaches auxiliaries to an adjective', () => {
    const out = mergeMorphemes([
      m('高', '形容詞', '自立', '高い', 'タカ'),
      m('かっ', '助動詞', '*', 'た', 'カッ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
  });

  it('attaches an auxiliary once a suru-noun has become verbal', () => {
    // 勉強 heads a noun group until する joins it; then た belongs.
    const out = mergeMorphemes([
      m('勉強', '名詞', 'サ変接続', '勉強', 'ベンキョウ'),
      m('し', '動詞', '自立', 'する', 'シ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('勉強した');
    expect(out[0]).toMatchObject({ lemma: '勉強', usedAs: '勉強する' });
  });
});

describe('conjunctive particles', () => {
  it('keeps the conditional ば with its verb', () => {
    const out = mergeMorphemes([
      m('うまくいけ', '動詞', '自立', 'うまくいく', 'ウマクイケ'),
      m('ば', '助詞', '接続助詞', 'ば', 'バ'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('うまくいけば');
    expect(out[0]?.lemma).toBe('うまくいく');
  });

  it('keeps たり with its verb', () => {
    const out = mergeMorphemes([
      m('行っ', '動詞', '自立', '行く', 'イッ'),
      m('たり', '助詞', '接続助詞', 'たり', 'タリ'),
    ]);
    expect(out[0]?.surface).toBe('行ったり');
  });

  it('does NOT swallow a clause connector', () => {
    // が, から, ので join clauses. Attaching them would pull the rest of the
    // sentence into one token.
    for (const p of ['が', 'から', 'ので', 'けれど', 'し']) {
      const out = mergeMorphemes([
        m('行く', '動詞', '自立', '行く', 'イク'),
        m(p, '助詞', '接続助詞', p, p),
      ]);
      expect(out.map((t) => t.surface), `${p} should not attach`).toEqual(['行く', p]);
    }
  });

  it('does not attach ば to a noun', () => {
    const out = mergeMorphemes([
      m('ワールド', '名詞', '一般', 'ワールド', 'ワールド'),
      m('ば', '助詞', '接続助詞', 'ば', 'バ'),
    ]);
    expect(out).toHaveLength(2);
  });

  it('still handles て on the way to an auxiliary', () => {
    const out = mergeMorphemes([
      m('し', '動詞', '自立', 'する', 'シ'),
      m('て', '助詞', '接続助詞', 'て', 'テ'),
      m('いる', '動詞', '非自立', 'いる', 'イル'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.surface).toBe('している');
  });
});

describe('helper verbs need the te-form', () => {
  it('does not merge a helper verb straight onto an adjective', () => {
    // うまく + いけ + ば used to become one token headed by the adjective, so
    // hovering うまくいけば produced 上手い.
    const out = mergeMorphemes([
      m('うまく', '形容詞', '自立', '上手い', 'ウマク'),
      m('いけ', '動詞', '自立', 'いく', 'イケ'),
      m('ば', '助詞', '接続助詞', 'ば', 'バ'),
    ]);
    expect(out[0]?.surface).toBe('うまく');
    expect(out[1]?.surface).toBe('いけば');
    expect(out[1]?.lemma).toBe('いく');
  });

  it('still merges a helper verb after て', () => {
    const out = mergeMorphemes([
      m('持っ', '動詞', '自立', '持つ', 'モッ'),
      m('て', '助詞', '接続助詞', 'て', 'テ'),
      m('いく', '動詞', '非自立', 'いく', 'イク'),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.lemma).toBe('持つ');
  });
});

describe('grammar labels', () => {
  it('names the conditional', () => {
    const out = mergeMorphemes([
      m('いけ', '動詞', '自立', 'いく', 'イケ'),
      m('ば', '助詞', '接続助詞', 'ば', 'バ'),
    ]);
    expect(out[0]?.inflections).toEqual(['conditional']);
  });

  it('names a chain in order', () => {
    const out = mergeMorphemes([
      m('食べ', '動詞', '自立', '食べる', 'タベ'),
      m('まし', '助動詞', '*', 'ます', 'マシ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out[0]?.inflections).toEqual(['polite', 'past']);
  });

  it('names te-form plus a helper verb', () => {
    const out = mergeMorphemes([
      m('し', '動詞', '自立', 'する', 'シ'),
      m('て', '助詞', '接続助詞', 'て', 'テ'),
      m('いる', '動詞', '非自立', 'いる', 'イル'),
    ]);
    expect(out[0]?.inflections).toEqual(['te-form', 'ongoing']);
  });

  it('leaves an uninflected word unlabelled', () => {
    const out = mergeMorphemes([m('彼女', '名詞', '代名詞', '彼女', 'カノジョ')]);
    expect(out[0]?.inflections).toEqual([]);
  });
});

describe('grammar coverage', () => {
  const withConj = (
    surface: string, pos: string, pos1: string, lemma: string, conjForm?: string,
  ): Morpheme => ({ surface, pos, pos1, lemma, reading: surface, conjForm });

  it('labels an imperative, which has no ending to look up', () => {
    const out = mergeMorphemes([withConj('行け', '動詞', '自立', '行く', '命令ｅ')]);
    expect(out[0]?.inflections).toEqual(['imperative']);
  });

  it('labels a volitional', () => {
    const out = mergeMorphemes([
      withConj('行こ', '動詞', '自立', '行く', '未然ウ接続'),
      m('う', '助動詞', '*', 'う', 'ウ'),
    ]);
    expect(out[0]?.inflections).toContain('volitional');
  });

  it('labels negative past as a chain', () => {
    const out = mergeMorphemes([
      m('食べ', '動詞', '自立', '食べる', 'タベ'),
      m('なかっ', '助動詞', '*', 'ない', 'ナカッ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    expect(out[0]?.inflections).toEqual(['negative', 'past']);
  });

  it('labels causative-passive', () => {
    const out = mergeMorphemes([
      m('食べ', '動詞', '自立', '食べる', 'タベ'),
      m('させ', '助動詞', '*', 'させる', 'サセ'),
      m('られ', '助動詞', '*', 'られる', 'ラレ'),
      m('た', '助動詞', '*', 'た', 'タ'),
    ]);
    // After a causative, られる is the passive: made to eat.
    expect(out[0]?.inflections).toEqual(['causative', 'passive', 'past']);
  });

  it('labels spoken contractions, which subtitles are full of', () => {
    // What IPADIC really emits for 行っちゃう: no て before ちゃう. The test
    // this replaces fed 食べ + て + ちゃう, a sequence the analyser never
    // produces, and so passed while every real contraction split in two.
    const out = mergeMorphemes([
      { surface: '行っ', lemma: '行く', reading: 'イッ', pos: '動詞', pos1: '自立', conjForm: '連用タ接続' },
      { surface: 'ちゃう', lemma: 'ちゃう', reading: 'チャウ', pos: '動詞', pos1: '非自立', conjForm: '基本形' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.inflections).toContain('completely, or regrettably');
  });

  it('labels desire', () => {
    const out = mergeMorphemes([
      m('行き', '動詞', '自立', '行く', 'イキ'),
      m('たい', '助動詞', '*', 'たい', 'タイ'),
    ]);
    expect(out[0]?.inflections).toEqual(['want to']);
  });
});

describe('a second opinion on a word in kanji', () => {
  const lexicon = (words: Record<string, LexiconEntry[]>): Lexicon => (form) => words[form];
  const word = (reading: string, more: Partial<LexiconEntry> = {}): LexiconEntry => ({ word: '', reading, pos: ['n'], ...more });
  /** IPADIC's word, with UniDic's reading of it. */
  const with2 = (surface: string, reading: string, second: SecondReading, pos1 = '一般'): Morpheme =>
    ({ surface, lemma: surface, reading, pos: '名詞', pos1, second });
  const one = (morpheme: Morpheme, words: Record<string, LexiconEntry[]>) => mergeMorphemes([morpheme], lexicon(words))[0];

  it('is taken where the dictionary ranks the word first of its spelling: 後 is あと, not のち', () => {
    const ato = with2('後', 'ノチ', { reading: 'アト' });
    expect(one(ato, { 後: [word('あと', { leads: true }), word('のち')] })?.reading).toBe('アト');
    // And not where it only stands first in the dictionary's file: 実 is み as often as じつ.
    const jitsu = with2('実', 'ミ', { reading: 'ジツ' });
    expect(one(jitsu, { 実: [word('じつ'), word('み')] })?.reading).toBe('ミ');
  });

  it('is taken where the dictionary has no word read as IPADIC reads it: 金星 is not カナボシ', () => {
    const venus = with2('金星', 'カナボシ', { reading: 'キンセイ' }, '固有名詞');
    expect(one(venus, { 金星: [word('きんぼし'), word('きんせい')] })?.reading).toBe('キンセイ');
    // A reading voiced as in a compound is the dictionary's word: 生産高 is だか, the たか it lists.
    const daka = with2('高', 'ダカ', { reading: 'コウ' }, '接尾');
    expect(mergeMorphemes([{ surface: '生産', lemma: '生産', reading: 'セイサン', pos: '名詞', pos1: 'サ変接続' }, daka],
      lexicon({ 高: [word('たか'), word('こう')] }))[0]?.reading).toBe('セイサンダカ');
  });

  it('is taken where it is a common word of Japanese\'s own: 角 is かど; 階 is not きざはし', () => {
    const kado = with2('角', 'カク', { reading: 'カド', native: true });
    const token = one(kado, { 角: [word('かく', { common: true }), word('かど', { common: true })] });
    expect(token?.reading).toBe('カド');
    // The card is looked up by the reading taken.
    expect(token?.lookup[0]).toEqual({ key: '角', reading: 'カド', pos: '名詞,一般' });
    const stairs = with2('階', 'カイ', { reading: 'キザハシ', native: true });
    expect(one(stairs, { 階: [word('かい', { common: true }), word('きざはし')] })?.reading).toBe('カイ');
    // Nor a reading from Chinese that the dictionary does not rank first: 米 is not べい.
    const rice = with2('米', 'コメ', { reading: 'ベイ' });
    expect(one(rice, { 米: [word('こめ', { common: true }), word('べい', { common: true })] })?.reading).toBe('コメ');
    // Nor a word usually written in kana, where the line has kanji: 辛い is からい before it is つらい.
    const hot: Morpheme = { surface: '辛い', lemma: '辛い', reading: 'カライ', pos: '形容詞', pos1: '自立', conjForm: '基本形', second: { reading: 'ツライ', native: true } };
    expect(one(hot, { 辛い: [word('からい', { common: true }), word('つらい', { common: true, kana: true })] })?.reading).toBe('カライ');
  });

  it('is IPADIC\'s where the dictionary is not there to ask, or has no such word', () => {
    const kado = with2('角', 'カク', { reading: 'カド', native: true });
    expect(mergeMorphemes([kado])[0]?.reading).toBe('カク');
    expect(one(kado, {})?.reading).toBe('カク');
    expect(one(kado, { 角: [word('かく', { common: true })] })?.reading).toBe('カク');
  });

  it('makes a word of what IPADIC took for an ending or a prefix: 明日家に is 明日 and 家', () => {
    const ashita: Morpheme = { surface: '明日', lemma: '明日', reading: 'アシタ', pos: '名詞', pos1: '副詞可能' };
    const ka = with2('家', 'カ', { reading: 'イエ', pos: '名詞', pos1: '一般', native: true }, '接尾');
    const words = { 家: [word('いえ', { common: true, leads: true }), word('か')] };
    // Without the dictionary's word for it the two are one, read あしたか.
    expect(mergeMorphemes([ashita, ka]).map((t) => t.surface)).toEqual(['明日家']);
    const out = mergeMorphemes([ashita, ka], lexicon(words));
    expect(out.map((t) => [t.surface, t.reading])).toEqual([['明日', 'アシタ'], ['家', 'イエ']]);
    // Such a word need not be marked common: 的 after の is まと.
    const mato = with2('的', 'テキ', { reading: 'マト', pos: '名詞', pos1: '一般', native: true }, '接尾');
    expect(one(mato, { 的: [word('てき', { common: true, leads: true }), word('まと')] })?.reading).toBe('マト');
  });

  it('leaves an ending that makes a dictionary word with what it is on: 先生方 is せんせいがた', () => {
    const sensei: Morpheme = { surface: '先生', lemma: '先生', reading: 'センセイ', pos: '名詞', pos1: '一般' };
    const gata = with2('方', 'カタ', { reading: 'ホウ', pos: '名詞', pos1: '一般' }, '接尾');
    const words = { 方: [word('ほう', { common: true, leads: true }), word('かた', { common: true })], 先生方: [word('せんせいがた')] };
    const out = mergeMorphemes([sensei, gata], lexicon(words));
    expect(out.map((t) => [t.surface, t.reading])).toEqual([['先生方', 'センセイガタ']]);
  });

  it('takes another verb with its dictionary form: 雨が降ります is 降る', () => {
    const ori: Morpheme = {
      surface: '降り', lemma: '降りる', reading: 'オリ', pos: '動詞', pos1: '自立', conjForm: '連用形',
      second: { reading: 'フリ', lemma: '降る', conjForm: '連用形', native: true },
    };
    const masu: Morpheme = { surface: 'ます', lemma: 'ます', reading: 'マス', pos: '助動詞', conjForm: '基本形' };
    const words = { 降る: [word('ふる', { common: true, leads: true, pos: ['v5r'] })], 降りる: [word('おりる', { common: true, leads: true, pos: ['v1'] })] };
    const [token] = mergeMorphemes([ori, masu], lexicon(words));
    expect([token?.surface, token?.lemma, token?.reading, token?.lemmaReading]).toEqual(['降ります', '降る', 'フリマス', 'フル']);
  });

  it('leaves a verb IPADIC reads as the potential of one the dictionary has: 弾ける is ひける, "can play"', () => {
    const hike: Morpheme = {
      surface: '弾け', lemma: '弾ける', reading: 'ヒケ', pos: '動詞', pos1: '自立', conjForm: '連用形',
      second: { reading: 'ハジケ', native: true },
    };
    const words = {
      弾ける: [word('はじける', { common: true, leads: true, pos: ['v1'] })],
      弾く: [word('はじく', { common: true, pos: ['v5k'] }), word('ひく', { common: true, pos: ['v5k'] })],
    };
    expect(one(hike, words)?.reading).toBe('ヒケ');
  });

  it('asks the dictionary about the line read both ways', () => {
    const ashita: Morpheme = { surface: '明日', lemma: '明日', reading: 'アシタ', pos: '名詞', pos1: '副詞可能' };
    const ka = with2('家', 'カ', { reading: 'イエ', pos: '名詞', pos1: '一般', native: true }, '接尾');
    // 明日家, the two as one word, and 家 for the reading.
    expect(lexiconQueries([ashita, ka]).sort()).toEqual(['家', '明日家']);
    const ori: Morpheme = {
      surface: '降り', lemma: '降りる', reading: 'オリ', pos: '動詞', pos1: '自立', conjForm: '連用形',
      second: { reading: 'フリ', lemma: '降る', conjForm: '連用形', native: true },
    };
    expect(lexiconQueries([ori]).sort()).toEqual(['降りる', '降る']);
  });
});

describe('a word in kana the analyser names in kanji', () => {
  it('is looked up with the name, where it is a noun: そば is 側', () => {
    const soba: Morpheme = { surface: 'そば', lemma: 'そば', reading: 'ソバ', pos: '名詞', pos1: '一般', kanji: '側' };
    expect(mergeMorphemes([soba])[0]?.lookup).toEqual([{ key: 'そば', reading: 'ソバ', pos: '名詞,一般', spelling: '側' }]);
  });

  it('is looked up without it where it is a verb: たつ is 経つ to UniDic whatever stands', () => {
    const tatsu: Morpheme = { surface: 'たつ', lemma: 'たつ', reading: 'タツ', pos: '動詞', pos1: '自立', conjForm: '基本形', kanji: '経つ' };
    expect(mergeMorphemes([tatsu])[0]?.lookup).toEqual([{ key: 'たつ', reading: 'タツ', pos: '動詞,自立' }]);
  });

  it('is looked up with it for a verb whose name was never wrong: うる in ありうる is 得る', () => {
    const uru: Morpheme = { surface: 'うる', lemma: 'うる', reading: 'ウル', pos: '動詞', pos1: '非自立', conjForm: '基本形', kanji: '得る' };
    expect(mergeMorphemes([uru])[0]?.lookup).toEqual([{ key: 'うる', reading: 'ウル', pos: '動詞,非自立', spelling: '得る' }]);
  });

  it('is looked up without it for a verb it names wrongly once: 気にやむ is 病む, not 止む', () => {
    const yamu: Morpheme = { surface: 'やむ', lemma: 'やむ', reading: 'ヤム', pos: '動詞', pos1: '自立', conjForm: '基本形', kanji: '止む' };
    expect(mergeMorphemes([yamu])[0]?.lookup).toEqual([{ key: 'やむ', reading: 'ヤム', pos: '動詞,自立' }]);
  });
});

describe('何 and 間, which the line reads', () => {
  const nani: Morpheme = { surface: '何', lemma: '何', reading: 'ナニ', pos: '名詞', pos1: '代名詞' };
  const after = (surface: string, pos: string, reading: string, lemma = surface): Morpheme => ({ surface, lemma, reading, pos });
  const reads = (...next: Morpheme[]): string | undefined => mergeMorphemes([nani, ...next])[0]?.reading;

  it('reads 何 なん before t, d and n: 何ですか, 何と, 何の', () => {
    expect(reads(after('です', '助動詞', 'デス'))).toBe('ナン');
    expect(reads(after('と', '助詞', 'ト'))).toBe('ナン');
    expect(reads(after('の', '助詞', 'ノ'))).toBe('ナン');
    expect(reads(after('な', '助動詞', 'ナ', 'だ'))).toBe('ナン');
  });

  it('reads it なに before the rest, before に, and before a word that is no particle', () => {
    expect(reads(after('が', '助詞', 'ガ'))).toBe('ナニ');
    expect(reads(after('か', '助詞', 'カ'))).toBe('ナニ');
    expect(reads(after('に', '助詞', 'ニ'))).toBe('ナニ');
    expect(reads(after('って', '助詞', 'ッテ'))).toBe('ナニ');
    expect(reads(after('内緒', '名詞', 'ナイショ'))).toBe('ナニ');
    expect(reads()).toBe('ナニ');
  });

  it('reads 間 ま where nothing before it says whose: 少し間を置いて', () => {
    const aida: Morpheme = { surface: '間', lemma: '間', reading: 'アイダ', pos: '名詞', pos1: '副詞可能' };
    const wo = after('を', '助詞', 'ヲ');
    const sukoshi: Morpheme = { surface: '少し', lemma: '少し', reading: 'スコシ', pos: '副詞', pos1: '助詞類接続' };
    expect(mergeMorphemes([sukoshi, aida, wo]).map((t) => t.reading)).toEqual(['スコシ', 'マ', 'ヲ']);
    // 二人の間を: whose it is, is said.
    const futari: Morpheme = { surface: '二人', lemma: '二人', reading: 'フタリ', pos: '名詞', pos1: '一般' };
    const no: Morpheme = { surface: 'の', lemma: 'の', reading: 'ノ', pos: '助詞', pos1: '連体化' };
    expect(mergeMorphemes([futari, no, aida, wo])[2]?.reading).toBe('アイダ');
  });
});

describe('〜たまえ, an order on a verb\'s stem', () => {
  const yame: Morpheme = { surface: 'やめ', lemma: 'やめる', reading: 'ヤメ', pos: '動詞', pos1: '自立', conjForm: '連用形' };
  const ta: Morpheme = { surface: 'た', lemma: 'た', reading: 'タ', pos: '助動詞', conjForm: '基本形' };
  const noise = (surface: string, reading: string): Morpheme => ({ surface, lemma: surface, reading, pos: 'フィラー' });

  it('is read from た and two noises, as IPADIC has it after a stem that is also the form before た: やめたまえ', () => {
    const [token, ...rest] = mergeMorphemes([yame, ta, noise('ま', 'マ'), noise('え', 'エ')]);
    expect(rest).toEqual([]);
    expect([token?.surface, token?.lemma, token?.reading, token?.inflections]).toEqual(['やめたまえ', 'やめる', 'ヤメタマエ', ['imperative']]);
  });

  it('leaves the と of what was said: 助けたまえと祈った', () => {
    expect(mergeMorphemes([yame, ta, noise('ま', 'マ'), noise('えと', 'エト')]).map((t) => t.surface)).toEqual(['やめたまえ', 'と']);
  });

  it('is read from たまえ whole, a name to IPADIC, after another stem: 守りたまえ', () => {
    const mamori: Morpheme = { surface: '守り', lemma: '守る', reading: 'マモリ', pos: '動詞', pos1: '自立', conjForm: '連用形' };
    const tamae: Morpheme = { surface: 'たまえ', lemma: 'たまえ', reading: 'タマエ', pos: '名詞', pos1: '固有名詞' };
    expect(mergeMorphemes([mamori, tamae]).map((t) => [t.surface, t.lemma])).toEqual([['守りたまえ', '守る']]);
    // Not after a noun: たまえ there is the name.
    const kyou: Morpheme = { surface: '今日', lemma: '今日', reading: 'キョウ', pos: '名詞', pos1: '副詞可能' };
    expect(mergeMorphemes([kyou, tamae]).map((t) => t.surface)).toEqual(['今日', 'たまえ']);
  });

  it('is read from た and まえ, 前, where the line ends on it, and left where it goes on: 来た前に', () => {
    const mae: Morpheme = { surface: 'まえ', lemma: 'まえ', reading: 'マエ', pos: '名詞', pos1: '副詞可能' };
    expect(mergeMorphemes([yame, ta, mae]).map((t) => t.surface)).toEqual(['やめたまえ']);
    const ni: Morpheme = { surface: 'に', lemma: 'に', reading: 'ニ', pos: '助詞', pos1: '格助詞' };
    expect(mergeMorphemes([yame, ta, mae, ni]).map((t) => t.surface)).toEqual(['やめた', 'まえ', 'に']);
  });

  it('leaves た and noises that follow no verb', () => {
    expect(mergeMorphemes([ta, noise('ま', 'マ'), noise('え', 'エ')]).map((t) => t.surface)).toEqual(['た', 'ま', 'え']);
  });
});

describe('a country\'s one-letter name, where a word stands', () => {
  const lexicon = (words: Record<string, LexiconEntry[]>): Lexicon => (form) => words[form];
  const kome: Record<string, LexiconEntry[]> = { 米: [{ word: '米', reading: 'こめ', pos: ['n'], common: true, leads: true }, { word: '米', reading: 'べい', pos: ['n'] }] };
  const bei: Morpheme = { surface: '米', lemma: '米', reading: 'ベイ', pos: '名詞', pos1: '固有名詞', country: true };
  const wa: Morpheme = { surface: 'は', lemma: 'は', reading: 'ハ', pos: '助詞', pos1: '係助詞' };

  it('is the word the dictionary ranks first, before a particle: 米は is こめ', () => {
    const [rice] = mergeMorphemes([bei, wa], lexicon(kome));
    expect([rice?.reading, rice?.pos, rice?.lookup[0]]).toEqual(['コメ', '名詞', { key: '米', reading: 'コメ', pos: '名詞,一般' }]);
    expect(lexiconQueries([bei, wa])).toEqual(['米']);
  });

  it('is the name before what it is joined to, after a noun, and without the dictionary: 米大統領, 英米', () => {
    const president: Morpheme = { surface: '大統領', lemma: '大統領', reading: 'ダイトウリョウ', pos: '名詞', pos1: '一般' };
    expect(mergeMorphemes([bei, president], lexicon(kome))[0]?.reading).toBe('ベイ');
    const ei: Morpheme = { surface: '英', lemma: '英', reading: 'エイ', pos: '名詞', pos1: '固有名詞', country: true };
    expect(mergeMorphemes([ei, bei, wa], lexicon(kome)).map((t) => t.reading)).toEqual(['エイ', 'ベイ', 'ハ']);
    expect(mergeMorphemes([bei, wa])[0]?.reading).toBe('ベイ');
    // Nor where the dictionary's first word does not lead.
    expect(mergeMorphemes([bei, wa], lexicon({ 米: [{ word: '米', reading: 'こめ' }, { word: '米', reading: 'べい' }] }))[0]?.reading).toBe('ベイ');
  });

  it('makes a word with the name beside it, where the dictionary has one: 日本中 is にほんじゅう, 日米 にちべい', () => {
    const nihon: Morpheme = { surface: '日本', lemma: '日本', reading: 'ニホン', pos: '名詞', pos1: '固有名詞', country: true };
    const chuu: Morpheme = { surface: '中', lemma: '中', reading: 'チュウ', pos: '名詞', pos1: '固有名詞', country: true };
    const words = { 日本中: [{ word: '日本中', reading: 'にほんじゅう', pos: ['n'] }] };
    expect(lexiconQueries([nihon, chuu])).toContain('日本中');
    expect(mergeMorphemes([nihon, chuu], lexicon(words)).map((t) => [t.surface, t.reading])).toEqual([['日本中', 'ニホンジュウ']]);
    // No such word: the two as they were.
    expect(mergeMorphemes([nihon, chuu], lexicon({})).map((t) => t.surface)).toEqual(['日本', '中']);
  });
});

describe('a word that begins an expression the dictionary has', () => {
  const lexicon = (words: Record<string, LexiconEntry[]>): Lexicon => (form) => words[form];
  const mi: Morpheme = { surface: '実', lemma: '実', reading: 'ミ', pos: '名詞', pos1: '一般', second: { reading: 'ジツ' } };
  const wo: Morpheme = { surface: 'を', lemma: 'を', reading: 'ヲ', pos: '助詞', pos1: '格助詞' };
  const iu: Morpheme = { surface: '言う', lemma: '言う', reading: 'イウ', pos: '動詞', pos1: '自立', conjForm: '基本形' };
  const to: Morpheme = { surface: 'と', lemma: 'と', reading: 'ト', pos: '助詞', pos1: '接続助詞' };
  // 実 is じつ and み, level: neither leads, and UniDic's じつ is not taken on its own.
  const both = { 実: [{ word: '実', reading: 'じつ', common: true }, { word: '実', reading: 'み', common: true }] };

  it('reads as the expression does: 実を言うと is じつ, 実を結ぶ is み', () => {
    expect(mergeMorphemes([mi, wo, iu, to], lexicon(both))[0]?.reading).toBe('ミ');
    const said = { ...both, 実を言うと: [{ word: '実を言うと', reading: 'じつをいうと', pos: ['exp'] }] };
    expect(mergeMorphemes([mi, wo, iu, to], lexicon(said))[0]?.reading).toBe('ジツ');
    // The other way: UniDic's reading would be taken, and the expression keeps IPADIC's.
    const musubi: Morpheme = { surface: '結ん', lemma: '結ぶ', reading: 'ムスン', pos: '動詞', pos1: '自立', conjForm: '連用タ接続' };
    const leading = { 実: [{ word: '実', reading: 'じつ', common: true, leads: true }, { word: '実', reading: 'み', common: true }] };
    expect(mergeMorphemes([mi, wo, musubi], lexicon(leading))[0]?.reading).toBe('ジツ');
    const fruit = { ...leading, 実を結ぶ: [{ word: '実を結ぶ', reading: 'みをむすぶ', pos: ['exp', 'v5b'] }] };
    expect(mergeMorphemes([mi, wo, musubi], lexicon(fruit))[0]?.reading).toBe('ミ');
  });

  it('asks the dictionary about the word and the next two or three, as written and in the dictionary form', () => {
    const asked = lexiconQueries([mi, wo, { ...iu, surface: '言え', conjForm: '仮定形' }, { ...to, surface: 'ば', lemma: 'ば', reading: 'バ' }]);
    expect(asked).toEqual(expect.arrayContaining(['実を言う', '実を言え', '実を言えば']));
    // Not the word and one more: 後に is のちに, "later", and あと after の.
    expect(asked).not.toContain('実を');
  });
});

describe('くれえ, "about", as rough speech says くらい', () => {
  const kure: Morpheme = { surface: 'くれ', lemma: 'くれる', reading: 'クレ', pos: '動詞', pos1: '自立', conjForm: '連用形' };
  const e: Morpheme = { surface: 'え', lemma: 'え', reading: 'エ', pos: 'フィラー' };
  const kakaru: Morpheme = { surface: 'かかる', lemma: 'かかる', reading: 'カカル', pos: '動詞', pos1: '自立', conjForm: '基本形' };
  const surfaces = (ms: Morpheme[]): string[] => mergeMorphemes(ms).map((t) => t.surface);

  it('is the particle after どの, and after それ or 少し where the line goes on', () => {
    const dono: Morpheme = { surface: 'どの', lemma: 'どの', reading: 'ドノ', pos: '連体詞' };
    const [, about] = mergeMorphemes([dono, kure, e, kakaru]);
    expect([about?.surface, about?.lemma, about?.content]).toEqual(['くれえ', 'くらい', false]);
    const sore: Morpheme = { surface: 'それ', lemma: 'それ', reading: 'ソレ', pos: '名詞', pos1: '代名詞' };
    expect(surfaces([sore, kure, e, kakaru])).toEqual(['それ', 'くれえ', 'かかる']);
  });

  it('is the particle where UniDic has it whole, as 黒い said roughly: どのくれえ時間かかる', () => {
    const dono: Morpheme = { surface: 'どの', lemma: 'どの', reading: 'ドノ', pos: '連体詞' };
    const black: Morpheme = { surface: 'くれえ', lemma: 'くろい', reading: 'クレエ', pos: '形容詞', pos1: '自立', conjForm: '基本形' };
    const time: Morpheme = { surface: '時間', lemma: '時間', reading: 'ジカン', pos: '名詞', pos1: '副詞可能' };
    expect(mergeMorphemes([dono, black, time]).map((t) => [t.surface, t.lemma])).toEqual([['どの', 'どの'], ['くれえ', 'くらい'], ['時間', '時間']]);
    // On its own it is left an adjective: くれえ部屋.
    expect(mergeMorphemes([black, time])[0]?.lemma).toBe('くろい');
  });

  it('is the verb, drawn out, after て and where the line ends on it: 助けてくれえ, これくれえ！', () => {
    const tasuke: Morpheme = { surface: '助け', lemma: '助ける', reading: 'タスケ', pos: '動詞', pos1: '自立', conjForm: '連用形' };
    const te: Morpheme = { surface: 'て', lemma: 'て', reading: 'テ', pos: '助詞', pos1: '接続助詞' };
    expect(mergeMorphemes([tasuke, te, { ...kure, pos1: '非自立' }, e])[0]?.lemma).toBe('助ける');
    const kore: Morpheme = { surface: 'これ', lemma: 'これ', reading: 'コレ', pos: '名詞', pos1: '代名詞' };
    expect(mergeMorphemes([kore, kure, e])[1]?.lemma).toBe('くれる');
    expect(mergeMorphemes([kore, kure, e, { surface: '！', pos: '記号', pos1: '一般' }])[1]?.lemma).toBe('くれる');
  });
});

describe('a verb in kana, looked up by how it conjugates', () => {
  const nai: Morpheme = { surface: 'ない', lemma: 'ない', reading: 'ナイ', pos: '助動詞', conjForm: '基本形' };
  const verb = (surface: string, lemma: string, conjForm: string, conjType: string, more: Partial<Morpheme> = {}): Morpheme =>
    ({ surface, lemma, reading: surface, pos: '動詞', pos1: '自立', conjForm, conjType, ...more });

  it('says so where the form fits only some verbs of the spelling: いら in いらない', () => {
    const [token] = mergeMorphemes([verb('いら', 'いる', '未然形', '五段・ラ行'), nai]);
    expect(token?.lookup[0]).toMatchObject({ key: 'いる', pos: '動詞,自立', conj: '五段・ラ行' });
  });

  it('says nothing from a form that fits them all: いる, いれば, すった', () => {
    expect(mergeMorphemes([verb('いる', 'いる', '基本形', '一段')])[0]?.lookup[0]?.conj).toBeUndefined();
    const ba: Morpheme = { surface: 'ば', lemma: 'ば', reading: 'バ', pos: '助詞', pos1: '接続助詞' };
    expect(mergeMorphemes([verb('いれ', 'いる', '仮定形', '五段・ラ行'), ba])[0]?.lookup[0]?.conj).toBeUndefined();
    const ta: Morpheme = { surface: 'た', lemma: 'た', reading: 'タ', pos: '助動詞', conjForm: '基本形' };
    expect(mergeMorphemes([verb('すっ', 'する', '連用タ接続', '五段・ラ行'), ta])[0]?.lookup[0]?.conj).toBeUndefined();
  });

  it('says so for a helper in its dictionary form, and never for a verb written in kanji', () => {
    expect(mergeMorphemes([verb('うる', 'うる', '基本形', '下二・ア行', { pos1: '非自立' })])[0]?.lookup[0]?.conj).toBe('下二・ア行');
    expect(mergeMorphemes([verb('要ら', '要る', '未然形', '五段・ラ行'), nai])[0]?.lookup[0]?.conj).toBeUndefined();
  });
});
