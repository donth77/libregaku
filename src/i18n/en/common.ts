import type { Settings } from '../../settings';

const RUBY: Record<Settings['ruby'], string> = { never: 'off', unknown: 'new words', always: 'all' };

/** Words more than one part of the interface uses. */
export const common = {
  /**
   * The furigana setting, as the bar and the player announce it: off, over
   * new words, or over all words — the words its menu and the R key use.
   */
  furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
  /** The same setting where the language being learned is Chinese: pinyin, the romanised reading, above the characters. */
  pinyin: (mode: Settings['ruby']): string => `Pinyin: ${RUBY[mode]}`,
  /**
   * Mandarin, as a language to learn, beside Cantonese: Intl calls it
   * "Chinese", which Cantonese is too. Written as a menu item.
   */
  mandarin: 'Chinese (Mandarin)',
  /** The same setting where the language being learned is Cantonese: Jyutping, its romanised reading, above the characters. */
  jyutping: (mode: Settings['ruby']): string => `Jyutping: ${RUBY[mode]}`,
  /**
   * What goes between two whole sentences shown together, as in the Anki
   * status line: a space in English; nothing after a Chinese 。.
   */
  sentenceGap: ' ',
};
