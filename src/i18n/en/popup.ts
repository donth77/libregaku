/** The lookup card, the card for a whole line, and phrases (src/content/popup.ts, line-card.ts, phrase.ts). */
export const popup = {
  // The card, and the word at its head
  /** The card's name, as a screen reader announces it: the word looked up, then what the card is. */
  cardLabel: (word: string): string => `${word} — dictionary`,
  /** A small badge under the word, when the dictionary marks it as a common word. */
  commonBadge: 'common',
  /**
   * The heading over the characters a word is written with, by what the
   * language being learned calls them: kanji in Japanese, and for Chinese
   * simply its characters.
   */
  characterNames: { kanji: 'Kanji', hanzi: 'Characters' },
  /**
   * Parts of speech, under the word, keyed by the dictionary's code for each:
   * JMdict's for Japanese, then Wiktionary's for Korean and Spanish. Several show separated by commas, and a name two codes
   * share shows once. They are the names Japanese grammar gives them: godan
   * and ichidan verbs are its two regular conjugations, suru and kuru verbs
   * are する and 来る, and an i-, na- or no-adjective is named for its ending.
   */
  partOfSpeech: {
    n: 'noun', 'n-adv': 'adverbial noun', 'n-t': 'temporal noun', 'n-suf': 'noun suffix',
    'n-pref': 'noun prefix', pn: 'pronoun', 'adj-i': 'i-adjective', 'adj-na': 'na-adjective',
    'adj-no': 'no-adjective', 'adj-pn': 'pre-noun adjectival', adv: 'adverb', 'adv-to': 'adverb',
    aux: 'auxiliary', 'aux-v': 'auxiliary verb', 'aux-adj': 'auxiliary adjective',
    conj: 'conjunction', cop: 'copula', ctr: 'counter', exp: 'expression', int: 'interjection',
    num: 'numeric', prt: 'particle', pref: 'prefix', suf: 'suffix', unc: 'unclassified',
    vs: 'suru verb', 'vs-i': 'suru verb', 'vs-s': 'suru verb', vt: 'transitive', vi: 'intransitive',
    v1: 'ichidan verb', 'v1-s': 'ichidan verb', vk: 'kuru verb', vz: 'zuru verb',
    v5b: 'godan verb', v5g: 'godan verb', v5k: 'godan verb', 'v5k-s': 'godan verb',
    v5m: 'godan verb', v5n: 'godan verb', v5r: 'godan verb', 'v5r-i': 'godan verb',
    v5s: 'godan verb', v5t: 'godan verb', v5u: 'godan verb', 'v5u-s': 'godan verb',
    v5aru: 'godan verb',
    // Wiktionary's codes, for Korean and Spanish words. Where one is also
    // JMdict's (n, adv, conj, num, pref, suf, vt, vi, aux) the name above
    // serves both. What kind of word, then its grammar:
    name: 'proper noun', v: 'verb', adj: 'adjective', pron: 'pronoun', det: 'determiner', artic: 'article',
    counter: 'counter', prep: 'preposition', 'prep-phrase': 'prepositional phrase', ptcl: 'particle',
    intj: 'interjection', phrase: 'phrase', prov: 'proverb', r: 'root', char: 'character', adn: 'adnominal',
    ptcpl: 'participle', contr: 'contraction',
    masc: 'masculine', fem: 'feminine', neut: 'neuter', sg: 'singular', pl: 'plural', 'pl-only': 'plural only',
    count: 'countable', uncount: 'uncountable', vr: 'reflexive', vdt: 'ditransitive', impers: 'impersonal',
    irreg: 'irregular', reltnl: 'relational', reltv: 'relative', interr: 'interrogative', poss: 'possessive',
    dim: 'diminutive', aug: 'augmentative', onoma: 'onomatopoeic',
    // And how or when the word is used:
    idio: 'idiomatic', fig: 'figurative', literal: 'literal', col: 'colloquial', inf: 'informal', fam: 'familiar',
    formal: 'formal', polite: 'polite', lit: 'literary', poet: 'poetic', rhet: 'rhetorical', sl: 'slang',
    vulg: 'vulgar', derog: 'derogatory', offens: 'offensive', humor: 'humorous', euph: 'euphemistic',
    child: 'childish', net: 'Internet', neol: 'neologism', cmn: 'common', uncmmn: 'uncommon', rare: 'rare',
    dated: 'dated', arch: 'archaic', obs: 'obsolete', hist: 'historical', 'non-std': 'nonstandard',
    dialect: 'dialectal', regio: 'regional',
  },

  // The row of icon buttons under the word, each named in its tooltip
  /** Button: say the word aloud. */
  pronounce: 'Pronounce',
  /** Said on the card once the word has played, from a recording of someone saying it. */
  playedRecording: (word: string): string => `${word} · recording`,
  /** Said on the card once the word has played, in the browser's synthesised voice. */
  playedSynthesised: (word: string): string => `${word} · synthesised`,
  /** Said on the card when the word could not be played. */
  pronounceFailed: 'could not play audio',
  /** Button: make a card of the whole subtitle line, with its sound and a still. */
  addSentence: 'Add sentence',
  /** The same button's tooltip once that card is in and can no longer be taken back. */
  sentenceAdded: 'Sentence added',
  /** Tooltip on a button whose card was just added: pressing it takes the card back out. On this one and on Add. */
  undo: 'Undo',
  /** Button: copy the word. */
  copyWord: 'Copy word',
  /** Button, in place of Copy word when the card is for words selected on the line: copy them as written. */
  copyPhrase: 'Copy phrase',
  /** Button: copy the whole subtitle line. */
  copySentence: 'Copy sentence',
  /** Said on the card once each has been copied. */
  wordCopied: 'word copied',
  phraseCopied: 'phrase copied',
  sentenceCopied: 'sentence copied',
  /** Said on the card when the browser will not copy. */
  copyFailed: 'could not copy — select the text instead',

  // The meanings
  /** In place of the meanings while the dictionary downloads. `percent` is how much of it has arrived. */
  dictionaryLoading: (percent: number): string => `Dictionary still loading — ${percent}%. Try again in a moment.`,
  /** In place of the meanings when the dictionary failed. `error` is the reason, from elsewhere. */
  dictionaryUnavailable: (error: string): string => `Dictionary unavailable: ${error}`,
  /** In place of the meanings when the dictionary has no entry. */
  noEntry: 'No dictionary entry for this word.',
  /** A link under the first meanings that shows the rest. `n` is how many more there are. */
  moreMeanings: (n: number): string => `+${n} more meaning${n === 1 ? '' : 's'}`,

  // The word's other lines in this video: a section that opens from its heading
  /** The section's heading. `n` is how many other lines have the word. */
  elsewhereCount: (n: number): string => (n === 1 ? 'Once more in this video' : `${n} more times in this video`),
  /** Tooltip on each of those lines: clicking one plays the video from there. */
  playLine: 'Play',
  /** Under the lines listed, when there are more. `n` is how many more. */
  elsewhereMore: (n: number): string => `and ${n} more — the transcript's search finds them all`,
  /**
   * In its place, a button that searches the transcript panel for every line
   * with the word, opening the panel if it is closed.
   */
  showAllInTranscript: 'Show all in transcript',

  // Add: the wide button at the foot of the card, which makes a card of the word in Anki
  /** The button, its tooltip, and its name for screen readers. */
  addToAnki: 'Add to Anki',
  /** Its tooltip, when settings name the deck new cards go to; and each deck in the deck menu. */
  addToDeck: (deck: string): string => `Add to ${deck}`,
  /** The button while the card is being made, and while it is being taken back out. */
  adding: 'Adding…',
  undoing: 'Undoing…',
  /** The button once the card is in; its tooltip too, once the card can no longer be taken back. */
  added: 'Added',
  /** The button on a word Anki already has a card for, and its tooltip: pressing it shows that card in Anki. */
  inAnki: 'In Anki',
  showInAnki: 'Show in Anki',
  /** The button, and its tooltip, when the card was made while Anki was closed and goes in once it opens. */
  waiting: 'Waiting',
  waitingForAnki: 'Waiting for Anki',
  /** Said when that button is pressed. */
  goesInWhenAnkiOpens: 'It goes into Anki when Anki opens',
  /** Said when A, the key for Add, is pressed again: the card was just added, Anki has one, or one is waiting. */
  alreadyAdded: 'Already added',
  alreadyInAnki: 'Already in Anki',
  waitingForAnkiToOpen: 'Waiting for Anki to open',
  /** Said once a card is in a deck that needs a warning. `said` and `warning` are whole messages from elsewhere. */
  addedWithWarning: (said: string, warning: string): string => `${said} — ${warning}`,

  // The deck menu, from a ▾ button beside Add
  /** The ▾ button's tooltip. */
  otherDecks: 'Other decks',
  /** The same button's name, for screen readers. */
  addToAnotherDeck: 'Add to another deck',
  /** In the menu, in place of the decks, while Anki cannot be reached. */
  decksUnknown: 'Anki is not answering, so its decks are not known yet.',
  /** The menu's last item: make a new deck and add the card there. */
  newDeck: 'New deck…',
  /**
   * The browser's prompt for the new deck's name. "::" is how Anki puts one
   * deck inside another, so it stays as it is, in the example too.
   */
  newDeckPrompt: 'New deck — use :: for a subdeck, as in Japanese::Netflix',

  // The marks: round buttons beside the word, for what the learner knows without a card
  /** Their names, for screen readers. */
  knownButton: 'Known',
  trackButton: 'Track',
  ignoreButton: 'Ignore',
  /** Their tooltips: what pressing each does. */
  markKnownTip: 'Mark known',
  trackTip: 'Track',
  ignoreTip: 'Ignore',
  /** Their tooltips once the word has that mark, when pressing again takes it off. */
  unmarkKnownTip: 'Unmark known',
  stopTrackingTip: 'Stop tracking',
  stopIgnoringTip: 'Stop ignoring',
};
