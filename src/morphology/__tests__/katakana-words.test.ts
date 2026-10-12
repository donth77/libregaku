import { describe, expect, it } from 'vitest';
import { adjectiveOver, contractions, reread, runs, stemIn, type Placed, type Word } from '../katakana-words';

const placed = (start: number, end: number, more: Partial<Word> = {}): Placed =>
  ({ surface: 'x'.repeat(end - start), adjective: false, known: true, start, end, ...more });

/**
 * An analyser that knows the words it is given and nothing else: the longest
 * of them at each place, and a piece it has no word for where there is none.
 */
function knowing(words: Record<string, Partial<Word>>): (text: string) => Word[] {
  const longest = Math.max(...Object.keys(words).map((w) => w.length));
  return (text) => {
    const out: Word[] = [];
    for (let at = 0; at < text.length;) {
      let n = Math.min(longest, text.length - at);
      while (n > 1 && !words[text.slice(at, at + n)]) n--;
      const surface = text.slice(at, at + n);
      const word = words[surface];
      out.push({ surface, adjective: false, known: Boolean(word), ...word });
      at += n;
    }
    return out;
  };
}
const adjective = { adjective: true };

describe('katakana where an adjective goes', () => {
  it('finds the run an ending follows', () => {
    expect(runs('ヤバくない')).toEqual([[0, 2]]);
    expect(runs('それ、ウザい')).toEqual([[3, 5]]);
    expect(runs('キモかった')).toEqual([[0, 2]]);
  });

  it('leaves katakana an ending does not follow, and text with none', () => {
    expect(runs('ビールを飲む')).toEqual([]);
    expect(runs('ヤバ')).toEqual([]);
    expect(runs('やばくない')).toEqual([]);
  });

  it('takes a whole run or none: not the end of a longer word', () => {
    expect(runs('アドミニストレーターさ')).toEqual([]);
    expect(runs('ウイリアムさん')).toEqual([[0, 5]]);
  });

  it('is an adjective only as its stem: the ending comes after it, in hiragana', () => {
    // ヤバ + い, and キツ before すぎる.
    expect(stemIn([placed(0, 3, adjective)], [0, 2])).toBe(true);
    expect(stemIn([placed(0, 2, { adjective: true, stem: true }), placed(2, 5)], [0, 2])).toBe(true);
    // アライ, 荒い with its い inside the katakana; クラウチ, 暗 and more katakana after it.
    expect(stemIn([placed(0, 3, adjective), placed(3, 5)], [0, 3])).toBe(false);
    expect(stemIn([placed(0, 2, { adjective: true, stem: true }), placed(2, 4)], [0, 4])).toBe(false);
    // An adjective that starts after the run is another word.
    expect(stemIn([placed(0, 2), placed(2, 4, adjective)], [0, 2])).toBe(false);
  });
});

describe('ai and oi run together into ee', () => {
  it('offers the written-out word both ways, ai then oi, and the third way', () => {
    expect(contractions('すげえ')).toEqual([{ at: [1, 3], candidates: ['すがい', 'すごい'], other: 'すがえ' }]);
    expect(contractions('でけー')[0]?.candidates).toEqual(['でかい', 'でこい']);
    expect(contractions('すげぇ')[0]?.candidates[1]).toBe('すごい');
    expect(contractions('おめえ')[0]?.other).toBe('おまえ');
  });

  it('puts the katakana it is written in into hiragana, and says where that starts: スッゲえ is すっげえ', () => {
    const [found] = contractions('スッゲえ');
    expect([found?.candidates[1], found?.from]).toEqual(['すっごい', 0]);
    expect(contractions('それヤベー')[0]).toMatchObject({ at: [3, 5], from: 2, candidates: ['それやばい', 'それやぼい'] });
  });

  it('finds nothing in a word that starts with it, or without it', () => {
    expect(contractions('ねえ、聞いて')).toEqual([]);
    expect(contractions('おいしい')).toEqual([]);
  });

  it('takes a long vowel inside a katakana word for its spelling: ケーキ, レース, ゲーム', () => {
    expect(contractions('でケーキを食べる')).toEqual([]);
    expect(contractions('そのレースに勝った')).toEqual([]);
    expect(contractions('エスカレーター')).toEqual([]);
    // After hiragana the next word may well be katakana.
    expect(contractions('すげーカッコいい')).toHaveLength(1);
  });

  it('is taken only where an adjective starts before it and reaches over it', () => {
    expect(adjectiveOver([placed(0, 3, adjective)], [1, 3])).toBe(true);
    expect(adjectiveOver([placed(0, 1), placed(1, 3, adjective)], [1, 3])).toBe(false);
  });

  it('is taken only where the adjective starts in the katakana it is written in: でケー is not でかい', () => {
    expect(contractions('後でケーを')[0]?.from).toBe(2);
    expect(adjectiveOver([placed(1, 4, adjective)], [2, 4], 2)).toBe(false);
    expect(adjectiveOver([placed(0, 4, adjective)], [2, 4], 0)).toBe(true);
  });
});

describe('reading a line again', () => {
  it('takes the written-out word when the analyser knows it as an adjective', () => {
    const read = reread('すげえ', knowing({ すごい: adjective }));
    expect(read?.text).toBe('すごい');
    expect(read?.words.map((w) => w.surface)).toEqual(['すごい']);
    expect(reread('でけえ', knowing({ でかい: adjective }))?.text).toBe('でかい');
  });

  it('leaves the line alone when neither way is an adjective', () => {
    expect(reread('すげえ', knowing({ すげ: {} }))).toBeNull();
    expect(reread('ビールを飲む', knowing({ ビール: {} }))).toBeNull();
  });

  it('reads katakana as an adjective where it is the stem: ヤバい, キツすぎる', () => {
    expect(reread('ヤバい', knowing({ やばい: adjective }))?.text).toBe('やばい');
    expect(reread('キツすぎる', knowing({ きつ: { adjective: true, stem: true }, すぎる: {} }))?.text).toBe('きつすぎる');
  });

  it('leaves a name in katakana that happens to be an adjective: アライさん, クラウチさん', () => {
    expect(reread('アライさん', knowing({ あらい: adjective, さん: {} }))).toBeNull();
    expect(reread('クラウチさん', knowing({ くら: { adjective: true, stem: true }, うち: {}, さん: {} }))).toBeNull();
  });

  it('writes out one run at a time: the name beside an adjective stays as it is written', () => {
    const read = reread('クラウチさんはヤバい', knowing({ くら: { adjective: true, stem: true }, やばい: adjective, さん: {}, は: {} }));
    expect(read?.text).toBe('クラウチさんはやばい');
  });

  it('leaves a katakana word the analyser knows as it is written: カレー is not からい', () => {
    expect(reread('カレーを食べる', knowing({ カレー: {}, からい: adjective, を: {}, 食べる: {} }))).toBeNull();
    expect(reread('インドカレー', knowing({ インド: {}, カレー: {}, からい: adjective }))).toBeNull();
    // ヤベー is no word of its own, so it is the adjective.
    expect(reread('ヤベー', knowing({ やばい: adjective }))?.text).toBe('やばい');
  });

  it('leaves what is another word written out another way: くれえ is くらい, おめえ is おまえ', () => {
    expect(reread('どのくれえ', knowing({ どの: {}, くらい: {}, くろい: adjective }))).toBeNull();
    expect(reread('おめえが', knowing({ おもい: adjective, おまえ: {}, が: {} }))).toBeNull();
  });
});
