import type { OverrideStatus } from '../../anki/status';
import type { MissingMedia } from '../../content/capture';

/**
 * What a card went in without, joined with "or", for `added` and
 * `sentenceAdded`: 'audio' is the line's sound; 'audio-encrypted' is the same
 * on a video that can be recorded only once the Libregaku icon in the
 * toolbar has been clicked.
 */
const without = (missing: readonly MissingMedia[]): string =>
  missing
    .map((m) => (m === 'audio-encrypted' ? 'sentence audio (click the Libregaku icon to record here)' : 'sentence audio'))
    .join(' or ');

/**
 * What the page says over the player: flashes, card results, keys, capture
 * (src/content/index.ts and its helpers).
 *
 * A flash is a word or two in a pill over the picture for a moment, saying
 * what a key just did. A card result is said on the lookup card, under the
 * Add button, or over the player when a key made the card; it starts in
 * lowercase where it can follow a word ("食べる · added to Vocabulary").
 * `deck` is always the name of an Anki deck, as Anki has it.
 */
export const player = {
  // The player's keys (←, →, ↓, ↑, R, H, B, A, K), said in a flash
  /** → pressed on the last line of the video. */
  lastLine: 'That was the last line',
  /** ← or ↓ pressed with no line before. */
  noLineBefore: 'No line before this',
  /** ↑ turned the translation under the subtitle on, or off. */
  translationOn: 'Translation on',
  translationOff: 'Translation off',
  subtitlesOff: 'Subtitles off',
  subtitlesOn: 'Subtitles on',
  /** H blurred the subtitle line; it shows while the pointer is over it. */
  blurOn: 'Subtitle blurred until you hover it',
  /** H again: the subtitle shows plainly. */
  blurOff: 'Subtitle shown',
  /** B saved the line on screen to the panel's saved lines, or took it off them. */
  lineSaved: 'Line saved',
  lineUnsaved: 'Line no longer saved',
  /** A or K pressed with no word looked up in the last 90 seconds. */
  lookUpFirst: 'Look a word up first',
  /** K on a word its Anki cards already make known, so there is nothing to mark. */
  alreadyKnown: (word: string): string => `${word} · already known in Anki`,
  /** A on a word that already has a card. */
  alreadyInAnki: (word: string): string => `${word} · already in Anki`,
  /** A pressed: the card for `word` is being made. */
  adding: (word: string): string => `Adding ${word}…`,
  /** A word, then what happened to its card: `said` is a card result below, such as `added`. */
  wordResult: (word: string, said: string): string => `${word} · ${said}`,

  // Marks: a word marked known, tracked, ignored or new by hand. A mark is a hidden note, not a card, so each says no card was made
  /** The mark on `word` was taken off. */
  markOff: (word: string): string => `${word} · mark taken off`,
  /**
   * `word` was marked. `status` is the mark: 'known'; 'tracking', listed in
   * the Tracked list under the panel's Saved tab; 'ignored'; or 'unknown', marked new. `refused`
   * is true when Anki refused the mark: it is kept in the browser and tried
   * again later.
   */
  marked: (word: string, status: OverrideStatus, refused: boolean): string => {
    const done = { known: 'marked known', tracking: 'tracked', ignored: 'ignored', unknown: 'marked new' }[status];
    if (refused) return `${word} · ${done}, no card — Anki refused it; trying again later`;
    return `${word} · ${done}, no card${status === 'tracking' ? ". See Saved in the panel" : ''}`;
  },

  // A word's card: what Add, A, or Add to Anki on the Tracked list says happened
  /** Add pressed before a deck was chosen. An error. */
  pickDeck: 'Pick a deck in Libregaku settings first',
  /** The card went into `deck`; `missing` is what it went in without, often nothing. */
  added: (deck: string, missing: readonly MissingMedia[]): string =>
    missing.length ? `added to ${deck} — without ${without(missing)}` : `added to ${deck}`,
  /** Anki already had this card. */
  alreadyIn: (deck: string): string => `already in ${deck}`,
  /** Anki is closed: the card is kept in the browser, and goes into `deck` once Anki opens. */
  queued: (deck: string): string => `Anki is closed — this goes to ${deck} when it opens`,
  /** The card is already kept, waiting for Anki to open. */
  alreadyQueued: 'already waiting for Anki',
  /** Anki is closed, and the browser refused to store the card. An error, for word and sentence cards alike. */
  notKept: 'Anki is closed, and the browser would not keep the card for later',
  /** Undo: the card just added is out of `deck` again. */
  takenBack: (deck: string): string => `taken back out of ${deck}`,
  /** Undo on a card kept for Anki: it is not kept any more. */
  unqueued: 'no longer waiting for Anki',
  /** Undo came too late: the kept card had already gone into Anki. An error. */
  alreadySent: 'It has already gone into Anki',
  /** Anki opened, and `count` cards kept while it was closed went in. A flash. */
  queueSent: (count: number): string => `Anki is open — added ${count === 1 ? 'the card' : `${count} cards`} kept for it`,
  /**
   * A deck picked from the lookup card's deck menu that word status does not
   * read: the words you know come from the deck `scope` and its subdecks, so
   * cards in `deck` will not count. Follows a card result after a dash.
   */
  deckOutsideScope: (scope: string, deck: string): string =>
    `words you know are read from ${scope}, so cards in ${deck} will not count`,

  // A sentence card: the whole line made into a card, from the lookup card or a transcript line
  /** The line's card went into `deck`; `missing` is what it went in without, often nothing. */
  sentenceAdded: (deck: string, missing: readonly MissingMedia[]): string =>
    missing.length ? `sentence added to ${deck} — without ${without(missing)}` : `sentence added to ${deck}`,
  /** Anki already had a card for this line. */
  sentenceAlreadyIn: (deck: string): string => `the sentence is already in ${deck}`,
  /**
   * Anki is closed: the line's card is kept and goes into `deck` once Anki
   * opens. A card kept for later goes in without the line's sound and
   * picture: `sound` and `picture` are true when settings would have put
   * them on it, and so it says it goes without them.
   */
  sentenceQueued: (deck: string, sound: boolean, picture: boolean): string => {
    const lacking = [sound && 'sound', picture && 'picture'].filter(Boolean);
    return `Anki is closed — the sentence goes to ${deck} when it opens${lacking.length ? `, without its ${lacking.join(' or ')}` : ''}`;
  },
  /** The line's card is already kept, waiting for Anki to open. */
  sentenceAlreadyQueued: 'the sentence is already waiting for Anki',
  /** Undo: the line's card just added is out of `deck` again. */
  sentenceTakenBack: (deck: string): string => `sentence taken back out of ${deck}`,

  // Making a card's sentence audio: the line plays again while it is recorded
  /** A flash for as long as the line takes. */
  recording: 'Recording the line…',

  // Lookups
  /** On the lookup card, after "Dictionary unavailable:", for a language with no dictionary yet. */
  noDictionary: 'No dictionary for this language yet.',
};
