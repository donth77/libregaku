import { MODEL, MODEL_NAME, ROOT_TAG } from './model';
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
 * answered, and if not, which of the four things is wrong.
 *
 * A boolean cannot carry that, which is why "Open Anki" used to appear while
 * Anki was open and something else held its port.
 */
export type AnkiState =
  | { kind: 'connected'; decks: string[]; cards: number; installed: 'created' | 'present' }
  | { kind: 'offline' }
  | { kind: 'blocked' }
  | { kind: 'occupied'; detail: string }
  | { kind: 'refused'; detail: string };

export async function probe(): Promise<AnkiState> {
  const hello = await ankiTry<number>('version');
  if (!hello.ok) {
    if (hello.kind === 'blocked') return { kind: 'blocked' };
    if (hello.kind === 'occupied') return { kind: 'occupied', detail: hello.error ?? '' };
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

/** Create our note type if the collection does not have it yet. */
export async function ensureModel(): Promise<'created' | 'present'> {
  const names = await call<string[]>('modelNames');
  if (names.includes(MODEL_NAME)) return 'present';
  await call('createModel', MODEL);
  return 'created';
}

export interface NewCard {
  deck: string;
  expression: string;
  reading: string;
  meaning: string;
  sentence?: string;
  sentenceMeaning?: string;
  source?: string;
  tags: string[];
}

export async function createDeck(name: string): Promise<void> {
  await call('createDeck', { deck: name });
}

export interface SavedSentence {
  deck: string;
  text: string;
  translation?: string;
  source?: string;
  tags: string[];
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
  return call<number>('addNote', {
    note: {
      deckName: s.deck,
      modelName: MODEL_NAME,
      fields: {
        Expression: s.text,
        Reading: s.text,
        Meaning: s.translation ?? '',
        Sentence: '',
        SentenceMeaning: '',
        Source: s.source ?? '',
        Audio: '',
        Image: '',
      },
      tags: s.tags,
      // Saving the same line twice is the same card; Anki says so and we count it.
      options: { allowDuplicate: false, duplicateScope: 'deck' },
    },
  });
}

/** Anki's own words for "you already have this one". */
export function isDuplicate(e: unknown): boolean {
  return e instanceof Error && /duplicate/i.test(e.message);
}

export async function addNote(card: NewCard): Promise<number> {
  return call<number>('addNote', {
    note: {
      deckName: card.deck,
      modelName: MODEL_NAME,
      fields: {
        Expression: card.expression,
        Reading: card.reading,
        Meaning: card.meaning,
        Sentence: card.sentence ?? '',
        SentenceMeaning: card.sentenceMeaning ?? '',
        Source: card.source ?? '',
        Audio: '',
        Image: '',
      },
      tags: card.tags,
      options: { allowDuplicate: false, duplicateScope: 'deck' },
    },
  });
}

/**
 * Open Anki's own browser filtered to our cards.
 *
 * This is the answer to "let me see everything the extension made" — Anki
 * already has search, sort and edit, and a worse copy of them does not belong
 * in a subtitle overlay.
 */
export async function browseOurCards(extra = ''): Promise<void> {
  await call('guiBrowse', { query: `tag:${ROOT_TAG}${extra ? ` ${extra}` : ''}` });
}

export async function countOurCards(): Promise<number> {
  const ids = await call<number[]>('findNotes', { query: `tag:${ROOT_TAG}` });
  return ids.length;
}
