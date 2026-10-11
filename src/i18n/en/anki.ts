/**
 * Messages from the Anki integration that reach the screen (src/anki).
 *
 * Libregaku reaches Anki, the flashcard program, through AnkiConnect: an
 * add-on for Anki that answers on a port of the computer, 8765. These say why
 * that did not work, or why Anki or Libregaku refused something. They show in
 * Settings under Anki, in the line about Anki at the foot of the toolbar
 * popup, and in notices over the player, usually after a sentence that says
 * what failed.
 *
 * Anki, AnkiConnect and Libregaku are names, and stay as they are. So do
 * webCorsOriginList, a setting in AnkiConnect's config, and the names of
 * actions, note types, fields and decks, which are Anki's. Where a message
 * says where to go in Anki (Tools → Add-ons), a translation names those menus
 * as Anki itself does in that language.
 */
export const anki = {
  // Reaching AnkiConnect. `port` is the number it answers on, 8765.
  /** Nothing answered: Anki is closed, or AnkiConnect is not installed. */
  offline: (port: number): string => `Nothing is listening on port ${port}.`,
  /** Something took the connection and gave no answer within `seconds` seconds. */
  timeout: (port: number, seconds: number): string =>
    `Nothing answered on port ${port} within ${seconds} s. ` +
    'Anki may be busy (syncing, or showing a dialog), or another program is holding the port.',
  /**
   * AnkiConnect refused this extension. `origin` is the extension's address,
   * chrome-extension://… — "that line" is this address, to be added to
   * AnkiConnect's config. Tools → Add-ons → AnkiConnect → Config is the way
   * there in Anki's menus.
   */
  blocked: (origin: string): string =>
    `AnkiConnect refused ${origin}. In Anki: Tools → Add-ons → AnkiConnect → Config, ` +
    'and add that line to webCorsOriginList.',
  /** Another program answered on the port, with an HTTP error. `status` is its number, such as 404. */
  httpAnswer: (port: number, status: number): string =>
    `Something on port ${port} answered with HTTP ${status}. AnkiConnect does not.`,
  /** Another program answered on the port, and not as AnkiConnect does. */
  notAnkiConnect: (port: number): string => `Something other than AnkiConnect is using port ${port}.`,
  /** The extension's own background part did not answer the page. */
  noBackground: 'The extension background is not responding.',
  /** Anki could not be reached, and no reason was given. */
  unreachable: 'Anki is not reachable.',
  /** AnkiConnect refused something, and gave no reason. */
  callFailed: 'AnkiConnect call failed.',

  // Libregaku refusing, itself, to send Anki something it does not use. These show only if the extension has a bug.
  /** An AnkiConnect action Libregaku never sends. `action` is its name, such as deleteDecks. */
  notRelayed: (action: string): string => `Libregaku does not send "${action}" to AnkiConnect.`,
  /** A new card's media that Anki would have fetched itself. `media` is 'audio', 'video' or 'picture'. */
  mediaNotFetched: (media: 'audio' | 'video' | 'picture'): string =>
    `Libregaku only attaches ${media === 'picture' ? 'pictures' : media} it fetched itself.`,
  /** A new card's media with nothing in it. `media` is 'audio', 'video' or 'picture'. */
  mediaEmpty: (media: 'audio' | 'video' | 'picture'): string => `The ${media} for this note has no data.`,
  /** A new card's media file not named the way Libregaku names its own. `prefix` is what they start with, libregaku_. */
  mediaName: (prefix: string): string => `Libregaku names the files it adds ${prefix}…, and this one is not.`,
  /** An action sent without the list it needs. `action` is its name; `ids` is 'notes' or 'cards'. */
  idsNeeded: (action: string, ids: 'notes' | 'cards'): string => `${action} needs a list of ${ids}.`,
  /**
   * A change to notes that are not Libregaku's marks, refused. `count` of
   * the notes or cards sent are not marks; `ids` is 'notes' or 'cards';
   * `change` is what was asked: 'delete', 'suspend' or 'retag'. A mark is a
   * word marked known, tracked or ignored, kept in Anki as a note. Undo may
   * also delete a card Libregaku made a few minutes ago.
   */
  notMarks: (count: number, ids: 'notes' | 'cards', change: 'delete' | 'suspend' | 'retag'): string =>
    `Refused: ${count} of the ${ids} sent ${count === 1 ? "isn't a Libregaku mark" : "aren't Libregaku marks"}. ` +
    `Libregaku only ${change === 'delete' ? 'deletes' : change === 'suspend' ? 'suspends' : 'retags'} its own marks` +
    (change === 'delete' ? ', and a card it made in the last few minutes that has not been studied.' : '.'),

  // The note types Libregaku makes in Anki
  /**
   * A note type in Anki lacks fields Libregaku writes, so it will not use
   * it. `noteType` is its name in Anki: Libregaku, which cards are made with,
   * or Libregaku Mark, which marks are kept in. `fields` are the missing
   * fields' names, as Anki has them. `loses` is what would lose them:
   * 'cards' for Libregaku, 'notes' for Libregaku Mark. Tools → Manage Note
   * Types is the way there in Anki's menus, and "check again" means the
   * Check again button in Settings.
   */
  noteTypeMismatch: (noteType: string, fields: readonly string[], loses: 'cards' | 'notes'): string =>
    `Your "${noteType}" note type in Anki is missing ${fields.length === 1 ? 'the field' : 'the fields'} ` +
    `${fields.join(', ')}, so ${loses} would lose ${fields.length === 1 ? 'it' : 'them'}. ` +
    'Libregaku will not change a note type you may have edited: ' +
    `in Anki, Tools → Manage Note Types, rename "${noteType}" (or add the fields back), then check ` +
    'again and a fresh one is installed.',

  // Marks and waiting cards: words marked by hand, kept in Anki, and cards made while Anki was closed, kept in the browser
  /** Anki refused `count` of the marks sent to it. */
  marksNotAdded: (count: number): string =>
    `Anki did not add ${count} of the marks. They stay queued and are tried again next time.`,
  /** The browser would not store the marks just read from Anki. `cause` is the browser's reason, as it gave it. */
  marksNotStored: (cause: string): string => `Browser storage refused the marks read from Anki: ${cause}`,
  /** The browser's storage, where marks and waiting cards are kept, could not be read. `cause` is the browser's reason. */
  storageUnreadable: (cause: string): string => `Browser storage could not be read: ${cause}`,
};
