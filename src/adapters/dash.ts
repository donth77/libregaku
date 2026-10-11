/**
 * The subtitle tracks an MPEG-DASH manifest lists, and the URL of each of
 * their segments. Reads text only; nothing here fetches, so it is tested
 * without a browser.
 */

export interface DashTrack {
  /** As the manifest spells it: "zh-Hans-CN". */
  language: string;
  /** The Role's value: "subtitle", "caption", "forced-subtitle". */
  role: string;
  label: string;
  /** One WebVTT file per segment, in order, resolved against the manifest's URL. */
  urls: string[];
}

/** An ISO 8601 duration ("PT47M3.88S") in seconds, or null. */
export function isoSeconds(iso: string | null | undefined): number | null {
  const m = /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(iso ?? '');
  if (!m) return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

/** `$Number$`, `$Number%05d$`, `$Time$` and `$RepresentationID$` filled in. */
function fill(template: string, vars: { number: number; time: number; id: string }): string {
  return template.replace(/\$(Number|Time|RepresentationID)(?:%0(\d+)d)?\$/g, (_, name: string, width?: string) => {
    const value = name === 'Number' ? vars.number : name === 'Time' ? vars.time : vars.id;
    return width ? String(value).padStart(Number(width), '0') : String(value);
  });
}

/**
 * Each segment's start time in the template's timescale, from a
 * SegmentTimeline's S elements (with their r repeats), or from a fixed
 * duration across the period.
 */
function segmentStarts(template: Element, periodSeconds: number | null): number[] {
  const starts: number[] = [];
  const timeline = template.querySelector('SegmentTimeline');
  if (timeline) {
    let at = 0;
    for (const s of Array.from(timeline.querySelectorAll('S'))) {
      const t = s.getAttribute('t');
      if (t !== null && Number.isFinite(Number(t))) at = Number(t);
      const d = Number(s.getAttribute('d'));
      if (!Number.isFinite(d) || d <= 0) continue;
      const repeats = Math.max(0, Number(s.getAttribute('r') ?? 0) || 0);
      for (let i = 0; i <= repeats; i++) {
        starts.push(at);
        at += d;
      }
    }
    return starts;
  }
  const d = Number(template.getAttribute('duration'));
  const scale = Number(template.getAttribute('timescale') ?? 1) || 1;
  if (d > 0 && periodSeconds) {
    const count = Math.ceil((periodSeconds * scale) / d);
    for (let i = 0; i < count; i++) starts.push(i * d);
  }
  return starts;
}

/** The text tracks of a manifest, in its order. Empty for anything that is not one. */
export function textTracks(mpd: string, base: string): DashTrack[] {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(mpd, 'application/xml');
  } catch {
    return [];
  }
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'MPD') return [];

  const out: DashTrack[] = [];
  for (const period of Array.from(doc.querySelectorAll('Period'))) {
    const periodSeconds = isoSeconds(period.getAttribute('duration')) ?? isoSeconds(doc.documentElement.getAttribute('mediaPresentationDuration'));
    for (const set of Array.from(period.querySelectorAll('AdaptationSet'))) {
      const rep = set.querySelector('Representation');
      const kind = set.getAttribute('contentType') ?? set.getAttribute('mimeType') ?? rep?.getAttribute('mimeType') ?? '';
      if (!/^text|vtt|ttml/i.test(kind) && !/vtt|ttml/i.test(rep?.getAttribute('mimeType') ?? '')) continue;
      const template = rep?.querySelector('SegmentTemplate') ?? set.querySelector('SegmentTemplate');
      const media = template?.getAttribute('media');
      if (!rep || !template || !media) continue;

      const startNumber = Number(template.getAttribute('startNumber') ?? 1);
      const urls: string[] = [];
      segmentStarts(template, periodSeconds).forEach((time, i) => {
        try {
          urls.push(new URL(fill(media, { number: startNumber + i, time, id: rep.getAttribute('id') ?? '' }), base).href);
        } catch {
          /* not a URL: leave the segment out */
        }
      });
      if (!urls.length) continue;

      const language = set.getAttribute('lang') ?? '';
      out.push({
        language,
        role: set.querySelector('Role')?.getAttribute('value') ?? 'subtitle',
        label: set.querySelector('Label')?.textContent?.trim() || language,
        urls,
      });
    }
  }
  return out;
}
