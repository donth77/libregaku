/**
 * The options page around the settings (src/options.ts, src/options.html).
 *
 * The page shows the same settings as the transcript panel (the settings
 * section), with a list of their sections down the side and, until the
 * first run is done, a short checklist above them. The strings without a
 * value are in the page's markup too, by their key in data-i18n.
 */
export const options = {
  /** The browser tab's title. */
  pageTitle: 'Libregaku settings',
  /** A link at the top, to the help page. */
  help: 'Help',
  /** The search box over the settings: its placeholder, which also names it for screen readers. */
  searchSettings: 'Search settings…',
  /** Under the box when nothing matches. `q` is what was typed, shown as it is. */
  noSettingsFound: 'No setting mentions “{q}”.',
  /** The name, for screen readers, of the list of sections down the side. */
  contentsLabel: 'Settings sections',
  /** The name, for screen readers, of the settings themselves. */
  settingsLabel: 'Settings',

  // The first-run checklist: two steps, gone once both are done
  setupHeading: 'Get started',
  setupAbout: 'Two choices, and everything else has a sensible default.',
  /** Step 1, a link to the Languages section. */
  stepLanguages: "Choose what you're learning",
  /** Step 2, a link to the Anki section. */
  stepAnki: 'Connect Anki and choose a deck for new cards',
  ankiOptional:
    'Anki is optional — subtitles, lookups and furigana all work without it. ' +
    'It is what remembers which words you already know.',
  /** The keyboard button is an icon button in the transcript panel's header. */
  nextSteps:
    'Then open a video with subtitles in the language you are learning, and hover a ' +
    'word. The keyboard button in the transcript panel lists the keyboard shortcuts.',
  /** Before a finished step, for screen readers alone: on screen, a tick and a line through it say so. */
  stepDone: 'Done',
  /** Button: step 1 is done, with the languages as they are. */
  confirmLanguages: 'These languages are right',
  /** Button: step 2 is done, keeping the deck already set. `deck` is its name, from Anki. */
  keepDeck: (deck: string): string => `Use ${deck} for new cards`,
};
