import type { CardAudio } from '../anki/client';
import { mediaFilename } from '../anki/model';
import { findRecording } from './pronounce';

/** How long a card waits for its recording before going in without one. */
const PATIENCE_MS = 6000;

/**
 * A word's recording, ready to go on a card — or null when no source has one,
 * or it is too slow in coming. A card is never held up long by its audio: the
 * word, the sentence and the definition are what it is for.
 */
export async function cardAudio(want: { word: string; reading?: string; lang: string }): Promise<CardAudio | null> {
  let timer = 0;
  const late = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), PATIENCE_MS);
  });
  try {
    const rec = await Promise.race([findRecording(want.word, want.reading, want.lang).catch(() => null), late]);
    return rec ? { data: rec.data, filename: mediaFilename(want.word, want.reading, rec.type) } : null;
  } finally {
    window.clearTimeout(timer);
  }
}
