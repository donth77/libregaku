/**
 * The assumptions this extension is built on.
 *
 * Every one of these is something a site could change without notice, and each
 * has a known consequence. Naming them turns a CI failure from "test 7 failed"
 * into "YouTube moved captionTracks — the adapter needs a new path".
 */

export interface Assumption {
  id: string;
  /** 'external' is a third-party service we borrow, not a site we render on. */
  site: 'youtube' | 'netflix' | 'external';
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
    claim: 'A watch page embeds ytInitialPlayerResponse containing captions.playerCaptionsTracklistRenderer.captionTracks and videoDetails.videoId',
    breaks: 'Track discovery on a page loaded directly — we cannot list languages or find a baseUrl',
    fallback: 'The live player API (yt.player-api); then DOM reading, current line only',
  },
  {
    id: 'yt.player-api',
    site: 'youtube',
    claim: '#movie_player exposes getPlayerResponse() for the video it has loaded — including after in-app navigation, when ytInitialPlayerResponse still describes the first page — and loadModule/getOption/setOption("captions", …) to switch a track on',
    breaks: 'Every video reached by clicking: no track list, so no transcript or second line; and switching a track on to capture its signed URL',
    fallback: 'ytInitialPlayerResponse when it names the video in the address bar; the CC button; DOM reading',
  },
  {
    id: 'yt.navigate-event',
    site: 'youtube',
    claim: 'In-app navigation fires yt-navigate-finish on window once the new watch page is in place, with ?v= already updated',
    breaks: 'The previous video\'s transcript and tracks stay on screen after clicking to another video',
    fallback: null,
  },
  {
    id: 'yt.ad-showing',
    site: 'youtube',
    claim: 'While an advert plays in the content\'s <video>, #movie_player carries the class ad-showing',
    breaks: 'Ads: their clock drives our cue lookup, and their captions can be captured as the video\'s own',
    fallback: 'Captured caption URLs are also checked against the video id (yt.timedtext-url)',
  },
  {
    id: 'yt.timedtext-url',
    site: 'youtube',
    claim: 'The player requests captions from /api/timedtext with v (the video), lang, kind=asr for auto-generated tracks, tlang for auto-translation and pot (the proof-of-origin token, without which the answer is empty), as query parameters; a request made again once the player has its token carries it',
    breaks: 'Matching a captured URL to the track wanted — the guard that keeps an ad\'s captions, or a machine translation, out of the subtitle line',
    fallback: null,
  },
  {
    id: 'yt.timedtext-relang',
    site: 'youtube',
    claim: 'lang and kind are not covered by a timedtext URL\'s signature, so a signed URL for one track of a video can be pointed at another track of the same video',
    breaks: 'Loading a second track the player has not switched on itself; that track then needs its own capture',
    fallback: 'Asking the player to switch that track on (yt.player-api)',
  },
  {
    id: 'yt.track-fields',
    site: 'youtube',
    claim: 'Each captionTrack has baseUrl and languageCode, and auto tracks are marked kind="asr"',
    breaks: 'Language selection, and the human-vs-auto distinction',
    fallback: null,
  },
  {
    id: 'yt.controls',
    site: 'youtube',
    claim: 'The player\'s bottom control bar, progress bar included, is .ytp-chrome-bottom inside #movie_player, and keeps its box while faded',
    breaks: 'The transcript panel covers the captions, settings, theater and fullscreen buttons',
    fallback: 'The panel runs full height; closing it with S uncovers them',
  },
  {
    id: 'yt.caption-dom',
    site: 'youtube',
    claim: 'Rendered captions live in .ytp-caption-window-container / .ytp-caption-segment',
    breaks: 'The DOM fallback — which on some setups is the only path that works',
    fallback: null,
  },
  {
    id: 'yt.transcript-panel',
    site: 'youtube',
    claim: 'A watch page can open a transcript panel rendering every line as ytd-transcript-segment-renderer with .segment-timestamp and .segment-text',
    breaks: 'Full-transcript recovery on YouTube — the sidebar drops back to accumulating one line at a time',
    fallback: 'Reading rendered captions, current line only',
  },
  {
    id: 'audio.jpod101',
    site: 'external',
    claim: 'assets.languagepod101.com/dictionary/japanese/audiomp3.php serves human recordings, keyed by kanji + hiragana, returning a fixed 52,288-byte placeholder for words it lacks — and every host it redirects through (currently cdn.innovativelanguage.com) is listed in host_permissions',
    breaks: 'Every pronunciation silently degrades to synthesis — and silently is the problem: nothing looks broken. A redirect to a host missing from host_permissions, or from AUDIO_HOSTS in src/audio/pronounce.ts, fails the same way',
    fallback: 'speechSynthesis, which flattens pitch accent',
  },
  {
    id: 'dict.jmdict-release',
    site: 'external',
    claim: 'The pinned jmdict-simplified release still serves jmdict-<edition>-<release>.json.tgz, and every redirect hop is a host in host_permissions',
    breaks: 'The dictionary download 404s on first run, so local lookups never work and every word goes to a remote API',
    fallback: 'Jotoba, then Jisho — remote, rate-limited, and needing connectivity',
  },
  {
    id: 'dict.lindera-release',
    site: 'external',
    claim: 'The pinned lindera IPADIC dictionary zip (src/morphology/dictionaries.ts) is still published at its URL, matching the pinned lindera-wasm',
    breaks: 'The analyser never loads: no readings, no dictionary forms, and cards matched by exact spelling only — which the page now says',
    fallback: null,
  },
  {
    id: 'dict.jotoba',
    site: 'external',
    claim: 'jotoba.de POST /api/search/words returns words[].reading.{kanji,kana} and senses[].glosses',
    breaks: 'Lookups while the local dictionary is still downloading, or after it failed',
    fallback: 'Jisho, English only',
  },
  {
    id: 'dict.jisho',
    site: 'external',
    claim: 'jisho.org GET /api/v1/search/words returns data[].japanese and senses[].english_definitions (and answers a browser user agent — it refuses Node\'s default one)',
    breaks: 'The last remote fallback for lookups before the local dictionary is ready',
    fallback: null,
  },
  {
    id: 'nf.textTracks',
    site: 'netflix',
    claim: 'The player manifest is decrypted and JSON.parse-d in the page, and carries the subtitle tracks as result.textTracks (formerly timedtexttracks), each with rawTrackType, isForcedNarrative, isNoneTrack, isImageBased and a downloadables map keyed by format (imsc1.1 preferred)',
    breaks: 'Full-transcript access on Netflix, and the second line',
    fallback: 'DOM reading, but current line only',
  },
  {
    id: 'nf.movie-id',
    site: 'netflix',
    claim: 'A manifest names its title as result.movieId, equal to the id in /watch/<id> — which is how a prefetched next episode\'s manifest is told apart from the one playing',
    breaks: 'No track list ever matches the page, so the whole transcript is lost (the adapter warns after 10 s)',
    fallback: 'DOM reading, current line only',
  },
  {
    id: 'nf.track-urls',
    site: 'netflix',
    claim: 'Each text track\'s downloadables[format] holds urls[].url (or downloadUrls{}); formats we parse are named imsc1*, dfxp*, simplesdh or *webvtt; the URLs are https on *.nflxvideo.net and readable from netflix.com',
    breaks: 'Tracks are dropped, or their fetches fail',
    fallback: 'The next URL for the same track; then DOM reading',
  },
  {
    id: 'nf.seek-api',
    site: 'netflix',
    claim: 'netflix.appContext.state.playerApp.getAPI().videoPlayer offers getAllPlayerSessionIds() (one id contains "watch") and getVideoPlayerBySessionId(id).seek(ms)',
    breaks: 'Clicking a transcript line to jump there, and opening a saved line at its moment',
    fallback: 'Setting video.currentTime, which Netflix may answer with error M7375. Not in the player bundle, so there is no canary for it',
  },
  {
    id: 'nf.controls',
    site: 'netflix',
    claim: 'While its controls show, the player\'s bottom bar is [data-uia="controls-standard"] and its title bar [data-uia="video-title"] (<h4>show</h4><span>episode number</span><span>episode name</span>); both are removed while the controls are hidden. Checked live 2026-09-26; not in the player bundle, so there is no canary',
    breaks: 'The transcript panel covers episodes, audio and subtitles, speed and fullscreen; cards and saved lines lose the show and episode name',
    fallback: 'The panel runs full height (S closes it); the title is left out',
  },
  {
    id: 'nf.caption-dom',
    site: 'netflix',
    claim: 'Rendered subtitles live in .player-timedtext / .player-timedtext-text-container, with ruby readings in <rt> elements that are skipped',
    breaks: 'The DOM fallback on Netflix, used when no manifest reaches us',
    fallback: null,
  },
  {
    id: 'nf.main-world-csp',
    site: 'netflix',
    claim: 'Unverified: Netflix CSP may block declared MAIN-world scripts, so the hook is also injected through chrome.scripting. Nothing depends on which of the two runs; the hook guards against running twice',
    breaks: 'If injection by both routes stops working, the manifest hook is unreachable',
    fallback: 'DOM reading',
  },
  {
    id: 'anki.envelope',
    site: 'external',
    claim: 'AnkiConnect answers a POST to 127.0.0.1:8765 of {action, version: 6, params} with {result, error: string|null}, and HTTP 403 for an origin it does not allow',
    breaks: 'Every Anki feature, and the connection states the settings and toolbar show',
    fallback: null,
  },
  {
    id: 'anki.search',
    site: 'external',
    claim: 'findNotes understands deck:"…" (backslash-escaped, subdecks included), -is:new, tag:libregaku (child tags included) and prop:ivl>=21',
    breaks: 'Word status: every word reads as unknown, or as the wrong status',
    fallback: null,
  },
  {
    id: 'anki.notesinfo',
    site: 'external',
    claim: 'notesInfo returns {noteId, fields: {name: {value, order}}} per id, or {} for a deleted note',
    breaks: 'Which word each note is for, and its reading',
    fallback: null,
  },
  {
    id: 'anki.duplicate',
    site: 'external',
    claim: 'addNote with duplicateScope "deck" refuses a duplicate with an error containing "duplicate"',
    breaks: '"Already in Anki" on the lookup card, and the saved-lines duplicate count',
    fallback: null,
  },
  {
    id: 'anki.model-fields',
    site: 'external',
    claim: 'modelFieldNames lists a note type\'s fields, and addNote silently drops fields the note type lacks',
    breaks: 'The check that stops cards being made without their definition or reading',
    fallback: null,
  },
  {
    id: 'anki.addnotes',
    site: 'external',
    claim: 'addNotes returns one note id per note; older AnkiConnect puts null where it refused one, newer raises the refusals after adding the rest',
    breaks: 'Knowing which marks reached Anki',
    fallback: 'Marks are confirmed by reading them back, not by this answer',
  },
  {
    id: 'anki.tag-children',
    site: 'external',
    claim: 'tag:libregaku also matches libregaku::… child tags, and note:"X" matches a note type by name and can be negated',
    breaks: 'Mark notes count as mined words, or as cards the extension made',
    fallback: null,
  },
  {
    id: 'anki.notesinfo-tags-mod',
    site: 'external',
    claim: 'notesInfo returns each note\'s tags, and its modification time as mod (seconds)',
    breaks: 'A mark\'s status, and which of two devices\' marks for one word is newest',
    fallback: 'The note id, which is its creation time, stands in for mod',
  },
  {
    id: 'anki.note-edit-params',
    site: 'external',
    claim: 'deleteNotes takes {notes}, suspend takes {cards}, addTags and removeTags take {notes, tags: "space separated"}',
    breaks: 'Clearing, changing and hiding marks in Anki',
    fallback: 'The browser keeps the change queued and retries on the next sync',
  },
  {
    id: 'anki.suspended-search',
    site: 'external',
    claim: '-is:suspended finds cards that are not suspended',
    breaks: 'A mark\'s card could reach the learner\'s reviews',
    fallback: null,
  },
  {
    id: 'anki.cors-default',
    site: 'external',
    claim: 'AnkiConnect\'s default webCorsOriginList admits a chrome-extension:// origin',
    breaks: 'The first connection, before the learner has edited AnkiConnect\'s config',
    fallback: 'The "blocked" state names the line to add',
  },
];

/** Short, user-facing. Shown in the player when something breaks. */
export const HUMAN: Record<string, string> = {
  'yt.player-response': "Couldn't read YouTube's subtitle list.",
  'yt.track-fields': "YouTube's subtitle data isn't in the expected shape.",
  'yt.caption-dom': "Couldn't find YouTube's subtitle text on the page.",
  'yt.player-api': "Couldn't read this video's subtitle list from YouTube's player.",
  'nf.textTracks': "Couldn't read Netflix's subtitle list.",
  'nf.caption-dom': "Couldn't find Netflix's subtitle text on the page.",
  'nf.main-world-csp': "Netflix blocked the part of Libregaku that reads subtitles.",
  'no-subtitles-on': 'Turn subtitles on in the player and Libregaku will pick them up.',
  'no-target-track': 'No subtitles here in the language you are learning.',
  'no-second-track': 'No subtitles here in your own language, so there is no second line.',
  'only-one-track': 'This video has only one subtitle track, so there is no second line.',
  'auto-generated': 'These subtitles are auto-generated, so the wording and word breaks will be rough.',
  'no-subtitles': 'This video has no subtitles.',
  'second-track-failed': "The second line couldn't be loaded.",
  'analyser-unavailable':
    'Readings and dictionary forms are off: the language analyser didn\'t load. Words match your cards by exact spelling only.',
  'mark-not-saved': "Couldn't save that mark. It applies until you reload, then it's lost.",
  'marks-not-synced': "Couldn't save your marks to Anki. They're kept in this browser and will be tried again.",
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
