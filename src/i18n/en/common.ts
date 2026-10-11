import type { Settings } from '../../settings';

const RUBY: Record<Settings['ruby'], string> = { never: 'off', unknown: 'new words', always: 'all' };

/** Words more than one part of the interface uses. */
export const common = {
  /**
   * The furigana setting, as the bar and the player announce it: off, over
   * new words, or over all words — the words its menu and the R key use.
   */
  furigana: (mode: Settings['ruby']): string => `Furigana: ${RUBY[mode]}`,
  /**
   * What goes between two whole sentences shown together, as in the Anki
   * status line: a space in English; nothing after a Chinese 。.
   */
  sentenceGap: ' ',
};
