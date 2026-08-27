/**
 * The assumptions this extension is built on.
 *
 * Every one of these is something a site could change without notice, and each
 * has a known consequence. Naming them turns a CI failure from "test 7 failed"
 * into "YouTube moved captionTracks — the adapter needs a new path".
 */

export interface Assumption {
  id: string;
  site: 'youtube' | 'netflix';
  /** What we rely on. */
  claim: string;
  /** What stops working when it stops being true. */
  breaks: string;
  /** Whether a fallback covers it. */
  fallback: string | null;
}

export const ASSUMPTIONS: Assumption[] = [
  {
    id: 'yt.player-response',
    site: 'youtube',
    claim: 'A watch page embeds ytInitialPlayerResponse containing captions.playerCaptionsTracklistRenderer.captionTracks',
    breaks: 'Track discovery — we cannot list languages or find a baseUrl',
    fallback: 'DOM reading, but current line only',
  },
  {
    id: 'yt.track-fields',
    site: 'youtube',
    claim: 'Each captionTrack has baseUrl and languageCode, and auto tracks are marked kind="asr"',
    breaks: 'Language selection, and the human-vs-auto distinction',
    fallback: null,
  },
  {
    id: 'yt.caption-dom',
    site: 'youtube',
    claim: 'Rendered captions live in .ytp-caption-window-container / .ytp-caption-segment',
    breaks: 'The DOM fallback — which on some setups is the only path that works',
    fallback: null,
  },
  {
    id: 'audio.jpod101',
    site: 'youtube',
    claim: 'assets.languagepod101.com/dictionary/japanese/audiomp3.php serves human recordings, keyed by kanji + hiragana, returning a fixed 52,288-byte placeholder for words it lacks',
    breaks: 'Every pronunciation silently degrades to synthesis — and silently is the problem: nothing looks broken',
    fallback: 'speechSynthesis, which flattens pitch accent',
  },
  {
    id: 'nf.timedtexttracks',
    site: 'netflix',
    claim: 'The player manifest is JSON containing a timedtexttracks array',
    breaks: 'Full-transcript access on Netflix',
    fallback: 'DOM reading, but current line only',
  },
  {
    id: 'nf.caption-dom',
    site: 'netflix',
    claim: 'Rendered subtitles live in .player-timedtext',
    breaks: 'Everything on Netflix — this is currently the only working path',
    fallback: null,
  },
  {
    id: 'nf.main-world-csp',
    site: 'netflix',
    claim: 'Netflix CSP blocks declared MAIN-world scripts, so injection must go through chrome.scripting',
    breaks: 'If it tightens further, the manifest hook is unreachable by any route',
    fallback: 'DOM reading',
  },
];

/** Short, user-facing. Shown in the player when something breaks. */
export const HUMAN: Record<string, string> = {
  'yt.player-response': "Couldn't read YouTube's subtitle list.",
  'yt.track-fields': "YouTube's subtitle data isn't in the expected shape.",
  'yt.caption-dom': "Couldn't find YouTube's subtitle text on the page.",
  'nf.timedtexttracks': "Couldn't read Netflix's subtitle list.",
  'nf.caption-dom': "Couldn't find Netflix's subtitle text on the page.",
  'nf.main-world-csp': "Netflix blocked the part of Libregaku that reads subtitles.",
  'no-subtitles-on': 'Turn subtitles on in the player and Libregaku will pick them up.',
  'no-target-track': 'This title has no subtitles in your target language.',
};

export function describeFailure(id: string): string {
  const a = ASSUMPTIONS.find((x) => x.id === id);
  if (!a) return id;
  return [
    ``,
    `  BROKEN ASSUMPTION: ${a.id}  (${a.site})`,
    `  claimed:  ${a.claim}`,
    `  breaks:   ${a.breaks}`,
    `  fallback: ${a.fallback ?? 'none — this is load-bearing'}`,
    ``,
  ].join('\n');
}
