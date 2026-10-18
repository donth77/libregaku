import { describe, expect, it } from 'vitest';
import type { FirstReading } from '../extra-words';
import { withFirstReadings } from '../japanese';
import type { Morpheme } from '../merge';
import { repair, unknown, type Others, type Reading } from '../repair';
import type { UnidicMorpheme } from '../unidic';
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

describe("a noun and する that IPADIC takes for an adjective's stem", () => {
  const stem: Morpheme = { surface: '恋し', lemma: '恋しい', pos: '形容詞', pos1: '自立', conjForm: 'ガル接続' };
  const koi = noun('恋');
  const shi = verb('し', 'する', '連用形');
  const te = particle('て', '接続助詞');
  const iru = verb('いる', 'いる', '基本形', '非自立');

  it("is cut as UniDic cuts it, in IPADIC's own reading: 恋して is 恋 and し, not 恋しい", () => {
    const line = [stem, te, iru];
    const theirs = [noun('恋', 'サ変接続'), shi, te, iru];
    const read = repair(line, theirs, readings(line, [koi, shi, te, iru]));
    expect(read).toEqual([koi, shi, te, iru]);
    // The words either side are the line's own.
    expect(read[2]).toBe(te);
  });

  it("is UniDic's words where no reading of IPADIC's cuts it so", () => {
    const line = [stem, verb('てる', 'てる', '基本形', '非自立')];
    const theirs = [noun('恋', 'サ変接続'), shi, ending('てる')];
    expect(surfaces(repair(line, theirs, readings(line)))).toEqual(['恋', 'し', 'てる']);
    expect(surfaces(repair(line, theirs))).toEqual(['恋', 'し', 'てる']);
  });

  it('stays the adjective before what its stem does take: 恋しそう, 恋しさ, 恋しすぎる', () => {
    for (const next of [noun('そう', '接尾'), noun('さ', '接尾'), verb('すぎる', 'すぎる', '基本形', '非自立')]) {
      const line = [stem, next];
      expect(repair(line, [noun('恋', 'サ変接続'), shi, next], readings(line, [koi, shi, next])), next.surface).toEqual(line);
    }
    // And where nothing follows it, or UniDic has something other than a noun and する.
    expect(repair([stem], [noun('恋', 'サ変接続'), shi], readings([stem], [koi, shi]))).toEqual([stem]);
    const line = [stem, te];
    expect(repair(line, [noun('恋'), particle('し', '接続助詞'), te], readings(line, [koi, shi, te]))).toEqual(line);
  });
});

describe('a word of time and the word after it that IPADIC has a name for', () => {
  const name = (surface: string, more: Partial<Morpheme> = {}): Morpheme => ({ ...noun(surface, '固有名詞'), ...more });
  const wo = particle('を');
  const yomu = verb('読む', '読む', '基本形');
  const mainichi = noun('毎日', '副詞可能');
  const shinbun = noun('新聞');

  it("is cut as UniDic cuts it, in IPADIC's own words where it has them: 毎日新聞を読む", () => {
    const line = [name('毎日新聞'), wo, yomu];
    const read = repair(line, [mainichi, shinbun, wo, yomu], readings(line, [mainichi, shinbun, wo, yomu]));
    expect(read).toEqual([mainichi, shinbun, wo, yomu]);
    expect(read[2]).toBe(wo);
    // And in UniDic's where no reading of IPADIC's cuts it so.
    expect(surfaces(repair(line, [mainichi, shinbun, wo, yomu]))).toEqual(['毎日', '新聞', 'を', '読む']);
  });

  it('stays a name where it is a given name, or before さん: 夏子, 今船さん', () => {
    const natsu = noun('夏', '副詞可能');
    const given = [name('夏子', { given: true }), ending('です')];
    expect(repair(given, [natsu, noun('子'), ending('です')])).toEqual(given);
    const called = [name('今船'), noun('さん', '接尾')];
    expect(repair(called, [noun('今', '副詞可能'), noun('船'), noun('さん', '接尾')])).toEqual(called);
  });

  it('stays a name where UniDic does not begin with a word of time, or has a name inside', () => {
    const tanaka = [name('田中'), wo, yomu];
    expect(repair(tanaka, [noun('田'), noun('中', '接尾'), wo, yomu])).toEqual(tanaka);
    const imamura = [name('今村山'), wo, yomu];
    expect(repair(imamura, [noun('今', '副詞可能'), name('村山'), wo, yomu])).toEqual(imamura);
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

describe('a word in kanji the two read differently', () => {
  /** A word as each analyser gives it: IPADIC's, and UniDic's with what only UniDic says. */
  const read = (surface: string, reading: string, pos1 = '一般', more: Partial<UnidicMorpheme> = {}): UnidicMorpheme =>
    ({ surface, lemma: surface, reading, pos: '名詞', pos1, ...more });
  const ga = particle('が');
  const nai: Morpheme = { surface: 'ない', lemma: 'ない', reading: 'ナイ', pos: '形容詞', pos1: '自立', conjForm: '基本形' };

  it('carries UniDic\'s reading, for the merge to weigh: 金 is きん to IPADIC and かね to UniDic', () => {
    const kin = read('金', 'キン');
    const [word, particle_] = repair([kin, ga], [read('金', 'カネ', '一般', { lexeme: 'カネ', native: true }), ga]);
    expect(word).toEqual({ ...kin, second: { reading: 'カネ', native: true } });
    // IPADIC's own word is not written on, and a word the two read alike is the one it was.
    expect(kin.second).toBeUndefined();
    expect(particle_).toBe(ga);
  });

  it('has nothing to carry where UniDic names the same word and only says it another way: 何 said ナン is ナニ', () => {
    const nani = read('何', 'ナニ', '代名詞');
    expect(repair([nani, ga], [read('何', 'ナン', '代名詞', { lexeme: 'ナニ', native: true }), ga])[0]).toBe(nani);
  });

  it('has nothing to carry where the two differ in the voicing of the first sound: 定石通り', () => {
    const doori = read('通り', 'ドオリ', '接尾');
    const line = [read('定石', 'ジョウセキ'), doori];
    expect(repair(line, [line[0]!, read('通り', 'トオリ', '一般', { native: true })])[1]).toBe(doori);
  });

  it('leaves numbers and their counters to the dictionary', () => {
    const [ni, hon] = [read('二', 'ニ', '数'), read('本', 'ホン', '接尾')];
    const theirs = [read('二', 'フタ', '数', { native: true }), read('本', 'ポン', '接尾')];
    expect(repair([ni, hon], theirs)).toEqual([ni, hon]);
  });

  it('does not take an adjective for a verb, or a word for an ending, a prefix or an adjective\'s stem', () => {
    const hoshi: Morpheme = { surface: '欲し', lemma: '欲しい', reading: 'ホシ', pos: '形容詞', pos1: '自立', conjForm: 'ガル接続' };
    const hossuru: Morpheme = { surface: '欲し', lemma: '欲する', reading: 'ホッシ', pos: '動詞', pos1: '自立', conjForm: '連用形' };
    expect(repair([hoshi], [hossuru])).toEqual([hoshi]);
    const kokoro = read('心', 'ココロ');
    expect(repair([kokoro], [{ ...read('心', 'シン'), pos: '接頭詞', pos1: '名詞接続' }])).toEqual([kokoro]);
    const chou = read('長', 'チョウ');
    expect(repair([chou], [{ surface: '長', lemma: '長い', reading: 'ナガ', pos: '形容詞', pos1: '自立', conjForm: 'ガル接続' }])).toEqual([chou]);
  });

  it('leaves a name a name before さん, called out on its own, and its ending after it', () => {
    const kim = read('金', 'キム', '固有名詞');
    const kane = read('金', 'カネ', '一般', { native: true });
    const san: Morpheme = { surface: 'さん', lemma: 'さん', reading: 'サン', pos: '名詞', pos1: '接尾' };
    expect(repair([kim, san], [kane, san])).toEqual([kim, san]);
    const mari = read('真理', 'マリ', '固有名詞');
    const comma = mark('、');
    expect(repair([mari, comma], [read('真理', 'シンリ'), comma])).toEqual([mari, comma]);
    const everest = read('エベレスト', 'エベレスト', '固有名詞');
    const san2 = read('山', 'サン', '接尾');
    expect(repair([everest, san2], [everest, read('山', 'ヤマ', '一般', { native: true })])).toEqual([everest, san2]);
  });

  it('carries the whole word where IPADIC has an ending, a prefix or a name: 家 in 明日家に, 今 in 今受験生', () => {
    const ashita = read('明日', 'アシタ', '副詞可能');
    const [, ie] = repair([ashita, read('家', 'カ', '接尾')], [ashita, read('家', 'イエ', '一般', { native: true })]);
    expect(ie?.second).toEqual({ reading: 'イエ', pos: '名詞', pos1: '一般', native: true });
    const kon: Morpheme = { surface: '今', lemma: '今', reading: 'コン', pos: '接頭詞', pos1: '名詞接続' };
    const [ima] = repair([kon, read('受験生', 'ジュケンセイ')], [read('今', 'イマ', '副詞可能', { native: true }), read('受験生', 'ジュケンセイ')]);
    expect(ima?.second).toEqual({ reading: 'イマ', pos: '名詞', pos1: '副詞可能', native: true });
  });

  it('carries another verb with its form: 降り is 降りる to IPADIC and 降る to UniDic', () => {
    const ori = verb('降り', '降りる', '連用形');
    const [word] = repair([{ ...ori, reading: 'オリ' }], [{ ...verb('降り', '降る', '連用形'), reading: 'フリ', native: true } as UnidicMorpheme]);
    expect(word?.second).toEqual({ reading: 'フリ', lemma: '降る', conjForm: '連用形', native: true });
  });

  it('asks what a name is where no name can stand, and carries a word of Japanese\'s own: 金がない', () => {
    const kim = read('金', 'キム', '固有名詞');
    const kin = read('金', 'キン', '固有名詞');
    const sono: UnidicMorpheme = { surface: 'その', lemma: 'その', reading: 'ソノ', pos: '連体詞' };
    const asked: string[] = [];
    const again = (kane: UnidicMorpheme) => (text: string): UnidicMorpheme[] => {
      asked.push(text);
      return [sono, kane, ga, nai];
    };
    const [word] = repair([kim, ga, nai], [kin, ga, nai], undefined, again(read('金', 'カネ', '一般', { native: true })));
    expect(asked).toEqual(['その金がない']);
    expect(word?.second).toEqual({ reading: 'カネ', pos: '名詞', pos1: '一般', native: true });
    // Not a reading from Chinese: 金星 after その is きんぼし, a win over a champion, and the planet is UniDic's name.
    const [star] = repair([read('金星', 'カナボシ', '固有名詞'), ga], [read('金星', 'キンセイ', '固有名詞'), ga], undefined, () =>
      [sono, read('金星', 'キンボシ'), ga]);
    expect(star?.second).toEqual({ reading: 'キンセイ' });
    // And nothing is asked where the two have the same name: 日本.
    asked.length = 0;
    const nihon = read('日本', 'ニッポン', '固有名詞');
    expect(repair([nihon, ga], [nihon, ga], undefined, again(nihon))).toEqual([nihon, ga]);
    expect(asked).toEqual([]);
  });

  it('carries UniDic\'s name for a word in kana, where it is the same kind of word to both: そば is 側', () => {
    const soba = read('そば', 'ソバ');
    const [word] = repair([soba, ga], [{ ...soba, kanji: '側' }, ga]);
    expect(word).toEqual({ ...soba, kanji: '側' });
    expect(soba.kanji).toBeUndefined();
    // Another kind of word to UniDic is another word: its name says nothing of IPADIC's.
    const [other] = repair([soba, ga], [{ ...soba, pos: '副詞', kanji: '側' }, ga]);
    expect(other).toBe(soba);
  });

  it('hands the merge none of what only UniDic says, on a word taken from UniDic whole', () => {
    const iyasu: UnidicMorpheme = { ...verb('癒やす', '癒やす', '基本形'), lexeme: 'イヤス', native: true };
    expect(repair([lacking('癒'), ending('やす')], [iyasu])).toEqual([verb('癒やす', '癒やす', '基本形')]);
  });
});

describe('what UniDic changed in the parser fixture\'s lines', () => {
  it('comes out of repair() as the fixture has it, from what the analysers gave', () => {
    const lines = Object.entries(SECOND);
    expect(lines.length).toBeGreaterThan(20);
    for (const [text, given] of lines) {
      const read = repair(given.ipadic, given.unidic, (run) => given.others[run] ?? [], (t) => given.again?.[t] ?? []);
      // As readJapanese() goes on: the dictionary's first reading for a word IPADIC reads the rarer way.
      const first = new Map((given.first ?? []).map((r): [string, FirstReading] => [r.surface, r]));
      expect(withFirstReadings(read, first), text).toEqual(LINES[text]?.morphemes);
    }
  });

  it('covers each thing it decides', () => {
    for (const text of ['彼はいつ来ますか', '住んでたんだよ', '癒やす', 'モテない', 'そろばんって、なぁに？', '坊や、おかあさんは何処だい？']) {
      expect(SECOND[text], text).toBeDefined();
    }
  });
});
