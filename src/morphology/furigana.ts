/**
 * Align a word's reading to the kanji inside it.
 *
 * The analyser gives a surface (食べる) and a reading (タベル). Ruby needs to
 * know that た belongs over 食 and べる is already kana. The trick is to anchor
 * on the kana: they appear verbatim in the reading, so whatever sits between
 * two anchors is the reading of the kanji between them.
 *
 * Adjacent kanji with no kana between them (立場 / たちば) cannot be split per
 * character without a kanji-reading table, so the whole run is annotated. Every
 * tool does this and it reads fine.
 */

import type { RubySegment } from './types';

export type { RubySegment };

const KANJI = /[一-鿿㐀-䶿豈-﫿々]/;

export function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

function runs(surface: string): Array<{ kanji: boolean; text: string }> {
  const out: Array<{ kanji: boolean; text: string }> = [];
  for (const ch of surface) {
    const kanji = KANJI.test(ch);
    const last = out[out.length - 1];
    if (last && last.kanji === kanji) last.text += ch;
    else out.push({ kanji, text: ch });
  }
  return out;
}

/** Marks that stretch a vowel (は〜い, 可愛い～). They are in no reading. */
const STRETCH = new Set(['〜', '～', '~', '〰']);

/**
 * A っ put between two kanji for stress — 全っ然, 本っ当 — when the reading
 * has none: written, but not read. 真っ赤 reads its っ, マッカ, and keeps it.
 */
function stressAt(surface: string, reading: string, i: number): boolean {
  const c = surface[i];
  return (c === 'っ' || c === 'ッ') && KANJI.test(surface[i - 1] ?? '') && KANJI.test(surface[i + 1] ?? '')
    && !/[っッ]/.test(reading);
}

/**
 * Segments aligned without the stretch marks, given them back where they
 * stood: as text of their own between segments, inside the one they
 * interrupt otherwise.
 */
function withMarks(surface: string, segs: RubySegment[], isMark: (i: number) => boolean): RubySegment[] {
  const out: RubySegment[] = [];
  let i = 0;
  const marks = (): void => {
    let m = '';
    while (i < surface.length && isMark(i)) m += surface[i++];
    if (m) out.push({ text: m });
  };
  for (const seg of segs) {
    marks();
    let text = '';
    for (let k = 0; k < seg.text.length && i < surface.length; i++) {
      text += surface[i];
      if (!isMark(i)) k++;
    }
    out.push(seg.ruby ? { text, ruby: seg.ruby } : { text });
  }
  marks();
  return out;
}

export function furigana(surface: string, reading?: string): RubySegment[] {
  if (!reading) return [{ text: surface }];
  // A stretched word reads as the word: 凄〜い is 凄[すご]い with a mark in it,
  // and 全っ然 is 全然 with a っ in it.
  const isMark = (i: number): boolean => STRETCH.has(surface[i]!) || stressAt(surface, reading, i);
  let plain = '';
  for (let i = 0; i < surface.length; i++) if (!isMark(i)) plain += surface[i];
  if (plain && plain !== surface) return withMarks(surface, furigana(plain, reading), isMark);

  const parts = runs(surface);
  if (!parts.some((p) => p.kanji)) return [{ text: surface }];

  const hira = toHiragana(reading);
  // Reading equals the surface (already kana, or the analyser gave it back
  // unchanged) — nothing to annotate.
  if (hira === toHiragana(surface)) return [{ text: surface }];

  /** Give up on per-kanji alignment and annotate the whole word. */
  const whole = (): RubySegment[] => [{ text: surface, ruby: hira }];

  const out: RubySegment[] = [];
  let r = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;

    if (!part.kanji) {
      const kana = toHiragana(part.text);
      if (!hira.startsWith(kana, r)) return whole();
      out.push({ text: part.text });
      r += kana.length;
      continue;
    }

    const next = parts[i + 1];
    if (!next) {
      // Trailing kanji run takes whatever reading is left.
      const rest = hira.slice(r);
      if (!rest) return whole();
      out.push({ text: part.text, ruby: rest });
      r = hira.length;
      continue;
    }

    // The kanji reading runs until the following kana appears. Search from
    // r + 1 so a kanji always gets at least one mora.
    const anchor = toHiragana(next.text);
    const at = hira.indexOf(anchor, r + 1);
    if (at < 0) return whole();
    out.push({ text: part.text, ruby: hira.slice(r, at) });
    r = at;
  }

  // Reading left unconsumed means the alignment drifted.
  if (r !== hira.length) return whole();
  return out;
}
