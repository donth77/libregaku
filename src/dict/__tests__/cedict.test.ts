import { describe, expect, it } from 'vitest';
import { defaultReading, keysFor, parseLine, rank, toEntry, type CedictHint } from '../cedict';
import type { Entry } from '../jmdict';
import { DEFAULT_READINGS } from '../zh-readings';

/**
 * Lines copied from CC-CEDICT (10 October 2026), in the file's order, under a
 * piece of its header. For each word tested, every entry written that way is
 * here, in either script, so rank() chooses among the candidates the store
 * would hand it.
 */
const SAMPLE = String.raw`
# CC-CEDICT
# Community maintained free Chinese-English dictionary.
#! version=1
#! entries=125251
110 110 [yao1 yao1 ling2] /the emergency number for law enforcement in Mainland China and Taiwan/
3D打印 3D打印 [san1 D da3 yin4] /to 3D print; 3D printing/
AA制 AA制 [AA zhi4] /to split the bill; to go Dutch/
々 々 [xx5] /iteration mark indicating repetition of the preceding character in horizontal writing (rare in modern Chinese)/
ㄏㄤ ㄏㄤ [hang1] /(Tw) (slang) popular; hot (from Taiwanese 烘, Tai-lo pr. [hang])/
一下兒 一下儿 [yi1 xia4 r5] /erhua form of 一下[yi1 xia4]/
一不做，二不休 一不做，二不休 [yi1 bu4 zuo4 , er4 bu4 xiu1] /lit. either don't do it, or don't rest (idiom)/fig. if you do it at all, you may as well go the whole hog/in for a penny, in for a pound/
三牲 三牲 [san1 sheng1] /the three sacrificial animals (originally cow, sheep and pig; later pig, chicken and fish)/
中 中 [Zhong1] /(bound form) China; Chinese/surname Zhong/
中 中 [zhong1] /within; among; in/middle; center/while (doing sth); during/(dialect) OK; all right/
中 中 [zhong4] /to hit (a target)/to be struck by (a bullet, illness etc)/to win (a prize or lottery)/
中括號 中括号 [zhong1 kuo4 hao4] /square brackets [ ]/
乹 乾 [qian2] /old variant of 乾[qian2]/
乾 乾 [Qian2] /surname Qian/
乾 乾 [qian2] /one of the Eight Trigrams 八卦[ba1 gua4], symbolizing heaven/male principle/☰/ancient Chinese compass point: 315° (northwest)/
乾 干 [Gan1] /surname Gan/
乾 干 [gan1] /dry/dried food/empty; hollow/taken in to nominal kinship; adoptive; foster/futile; in vain/(dialect) rude; blunt/(dialect) to cold-shoulder/
亁 乾 [qian2] /variant of 乾[qian2]/
了 了 [le5] /(completed action marker)/(modal particle indicating change of state, situation now)/(modal particle intensifying preceding clause)/
了 了 [liao3] /to finish/(used with 得[de2] or 不[bu4] after a verb to express (im)possibility, as in 忘不了[wang4 bu5 liao3] "cannot forget")/(literary) (usually followed by a negative such as 無|无[wu2] or 不[bu4]) completely (not); entirely (not); (not) in the least/variant of 瞭|了[liao3]/
亞當·斯密 亚当·斯密 [Ya4 dang1 · Si1 mi4] /Adam Smith (1723-1790), Scottish ethical philosopher and pioneer economist, author of The Wealth of Nations 國富論|国富论/
人 人 [ren2] /person; people/CL:個|个[ge4],位[wei4],名[ming2]/
兒 儿 [er2] /child/son/
兒 儿 [r5] /non-syllabic diminutive suffix/retroflex final/
兙 兙 [shi2ke4] /(old) contracted variant of 十克[shi2 ke4]/
呂梁 吕梁 [Lu:3 liang2] /see 呂梁市|吕梁市[Lu : 3 liang2 Shi4]/
告訴 告诉 [gao4 su4] /to press charges; to file a complaint/
告訴 告诉 [gao4 su5] /to tell; to inform; to let know/
哪 哪 [na3] /how/which/
哪 哪 [na5] /(emphatic sentence-final particle, used instead of 啊[a5] after a word ending in "n")/
哪 哪 [ne2] /used in 哪吒[Ne2 zha1]/Taiwan pr. [nuo2]/
哪 哪 [nei3] /which? (interrogative, followed by classifier or numeral-classifier)/
地 地 [de5] /-ly/structural particle: used before a verb or adjective, linking it to preceding modifying adverbial adjunct/
地 地 [di4] /earth/ground/field/place/land/CL:片[pian4]/
垃圾 垃圾 [la1 ji1] /trash/refuse/garbage/(coll.) of poor quality/Taiwan pr. [le4 se4]/
大漢 大汉 [Da4 han4] /Han Dynasty/
大漢 大汉 [da4 han4] /burly fellow/
女 女 [nu:3] /female/woman/daughter/
女 女 [ru3] /old variant of 汝[ru3]/
女人 女人 [nu:3 ren2] /woman/
女人 女人 [nu:3 ren5] /wife/
妳 你 [ni3] /you (Note: In Taiwan, 妳 is used to address females, but in mainland China, it is not commonly used. Instead, 你 is used to address both males and females.)/
妳 奶 [nai3] /variant of 嬭|奶[nai3]/
學校 学校 [xue2 xiao4] /school/CL:所[suo3]/
年 年 [Nian2] /surname Nian/
年 年 [nian2] /year/CL:個|个[ge4]/
得 得 [de2] /to obtain/to get/to gain/to catch (a disease)/proper/suitable/proud/contented/to allow/to permit/ready/finished/
得 得 [de4] /used in 得瑟[de4 se5]/
得 得 [de5] /structural particle: used after a verb (or adjective as main verb), linking it to following phrase indicating effect, degree, possibility etc/
得 得 [dei3] /to have to/must/ought to/to need to/
復明 复明 [fu4 Ming2] /to restore the Ming dynasty/
復明 复明 [fu4 ming2] /to regain one's eyesight/(astronomy) emersion/
敲開 敲开 [qiao1 kai1] /to get sth open by tapping or striking it/(figuratively, when followed by sth like ∼的大門|∼的大门[xx5 de5 da4 men2]) to open the door to ~/to gain access to ~/
東方 东方 [Dong1 fang1] /the East; the Orient/two-character surname Dongfang/
東方 东方 [dong1 fang1] /east/
東西 东西 [dong1 xi1] /east and west/
東西 东西 [dong1 xi5] /thing/stuff/person/CL:個|个[ge4],件[jian4]/
沒 没 [mei2] /(negative prefix for verbs) have not; not/
沒 没 [mo4] /drowned/to end/to die/to inundate/
為 为 [wei2] /as (in the capacity of)/to take sth as/to act as/to serve as/to behave as/to become/to be/to do/by (in the passive voice)/
為 为 [wei4] /because of/for/to/
爲 为 [wei2] /variant of 為|为[wei2]/
爲 为 [wei4] /variant of 為|为[wei4]/
的 的 [de5] /of; ~'s (possessive particle)/(used after an attribute when it modifies a noun)/(used at the end of a declarative sentence for emphasis)/(used after a noun, verb or adjective to form a nominal expression, as in 皮革的[pi2 ge2 de5] "one made of leather" or 跑堂兒的|跑堂儿的[pao3 tang2 r5 de5] "a waiter (literally, one who runs back and forth in a restaurant)" or 新的[xin1 de5] "new one")/also pr. [di4] or [di5] in poetry and songs/
的 的 [di1] /(bound form) a taxi; a cab (abbr. for 的士[di1 shi4])/
的 的 [di2] /really and truly/
的 的 [di4] /(bound form) bull's-eye; target/
着 着 [zhao1] /variant of 著|着[zhao1]/
着 着 [zhao2] /variant of 著|着[zhao2]/
着 着 [zhe5] /variant of 著|着[zhe5]/
着 着 [zhuo2] /variant of 著|着[zhuo2]/
瞭 了 [liao3] /(bound form) clear in one's mind; to understand clearly/
瞭 了 [liao4] /unofficial variant of 瞭[liao4]/
秊 年 [nian2] /grain/harvest (old)/variant of 年[nian2]/
而言 而言 [er2 yan2] /(typically preceded by 就…[jiu4 xx5] or 對…|对…[dui4 xx5] etc) as far as ... is concerned; speaking in terms of .../
臟 脏 [zang4] /viscera/(anatomy) organ/
著 着 [zhao1] /a move in chess (Taiwan pr. [zhuo2])/trick; tactic/(dialect) okay; all right/(dialect) to put in; to add/
著 着 [zhao2] /to touch/to come in contact with/to feel/to be affected by/to catch fire/to burn/(coll.) to fall asleep/(after a verb) hitting the mark/succeeding in/
著 着 [zhe5] /aspect particle indicating action in progress or ongoing state/
著 着 [zhuo2] /to wear (clothes)/to contact/to use/to apply/
著 著 [zhu4] /to make known/to show/to prove/to write/book/outstanding/
著 著 [zhuo2] /used in 執著|执著[zhi2 zhuo2]/
蝴 蝴 [hu2] /used in 蝴蝶[hu2 die2]/
行 行 [hang2] /(bound form) row; line/(bound form) line of business; trade; profession/(bound form) commercial firm/(bound form) to rank (first, second etc) among one's siblings (by age)/(in data tables) row; (Tw) column/classifier for rows or lines/
行 行 [heng2] /used in 道行[dao4 heng2]/
行 行 [xing2] /(bound form) to walk; to go; to travel/(literary) trip; journey; visit/(bound form) temporary; makeshift/(bound form) current; in circulation/(bound form) to do; to perform/capable; competent/all right; OK!; will do/behavior; conduct (Taiwan pr. [xing4])/(literary) about to; soon/
說 说 [shui4] /to persuade/
說 说 [shuo1] /to speak; to talk; to say/to explain; to comment/to scold; to tell off/(bound form) theory; doctrine/
説 说 [shuo1] /variant of 說|说[shuo1]/
過 过 [Guo1] /surname Guo/
過 过 [guo4] /to cross/to go over/to pass (time)/to celebrate (a holiday)/to live/to get along/excessively/too-/
過 过 [guo5] /(experienced action marker)/
過來 过来 [guo4 lai2] /to come over/to manage/to handle/to be able to take care of/
過來 过来 [guo4 lai5] /see 過來|过来[guo4 lai2]/
還 还 [Huan2] /surname Huan/
還 还 [hai2] /still/still in progress/still more/yet/even more/in addition/fairly/passably (good)/as early as/even/also/else/
還 还 [huan2] /to pay back/to return/
那 那 [Na1] /surname Na/
那 那 [Nuo2] /surname Nuo/
那 那 [na3] /variant of 哪[na3]/
那 那 [na4] /(specifier) that; the; those (colloquial pr. [nei4])/(pronoun) that (referring to persons, things or situations)/then (in that case)/
那 那 [nuo2] /(archaic) many/beautiful/how/old variant of 挪[nuo2]/
長 长 [chang2] /long/(bound form) length/(bound form) strong point; forte/(bound form) to be good at/(literary) surplus; spare (Taiwan pr. [zhang4])/
長 长 [zhang3] /chief/head/elder/to grow/to develop/to increase/to enhance/
雨 雨 [yu3] /rain/CL:陣|阵[zhen4],場|场[chang2]/
雨 雨 [yu4] /(literary) to rain/(of rain, snow etc) to fall/to precipitate/to wet/
髒 脏 [zang1] /dirty/filthy/to get (sth) dirty/
𰻞𰻞麵 𰻝𰻝面 [biang2 biang2 mian4] /broad, belt-shaped noodles, popular in Shaanxi/
`;

// As the file has them: \r\n between lines, and nothing after the last.
const FILE = SAMPLE.trim().split('\n').join('\r\n');
const LINES = FILE.split('\n');

const byKey = new Map<string, Entry[]>();
LINES.forEach((line, i) => {
  const row = parseLine(line);
  if (!row) return;
  const entry = toEntry(row, String(i + 1));   // ids are line numbers
  for (const key of keysFor(row)) byKey.set(key, [...(byKey.get(key) ?? []), entry]);
});

const found = (key: string): Entry[] => byKey.get(key) ?? [];
const top = (key: string, hint?: CedictHint): Entry | undefined => rank(found(key), key, hint)[0];
const glosses = (e?: Entry): string[] => e?.senses.flatMap((s) => s.glosses) ?? [];
/** The row of the one line that starts this way. */
const row = (start: string) => parseLine(LINES.find((l) => l.startsWith(start)) ?? '')!;
const entry = (start: string): Entry => toEntry(row(start), '1');

describe('parseLine', () => {
  it('reads both forms, the pinyin as written, and the glosses', () => {
    expect(parseLine('學校 学校 [xue2 xiao4] /school/CL:所[suo3]/')).toEqual({
      traditional: '學校',
      simplified: '学校',
      pinyin: 'xue2 xiao4',
      glosses: ['school', 'CL:所[suo3]'],
    });
  });

  it('takes a line with its \\r\\n or without', () => {
    expect(parseLine('學校 学校 [xue2 xiao4] /school/CL:所[suo3]/\r')?.glosses).toEqual(['school', 'CL:所[suo3]']);
    expect(parseLine('學校 学校 [xue2 xiao4] /school/CL:所[suo3]/\r\n')?.simplified).toBe('学校');
    // The file's last line ends with neither.
    expect(LINES.at(-1)?.endsWith('/')).toBe(true);
    expect(parseLine(LINES.at(-1) ?? '')?.pinyin).toBe('biang2 biang2 mian4');
  });

  it('is null for comments and anything else', () => {
    expect(parseLine('# CC-CEDICT')).toBeNull();
    expect(parseLine('#! entries=125251\r')).toBeNull();
    expect(parseLine('')).toBeNull();
    expect(parseLine('\r')).toBeNull();
    expect(parseLine('學校 学校 xue2 xiao4 /school/')).toBeNull();
    expect(parseLine('學校 学校 [xue2 xiao4]')).toBeNull();
    expect(parseLine('學校 学校 [xue2 xiao4] //')).toBeNull();
  });

  it('finds every entry in the sample, and nothing in its header', () => {
    expect(LINES.filter((l) => parseLine(l)).length).toBe(LINES.length - 4);
  });

  it('reads headwords that are not Chinese characters', () => {
    expect(row('110 ')).toMatchObject({ traditional: '110', simplified: '110', pinyin: 'yao1 yao1 ling2' });
    expect(row('AA制')).toMatchObject({ simplified: 'AA制', pinyin: 'AA zhi4' });
    expect(row('3D打印')).toMatchObject({ simplified: '3D打印', pinyin: 'san1 D da3 yin4' });
    expect(row('亞當·斯密')).toMatchObject({ simplified: '亚当·斯密', pinyin: 'Ya4 dang1 · Si1 mi4' });
    expect(row('ㄏㄤ')).toMatchObject({ simplified: 'ㄏㄤ', pinyin: 'hang1' });
    // Outside the sixteen-bit characters: two code units each in a JavaScript string.
    expect(row('𰻞𰻞麵')).toMatchObject({ traditional: '𰻞𰻞麵', simplified: '𰻝𰻝面' });
  });

  it('leaves u: as the file has it', () => {
    expect(row('女 女 [nu:3]').pinyin).toBe('nu:3');
  });
});

describe('toEntry', () => {
  it('stores the entry under its simplified form, the traditional one beside it', () => {
    expect(toEntry(row('學校'), '31752')).toEqual({
      id: '31752',
      word: '学校',
      alt: '學校',
      reading: 'xué xiào',
      common: false,
      senses: [
        { pos: [], glosses: ['school'] },
        { pos: [], glosses: ['classifier: 所 [suǒ]'] },
      ],
    });
  });

  it('has no second form when both scripts write the word the same', () => {
    expect(entry('人 ')).not.toHaveProperty('alt');
    expect(entry('人 ').word).toBe('人');
  });

  it('writes the reading with tone marks, a syllable to a character', () => {
    expect(entry('女 女 [nu:3]').reading).toBe('nǚ');
    expect(entry('呂梁').reading).toBe('Lǚ liáng');
    expect(entry('一下兒').reading).toBe('yī xià r');
    expect(entry('一不做，二不休').reading).toBe('yī bù zuò , èr bù xiū');
    expect(entry('兙').reading).toBe('shíkè');
    expect(entry('AA制').reading).toBe('AA zhì');
    expect(entry('亞當·斯密').reading).toBe('Yà dāng · Sī mì');
  });

  it('gives no reading where the file has none', () => {
    expect(row('々').pinyin).toBe('xx5');
    expect(entry('々')).not.toHaveProperty('reading');
  });

  it('makes a sense of each gloss, holding the meanings it gives', () => {
    // Slashes between meanings, as the file used to write them.
    expect(entry('東西 东西 [dong1 xi5]').senses).toEqual([
      { pos: [], glosses: ['thing'] },
      { pos: [], glosses: ['stuff'] },
      { pos: [], glosses: ['person'] },
      { pos: [], glosses: ['classifier: 個|个 [gè], 件 [jiàn]'] },
    ]);
    // Semicolons within a sense, as it writes them now.
    expect(entry('告訴 告诉 [gao4 su5]').senses).toEqual([{ pos: [], glosses: ['to tell', 'to inform', 'to let know'] }]);
    expect(entry('說 说 [shuo1]').senses.map((s) => s.glosses)).toEqual([
      ['to speak', 'to talk', 'to say'],
      ['to explain', 'to comment'],
      ['to scold', 'to tell off'],
      ['(bound form) theory', 'doctrine'],
    ]);
  });

  it('keeps a remark in brackets whole, semicolon and all', () => {
    expect(glosses(entry('三牲'))).toEqual([
      'the three sacrificial animals (originally cow, sheep and pig; later pig, chicken and fish)',
    ]);
  });
});

describe('keysFor', () => {
  it('indexes an entry under both forms', () => {
    expect(keysFor(row('學校'))).toEqual(['学校', '學校']);
  });

  it('gives one key when the forms are the same', () => {
    expect(keysFor(row('人 '))).toEqual(['人']);
  });
});

describe('toEntry — glosses that name other words', () => {
  it('writes out classifiers, with tone marks and room between them', () => {
    expect(glosses(entry('人 '))[2]).toBe('classifier: 個|个 [gè], 位 [wèi], 名 [míng]');
    expect(glosses(entry('雨 雨 [yu3]'))).toEqual(['rain', 'classifier: 陣|阵 [zhèn], 場|场 [cháng]']);
  });

  it('gives a word it points to its tone marks', () => {
    expect(glosses(entry('説'))).toEqual(['variant of 說|说 [shuō]']);
    expect(glosses(entry('蝴'))).toEqual(['used in 蝴蝶 [hú dié]']);
    expect(glosses(entry('過來 过来 [guo4 lai5]'))).toEqual(['see 過來|过来 [guò lái]']);
    expect(glosses(entry('的 的 [di1]'))).toEqual(['(bound form) a taxi', 'a cab (abbr. for 的士 [dī shì])']);
  });

  it('marks a reading that stands by itself', () => {
    expect(glosses(entry('垃圾')).at(-1)).toBe('Taiwan pr. [lè sè]');
    expect(glosses(entry('那 那 [na4]'))[0]).toBe('(specifier) that');
    expect(glosses(entry('那 那 [na4]'))[2]).toBe('those (colloquial pr. [nèi])');
  });

  it('mends the colon the file sometimes parts from its u', () => {
    expect(row('呂梁').glosses).toEqual(['see 呂梁市|吕梁市[Lu : 3 liang2 Shi4]']);
    expect(glosses(entry('呂梁'))).toEqual(['see 呂梁市|吕梁市 [Lǚ liáng Shì]']);
  });

  it('writes … for a syllable the file leaves open', () => {
    expect(glosses(entry('而言'))[0]).toBe('(typically preceded by 就… [jiù …] or 對…|对… [duì …] etc) as far as ... is concerned');
  });

  it('leaves alone brackets that hold no pinyin', () => {
    expect(glosses(entry('中括號'))).toEqual(['square brackets [ ]']);
    expect(glosses(entry('ㄏㄤ')).at(-1)).toBe('hot (from Taiwanese 烘, Tai-lo pr. [hang])');
  });

  it('leaves no numbered pinyin and no CL: anywhere in the sample', () => {
    for (const entries of byKey.values()) {
      for (const g of entries.flatMap(glosses)) expect(g).not.toMatch(/[a-z:][1-5]\b|CL:/);
    }
  });
});

describe('rank — the script asked for', () => {
  it('heads an entry reached by its traditional form with that form', () => {
    expect(top('東西')).toMatchObject({ word: '東西', alt: '东西', reading: 'dōng xi' });
    expect(top('东西')).toMatchObject({ word: '东西', alt: '東西', reading: 'dōng xi' });
  });

  it('names other words in the same script', () => {
    expect(glosses(top('東西')).at(-1)).toBe('classifier: 個 [gè], 件 [jiàn]');
    expect(glosses(top('东西')).at(-1)).toBe('classifier: 个 [gè], 件 [jiàn]');
    expect(glosses(top('説'))).toEqual(['variant of 說 [shuō]']);
    expect(glosses(rank(found('过来'), '过来')[1])).toEqual(['see 过来 [guò lái]']);
    expect(glosses(top('而言'))[0]).toContain('or 对… [duì …] etc');
  });

  it('reads a word both scripts write the same in simplified, unless told', () => {
    expect(glosses(top('人')).at(-1)).toBe('classifier: 个 [gè], 位 [wèi], 名 [míng]');
    expect(glosses(top('人', { traditional: true })).at(-1)).toBe('classifier: 個 [gè], 位 [wèi], 名 [míng]');
    // Told or not, the form looked up says which script an entry with two is in.
    expect(glosses(top('东西', { traditional: true })).at(-1)).toBe('classifier: 个 [gè], 件 [jiàn]');
  });

  it('heads each entry with the form looked up, whatever its other form', () => {
    // Taiwan's 妳 is the traditional form of two simplified words.
    expect(rank(found('妳'), '妳').map((e) => [e.word, e.alt, e.reading])).toEqual([
      ['妳', '你', 'nǐ'],
      ['妳', '奶', 'nǎi'],
    ]);
    // 乾 is the traditional form of 干, "dry", and a word of its own, the trigram.
    expect(rank(found('乾'), '乾').map((e) => [e.word, e.alt])).toEqual([
      ['乾', '干'], ['乾', '干'], ['乾', undefined], ['乾', '乹'], ['乾', '亁'], ['乾', undefined],
    ]);
  });

  it('never touches what is stored', () => {
    const stored = found('東西');
    const before = structuredClone(stored);
    const ranked = rank(stored, '東西');
    expect(stored).toEqual(before);
    expect(stored).not.toContain(ranked[0]);
  });
});

describe('rank — in turn', () => {
  it('1. puts the reading asked for first', () => {
    expect(top('还')?.reading).toBe('hái');
    expect(top('还', { reading: 'huán' })).toMatchObject({ reading: 'huán', senses: [{ glosses: ['to pay back'] }, { glosses: ['to return'] }] });
    // However it is written: numbered, or with the capital of the surname.
    expect(top('还', { reading: 'huan2' })?.reading).toBe('huán');
    expect(top('还', { reading: 'Huán' })?.reading).toBe('huán');
    expect(top('东西', { reading: 'dōng xī' })?.senses[0]?.glosses).toEqual(['east and west']);
  });

  it('1. falls to the other steps when no entry reads that way', () => {
    expect(top('还', { reading: 'fēi' })?.reading).toBe('hái');
  });

  it('2. puts a character’s usual reading first', () => {
    // liǎo has the most meanings of 了's entries, and is not how the word is read.
    expect(rank(found('了'), '了').map((e) => e.reading)).toEqual(['le', 'liǎo', 'liǎo', 'liào']);
    expect(top('的')?.reading).toBe('de');
    // Both entries read zhe come first; the one with a meaning leads them.
    expect(rank(found('着'), '着').slice(0, 2).map((e) => glosses(e)[0])).toEqual([
      'aspect particle indicating action in progress or ongoing state',
      'variant of 着 [zhe]',
    ]);
  });

  it('3. puts an everyday word before a proper name', () => {
    expect(rank(found('中'), '中').map((e) => e.reading)).toEqual(['zhōng', 'Zhōng', 'zhòng']);
    expect(rank(found('东方'), '东方').map((e) => e.reading)).toEqual(['dōng fāng', 'Dōng fāng']);
    expect(rank(found('大汉'), '大汉').map((e) => e.reading)).toEqual(['dà hàn', 'Dà hàn']);
    // The capital may be on any syllable: 復明 is to restore the Ming.
    expect(top('复明')).toMatchObject({ reading: 'fù míng', senses: [{ glosses: ["to regain one's eyesight"] }, {}] });
  });

  it('4. puts an entry with a meaning before one that only points elsewhere', () => {
    expect(rank(found('说'), '说').map((e) => [e.alt, e.reading])).toEqual([
      ['說', 'shuō'], ['説', 'shuō'], ['說', 'shuì'],
    ]);
    expect(rank(found('过来'), '过来').map((e) => e.reading)).toEqual(['guò lái', 'guò lai']);
    // 为 is wèi, "for"; of the two entries read so, 為's has the meanings and 爲's names it.
    expect(rank(found('为'), '为').map((e) => [e.alt, e.reading])).toEqual([
      ['為', 'wèi'], ['爲', 'wèi'], ['為', 'wéi'], ['爲', 'wéi'],
    ]);
  });

  it('5. puts the word itself before another way of writing it', () => {
    // 秊 has one meaning more than 年, and is 年 written oddly.
    expect(rank(found('年'), '年').map((e) => [e.alt, glosses(e)[0]])).toEqual([
      [undefined, 'year'], ['秊', 'grain'], [undefined, 'surname Nian'],
    ]);
  });

  it('6. puts the entry with more meanings first', () => {
    expect(top('告诉')).toMatchObject({ reading: 'gào su', senses: [{ glosses: ['to tell', 'to inform', 'to let know'] }] });
    expect(top('东西')?.reading).toBe('dōng xi');
    expect(top('大汉')?.senses[0]?.glosses).toEqual(['burly fellow']);
  });

  it('7. keeps the file’s order between entries level on all of that', () => {
    expect(rank(found('女人'), '女人').map((e) => e.reading)).toEqual(['nǚ rén', 'nǚ ren']);
    const a: Entry = { id: '9', word: 'x', reading: 'a', common: false, senses: [] };
    const b: Entry = { id: '10', word: 'x', reading: 'b', common: false, senses: [] };
    expect(rank([b, a], 'x').map((e) => e.id)).toEqual(['9', '10']);
  });

  it('ranks every entry it is given', () => {
    const all = found('着');
    expect(all).toHaveLength(8);
    expect(new Set(rank(all, '着').map((e) => e.id))).toEqual(new Set(all.map((e) => e.id)));
    expect(rank([], '着')).toEqual([]);
  });
});

describe('defaultReading', () => {
  // What a first-year learner expects above each of these standing alone.
  const USUAL: Array<[string, string]> = [
    ['了', 'le'], ['的', 'de'], ['还', 'hái'], ['還', 'hái'], ['长', 'cháng'], ['長', 'cháng'],
    ['那', 'nà'], ['没', 'méi'], ['沒', 'méi'], ['为', 'wèi'], ['為', 'wèi'], ['哪', 'nǎ'], ['雨', 'yǔ'],
    ['得', 'de'], ['着', 'zhe'], ['著', 'zhe'], ['地', 'de'], ['行', 'xíng'], ['中', 'zhōng'], ['说', 'shuō'],
    ['过', 'guo'], ['過', 'guo'], ['脏', 'zāng'], ['乾', 'gān'], ['妳', 'nǐ'], ['儿', 'r'], ['兒', 'r'],
    ['年', 'nián'], ['女', 'nǚ'],
  ];
  for (const [key, reading] of USUAL) {
    it(`${key} → ${reading}`, () => {
      expect(found(key).length, `no entries for ${key}`).toBeGreaterThan(0);
      expect(defaultReading(key, found(key))).toBe(reading);
    });
  }

  it('reads a longer word as its first-ranked entry does', () => {
    expect(defaultReading('学校', found('学校'))).toBe('xué xiào');
    expect(defaultReading('東西', found('東西'))).toBe('dōng xi');
    expect(defaultReading('告訴', found('告訴'))).toBe('gào su');
  });

  it('has none for a word with no entry, or no reading', () => {
    expect(defaultReading('学校', [])).toBeUndefined();
    expect(defaultReading('々', found('々'))).toBeUndefined();
  });
});

describe('the table of usual readings', () => {
  const pairs = Object.entries(DEFAULT_READINGS);

  it('holds a reading for each character CC-CEDICT reads several ways', () => {
    expect(pairs.length).toBeGreaterThan(1200);
  });

  it('is keyed by single characters, in both scripts', () => {
    for (const [char] of pairs) expect([...char], char).toHaveLength(1);
    expect(DEFAULT_READINGS['还']).toBe('hái');
    expect(DEFAULT_READINGS['還']).toBe('hái');
    expect(DEFAULT_READINGS['𫍲']).toBe('xiǎo');   // beyond the sixteen-bit characters
  });

  it('writes readings as entries write theirs: lower case, with tone marks', () => {
    for (const [char, reading] of pairs) expect(reading, char).toMatch(/^[\p{Ll}\p{M}]+$/u);
    expect(DEFAULT_READINGS['绿']).toBe('lǜ');
    expect(DEFAULT_READINGS['了']).toBe('le');
  });

  it('leaves out a character with one reading, and anything that is no character', () => {
    expect(DEFAULT_READINGS['我']).toBeUndefined();
    // A written form that happens to name something every object has.
    expect(rank(found('学校'), 'constructor')).toHaveLength(1);
    expect(defaultReading('toString', found('学校'))).toBe('xué xiào');
  });
});

describe('words the file gives no way to choose a reading for', () => {
  const lines = String.raw`
多少 多少 [duo1 shao3] /number; amount/somewhat/
多少 多少 [duo1 shao5] /how much?; how many?/(phone number, student ID etc) what number?/
妻子 妻子 [qi1 zi3] /wife and children/
妻子 妻子 [qi1 zi5] /wife/
教授 教授 [jiao1 shou4] /to teach (a subject)/
教授 教授 [jiao4 shou4] /professor/
生意 生意 [sheng1 yi4] /life force/vitality/
生意 生意 [sheng1 yi5] /business/CL:筆|笔[bi3]/
女人 女人 [nu:3 ren2] /woman/
女人 女人 [nu:3 ren5] /wife/
`.trim().split('\n');
  const under = (key: string): Entry[] =>
    lines.filter((l) => l.startsWith(`${key} `)).map((l, i) => toEntry(parseLine(l)!, String(i).padStart(8, '0')));
  const first = (key: string) => rank(under(key), key)[0];

  it('leads with the everyday one for the four met most', () => {
    expect(first('多少')).toMatchObject({ reading: 'duō shao' });
    expect(first('妻子')).toMatchObject({ reading: 'qī zi', senses: [{ glosses: ['wife'] }] });
    expect(first('教授')).toMatchObject({ reading: 'jiào shòu' });
    expect(first('生意')).toMatchObject({ reading: 'shēng yi' });
  });

  it('does not make a rule of the neutral tone: 女人 is "woman" before "wife"', () => {
    expect(first('女人')).toMatchObject({ reading: 'nǚ rén' });
  });

  it('still gives the reading the analyser asks for', () => {
    expect(rank(under('多少'), '多少', { reading: 'duō shǎo' })[0]?.reading).toBe('duō shǎo');
  });
});
