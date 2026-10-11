/**
 * The help page's words, one set per language.
 *
 * Everything the page says is here and nowhere in its code, so a translation
 * is one more entry in HELP with the same shape. Text is plain, with two
 * marks: a word in `backticks` is drawn as a key, and {Settings → Anki →
 * Screenshot} as the path to a setting. A paragraph that is a list is numbered
 * steps; one that is { tip } is set apart; { head, rows } is a table. Keywords
 * are what someone might search for that the text itself does not say.
 */

/** A table: a header row, then rows of the same length. Cells take the same marks as text. */
export interface HelpTable {
  head: string[];
  rows: string[][];
}

/** A paragraph; numbered steps; a tip, set apart; or a table. */
export type HelpBlock = string | string[] | { tip: string } | HelpTable;

export interface HelpTopic {
  /** Stable, for links: help.html#add-card. */
  id: string;
  title: string;
  body: HelpBlock[];
  keywords?: string[];
}

export interface HelpChapter {
  id: string;
  title: string;
  /** One line on what the chapter covers. */
  about?: string;
  topics: HelpTopic[];
  /** Questions: each topic folds to its title until opened. */
  questions?: boolean;
}

export interface HelpContent {
  /** The page's title, and the line under it. */
  title: string;
  intro: string;
  /** The search box's placeholder, and what a screen reader calls it. */
  search: string;
  searchLabel: string;
  /** Said when the search finds nothing; {q} is what was searched for. */
  none: string;
  settings: string;
  /** "Popular" before the topics it links to, and those topics' ids. */
  popular: { label: string; ids: string[] };
  contents: string;
  /** What leads a tip: "Tip:". */
  tipLabel: string;
  chapters: HelpChapter[];
}

const en: HelpContent = {
  title: 'Help',
  intro: 'How Libregaku works, and answers to what people ask. Search, or pick a chapter.',
  search: 'Search…',
  searchLabel: 'Search the help',
  none: 'Nothing here mentions “{q}”.',
  settings: 'Settings',
  contents: 'Chapters',
  tipLabel: 'Tip:',
  popular: { label: 'Popular:', ids: ['add-card', 'sentence-audio', 'marks', 'tracked', 'keys', 'netflix-audio', 'update'] },
  chapters: [
    {
      id: 'start',
      title: 'Getting started',
      about: 'Three choices, then a video.',
      topics: [
        {
          id: 'get-started',
          title: 'Set it up',
          body: [
            [
              'In {Settings → Languages}, choose the language you are learning and your own language.',
              'In {Settings → Anki}, follow the steps to connect Anki, then choose the deck new cards go to.',
              'Open a YouTube or Netflix video with subtitles in the language you are learning, and rest the pointer on a word.',
            ],
            { tip: 'Anki is optional. Subtitles, lookups and the transcript all work without it; it is what remembers which words you know.' },
          ],
          keywords: ['setup', 'install', 'begin', 'first', 'language'],
        },
      ],
    },
    {
      id: 'watching',
      title: 'Watching',
      about: 'Looking words up, the transcript, and the keys.',
      topics: [
        {
          id: 'look-up',
          title: 'Look a word up',
          body: [
            'Rest the pointer on a word in the subtitle or the transcript, and its popup opens: the reading, the first three meanings, and “+N more” for the rest.',
            'The kanji and examples from the video are one line each in the popup. Click one to open it; it stays open next time.',
            'Drag across several words to look up a phrase.',
            { tip: 'Words are looked up on hover by default. {Settings → Looking words up → Look words up on} changes it to hover with `Shift` held, or a click.' },
          ],
          keywords: ['dictionary', 'definition', 'meaning', 'hover', 'click', 'shift', 'phrase', 'kanji'],
        },
        {
          id: 'transcript',
          title: 'Use the transcript panel',
          body: [
            '`S` shows or hides it. Click a line to play from there; the search box finds any line.',
            'The filter button keeps only the lines with new words, the ones with exactly one, or the ones you saved. The bookmark on a row, or `B`, saves a line; saved lines go to Anki together, or out as a file.',
          ],
          keywords: ['sidebar', 'panel', 'search', 'filter', 'save', 'bookmark', 'export'],
        },
        {
          id: 'colours',
          title: 'Change the underline colours',
          body: [
            'Each underline colour says how well you know a word: new, learning, tracked or known. {Settings → Underlines} has a colour picker for each, and Reset puts the defaults back.',
            { tip: 'Known words have no underline unless {Settings → Underlines → Underline known words} is on.' },
          ],
          keywords: ['color', 'colour', 'underline', 'palette', 'theme'],
        },
        {
          id: 'keys',
          title: 'Keyboard shortcuts',
          body: [
            {
              head: ['Key', 'What it does'],
              rows: [
                ['`←` `→`', 'Previous or next line'],
                ['`↓`', 'Replay the line'],
                ['`↑`', 'Show or hide the translation'],
                ['`A`', 'Add the word in the popup to Anki'],
                ['`K`', 'Mark the word in the popup as known'],
                ['`B`', 'Save the current line'],
                ['`S`', 'Show or hide the transcript panel'],
                ['`H`', 'Blur or unblur subtitles'],
                ['`R`', 'Switch furigana: off, new words, all (Japanese)'],
                ['`Shift`', 'Hold to look up the word under the pointer, when {Settings → Looking words up → Look words up on} is set to Hover with Shift held'],
                ['`Esc`', 'Close the popup'],
              ],
            },
            'The keyboard button in the transcript panel lists them while you watch.',
          ],
          keywords: ['shortcut', 'keyboard', 'hotkey'],
        },
      ],
    },
    {
      id: 'cards',
      title: 'Making cards',
      about: 'A word, or a whole line, into Anki.',
      topics: [
        {
          id: 'add-card',
          title: 'Make a card',
          body: [
            'Press Add to Anki at the foot of a word’s popup, or `A`. The card carries the word, its reading and meaning, the sentence and its translation, a recording of the word, the line’s own sound and a still from it.',
            { tip: 'Made one by mistake? Click Added within a few minutes to undo it.' },
            'A word Anki already has shows In Anki; click it to see the word in Anki. If Anki is closed, a new card waits in the browser and goes in when Anki next answers.',
          ],
          keywords: ['flashcard', 'anki', 'add', 'undo', 'remove'],
        },
        {
          id: 'add-line',
          title: 'Make a card of a whole sentence',
          body: [
            'In a word’s popup, the speech bubble with a + makes a card of the whole sentence instead, with its sound and a screenshot. Each line of the transcript has the same button when you point at it.',
          ],
          keywords: ['sentence', 'line', 'sentence card', 'whole line'],
        },
        {
          id: 'sentence-audio',
          title: 'Sentence audio',
          body: [
            'When you add a card from the subtitle or the transcript, for a word, a phrase or the whole sentence, Libregaku records that line from the video and puts the recording on the card. When you review, you hear the sentence as it was spoken.',
            'Chrome can only record while the video plays, so the line plays once more, and then the video goes back to where you were.',
            { tip: 'Saving a line records nothing, and nor does adding a card from the Saved or Words lists. {Settings → Anki cards → Sentence audio} turns recording off.' },
          ],
          keywords: ['audio', 'sound', 'recording', 'replay', 'voice', 'listen'],
        },
        {
          id: 'decks',
          title: 'Choose the deck',
          body: [
            'New cards go to the deck in {Settings → Anki → New cards go to}.',
            'To switch while watching, turn on {Settings → Word popup → Deck menu}. A ▾ appears beside Add to Anki; “Add to” a deck adds the card there and sends the next ones there too.',
            { tip: 'Word status is read from {Settings → Anki → Read known words from}. If new cards go to a deck it does not read, Settings says so.' },
          ],
          keywords: ['deck', 'subdeck', 'new deck'],
        },
      ],
    },
    {
      id: 'marking',
      title: 'Marking words',
      about: 'Known, Track and Ignore — none of which makes a card.',
      topics: [
        {
          id: 'marks',
          title: 'Known, Track and Ignore',
          body: [
            'The small buttons beside the word in its popup.',
            [
              'Known (`K`): you know it — no underline, and it counts as known.',
              'Track: a purple underline, so you notice the word when it comes up. Turn it on in {Settings → Word popup → Track button}.',
              'Ignore: names and sounds — never underlined, never counted.',
            ],
            'Click a mark again to take it off, or find the word in the Words tab of the transcript panel.',
          ],
          keywords: ['known', 'ignore', 'track', 'tracking', 'underline', 'mark'],
        },
        {
          id: 'tracked',
          title: 'See and change your marked words',
          body: [
            'In the transcript panel, the Words tab lists the words you track, mark known or ignore, one list each. Every word has a button to take its mark off — Stop ignoring, for an ignored one — and a tracked word can become a card from there.',
            'Each list has a search box, and Copy and Export file buttons that give you the list as a file Anki and spreadsheets open.',
          ],
          keywords: ['track', 'watchlist', 'list', 'ignored', 'known', 'unignore', 'remove mark', 'words'],
        },
      ],
    },
    {
      id: 'netflix',
      title: 'Netflix',
      about: 'What its protection changes.',
      topics: [
        {
          id: 'netflix-audio',
          title: 'Sentence audio on Netflix',
          body: [
            [
              'Open {Settings → Anki cards → Sentence audio on Netflix} and press Allow.',
              'On the Netflix tab, click the Libregaku icon in the toolbar and press Record sentence audio here. Do this once per tab.',
            ],
            'Netflix encrypts its video, so Libregaku cannot record the sound from the video as it does on YouTube. It records the tab instead, which Chrome only allows this way. For the same reason, Netflix cards have no screenshot.',
          ],
          keywords: ['netflix', 'audio', 'sound', 'permission', 'tab capture'],
        },
      ],
    },
    {
      id: 'current',
      title: 'Keeping current',
      topics: [
        {
          id: 'update',
          title: 'Load a new version',
          body: [
            [
              'Open your browser’s extensions page.',
              'Press the reload arrow on Libregaku.',
              'Reload the video tab — a tab opened before the reload keeps the old version.',
            ],
            { tip: 'The foot of Settings says when the copy you are running was built.' },
          ],
          keywords: ['reload', 'refresh', 'old version', 'build', 'brave', 'update'],
        },
      ],
    },
    {
      id: 'questions',
      title: 'Questions',
      questions: true,
      topics: [
        {
          id: 'q-track',
          title: 'What does Track do?',
          body: [
            'It underlines a word wherever it comes up — in purple, unless you change it in {Settings → Underlines} — so you notice it, without making a card. It no longer counts as new. Tracked words are listed in the transcript panel, under its Words tab.',
          ],
          keywords: ['track', 'purple'],
        },
        {
          id: 'q-still-underlined',
          title: 'Why is a word I know still underlined?',
          body: [
            'Status comes from your Anki cards, in the decks under {Settings → Anki → Read known words from}. A word whose card has not matured is underlined as learning; one with no card there, as new. A word you know without a card can be marked Known.',
          ],
          keywords: ['known', 'status', 'underline', 'scope'],
        },
        {
          id: 'q-marks-deck',
          title: 'Why is there a Libregaku::Marks deck in Anki?',
          body: [
            'Known, Track and Ignore are kept there as hidden notes, suspended so they never come up for review, so they reach your other devices through Anki’s sync. {Settings → Anki → Open marks in Anki} shows them.',
            { tip: 'Turn off {Settings → Anki → Keep marks in Anki} to keep marks in this browser only.' },
          ],
          keywords: ['marks', 'deck', 'suspended', 'sync'],
        },
        {
          id: 'q-remove',
          title: 'Can I remove a card?',
          body: [
            'Right after adding, click Added to undo it. For an older card, click In Anki in the word’s popup and delete it in Anki. Libregaku never deletes a card you have studied.',
          ],
          keywords: ['delete', 'remove', 'undo'],
        },
        {
          id: 'q-ankiweb',
          title: 'Does it work with AnkiWeb?',
          body: [
            'Not directly: Libregaku talks to Anki on your computer through the AnkiConnect add-on. Anki then syncs your cards to AnkiWeb and your phone as usual.',
          ],
          keywords: ['ankiweb', 'ankiconnect', 'phone', 'mobile', 'sync'],
        },
        {
          id: 'q-picture',
          title: 'What is the screenshot on a card?',
          body: [
            'A still of the scene, on the back of the card, so you see where the word came from. It is taken from the video on YouTube; Netflix blanks its video for extensions, so cards made there have none. {Settings → Anki cards → Screenshot} turns it off.',
          ],
          keywords: ['picture', 'image', 'screenshot', 'still'],
        },
        {
          id: 'q-replay',
          title: 'Why does the line play again when I add a card?',
          body: [
            'Its sound is recorded as it plays, so the line plays once more; playback then returns to where it was. {Settings → Anki cards → Sentence audio} turns it off.',
          ],
          keywords: ['replay', 'recording', 'sentence audio'],
        },
        {
          id: 'q-translation',
          title: 'Why is there no translation under the subtitle?',
          body: [
            'The translation is the site’s own subtitles in the language under {Settings → Languages → Your language}. If the video has none in that language there is nothing to show, and Libregaku says so. It does not machine-translate.',
          ],
          keywords: ['translation', 'second line', 'dual', 'english'],
        },
        {
          id: 'q-definitions',
          title: 'Why can definitions only be in some languages?',
          body: [
            'They come from JMdict, which has definitions in nine languages. If yours is not one of them, {Settings → Languages} shows a second row, Definitions in, for the language to use instead.',
          ],
          keywords: ['definitions', 'languages', 'jmdict', 'hungarian', 'slovenian'],
        },
        {
          id: 'q-data',
          title: 'Does Libregaku send my data anywhere?',
          body: [
            'There is no account and no server. Dictionaries are downloaded once and kept in the browser; cards go straight to Anki on your computer. While the dictionary is still downloading, a word you look up is sent to Jotoba to answer it.',
          ],
          keywords: ['privacy', 'data', 'server', 'account'],
        },
      ],
    },
  ],
};

/** Every language the help is written in. */
export const HELP: Record<string, HelpContent> = { en };

/** The help in a language, or in English where it has not been written yet. */
export function helpFor(lang: string): HelpContent {
  return HELP[lang] ?? HELP[lang.split('-')[0] ?? ''] ?? en;
}
