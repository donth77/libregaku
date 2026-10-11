/**
 * Messages from the dictionary, audio, sites and service worker that reach the screen.
 *
 * Most say why something failed, and show after a sentence of their own that
 * says what failed: in the toolbar popup, or in a notice over the player.
 * YouTube, Netflix, Chrome and Libregaku are names and stay as they are.
 */
export const errors = {
  // Recording a tab's sound for sentence audio, where the video itself cannot be recorded (Netflix). Started from the toolbar popup
  /** Recording was asked for before the permission to capture a tab's sound was given, which is done in Libregaku's settings. */
  captureNotAllowed: 'Allow sentence audio on this site in Libregaku’s settings first.',
  /** Chrome refused to capture the tab, and gave no reason. */
  captureRefused: 'Chrome would not capture this tab',

  // A subtitle track that would not load. Shown in a notice, after the track's name, when the line under the subtitles failed
  /** A track was asked for that the site's list no longer has. `id` is the extension's own name for the track. */
  unknownTrack: (id: string): string => `unknown track ${id}`,
  /**
   * YouTube: none of the caption formats tried gave any lines. `attempts`
   * says how each went: the format's internal name, then a result such as
   * HTTP 403, emptyAnswer or noCues.
   */
  noCaptionFormat: (attempts: readonly string[]): string => `no caption format worked — ${attempts.join(', ')}`,
  /**
   * Netflix: none of the addresses the subtitles are served from gave any
   * lines. `attempts` says how each went: the server's name, then a result
   * such as HTTP 403, emptyAnswer, noCuesParsed or noAnswerWithin. "none
   * listed" is for a track with no address at all.
   */
  noSubtitleUrl: (attempts: readonly string[]): string =>
    `no subtitle URL worked — ${attempts.join('; ') || 'none listed'}`,
  /** One attempt's result: the answer had nothing in it. */
  emptyAnswer: 'empty',
  /** One attempt's result, on YouTube: the answer was read and held no lines (cues). */
  noCues: '0 cues',
  /** One attempt's result, on Netflix: the answer was read and held no lines (cues). */
  noCuesParsed: 'parsed to zero cues',
  /** One attempt's result, on Netflix: the server gave no answer within `seconds` seconds. */
  noAnswerWithin: (seconds: number): string => `no answer in ${seconds}s`,

  // A track's name in the toolbar popup's subtitle menus, and in notices. The name itself comes from the site
  /** A Netflix track that only translates writing shown on screen, not what is said. `track` is its name, from Netflix. */
  forcedTrack: (track: string): string => `${track} (forced)`,
};
