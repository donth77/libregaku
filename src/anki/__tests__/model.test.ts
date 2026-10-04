import { describe, expect, it } from 'vitest';
import {
  MODEL, ROOT_TAG, fieldHtml, furiganaField, isOwnMedia, keyField, mediaFilename, tagsFor, toAnkiFurigana,
} from '../model';

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

  it('keeps its own brackets but escapes any in the text, so they never become ruby', () => {
    expect(toAnkiFurigana([{ text: 'ねえ[笑]' }])).toBe('ねえ&#91;笑&#93;');
    expect(toAnkiFurigana([{ text: 'A&B<' }, { text: '字', ruby: 'じ]' }])).toBe('A&amp;B&lt; 字[じ&#93;]');
  });
});

describe('field escaping', () => {
  it('stores text as text: markup escaped, brackets escaped, line breaks kept', () => {
    expect(fieldHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(fieldHtml('R&D [aside]')).toBe('R&amp;D &#91;aside&#93;');
    expect(fieldHtml('一行目\n二行目')).toBe('一行目<br>二行目');
  });

  it("keeps the duplicate-check field's line breaks raw, which Anki's checksum depends on", () => {
    expect(keyField('一行目\n<b>二行目</b>')).toBe('一行目\n&lt;b&gt;二行目&lt;/b&gt;');
  });

  it('keeps furigana brackets we built while neutralising markup', () => {
    expect(furiganaField('分[わ]かる<script>')).toBe('分[わ]かる&lt;script&gt;');
    expect(furiganaField('A & B')).toBe('A &amp; B');
  });

  it("leaves toAnkiFurigana's output exactly as it was", () => {
    const built = toAnkiFurigana([{ text: 'R&D[' }, { text: '字', ruby: 'じ' }]);
    expect(furiganaField(built)).toBe(built);
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

describe('media file names', () => {
  it('names a recording by its word and reading, under our prefix', () => {
    expect(mediaFilename('猫', 'ねこ', 'audio/mpeg')).toBe('libregaku_猫_ねこ.mp3');
    expect(mediaFilename('食べる', 'たべる', 'audio/ogg; codecs=opus')).toBe('libregaku_食べる_たべる.ogg');
  });

  it('leaves out a reading that is the word itself', () => {
    expect(mediaFilename('やばい', 'やばい', 'audio/mpeg')).toBe('libregaku_やばい.mp3');
    expect(mediaFilename('やばい', undefined, 'audio/mpeg')).toBe('libregaku_やばい.mp3');
  });

  it("keeps out what a file system or Anki's [sound:] tag would choke on", () => {
    const name = mediaFilename('a/b]c[d', 'x\\y:z', 'audio/mpeg');
    expect(name).toBe('libregaku_a_b_c_d_x_y_z.mp3');
    expect(isOwnMedia(name)).toBe(true);
    expect(mediaFilename('???', '', 'audio/mpeg')).toBe('libregaku_word.mp3');
  });

  it('falls back to mp3 for a type it does not know', () => {
    expect(mediaFilename('猫', 'ねこ', 'application/octet-stream')).toBe('libregaku_猫_ねこ.mp3');
  });

  it('recognises only names it would have made', () => {
    expect(isOwnMedia('libregaku_猫.mp3')).toBe(true);
    for (const name of ['猫.mp3', 'libregaku_../x.mp3', 'libregaku_a/b.mp3', `libregaku_${'x'.repeat(200)}.mp3`, 42, null]) {
      expect(isOwnMedia(name)).toBe(false);
    }
  });
});
