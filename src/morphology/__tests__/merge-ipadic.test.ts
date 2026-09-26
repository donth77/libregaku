import { describe, expect, it } from 'vitest';
import { lexiconFrom, toTokens } from '../lindera';
import { lexiconQueries } from '../merge';
import type { Token } from '../types';
import { LINES } from './fixtures/ipadic';

/**
 * Merging, against what IPADIC actually emits.
 *
 * Every input here is real analyser output (see the fixture), because the
 * failures this guards against were all cases where a hand-written morpheme
 * sequence passed and the analyser's own did not.
 */

/** Tokens for a fixture line, with the dictionary's answers or without. */
function tokens(text: string, withDictionary = true): Token[] {
  const line = LINES[text];
  if (!line) throw new Error(`no fixture for ${text}`);
  return toTokens(text, line.morphemes, withDictionary ? lexiconFrom(line.lexicon) : undefined);
}

const words = (text: string, withDictionary = true) => tokens(text, withDictionary).map((t) => t.surface);
const only = (text: string, withDictionary = true): Token => {
  const t = tokens(text, withDictionary);
  expect(t, `${text} should be one token`).toHaveLength(1);
  return t[0]!;
};
const keys = (t: Token) => (t.lookup ?? []).map((k) => k.key);

describe('spoken contractions', () => {
  it('joins てる, ちゃう, とく to the verb they contract', () => {
    for (const [text, lemma] of [
      ['知ってる', '知る'], ['言ってた', '言う'], ['食べてない', '食べる'],
      ['しちゃった', 'する'], ['読んじゃった', '読む'], ['やっとく', 'やる'],
    ] as const) {
      expect(only(text).lemma, text).toBe(lemma);
    }
  });

  it('names what the contraction does', () => {
    expect(only('知ってる').inflections).toEqual(['ongoing']);
    expect(only('言ってた').inflections).toEqual(['ongoing', 'past']);
    expect(only('読んじゃった').inflections).toEqual(['completely, or regrettably', 'past']);
    expect(only('やっとく').inflections).toEqual(['in advance']);
  });

  it('keeps ちゃ with its verb and leaves what follows alone', () => {
    expect(words('食べちゃだめ')).toEqual(['食べちゃ', 'だめ']);
  });

  it('reads なきゃ and なくちゃ as obligation, not negation', () => {
    expect(only('行かなきゃ').inflections).toEqual(['must']);
    expect(only('食べなくちゃ').inflections).toEqual(['must']);
  });
});

describe('conditionals', () => {
  it('labels たら, だら and なら as conditional, not past', () => {
    expect(only('行ったら').inflections).toEqual(['conditional']);
    expect(only('読んだら').inflections).toEqual(['conditional']);
    expect(only('行くなら').inflections).toEqual(['conditional']);
  });
});

describe('行った', () => {
  it('is 行く, even where IPADIC picks 行う', () => {
    const went = tokens('昨日行ったよ').find((t) => t.surface === '行った')!;
    expect(went.lemma).toBe('行く');
    expect(went.reading).toBe('イッタ');
    expect(tokens('学校に行って').find((t) => t.surface === '行って')?.lemma).toBe('行く');
  });
});

describe('サ変 nouns', () => {
  it('become noun + する only with する itself', () => {
    const t = only('勉強している');
    expect(t.lemma).toBe('勉強する');
    // JMdict files it under the noun, so that is the next key.
    expect(keys(t)).toEqual(['勉強する', '勉強']);
  });

  it('do not swallow the next verb when a particle is dropped', () => {
    const t = tokens('勉強頑張って');
    expect(t.map((x) => x.surface)).toEqual(['勉強', '頑張って']);
    expect(t[1]?.lemma).toBe('頑張る');
  });

  it('never invent 〜する for a noun + suffix', () => {
    for (const [text, lemma] of [
      ['視聴者', '視聴者'], ['誕生日', '誕生日'], ['体験談', '体験談'],
      ['運転手さん', '運転手'], ['電話代', '電話代'],
    ] as const) {
      expect(only(text).lemma, text).toBe(lemma);
    }
    expect(tokens('勉強中です')[0]?.lemma).toBe('勉強中');
  });

  it('fall back to the noun, not 〜する, without the dictionary', () => {
    expect(only('運転手さん', false).lemma).toBe('運転');
    expect(only('視聴者', false).lemma).toBe('視聴');
  });

  it('see through an honorific prefix', () => {
    const t = tokens('ご説明します')[0]!;
    expect(t.lemma).toBe('説明する');
    expect(keys(t)).toContain('説明');
  });
});

describe('numbers and counters', () => {
  it('take the reading from the dictionary, not from gluing', () => {
    expect(tokens('一回だけ')[0]).toMatchObject({ lemma: '一回', reading: 'イッカイ' });
    expect(tokens('一人で行く')[0]).toMatchObject({ lemma: '一人', reading: 'ヒトリ' });
    expect(tokens('二日後')[0]?.reading).toBe('フツカゴ');
  });

  it('look Arabic figures up as JMdict writes them', () => {
    expect(tokens('2人で')[0]).toMatchObject({ surface: '2人', lemma: '二人', reading: 'フタリ' });
    // １０分 is its own entry, "ten minutes" — not 十分, "enough".
    expect(tokens('10分待って')[0]).toMatchObject({ surface: '10分', lemma: '１０分', reading: 'ジップン' });
  });

  it('show no reading rather than a guessed one', () => {
    // 1日 is いちにち or ついたち; 3匹 is not in JMdict at all.
    expect(only('1日').reading).toBeUndefined();
    expect(only('3匹').reading).toBeUndefined();
    // Without the dictionary, nothing is glued: 一回 is not いちかい.
    expect(tokens('一回だけ', false)[0]).toMatchObject({ lemma: '一回', reading: undefined });
    expect(only('3人', false)).toMatchObject({ lemma: '3人', reading: undefined });
  });

  it('join the figures of a numeral', () => {
    expect(only('二十歳').lemma).toBe('二十歳');
  });

  it('still lead somewhere when the whole is not a word', () => {
    // An ambiguous spelling first, then the counter, then the number.
    expect(keys(only('1日'))).toEqual(['1日', '１日', '一日', '日', '1']);
    const three = only('3匹');
    expect(three.lookup?.find((k) => k.key === '匹')).toEqual({ key: '匹', reading: 'ヒキ', pos: '名詞,接尾' });
  });
});

describe('prefixes', () => {
  it('never make the prefix the lemma', () => {
    expect(only('お寿司').lemma).toBe('寿司');
    expect(only('お仕事').lemma).toBe('お仕事');
    expect(only('ご主人').lemma).toBe('ご主人');
    expect(only('全世界').lemma).toBe('全世界');
  });

  it('fall back to the noun without the dictionary', () => {
    expect(only('お寿司', false).lemma).toBe('寿司');
    expect(only('お仕事', false).lemma).toBe('仕事');
    expect(only('全世界', false).lemma).toBe('世界');
  });

  it('keep the reading, so ruby still sits over the noun', () => {
    expect(only('お寿司').reading).toBe('オスシ');
  });

  it('try the noun beneath a prefix IPADIC kept whole', () => {
    expect(keys(tokens('お待ちください')[0]!)).toContain('待ち');
  });
});

describe('suffixes', () => {
  it('take the compound and its real reading from the dictionary', () => {
    // Not せんせいかた: the suffix voices.
    expect(only('先生方')).toMatchObject({ lemma: '先生方', reading: 'センセイガタ' });
    expect(only('私たち').lemma).toBe('私たち');
    expect(only('運転手さん').reading).toBe('ウンテンシュサン');
  });

  it('recognise a verb stem made a noun', () => {
    expect(only('食べ放題')).toMatchObject({ lemma: '食べ放題', reading: 'タベホウダイ' });
  });

  it('leave the voice endings to the verb — させる is a suffix in IPADIC too', () => {
    expect(only('食べさせる')).toMatchObject({ lemma: '食べる', pos: '動詞', inflections: ['causative'] });
    expect(lexiconQueries(LINES['食べさせる']!.morphemes)).toEqual([]);
  });
});

describe('lemma readings', () => {
  it('are derived for inflected heads, to rank homographs by', () => {
    expect(only('知ってる').lemmaReading).toBe('シル');
    expect(only('行ったら').lemmaReading).toBe('イク');
    expect(only('食べてない').lemmaReading).toBe('タベル');
  });
});

describe('unchanged behaviour', () => {
  it('keeps a causative-passive chain as one word', () => {
    expect(only('食べさせられた').lemma).toBe('食べる');
  });

  it('still splits うまく from いけば', () => {
    expect(words('うまくいけば')).toEqual(['うまく', 'いけば']);
  });
});

describe('lexiconQueries', () => {
  it('asks only about groups the morphemes cannot settle', () => {
    expect(lexiconQueries(LINES['知ってる']!.morphemes)).toEqual([]);
    expect(lexiconQueries(LINES['一人で行く']!.morphemes)).toEqual(['一人']);
  });

  it('asks for every spelling a figure might be filed under', () => {
    expect(lexiconQueries(LINES['2人で']!.morphemes)).toEqual(['2人', '２人', '二人']);
  });
});
