/**
 * Page-world script for Netflix.
 *
 * Netflix delivers its subtitle track list inside the player manifest, which
 * arrives as JSON. Rather than guess at an endpoint URL, we hook `JSON.parse`
 * and watch for any object carrying `timedtexttracks` — the approach Subadub
 * has used since 2018, and the reason it needs a fix roughly once every two
 * years rather than constantly.
 */

const TAG = 'libregaku';

console.log('%c[libregaku] netflix page hook installed', 'color:#8AA2E8');
(window as unknown as Record<string, unknown>)['__libregakuHook'] = true;

interface NfTrack {
  language?: string;
  languageDescription?: string;
  isForcedNarrative?: boolean;
  isNoneTrack?: boolean;
  rawTrackType?: string;
  ttDownloadables?: Record<string, { downloadUrls?: Record<string, string>; urls?: Array<{ url: string }> }>;
}

function publish(tracks: NfTrack[], movieId: string | null): void {
  const out = tracks
    .filter((t) => !t.isNoneTrack)
    .map((t) => {
      // Prefer any format that yields a URL; we sniff the body when fetching.
      let url: string | null = null;
      for (const fmt of Object.values(t.ttDownloadables ?? {})) {
        const direct = fmt?.downloadUrls ? Object.values(fmt.downloadUrls)[0] : undefined;
        const listed = fmt?.urls?.[0]?.url;
        url = direct ?? listed ?? null;
        if (url) break;
      }
      return {
        url,
        language: t.language ?? '',
        label: t.languageDescription ?? t.language ?? '',
        forced: Boolean(t.isForcedNarrative),
      };
    })
    .filter((t) => t.url);

  if (!out.length) return;
  window.postMessage({ source: TAG, kind: 'nf-tracks', tracks: out, movieId }, '*');
  console.debug('[libregaku] netflix tracks:', out.map((t) => t.language).join(', '));
}

const nativeParse = JSON.parse;
JSON.parse = function (this: unknown, ...args: Parameters<typeof JSON.parse>) {
  const data = nativeParse.apply(this as never, args);
  try {
    const d = data as { timedtexttracks?: NfTrack[]; movieId?: number | string } | null;
    if (d && Array.isArray(d.timedtexttracks)) {
      publish(d.timedtexttracks, d.movieId != null ? String(d.movieId) : null);
    }
  } catch {
    /* never let instrumentation break playback */
  }
  return data;
};

export {};
