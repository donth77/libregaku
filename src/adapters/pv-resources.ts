/**
 * The subtitle tracks in Prime Video's playback resources: the JSON its
 * player asks for before it plays (GetVodPlaybackResources). Recognising its
 * shape lives here, away from the page hook's plumbing, so it is tested
 * without a browser.
 */

export interface PvPublished {
  url: string;
  /** As the service spells it: "ja-jp", "en-us". */
  language: string;
  label: string;
  /** Describes sound as well as speech (type "Sdh"). */
  cc: boolean;
  /** Translates on-screen text only (forcedNarrativeUrls). */
  forced: boolean;
}

function entries(list: unknown, forced: boolean): PvPublished[] {
  if (!Array.isArray(list)) return [];
  const out: PvPublished[] = [];
  for (const raw of list as unknown[]) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.url !== 'string' || !r.url) continue;
    const language = typeof r.languageCode === 'string' ? r.languageCode : '';
    out.push({
      url: r.url,
      language,
      label: typeof r.displayName === 'string' && r.displayName ? r.displayName : language,
      cc: typeof r.type === 'string' && /sdh/i.test(r.type),
      forced,
    });
  }
  return out;
}

/**
 * The tracks in a playback-resources answer, or null when it is not one, or
 * carries none: the player asks more than once, and an answer without
 * subtitles (an advert's, a refused request's) must not replace one with.
 */
export function tracksFrom(data: unknown): PvPublished[] | null {
  if (typeof data !== 'object' || data === null) return null;
  const timed = (data as Record<string, unknown>).timedTextUrls;
  if (typeof timed !== 'object' || timed === null) return null;
  const result = (timed as Record<string, unknown>).result;
  if (typeof result !== 'object' || result === null) return null;
  const r = result as Record<string, unknown>;
  const tracks = [...entries(r.subtitleUrls, false), ...entries(r.forcedNarrativeUrls, true)];
  return tracks.length ? tracks : null;
}

/** "ja-jp" as BCP-47 writes it: "ja-JP". */
export function bcp47(code: string): string {
  const [lang, ...rest] = code.split(/[-_]/);
  if (!lang) return code;
  return [lang.toLowerCase(), ...rest.map((p) => (p.length === 2 ? p.toUpperCase() : p))].join('-');
}
