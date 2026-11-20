import { describe, expect, it } from 'vitest';
import { keysFor, rank, readingsOf, toEntry, wordsFor, type Entry, type RankHint } from '../jmdict';
import { KEYS, WORDS } from './fixtures/jmdict-frequent';

/**
 * Ranking and headwords, against real JMdict entries.
 *
 * Every entry sharing a spelling with the keys is in the fixture, so these
 * rank the same candidates the store would.
 */

const entries = WORDS.map((w) => toEntry(w)).filter((e): e is Entry => Boolean(e));
const byKey = new Map<string, Entry[]>();
for (const w of WORDS) {
  const e = entries.find((x) => x.id === w.id);
  if (!e) continue;
  for (const k of keysFor(w)) byKey.set(k, [...(byKey.get(k) ?? []), e]);
}
const candidates = (key: string): Entry[] => byKey.get(key) ?? [];
const top = (key: string, hint?: { reading?: string; pos?: string }) => rank(candidates(key), key, hint)[0];

describe('the fixture', () => {
  it('holds every key it claims to', () => {
    for (const k of KEYS) expect(candidates(k).length, k).toBeGreaterThan(0);
  });
});

describe('rank — frequent kana words resolve to their everyday entry', () => {
  // The key alone, as a lookup without the analyser's hints sees it. Each of
  // these used to surface something else: この "nine", また "groin", いる "to
  // shoot", いう "to do up hair", こと "particle indicating a command".
  const EVERYDAY: Array<[string, string, string]> = [
    ['この', '1582920', 'this'],
    ['いる', '1577980', 'to be (of animate objects)'],
    ['また', '1524930', 'again'],
    ['いう', '1587040', 'to say'],
    ['どう', '1008910', 'how'],
    ['こと', '1313580', 'thing'],
    ['それ', '1006970', 'that'],
    ['もし', '1012500', 'if'],
    ['よう', '1605840', 'appearing ...'],
    ['ため', '1157080', 'good'],
    ['とき', '1315840', 'time'],
    ['くる', '1547720', 'to come (spatially or temporally)'],
    ['いく', '1578850', 'to go'],
    ['おく', '1421850', 'to put'],
    ['よい', '1605820', 'good'],
    ['みる', '1259290', 'to see'],
    ['きく', '1591110', 'to hear'],
    ['は', '2028920', 'indicates sentence topic'],
  ];

  for (const [key, id, gloss] of EVERYDAY) {
    it(`${key} → ${gloss}`, () => {
      const e = top(key);
      expect(e?.id, `${key} ranked ${e?.word} "${e?.senses[0]?.glosses[0]}" first`).toBe(id);
      expect(e?.senses[0]?.glosses[0]).toBe(gloss);
    });
  }
});

describe('rank — the analyser’s hints', () => {
  it('uses the reading to choose between homographs', () => {
    expect(top('私', { reading: 'ワタシ' })?.id).toBe('1311110');   // わたし
    expect(top('私', { reading: 'アタシ' })?.id).toBe('1311125');   // あたし
  });

  it('uses the part of speech', () => {
    // わたし alone could be 渡し, a ferry; the pronoun is what was said.
    expect(top('わたし', { pos: '名詞,代名詞' })?.id).toBe('1311110');
    // もの the noun, not the sentence-final particle.
    expect(top('もの', { pos: '名詞,非自立' })?.id).toBe('1502390');
    expect(top('もの', { pos: '助詞,終助詞' })?.id).toBe('2780660');
  });

  it('never lets a hint outrank an exact spelling', () => {
    const r = rank(candidates('いる'), 'いる', { pos: '助詞' });
    expect(r.every((e) => e.forms?.some((f) => f.text === 'いる'))).toBe(true);
  });
});

describe('rank — all candidates are ranked', () => {
  it('orders the full list, so a late sequence number cannot be cut first', () => {
    const all = candidates('よう');
    expect(all.length).toBeGreaterThan(10);
    const ranked = rank(all, 'よう');
    expect(ranked).toHaveLength(all.length);
    expect(new Set(ranked.map((e) => e.id))).toEqual(new Set(all.map((e) => e.id)));
  });

  it('is stable for equal candidates', () => {
    const a: Entry = { id: '1', word: 'x', common: false, senses: [] };
    const b: Entry = { id: '2', word: 'x', common: false, senses: [] };
    expect(rank([b, a], 'x').map((e) => e.id)).toEqual(['1', '2']);
  });
});

describe('toEntry — headwords people actually see', () => {
  const entry = (id: string) => entries.find((e) => e.id === id)!;

  it('uses the kana for words usually written in kana', () => {
    expect(top('とても')).toMatchObject({ word: 'とても', uk: true, reading: undefined });
    expect(top('ちょっと')?.word).toBe('ちょっと');
    expect(top('する')?.word).toBe('する');
    expect(entry('1313580')).toMatchObject({ word: 'こと', kanji: '事', uk: true });
  });

  it('keeps the kanji for words written in kanji', () => {
    expect(top('いう')).toMatchObject({ word: '言う', reading: 'いう' });
    expect(entry('1591110')).toMatchObject({ word: '聞く', reading: 'きく' });
  });

  it('never shows a rare or search-only spelling', () => {
    for (const e of entries) {
      const shown = e.forms?.find((f) => f.text === e.word);
      expect(shown?.rare, `${e.id} shows ${e.word}`).not.toBe(true);
    }
  });

  it('still indexes the rare spelling, so it can be looked up', () => {
    expect(candidates('迚も').map((e) => e.word)).toEqual(['とても']);
  });

  it('records commonness per spelling', () => {
    const koto = entry('1313580');
    expect(koto.forms).toContainEqual({ text: '事', kana: false, common: true });
    expect(koto.forms?.find((f) => f.text === '縡')).toMatchObject({ rare: true, common: false });
  });
});

describe('readingsOf', () => {
  it('lists every reading a written form has', () => {
    const forms = readingsOf(rank(candidates('十分'), '十分'), '十分');
    expect([...forms].sort()).toEqual(['じっぷん', 'じゅうぶん']);
  });

  it('ignores entries where the form is only a rare spelling', () => {
    // 儂 (わし) lists 私 as rarely used; 私 is never read わし.
    expect(readingsOf(candidates('私'), '私')).not.toContain('わし');
  });

  it('reads a rare spelling that only writes more of a word in kana as that word, where it is nothing else', () => {
    const verb = (id: string, reading: string, forms: Array<[string, boolean, boolean?]>): Entry => ({
      id, word: forms[0]![0], reading, common: true, senses: [{ pos: ['v1'], glosses: ['x'] }],
      forms: forms.map(([text, kana, rare]) => ({ text, kana, common: !rare, ...(rare ? { rare } : {}) })),
    }) as unknown as Entry;
    // JMdict's search-only spellings: 落ちつける writes 落ち着ける's 着 in kana.
    const ochitsukeru = verb('1634110', 'おちつける', [['落ち着ける', false], ['落ちつける', false, true], ['おちつける', true]]);
    expect(readingsOf([ochitsukeru], '落ちつける')).toEqual(['おちつける']);
    // 行ける is いける's, which has no kanji of its own: 行ける is still 行く able to be done.
    const ikeru = verb('1631370', 'いける', [['行ける', false, true], ['いける', true]]);
    expect(readingsOf([ikeru], '行ける')).toEqual([]);
    // 四脚 is 四つ足's, but a number is left to the merge: 椅子が4脚 is four chairs, よんきゃく.
    const yotsuashi = verb('1307070', 'よつあし', [['四つ足', false], ['四つ脚', false], ['四脚', false, true], ['よつあし', true]]);
    expect(readingsOf([yotsuashi], '四脚')).toEqual([]);
    // A usual spelling still keeps the rare ones out: 私 is never read わし.
    expect(readingsOf(candidates('私'), '私')).not.toContain('わし');
  });
});

describe('wordsFor — what the tokenizer is told of a spelling', () => {
  const entry = (id: string, reading: string, senses: number, common = true): Entry => ({
    id, word: '後', reading, common, senses: Array.from({ length: senses }, () => ({ pos: ['n'], glosses: ['x'] })),
    forms: [{ text: '後', kana: false, common }, { text: reading, kana: true, common }],
  }) as unknown as Entry;

  it('gives each word spelled so, the likeliest first, and whether it is common', () => {
    const words = wordsFor([entry('2', 'のち', 4), entry('1', 'あと', 8), entry('3', 'しりえ', 1, false)], '後');
    expect(words.map((w) => [w.reading, w.common])).toEqual([['あと', true], ['のち', true], ['しりえ', undefined]]);
    expect(words[0]?.pos).toEqual(['n']);
  });

  it('says the first leads only where something tells it from the second: not their order in the file', () => {
    // More uses: あと leads のち.
    expect(wordsFor([entry('1', 'あと', 8), entry('2', 'のち', 4)], '後').map((w) => w.leads)).toEqual([true, undefined]);
    // Level in all the dictionary says: じつ is before み in the file, and does not lead.
    expect(wordsFor([entry('1', 'じつ', 4), entry('2', 'み', 4)], '後').map((w) => w.leads)).toEqual([undefined, undefined]);
    // A spelling with one word: it leads.
    expect(wordsFor([entry('1', 'あと', 1)], '後')[0]?.leads).toBe(true);
    expect(wordsFor([], '後')).toEqual([]);
  });

  it('says where a word is usually written in kana: つらい, under 辛い', () => {
    const tsurai = { ...entry('2', 'つらい', 3), word: 'つらい', reading: undefined, uk: true } as unknown as Entry;
    const karai = { ...entry('1', 'からい', 4), word: '辛い' } as unknown as Entry;
    const forms = (e: Entry, kana: string): Entry => ({ ...e, forms: [{ text: '辛い', kana: false, common: true }, { text: kana, kana: true, common: true }] }) as Entry;
    const words = wordsFor([forms(karai, 'からい'), forms(tsurai, 'つらい')], '辛い');
    expect(words.map((w) => [w.reading, w.kana])).toEqual([['からい', undefined], ['つらい', true]]);
  });
});

describe('rank — a kana word the analyser names', () => {
  const entry = (id: string, kanji: string[], senses: number): Entry => ({
    id, word: kanji[0]!, reading: 'そば', common: true, senses: Array.from({ length: senses }, () => ({ pos: ['n'], glosses: ['x'] })),
    forms: [...kanji.map((text) => ({ text, kana: false, common: true })), { text: 'そば', kana: true, common: true }],
  }) as unknown as Entry;
  const soba = [entry('1', ['蕎麦'], 3), entry('2', ['側', '傍'], 2)];
  /** UniDic's names: each spelling its own word, but 傍, which is 側 to it. */
  const names = (form: string): string | undefined => (form === '傍' ? '側' : form);

  it('is the entry one of whose spellings the analyser gives that name: そば is 側, beside', () => {
    expect(rank(soba, 'そば')[0]?.word).toBe('蕎麦');
    expect(rank(soba, 'そば', { spelling: '側', names })[0]?.word).toBe('側');
    expect(rank(soba, 'そば', { spelling: '蕎麦', names })[0]?.word).toBe('蕎麦');
  });

  it('is in the dictionary\'s own order where the analyser cannot be asked what it calls each spelling', () => {
    expect(rank(soba, 'そば', { spelling: '側' })[0]?.word).toBe('蕎麦');
  });

  it('is in the dictionary\'s own order between entries the analyser takes for one word: 奢る and 驕る', () => {
    const ogoru = [entry('1', ['奢る'], 3), entry('2', ['驕る'], 1)];
    expect(rank(ogoru, 'そば', { spelling: '驕る', names: () => '驕る' })[0]?.word).toBe('奢る');
  });
});

describe('rank — a verb in kana the analyser names', () => {
  const verb = (id: string, word: string, kanji: string, common: boolean): Entry => ({
    id, word, reading: 'うる', common: true, senses: [{ pos: ['v5r'], glosses: ['x'] }],
    forms: [{ text: kanji, kana: false, common }, { text: 'うる', kana: true, common: true }],
  }) as unknown as Entry;
  const uru = [verb('1', '売る', '売る', true), verb('2', '得る', '得る', true)];

  it('is the verb spelled as the analyser names it: うる is 得る, not 売る', () => {
    expect(rank(uru, 'うる', { pos: '動詞,非自立' })[0]?.word).toBe('売る');
    expect(rank(uru, 'うる', { pos: '動詞,非自立', spelling: '得る', names: () => '得る' })[0]?.word).toBe('得る');
  });

  it('is not a rare spelling the analyser names', () => {
    const rare = [verb('1', '売る', '売る', true), verb('2', '得る', '得る', false)];
    expect(rank(rare, 'うる', { pos: '動詞,非自立', spelling: '得る', names: () => '得る' })[0]?.word).toBe('売る');
  });
});

describe('rank — a verb in kana, by how it conjugates', () => {
  const verb = (id: string, word: string, code: string, senses: number): Entry => ({
    id, word, reading: 'いる', common: true, senses: Array.from({ length: senses }, () => ({ pos: [code], glosses: ['x'] })),
    forms: [{ text: word, kana: false, common: true }, { text: 'いる', kana: true, common: true }],
  }) as unknown as Entry;
  const iru = [verb('1', '居る', 'v1', 5), verb('2', '要る', 'v5r', 2), verb('3', '射る', 'v1', 2)];

  it('is the verb that conjugates so: いら in いらない is 要る, 五段, not 居る', () => {
    expect(rank(iru, 'いる', { pos: '動詞,自立' })[0]?.word).toBe('居る');
    expect(rank(iru, 'いる', { pos: '動詞,自立', conj: '五段・ラ行' })[0]?.word).toBe('要る');
    expect(rank(iru, 'いる', { pos: '動詞,自立', conj: '一段' })[0]?.word).toBe('居る');
  });

  it('is in the usual order where no verb of the spelling conjugates so, or the kind is one it does not know', () => {
    expect(rank(iru, 'いる', { pos: '動詞,自立', conj: '五段・カ行イ音便' })[0]?.word).toBe('居る');
    expect(rank(iru, 'いる', { pos: '動詞,自立', conj: '特殊・タ' })[0]?.word).toBe('居る');
  });

  it('knows the helpers of the old language: うる in ありうる is 得る, 下二', () => {
    const uru = [
      { ...verb('1', '売る', 'v5r', 3), reading: 'うる', forms: [{ text: '売る', kana: false, common: true }, { text: 'うる', kana: true, common: true }] },
      { ...verb('2', '得る', 'v2a-s', 1), reading: 'うる', forms: [{ text: '得る', kana: false, common: true }, { text: 'うる', kana: true, common: true }] },
    ] as Entry[];
    expect(rank(uru, 'うる', { pos: '動詞,非自立' })[0]?.word).toBe('売る');
    expect(rank(uru, 'うる', { pos: '動詞,非自立', conj: '下二・ア行' })[0]?.word).toBe('得る');
  });
});

describe('rank — a verb in kana, by what it follows (kana-verbs.ts)', () => {
  const verb = (id: string, word: string, kana: string, code: string, senses: number, uk = false): Entry => ({
    id, word: uk ? kana : word, ...(uk ? { uk: true, kanji: word } : { reading: kana }), common: true,
    senses: Array.from({ length: senses }, () => ({ pos: [code], glosses: ['x'] })),
    forms: [{ text: word, kana: false, common: true }, { text: kana, kana: true, common: true }],
  }) as unknown as Entry;
  // As JMdict has them: 吐く read つく is usually written in kana, so it led every つく.
  const tsuku = [verb('1', '就く', 'つく', 'v5k', 4), verb('2', '着く', 'つく', 'v5k', 2), verb('3', '吐く', 'つく', 'v5k', 3, true), verb('4', '付く', 'つく', 'v5k', 14)];
  const first = (hint: RankHint) => rank(tsuku, 'つく', { pos: '動詞,自立', ...hint })[0]?.forms?.[0]?.text;

  it('is the verb the noun and particle before it say: 駅につく is 着く, うそはつかない 吐く', () => {
    expect(first({ follows: '駅|に' })).toBe('着く');
    expect(first({ follows: 'うそ|は' })).toBe('吐く');
  });

  it('is what it most often is after anything else: つく alone is 付く', () => {
    expect(first({ follows: '' })).toBe('付く');
    expect(first({ follows: 'それ|から' })).toBe('付く');
    // Not asked, the dictionary's own order.
    expect(first({})).toBe('吐く');
  });

  it("gives way to how the verb conjugates, where the line's form decides it", () => {
    const kaeru = [verb('1', '帰る', 'かえる', 'v5r', 3), verb('2', '変える', 'かえる', 'v1', 2)];
    expect(rank(kaeru, 'かえる', { pos: '動詞,自立', follows: '写真|を' })[0]?.word).toBe('変える');
    expect(rank(kaeru, 'かえる', { pos: '動詞,自立', follows: '写真|を', conj: '五段・ラ行' })[0]?.word).toBe('帰る');
  });
});

describe('rank — a dependent noun', () => {
  const entry = (id: string, word: string, pos: string[]): Entry => ({
    id, word, reading: 'たび', common: true, senses: [{ pos, glosses: ['x'] }],
    forms: [{ text: word, kana: false, common: true }, { text: 'たび', kana: true, common: true }],
  }) as unknown as Entry;
  const tabi = [entry('1', '足袋', ['n']), entry('2', '度', ['n', 'n-suf', 'ctr']), entry('3', '旅', ['n'])];

  it('takes the suffix reading first: たび after a verb is 度, "each time", not 足袋', () => {
    expect(rank(tabi, 'たび', { pos: '名詞,非自立' })[0]?.word).toBe('度');
  });

  it('leaves the order alone where the analyser says it is a plain noun', () => {
    expect(rank(tabi, 'たび', { pos: '名詞,一般' })[0]?.word).toBe('足袋');
  });
});

describe('readingsOf — a word written in katakana', () => {
  it('reads as it is written, so the analyser can ask whether ワンシーン is a word', () => {
    const scene = { id: '1', word: 'ワンシーン', common: false, senses: [{ pos: ['n'], glosses: ['scene'] }], forms: [{ text: 'ワンシーン', kana: true, common: false }] } as unknown as Entry;
    expect(readingsOf([scene], 'ワンシーン')).toEqual(['ワンシーン']);
    expect(readingsOf([scene], 'ワンシーンズ')).toEqual([]);
  });
});
