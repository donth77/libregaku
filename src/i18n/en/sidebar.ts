/** "1 word", "2 words": the English count the Words strings below share. */
const words = (n: number): string => `${n} word${n === 1 ? '' : 's'}`;

/**
 * The transcript panel: transcript, saved lines, words, search and filters (src/content/sidebar.ts).
 *
 * The panel sits at the right of the video. Across its top are three tabs —
 * Transcript, Saved and Words — and three icon buttons: the keyboard
 * shortcuts, Settings, and Close.
 */
export const sidebar = {
  // The tabs, and the icon buttons beside them
  /** The tab row's name for screen readers: the panel's lists, as tabs. */
  tabsLabel: 'Lists',
  /** Tab: the video's whole script, line by line. */
  transcriptTab: 'Transcript',
  /** Tab: the lines the learner bookmarked to come back to. */
  savedTab: 'Saved',
  /** Tab: the words the learner marked by hand — tracked, known or ignored. */
  wordsTab: 'Words',
  /** The gear button's tooltip and its name for screen readers, and the heading over the Settings view it opens. */
  settings: 'Settings',
  /** The keyboard button's tooltip and its name for screen readers, and the heading over the list of keys it opens. */
  shortcuts: 'Keyboard shortcuts',
  /** Tooltip on the button that closes the panel. */
  close: 'Close',
  /** That button's name for screen readers: closed, the panel folds to a small tab at the player's edge. */
  closeLabel: 'Collapse the panel',
  /** Tooltip on the small tab at the player's edge, which opens the panel again. */
  openTip: 'Transcript',
  /** That tab's name for screen readers. */
  openLabel: 'Show the transcript',
  /** A link to the help page, at the top of Settings and under the keyboard shortcuts. */
  help: 'Help',

  // Searching the transcript
  /** Placeholder in the search box over the transcript. */
  searchPlaceholder: 'Search the transcript…',
  /** The search box's name for screen readers. */
  searchLabel: 'Search the transcript',
  /** Beside the search box: no line matches. */
  noMatches: 'No matches',
  /** Beside the search box: which match is showing, of how many. */
  matchAt: (at: number, total: number): string => `${at} of ${total}`,
  /** Beside the search box: how many lines match, before one is gone to. */
  matchesFound: (n: number): string => `${n} found`,

  // The filter button, floating over the transcript, and its menu
  /** Tooltip on the filter button. */
  filterTip: 'Filter',
  /** The filter button's name for screen readers. */
  filterLabel: 'Filter lines',
  /** Menu item: show every line. */
  filterAll: 'All lines',
  /** What that item does, for screen readers. */
  filterAllAbout: 'Every line',
  /** Menu item: lines with at least one word the learner has no card for. */
  filterNew: 'Has new words',
  /** What that item does, for screen readers. */
  filterNewAbout: 'Lines containing a word you have no card for',
  /** Menu item: lines with exactly one new word. */
  filterReady: 'Ready to learn',
  /** What that item does, for screen readers. */
  filterReadyAbout: 'Lines where only one word is new to you — the easiest to learn from',
  /** Menu item: the lines saved with their bookmark. */
  filterSaved: 'Saved',
  /** What that item does, for screen readers. */
  filterSavedAbout: 'Lines you kept for later',

  // The transcript
  /** A note over the transcript when the site shows only the line on screen, so the transcript grows as the video plays. */
  partial: 'Building as you watch — this player only exposes the current line.',
  /** The empty transcript, in that case. */
  partialEmpty: 'Nothing yet. Lines appear here as they are spoken.',
  /** The empty transcript, when the video has no subtitles loaded. */
  empty: 'No transcript loaded.',
  /** A button, shown once the line being spoken has scrolled out of view, that scrolls back to it. */
  currentLine: 'Current line',
  /** A badge on a line: how many of its words are new to the learner. */
  lineNew: (n: number): string => `${n} new`,
  /** A line's bookmark button, while the line is not saved: its tooltip and its name for screen readers. */
  saveLine: 'Save line',
  /** The same button, while the line is saved. */
  unsave: 'Unsave',
  /** Tooltip on a line's button that makes a card of the whole line. */
  addSentence: 'Add sentence',
  /** That button's name for screen readers. */
  addSentenceLabel: 'Add the sentence to Anki',

  // The summary over the transcript. Each {n} is a number, shown in bold.
  /** The bold number in summaryKnown: the share of the video's words the learner knows. */
  knownPercent: (n: number): string => `${n}%`,
  /** {n} is that share. */
  summaryKnown: '{n} known',
  /** {n} is how many new words the video has. */
  summaryNew: '{n} new',
  /** {n} is how many lines have only one new word. */
  summaryReady: '{n} ready to learn',
  /**
   * In place of the summary while the lines are counted, and over the list
   * while a filter waits for the count. percent is how far it has got.
   */
  counting: (percent: number): string => `Counting new words… ${percent}%`,
  /** The same places, when counting failed. */
  countFailed: 'Some lines could not be counted, so there are no totals.',

  // The card that shows a word's meaning while the pointer is over it
  /** The dictionary is still loading; percent is how far it has got. */
  dictionaryLoading: (percent: number): string => `Dictionary loading — ${percent}%`,
  /** The dictionary could not be opened. */
  dictionaryUnavailable: 'Dictionary unavailable',
  /** The dictionary has no entry for the word. */
  noEntry: 'No entry.',

  // The Saved tab
  /** The Saved tab with nothing in it. B is the key that saves a line. */
  savedEmpty: 'Nothing saved yet. Use the bookmark on any transcript line — or press B — to keep a sentence you want to come back to.',
  /** A badge beside the heading of the video playing now. Each heading is a video's title. */
  thisVideo: 'this video',
  /** Tooltip on a saved line's button that removes it. */
  remove: 'Remove',
  /** That button's name for screen readers. */
  removeLabel: 'Remove from saved',
  /** What the Copy button does there, for screen readers. */
  copySavedAbout: 'Copy every saved line as tab-separated text',
  /** What the Export file button does there, for screen readers. */
  exportSavedAbout: 'Save a tab-separated file Anki can import',
  /** What the Add to Anki button does there, for screen readers. */
  addSavedAbout: 'Make a card from each saved line',
  /** After Copy: how many saved lines were copied. */
  linesCopied: (n: number): string => `${n} line${n === 1 ? '' : 's'} copied.`,
  /** After Add to Anki, with no deck chosen. The deck is chosen in Settings. */
  chooseDeck: 'Choose a deck in Settings first — that is where new cards go.',
  /** While Add to Anki checks that Anki answers. */
  checkingAnki: 'Checking Anki…',
  /** Anki is closed. */
  ankiOffline: 'Anki is not running. Open it and try again — Settings has the steps.',
  /** AnkiConnect, the add-on Anki talks through, has not let the extension in. */
  ankiBlocked: 'AnkiConnect has not allowed this extension yet. Settings has the one line to add.',
  /** Anki did not answer, for another reason. */
  ankiUnreachable: 'Anki could not be reached. Settings says why.',
  /** While the cards go in: which line, of how many. */
  adding: (at: number, total: number): string => `Adding ${at} of ${total}…`,
  /** When they are in: how many were added, the deck's name in Anki, and how many it had already. */
  savedAdded: (added: number, deck: string, already: number): string =>
    `${added} added to ${deck}${already ? `, ${already} already there` : ''}.`,

  // Buttons and messages the Saved and Words tabs share
  /** Button: copy the list to the clipboard. */
  copy: 'Copy',
  /** Button: save the list as a file. */
  exportFile: 'Export file',
  /** Button: make cards in Anki. */
  addToAnki: 'Add to Anki',
  /** Copy failed. */
  noClipboard: 'Could not reach the clipboard.',
  /** After Export file. File → Import is Anki's own menu. */
  downloaded: 'Saved to your downloads. In Anki: File → Import.',
  /** Export file failed. Copy is the button. */
  downloadBlocked: 'This page blocked the download — use Copy instead.',

  // The Words tab: three lists, one showing at a time, chosen with a row of buttons
  /** The name of that row of buttons, for screen readers. */
  listsLabel: 'Which words',
  /** Button: the words the learner tracks, underlined so they notice them, without a card. */
  listTracked: 'Tracked',
  /** Button: the words marked known. */
  listKnown: 'Known',
  /** Button: the words ignored, such as names and sounds. */
  listIgnored: 'Ignored',
  /** Placeholder in the box that searches the list. */
  findPlaceholder: 'Find a word',
  /** That box's name for screen readers. */
  findLabel: 'Find a word in this list',
  /** What the Copy button does there, for screen readers. */
  copyWordsAbout: 'Copy this list as tab-separated text',
  /** What the Export file button does there, for screen readers. */
  exportWordsAbout: 'Save this list as a tab-separated file Anki can import',
  /** After Copy: how many words were copied. */
  wordsCopied: (n: number): string => `${words(n)} copied.`,
  /** Copy or Export file, with the list empty. */
  nothingToExport: 'There are no words in this list to export.',
  /** While the words' readings and meanings are looked up for the file. */
  lookingUp: 'Looking up readings and meanings…',
  /** No word matches the search; query is what was typed. */
  noWordMatches: (query: string): string => `No word in this list matches “${query}”.`,
  /** Over the words the search found: how many, of how many in the list. */
  wordsMatching: (shown: number, total: number): string => `${shown} of ${words(total)}.`,
  /**
   * The Tracked list with nothing in it. Track is a button on the word's
   * popup; Word popup is a part of Settings.
   */
  trackedEmpty: 'Nothing tracked yet. Track underlines a word so you notice it, without making a card. ' +
    'Turn its button on in Settings, under Word popup.',
  /** Over the Tracked list. */
  trackedIntro: (n: number): string =>
    `${words(n)} you're tracking, underlined wherever ${n === 1 ? 'it comes' : 'they come'} up.`,
  /** Button on a tracked word, as on its popup. */
  stopTracking: 'Stop tracking',
  /** The Known list with nothing in it. K is the key that marks a word known. */
  knownEmpty: "No words marked known. Mark one known from its popup, or press K, when you know it and don't want a card.",
  /** Over the Known list. */
  knownIntro: (n: number): string =>
    `${words(n)} marked known. Unmark a word and it goes back to what your Anki cards say.`,
  /** Button on a known word, as on its popup. */
  unmarkKnown: 'Unmark known',
  /** The Ignored list with nothing in it. */
  ignoredEmpty: 'No ignored words. Ignore names and sounds from their popup, and they are never underlined or counted.',
  /** Over the Ignored list. */
  ignoredIntro: (n: number): string => `${words(n)} never underlined or counted.`,
  /** Button on an ignored word, as on its popup. */
  stopIgnoring: 'Stop ignoring',
};
