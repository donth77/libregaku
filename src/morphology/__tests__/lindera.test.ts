import { describe, expect, it } from 'vitest';
import { forAnalysis, marksToDrop, restretched, toTokens } from '../lindera';

describe('toTokens', () => {
  const line = '彼女は日本語を勉強している';

  it('maps analysed surfaces back to UTF-16 offsets in the original text', () => {
    const toks = toTokens(line, [
      { surface: '彼女', lemma: '彼女', reading: 'カノジョ', pos: '名詞' },
      { surface: 'は', pos: '助詞' },
      { surface: '日本語', lemma: '日本語', reading: 'ニホンゴ', pos: '名詞' },
    ]);
    for (const t of toks) expect(line.slice(t.start, t.end)).toBe(t.surface);
    expect(toks[0]?.start).toBe(0);
    expect(toks[2]?.surface).toBe('日本語');
  });

  it('marks particles as function words, not vocabulary', () => {
    const toks = toTokens(line, [
      { surface: '彼女', pos: '名詞' },
      { surface: 'は', pos: '助詞' },
    ]);
    expect(toks[0]?.content).toBe(true);
    expect(toks[1]?.content).toBe(false);
  });

  it('carries lemma and reading through', () => {
    const [t] = toTokens('食べる', [
      { surface: '食べる', lemma: '食べる', reading: 'タベル', pos: '動詞' },
    ]);
    expect(t?.lemma).toBe('食べる');
    expect(t?.reading).toBe('タベル');
  });

  it('skips a surface it cannot find rather than misaligning the rest', () => {
    const toks = toTokens('あいう', [
      { surface: 'あ' },
      { surface: 'ZZZ' },   // analyser normalised something away
      { surface: 'う' },
    ]);
    expect(toks.map((t) => t.surface)).toEqual(['あ', 'う']);
    expect(toks[1]?.start).toBe(2);
  });

  it('does not match an earlier duplicate twice', () => {
    const toks = toTokens('ははは', [{ surface: 'は' }, { surface: 'は' }, { surface: 'は' }]);
    expect(toks.map((t) => t.start)).toEqual([0, 1, 2]);
  });
});

/*
 * Lines as IPADIC really reads them (lindera-wasm 6.0.0, lindera-ipadic-6.0.0,
 * through the offscreen document's analyse()), from subtitles where they
 * came out wrong.
 */
describe('marks the analyser calls words', () => {
  it('keeps ？ and the space after it out of the words, though IPADIC calls them a noun', () => {
    const toks = toTokens('え？　はい', [
      { surface: 'え', lemma: 'え', reading: 'エ', pos: 'フィラー' },
      { surface: '？　', pos: '名詞', pos1: 'サ変接続' },
      { surface: 'はい', lemma: 'はい', reading: 'ハイ', pos: '感動詞' },
    ]);
    expect(toks.map((t) => [t.surface, Boolean(t.punct)])).toEqual([['え', false], ['？　', true], ['はい', false]]);
    expect(toks[1]?.content).toBe(false);
  });

  it('treats a lone ～, ? or ー the same way', () => {
    for (const mark of ['～', '?', 'ー', '…', '♪']) {
      const [t] = toTokens(mark, [{ surface: mark, pos: '名詞', pos1: 'サ変接続' }]);
      expect(t?.punct, mark).toBe(true);
    }
    // A word with a long-vowel mark in it is still a word.
    const [w] = toTokens('コーヒー', [{ surface: 'コーヒー', lemma: 'コーヒー', reading: 'コーヒー', pos: '名詞' }]);
    expect(w?.punct).toBe(false);
  });
});

describe('stretched vowels', () => {
  it('reads a stretch mark after kana as ー, the way the dictionary spells such words', () => {
    expect(forAnalysis('は〜い！').text).toBe('はーい！');
    expect(forAnalysis('う～ん').text).toBe('うーん');
    expect(forAnalysis('すご～～い').text).toBe('すごーい');   // a run is one stretch
    expect(forAnalysis('そうだね~').text).toBe('そうだねー');
    // Not a mark that follows no kana, nor a katakana word's own ー.
    expect(forAnalysis('〜から').text).toBe('〜から');
    expect(forAnalysis('10〜20').text).toBe('10〜20');
    expect(forAnalysis('コーヒー').stretched.size).toBe(0);
    // A ー after hiragana is a stretch too, for when IPADIC cannot read it.
    expect([...forAnalysis('すごーい').stretched]).toEqual([2]);
    expect(forAnalysis('はい').at).toEqual([0, 1, 2]);
  });

  it('drops a stretch IPADIC leaves on its own, and keeps one it reads', () => {
    // すごーい as IPADIC reads it: すご + ー + い.
    const line = forAnalysis('すご〜い！');
    const read = toTokens(line.text, [
      { surface: 'すご', lemma: 'すごい', reading: 'スゴ', pos: '形容詞' },
      { surface: 'ー', pos: '名詞', pos1: '固有名詞' },
      { surface: 'い', lemma: 'い', reading: 'イ', pos: '名詞' },
      { surface: '！', pos: '記号' },
    ]);
    const drop = marksToDrop(read, line);
    expect([...drop]).toEqual([2]);
    expect(forAnalysis('すご〜い！', drop).text).toBe('すごい！');

    // うーん it reads whole: nothing to drop, and it stays うーん, not うん.
    const hmm = forAnalysis('う～ん');
    expect(marksToDrop(toTokens(hmm.text, [{ surface: 'うーん', lemma: 'うーん', reading: 'ウーン', pos: '感動詞' }]), hmm).size).toBe(0);
  });

  it('puts the words back on the line as written, each taking the marks after it', () => {
    const text = 'は～い！すご〜〜い';
    const first = forAnalysis(text);
    expect(first.text).toBe('はーい！すごーい');
    const second = forAnalysis(text, new Set([6]));
    expect(second.text).toBe('はーい！すごい');
    // What IPADIC answers for that line.
    const toks = restretched(toTokens(second.text, [
      { surface: 'はーい', lemma: 'はーい', reading: 'ハーイ', pos: '感動詞' },
      { surface: '！', pos: '記号' },
      { surface: 'すごい', lemma: 'すごい', reading: 'スゴイ', pos: '形容詞' },
    ]), text, second.at);
    expect(toks.map((t) => t.surface)).toEqual(['は～い', '！', 'すご〜〜い']);
    expect(toks[2]).toMatchObject({ lemma: 'すごい', start: 4, end: 9 });
    for (const t of toks) expect(text.slice(t.start, t.end)).toBe(t.surface);
    expect(toks.map((t) => t.surface).join('')).toBe(text);
  });
});
