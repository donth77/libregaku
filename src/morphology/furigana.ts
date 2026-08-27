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

export interface RubySegment {
  text: string;
  /** Absent when the segment needs no annotation. */
  ruby?: string;
}

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

export function furigana(surface: string, reading?: string): RubySegment[] {
  if (!reading) return [{ text: surface }];

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
