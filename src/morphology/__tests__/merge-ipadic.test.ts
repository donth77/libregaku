import { describe, expect, it } from 'vitest';
import { lexiconFrom, toTokens } from '../lindera';
import { GRAMMAR_LABELS, lexiconQueries } from '../merge';
import { grammar } from '../../i18n/en/grammar';
import type { Token } from '../types';
import { ALONE, LINES, type Analysed } from './fixtures/ipadic';

/**
 * Merging, against what the analysers actually emit.
 *
 * Every input here is real analyser output (see the fixture), because the
 * failures this guards against were all cases where a hand-written morpheme
 * sequence passed and the analyser's own did not. LINES is a line as it is
 * read once everything has loaded; ALONE is the same line as IPADIC alone
 * reads it, which is what the page shows until JMdict's words and UniDic are
 * in, and what the merge rules were first written against.
 */

/** A line as IPADIC alone reads it. */
const alone = (text: string): Analysed | undefined => ALONE[text] ?? LINES[text];

/** Tokens for a fixture line, with the dictionary's answers or without. */
function tokens(text: string, withDictionary = true, line = LINES[text]): Token[] {
  if (!line) throw new Error(`no fixture for ${text}`);
  return toTokens(text, line.morphemes, withDictionary ? lexiconFrom(line.lexicon) : undefined);
}
/** The same for the line as IPADIC alone reads it. */
const early = (text: string): Token[] => tokens(text, true, alone(text));

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
    // The word is the noun, which JMdict files it under and a card is made for; the verb's form goes with it.
    expect(t).toMatchObject({ lemma: '勉強', usedAs: '勉強する', lemmaReading: 'ベンキョウ', reading: 'ベンキョウシテイル' });
    expect(keys(t)).toEqual(['勉強する', '勉強']);
    // The noun alone is the same word, and says nothing of する.
    expect(tokens('勉強が好き')[0]).toMatchObject({ lemma: '勉強' });
    expect(tokens('勉強が好き')[0]?.usedAs).toBeUndefined();
  });

  it('are the verb where the dictionary has it as a word of its own: 損する, 得する', () => {
    expect(only('損した')).toMatchObject({ lemma: '損する', lemmaReading: 'ソンスル' });
    expect(only('損した').usedAs).toBeUndefined();
    // IPADIC knows 損 only as a plain noun: without the dictionary to say so, the two stay apart.
    expect(words('損した', false)).toEqual(['損', 'した']);
    // Read as the verb reads it: 目される is もくされる, where 目 alone is め.
    expect(tokens('鷹派と目される')[2]).toMatchObject({ surface: '目される', lemma: '目する', reading: 'モクサレル', inflections: ['passive'] });
    // Not after a prefix, nor a word that describes a noun: 全損 is a word, and どの位 is どのくらい.
    expect(words('全損した')).toEqual(['全損', 'した']);
    expect(words('どの位したら会は始まるか。').slice(0, 3)).toEqual(['どの', '位', 'したら']);
  });

  it('are not the adjective a noun and し look like: 恋して is 恋する, not 恋しい', () => {
    expect(only('恋してる')).toMatchObject({ lemma: '恋する', reading: 'コイシテル', inflections: ['ongoing'] });
    expect(tokens('彼女に恋している。')[2]).toMatchObject({ surface: '恋している', lemma: '恋する' });
    expect(tokens('楽して稼ごう')[0]).toMatchObject({ surface: '楽して', lemma: '楽', usedAs: '楽する', reading: 'ラクシテ' });
    // The adjective goes on as 恋しくて.
    expect(tokens('恋しくて泣いた')[0]).toMatchObject({ surface: '恋しくて', lemma: '恋しい' });
    // And as IPADIC alone reads it, until UniDic has loaded.
    expect(early('恋してる')[0]).toMatchObject({ lemma: '恋しい' });
  });

  it('are the noun in katakana too: ゲームしましょう', () => {
    expect(only('ゲームしましょう')).toMatchObject({ lemma: 'ゲーム', usedAs: 'ゲームする', lemmaReading: 'ゲーム' });
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
    expect(t).toMatchObject({ lemma: '説明', usedAs: '説明する' });
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
    // With JMdict's words in the analyser it comes back whole, and nothing is asked.
    expect(lexiconQueries(alone('石灯籠')!.morphemes)).toEqual(['石灯', '石灯籠', '灯籠']);
    expect(lexiconQueries(LINES['石灯籠']!.morphemes)).toEqual([]);
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
    expect(tokens('彼らは互いに賞賛し合っている。').map((t) => t.usedAs ?? t.lemma)).toContain('賞賛する');
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

describe('a name that is also a word', () => {
  it('is taken for a name when a proper noun and a person ending say so and the dictionary has the word', () => {
    const t = only('未来ちゃん');
    expect([t.surface, t.name, t.content, t.reading]).toEqual(['未来ちゃん', true, false, undefined]);
    // Its meaning is still one lookup away.
    expect(keys(t)).toContain('未来');
  });

  it('is left as it was without the dictionary, which may not have loaded', () => {
    const t = only('未来ちゃん', false);
    expect([t.name, t.content]).toEqual([undefined, true]);
  });

  it('is not a name where the dictionary has no word of that spelling', () => {
    for (const text of ['山田くん', '田中君']) {
      const t = tokens(text);
      expect(t.some((x) => x.name), text).toBe(false);
      expect(t.every((x) => x.content), text).toBe(true);
    }
  });

  it('leaves words that end in the same endings alone', () => {
    for (const text of ['赤ちゃん', '坊ちゃん', 'お姉ちゃん']) {
      expect(tokens(text).some((x) => x.name), text).toBe(false);
    }
  });
});

describe('a number before a kanji IPADIC cannot read', () => {
  it('is one word, with the dictionary\'s reading, where the dictionary has it: 二択', () => {
    const t = tokens('今ラーメンかビールの二択だったんだけど').find((x) => x.surface === '二択');
    expect([t?.surface, t?.reading]).toEqual(['二択', 'ニタク']);
  });

  it('stays two where it does not: 三択', () => {
    expect(words('三択')).toEqual(['三', '択']);
  });

  it('leaves counters as they were: 二人, 一日', () => {
    expect(words('二人')).toEqual(['二人']);
    expect(words('一日')).toEqual(['一日']);
  });
});

describe('a noun and its suffixes', () => {
  it('are one word, read as a whole: 被害者側', () => {
    const t = tokens('被害者側に注意を')[0];
    expect([t?.surface, t?.reading]).toEqual(['被害者側', 'ヒガイシャガワ']);
  });
});

describe('katakana slang adjectives', () => {
  it('are the adjective, read as IPADIC reads it written in hiragana: ヤバくない, ヤバい', () => {
    const t = only('ヤバくない');
    expect([t.surface, t.lemma]).toEqual(['ヤバくない', 'やばい']);
    expect(only('ヤバい').lemma).toBe('やばい');
  });
});

describe('adjectives in rough speech', () => {
  it('are the adjective they are said for: すげえ, スッゲえ, でけえ', () => {
    expect([only('すげえ').surface, only('すげえ').lemma]).toEqual(['すげえ', 'すごい']);
    expect(only('スッゲえ').lemma).toBe('すっごい');
    expect(only('でけえ').lemma).toBe('でかい');
  });

  it('leave ねえ, "hey", alone', () => {
    expect(tokens('ねえ、聞いて')[0]?.lemma).toBe('ねえ');
  });
});

describe('words speech makes of several', () => {
  it('keeps たびに, "each time", as one word', () => {
    expect(words('見るたびにやる')).toEqual(['見る', 'たびに', 'やる']);
    expect(words('会うたび')).toEqual(['会う', 'たび']);
  });

  it('knows 知らねえ and 知らん as 知る, negative', () => {
    for (const text of ['知らねえ', '知らん']) {
      const t = only(text);
      expect([t.lemma, t.inflections]).toEqual(['知る', ['negative']]);
    }
  });

  it('knows Kansai-ben negatives: 食べへん, 行かへん, わからへん, せえへん', () => {
    for (const [text, lemma] of [['食べへん', '食べる'], ['行かへん', '行く'], ['わからへん', 'わかる'], ['せえへん', 'する']] as const) {
      const t = only(text);
      expect([t.lemma, t.inflections], text).toEqual([lemma, ['negative']]);
    }
  });

  it('knows おらん and おらんかった as おる, negative, and past', () => {
    expect(only('おらんかった').lemma).toBe('おる');
    expect(only('おらんかった').inflections).toEqual(['negative', 'past']);
  });
});

describe('more Kansai-ben', () => {
  it('knows 食べはる as 食べる, honorific', () => {
    const t = only('食べはる');
    expect([t.surface, t.lemma, t.inflections]).toEqual(['食べはる', '食べる', ['honorific']]);
  });

  it('knows ちゃう on its own as 違う, and leaves ねん as the ending it is', () => {
    expect(tokens('ちゃうねん').map((t) => [t.surface, t.lemma])).toEqual([['ちゃう', '違う'], ['ねん', 'ねん']]);
  });
});

describe('a kanji word the analyser cannot read', () => {
  it('is read from the dictionary: 就活, and 就活生 with its suffix', () => {
    expect(only('就活').reading).toBe('シュウカツ');
    const t = tokens('私が就活生ということもあって').find((x) => x.surface === '就活生');
    expect([t?.reading, t?.lemma]).toEqual(['シュウカツセイ', '就活']);
  });
});

describe('たまに, by the sentence it is in', () => {
  it('is "now and then" where nothing describes the たま', () => {
    expect(words('ここにはたまに来る')).toEqual(['ここ', 'に', 'は', 'たまに', '来る']);
    expect(words('たまには')).toEqual(['たまに', 'は']);
    expect(words('でもたまに思う')).toEqual(['でも', 'たまに', '思う']);
  });

  it('is a ball and に where something does: その, 彼の, 速い', () => {
    expect(words('そのたまに当たった').slice(0, 3)).toEqual(['その', 'たま', 'に']);
    expect(words('彼のたまに触るな').slice(2, 4)).toEqual(['たま', 'に']);
    expect(words('速いたまに驚く').slice(1, 3)).toEqual(['たま', 'に']);
    expect(words('玉に瑕')).toEqual(['玉', 'に', '瑕']);
  });
});

describe('Kansai forms, by what is around them', () => {
  it('takes はる for the honorific only on a verb\'s stem', () => {
    expect(only('行かはった').inflections).toEqual(['honorific', 'past']);
    expect(words('紙をはる')).toEqual(['紙', 'を', 'はる']);
  });

  it('reads おらん as おる, negative, where the analyser already does', () => {
    const t = tokens('俺はおらんよ').find((x) => x.surface.startsWith('おら'));
    expect([t?.lemma, t?.inflections]).toEqual(['おる', ['negative']]);
  });
});

describe('もん and もの, by the sentence they are in', () => {
  const mon = (text: string): Token => tokens(text).find((x) => x.surface === 'もん' || x.surface === 'もの')!;

  it('is the particle that gives a reason where it ends what was said', () => {
    for (const text of ['言ってましたもんね', 'だって嫌いだもん', '子供だもの']) {
      const t = mon(text);
      expect([t.pos, t.content], text).toEqual(['助詞', false]);
      expect(t.lookup?.[0]?.pos, text).toBe('助詞,終助詞');
    }
  });

  it('is もの, a thing, before だ: そんなもんだ, うまいもんだ', () => {
    for (const text of ['そんなもんだ', 'うまいもんだ']) {
      const t = mon(text);
      expect([t.pos, t.lemma], text).toEqual(['名詞', 'もの']);
    }
  });

  it('leaves 門, the gate, to the kanji', () => {
    expect(tokens('門の前')[0]?.lemma).toBe('門');
  });
});

describe('す for です, as people say it', () => {
  const lemmas = (text: string): Array<[string, string | undefined]> => tokens(text).map((x) => [x.surface, x.lemma]);

  it('is です where it ends what was said: 詳しいんすか, そうすか, これすか', () => {
    for (const text of ['詳しいんすか', 'そうすか', 'これすか']) {
      const all = lemmas(text);
      expect(all.some(([, lemma]) => lemma === 'です'), text).toBe(true);
      expect(all.some(([surface]) => surface === 'すか'), text).toBe(false);
    }
  });

  it('is です before a particle, and in そうすね', () => {
    for (const text of ['いいんすよ', '知らないんすけど', 'そうすね']) {
      expect(lemmas(text).some(([, lemma]) => lemma === 'です'), text).toBe(true);
    }
    expect(lemmas('そうすね').some(([, lemma]) => lemma === 'すねる')).toBe(false);
  });

  it('leaves すか, a miss, where a particle follows it', () => {
    expect(lemmas('すかを引いた')[0]).toEqual(['すか', 'すか']);
  });
});

describe('わけない, "no way that"', () => {
  it('is the expression after what it denies, however the analyser cut it', () => {
    for (const text of ['詳しいわけないと思って', '行くわけない', 'そんなわけない']) {
      const t = tokens(text).find((x) => x.surface === 'わけない');
      expect(t?.lemma, text).toBe('わけない');
    }
  });

  it('stays わける, to divide, where there is something to divide', () => {
    for (const text of ['ケーキをわけない', '半分にわけない']) {
      expect(tokens(text).some((x) => x.lemma === '分ける' || x.lemma === 'わける'), text).toBe(true);
      expect(tokens(text).some((x) => x.lemma === 'わけない'), text).toBe(false);
    }
  });
});

describe('endings that are also verbs, and words that are not endings', () => {
  it('keeps ちゃう after なっ and 終わっ an ending, though the analyser calls it independent there', () => {
    const t = tokens('詳しくなっちゃうわけ').find((x) => x.surface === 'なっちゃう');
    expect([t?.lemma, t?.inflections]).toEqual(['なる', ['completely, or regrettably']]);
    expect(only('終わっちゃう').lemma).toBe('終わる');
  });

  it('keeps 言いはる, a verb of its own, from being the honorific', () => {
    const t = tokens('言いはってしまった').find((x) => x.surface.startsWith('言い'));
    expect(t?.inflections ?? []).not.toContain('honorific');
  });

  it('keeps なもの, a thing, from being the particle もの', () => {
    const t = tokens('事故はとかく起こりがちなもの').find((x) => x.surface === 'もの');
    expect([t?.pos, t?.content]).not.toEqual(['助詞', false]);
  });
});

describe('katakana for emphasis, before する', () => {
  it('is looked up as the kind of word that takes する, with the dictionary\'s own ranking: マネして', () => {
    const t = tokens('出すようなマネして').find((x) => x.surface.startsWith('マネ'));
    expect(t?.surface).toBe('マネして');
    expect(t?.lookup?.some((k) => k.key === 'マネ' && k.pos === '名詞,サ変接続')).toBe(true);
  });

  it('is the same with を between: マネをする', () => {
    const t = tokens('マネをする').find((x) => x.surface === 'マネ');
    expect(t?.lookup?.some((k) => k.key === 'マネ' && k.pos === '名詞,サ変接続')).toBe(true);
  });
});

describe('間, あいだ or ま', () => {
  const aida = (text: string): string | undefined => tokens(text).find((x) => x.surface === '間')?.reading;

  it('is あいだ after a verb, an adjective, or の', () => {
    for (const text of ['検討する間出勤を控えて', '食べている間に', '夏休みの間は', '長い間待った', '理論と実行の間には']) {
      expect(aida(text), text).toBe('アイダ');
    }
  });

  it('stays ま where it is a pause or a space: 間もなく, いつの間にか, 控えの間, つかの間, 間を置く', () => {
    // Words IPADIC already holds whole, 間もなく, have no 間 of their own to read.
    expect(aida('間もなく始まる') ?? 'マ').toBe('マ');
    expect(aida('間を置く')).toBe('マ');
    for (const text of ['いつの間にか寝ていた', '控えの間がある', 'つかの間の休息', '一瞬の間が生まれた']) {
      expect(aida(text) ?? 'マ', text).toBe('マ');
    }
  });
});

describe('そっか, "oh, right"', () => {
  it('is one word where it starts what is said', () => {
    expect(only('そっか').lemma).toBe('そっか');
    expect(tokens('あ、そっか').some((x) => x.surface === 'そっか' && x.lemma === 'そっか')).toBe(true);
    // Drawn out, it is still the one word.
    expect([only('そっかー').surface, only('そっかー').lemma]).toEqual(['そっかー', 'そっか']);
    expect(only('そっかあ').lemma).toBe('そっか');
  });

  it('is left alone after a verb, where it is そうか on a stem: 時間つぶそっか', () => {
    expect(tokens('時間つぶそっか').some((x) => x.lemma === 'そっか')).toBe(false);
  });
});

describe('そう, "seems", and the copula after it', () => {
  it('is a word of its own after 楽しそう: だ, です', () => {
    expect(words('楽しそうだね')).toEqual(['楽しそう', 'だ', 'ね']);
    expect(words('楽しそうです')).toEqual(['楽しそう', 'です']);
    expect(words('待ちそうだ')).toEqual(['待ちそう', 'だ']);
  });

  it('still names 楽しそう "seems", and leaves hearsay, 待つそうだ, whole', () => {
    expect(tokens('楽しそうだね')[0]?.inflections).toEqual(['seems']);
    expect(only('待つそうだ').inflections).toEqual(['hearsay']);
  });
});

describe('a dash opening a line of dialogue', () => {
  it('is a mark of its own, and nothing attaches to it: -そう, -あの方, -3人', () => {
    expect(words('-そう')).toEqual(['-', 'そう']);
    expect(tokens('-そう')[0]?.punct).toBe(true);
    expect(words('-あの方')[0]).toBe('-');
    expect(words('-3人')[0]).toBe('-');
  });
});

describe('loanwords written as one', () => {
  it('are one word where the dictionary has them: ワンシーン, not ワン and シーン', () => {
    expect(words('映画のワンシーンかと思ったよ')).toContain('ワンシーン');
  });

  it('still take する: イメージチェンジした', () => {
    expect(only('イメージチェンジした')).toMatchObject({ lemma: 'イメージチェンジ', usedAs: 'イメージチェンジする' });
  });
});

describe('とかも, "and the like, too"', () => {
  it('is とか and も, not と and a duck', () => {
    expect(words('ユーチューバーとかも')).toEqual(['ユーチューバー', 'とか', 'も']);
    expect(tokens('ユーチューバーとかも').some((x) => x.surface === 'かも')).toBe(false);
  });

  it('leaves かも, "might", after a verb', () => {
    expect(words('行くかも')).toEqual(['行く', 'かも']);
  });
});


describe('a line while only IPADIC has loaded', () => {
  const surfaces = (text: string): string[] => early(text).map((t) => t.surface);

  it('is read differently from the line once everything has: the fixture holds both', () => {
    for (const text of ['石灯籠', '盗撮行為', 'ここにはたまに来る', '詳しいんすか', 'ユーチューバーとかも', '彼はいつ来ますか']) {
      expect(ALONE[text], text).toBeDefined();
    }
  });

  it('still has compounds whole from the dictionary: 石灯籠, 盗撮行為', () => {
    expect(early('石灯籠').map((t) => [t.lemma, t.reading])).toEqual([['石灯籠', 'イシドウロウ']]);
    expect(early('盗撮行為').map((t) => [t.surface, t.reading])).toEqual([['盗撮', 'トウサツ'], ['行為', 'コウイ']]);
    expect(early('就活')[0]?.reading).toBe('シュウカツ');
  });

  it('still reads たまに by the sentence it is in', () => {
    expect(surfaces('ここにはたまに来る')).toEqual(['ここ', 'に', 'は', 'たまに', '来る']);
    expect(surfaces('たまには')).toEqual(['たまに', 'は']);
    expect(surfaces('そのたまに当たった').slice(0, 3)).toEqual(['その', 'たま', 'に']);
    expect(surfaces('速いたまに驚く').slice(1, 3)).toEqual(['たま', 'に']);
  });

  it('still reads す as です, and とかも as とか and も', () => {
    for (const text of ['詳しいんすか', 'そうすか', 'これすか']) {
      expect(early(text).some((t) => t.lemma === 'です'), text).toBe(true);
      expect(surfaces(text), text).not.toContain('すか');
    }
    expect(surfaces('ユーチューバーとかも')).toEqual(['ユーチューバー', 'とか', 'も']);
  });

  it('still leaves そうか on a stem alone: 時間つぶそっか', () => {
    expect(early('時間つぶそっか').some((t) => t.lemma === 'そっか')).toBe(false);
  });

  it('does not take a rough word for the adjective it sounds like: おめえ is no 重い, くれえ no 黒い', () => {
    expect(early('おめえが心配だ').some((t) => t.lemma === 'おもい')).toBe(false);
    expect(early('どのくれえ時間かかるか').some((t) => t.lemma === 'くろい')).toBe(false);
  });
});

describe('words in katakana with a long vowel', () => {
  it('are the words they are, not an adjective said roughly: カレー, レース, ケーキ', () => {
    for (const read of [tokens, early]) {
      expect(read('カレーを食べる').map((t) => [t.surface, t.lemma])[0]).toEqual(['カレー', 'カレー']);
      expect(read('そのレースに勝った').map((t) => t.surface)).toEqual(['その', 'レース', 'に', '勝った']);
      expect(read('昼食の後でケーキを食べる').map((t) => t.surface)).toContain('ケーキ');
    }
  });

  it('are still the adjective where they are one: やべー, きたねぇ', () => {
    expect(tokens('やべー緊張してきた')[0]).toMatchObject({ surface: 'やべー', lemma: 'やばい' });
    expect(tokens('字きたねぇな').map((t) => [t.surface, t.lemma])).toContainEqual(['きたねぇ', 'きたない']);
  });
});

describe('names in katakana beside an adjective', () => {
  it('stay names: クラウチさん is not 暗い, アライさん not 荒い', () => {
    expect(tokens('クラウチさんはヤバい').map((t) => [t.surface, t.lemma])).toEqual([
      ['クラウチさん', 'クラウチ'], ['は', 'は'], ['ヤバい', 'やばい'],
    ]);
    expect(tokens('アライさんが来た')[0]).toMatchObject({ surface: 'アライさん', lemma: 'アライ' });
  });
});

describe('what UniDic\'s second opinion puts right', () => {
  const read = (text: string): Array<[string, string | undefined]> => tokens(text).map((t) => [t.surface, t.lemma]);

  it('reads いつ after は as "when", not いる and an old ending', () => {
    expect(read('彼はいつ来ますか')).toContainEqual(['いつ', 'いつ']);
    expect(read('いつから？')[0]).toEqual(['いつ', 'いつ']);
    // Without it, the word IPADIC gives is いる.
    expect(early('彼はいつ来ますか').find((t) => t.surface === 'いつ')?.lemma).toBe('いる');
  });

  it('reads いただけませんか as いただける, not いた and だけ', () => {
    const t = tokens('また後でかけ直していただけませんか？');
    expect(t.map((x) => x.surface)).toEqual(['また', '後で', 'かけ直して', 'いただけません', 'か', '？']);
    expect(t[3]).toMatchObject({ lemma: 'いただける', inflections: ['polite', 'negative'] });
  });

  it('keeps words written in kana whole: いかが, そろばん, ひげ, もっちり, ぶっちゃけ', () => {
    expect(read('お肉の焼き加減は、いかがなさいますか？')).toContainEqual(['いかが', 'いかが']);
    expect(read('そろばんって、なぁに？')[0]).toEqual(['そろばん', 'そろばん']);
    expect(read('ひげを生やしている')[0]).toEqual(['ひげ', 'ひげ']);
    expect(read('うわ、めっちゃもっちり。')).toContainEqual(['もっちり', 'もっちり']);
    expect(read('ぶっちゃけ、そんなの知らなかったよ。')[0]?.[0]).toBe('ぶっちゃけ');
  });

  it('reads たん after a verb as た and ん, and だい as だ and い', () => {
    const sunde = tokens('住んでたんだよ');
    expect(sunde.map((t) => t.surface)).toEqual(['住んでた', 'ん', 'だ', 'よ']);
    expect(sunde[0]?.lemma).toBe('住む');
    expect(read('坊や、おかあさんは何処だい？').slice(-3)).toEqual([['だ', 'だ'], ['い', 'い'], ['？', '？']]);
    expect(tokens('何をしていたんだい？').map((t) => t.surface)).toEqual(['何', 'を', 'していた', 'ん', 'だ', 'い', '？']);
  });

  it('knows the words IPADIC does not: 癒やす, モテる, ググる, キモい, 試着', () => {
    expect(read('癒やす')).toEqual([['癒やす', '癒やす']]);
    expect(tokens('モテない')).toMatchObject([{ surface: 'モテない', lemma: 'もてる', inflections: ['negative'] }]);
    expect(read('ググってる')).toEqual([['ググってる', 'ググる']]);
    expect(read('キモいんだろうね')[0]).toEqual(['キモい', 'きもい']);
    expect(tokens('試着したいんですが')[0]).toMatchObject({ surface: '試着したい', lemma: '試着', usedAs: '試着する', reading: 'シチャクシタイ' });
    expect(tokens('盗撮された')).toMatchObject([{ lemma: '盗撮', usedAs: '盗撮する', reading: 'トウサツサレタ' }]);
  });

  it('reads くださり as 下さる, and おススメ as a noun', () => {
    expect(tokens('送ってくださり、ありがとうございます。')[0]).toMatchObject({ surface: '送ってくださり', lemma: '送る' });
    expect(read('大切な思い出になるのでおススメです！').slice(-3)).toEqual([['おススメ', 'すすめ'], ['です', 'です'], ['！', '！']]);
  });
});

describe('what UniDic\'s second opinion is not taken on', () => {
  const surfaces = (text: string): string[] => tokens(text).map((t) => t.surface);

  it('a particle and a word, or a verb and its ending: は and やる, し and たく', () => {
    expect(surfaces('彼女はやるたびに失敗した。')).toEqual(['彼女', 'は', 'やる', 'たびに', '失敗した', '。']);
    expect(tokens('邪魔をしたくはない。')[2]).toMatchObject({ surface: 'したく', lemma: 'する' });
  });

  it('a noun and the particle that ends the clause, or one a particle marks: まじか, かねを', () => {
    expect(surfaces('まじか。')).toEqual(['まじ', 'か', '。']);
    expect(tokens('かねを貸してあげる')[0]).toMatchObject({ surface: 'かね', lemma: 'かね' });
  });

  it('a name: ヒラリさん is not ひらり, and ムーリエル is not cut in two', () => {
    expect(tokens('ヒラリさんは塀にはしごをかけた。')[0]).toMatchObject({ surface: 'ヒラリさん', lemma: 'ヒラリ' });
    expect(surfaces('ムーリエルは２０歳になりました。')[0]).toBe('ムーリエル');
  });

  it('a lone kanji, or a word the two read as different kinds: 三択, くれたまえ', () => {
    expect(surfaces('三択')).toEqual(['三', '択']);
    // UniDic's まえ, 前, is not taken where IPADIC has ま and え: the two are read as the order they are, たまえ.
    const order = tokens('ぼやっとしないでくれたまえ。').slice(-2)[0];
    expect(order).toMatchObject({ surface: 'しないでくれたまえ', lemma: 'する' });
    expect(order?.inflections).toContain('imperative');
  });
});

describe('words the line reads, where neither analyser can be asked', () => {
  /** Each word of a line with its reading. */
  const said = (text: string): Array<[string, string | undefined]> => tokens(text).map((t) => [t.surface, t.reading]);
  const reads = (text: string, word: string): string | undefined => tokens(text).find((t) => t.surface === word)?.reading;

  it('reads 今 before a noun as いま, "now", where both take it for こん, "this"', () => {
    expect(said('彼女は今宿題をやっている。').slice(2, 4)).toEqual([['今', 'イマ'], ['宿題', 'シュクダイ']]);
    expect(said('今金欠で').slice(0, 2)).toEqual([['今', 'イマ'], ['金欠', 'キンケツ']]);
    // こん before a term in a run of them, and where the dictionary has the two as a word.
    expect(tokens('彼女は今学期がんばって勉強している。')[2]).toMatchObject({ surface: '今学期', reading: 'コンガッキ' });
    expect(tokens('今シーズンは我々のチームがリーグで優勝した。')[0]).toMatchObject({ surface: '今シーズン', reading: 'コンシーズン' });
    // And as IPADIC alone reads it, until the dictionary answers.
    expect(tokens('彼女は今宿題をやっている。', false)[2]).toMatchObject({ surface: '今宿題' });
  });

  it('reads 今 and a noun that both have a name for as the two words: 今金がない, 今本を読んでいる', () => {
    expect(said('今金がない')).toEqual([['今', 'イマ'], ['金', 'カネ'], ['が', 'ガ'], ['ない', 'ナイ']]);
    expect(said('今金の持ち合わせがない。').slice(0, 2)).toEqual([['今', 'イマ'], ['金', 'カネ']]);
    expect(said('彼は今本を読んでいるところです。').slice(2, 4)).toEqual([['今', 'イマ'], ['本', 'ホン']]);
    // A name before what a name takes.
    expect(tokens('今本さんが来た')[0]).toMatchObject({ surface: '今本さん', lemma: '今本' });
    expect(tokens('今金町に行った')[0]?.surface).toBe('今金町');
  });

  it('cuts a name that is a word of time and another word, as UniDic does: 毎日新聞を読む', () => {
    expect(said('毎日新聞を読みなさい').slice(0, 2)).toEqual([['毎日', 'マイニチ'], ['新聞', 'シンブン']]);
    expect(said('彼らは今船に乗っている。').slice(2, 4)).toEqual([['今', 'イマ'], ['船', 'フネ']]);
    expect(said('春の海ひねもすのたりのたり哉。').slice(0, 3)).toEqual([['春', 'ハル'], ['の', 'ノ'], ['海', 'ウミ']]);
    // Not a given name, whatever UniDic makes of it.
    expect(tokens('私は夏子です。')[2]).toMatchObject({ surface: '夏子', reading: 'ナツコ' });
    // And the name it was to IPADIC alone.
    expect(early('毎日新聞を読みなさい')[0]?.surface).toBe('毎日新聞');
  });

  it('reads 金 as money, and as gold where the line says so', () => {
    for (const money of ['金がない', '金を払おう', '俺金ないよ', '金でできぬ事はこの世にはないわ。']) expect(reads(money, '金'), money).toBe('カネ');
    for (const gold of ['金と銀', '金を掘る', '金の指輪を買った', 'このカップは金でできている。', '沈黙は金']) expect(reads(gold, '金'), gold).toBe('キン');
    // Friday among days, an ending, and Mr Kim are none of its business.
    expect(reads('私は、月・水・金と一日おきに仕事をします。', '金')).toBe('キン');
    expect(tokens('金さんが来た')[0]).toMatchObject({ surface: '金さん' });
    expect(tokens('前払金を受けた')[0]?.reading).toMatch(/キン$/);
    // Money without UniDic too, which IPADIC alone reads きん every time.
    expect(early('金がない')[0]).toMatchObject({ surface: '金', reading: 'カネ' });
  });

  it("does not take UniDic's habits for the line's: 風に, 数, 一足, テーブルの下で", () => {
    expect(reads('風にゆれるあの花々をごらんなさい。', '風')).toBe('カゼ');
    expect(reads('彼は数に圧倒された。', '数')).toBe('カズ');
    expect(reads('靴を一足買ったよ。', '一足')).toBe('イッソク');
    expect(reads('ペルシャ猫がテーブルの下で眠っていた。', '下')).toBe('シタ');
    expect(said('それはもう一つ下の階ですよ。').slice(3, 5)).toEqual([['一つ', 'ヒトツ'], ['下', 'シタ']]);
    // もと under a rule or a person, which is no table.
    expect(reads('彼の指導の下で商売は繁盛した。', '下')).toBe('モト');
    expect(reads('彼の下で働くなら辞めた方がましだ。', '下')).toBe('モト');
  });

  it('reads 風 as ふう, a way, after a word that asks or says in what way', () => {
    expect(reads('あんな風に怒らなくてもよかったのに。', '風')).toBe('フウ');
    expect(reads('知った風な口利くなよ。', '風')).toBe('フウ');
    // どういう風の吹き回し is the wind.
    expect(reads('どういう風の吹き回しかな。', '風')).toBe('カゼ');
  });

  it('looks a verb in kana up as the expression it stands in writes it: 目がさめた is 覚める', () => {
    const woke = tokens('目がさめた')[2]!;
    expect(woke).toMatchObject({ surface: 'さめた', lemma: 'さめる' });
    expect(keys(woke).slice(0, 2)).toEqual(['覚める', 'さめる']);
    expect(woke.lookup?.[0]).toMatchObject({ key: '覚める', reading: 'サメル', pos: '動詞,自立' });
    expect(keys(tokens('腹がたつ')[2]!)[0]).toBe('立つ');
    expect(keys(tokens('写真をとった')[2]!)[0]).toBe('撮る');
    // Under UniDic's name for the verb, where the dictionary has the expression so written: 時間が経つ.
    expect(keys(tokens('時間がたつ')[2]!)).toEqual(['経つ', 'たつ']);
    // No expression, or one the dictionary writes in kana itself: as it was.
    expect(keys(tokens('スープがさめた')[2]!)[0]).toBe('さめる');
    expect(keys(tokens('汗をかいた')[2]!)[0]).toBe('かく');
  });

  it('keeps a verb called out whole, and finds the noun under an honorific one', () => {
    expect(tokens('助けてくれえ！')[0]).toMatchObject({ surface: '助けてくれえ', lemma: '助ける', reading: 'タスケテクレエ' });
    expect(keys(tokens('お待ちしております')[0]!)).toEqual(['お待ちする', 'お待ち', '待ち']);
  });
});
