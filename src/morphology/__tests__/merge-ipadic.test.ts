import { describe, expect, it } from 'vitest';
import { lexiconFrom, toTokens } from '../lindera';
import { GRAMMAR_LABELS, lexiconQueries } from '../merge';
import { grammar } from '../../i18n/en/grammar';
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
    // Not asked about as a stem made a noun. (食べる is asked about, as a
    // verb that might be a potential — see below.)
    expect(lexiconQueries(LINES['食べさせる']!.morphemes)).not.toContain('食べ');
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

describe('ございます', () => {
  it('makes one expression of an interjection and ございます, looked up as the expression', () => {
    const t = only('ありがとうございました');
    expect(t).toMatchObject({ surface: 'ありがとうございました', lemma: 'ありがとうございます', content: true });
    expect(keys(t)[0]).toBe('ありがとうございます');
    expect(keys(t)).toContain('ありがとうございました');
    expect(only('おはようございます').lemma).toBe('おはようございます');
  });

  it('makes でございます a word of its own, after the noun it follows', () => {
    const t = tokens('こちらでございます');
    expect(t.map((x) => [x.surface, x.lemma, x.content])).toEqual([
      ['こちら', 'こちら', true],
      ['でございます', 'でございます', true],
    ]);
  });

  it('makes the expression whatever comes before it', () => {
    expect(only('ありがとうございます').lemma).toBe('ありがとうございます');
    expect(tokens('どうもありがとうございます').map((x) => x.lemma)).toEqual(['どうも', 'ありがとうございます']);
  });

  it('keeps both words where the subtitle puts a space between them, rather than losing them', () => {
    const t = tokens('ありがとう ございます');
    expect(t.map((x) => [x.surface, x.lemma, x.content])).toEqual([
      ['ありがとう', 'ありがとう', true],
      ['ございます', 'ござる', true],
    ]);
    expect(t.map((x) => x.start)).toEqual([0, 6]);
  });

  it('reads ござる on its own as the verb it is', () => {
    const t = tokens('ここにございます');
    expect(t.map((x) => x.surface)).toEqual(['ここ', 'に', 'ございます']);
    expect(t[2]).toMatchObject({ lemma: 'ござる', content: true });
  });
});

describe('potential verbs', () => {
  it('are the verb they come from, where the dictionary has only that', () => {
    for (const [text, lemma, reading] of [
      ['保てる', '保つ', 'タモツ'], ['保てない', '保つ', 'タモツ'], ['会えた', '会う', 'アウ'],
      ['帰れる', '帰る', 'カエル'], ['書けなかった', '書く', 'カク'], ['来れる', '来る', 'クル'],
    ] as const) {
      const t = only(text);
      expect(t.lemma, text).toBe(lemma);
      expect(t.lemmaReading, text).toBe(reading);
      expect(keys(t)[0], text).toBe(lemma);
      expect(t.inflections?.[0], text).toBe('potential');
    }
    expect(only('保てない').inflections).toEqual(['potential', 'negative']);
    // The reading on the line is still the one spoken.
    expect(only('保てる').reading).toBe('タモテル');
  });

  it('stay as they are where the dictionary has them as words', () => {
    const t = only('読める');
    expect(t.lemma).toBe('読める');
    expect(t.inflections ?? []).not.toContain('potential');
    // Its verb is still there to fall back on.
    expect(keys(t)).toEqual(['読める', '読む']);
    expect(only('見れる').lemma).toBe('見れる');
  });

  it('fall back to the verb they come from while the dictionary is not there', () => {
    const t = only('保てる', false);
    expect(t.lemma).toBe('保てる');
    expect(keys(t)).toEqual(['保てる', '保つ']);
  });

  it('ask the dictionary about the form and the verb it may come from', () => {
    expect(lexiconQueries(LINES['保てない']!.morphemes)).toEqual(['保てる', '保つ']);
    expect(lexiconQueries(LINES['帰れる']!.morphemes)).toEqual(['帰れる', '帰る']);
  });
});

describe('kanji compounds the analyser split', () => {
  it('are one word where the dictionary has them whole, read as it reads them', () => {
    // IPADIC has 灯篭 but not 灯籠, and reads the halves あかり and かご.
    expect(only('灯籠')).toMatchObject({ surface: '灯籠', lemma: '灯籠', reading: 'トウロウ' });
    expect(only('石灯籠')).toMatchObject({ lemma: '石灯籠', reading: 'イシドウロウ' });
    expect(tokens('灯籠流し').map((t) => t.lemma)).toEqual(['灯籠', '流す']);
    expect(only('犬猫').lemma).toBe('犬猫');
    // Split into one-kanji verb stems, 盗(る) + 撮(る), each read と.
    expect(tokens('盗撮行為').map((t) => [t.surface, t.reading])).toEqual([['盗撮', 'トウサツ'], ['行為', 'コウイ']]);
  });

  it('stay as the analyser split them without the dictionary', () => {
    expect(words('灯籠', false)).toEqual(['灯', '籠']);
  });

  it('are asked about only where a lone kanji is among the nouns', () => {
    expect(lexiconQueries(LINES['灯籠']!.morphemes)).toEqual(['灯籠']);
    expect(lexiconQueries(LINES['石灯籠']!.morphemes)).toEqual(['石灯', '石灯籠', '灯籠']);
    expect(lexiconQueries(LINES['視聴者']!.morphemes)).not.toContain('視聴');
  });
});

describe('a kanji and a suffix the dictionary has no word for', () => {
  it('stay two words, rather than one looked up as the first', () => {
    // 示談, typed 事談 in the subtitle: not 事 (こと, "thing") under the whole of it.
    const t = tokens('被害者との事談が成立し');
    expect(t.map((x) => x.surface)).toEqual(['被害者', 'と', 'の', '事', '談', 'が', '成立し']);
    expect(t.find((x) => x.surface === '事')?.lemma).toBe('事');
  });

  it('leave a longer noun its suffix', () => {
    expect(only('学生達').lemma).toBe('学生');
  });
});

describe('compound verbs the analyser split', () => {
  it('are one word where the dictionary has the compound', () => {
    // IPADIC: 入れ + 込む, a stem and a helper verb.
    expect(only('入れ込む')).toMatchObject({ surface: '入れ込む', lemma: '入れ込む' });
    const te = only('入れ込んで');
    expect(te).toMatchObject({ lemma: '入れ込む', lemmaReading: 'イレコム' });
    expect(te.inflections).toEqual(['te-form']);
    // JMdict lists 食べ始める too, so it is one word as well.
    expect(only('食べ始める').lemma).toBe('食べ始める');
  });

  it("leave the helpers that are grammar, and a noun's する, as they were", () => {
    // 来てる is 来る, ongoing — not a verb 来てる.
    expect(tokens('電車来てるよ！').find((t) => t.surface === '来てる')?.lemma).toBe('来る');
    // 賞賛し合う is 賞賛する + 合う: the し stays with its noun.
    expect(tokens('彼らは互いに賞賛し合っている。').map((t) => t.lemma)).toContain('賞賛する');
  });
});

describe('every verb form has a name', () => {
  // The verb's grammar, as its card shows it under the dictionary form.
  const named = (text: string): string => (tokens(text).find((t) => t.inflections?.length)?.inflections ?? []).join(' · ');

  it('names conjugations and endings', () => {
    expect(named('待てなかった')).toBe('potential · negative · past');
    expect(named('待ちながら')).toBe('while');
    expect(named('待ったり')).toBe('listing');
    expect(named('待ちなさい')).toBe('polite command');
    expect(named('待ちやすい')).toBe('easy to');
    expect(named('待ちすぎた')).toBe('too much · past');
    expect(named('待たずに')).toBe('without');
    expect(named('待ってください')).toBe('te-form · please');
    expect(named('食べさせられた')).toBe('causative · passive · past');
  });

  it('reads だ as "is" after そう or べき, and as the past only after a verb', () => {
    expect(named('待ちそうだ')).toBe('seems');
    expect(named('待つそうだ')).toBe('hearsay');
    expect(named('待つべきだ')).toBe('ought to');
    expect(named('読んだ')).toBe('past');
    expect(named('待つだろう')).toBe('probably');
    expect(named('待つでしょう')).toBe('probably');
  });

  it('names forms said in more than one word on the verb, and leaves the words apart', () => {
    expect(named('待たなければならない')).toBe('must');
    expect(tokens('待たなければならない').map((t) => t.surface)).toEqual(['待たなければ', 'ならない']);
    expect(named('待ってもいい')).toBe('may');
    expect(named('待たなくてもいい')).toBe("don't have to");
    expect(named('待ってはいけない')).toBe('must not');
  });

  it('gives only labels the interface has a name for', () => {
    // Every label any line here gets — the forms above among them — with the
    // dictionary and without it. One missing from GRAMMAR_LABELS has no name
    // in src/i18n/en/grammar.ts, and would show in English in every language.
    for (const text of Object.keys(LINES)) {
      for (const withDictionary of [true, false]) {
        for (const label of tokens(text, withDictionary).flatMap((t) => t.inflections ?? [])) {
          expect(GRAMMAR_LABELS, `${text}: ${label}`).toContain(label);
        }
      }
    }
  });

  it('has a name in the interface for each label merging can give', () => {
    // Other languages' analysers add labels of their own to the same table.
    expect(Object.keys(grammar)).toEqual(expect.arrayContaining([...GRAMMAR_LABELS]));
  });
});
