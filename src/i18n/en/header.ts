/** The bar across the top of the player (src/content/header.ts, player-inset.ts). */
export const header = {
  // How the learner is doing on this video, at the left of the bar
  /** {percent} is knownPercent, in bold: the share of this video's words the learner knows. */
  knownStat: '{percent} known',
  /** That share as it shows, a whole number from 0 to 100. */
  knownPercent: (percent: number): string => `${percent}%`,
  /** Tooltip on the share. */
  knownTip: 'Words you know',
  /** {count} is a number, in bold: how many lines of this video have exactly one word the learner does not know yet. */
  readyStat: '{count} ready to learn',
  /** Tooltip on that number. */
  readyTip: 'Lines with one new word',

  // The switches at the right of the bar: icon buttons, each named in its tooltip
  /** Button: blur the subtitle until the cursor is on it, for listening practice. */
  blurSubtitle: 'Blur subtitle',
  /** The same button while the subtitle is blurred. */
  unblurSubtitle: 'Unblur subtitle',
  /** Button: show the translation, a second subtitle line in the learner's own language. */
  showTranslation: 'Show translation',
  /** The same button while the translation shows. */
  hideTranslation: 'Hide translation',
  /**
   * That button's name for screen readers, the same whether the translation
   * shows or not: they hear it as pressed or not pressed.
   */
  translation: 'Translation',
  /** Button: open or close the transcript, the panel beside the video that lists every subtitle line. */
  transcript: 'Transcript',
  /** Button: keep the bar showing, rather than only when the cursor nears the top of the player. */
  pinHeader: 'Pin header',
  /** The same button while the bar is kept showing. */
  unpinHeader: 'Unpin header',
  /** Button: open the settings. */
  settings: 'Settings',

  // The small tab at the top of the player, all that shows while the bar is away
  /** Its tooltip: clicking it brings the bar down. */
  showHeader: 'Show header',
};
