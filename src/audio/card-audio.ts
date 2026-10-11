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
export async function cardAudio(
  want: { word: string; reading?: string; lang: string; also?: readonly string[] },
): Promise<CardAudio | null> {
  let timer = 0;
  const late = new Promise<null>((resolve) => {
    timer = window.setTimeout(() => resolve(null), PATIENCE_MS);
  });
  try {
    const looking = findRecording(want.word, want.reading, want.lang, want.also ?? [], true).catch(() => null);
    const rec = await Promise.race([looking, late]);
    // A recording that is only to be heard never goes on a card, whatever found it.
    if (!rec || rec.source === 'naver' || rec.source === 'spanishdict') return null;
    return {
      data: rec.data,
      filename: mediaFilename(want.word, want.reading, rec.type),
      // Who to thank goes on the card with the recording.
      ...(rec.credit ? { credit: rec.credit } : {}),
    };
  } finally {
    window.clearTimeout(timer);
  }
}
