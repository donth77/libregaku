import { describe, expect, it } from 'vitest';
import { keysFor, rank, readingsOf, toEntry, type Entry } from '../jmdict';
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
