import { MODEL, MODEL_NAME, ROOT_TAG } from './model';

/**
 * AnkiConnect, spoken to over HTTP.
 *
 * Deliberately a separate process rather than a library: AnkiConnect is
 * AGPL-3.0, and talking to it over the network keeps that licence off this
 * codebase. It also means Anki can be closed without anything here breaking.
 */

const ENDPOINT = 'http://127.0.0.1:8765';
const VERSION = 6;

export class AnkiError extends Error {}

async function call<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version: VERSION, params }),
    });
  } catch {
    // The usual cause is Anki not running, which is normal and not an error
    // worth shouting about — but it must be distinguishable from a real fault.
    throw new AnkiError('Anki is not reachable. Is it running with AnkiConnect installed?');
  }
  if (!res.ok) throw new AnkiError(`AnkiConnect returned HTTP ${res.status}`);

  const body = (await res.json()) as { result?: T; error?: string | null };
  if (body.error) throw new AnkiError(body.error);
  return body.result as T;
}

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
