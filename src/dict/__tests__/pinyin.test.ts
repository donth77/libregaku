import { describe, expect, it } from 'vitest';
import { foldPinyin, toneMarks } from '../pinyin';

/**
 * Every reading below is one CC-CEDICT has, written as it writes it. The
 * whole file was run through toneMarks once, against a table of finals: 2,443
 * different syllables, none marked on the wrong letter.
 */

describe('toneMarks', () => {
  it('marks each syllable and leaves them a space apart', () => {
    expect(toneMarks('xue2 xiao4')).toBe('xué xiào');
    expect(toneMarks('wei4 shen2 me5')).toBe('wèi shén me');
    // The overlay puts one syllable over each character by splitting on the space.
    expect(toneMarks('yi1 bu4 zuo4 , er4 bu4 xiu1').split(' ')).toHaveLength(7);
  });

  it('puts the mark on a, else e, else the o of ou, else the last vowel', () => {
    const SYLLABLES: Array<[string, string]> = [
      ['hao3', 'hǎo'], ['jia1', 'jiā'], ['kuai4', 'kuài'], ['yuan2', 'yuán'], ['xiang3', 'xiǎng'],
      ['xue2', 'xué'], ['lei4', 'lèi'], ['jie3', 'jiě'], ['er4', 'èr'], ['leng3', 'lěng'],
      ['gou3', 'gǒu'], ['zhou1', 'zhōu'],
      ['gui4', 'guì'], ['liu2', 'liú'], ['duo1', 'duō'], ['xiong2', 'xióng'], ['qun2', 'qún'],
      ['zhi1', 'zhī'], ['bu4', 'bù'], ['o2', 'ó'], ['yo1', 'yō'],
    ];
    for (const [numbered, marked] of SYLLABLES) expect(toneMarks(numbered), numbered).toBe(marked);
  });

  it('writes u: as ü, and v too', () => {
    expect(toneMarks('lu:4')).toBe('lǜ');
    expect(toneMarks('nu:3')).toBe('nǚ');
    expect(toneMarks('lu:e4')).toBe('lüè');
    expect(toneMarks('nu:e4')).toBe('nüè');
    expect(toneMarks('lu:2')).toBe('lǘ');
    expect(toneMarks('lv4 se4')).toBe('lǜ sè');
    expect(toneMarks('nv3')).toBe('nǚ');
  });

  it('leaves the fifth tone, the neutral one, bare', () => {
    expect(toneMarks('dong1 xi5')).toBe('dōng xi');
    expect(toneMarks('de5')).toBe('de');
    expect(toneMarks('nu:5')).toBe('nü');
    // No number at all: nothing to mark.
    expect(toneMarks('ma')).toBe('ma');
  });

  it('keeps the capital of a name', () => {
    expect(toneMarks('Zhong1 guo2')).toBe('Zhōng guó');
    expect(toneMarks('E2')).toBe('É');
    expect(toneMarks('A1 la1 bo2')).toBe('Ā lā bó');
    expect(toneMarks('Ou1 zhou1')).toBe('Ōu zhōu');
    expect(toneMarks('Lu:3 liang2')).toBe('Lǚ liáng');
    expect(toneMarks('Bo5 bo5 mi3')).toBe('Bo bo mǐ');
  });

  it('reads 兒 after its word as a bare r', () => {
    expect(toneMarks('yi1 xia4 r5')).toBe('yī xià r');
  });

  it('marks the m or n of a syllable with no vowel', () => {
    expect(toneMarks('m2')).toBe('ḿ');           // 呣
    expect(toneMarks('m4')).toBe('m\u0300');      // 呣: no single character for it
    expect(toneMarks('m1 ma1')).toBe('m\u0304 mā');   // 姆媽
    expect(toneMarks('ng4')).toBe('ǹg');
    expect(toneMarks('n2')).toBe('ń');
    expect(toneMarks('hng5')).toBe('hng');        // 哼
    expect(toneMarks('hm5')).toBe('hm');          // 噷
  });

  it('marks two syllables written as one', () => {
    // 兙, one character read as two syllables, and a note that writes a word together.
    expect(toneMarks('shi2ke4')).toBe('shíkè');
    expect(toneMarks('shang4zai4')).toBe('shàngzài');
    expect(toneMarks('yi1mo2-yi1yang4')).toBe('yīmó-yīyàng');
  });

  it('leaves alone whatever is not a numbered syllable', () => {
    expect(toneMarks('AA zhi4')).toBe('AA zhì');                       // AA制
    expect(toneMarks('san1 D da3 yin4')).toBe('sān D dǎ yìn');         // 3D打印
    expect(toneMarks('11 Qu1')).toBe('11 Qū');                         // 11區
    expect(toneMarks('Ya4 dang1 · Si1 mi4')).toBe('Yà dāng · Sī mì');  // 亞當·斯密
    expect(toneMarks('t o n y lao3 shi1')).toBe('t o n y lǎo shī');    // Tony老師
    expect(toneMarks('da3 call')).toBe('dǎ call');                     // 打call
    expect(toneMarks('mei2 sei le5')).toBe('méi sei le');              // 沒sei了
    // What the file writes where a headword has no reading: 々.
    expect(toneMarks('xx5')).toBe('xx5');
    expect(toneMarks('MP3')).toBe('MP3');
    expect(toneMarks('')).toBe('');
  });

  it('writes one composed character where there is one', () => {
    for (const s of ['lu:4', 'nu:3', 'hao3', 'E2', 'm2', 'ng4']) {
      const marked = toneMarks(s);
      expect(marked, s).toBe(marked.normalize('NFC'));
    }
    expect([...toneMarks('lu:4')]).toHaveLength(2);
  });

  it('does nothing to pinyin already marked', () => {
    expect(toneMarks('xué xiào')).toBe('xué xiào');
    expect(toneMarks(toneMarks('lu:e4 you3'))).toBe('lüè yǒu');
  });
});

describe('foldPinyin', () => {
  it('drops capitals and spaces', () => {
    expect(foldPinyin('Zhōng guó')).toBe('zhōngguó');
    expect(foldPinyin('É')).toBe('é');
  });

  it('keeps the tones, which tell words apart', () => {
    expect(foldPinyin('dōng xi')).not.toBe(foldPinyin('dōng xī'));
    expect(foldPinyin('hái')).not.toBe(foldPinyin('huán'));
  });

  it('reads numbered pinyin as the same spelling', () => {
    expect(foldPinyin('dong1 xi5')).toBe(foldPinyin('dōng xi'));
    expect(foldPinyin('Lu:3 liang2')).toBe('lǚliáng');
  });

  it('reads a mark written as a separate character as the same spelling', () => {
    expect(foldPinyin('xue\u0301')).toBe(foldPinyin('xué'));
  });
});
