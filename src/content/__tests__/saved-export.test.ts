import { describe, expect, it, vi } from 'vitest';

/**
 * The file a saved list becomes. Anki reads the header lines and skips them
 * on older versions, so the only thing that can really break here is a cell
 * containing a tab or a newline — which would silently shift every column.
 */

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: { getURL: (p: string) => `chrome-extension://testid/${p}`, sendMessage: async () => ({}) },
});

import { savedTsv, wordsTsv } from '../sidebar';
import type { Bookmark } from '../bookmarks';

const line = (over: Partial<Bookmark> = {}): Bookmark => ({
  id: 'yt:v:1000',
  site: 'youtube',
  video: 'v',
  title: 'A video',
  url: 'https://youtu.be/v?t=1',
  text: '何かの荷物が軽くなった',
  secondary: 'Something got lighter',
  start: 63,
  end: 67,
  lang: 'ja',
  savedAt: 0,
  ...over,
});

describe('savedTsv', () => {
  it('tells Anki how to read the file', () => {
    const out = savedTsv([line()]).split('\n');
    expect(out[0]).toBe('#separator:tab');
    expect(out[2]).toBe('#columns:Sentence\tTranslation\tSource\tLink');
  });

  it('writes one row per line, sentence first', () => {
    const [row] = savedTsv([line()]).split('\n').slice(3);
    expect(row!.split('\t')).toEqual([
      '何かの荷物が軽くなった',
      'Something got lighter',
      'A video · 01:03',
      'https://youtu.be/v?t=1',
    ]);
  });

  it('never lets a cell break the columns', () => {
    const rows = savedTsv([line({ text: 'two\tparts', secondary: 'over\ntwo lines' })])
      .split('\n')
      .slice(3);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.split('\t')).toHaveLength(4);
    expect(rows[0]).toContain('two parts');
  });

  it('leaves a missing translation as an empty column', () => {
    const [row] = savedTsv([line({ secondary: undefined })]).split('\n').slice(3);
    expect(row!.split('\t')[1]).toBe('');
  });
});

describe('wordsTsv', () => {
  it('writes a marked list as word, reading and meaning, with the header Anki reads', () => {
    const out = wordsTsv([{ word: '保つ', reading: 'たもつ', meaning: 'to keep; to preserve' }]).split('\n');
    expect(out[2]).toBe('#columns:Word\tReading\tMeaning');
    expect(out[3]!.split('\t')).toEqual(['保つ', 'たもつ', 'to keep; to preserve']);
  });

  it('never lets a meaning break the columns', () => {
    const [row] = wordsTsv([{ word: '猫', reading: 'ねこ', meaning: 'cat\tfeline\nanimal' }]).split('\n').slice(3);
    expect(row!.split('\t')).toHaveLength(3);
  });
});
