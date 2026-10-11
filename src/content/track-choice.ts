import { trackLanguageMatch } from '../settings';
import type { TrackInfo } from '../adapters/types';

/**
 * The track to study, of a video's tracks in the language being learned.
 *
 * A person's subtitles before a machine's. ASR output has no punctuation and
 * invents words, so segmenting it teaches a learner nothing about the
 * language and quite a lot about speech recognition; taking the first match
 * regardless meant silently studying ASR whenever it happened to be listed
 * first.
 *
 * Then the script being learned before the language's other one. A site lists
 * Chinese twice, Simplified and Traditional, and `want` says which the
 * learner reads (targetVariant): the first in the list was whichever the site
 * put first. The other script is still better than no subtitles, and than a
 * machine's guess at the right one.
 *
 * Then plain subtitles before closed captions, which describe sounds too.
 *
 * Last, between two that are otherwise as good, the one already here before
 * one the site's player has to be asked for (onRequest).
 */
export function chooseTrack(tracks: readonly TrackInfo[], want: string): TrackInfo | undefined {
  const rank = (t: TrackInfo): number =>
    (t.generated ? 100 : 0) + (2 - trackLanguageMatch(t.lang, want)) * 10 + (t.cc ? 2 : 0) + (t.onRequest ? 1 : 0);
  let best: TrackInfo | undefined;
  for (const t of tracks) if (!best || rank(t) < rank(best)) best = t;
  return best;
}

/**
 * The track for the line under the subtitles, of all a video's tracks: one in
 * the learner's own language that is not the track being studied.
 *
 * The language itself first; for Chinese, the other script after it, as sites
 * label tracks by script (zh-Hant) or by place (zh-TW). Then plain subtitles
 * before closed captions: a translation line reading "[door creaks]" helps
 * nobody. Never a forced track, which holds a handful of lines.
 */
export function chooseSecond(tracks: readonly TrackInfo[], native: string, studied: string): TrackInfo | undefined {
  const inNative = tracks
    .filter((t) => trackLanguageMatch(t.lang, native) > 0 && t.id !== studied && !t.forced)
    .sort((a, b) => trackLanguageMatch(b.lang, native) - trackLanguageMatch(a.lang, native));
  return inNative.find((t) => !t.cc) ?? inNative[0];
}

/** Whether two lists offer the same tracks, in the same order and the same state. */
export function sameTracks(a: readonly TrackInfo[], b: readonly TrackInfo[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((t, i) => {
    const o = b[i];
    return o !== undefined &&
      t.id === o.id && t.lang === o.lang && t.label === o.label &&
      Boolean(t.generated) === Boolean(o.generated) &&
      Boolean(t.forced) === Boolean(o.forced) &&
      Boolean(t.cc) === Boolean(o.cc) &&
      Boolean(t.onRequest) === Boolean(o.onRequest);
  });
}
