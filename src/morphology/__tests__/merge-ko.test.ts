import { describe, expect, it } from 'vitest';
import { GRAMMAR_LABELS } from '../merge';
import { KO_GRAMMAR_LABELS, koCueTokens, koStretches, koTokens, mergeKorean, type KoMorpheme } from '../merge-ko';
import type { Token } from '../types';
import { LINES } from './fixtures/ko-dic';

/**
 * Korean merging, against what ko-dic actually emits.
 *
 * Every line here is real analyser output (see the fixture), misreadings
 * included: half of what these rules do is put right what ko-dic reads wrong
 * once a line has no full stop, or a short word follows a space.
 */

/** The analyser's units for a fixture line. */
function raw(text: string): KoMorpheme[] {
  const line = LINES[text];
  if (!line) throw new Error(`no fixture for ${text}`);
  return line;
}

const tokens = (text: string): Token[] => koTokens(text, raw(text));
/** A line's words: its tokens without the spaces and marks between them. */
const words = (text: string): Token[] => tokens(text).filter((t) => !t.punct);
const surfaces = (text: string): string[] => words(text).map((t) => t.surface);
const only = (text: string): Token => {
  const w = words(text);
  expect(w, `${text} should be one word`).toHaveLength(1);
  return w[0]!;
};
/** The word of a line written `surface` — the first, or the `nth`. */
function word(text: string, surface: string, nth = 0): Token {
  const found = words(text).filter((t) => t.surface === surface)[nth];
  if (!found) throw new Error(`no word ${surface} in ${text}: ${surfaces(text).join(' ')}`);
  return found;
}
const keys = (t: Token): string[] => (t.lookup ?? []).map((k) => k.key);
const units = (text: string): string[] => raw(text).map((m) => `${m.surface}/${m.tag}`);

describe('names, and the 테니까 pattern', () => {
  it('flags a name the analyser knows as one, and no other word', () => {
    const line = '서울에 사는 친구가 예쁜 꽃을 샀어요.';
    expect(word(line, '서울').properName).toBe(true);
    expect(word(line, '친구').properName).toBeUndefined();
  });

  it('reads 할 테니까요 as the pattern and not as the noun 터, "place"', () => {
    const line: KoMorpheme[] = [
      { surface: '갈', tag: 'VV+ETM', type: 'Inflect', expression: '가/VV/*+ᆯ/ETM/*' },
      { surface: '테니까요', tag: 'NNB+VCP+EC+JX', type: 'Inflect', expression: '터/NNB/*+이/VCP/*+니까/EC/*+요/JX/*' },
    ];
    const t = koTokens('갈 테니까요', line).filter((x) => !x.punct);
    expect(t.map((x) => x.surface)).toEqual(['갈', '테니까요']);
    expect(t[1]?.lemma).toBe('-ㄹ 터이다');
    expect((t[1]?.lookup ?? []).map((k) => k.key)).toEqual(['-ㄹ 터이다']);
  });
});

describe('a stem and its endings', () => {
  it('are one word, looked up as stem + 다', () => {
    const t = only('갔어요');
    expect(t).toMatchObject({ surface: '갔어요', lemma: '가다', pos: 'VV', content: true, start: 0, end: 3 });
    expect(keys(t)).toEqual(['가다', '갔어요']);
    expect(t.lookup?.[0]).toEqual({ key: '가다', pos: 'VV' });
    // Hangul needs no reading over it.
    expect(t.reading).toBeUndefined();
    expect(t.lemmaReading).toBeUndefined();
  });

  it('keep the morphemes they were built from, spelt as a learner would', () => {
    expect(only('갔어요').parts).toEqual(['가', '았', '어요']);
    // ko-dic writes the 았 of 샀 as ㅏㅆ, and the ㄴ of 예쁜 as a final letter.
    expect(word('서울에 사는 친구가 예쁜 꽃을 샀어요.', '샀어요').parts).toEqual(['사', '았', '어요']);
    expect(word('서울에 사는 친구가 예쁜 꽃을 샀어요.', '예쁜').parts).toEqual(['예쁘', 'ㄴ']);
    expect(word('- 네 감사합니다', '감사합니다').parts).toEqual(['감사', '하', 'ㅂ니다']);
  });

  it('take the stem ko-dic spells out, not the one written', () => {
    expect(word('네 이름도 몰라', '몰라').lemma).toBe('모르다');
    expect(only('도와주세요').lemma).toBe('돕다');
    expect(word('서울에 사는 친구가 예쁜 꽃을 샀어요.', '예쁜').lemma).toBe('예쁘다');
    expect(word('케이크를 먹고 싶어요.', '먹고').lemma).toBe('먹다');
  });

  it('name what the endings do, in order', () => {
    expect(only('갔어요').inflections).toEqual(['past', 'polite']);
    expect(word('- 네 감사합니다', '감사합니다').inflections).toEqual(['formal polite']);
    expect(word('서울에 사는 친구가 예쁜 꽃을 샀어요.', '예쁜').inflections).toEqual(['modifier']);
    expect(word('네, 엄마가 그랬어 하고 대답했다.', '하고').inflections).toEqual(['and']);
    expect(word('걸으면 건강해져요. 그제야 깨달았어요.', '걸으면').inflections).toEqual(['conditional']);
    // 다 and 어 close a plain sentence and are not named.
    expect(word('"어디 가니?" 라고 물었다.', '물었다').inflections).toEqual(['past']);
    expect(word('가지 마', '마').inflections).toBeUndefined();
  });

  it('take the 요 that makes a form polite, which ko-dic gives as a particle', () => {
    expect(units('자랑스러워요. 무서워해요.').slice(0, 4)).toEqual(['자랑/NNG', '스러워/XSA+EC', '요/JX', './SF']);
    expect(word('자랑스러워요. 무서워해요.', '자랑스러워요')).toMatchObject({ lemma: '자랑스럽다', inflections: ['polite'] });
  });
});

describe('하다 words', () => {
  it('are the noun and its 하다, looked up as the verb and then the noun', () => {
    const t = word('도서관에서 공부하고 있어요.', '공부하고');
    expect(t).toMatchObject({ lemma: '공부하다', pos: 'NNG', content: true, parts: ['공부', '하', '고'] });
    expect(keys(t)).toEqual(['공부하다', '공부']);
    expect(keys(word('- 네 감사합니다', '감사합니다'))).toEqual(['감사하다', '감사']);
  });

  it('are made of a root too, and by 되 and 스럽', () => {
    expect(word('OK! 일석이조 (一石二鳥), 100% 확실해.', '확실해')).toMatchObject({ lemma: '확실하다', pos: 'XR' });
    // 사용되다 may have no entry of its own: then the 하다 verb, then the noun.
    expect(keys(word('이 단어는 자주 사용됩니다.', '사용됩니다'))).toEqual(['사용되다', '사용하다', '사용']);
    expect(keys(word('자랑스러워요. 무서워해요.', '자랑스러워요'))).toEqual(['자랑스럽다', '자랑']);
  });
});

describe('particles and the copula', () => {
  it('are tokens of their own, and not words to learn', () => {
    const t = words('학교에서는 공부만 해요.');
    expect(t.map((x) => [x.surface, x.content])).toEqual([
      ['학교', true], ['에서', false], ['는', false], ['공부', true], ['만', false], ['해요', true],
    ]);
    expect(t[1]).toMatchObject({ lemma: '에서', pos: 'JKB' });
  });

  it('make one token of the copula and its endings', () => {
    expect(surfaces('저는 학생이에요.')).toEqual(['저', '는', '학생', '이에요']);
    expect(word('저는 학생이에요.', '이에요')).toMatchObject({ lemma: '이다', pos: 'VCP', content: false, inflections: ['polite'] });
    // After a vowel the 이 is not written: 뭐예요, 거야.
    expect(word('그게 뭐예요? 누군가가 문을 열었어요.', '예요')).toMatchObject({ lemma: '이다', content: false });
    expect(word('언젠간 알게 될 거야.', '야')).toMatchObject({ lemma: '이다', content: false });
  });

  it('keep 아니다 a word', () => {
    expect(word('그건 제 책이 아니에요.', '아니에요')).toMatchObject({ lemma: '아니다', pos: 'VCN', content: true, inflections: ['polite'] });
  });
});

describe('helper verbs', () => {
  it('join the verb they are written on to, and are named', () => {
    const t = word('한번 해보자! 잘 들어 봐.', '해보자');
    expect(t).toMatchObject({ lemma: '하다', parts: ['하', '아', '보', '자'] });
    expect(t.inflections).toEqual(['try doing', "let's"]);
    expect(only('도와주세요').inflections).toEqual(['please']);
    expect(word('걸으면 건강해져요. 그제야 깨달았어요.', '건강해져요')).toMatchObject({ lemma: '건강하다', inflections: ['becomes', 'polite'] });
  });

  it('are words of their own after a space, looked up as stem + 다', () => {
    expect(surfaces('케이크를 먹고 싶어요.')).toEqual(['케이크', '를', '먹고', '싶어요']);
    expect(word('케이크를 먹고 싶어요.', '싶어요')).toMatchObject({ lemma: '싶다', pos: 'VX', content: true, inflections: ['polite'] });
    expect(word('도서관에서 공부하고 있어요.', '있어요')).toMatchObject({ lemma: '있다', content: true });
    expect(word('저는 학교에 가지 않아요.', '않아요')).toMatchObject({ lemma: '않다', content: true });
  });

  it('read 했잖아요 as "you know", not as the negative ko-dic takes it apart into', () => {
    expect(raw('가야 했잖아요.')[2]?.expression).toBe('하/XSA/*+았/EP/*+지/EC/*+않/VX/*+아요/EF/*');
    expect(word('가야 했잖아요.', '했잖아요')).toMatchObject({ lemma: '하다', inflections: ['past', 'as you know', 'polite'] });
  });

  it('read 가야 as the 아야 of "must" run into the stem', () => {
    expect(word('가야 했잖아요.', '가야')).toMatchObject({ lemma: '가다', inflections: ['must'] });
    expect(word('집을 지었어요. 이제 가야지.', '가야지')).toMatchObject({ lemma: '가다', inflections: ['must'] });
  });
});

describe('an adjective made a verb with 어하다', () => {
  it('is the word a learner has a card for, with the adjective to fall back on', () => {
    const t = word('나는 이 노래를 좋아해요.', '좋아해요');
    expect(t).toMatchObject({ lemma: '좋아하다', inflections: ['polite'] });
    expect(keys(t)).toEqual(['좋아하다', '좋다', '좋아해요']);
  });

  it('is found inside one fused unit as well', () => {
    expect(units('자랑스러워요. 무서워해요.').slice(4)).toEqual(['무서워해요/VA+EC+VX+EF', './SF']);
    expect(keys(word('자랑스러워요. 무서워해요.', '무서워해요'))).toEqual(['무서워하다', '무섭다', '무서워해요']);
  });
});

describe('words fused with a particle', () => {
  it('are one word, looked up as the pronoun', () => {
    const t = word('그게 뭐예요? 누군가가 문을 열었어요.', '그게');
    expect(t).toMatchObject({ lemma: '그것', pos: 'NP', content: true, parts: ['그것', '이'], inflections: ['subject'] });
    expect(keys(t)).toEqual(['그것', '그게']);
    expect(word('그건 제 책이 아니에요.', '그건')).toMatchObject({ lemma: '그거', inflections: ['topic'] });
    expect(word('그건 제 책이 아니에요.', '제')).toMatchObject({ lemma: '저', inflections: ['possessive'] });
  });

  it('read 누군가 as "someone", not as the question ko-dic takes it apart into', () => {
    const someone = word('그게 뭐예요? 누군가가 문을 열었어요.', '누군가');
    expect(someone).toMatchObject({ lemma: '누군가', content: true });
    expect(someone.inflections).toBeUndefined();
    expect(keys(someone)).toEqual(['누군가', '누구']);
    // And the 가 after it is its particle, not the helper verb ko-dic says.
    expect(units('그게 뭐예요? 누군가가 문을 열었어요.')[5]).toBe('가/VX');
    expect(word('그게 뭐예요? 누군가가 문을 열었어요.', '가')).toMatchObject({ pos: 'JKS', content: false });
    expect(word('언젠간 알게 될 거야.', '언젠간')).toMatchObject({ lemma: '언젠가', inflections: ['topic'] });
  });

  it('read the 거 of 할 거야 as 것', () => {
    expect(word('언젠간 알게 될 거야.', '거')).toMatchObject({ lemma: '것', pos: 'NNB', content: true });
    expect(keys(word('그게 뭐예요? 누군가가 문을 열었어요.', '뭐'))).toEqual(['뭐', '무엇']);
  });
});

describe('compounds, numbers and other scripts', () => {
  it('keep a compound ko-dic has as one word, with its parts to fall back on', () => {
    const t = word('도서관에서 공부하고 있어요.', '도서관');
    expect(t).toMatchObject({ lemma: '도서관', content: true });
    expect(t.parts).toBeUndefined();
    expect(keys(t)).toEqual(['도서관', '도서', '관']);
  });

  it('show a figure and count nothing; the counter after it is the word', () => {
    const t = tokens('사과 3개와 커피 한 잔 주세요.');
    expect(t.find((x) => x.surface === '3')).toMatchObject({ content: false, punct: false, pos: 'SN' });
    expect(t.find((x) => x.surface === '개')).toMatchObject({ lemma: '개', pos: 'NNBC', content: true });
    expect(word('OK! 일석이조 (一石二鳥), 100% 확실해.', '100').content).toBe(false);
  });

  it('take Latin script and hanja as words, as written', () => {
    expect(word('OK! 일석이조 (一石二鳥), 100% 확실해.', 'OK')).toMatchObject({ lemma: 'OK', pos: 'SL', content: true });
    expect(word('OK! 일석이조 (一石二鳥), 100% 확실해.', '二')).toMatchObject({ lemma: '二', pos: 'SH', content: true });
  });

  it('mark symbols as punctuation', () => {
    const marks = tokens('OK! 일석이조 (一石二鳥), 100% 확실해.').filter((t) => t.punct).map((t) => t.surface);
    expect(marks).toEqual(['!', ' ', ' ', '(', ')', ',', ' ', '%', ' ', '.']);
  });

  it('go by ko-dic\'s tag for a mark that is no punctuation by its character', () => {
    // A zero-width space, as captions carry them: not a letter, and not a word.
    expect(units('횐색 토끼의 증인\u200b은 많다.')[4]).toBe('\u200b/SY');
    expect(tokens('횐색 토끼의 증인\u200b은 많다.')[6]).toMatchObject({ surface: '\u200b', punct: true, content: false });
    expect(surfaces('횐색 토끼의 증인\u200b은 많다.')).toEqual(['횐색', '토끼', '의', '증인', '은', '많다']);
  });
});

describe('suffixes and prefixes', () => {
  it('leave a plural the word it was, and keep a suffix that makes a new word', () => {
    expect(surfaces('선생님들께 개인적으로 물어봤어요. 비공식적으로 만났어요.').slice(0, 4)).toEqual(['선생님들', '께', '개인적', '으로']);
    const teachers = word('선생님들께 개인적으로 물어봤어요. 비공식적으로 만났어요.', '선생님들');
    expect(teachers).toMatchObject({ lemma: '선생님', parts: ['선생', '님', '들'] });
    expect(keys(teachers)).toEqual(['선생님', '선생님들', '선생']);
    expect(keys(word('선생님들께 개인적으로 물어봤어요. 비공식적으로 만났어요.', '개인적'))).toEqual(['개인적', '개인']);
  });

  it('join a prefix to its noun, and never make it the word', () => {
    const t = word('선생님들께 개인적으로 물어봤어요. 비공식적으로 만났어요.', '비공식적');
    expect(t).toMatchObject({ lemma: '비공식적', pos: 'NNG', parts: ['비', '공식', '적'] });
    expect(keys(t)).toEqual(['비공식적', '공식적', '공식']);
  });
});

describe('bound nouns', () => {
  it('are words of their own', () => {
    expect(word('어제 많이 걸었어요. 걸을 수 있어요.', '수')).toMatchObject({ lemma: '수', content: true });
    expect(word('한국에 가 본 적이 있어요. 비가 오는 것 같아요.', '것')).toMatchObject({ lemma: '것', pos: 'NNB', content: true });
    expect(word('아이 두 명이 고양이 네 마리를 키워.', '명')).toMatchObject({ lemma: '명', pos: 'NNBC', content: true });
  });
});

describe('what ko-dic misreads at the end of a line', () => {
  it('reads 주세요 as 주다, not as the name ko-dic takes it for', () => {
    expect(units('만 원만 빌려 주세요').at(-1)).toBe('주세요/NNP');
    const t = word('만 원만 빌려 주세요', '주세요');
    expect(t).toMatchObject({ lemma: '주다', pos: 'VV', content: true, parts: ['주', '시', '어요'] });
    expect(t.inflections).toEqual(['honorific', 'polite']);
    // With a full stop ko-dic reads it right, and the two agree.
    expect(word('사과 3개와 커피 한 잔 주세요.', '주세요')).toMatchObject({ lemma: '주다', inflections: ['honorific', 'polite'] });
  });

  it('puts back together an ending cut in two', () => {
    // Where a line ends, and before a mark inside one — with the full stop too, for this verb.
    expect(units('네 조언을 따를게. 걱정 마.').slice(3, 6)).toEqual(['따를/VV+ETM', '게/NNB+JKS', './SF']);
    expect(surfaces('네 조언을 따를게. 걱정 마.')).toEqual(['네', '조언', '을', '따를게', '걱정', '마']);
    expect(word('네 조언을 따를게. 걱정 마.', '따를게')).toMatchObject({ lemma: '따르다', parts: ['따르', 'ㄹ게'], inflections: ['I will'] });
    // 외로운 and 데 "a place", before a comma.
    expect(units('외로운데, 그래도 재미있었어요.').slice(0, 2)).toEqual(['외로운/VA+ETM', '데/NNB']);
    expect(word('외로운데, 그래도 재미있었어요.', '외로운데')).toMatchObject({ lemma: '외롭다', inflections: ['but, or given that'] });
    // 불러 and a noun 서요, to ko-dic.
    expect(units('이름을 불러서요').slice(2)).toEqual(['불러/VV+EC', '서요/NNG']);
    expect(word('이름을 불러서요', '불러서요')).toMatchObject({ lemma: '부르다', inflections: ['because, or and then', 'polite'] });
  });

  it('drops the ending ko-dic puts before 거야, which nothing wrote, and cuts it as a full stop would', () => {
    expect(raw('내일 갈 거야').at(-1)).toMatchObject({ surface: '거야', expression: 'ᆯ/ETM/*+거/NNB/*+이/VCP/*+야/EC/*' });
    expect(surfaces('내일 갈 거야')).toEqual(['내일', '갈', '거', '야']);
    expect(word('내일 갈 거야', '거')).toMatchObject({ lemma: '것', pos: 'NNB', content: true });
    expect(word('내일 갈 거야', '야')).toMatchObject({ lemma: '이다', pos: 'VCP', content: false, parts: ['이', '야'] });
    // With the mark ko-dic gives the two itself, and the line reads the same.
    expect(units('언젠간 알게 될 거야.').slice(-3)).toEqual(['거/NNB', '야/VCP+EF', './SF']);
    expect(surfaces('언젠간 알게 될 거야.').slice(-2)).toEqual(['거', '야']);
  });

  it('reads 가요 as 가다', () => {
    expect(units('시간이 없기 때문에 못 가요.').at(-2)).toBe('가요/VCP+EF');
    expect(word('시간이 없기 때문에 못 가요.', '가요')).toMatchObject({ lemma: '가다', content: true, inflections: ['polite'] });
    // And without the mark, where ko-dic says 가요 "songs".
    expect(units('먹을 남은 음식이 없어요. 학교에 가요').at(-1)).toBe('가요/NNG');
    expect(word('먹을 남은 음식이 없어요. 학교에 가요', '가요')).toMatchObject({ lemma: '가다', content: true, inflections: ['polite'] });
  });
});

describe('what ko-dic misreads after a space', () => {
  it('reads a short word as the word it is, not as an ending or a particle', () => {
    for (const [text, surface, unit, lemma, pos] of [
      ['사람 많은 게 싫어요.', '게', '게/EC', '것', 'NNB'],
      ['숙제 다 하고 잘 자', '다', '다/EC', '다', 'MAG'],
      ['숙제 다 하고 잘 자', '자', '자/EC', '자다', 'VV'],
      ['아이 두 명이 고양이 네 마리를 키워.', '두', '두/JX', '두', 'MM'],
      ['나는 이 노래를 좋아해요.', '이', '이/VCP', '이', 'MM'],
      ['한국에 가 본 적이 있어요. 비가 오는 것 같아요.', '가', '가/JKS', '가다', 'VV'],
      ['한국에 가 본 적이 있어요. 비가 오는 것 같아요.', '적', '적/XSN', '적', 'NNB'],
    ] as const) {
      expect(units(text), text).toContain(unit);
      expect(word(text, surface), text).toMatchObject({ lemma, pos, content: true });
    }
    expect(word('사람 많은 게 싫어요.', '게').inflections).toEqual(['subject']);
  });

  it('reads 별로 and 어떻게 as the adverbs they are', () => {
    expect(units('오늘은 별로 안 바빠요.').slice(2, 4)).toEqual(['별/XSN', '로/JKB']);
    expect(word('오늘은 별로 안 바빠요.', '별로')).toMatchObject({ lemma: '별로', pos: 'MAG' });
    expect(units('이 책 어떻게 읽어요?').slice(2, 4)).toEqual(['어떻/VA', '게/EC']);
    expect(word('이 책 어떻게 읽어요?', '어떻게')).toMatchObject({ lemma: '어떻게', pos: 'MAG' });
    expect(word('이 책 어떻게 읽어요?', '어떻게').inflections).toBeUndefined();
    // 이리, which is the copula and an ending to ko-dic wherever the line does not open with it.
    expect(units('- 야! 어서 이리 와.').slice(4, 6)).toEqual(['이/VCP', '리/EP']);
    expect(word('- 야! 어서 이리 와.', '이리')).toMatchObject({ lemma: '이리', pos: 'MAG', content: true });
  });

  it('reads 한 before a counter as "one", and the counter as a counter', () => {
    expect(units('사과 3개와 커피 한 잔 주세요.').slice(5, 7)).toEqual(['한/XSA+ETM', '잔/VA+ETM']);
    expect(word('사과 3개와 커피 한 잔 주세요.', '한')).toMatchObject({ lemma: '한', pos: 'MM' });
    expect(word('사과 3개와 커피 한 잔 주세요.', '잔')).toMatchObject({ lemma: '잔', pos: 'NNBC' });
  });

  it('reads 한 before what was done as 하다, "did"', () => {
    expect(units('네가 한 짓을 봤어요.')[2]).toBe('한/XSA+ETM');
    expect(word('네가 한 짓을 봤어요.', '한')).toMatchObject({ lemma: '하다', inflections: ['past', 'modifier'] });
  });

  it('reads 가지 before a negative as 가다', () => {
    expect(units('가지 마')).toEqual(['가지/NNG', '마/VV+EC']);
    expect(word('가지 마', '가지')).toMatchObject({ lemma: '가다', parts: ['가', '지'], inflections: ['negative'] });
    expect(units('저는 학교에 가지 않아요.')[4]).toBe('가지/VX');
    expect(word('저는 학교에 가지 않아요.', '가지')).toMatchObject({ lemma: '가다', inflections: ['negative'] });
    // Before any other verb it is the noun ko-dic says.
    expect(units('가지 샀어?')[0]).toBe('가지/NNG');
    expect(word('가지 샀어?', '가지')).toMatchObject({ lemma: '가지', pos: 'NNG', content: true });
  });

  it('reads the noun after a modifier as a noun', () => {
    expect(units('수영할 줄 알아요?')[2]).toBe('줄/VV+ETM');
    expect(word('수영할 줄 알아요?', '줄')).toMatchObject({ lemma: '줄', pos: 'NNB' });
  });

  it('reads a noun and its particle as that, where a verb follows', () => {
    expect(units('네가 한 짓을 봤어요.').slice(3, 5)).toEqual(['짓/VV', '을/ETM']);
    expect(words('네가 한 짓을 봤어요.').slice(3, 5).map((t) => [t.surface, t.lemma, t.content])).toEqual([
      ['짓', '짓', true], ['을', '을', false],
    ]);
    // Before another modifier it is one itself: 먹을 남은 음식, food left to eat.
    expect(units('먹을 남은 음식이 없어요. 학교에 가요').slice(0, 4)).toEqual(['먹/VV', '을/ETM', '남/VV', '은/ETM']);
    expect(word('먹을 남은 음식이 없어요. 학교에 가요', '먹을')).toMatchObject({ lemma: '먹다', inflections: ['future', 'modifier'] });
  });
});

describe('네, which is "yes", "your" and "four"', () => {
  const your = { lemma: '너', pos: 'NP', content: true, parts: ['너', '의'], inflections: ['possessive'] };
  const yes = { lemma: '네', pos: 'IC', content: true };
  const four = { lemma: '네', pos: 'MM', content: true };

  it('is "your" before a noun in a sentence said plainly, where ko-dic says "yes"', () => {
    expect(units('네 이름도 몰라')[0]).toBe('네/IC');
    const t = word('네 이름도 몰라', '네');
    expect(t).toMatchObject(your);
    expect(keys(t)).toEqual(['너', '네']);
  });

  it('knows the noun and the verb where ko-dic has neither right', () => {
    // 거야 with an ending before it that nothing wrote, and 따를게 cut into 따를 and a noun.
    expect(units('네 거야')).toEqual(['네/IC', '거야/ETM+NNB+VCP+EC']);
    expect(word('네 거야', '네')).toMatchObject(your);
    expect(word('네 조언을 따를게. 걱정 마.', '네')).toMatchObject(your);
  });

  it('goes by its own sentence: "your" in a plain one, and "four" inside a clause of a polite one', () => {
    const text = '네 잘못이 아니니까. 제가 아는 네 사람이에요.';
    expect(units(text).filter((u) => u.startsWith('네'))).toEqual(['네/IC', '네/XSN']);
    // 아니니까 is not polite for ending in 니까, and with its full stop it is where the sentence ends.
    expect(word(text, '네')).toMatchObject(your);
    // 사람이에요 is polite, and a polite sentence has no "your" in it: four people.
    expect(word(text, '네', 1)).toMatchObject(four);
    expect(word(text, '네', 1).inflections).toBeUndefined();
  });

  it('is "yes" where a clause opens in a sentence said politely, though ko-dic says the suffix', () => {
    expect(units('- 네 감사합니다').slice(0, 3)).toEqual(['-/SY', '네/XSN', '감사/NNG']);
    const t = word('- 네 감사합니다', '네');
    expect(t).toMatchObject(yes);
    expect(t.inflections).toBeUndefined();
    expect(keys(t)).toEqual(['네']);
  });

  it('is "yes" before a noun that 하다 makes a verb, inside a polite sentence too', () => {
    // 그렇군요 ends a sentence with no mark, so to these rules 네 stands inside a clause.
    expect(units('아 그렇군요 네 감사합니다').slice(3)).toEqual(['네/XSN', '감사/NNG', '합니다/XSV+EC']);
    expect(word('아 그렇군요 네 감사합니다', '네')).toMatchObject(yes);
  });

  it('is "yes" after an interjection and after another 네, and before a noun where the line shows no verb', () => {
    expect(units('아 네 네 선생님')).toEqual(['아/IC', '네/XSN', '네/XSN', '선생/NNG', '님/XSN']);
    expect(words('아 네 네 선생님').slice(1, 3)).toMatchObject([yes, yes]);
  });

  it('is "yes" before a mark, and before a verb, however the sentence is said', () => {
    // 엄마 is a noun and 대답했다 is plain; the comma says it is no "your".
    expect(word('네, 엄마가 그랬어 하고 대답했다.', '네')).toMatchObject(yes);
  });

  it('is "yes" where the line breaks off mid-sentence, which may go on politely', () => {
    // As the segmenter asks: with a full stop the cue does not have, which is left out again.
    const asked = '네 오늘은 김치찌개를 만들고.';
    expect(units(asked).slice(-3)).toEqual(['만들/VV', '고/EC', './SF']);
    const t = koCueTokens('네 오늘은 김치찌개를 만들고', [raw(asked)]);
    expect(t.map((x) => x.surface).join('')).toBe('네 오늘은 김치찌개를 만들고');
    expect(t[0]).toMatchObject(yes);
    // With a full stop of its own the sentence has ended on 고, and plainly.
    expect(word(asked, '네')).toMatchObject(your);
  });

  it('reads a sentence through the dots of a pause, to an ending that closes it', () => {
    // 해야지 with no mark after it: 어야지 closes a sentence, where 어야 would leave it going.
    expect(units('네 숙제는... 해야지').slice(3)).toEqual(['.../SY', '해야지/VV+EC']);
    expect(word('네 숙제는... 해야지', '네')).toMatchObject(your);
    expect(word('네 숙제는... 해야지', '해야지')).toMatchObject({ lemma: '하다', inflections: ['must'] });
  });

  it('is "your" inside a clause, where ko-dic says a suffix — even where no verb shows', () => {
    expect(units('이건 네 거')).toEqual(['이건/NP+JX', '네/XSN', '거/NNB']);
    expect(word('이건 네 거', '네')).toMatchObject(your);
  });

  it('is the ending it is, written apart from its verb', () => {
    expect(units('맛있 네.')).toEqual(['맛있/VA', '네/EF', './SF']);
    expect(word('맛있 네.', '네')).toMatchObject({ lemma: '네', content: false, inflections: ['just noticed'] });
  });

  it('is "four" before a counter', () => {
    expect(units('아이 두 명이 고양이 네 마리를 키워.')[5]).toBe('네/XSN');
    expect(word('아이 두 명이 고양이 네 마리를 키워.', '네')).toMatchObject(four);
  });

  it('is "yes" on its own, since nothing says otherwise', () => {
    expect(mergeKorean([{ surface: '네', tag: 'XSN' }])).toMatchObject([yes]);
  });
});

describe('a word alone where a clause opens', () => {
  it('is a word, though ko-dic calls it the copula or an ending once a dash stands before it', () => {
    expect(units('- 야! 어서 이리 와.').slice(0, 4)).toEqual(['-/SY', '야/VCP+EF', '!/SF', '어서/EC']);
    expect(word('- 야! 어서 이리 와.', '야')).toMatchObject({ lemma: '야', content: true });
    expect(keys(word('- 야! 어서 이리 와.', '야'))).toEqual(['야']);
    const quick = word('- 야! 어서 이리 와.', '어서');
    expect(quick).toMatchObject({ lemma: '어서', content: true });
    expect(quick.inflections).toBeUndefined();
  });

  it('is a word where the line opens with it, too', () => {
    expect(units('만 원만 빌려 주세요')[0]).toBe('만/JX');
    expect(word('만 원만 빌려 주세요', '만')).toMatchObject({ lemma: '만', content: true });
  });

  it('is still a particle after a quotation', () => {
    expect(units('"어디 가니?" 라고 물었다.')[5]).toBe('라고/VCP+EC');
    expect(word('"어디 가니?" 라고 물었다.', '라고')).toMatchObject({ lemma: '이다', content: false, inflections: ['quoting'] });
  });

  it('is what ko-dic says where the line is not known', () => {
    expect(mergeKorean([{ surface: '어서', tag: 'EC' }])).toMatchObject([{ lemma: '어서', content: false }]);
  });
});

describe('verbs in 르, which double the ㄹ', () => {
  it('are the 르 verb where ko-dic cuts at the first ㄹ, with its verb as the second thing to look up', () => {
    // 몰 + 라서요: 몰다 "to drive", with an ending no verb takes.
    expect(units('사실 저희가 한국 음식은 잘 몰라서요').slice(-2)).toEqual(['몰/VV', '라서요/EC']);
    const t = word('사실 저희가 한국 음식은 잘 몰라서요', '몰라서요');
    expect(t).toMatchObject({ lemma: '모르다', pos: 'VV', content: true, parts: ['모르', '아서요'] });
    expect(t.inflections).toEqual(['because, or and then', 'polite']);
    expect(keys(t)).toEqual(['모르다', '몰다', '몰라서요']);
    // Where ko-dic has the form whole, there is nothing to add.
    expect(keys(word('네 이름도 몰라', '몰라'))).toEqual(['모르다', '몰라']);
  });

  it('are the 르 verb where ko-dic takes the first half for a noun', () => {
    // 달 "moon" and a copula that could not follow it: that would be 달이라서요.
    expect(units('달라서요')).toEqual(['달/NNG', '라서요/VCP+EC']);
    const t = only('달라서요');
    expect(t).toMatchObject({ lemma: '다르다', pos: 'VA', content: true, inflections: ['because, or and then', 'polite'] });
    expect(keys(t)).toEqual(['다르다', '달라서요']);
  });

  it('leave 놀라다, which has its 라 in the stem', () => {
    expect(units('깜짝 놀라요.').slice(1, 3)).toEqual(['놀/VV', '라요/EF']);
    const t = word('깜짝 놀라요.', '놀라요');
    expect(t).toMatchObject({ lemma: '놀라다', inflections: ['polite'] });
    expect(keys(t)).toEqual(['놀라다', '놀다', '놀라요']);
  });
});

describe('connectives', () => {
  it('are words where they open a clause, whatever ko-dic cut them into', () => {
    const text = '하지만 저는 운동은 잘 하지만 수영은 못해요.';
    expect(units(text).slice(0, 2)).toEqual(['하/VV', '지만/EC']);
    const but = word(text, '하지만');
    expect(but).toMatchObject({ lemma: '하지만', pos: 'MAJ', content: true, start: 0, end: 3 });
    expect(but.inflections).toBeUndefined();
    expect(keys(but)).toEqual(['하지만']);
    // After a mark as well: 그러다 + 어도, to ko-dic.
    expect(units('외로운데, 그래도 재미있었어요.')[3]).toBe('그래도/VV+EC');
    expect(word('외로운데, 그래도 재미있었어요.', '그래도')).toMatchObject({ lemma: '그래도', pos: 'MAJ', content: true });
  });

  it('are still the verb after its own words', () => {
    // 운동은 잘 하지만: "does it well, but".
    const does = word('하지만 저는 운동은 잘 하지만 수영은 못해요.', '하지만', 1);
    expect(does).toMatchObject({ lemma: '하다', pos: 'VV', inflections: ['but'] });
    expect(keys(does)).toEqual(['하다', '하지만']);
  });
});

describe('stems ko-dic gives as they sound', () => {
  it('puts back the ㄹ a stem drops', () => {
    expect(units('네 잘못이 아니니까. 제가 아는 네 사람이에요.').slice(8, 10)).toEqual(['아/VV', '는/ETM']);
    expect(word('네 잘못이 아니니까. 제가 아는 네 사람이에요.', '아는').lemma).toBe('알다');
  });

  it('takes 사는 for 살다, with 사다 still to look up', () => {
    const t = word('서울에 사는 친구가 예쁜 꽃을 샀어요.', '사는');
    expect(t.lemma).toBe('살다');
    expect(keys(t)).toEqual(['살다', '사다', '사는']);
    // 샀어요 has no ㄹ to have dropped.
    expect(word('서울에 사는 친구가 예쁜 꽃을 샀어요.', '샀어요').lemma).toBe('사다');
  });

  it('keeps 걸다 for 걸었어요, with 걷다 as the second thing to look up', () => {
    expect(units('어제 많이 걸었어요. 걸을 수 있어요.').slice(2, 6)).toEqual(['걸/VV', '었/EP', '어요/EF', './SF']);
    const t = word('어제 많이 걸었어요. 걸을 수 있어요.', '걸었어요');
    expect(t.lemma).toBe('걸다');
    expect(keys(t)).toEqual(['걸다', '걷다', '걸었어요']);
    expect(keys(word('"어디 가니?" 라고 물었다.', '물었다'))).toEqual(['물다', '묻다', '물었다']);
  });

  it('knows 걸을 is 걷다, since a stem in ㄹ takes no 으', () => {
    expect(units('어제 많이 걸었어요. 걸을 수 있어요.').slice(6, 8)).toEqual(['걸/VV', '을/ETM']);
    expect(keys(word('어제 많이 걸었어요. 걸을 수 있어요.', '걸을'))).toEqual(['걷다', '걸다', '걸을']);
    // Where ko-dic spells the stem out, there is nothing to add.
    expect(keys(word('걸으면 건강해져요. 그제야 깨달았어요.', '걸으면'))).toEqual(['걷다', '걸으면']);
  });

  it('knows a ㄹ form that is no verb of its own', () => {
    expect(keys(word('걸으면 건강해져요. 그제야 깨달았어요.', '깨달았어요'))).toEqual(['깨닫다', '깨달다', '깨달았어요']);
  });

  it('takes 물어 and 들어 with 보다 for asking and listening', () => {
    const asked = word('선생님들께 개인적으로 물어봤어요. 비공식적으로 만났어요.', '물어봤어요');
    expect(asked).toMatchObject({ lemma: '묻다', inflections: ['try doing', 'past', 'polite'] });
    expect(keys(asked)).toEqual(['묻다', '물다', '물어봤어요']);
    // Across a space too.
    const listen = word('한번 해보자! 잘 들어 봐.', '들어');
    expect(listen).toMatchObject({ lemma: '듣다', inflections: ['try doing'] });
    expect(keys(listen)).toEqual(['듣다', '들다', '들어']);
  });

  it('puts back the ㅅ a stem drops', () => {
    expect(keys(word('집을 지었어요. 이제 가야지.', '지었어요'))).toEqual(['짓다', '지다', '지었어요']);
  });
});

describe('forms said in more than one word', () => {
  it('are named on the verb, and the words stay apart', () => {
    for (const [text, surface, ...named] of [
      ['케이크를 먹고 싶어요.', '먹고', 'want to'],
      ['도서관에서 공부하고 있어요.', '공부하고', 'ongoing'],
      ['저는 학교에 가지 않아요.', '가지', 'negative'],
      ['만 원만 빌려 주세요', '빌려', 'please'],
      ['한국에 가 본 적이 있어요. 비가 오는 것 같아요.', '본', 'have done before'],
      ['한국에 가 본 적이 있어요. 비가 오는 것 같아요.', '오는', 'seems'],
      ['시간이 없기 때문에 못 가요.', '없기', 'because'],
      ['여기 앉아도 돼요? 들어가면 안 돼요.', '앉아도', 'may'],
      ['여기 앉아도 돼요? 들어가면 안 돼요.', '들어가면', 'must not'],
      ['언젠간 알게 될 거야.', '알게', 'come to'],
      ['언젠간 알게 될 거야.', '될', 'future or guess'],
      ['내일 갈 거야', '갈', 'future or guess'],
    ] as const) {
      expect(word(text, surface).inflections, `${surface} in ${text}`).toEqual(named);
    }
    expect(surfaces('어제 많이 걸었어요. 걸을 수 있어요.').slice(-3)).toEqual(['걸을', '수', '있어요']);
  });

  it('name 할 수 있다 as Japanese names its can-do form', () => {
    expect(word('어제 많이 걸었어요. 걸을 수 있어요.', '걸을').inflections).toEqual(['potential']);
  });

  it('leave a modifier that leans on nothing its own name', () => {
    expect(word('수영할 줄 알아요?', '수영할').inflections).toEqual(['future', 'modifier']);
  });
});

describe('where a sentence ends', () => {
  it('reads the last ending of a line as final, though ko-dic calls it a connective', () => {
    expect(units('가니')).toEqual(['가/VV', '니/EC']);
    expect(only('가니').inflections).toEqual(['question']);
  });

  it('reads an ending before a closing mark the same way', () => {
    expect(units('"어디 가니?" 라고 물었다.').slice(2, 5)).toEqual(['가/VV', '니/EC', '?"/SY']);
    expect(word('"어디 가니?" 라고 물었다.', '가니').inflections).toEqual(['question']);
  });

  it('cannot know it without the line', () => {
    // An eojeol on its own may be the middle of a sentence: 가니 좋다, "since".
    expect(mergeKorean(raw('가니')).map((t) => t.inflections)).toEqual([['because']]);
  });
});

describe('on the line', () => {
  it('keeps the spaces as tokens of their own', () => {
    const t = tokens('저는 학생이에요.');
    expect(t.map((x) => x.surface)).toEqual(['저', '는', ' ', '학생', '이에요', '.']);
    expect(t[2]).toEqual({ surface: ' ', start: 2, end: 3, punct: true });
    expect(t[4]).toMatchObject({ start: 5, end: 8 });
  });

  it('covers every line of the fixture, end to end and in order', () => {
    for (const text of Object.keys(LINES)) {
      const t = tokens(text);
      expect(t.map((x) => x.surface).join(''), text).toBe(text);
      let cursor = 0;
      for (const x of t) {
        expect(x.start, `${x.surface} in ${text}`).toBe(cursor);
        expect(text.slice(x.start, x.end)).toBe(x.surface);
        cursor = x.end;
      }
      // A space between words is the only thing no word or mark accounts for.
      for (const x of t) if (x.punct && x.pos === undefined) expect(x.surface, text).toMatch(/^\s+$/);
    }
  });

  it('gives every word to learn something to look up, with the tag of its head', () => {
    for (const text of Object.keys(LINES)) {
      for (const t of words(text).filter((x) => x.content)) {
        expect(t.lemma, `${t.surface} in ${text}`).toBeTruthy();
        expect(keys(t)[0], `${t.surface} in ${text}`).toBe(t.lemma);
        expect(t.lookup?.every((k) => k.pos === t.pos), `${t.surface} in ${text}`).toBe(true);
      }
    }
  });
});

describe('a cue', () => {
  /** A cue's tokens as the segmenter makes them, with the fixture answering for the analyser. */
  const cue = (text: string): Token[] => koCueTokens(text, koStretches(text).map((stretch) => raw(stretch.ask)));
  /** The tokens are the cue, end to end: each is the stretch of it that it says it is. */
  function isAllOf(text: string, t: Token[]): void {
    let cursor = 0;
    for (const x of t) {
      expect(x.start, `${x.surface} in ${JSON.stringify(text)}`).toBe(cursor);
      expect(text.slice(x.start, x.end), JSON.stringify(text)).toBe(x.surface);
      cursor = x.end;
    }
    expect(cursor, JSON.stringify(text)).toBe(text.length);
  }
  /** What each word is, wherever on the cue it stands. */
  const said = (t: Token[]): unknown[] =>
    t.filter((x) => !x.punct).map((x) => [x.surface, x.lemma, x.pos, x.content, x.inflections, x.lookup]);
  // 저, 는, 학생, 이에요 — as the analyser reads them with a full stop after.
  const student = said(tokens('저는 학생이에요.'));

  it('is asked of the analyser from its first letter to its last, on one line and ending in a full stop', () => {
    expect(koStretches('저는 학생이에요')).toEqual([{ start: 0, text: '저는 학생이에요', ask: '저는 학생이에요.' }]);
    // Its own last mark is where the full stop goes; what stands before and after it is left out.
    expect(koStretches('- "저는 학생이에요?"')).toEqual([{ start: 3, text: '저는 학생이에요?', ask: '저는 학생이에요.' }]);
    expect(koStretches('저는\n학생이에요')).toEqual([{ start: 0, text: '저는\n학생이에요', ask: '저는 학생이에요.' }]);
  });

  it('reads a line with no mark at its end as it reads with one, and leaves the full stop out', () => {
    const t = cue('저는 학생이에요');
    expect(said(t)).toEqual(student);
    expect(t.map((x) => x.surface)).toEqual(['저', '는', ' ', '학생', '이에요']);
    isAllOf('저는 학생이에요', t);
  });

  it('leaves a dash before the line out of what it asks, and keeps it as punctuation', () => {
    const t = cue('- 저는 학생이에요.');
    expect(t[0]).toEqual({ surface: '- ', start: 0, end: 2, punct: true });
    expect(said(t)).toEqual(student);
    expect(word('저는 학생이에요.', '학생')).toMatchObject({ start: 3, end: 5 });
    expect(t.find((x) => x.surface === '학생')).toMatchObject({ start: 5, end: 7 });
    isAllOf('- 저는 학생이에요.', t);
  });

  it('reads what stands in straight quotes or in brackets as a line of its own', () => {
    for (const text of ['"저는 학생이에요."', '(저는 학생이에요)']) {
      const t = cue(text);
      expect(said(t), text).toEqual(student);
      expect(t[0], text).toEqual({ surface: text[0], start: 0, end: 1, punct: true });
      expect(t.at(-1), text).toEqual({ surface: text.at(-1), start: text.length - 1, end: text.length, punct: true });
      isAllOf(text, t);
    }
    expect(cue('"저는 학생이에요."').map((x) => x.surface)).toEqual(['"', '저', '는', ' ', '학생', '이에요', '.', '"']);
  });

  it('reads the last word as a sentence\'s last, past a mark that ends none', () => {
    const t = cue('저는 학생이에요~');
    expect(said(t)).toEqual(student);
    expect(t.at(-1)).toEqual({ surface: '~', start: 8, end: 9, punct: true });
    isAllOf('저는 학생이에요~', t);
  });

  it('reads two speakers, a dash each, as two lines', () => {
    const text = '- 저는 학생이에요\n- 그건 제 책이 아니에요';
    expect(koStretches(text)).toEqual([
      { start: 2, text: '저는 학생이에요', ask: '저는 학생이에요.' },
      { start: 13, text: '그건 제 책이 아니에요', ask: '그건 제 책이 아니에요.' },
    ]);
    const t = cue(text);
    expect(said(t)).toEqual([...student, ...said(tokens('그건 제 책이 아니에요.'))]);
    // What stands between the two is one stretch of punctuation, line break and all.
    expect(t.find((x) => x.start === 10)).toEqual({ surface: '\n- ', start: 10, end: 13, punct: true });
    isAllOf(text, t);
  });

  it('reads one sentence over two lines as one sentence', () => {
    const t = cue('저는\n학생이에요');
    expect(said(t)).toEqual(student);
    expect(t[2]).toEqual({ surface: '\n', start: 2, end: 3, punct: true });
    isAllOf('저는\n학생이에요', t);
    // A line break before a dash is another speaker; before anything else it is the same one going on,
    // a line with a hyphen further along it too.
    expect(koStretches('저는\n- 학생이에요').map((stretch) => stretch.ask)).toEqual(['저는.', '학생이에요.']);
    expect(koStretches('서울에서\n부산-대구로').map((stretch) => stretch.ask)).toEqual(['서울에서 부산-대구로.']);
  });

  it('takes a no-break space and a wide one for the spaces they are', () => {
    for (const space of ['\u00a0', '\u3000']) {
      const text = `저는${space}학생이에요`;
      expect(koStretches(text)).toEqual([{ start: 0, text, ask: '저는 학생이에요.' }]);
      const t = cue(text);
      expect(said(t)).toEqual(student);
      expect(t[2]).toEqual({ surface: space, start: 2, end: 3, punct: true });
      isAllOf(text, t);
    }
  });

  it('gives a cue of nothing but marks back as punctuation, and an empty cue as nothing', () => {
    expect(koStretches('♪ ~ ♪')).toEqual([]);
    expect(cue('♪ ~ ♪')).toEqual([{ surface: '♪ ~ ♪', start: 0, end: 5, punct: true }]);
    expect(koStretches('')).toEqual([]);
    expect(cue('')).toEqual([]);
  });

  it('keeps the mark the cue itself ends on, where the full stop was asked', () => {
    const asked = '여기 앉아도 돼요? 들어가면 안 돼요.';
    const text = '여기 앉아도 돼요? 들어가면 안 돼요!';
    expect(koStretches(text)).toEqual([{ start: 0, text, ask: asked }]);
    const t = cue(text);
    expect(said(t)).toEqual(said(tokens(asked)));
    expect(t.at(-1)).toMatchObject({ surface: '!', pos: 'SF', punct: true, content: false });
    isAllOf(text, t);
    // And a cue that ends in a full stop of its own is read as the line it is.
    const line = '네 잘못이 아니니까. 제가 아는 네 사람이에요.';
    expect(cue(line)).toEqual(tokens(line));
  });

  it('keeps a comma after the last word in what it asks, where the sentence goes on', () => {
    expect(koStretches('가니,')).toEqual([{ start: 0, text: '가니,', ask: '가니,.' }]);
    expect(units('가니,.')).toEqual(['가/VV', '니/EC', ',/SC', './SF']);
    const t = cue('가니,');
    // 가니, "since": the same word is a question where the line just stops.
    expect(t[0]).toMatchObject({ surface: '가니', lemma: '가다', inflections: ['because'] });
    expect(only('가니').inflections).toEqual(['question']);
    expect(t.map((x) => x.surface)).toEqual(['가니', ',']);
    isAllOf('가니,', t);
  });

  it('loses no word when the analyser answers without the full stop, and none of the cue when it answers nothing', () => {
    const answer = raw('저는 학생이에요.');
    expect(answer.at(-1)).toEqual({ surface: '.', tag: 'SF' });
    expect(said(koCueTokens('저는 학생이에요', [answer.slice(0, -1)]))).toEqual(student);
    for (const answers of [[], [[]], [[{ surface: '뷁' }]]] as KoMorpheme[][][]) {
      isAllOf('- 저는 학생이에요.', koCueTokens('- 저는 학생이에요.', answers));
    }
  });
});

describe('the names of endings', () => {
  it('are all in KO_GRAMMAR_LABELS, for the interface to name in the learner\'s language', () => {
    // One missing from the list has no name in src/i18n/en/grammar.ts, and
    // would show in English in every language.
    for (const text of Object.keys(LINES)) {
      for (const label of tokens(text).flatMap((t) => t.inflections ?? [])) {
        expect(KO_GRAMMAR_LABELS, `${text}: ${label}`).toContain(label);
      }
      for (const label of raw(text).length ? mergeKorean(raw(text)).flatMap((t) => t.inflections) : []) {
        expect(KO_GRAMMAR_LABELS, `${text}: ${label}`).toContain(label);
      }
    }
    expect(new Set(KO_GRAMMAR_LABELS).size).toBe(KO_GRAMMAR_LABELS.length);
  });

  it('are the Japanese names wherever an ending does the same thing', () => {
    const shared = [
      'past', 'polite', 'negative', 'conditional', 'imperative', 'potential', 'passive', 'causative', 'hearsay', 'seems',
      'want to', 'intends to', 'must', 'must not', "don't have to", 'may', 'please', 'because', 'even though', 'while',
      'in order to', 'so that', 'ongoing', 'resulting state', 'try doing', 'do for someone', 'in advance',
      'completely, or regrettably', 'going forward', 'coming to be', 'keep on',
    ];
    expect(KO_GRAMMAR_LABELS).toEqual(expect.arrayContaining(shared));
    expect(GRAMMAR_LABELS).toEqual(expect.arrayContaining(shared));
    // And none of the names this module gave them before.
    for (const old of ['if', 'command', 'can', 'cannot', "don't", 'make or let', 'intending to', 'looks']) {
      expect(KO_GRAMMAR_LABELS).not.toContain(old);
    }
  });
});

describe('mergeKorean', () => {
  it('gives the words of one eojeol', () => {
    expect(mergeKorean(raw('갔어요'))).toEqual([{
      surface: '갔어요', lemma: '가다', pos: 'VV', content: true,
      parts: ['가', '았', '어요'], inflections: ['past', 'polite'],
      lookup: [{ key: '가다', pos: 'VV' }, { key: '갔어요', pos: 'VV' }],
    }]);
    expect(mergeKorean([])).toEqual([]);
  });

  it('applies what it can without the eojeol either side', () => {
    // 주세요 is never a name; 가지 is 가다 only before a negative, which it cannot see.
    expect(mergeKorean([{ surface: '주세요', tag: 'NNP' }])[0]).toMatchObject({ lemma: '주다' });
    expect(mergeKorean([{ surface: '가지', tag: 'NNG' }])[0]).toMatchObject({ lemma: '가지' });
  });
});

describe('what ko-dic does not know', () => {
  it('is a word to learn, as written', () => {
    expect(units('횐색 토끼의 증인\u200b은 많다.')[0]).toBe('횐색/UNKNOWN');
    expect(word('횐색 토끼의 증인\u200b은 많다.', '횐색')).toMatchObject({ lemma: '횐색', content: true });
    expect(keys(word('횐색 토끼의 증인\u200b은 많다.', '횐색'))).toEqual(['횐색']);
  });

  it('never throws, whatever it is given', () => {
    const odd: KoMorpheme[][] = [
      [{ surface: '뷁' }],
      [{ surface: '뷁', tag: 'ZZ' }, { surface: '어요', tag: 'EF' }],
      [{ surface: '갔', tag: 'VV+EP', type: 'Inflect', expression: '+/' }],
      [{ surface: '갔', tag: 'VV+EP', type: 'Inflect' }, { surface: '', tag: 'EF' }],
      [{ surface: '어요', tag: 'EF' }, { surface: '는', tag: 'JX' }, { surface: '하', tag: 'XSV' }, { surface: '들', tag: 'XSN' }],
      [{ surface: '한', tag: 'XSA+ETM', type: 'Inflect', expression: '하/XSA/*+ᆫ/ETM/*' }],
      [{ surface: '몰', tag: 'VV' }, { surface: '랐', tag: 'EP' }],
      [{ surface: '몰', tag: 'VV' }, { surface: '라', tag: 'EC' }],
      [{ surface: '비', tag: 'XPN' }],
      [{ surface: '', tag: '' }],
    ];
    for (const run of odd) {
      expect(() => mergeKorean(run)).not.toThrow();
      const text = run.map((m) => m.surface).join('');
      expect(() => koTokens(text, run)).not.toThrow();
      expect(() => koTokens(`${text} ${text}`, [...run, ...run])).not.toThrow();
    }
    // A tag never seen is a word to learn; a suffix or an ending with nothing before it is not lost.
    expect(mergeKorean(odd[1]!)[0]).toMatchObject({ surface: '뷁', lemma: '뷁', content: true });
    expect(mergeKorean(odd[4]!).map((t) => [t.surface, t.content])).toEqual([['어요', false], ['는', false], ['하', true], ['들', true]]);
    expect(koTokens('', [])).toEqual([]);
    // What the analyser gives that is not on the line is left out; the line is still all there.
    expect(koTokens('가', [{ surface: '나', tag: 'NP' }]).map((t) => t.surface).join('')).toBe('가');
  });
});
