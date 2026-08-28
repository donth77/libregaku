import { MODEL, MODEL_NAME, ROOT_TAG } from './model';
import { ankiCall as call } from './rpc';

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
