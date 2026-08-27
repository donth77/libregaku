import { describe, expect, it } from 'vitest';
import { MODEL, ROOT_TAG, tagsFor, toAnkiFurigana } from '../model';

describe('tagsFor', () => {
  it('tags hierarchically so Anki can filter at any level', () => {
    expect(tagsFor({ source: 'netflix', lang: 'ja' })).toEqual([
      'libregaku',
      'libregaku::netflix',
      'libregaku::lang::ja',
    ]);
  });

  it('always includes the root tag, so one query finds everything', () => {
    for (const src of ['netflix', 'youtube', 'file']) {
      expect(tagsFor({ source: src, lang: 'ja' })).toContain(ROOT_TAG);
    }
  });
});

describe('toAnkiFurigana', () => {
  it('writes the bracket syntax Anki renders as ruby', () => {
    expect(toAnkiFurigana([{ text: '食', ruby: 'た' }, { text: 'べる' }])).toBe('食[た]べる');
  });

  it('separates a later bracketed run with a space, as Anki requires', () => {
    expect(
      toAnkiFurigana([
        { text: '取', ruby: 'と' }, { text: 'り' },
        { text: '引', ruby: 'ひ' }, { text: 'き' },
      ]),
    ).toBe('取[と]り 引[ひ]き');
  });

  it('leaves plain kana alone', () => {
    expect(toAnkiFurigana([{ text: 'たべる' }])).toBe('たべる');
  });

  it('handles a whole-run annotation', () => {
    expect(toAnkiFurigana([{ text: '立場', ruby: 'たちば' }])).toBe('立場[たちば]');
  });
});

describe('MODEL', () => {
  it('renders readings through furigana, not as bare text', () => {
    expect(MODEL.cardTemplates[0]?.Front).toContain('{{furigana:Reading}}');
  });

  it('keeps optional fields conditional so empty ones leave no blank rows', () => {
    for (const f of ['Audio', 'Sentence']) {
      expect(MODEL.cardTemplates[0]?.Front).toContain(`{{#${f}}}`);
    }
  });
});
