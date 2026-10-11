/**
 * Reading Netflix's player manifest.
 *
 * Kept apart from the page hook so it can be tested without a browser. The
 * hook itself is three lines of plumbing; this is the part that breaks when
 * Netflix reshapes its manifest, and it has reshaped it once already:
 *
 *   timedtexttracks   ->  result.textTracks
 *   ttDownloadables   ->  downloadables
 *
 * Both shapes are read, because the old one is still what older clients get
 * and there is no cost to accepting it.
 *
 * Why this break went unnoticed: the canary looks for these field names in
 * Netflix's player bundle, and the bundle still contains the old ones. The
 * names surviving in the code is not the same as the manifest still using
 * them, and the DOM fallback kept subtitles on screen, so nothing looked
 * broken — only the whole transcript and the second line quietly went away.
 */

export interface NfPublished {
  /** The best URL: `urls[0]`. Kept for callers that only want one. Empty for a track not sent yet. */
  url: string;
  /**
   * Every URL worth trying, best format first and each format's CDNs in the
   * order Netflix listed them. Any one CDN can be down, so a fetch that gives
   * up after the first is a track that silently fails.
   */
  urls: string[];
  language: string;
  label: string;
  forced: boolean;
  cc: boolean;
  /**
   * Netflix's own id for the track, where the manifest gives one: the same in
   * every manifest of a title, and in the player's own track list (trackId).
   * Not the same from one title to the next.
   */
  trackId?: string;
  /**
   * Listed, and its files not sent.
   *
   * The web player is sent files for a few tracks with a title — the ones it
   * expects to play — and every other subtitle language as a name alone
   * (`hydrated: false`). It asks for a track's files when the viewer chooses
   * it in the menu, and they come in another manifest for the same title. So
   * a language can be in Netflix's menu with nothing here to read until it is
   * asked for, which is what inject-netflix.ts does through the player.
   */
  waiting?: true;
}

/** What a manifest says of a title's subtitles, or several manifests of one title together (mergeFound). */
export interface NfFound {
  /** In Netflix's order: the tracks with text to read, and the ones not sent yet. */
  tracks: NfPublished[];
  movieId: string | null;
  /** Languages with subtitles only as pictures. */
  pictures: string[];
  /** Ids of tracks that were sent with nothing in them to read. Asking for one again brings the same. */
  unreadable: string[];
}

interface Downloadable {
  downloadUrls?: Record<string, unknown>;
  urls?: Array<{ url?: unknown } | null>;
}

type Downloadables = Record<string, Downloadable | null | undefined>;

export interface NfRawTrack {
  /** The track's id, which the player's own track list names it by (trackId). */
  id?: string | number;
  /** False for a track listed without its files (NfPublished.waiting). Absent in older manifests, where every track has them. */
  hydrated?: boolean;
  language?: string;
  languageDescription?: string;
  isForcedNarrative?: boolean;
  isNoneTrack?: boolean;
  /** Bitmap subtitles. There is no text in them to read. */
  isImageBased?: boolean;
  rawTrackType?: string;
  ttDownloadables?: Downloadables;
  downloadables?: Downloadables;
}

export interface NfManifest {
  timedtexttracks?: NfRawTrack[];
  movieId?: number | string;
  result?: { textTracks?: NfRawTrack[]; movieId?: number | string };
}

/**
 * The encodings we can read, best first. imsc1 is the full TTML — timing,
 * positions, and for Japanese the furigana as ruby rather than as text.
 *
 * An allow-list, not "whatever yields a URL": a track also lists image
 * encodings (nflx-cmisc), and taking the first key that had a URL meant a
 * track could be fetched as a bitmap and parse to nothing.
 */
const READABLE: Array<(name: string) => boolean> = [
  (n) => n.startsWith('imsc1'),
  (n) => n.startsWith('dfxp'),
  (n) => n === 'simplesdh',
  (n) => n.includes('webvtt'),
];

function rankOf(format: string): number {
  return READABLE.findIndex((test) => test(format));
}

/**
 * The text format asked for on top of the player's own: WebVTT, which is what
 * Netflix sends its iOS app, for every language.
 */
export const TEXT_PROFILE = 'webvtt-lssdh-ios8';

/** Subtitle formats the web player asks for itself: how its manifest request is told from anything else. */
const PLAYER_TEXT_PROFILES = ['dfxp-ls-sdh', 'simplesdh', 'nflx-cmisc', 'imsc1.1'];

/**
 * Ask for text as well, in the player's own manifest request.
 *
 * The web player asks for subtitles in the formats it can draw, and for some
 * languages — Chinese — Netflix answers with pictures (nflx-cmisc) and
 * nothing else: a language in its menu, and no words for us to read. Named
 * among the request's formats, TEXT_PROFILE brings a text file for those
 * tracks too. Subadub and asbplayer have asked this way for years.
 *
 * Only a manifest request is touched: an object whose `profiles` (its own or
 * its `params`') lists formats by name, one of them a subtitle format the
 * player asks for. Every format the player listed stays, so what it plays is
 * unchanged. True when the format was added.
 */
export function addTextProfile(request: unknown): boolean {
  if (!isObject(request)) return false;
  const holder = isObject(request.params) ? request.params : request;
  const profiles: unknown = holder.profiles;
  if (!Array.isArray(profiles) || !profiles.every((p): p is string => typeof p === 'string')) return false;
  if (!profiles.some((p) => PLAYER_TEXT_PROFILES.includes(p)) || profiles.includes(TEXT_PROFILE)) return false;
  profiles.unshift(TEXT_PROFILE);
  return true;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function urlsIn(fmt: Downloadable): string[] {
  const direct = isObject(fmt.downloadUrls) ? Object.values(fmt.downloadUrls) : [];
  const listed = Array.isArray(fmt.urls) ? fmt.urls.map((u) => u?.url) : [];
  return [...direct, ...listed].filter((u): u is string => typeof u === 'string' && u.length > 0);
}

function formatsOf(t: NfRawTrack): Downloadables {
  const f = t.downloadables ?? t.ttDownloadables;
  return isObject(f) ? (f as Downloadables) : {};
}

/** Every readable URL a track offers, best format first; of the formats `only` passes, when given. */
function readableUrls(formats: Downloadables, only?: (name: string) => boolean): string[] {
  const ranked = Object.entries(formats)
    .filter(([name]) => !only || only(name))
    .map(([name, fmt]) => ({ rank: rankOf(name), urls: isObject(fmt) ? urlsIn(fmt) : [] }))
    .filter((f) => f.rank >= 0)
    .sort((a, b) => a.rank - b.rank);
  return [...new Set(ranked.flatMap((f) => f.urls))];
}

/** WebVTT is text whatever a track says of itself. */
const isVtt = (name: string): boolean => name.includes('webvtt');

/** Netflix's bitmap subtitles. */
const isBitmap = (name: string): boolean => name.startsWith('nflx-cmisc');

/**
 * Whether a track is drawn from pictures: Netflix says so, or bitmaps are the
 * only files it lists. The manifest's own flag has not always been there.
 */
function drawnAsPictures(t: NfRawTrack): boolean {
  const names = Object.keys(formatsOf(t));
  return Boolean(t.isImageBased) || (names.length > 0 && names.every(isBitmap));
}

function idOf(t: NfRawTrack): string | null {
  if (typeof t.id === 'string' && t.id) return t.id;
  return typeof t.id === 'number' && Number.isFinite(t.id) ? String(t.id) : null;
}

/**
 * A title can carry two tracks in one language, one of them closed captions,
 * which describe sound as well as speech. Both arrive labelled only with the
 * language, so say which is which or the picker offers the same name twice.
 */
function labelFor(t: NfRawTrack): string {
  const base = t.languageDescription ?? t.language ?? '';
  return isCc(t) ? `${base} [CC]` : base;
}

/** The manifest writes "closedcaptions"; the player's own track list has it in capitals. */
function isCc(t: NfRawTrack): boolean {
  return typeof t.rawTrackType === 'string' && t.rawTrackType.toLowerCase() === 'closedcaptions';
}

function rawTracksOf(data: unknown): NfRawTrack[] | null {
  const d = data as NfManifest | null;
  const raw = d?.timedtexttracks ?? d?.result?.textTracks;
  return Array.isArray(raw) ? raw.filter((t): t is NfRawTrack => isObject(t)) : null;
}

/** Tracks with text in them: not the "Off" entry, not bitmaps. */
function textTracksOf(raw: NfRawTrack[]): NfRawTrack[] {
  return raw.filter((t) => !t.isNoneTrack && !t.isImageBased);
}

/**
 * Null when this object is not a manifest, which is almost every object.
 *
 * A track Netflix draws as pictures still counts when it comes with its
 * words: the WebVTT file addTextProfile asks for. Nothing else listed on such
 * a track is taken for text. `pictures` are the languages left with bitmaps
 * and no text at all. There is nothing in them to read, but a learner of the
 * language is owed a reason it is missing.
 *
 * A track listed by name, its files not sent (NfPublished.waiting), keeps its
 * place in the list. A forced one is left out: nobody studies the few lines
 * of on-screen writing, and it is not worth asking the player for.
 */
export function tracksFrom(data: unknown): NfFound | null {
  const raw = rawTracksOf(data);
  if (!raw) return null;

  const tracks: NfPublished[] = [];
  const unreadable: string[] = [];
  for (const t of raw) {
    if (t.isNoneTrack) continue;
    const trackId = idOf(t);
    const named = {
      language: t.language ?? '',
      label: labelFor(t),
      forced: Boolean(t.isForcedNarrative),
      cc: isCc(t),
      ...(trackId ? { trackId } : {}),
    };
    // Listed by name alone: nothing to read until the player is sent its files.
    if (t.hydrated === false) {
      if (trackId && named.language && !named.forced) tracks.push({ url: '', urls: [], ...named, waiting: true });
      continue;
    }
    const urls = readableUrls(formatsOf(t), drawnAsPictures(t) ? isVtt : undefined);
    const url = urls[0];
    if (url) tracks.push({ url, urls, ...named });
    else if (trackId) unreadable.push(trackId);
  }

  const pictures = [...new Set(
    raw
      .filter((t) => !t.isNoneTrack && t.hydrated !== false && !t.isForcedNarrative && drawnAsPictures(t))
      .map((t) => t.language)
      .filter((language): language is string => Boolean(language)),
  )].filter(unreadIn(tracks));
  if (!tracks.length && !pictures.length) return null;

  const d = data as NfManifest;
  const id = d.movieId ?? d.result?.movieId;
  return { tracks, movieId: id != null ? String(id) : null, pictures, unreadable };
}

/** Read from some track of its own, a language is not one of pictures only. A forced track is no answer for it. */
function unreadIn(tracks: NfPublished[]): (language: string) => boolean {
  const read = new Set(tracks.filter((t) => !t.forced && !t.waiting).map((t) => t.language));
  return (language) => !read.has(language);
}

/**
 * A title's subtitles, from every manifest seen for it.
 *
 * A second manifest for a title is the answer to the player asking for one
 * track's files (NfPublished.waiting). It may name again, without files,
 * tracks an earlier one sent. The player keeps what it had and takes from
 * the new manifest only the tracks that came with files
 * (replaceDehydratedTracks in its bundle), and so does this: read as a list
 * of its own, the answer to asking for Chinese would take away the Japanese
 * and English that came first.
 *
 * Tracks are matched by Netflix's id, and each keeps its place in the list,
 * because the adapter names a track by its place among those of its language.
 * A manifest whose tracks carry no ids is of the older shape, where every
 * manifest is whole: it replaces what was there, as does one for another title.
 */
export function mergeFound(older: NfFound | undefined, newer: NfFound): NfFound {
  const now = new Map<string, NfPublished>();
  for (const t of newer.tracks) if (t.trackId) now.set(t.trackId, t);
  if (!older || newer.movieId === null || older.movieId !== newer.movieId) return newer;
  if (!now.size && !newer.unreadable.length) return newer;

  const placed = new Set<string>();
  const tracks: NfPublished[] = [];
  for (const old of older.tracks) {
    const id = old.trackId;
    // Without an id there is nothing to match it by: the newer manifest speaks for the title.
    if (!id) continue;
    // Asked for since, and sent with nothing in it to read.
    if (old.waiting && newer.unreadable.includes(id)) continue;
    const again = now.get(id);
    placed.add(id);
    // Named again without its files: the ones already sent still stand.
    tracks.push(!again || (again.waiting && !old.waiting) ? old : again);
  }
  for (const t of newer.tracks) {
    if (t.trackId && placed.has(t.trackId)) continue;
    // Sent once with nothing to read: not offered again as one to ask for.
    if (t.waiting && t.trackId && older.unreadable.includes(t.trackId)) continue;
    tracks.push(t);
  }

  const read = new Set(tracks.filter((t) => !t.waiting && t.trackId).map((t) => t.trackId));
  return {
    tracks,
    movieId: newer.movieId,
    pictures: [...new Set([...older.pictures, ...newer.pictures])].filter(unreadIn(tracks)),
    unreadable: [...new Set([...older.unreadable, ...newer.unreadable])].filter((id) => !read.has(id)),
  };
}

/**
 * Text tracks a manifest offered only in encodings we do not know, as
 * "language: format, format". Empty when there are none, null when this is not
 * a manifest.
 *
 * Exists so a new encoding name fails loudly — as a console warning naming the
 * format — rather than as a language that silently is not there.
 */
export function unreadableTracks(data: unknown): string[] | null {
  const raw = rawTracksOf(data);
  if (!raw) return null;
  return textTracksOf(raw)
    .map((t) => ({ t, names: Object.keys(formatsOf(t)) }))
    // Bitmaps alone are not a new encoding: they are named as pictures (tracksFrom).
    .filter(({ names }) => names.length > 0 && names.every((n) => rankOf(n) < 0) && !names.every(isBitmap))
    .map(({ t, names }) => `${t.language ?? '?'}: ${names.join(', ')}`);
}
