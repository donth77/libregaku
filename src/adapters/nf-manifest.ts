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
  /** The best URL: `urls[0]`. Kept for callers that only want one. */
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
}

interface Downloadable {
  downloadUrls?: Record<string, unknown>;
  urls?: Array<{ url?: unknown } | null>;
}

type Downloadables = Record<string, Downloadable | null | undefined>;

export interface NfRawTrack {
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

/** Every readable URL a track offers, best format first. */
function readableUrls(formats: Downloadables): string[] {
  const ranked = Object.entries(formats)
    .map(([name, fmt]) => ({ rank: rankOf(name), urls: isObject(fmt) ? urlsIn(fmt) : [] }))
    .filter((f) => f.rank >= 0)
    .sort((a, b) => a.rank - b.rank);
  return [...new Set(ranked.flatMap((f) => f.urls))];
}

/**
 * A title can carry two tracks in one language, one of them closed captions,
 * which describe sound as well as speech. Both arrive labelled only with the
 * language, so say which is which or the picker offers the same name twice.
 */
function labelFor(t: NfRawTrack): string {
  const base = t.languageDescription ?? t.language ?? '';
  return t.rawTrackType === 'closedcaptions' ? `${base} [CC]` : base;
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
 * `pictures` are the languages whose subtitles Netflix has only as bitmaps
 * (isImageBased) — Chinese, on some titles. There is no text in them to
 * read, but a learner of the language is owed a reason it is missing.
 */
export function tracksFrom(
  data: unknown,
): { tracks: NfPublished[]; movieId: string | null; pictures: string[] } | null {
  const raw = rawTracksOf(data);
  if (!raw) return null;

  const tracks: NfPublished[] = [];
  for (const t of textTracksOf(raw)) {
    const urls = readableUrls(formatsOf(t));
    const url = urls[0];
    if (!url) continue;
    tracks.push({
      url,
      urls,
      language: t.language ?? '',
      label: labelFor(t),
      forced: Boolean(t.isForcedNarrative),
      cc: t.rawTrackType === 'closedcaptions',
    });
  }

  const pictures = [...new Set(
    raw.filter((t) => t.isImageBased && !t.isNoneTrack && !t.isForcedNarrative && t.language).map((t) => t.language!),
  )];
  if (!tracks.length && !pictures.length) return null;

  const d = data as NfManifest;
  const id = d.movieId ?? d.result?.movieId;
  return { tracks, movieId: id != null ? String(id) : null, pictures };
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
    .filter(({ names }) => names.length > 0 && names.every((n) => rankOf(n) < 0))
    .map(({ t, names }) => `${t.language ?? '?'}: ${names.join(', ')}`);
}
