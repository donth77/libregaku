import { describe, expect, it } from 'vitest';
import {
  FIELDS, MARK_UNSORTED, MODEL, ROOT_TAG, defaultDeck, fieldHtml, furiganaField, isMarkDeck, isOwnMedia, keyField,
  langOfTags, langTag, lineMediaName, markDeck, mediaFilename, tagsFor, toAnkiFurigana,
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

describe('a language in Anki', () => {
  it('reads a language back from the tag that names it, in whatever capitals Anki kept', () => {
    expect(langOfTags(tagsFor({ source: 'netflix', lang: 'ja' }))).toBe('ja');
    expect(langOfTags(['Libregaku', 'Libregaku::Lang::ZH'])).toBe('zh');
    expect(langOfTags(['libregaku', langTag('pt-br')])).toBe('pt-br');
  });

  it('finds none on a note from before marks had one, or in a tag that is not a language', () => {
    expect(langOfTags(['libregaku', 'libregaku::mark::known'])).toBeNull();
    expect(langOfTags(['libregaku::lang::'])).toBeNull();
    expect(langOfTags(['libregaku::lang::__proto__', 'libregaku::lang::ja::old', 'libregaku::language::ja'])).toBeNull();
    expect(langOfTags(undefined)).toBeNull();
  });

  it('gives each language a deck of its own for cards, named by its code', () => {
    // The code, not the language's name: the name changes with the interface language.
    expect(defaultDeck('ja')).toBe('Libregaku-JA');
    expect(defaultDeck('es')).toBe('Libregaku-ES');
    expect(defaultDeck('ja')).not.toBe(defaultDeck('zh'));
  });

  it('gives each language a deck of its own for marks, inside the one they all shared', () => {
    expect(markDeck('ja')).toBe('Libregaku::Marks::JA');
    expect(markDeck('ko')).toBe('Libregaku::Marks::KO');
    for (const lang of ['ja', 'ko', 'zh', 'es', 'pt-br']) expect(isMarkDeck(markDeck(lang))).toBe(true);
  });

  it('counts only a language’s mark deck as one', () => {
    for (const deck of ['Libregaku::Marks', 'Libregaku::Marks::', 'Libregaku::Marks::JA::Mine', 'Libregaku-JA',
      'Japanese', 'Libregaku::Marksmanship::JA', '', null, undefined, 7]) {
      expect(isMarkDeck(deck)).toBe(false);
    }
  });

  it('searches for marks in the shared deck itself, and never in a language’s', () => {
    expect(MARK_UNSORTED).toBe('note:"Libregaku Mark" deck:"Libregaku::Marks" -deck:"Libregaku::Marks::*"');
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

  it('makes new note types with SentenceAudio, without requiring it of older ones', () => {
    expect(MODEL.inOrderFields).toContain('SentenceAudio');
    expect(FIELDS).not.toContain('SentenceAudio');
    expect(MODEL.cardTemplates[0]?.Back).toContain('{{#SentenceAudio}}');
  });
});

describe('line media file names', () => {
  it('names a line by its video and where it starts, under our prefix', () => {
    expect(lineMediaName('uC8Mhixux3Q', 64.123, 'm4a')).toBe('libregaku_uC8Mhixux3Q_64123.m4a');
    expect(lineMediaName('81035908', 12, 'jpg')).toBe('libregaku_81035908_12000.jpg');
    expect(lineMediaName('a/../b', 1, 'jpg')).toBe('libregaku_a_b_1000.jpg');
    expect(isOwnMedia(lineMediaName('a/../b', 1, 'jpg'))).toBe(true);
  });
});

describe('media file names', () => {
  it('names a recording by its word and reading, under our prefix', () => {
    expect(mediaFilename('猫', 'ねこ', 'audio/mpeg')).toBe('libregaku_猫_ねこ.mp3');
    expect(mediaFilename('食べる', 'たべる', 'audio/ogg; codecs=opus')).toBe('libregaku_食べる_たべる.ogg');
    // As Wikimedia Commons serves an Ogg recording.
    expect(mediaFilename('사람', undefined, 'application/ogg')).toBe('libregaku_사람.ogg');
    expect(mediaFilename('casa', undefined, 'audio/x-wav')).toBe('libregaku_casa.wav');
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
