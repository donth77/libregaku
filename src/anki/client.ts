import {
  FIELDS, MARK_SEARCH, MODEL, MODEL_NAME, ROOT_TAG, fieldHtml, furiganaField, keyField, toAnkiFurigana,
} from './model';
import { ankiCall as call, ankiTry } from './rpc';

/**
 * AnkiConnect, spoken to over HTTP.
 *
 * Deliberately a separate process rather than a library: AnkiConnect is
 * AGPL-3.0, and talking to it over the network keeps that licence off this
 * codebase. It also means Anki can be closed without anything here breaking.
 */

export async function isAvailable(): Promise<boolean> {
  try {
    await call<number>('version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Everything the settings panel needs to say in one round trip: whether Anki
 * answered, and if not, which of the five things is wrong.
 *
 * A boolean cannot carry that, which is why "Open Anki" used to appear while
 * Anki was open and something else held its port.
 */
export type AnkiState =
  | { kind: 'connected'; decks: string[]; cards: number; installed: 'created' | 'present' }
  | { kind: 'offline' }
  | { kind: 'blocked' }
  | { kind: 'occupied'; detail: string }
  /** Something took the connection and never answered: Anki mid-sync, or a hung program. */
  | { kind: 'busy'; detail: string }
  | { kind: 'refused'; detail: string };

export async function probe(): Promise<AnkiState> {
  const hello = await ankiTry<number>('version');
  if (!hello.ok) {
    if (hello.kind === 'blocked') return { kind: 'blocked' };
    if (hello.kind === 'occupied') return { kind: 'occupied', detail: hello.error ?? '' };
    if (hello.kind === 'timeout') return { kind: 'busy', detail: hello.error ?? '' };
    if (hello.kind === 'refused') return { kind: 'refused', detail: hello.error ?? '' };
    return { kind: 'offline' };
  }

  try {
    const installed = await ensureModel();
    const decks = await deckNames();
    const cards = await countOurCards();
    return { kind: 'connected', decks, cards, installed };
  } catch (e) {
    return { kind: 'refused', detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function deckNames(): Promise<string[]> {
  return call<string[]>('deckNames');
}

/**
 * One of our note types, present in the collection but unable to hold what
 * we write.
 *
 * AnkiConnect matches field names and silently drops any the note type lacks,
 * so an edited or older note type used to produce cards with no definition,
 * or none at all, and nothing said why.
 */
export class NoteTypeMismatch extends Error {
  constructor(readonly missing: string[], readonly modelName: string = MODEL_NAME) {
    super(
      `Your "${modelName}" note type in Anki is missing ${missing.length === 1 ? 'the field' : 'the fields'} ` +
        `${missing.join(', ')}, so ${modelName === MODEL_NAME ? 'cards' : 'notes'} would lose ` +
        `${missing.length === 1 ? 'it' : 'them'}. Libregaku will not change a note type you may have edited: ` +
        `in Anki, Tools → Manage Note Types, rename "${modelName}" (or add the fields back), then check ` +
        `again and a fresh one is installed.`,
    );
    this.name = 'NoteTypeMismatch';
  }
}

/**
 * Create one of our note types if the collection does not have it yet, and
 * check the one it has can hold every field we write. Never modifies an
 * existing one: adding a field to a note type forces a full sync, and it may
 * be the user's.
 */
export async function ensureNoteType(
  model: { modelName: string },
  fields: readonly string[],
): Promise<'created' | 'present'> {
  const names = await call<string[]>('modelNames');
  if (!names.includes(model.modelName)) {
    try {
      await call('createModel', model);
      const made = (model as { inOrderFields?: readonly string[] }).inOrderFields ?? fields;
      seenFields.set(model.modelName, made.map((f) => f.toLowerCase()));
      return 'created';
    } catch (e) {
      // Two callers on a first run can both miss it; the loser is told it
      // exists, which is what it wanted. Anything else is a real failure.
      if (!(e instanceof Error && /already exists/i.test(e.message))) throw e;
    }
  }
  const have = (await call<string[]>('modelFieldNames', { modelName: model.modelName }))
    .map((f) => f.toLowerCase());
  seenFields.set(model.modelName, have);
  // AnkiConnect matches field names without regard to case, so this does too.
  const missing = fields.filter((f) => !have.includes(f.toLowerCase()));
  if (missing.length) throw new NoteTypeMismatch(missing, model.modelName);
  return 'present';
}

/** The vocabulary note type cards are made with. */
export async function ensureModel(): Promise<'created' | 'present'> {
  return ensureNoteType(MODEL, FIELDS);
}

/** The fields each note type was last seen to have, lower-cased, so a card can use the optional ones. */
const seenFields = new Map<string, string[]>();

/** Whether our note type, as last checked, has this field. */
export function modelHas(field: string): boolean {
  return seenFields.get(MODEL_NAME)?.includes(field.toLowerCase()) ?? false;
}

export interface NewCard {
  deck: string;
  expression: string;
  /**
   * Anki furigana markup as toAnkiFurigana() builds it — 分[わ]かる — or the
   * segments to build it from. Its brackets are kept; markup is neutralised.
   */
  reading: string | Array<{ text: string; ruby?: string }>;
  meaning: string;
  sentence?: string;
  sentenceMeaning?: string;
  /** Already HTML: sourceField() escapes it and makes the link. */
  source?: string;
  tags: string[];
  /** A recording of the word, stored in Anki's media folder and played from the Audio field. */
  audio?: CardAudio | null;
  /** The line, as it was said: in SentenceAudio, or after the word in Audio on an older note type. */
  sentenceAudio?: CardAudio | null;
  /** A still from the line, in the Image field. */
  picture?: CardAudio | null;
}

export interface CardAudio {
  /** Base64. */
  data: string;
  /** mediaFilename()'s: the service worker refuses any other. */
  filename: string;
}

export async function createDeck(name: string): Promise<void> {
  await call('createDeck', { deck: name });
}

export interface SavedSentence {
  deck: string;
  text: string;
  translation?: string;
  /** Already HTML: sourceField() escapes it and makes the link. */
  source?: string;
  tags: string[];
}

/**
 * Anki already has this note, in the deck it was going to.
 *
 * Its own class so a caller can say "already in Anki" rather than show
 * AnkiConnect's wording as a failure. isDuplicate() recognises it.
 */
export class DuplicateNote extends Error {
  constructor(readonly deck: string, readonly expression: string) {
    super(`Already in ${deck}.`);
    this.name = 'DuplicateNote';
  }
}

/**
 * Anki's own words for "you already have this one" — AnkiConnect says
 * "cannot create note because it is a duplicate" — or our class for it.
 * Narrower than /duplicate/ so a deck named "Duplicates" that went missing
 * is not counted as a card already added.
 */
export function isDuplicate(e: unknown): boolean {
  return e instanceof DuplicateNote || (e instanceof Error && /\bis a duplicate\b/i.test(e.message));
}

async function add(note: Record<string, unknown>, deck: string, expression: string): Promise<number> {
  try {
    return await call<number>('addNote', { note });
  } catch (e) {
    if (isDuplicate(e)) throw new DuplicateNote(deck, expression);
    throw e;
  }
}

/**
 * A saved line as a card: the sentence on the front, its translation behind.
 *
 * Reading carries the sentence as well as Expression does, because the front
 * template renders `{{furigana:Reading}}` — leaving it empty would produce a
 * card with no front, which Anki refuses to create. Plain text there renders
 * as plain text, so a line with no readings is simply itself.
 */
export async function addSentence(s: SavedSentence): Promise<number> {
  return add({
    deckName: s.deck,
    modelName: MODEL_NAME,
    fields: {
      Expression: keyField(s.text),
      Reading: fieldHtml(s.text),
      Meaning: fieldHtml(s.translation ?? ''),
      Sentence: '',
      SentenceMeaning: '',
      Source: s.source ?? '',
      Audio: '',
      Image: '',
    },
    tags: s.tags,
    // Saving the same line twice is the same card; Anki says so and we count it.
    options: { allowDuplicate: false, duplicateScope: 'deck' },
  }, s.deck, s.text);
}

/** Throws DuplicateNote when the deck already has this word in our note type. */
export async function addNote(card: NewCard): Promise<number> {
  const reading = typeof card.reading === 'string' ? card.reading : toAnkiFurigana(card.reading);
  // AnkiConnect stores the bytes and writes [sound:…] or <img> into each
  // field named, after whatever the field already holds — so the word's own
  // recording goes first and the sentence's after it when they share Audio.
  const audio = [
    ...(card.audio ? [{ data: card.audio.data, filename: card.audio.filename, fields: ['Audio'] }] : []),
    ...(card.sentenceAudio
      ? [{
          data: card.sentenceAudio.data,
          filename: card.sentenceAudio.filename,
          fields: [modelHas('SentenceAudio') ? 'SentenceAudio' : 'Audio'],
        }]
      : []),
  ];
  const media = {
    ...(audio.length ? { audio } : {}),
    ...(card.picture
      ? { picture: [{ data: card.picture.data, filename: card.picture.filename, fields: ['Image'] }] }
      : {}),
  };
  return add({
    deckName: card.deck,
    modelName: MODEL_NAME,
    fields: {
      Expression: keyField(card.expression),
      Reading: furiganaField(reading),
      Meaning: fieldHtml(card.meaning),
      Sentence: fieldHtml(card.sentence ?? ''),
      SentenceMeaning: fieldHtml(card.sentenceMeaning ?? ''),
      Source: card.source ?? '',
      Audio: '',
      Image: '',
    },
    tags: card.tags,
    options: { allowDuplicate: false, duplicateScope: 'deck' },
    ...media,
  }, card.deck, card.expression);
}

/**
 * The cards we made. Hand marks carry our tag too, but they are notes kept
 * for the extension's own use, not cards anyone studies or counts.
 */
const OURS = `tag:${ROOT_TAG} -${MARK_SEARCH}`;

/**
 * Open Anki's own browser filtered to our cards.
 *
 * This is the answer to "let me see everything the extension made" — Anki
 * already has search, sort and edit, and a worse copy of them does not belong
 * in a subtitle overlay.
 */
export async function browseOurCards(extra = ''): Promise<void> {
  await call('guiBrowse', { query: `${OURS}${extra ? ` ${extra}` : ''}` });
}

/** Cards, not notes: what the settings panel and the toolbar both call them. */
export async function countOurCards(): Promise<number> {
  const ids = await call<number[]>('findCards', { query: OURS });
  return ids.length;
}
