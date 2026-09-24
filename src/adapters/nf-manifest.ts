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
  url: string;
  language: string;
  label: string;
  forced: boolean;
  cc: boolean;
}

interface Downloadable {
  downloadUrls?: Record<string, string>;
  urls?: Array<{ url?: string }>;
}

type Downloadables = Record<string, Downloadable | undefined>;

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
 * imsc1 is the full TTML, with timing and positioning. The other encodings
 * Netflix offers alongside it are fallbacks, so try it first and settle for
 * whatever else yields a URL.
 */
function pickUrl(formats: Downloadables): string | null {
  const names = Object.keys(formats).sort(
    (a, b) => Number(b.startsWith('imsc1')) - Number(a.startsWith('imsc1')),
  );
  for (const name of names) {
    const fmt = formats[name];
    if (!fmt) continue;
    const direct = fmt.downloadUrls ? Object.values(fmt.downloadUrls)[0] : undefined;
    const listed = fmt.urls?.find((u) => typeof u?.url === 'string')?.url;
    const url = direct ?? listed;
    if (url) return url;
  }
  return null;
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

/** Null when this object is not a manifest, which is almost every object. */
export function tracksFrom(data: unknown): { tracks: NfPublished[]; movieId: string | null } | null {
  const d = data as NfManifest | null;
  const raw = d?.timedtexttracks ?? d?.result?.textTracks;
  if (!Array.isArray(raw)) return null;

  const tracks = raw
    .filter((t) => !t.isNoneTrack && !t.isImageBased)
    .map((t) => ({
      url: pickUrl(t.downloadables ?? t.ttDownloadables ?? {}),
      language: t.language ?? '',
      label: labelFor(t),
      forced: Boolean(t.isForcedNarrative),
      cc: t.rawTrackType === 'closedcaptions',
    }))
    .filter((t): t is NfPublished => Boolean(t.url));

  if (!tracks.length) return null;

  const id = d?.movieId ?? d?.result?.movieId;
  return { tracks, movieId: id != null ? String(id) : null };
}
