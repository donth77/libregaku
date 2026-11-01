/** "1 card", "2 cards": the English count the Anki strings below share. */
const cards = (n: number): string => `${n} card${n === 1 ? '' : 's'}`;

/**
 * Settings: the panel in the transcript sidebar and on the options page (src/content/settings-panel.ts).
 *
 * One panel, shown in two places: the Settings view of the transcript panel
 * beside the video, and the extension's options page. It is a run of
 * sections, each with a heading and a line on what it is for. Every setting
 * is a row: its name on the left, a switch or a menu on the right, and a
 * short explanation underneath.
 *
 * A row's name is under the setting's own key (`hoverPause`), its explanation
 * under the same key with Hint (`hoverPauseHint`), and the choices in its
 * menu under the same key with the choice (`interactionHover`).
 */
export const settings = {
  // Languages
  languagesHeading: 'Languages',
  languagesAbout: "Choose the language you're learning and your own language.",
  /** The language being learned. Its menu names each language in the interface language. */
  target: "I'm learning",
  /** A language in that menu that has only basic support so far. `language` is its name. */
  targetLimited: (language: string): string => `${language} — limited`,
  /** Under "I'm learning", for a language with readings and a dictionary: Japanese. */
  supportFull: 'Full support, including readings and furigana.',
  /** Under "I'm learning", for Chinese: full support, with pinyin (the romanised reading) above the characters. */
  supportPinyin: 'Full support, including pinyin. Definitions are in English.',
  /** Under "I'm learning", for Cantonese: full support, with Jyutping (its romanised reading) above the characters. */
  supportJyutping: 'Full support, including Jyutping. Definitions are in English.',
  /** Under "I'm learning", for a language with a dictionary and no readings to show, such as Korean or Spanish. */
  supportWords: 'Full support. Definitions are in English.',
  /**
   * A menu under "I'm learning", for a language written in more than one
   * script: Chinese, in Simplified or Traditional characters. Its choices are
   * named by the browser ("Chinese (Simplified)"). A video on Netflix or
   * YouTube often has subtitles in both, and this says which to use.
   */
  script: 'Characters',
  scriptHint: 'The ones used when a video has both.',
  /** Under "I'm learning", for a language with no dictionary yet: it is only split into words. */
  supportBasic: 'Basic support: words are split, but there is no dictionary or readings yet.',
  /**
   * The learner's own language. It also chooses the language of this
   * interface. Its menu names each language in that language ("Español",
   * "한국어"), so it can be found whatever the interface is in.
   */
  native: 'Your language',
  nativeHint: 'Translations and definitions are shown in this language, where the video and the dictionary have it.',
  /** The language definitions are shown in. The row appears only when the dictionary has none in your language. */
  definitions: 'Definitions in',
  /** Its explanation, shown only until the panel names your language with definitionsHintFor. */
  definitionsHint: 'The dictionary has no definitions in your language, so they are shown in this one.',
  /** Its explanation. `language` is your language's name, as it reads inside a sentence. */
  definitionsHintFor: (language: string): string =>
    `The dictionary has no definitions in ${language}, so they're shown in this language.`,

  // Looking words up
  lookupHeading: 'Looking words up',
  lookupAbout: 'Choose how and when word lookups appear.',
  /** What opens a word's popup. */
  interaction: 'Look words up on',
  /** Choice: resting the pointer on a word. */
  interactionHover: 'Hover',
  /** Choice: resting the pointer on a word while holding the Shift key. */
  interactionShift: 'Hover with Shift held',
  /** Choice: clicking a word. */
  interactionClick: 'Click',
  interactionHint: 'Clicking a word always works too.',
  hoverPause: 'Pause while looking up',
  hoverPauseHint: 'Pauses the video while your pointer is on a word.',
  /** A short definition when pointing at a word in the transcript panel's lines. */
  sidebarHover: 'Quick definitions in the transcript',
  sidebarHoverHint: 'Shows a short definition when you point at a word in the transcript.',

  // Word popup: the card that opens on a word
  popupHeading: 'Word popup',
  popupAbout: 'Choose what the popup shows when you look up a word.',
  /** A small menu beside the popup's Add to Anki button. */
  cardDeckMenu: 'Deck menu',
  /** ▾ is the menu's arrow, shown as it is. Add to Anki is the popup's button, named as the popup names it. */
  cardDeckMenuHint: 'Adds a ▾ next to Add to Anki for choosing another deck. New cards then go there.',
  /** Leaves the popup's Add to Anki button off, with the deck menu beside it. Add to Anki is the button's name. */
  cardHideAdd: 'Hide Add to Anki',
  cardHideAddHint: 'Leaves the Add to Anki button, and the deck menu beside it, off the card.',
  /** The kanji in a word, each with its meanings and readings, on the popup. */
  cardKanji: 'Kanji breakdown',
  cardKanjiHint: "Shows each kanji's meanings and readings.",
  /** The same setting where the language being learned is Chinese: its characters, not called kanji. */
  cardHanzi: 'Character breakdown',
  cardHanziHint: "Shows each character's meanings and readings.",
  /** Other subtitle lines in the same video that use the word, on its popup. */
  lookupElsewhere: 'Examples from this video',
  lookupElsewhereHint: 'Shows other sentences in this video that use the word. Click one to play it.',

  // Subtitles
  subtitlesHeading: 'Subtitles',
  subtitlesAbout: 'Adjust how subtitles look on the video.',
  /** Readings in small kana over kanji. */
  ruby: 'Furigana',
  /** Choice: over words with no card yet. */
  rubyUnknown: 'New words',
  /** Choice: over every word. */
  rubyAlways: 'All',
  rubyNever: 'Off',
  /** R is the key, shown as it is. */
  rubyHint: 'Readings above kanji. Press R to switch while watching.',
  /** The same setting where the language being learned is Chinese: pinyin, the romanised reading, above the characters. */
  pinyin: 'Pinyin',
  pinyinHint: 'Readings above characters. Press R to switch while watching.',
  /** The same setting where the language being learned is Cantonese: Jyutping, its romanised reading. */
  jyutping: 'Jyutping',
  jyutpingHint: 'Readings above characters. Press R to switch while watching.',
  blurPrimary: 'Blur subtitles',
  /** H is the key, shown as it is. */
  blurPrimaryHint: 'For listening practice: subtitles stay blurred until you point at them. Press H to switch.',
  showSubtitles: 'Subtitles on the video',
  showSubtitlesHint: 'Draws the subtitles over the video. Off keeps the header, the transcript and the panel. The header button steps through translation off, subtitles off, then both on; ↑ does the same.',
  subtitleSize: 'Text size',
  /** A choice in its menu: the size as a percentage of the usual one. */
  subtitleSizeOption: (percent: number): string => `${percent}%`,
  subtitleSizeHint: 'Scales with the player, so it looks the same in fullscreen.',
  /** How far up the player the subtitles sit. Its choices go from lowest to highest. */
  subtitleBottom: 'Position',
  subtitleBottomLowest: 'Lowest',
  subtitleBottomLow: 'Low',
  subtitleBottomNormal: 'Normal',
  subtitleBottomRaised: 'Raised',
  subtitleBottomHigh: 'High',
  subtitleBottomHighest: 'Highest',
  subtitleBottomHint: 'How high subtitles sit. Another subtitle extension on the same player stays below them.',
  /** A second line under each subtitle, in your own language. */
  dualSubtitles: 'Show translation subtitles',
  dualSubtitlesHint:
    "Shows subtitles in your language under the ones you're learning. They come from the site, " +
    'not machine translation, and need a full transcript of the video.',
  /** The player's letter keys (A, K, R, H, B, S) working on their own, without Alt or Shift. */
  singleKeys: 'Single-key shortcuts',
  /** A and R are keys, and Alt and Shift the keyboard's keys, as the keyboard names them. */
  singleKeysHint:
    'Letter keys such as A and R work on their own while watching. Off: hold Alt and Shift with them. ' +
    'The arrow keys work either way.',

  // Underlines: the colour under each word says how well it is known
  underlinesHeading: 'Underlines',
  underlinesAbout: 'Each colour shows how well you know a word. Click one to change it.',
  /** The switch for every underline at once. */
  underlines: 'Underline words',
  underlinesHint: 'Turn off for plain subtitles, with no colours under words.',
  /** The underline colour for words with no card. */
  colorUnknown: 'New words',
  colorUnknownHint: 'Words with no card in Anki.',
  /** The underline colour for words still being learned. */
  colorLearning: 'Learning',
  colorLearningHint: "Words with a card that isn't mature yet.",
  /** The underline colour for words marked with the popup's Track button. */
  colorTracking: 'Tracked',
  colorTrackingHint: "Words you're tracking.",
  /** The underline colour for words already known. */
  colorKnown: 'Known',
  colorKnownHint: 'Words with a mature card, or marked known.',
  markKnown: 'Underline known words',
  markKnownHint: 'Off by default, so the screen gets quieter as you learn.',
  /** Shown for Spanish, French and German. Articles: the, a. Pronouns: I, you, he. */
  underlineGrammar: 'Underline articles and pronouns',
  underlineGrammarHint: 'Off by default: words like “the”, “I” and “he” can still be looked up, but are not counted as words to learn.',
  /** A row with one button, which puts every underline colour back to its default. */
  defaultColours: 'Default colours',
  /** That button. */
  resetColours: 'Reset',

  // Transcript: the panel beside the video
  transcriptHeading: 'Transcript',
  transcriptAbout: 'The panel beside the video that lists every subtitle line.',
  /** Keep the line being spoken in view as the video plays. */
  sidebarFollow: 'Scroll with the video',
  sidebarFollowHint: 'Keeps the current line in view. Scrolling yourself pauses this; a button resumes it.',
  /** The bar across the top of the video. */
  headerBar: 'Show the header',
  headerBarHint: 'Appears along the top of the video when your pointer is near it.',
  /** How the header names the language being learned. */
  languageBadge: 'Language badge',
  /** Choice: by a country's flag. */
  languageBadgeFlag: 'Flag',
  /** Choice: by its language code, such as JA. */
  languageBadgeCode: 'Code',
  /** A menu of country flags, for the badge of the language being learned. */
  badgeFlag: 'Badge flag',
  /** Choice: the language's own flag, which is shown before the word. */
  badgeFlagDefault: 'Default',
  /** Placeholder in the box that searches the flags, by country name. */
  flagSearch: 'Search…',
  /** That box's name for screen readers. */
  flagSearchLabel: 'Search countries',
  /** Over the flags of the countries where the language being learned is spoken. */
  flagSuggested: 'Suggested',
  /** Over every other country's flag. */
  flagAll: 'All countries',
  /** No country matches the search; `query` is what was typed. */
  flagNone: (query: string): string => `No country matches “${query}”.`,
  badgeFlagHint: "The flag to show for the language you're learning. Each language keeps its own.",
  languageBadgeHint: "How the header shows the language you're learning.",
  sidebarStats: 'Count new words',
  sidebarStatsHint: 'Shows new-word counts on each line, your known-word percentage, and the filters that use them.',

  // Anki: connecting it, and its decks
  ankiHeading: 'Anki',
  ankiAbout: 'Connect Anki, choose where new cards go, and which decks count as words you know.',
  /** A menu of the decks in Anki. */
  deck: 'New cards go to',
  deckHint: 'The deck every new card is added to.',
  /** A menu of the decks in Anki, or all of them. */
  statusScope: 'Read known words from',
  statusScopeHint: 'Cards in these decks decide which words are underlined. Includes subdecks.',
  /** Marks are the popup's Known, Track and Ignore. */
  marksInAnki: 'Keep marks in Anki',
  /** Known, Track and Ignore are the popup's buttons, named as the popup names them. Libregaku::Marks is a deck's name, kept as it is. */
  marksInAnkiHint:
    'Saves Known, Track and Ignore as hidden notes in Anki (Libregaku::Marks) so they sync to your other ' +
    'devices. Off: they stay in this browser.',

  // The deck menus. Deck names come from Anki and are shown as they are.
  /** First choice in "Read known words from": every deck. */
  wholeCollection: 'Whole collection',
  /** First choice in "New cards go to" while none is chosen. It cannot be picked. */
  chooseDeck: 'Choose a deck…',
  /** A choice for a deck that was chosen before but Anki no longer has. It cannot be picked. */
  deckNotInAnki: (deck: string): string => `${deck} — not in Anki`,
  /** A deck in "Read known words from", which reads the decks inside it too. */
  deckAndSubdecks: (deck: string): string => `${deck} (and subdecks)`,
  /** A warning under "New cards go to" while no deck is chosen. */
  deckUnset: "Choose a deck. Cards can't be added until you do.",
  /** A warning under "New cards go to". */
  deckMissing: (deck: string): string => `Anki no longer has a deck called “${deck}”. Choose another.`,
  /** A warning under "Read known words from". */
  statusScopeMissing: (deck: string): string =>
    `Anki no longer has a deck called “${deck}”, so every word shows as new. Choose another.`,
  /**
   * A warning under "Read known words from", when it leaves out the deck new
   * cards go to. `deck` is that deck. Whole collection is the menu's first
   * choice, named as wholeCollection names it.
   */
  statusScopeOutside: (deck: string): string =>
    `New cards go to “${deck}”, which isn't included here, so words you add will stay underlined as new. ` +
    'Choose a deck that contains it, or Whole collection.',

  // Where Anki stands: one line of whole sentences, shown one after another
  /** While asking Anki whether it is there. */
  ankiChecking: 'Checking…',
  ankiConnected: 'Connected.',
  /** After "Connected.", the first time: the extension added its card type to Anki. */
  noteTypeInstalled: 'Note type installed.',
  /** How many cards in Anki the extension made. */
  cardsMade: (n: number): string => `${cards(n)} made with Libregaku.`,
  noCards: 'No cards yet.',
  /** Cards made while Anki was closed, just added now that it is open. */
  cardsFlushed: (n: number): string => `Added ${cards(n)} made while Anki was closed.`,
  /** Cards made while Anki was closed that it would not take. `error` is the reason, from Anki or the browser. */
  cardsNotFlushed: (n: number, error: string): string => `${cards(n)} couldn't be added: ${error}`,
  /** Cards made while Anki was closed, still waiting. Last in the line, whatever came before. */
  cardsWaiting: (n: number): string => `${cards(n)} waiting to go in.`,
  /** Nothing answers on Anki's port, which is normal while Anki is closed. */
  ankiOffline: (port: number): string =>
    `Anki isn't responding on port ${port}. That's expected while it's closed: ` +
    'new cards wait here and are added when it opens.',
  ankiBlocked: "Anki is running, but AnkiConnect doesn't allow this extension yet.",
  /** Another program holds Anki's port. `detail` is a sentence saying what answered on it. */
  ankiOccupied: (detail: string): string => `${detail} Close the program using it so Anki can.`,

  // The Anki buttons
  /** Button: ask Anki again whether it is there. */
  checkAgain: 'Check again',
  /** Button: make a deck in Anki for new cards. */
  newDeck: 'New deck',
  /** Button: show the cards the extension made, in Anki's browser. */
  openCards: 'Open cards in Anki',
  /** Button: show the marks (Known, Track, Ignore) in Anki's browser. */
  openMarks: 'Open marks in Anki',
  /** The browser's prompt after New deck. :: is how Anki writes a deck inside another; the example is a deck name. */
  newDeckPrompt: 'Name the new deck. Use :: for a subdeck, e.g. Japanese::Netflix',

  // Connecting Anki: numbered steps, each shown only while it is still to do
  /** {link} is a link reading getAnki. */
  installStep: 'Install Anki on this computer and open it. {link}',
  getAnki: 'Get Anki',
  /** {menu} is addonMenu, in bold. Then comes a code to copy, then a link reading aboutAnkiConnect. */
  addonStep: 'In Anki, go to {menu}, paste this code, then restart Anki.',
  /** Anki's own menus, as Anki names them in this language. */
  addonMenu: 'Tools → Add-ons → Get Add-ons…',
  aboutAnkiConnect: 'About AnkiConnect',
  /** {menu} is originMenu, in bold. {setting} is webCorsOriginList, an AnkiConnect setting's name. A line to copy follows. */
  originStep: 'In Anki, go to {menu}, add this line to {setting}, then restart Anki.',
  /** Anki's own menus, as Anki names them in this language. AnkiConnect is the add-on's name. */
  originMenu: 'Tools → Add-ons → AnkiConnect → Config',
  runningStep: 'Keep Anki open while you watch. Cards go straight to Anki on this computer.',
  /** Button beside a code or line to copy. It is shown in capitals. */
  copy: 'Copy',
  /** That button's name for screen readers. `value` is what it copies. */
  copyValue: (value: string): string => `Copy ${value}`,
  /** The button for a moment after copying. */
  copied: 'Copied',
  /** The button for a moment when copying failed, so it has to be selected and copied by hand. */
  copyFailed: 'Select it',

  // Anki cards: what goes on a new card
  ankiCardsHeading: 'Anki cards',
  ankiCardsAbout: "Choose what's added to each new card, besides the word, reading, meaning and sentence.",
  cardAudio: 'Word audio',
  cardAudioHint: 'A recording of the word, when one exists. Never a synthetic voice.',
  /** The sound of the subtitle line. */
  cardSentenceAudio: 'Sentence audio',
  cardSentenceAudioHint: 'Records the sentence by playing it once more. On protected sites, this needs the permission below.',
  /** A still from the video. */
  cardScreenshot: 'Screenshot',
  cardScreenshotHint: 'A still of the scene. Not available on protected sites, which block it.',
  /** A row with a button, for the browser's permission to record a tab's sound. */
  capture: 'Sentence audio on protected sites',
  /** Button: ask for the permission. */
  captureAllow: 'Allow',
  /** Button, in the transcript panel, which cannot ask: it opens the options page, which can. */
  captureAllowInSettings: 'Allow in settings',
  /** Button: give the permission back. */
  captureRemove: 'Remove',
  /** Once allowed. Record sentence audio here is the toolbar popup's button, named as the popup names it. */
  captureAllowed: 'Allowed. On each tab of a protected site, click the Libregaku icon and choose Record sentence audio here.',
  /** Until allowed. */
  captureNeeded: 'Protected sites encrypt their video, so sentence audio is recorded from the tab. This needs your permission.',

  // Data and licences: credits for the data and code the extension uses. Their names are kept as they are.
  creditsHeading: 'Data and licences',
  /** Under JMdict · KANJIDIC2. */
  creditJmdict:
    'Dictionary and kanji data © the Electronic Dictionary Research and Development Group, used ' +
    'under CC BY-SA 4.0. Repackaged as JSON by jmdict-simplified.',
  /** Under Lindera · IPADIC · UniDic · mecab-ko-dic. */
  creditLindera:
    'Splits Japanese, Korean and Chinese into words. MIT licence; IPADIC, UniDic, mecab-ko-dic and CC-CEDICT have their own terms.',
  /** Under CC-CEDICT, the Chinese dictionary. */
  creditCedict: 'Chinese dictionary © MDBG and its contributors, used under CC BY-SA 4.0.',
  /** Under Wiktionary. kaikki.org and wiktionary-to-yomitan are the projects that turn Wiktionary into data files. */
  creditWiktionary:
    'Korean and Spanish dictionaries, and some in your own language, from Wiktionary through kaikki.org and ' +
    'wiktionary-to-yomitan. CC BY-SA 4.0.',
  /** Under 한국어기초사전 · KRDict, Korea's dictionary for learners. Lyroxide made the files Libregaku downloads. */
  creditKrdict:
    'Korean words explained in your own language. © National Institute of Korean Language, used under CC BY-SA 2.0 KR. ' +
    'Files by Lyroxide.',
  /** Under CFDICT · CxDICT, a Chinese–French dictionary. */
  creditCfdict: 'Chinese explained in French. CFDICT © chine.in, kept up to date by CxDICT. CC BY-SA 4.0.',
  /** Under CC-Canto, the Cantonese dictionary, made by Pleco. */
  creditCanto: 'Cantonese dictionary and Jyutping readings for CC-CEDICT. © Pleco Inc., used under CC BY-SA 3.0.',
  /** Under HanDeDict, a Chinese–German dictionary. */
  creditHandedict: 'Chinese explained in German. © HanDeDict and its contributors, used under CC BY-SA 3.0.',
  /** Under Unihan, the Unicode database of Chinese characters. */
  creditUnihan: 'Which reading a Chinese character shows first. © Unicode, Inc., used under the Unicode License.',
  /** Under Tatoeba, a collection of example sentences and their translations. */
  creditTatoeba:
    'Which verb a Japanese verb written in kana is, learned from these example sentences. ' +
    '© Tatoeba contributors, used under CC BY 2.0 FR.',
  /** Under Jotoba · Jisho. */
  creditJotoba: 'Used for lookups while the dictionary downloads. Both use JMdict.',
  /**
   * Under Lingua Libre · Wikimedia Commons: recordings of single words, played
   * by the lookup card's Pronounce button and put on new cards.
   */
  creditCommons:
    'Recordings of Spanish, Chinese and Korean words, spoken by volunteers. Each has its own licence, ' +
    'CC BY-SA 4.0 for most, named with its speaker where it plays and on the card.',
  /** Under audio-cmn · Shtooka. Yue Tan is the speaker's name; Caen is a city in France. */
  creditAudioCmn: 'Recordings of Chinese words by Yue Tan, University of Caen. CC BY-SA 3.0 US.',
  /** Under Naver Dictionary: Korean recordings, heard on the lookup card only. */
  creditNaver:
    'Recordings of Korean words from Naver Dictionary, played on the lookup card only. ' +
    'They are not licensed for reuse, so they are never put on a card.',
  /** Under SpanishDict: a generated voice for Spanish words, heard on the Pronounce button only. */
  creditSpanishdict:
    'A generated voice for Spanish words from SpanishDict, played by the Pronounce button when there is no recording. ' +
    'It is not licensed for reuse, so it is never put on a card.',
  /** Under Lucide. */
  creditLucide: 'Icons. ISC licence.',
  licence: 'Libregaku is MIT-licensed. Dictionary data is downloaded from its sources, not bundled.',
  /** The last line. `when` is a date and time, such as "Oct 10, 9:08 PM". */
  built: (when: string): string => `This copy was built ${when}.`,

  // The keyboard shortcuts view: what each key does. The keys are shown as they are, beside these.
  /** ← and →. */
  keyLine: 'Previous or next line',
  /** ↓. */
  keyReplay: 'Replay the line',
  /** ↑. */
  keyTranslation: 'Show or hide the translation',
  /** Shift, listed only while words are looked up by hovering with Shift held. */
  keyShiftLookup: 'Hold to look up the word under the pointer',
  /** A. */
  keyAdd: 'Add the word in the popup to Anki',
  /** K. */
  keyKnown: 'Mark the word in the popup as known',
  /** R. Its three settings, in the order it steps through them. */
  keyFurigana: 'Switch furigana: off, new words, all',
  /** The same key where the language being learned is Chinese. */
  keyPinyin: 'Switch pinyin: off, new words, all',
  keyJyutping: 'Switch Jyutping: off, new words, all',
  /** H. */
  keyBlur: 'Blur or unblur subtitles',
  /** B. Saves the line to the transcript panel's Saved tab. */
  keySave: 'Save the current line',
  /** S. */
  keyTranscript: 'Show or hide the transcript panel',
  /** Esc. */
  keyClose: 'Close the popup',
};
