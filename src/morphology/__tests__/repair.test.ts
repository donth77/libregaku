import { describe, expect, it } from 'vitest';
import type { Morpheme } from '../merge';
import { repair, unknown, type Others, type Reading } from '../repair';
import { LINES } from './fixtures/ipadic';
import { SECOND } from './fixtures/second-opinion';

/* Words as IPADIC gives them, and UniDic's in the same shape. */
const noun = (surface: string, pos1 = '一般'): Morpheme => ({ surface, lemma: surface, pos: '名詞', pos1 });
const lacking = (surface: string): Morpheme => ({ surface, pos: '名詞', pos1: '一般' });
const verb = (surface: string, lemma: string, conjForm: string, pos1 = '自立'): Morpheme =>
  ({ surface, lemma, pos: '動詞', pos1, conjForm });
const ending = (surface: string, lemma = surface, conjForm = '基本形'): Morpheme => ({ surface, lemma, pos: '助動詞', conjForm });
const particle = (surface: string, pos1 = '格助詞'): Morpheme => ({ surface, lemma: surface, pos: '助詞', pos1 });
const filler = (surface: string): Morpheme => ({ surface, lemma: surface, pos: 'フィラー' });
const mark = (surface: string): Morpheme => ({ surface, lemma: surface, pos: '記号', pos1: '一般' });

const surfaces = (ms: readonly Morpheme[]): string[] => ms.map((m) => m.surface);
/** IPADIC's readings of one run: the line's own first, then the others, in the order given. */
const readings = (...all: Morpheme[][]): Others => (text) =>
  all.filter((words) => words.map((w) => w.surface).join('') === text).map((words, cost): Reading => ({ words, cost }));

describe('a word IPADIC did not have', () => {
  it('is a piece with no dictionary form, and not a mark or a number', () => {
    expect(unknown(lacking('癒'))).toBe(true);
    expect(unknown(noun('癒し'))).toBe(false);
    expect(unknown({ surface: '😀', pos: '記号' })).toBe(false);
    expect(unknown({ surface: 'ABC', pos: '名詞' })).toBe(false);
  });

  it('is UniDic\'s, out to where the two agree a word ends: 癒 and やす is 癒やす', () => {
    const iyasu = verb('癒やす', '癒やす', '基本形');
    expect(repair([lacking('癒'), ending('やす')], [iyasu])).toEqual([iyasu]);
  });

  it('gains its reading where both have it whole: 試着', () => {
    const shichaku: Morpheme = { ...noun('試着', 'サ変接続'), reading: 'シチャク' };
    const suru = verb('する', 'する', '基本形');
    expect(repair([lacking('試着'), suru], [shichaku, suru])).toEqual([shichaku, suru]);
  });

  it('stays whole where UniDic only cuts it up: a name, ムーリエル', () => {
    const mine = [lacking('ムーリエル'), particle('は', '係助詞')];
    expect(repair(mine, [noun('ムー', '固有名詞'), noun('リエル'), particle('は', '係助詞')])).toEqual(mine);
  });

  it('stays where UniDic did not know it either, or knew only kana as symbols: ケモナー', () => {
    const mine = [lacking('ケモナー')];
    expect(repair(mine, [lacking('ケモナー')])).toEqual(mine);
    expect(repair(mine, [{ surface: 'ケ', lemma: 'ケ', pos: '記号' }, noun('モナー', '固有名詞')])).toEqual(mine);
  });

  it('stays where it is a lone kanji, whose reading alone is a guess: 択', () => {
    const mine = [noun('三', '数'), lacking('択')];
    expect(repair(mine, [noun('三', '数'), { ...noun('択', '接尾'), reading: 'タク' }])).toEqual(mine);
  });

  it('stays before さん: a name is not the word it happens to spell, ヒラリ', () => {
    const san = noun('さん', '接尾');
    const mine = [lacking('ヒラリ'), san];
    expect(repair(mine, [{ surface: 'ヒラリ', lemma: 'ひらり', pos: '副詞', pos1: '一般' }, san])).toEqual(mine);
  });

  it('takes the endings after it too where it turns out to inflect: モテ and ない', () => {
    const mote = verb('モテ', 'もてる', '未然形');
    const nai = ending('ない');
    const read = repair([lacking('モテ'), { surface: 'ない', lemma: 'ない', pos: '形容詞', pos1: '自立', conjForm: '基本形' }], [mote, nai]);
    expect(read).toEqual([mote, nai]);
  });
});

describe('a word in kana that IPADIC cut up', () => {
  const kare = noun('彼', '代名詞');
  const wa = particle('は', '係助詞');
  const ki = verb('来', '来る', '連用形');
  const masu = ending('ます');
  const ka = particle('か', '副助詞／並立助詞／終助詞');
  const i = verb('い', 'いる', '連用形');
  const tsu = ending('つ');
  const itsu = noun('いつ', '代名詞');
  const mine = [kare, wa, i, tsu, ki, masu, ka];
  const theirs = [kare, wa, { ...itsu, reading: 'イツ' }, ki, masu, ka];

  it('is the word, from IPADIC\'s own reading that has it whole: 彼はいつ来ますか', () => {
    // Its other reading has 来 as another word: read after a noun, as this one would be.
    const other = [kare, wa, itsu, verb('来', '来たる', '連用形'), masu, ka];
    const read = repair(mine, theirs, readings(mine, other));
    expect(surfaces(read)).toEqual(['彼', 'は', 'いつ', '来', 'ます', 'か']);
    // IPADIC's いつ, and the rest of the line as it was.
    expect(read[2]).toBe(itsu);
    expect(read[3]).toBe(ki);
  });

  it('is UniDic\'s word where no reading of IPADIC\'s has it, or its readings cannot be asked for', () => {
    expect(repair(mine, theirs, readings(mine))[2]).toBe(theirs[2]);
    expect(repair(mine, theirs)[2]).toBe(theirs[2]);
  });

  it('is UniDic\'s word where the run, read alone, is not read as the line was', () => {
    const others = readings([kare, particle('はい'), tsu, ki, masu, ka], [kare, wa, itsu, ki, masu, ka]);
    expect(repair(mine, theirs, others)[2]).toBe(theirs[2]);
  });

  it('asks about a run with the mark that closes it', () => {
    const asked: string[] = [];
    const end = mark('？');
    const read = repair([...mine, end], [...theirs, end], (text) => {
      asked.push(text);
      return [{ words: [...mine, end], cost: 0 }, { words: [kare, wa, itsu, ki, masu, ka, end], cost: 112 }];
    });
    expect(asked).toEqual(['彼はいつ来ますか？']);
    expect(surfaces(read)).toEqual(['彼', 'は', 'いつ', '来', 'ます', 'か', '？']);
  });

  it('stays in pieces where they are a particle and a word: は and やる, not はやる', () => {
    const yaru = verb('やる', 'やる', '基本形');
    const line = [noun('彼女', '代名詞'), wa, yaru];
    const hayaru = verb('はやる', 'はやる', '基本形');
    expect(repair(line, [line[0]!, hayaru], readings(line, [line[0]!, hayaru]))).toEqual(line);
  });

  it('stays in pieces where they are a verb and an ending that fits it: し and たく, not したく', () => {
    const line = [verb('し', 'する', '連用形'), ending('たく', 'たい', '連用テ接続')];
    expect(repair(line, [noun('したく', 'サ変接続')])).toEqual(line);
  });

  it('stays in pieces where they are a noun and the particle that ends the clause: まじ and か', () => {
    const line = [noun('まじ', '形容動詞語幹'), ka];
    expect(repair(line, [noun('まじか', '形容動詞語幹')])).toEqual(line);
    expect(repair([...line, mark('。')], [noun('まじか', '形容動詞語幹'), mark('。')])).toEqual([...line, mark('。')]);
  });

  it('stays in pieces where UniDic has an ending or a particle for them: た and がっ', () => {
    const line = [verb('会い', '会う', '連用形'), ending('た', 'たい', 'ガル接続'), verb('がっ', 'がる', '連用タ接続', '接尾')];
    expect(repair(line, [line[0]!, ending('たがっ', 'たがる', '連用形')])).toEqual(line);
  });

  it('is the word where an ending after the pieces has no verb to attach to: い, た and だけ before ませ', () => {
    const naoshi = verb('直し', '直す', '連用形');
    const te = particle('て', '接続助詞');
    const mase = ending('ませ', 'ます', '未然形');
    const line = [naoshi, te, verb('い', 'いる', '連用形', '非自立'), ending('た'), particle('だけ', '副助詞'), mase];
    const itadake = verb('いただけ', 'いただける', '連用形', '非自立');
    expect(surfaces(repair(line, [naoshi, te, itadake, mase]))).toEqual(['直し', 'て', 'いただけ', 'ませ']);
  });

  it('is left where the two have different kinds of word for it: まえ is 前 to one and 舞え to the other', () => {
    const line = [verb('くれ', 'くれる', '連用形'), ending('た'), filler('ま'), filler('え')];
    const mae = noun('まえ', '副詞可能');
    const read = repair(line, [line[0]!, line[1]!, mae], readings(line, [line[0]!, line[1]!, verb('まえ', 'まう', '命令ｅ')]));
    expect(read).toEqual(line);
  });

  it('is IPADIC\'s verb stem where UniDic has the noun, the same word: おそれ', () => {
    const line: Morpheme[] = [{ surface: 'お', lemma: 'お', pos: '接頭詞', pos1: '名詞接続' }, noun('それ', '代名詞')];
    const osore = verb('おそれ', 'おそれる', '連用形');
    expect(repair(line, [noun('おそれ')], readings(line, [osore]))).toEqual([osore]);
  });
});

describe('a noun that is endings', () => {
  const sun = verb('住ん', '住む', '連用タ接続');
  const de = particle('で', '接続助詞');
  const da = ending('だ');
  const yo = particle('よ', '終助詞');
  const ta = ending('た');
  const n: Morpheme = { surface: 'ん', lemma: 'ん', pos: '名詞', pos1: '非自立' };

  it('is cut as UniDic cuts it, in IPADIC\'s own reading: たん is た and ん', () => {
    const line = [sun, de, noun('たん'), da, yo];
    const theirs = [sun, ending('で', 'てる', '連用形'), ta, particle('ん', '連体化'), da, yo];
    const read = repair(line, theirs, readings(line, [sun, de, ta, n, da, yo]));
    expect(read).toEqual([sun, de, ta, n, da, yo]);
    expect(read[1]).toBe(de);
  });

  it('keeps what is cut differently beside it only: していたんだい is not いたん, "ached"', () => {
    const shi = verb('し', 'する', '連用形');
    const te = particle('て', '接続助詞');
    const i = verb('い', 'いる', '連用形', '非自立');
    const line = [shi, te, i, ta, n, noun('だい')];
    const ii = particle('い', '終助詞');
    const theirs = [shi, te, i, ta, particle('ん', '連体化'), da, ii];
    const ached = [shi, te, verb('いたん', 'いたむ', '連用タ接続'), da, ii];
    const read = repair(line, theirs, readings(line, ached, [shi, te, i, ta, n, da, ii]));
    expect(surfaces(read)).toEqual(['し', 'て', 'い', 'た', 'ん', 'だ', 'い']);
  });

  it('lets the word before it be cut differently: と and かも is とか and も', () => {
    const line = [noun('話'), particle('と', '並立助詞'), noun('かも')];
    const theirs = [noun('話'), particle('と'), particle('か', '副助詞'), particle('も', '係助詞')];
    const toka = particle('とか', '並立助詞');
    const read = repair(line, theirs, readings(line, [noun('話'), toka, particle('も', '係助詞')]));
    expect(surfaces(read)).toEqual(['話', 'とか', 'も']);
  });

  it('is UniDic\'s pieces where IPADIC\'s reading has a word among them: い after だ is no いる', () => {
    const line = [noun('何処', '代名詞'), noun('だい')];
    const theirs = [noun('何処', '代名詞'), da, particle('い', '終助詞')];
    const read = repair(line, theirs, readings(line, [noun('何処', '代名詞'), da, verb('い', 'いる', '連用形')]));
    expect(read).toEqual(theirs);
  });

  it('stays a noun before a particle that marks one: かねを is 金', () => {
    const line = [noun('かね'), particle('を'), verb('貸し', '貸す', '連用形')];
    const theirs = [particle('か', '終助詞'), particle('ね', '終助詞'), line[1]!, line[2]!];
    expect(repair(line, theirs, readings(line, [theirs[0]!, theirs[1]!, line[1]!, line[2]!]))).toEqual(line);
  });
});

describe('a line the two do not read the same text of, or read alike', () => {
  it('is IPADIC\'s', () => {
    const line = [noun('今日', '副詞可能'), particle('は', '係助詞')];
    expect(repair(line, [noun('今日', '副詞可能')])).toEqual(line);
    expect(repair(line, line)).toEqual(line);
    expect(repair([], [])).toEqual([]);
  });
});

describe('what UniDic changed in the parser fixture\'s lines', () => {
  it('comes out of repair() as the fixture has it, from what the analysers gave', () => {
    const lines = Object.entries(SECOND);
    expect(lines.length).toBeGreaterThan(20);
    for (const [text, given] of lines) {
      const read = repair(given.ipadic, given.unidic, (run) => given.others[run] ?? []);
      expect(read, text).toEqual(LINES[text]?.morphemes);
    }
  });

  it('covers each thing it decides', () => {
    for (const text of ['彼はいつ来ますか', '住んでたんだよ', '癒やす', 'モテない', 'そろばんって、なぁに？', '坊や、おかあさんは何処だい？']) {
      expect(SECOND[text], text).toBeDefined();
    }
  });
});
