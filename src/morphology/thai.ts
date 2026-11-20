import type { LemmaHints } from './lemma';
import type { Token } from './types';

/**
 * Thai is written without spaces between words, and the browser finds them
 * (Intl.Segmenter has a dictionary of Thai). Its words do not inflect, so the
 * dictionary's own word is the word, or the standard spelling of a colloquial
 * one (มั้ย is ไหม, เถอะ เถิด), which Wiktionary lists as another spelling.
 */
export const THAI: LemmaHints = {
  first: [],
  common: [],
  auxiliaries: [],
  // The pronouns that stand for a person. Thai has no articles.
  grammar: ['ผม', 'ฉัน', 'ดิฉัน', 'เขา', 'เธอ', 'คุณ', 'เรา', 'มัน', 'พวกเรา', 'พวกเขา', 'ท่าน'],
};

/** ๆ, the mark that says the word before it again: เด็กๆ, children; จริง ๆ, really. */
const REPEAT = 'ๆ';

/**
 * The line with ๆ written onto the word it repeats, as one word: the browser
 * leaves it apart where there is a space before it (จริง ๆ), and sometimes
 * where there is none.
 */
export function joinRepeats(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const t of tokens) {
    const last = out.at(-1);
    const before = out.at(-2);
    if (t.surface === REPEAT && last && !last.punct && last.end === t.start) {
      out[out.length - 1] = { ...last, surface: last.surface + t.surface, end: t.end };
      continue;
    }
    // จริง ๆ: the word, one space, and the mark.
    if (t.surface === REPEAT && last?.punct && /^ $/.test(last.surface) && before && !before.punct && before.end === last.start && last.end === t.start) {
      out.splice(-2, 2, { ...before, surface: before.surface + last.surface + t.surface, end: t.end });
      continue;
    }
    out.push(t);
  }
  return out;
}

/** The word a repeated one is looked up as: เด็กๆ is เด็ก. */
export const unrepeat = (surface: string): string => surface.replace(/\s?ๆ$/u, '');
