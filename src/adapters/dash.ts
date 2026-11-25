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
  /**
   * One WebVTT file per segment, in order, resolved against the manifest's
   * URL; or, where the track is one whole file (Viki's), that file alone.
   */
  urls: string[];
  /**
   * Where the track's lines sit on the <video>'s clock: one part for each Period it is listed in.
   * A line's time is the media's (the period's presentationTimeOffset onwards); the element plays
   * it at `start + (time - offset)`, and the part ends at `end`.
   */
  parts: DashPart[];
}

export interface DashPart {
  /** When the period begins on the <video>'s clock, in seconds. */
  start: number;
  /** When it ends, in seconds; Infinity where the manifest does not say. */
  end: number;
  /** The media time the period begins at (presentationTimeOffset), in seconds. */
  offset: number;
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
  const periods = Array.from(doc.querySelectorAll('Period'));
  const total = isoSeconds(doc.documentElement.getAttribute('mediaPresentationDuration'));
  // A period without a start follows the one before it; one without a duration lasts until the next begins.
  const spans: Array<{ start: number; end: number }> = [];
  let after = 0;
  for (const period of periods) {
    const start = isoSeconds(period.getAttribute('start')) ?? after;
    const duration = isoSeconds(period.getAttribute('duration'));
    after = duration === null ? start : start + duration;
    spans.push({ start, end: duration === null ? Infinity : start + duration });
  }
  spans.forEach((span, i) => {
    if (span.end === Infinity) span.end = spans[i + 1]?.start ?? total ?? Infinity;
  });

  for (const [p, period] of periods.entries()) {
    const span = spans[p] ?? { start: 0, end: Infinity };
    const periodSeconds = isoSeconds(period.getAttribute('duration')) ?? isoSeconds(doc.documentElement.getAttribute('mediaPresentationDuration'));
    for (const set of Array.from(period.querySelectorAll('AdaptationSet'))) {
      const rep = set.querySelector('Representation');
      const kind = set.getAttribute('contentType') ?? set.getAttribute('mimeType') ?? rep?.getAttribute('mimeType') ?? '';
      if (!/^text|vtt|ttml/i.test(kind) && !/vtt|ttml/i.test(rep?.getAttribute('mimeType') ?? '')) continue;
      if (!rep) continue;
      const template = rep.querySelector('SegmentTemplate') ?? set.querySelector('SegmentTemplate');
      const media = template?.getAttribute('media');

      const urls: string[] = [];
      if (template && media) {
        const startNumber = Number(template.getAttribute('startNumber') ?? 1);
        segmentStarts(template, periodSeconds).forEach((time, i) => {
          try {
            urls.push(new URL(fill(media, { number: startNumber + i, time, id: rep.getAttribute('id') ?? '' }), base).href);
          } catch {
            /* not a URL: leave the segment out */
          }
        });
      } else {
        // No segments: the Representation's BaseURL is the whole track.
        const file = rep.querySelector('BaseURL')?.textContent?.trim();
        try {
          if (file) urls.push(new URL(file, base).href);
        } catch {
          /* not a URL: no track */
        }
      }
      if (!urls.length) continue;

      const language = set.getAttribute('lang') ?? '';
      const scale = Number(template?.getAttribute('timescale') ?? 1) || 1;
      const offset = Number(template?.getAttribute('presentationTimeOffset') ?? 0) / scale;
      out.push({
        language,
        role: set.querySelector('Role')?.getAttribute('value') ?? 'subtitle',
        label: set.querySelector('Label')?.textContent?.trim() || set.getAttribute('label')?.trim() || language,
        urls,
        parts: [{ start: span.start, end: span.end, offset: Number.isFinite(offset) ? offset : 0 }],
      });
    }
  }
  return out;
}

/**
 * One track for each that the title's periods share. A manifest with ad breaks in it lists the
 * title as several periods, each with its own copy of every track holding only that part's lines:
 * HBO Max's plan with ads has four parts, and so every language four times, the first of which
 * ends at the first break. Tracks of one language, role and label are joined in order, the n-th
 * of a period to the n-th of the next, with each part's place on the clock.
 */
export function joinPeriods(tracks: DashTrack[]): DashTrack[] {
  const joined = new Map<string, DashTrack>();
  const counted = new Map<string, number>();
  for (const t of tracks) {
    const kind = `${t.language}|${t.role}|${t.label}`;
    const inPeriod = `${t.parts[0]?.start ?? 0}|${kind}`;
    const n = counted.get(inPeriod) ?? 0;
    counted.set(inPeriod, n + 1);
    const key = `${kind}|${n}`;
    const into = joined.get(key);
    if (into) {
      into.urls.push(...t.urls);
      into.parts.push(...t.parts);
    } else {
      joined.set(key, { ...t, urls: [...t.urls], parts: [...t.parts] });
    }
  }
  return [...joined.values()];
}

/**
 * Where the <video>'s clock `seconds` is on the media's, the clock a track's lines are timed on.
 * Between parts (an ad break) and after the last, where the title stopped. Null without parts.
 */
export function mediaTime(parts: readonly DashPart[], seconds: number): number | null {
  const first = parts[0];
  if (!first) return null;
  let at = first.offset;
  for (const p of parts) {
    if (seconds < p.start) break;
    at = Math.min(seconds, p.end) - p.start + p.offset;
  }
  return at;
}

/** The <video>'s clock for the media time `seconds`: the inverse of mediaTime. Null without parts. */
export function elementTime(parts: readonly DashPart[], seconds: number): number | null {
  const first = parts[0];
  if (!first) return null;
  let at = first.start + seconds - first.offset;
  for (const p of parts) {
    if (seconds < p.offset) break;
    at = p.start + seconds - p.offset;
  }
  return at;
}

/** Whether the <video>'s clock `seconds` is in none of the parts: an ad, or a card before or after the title. */
export function betweenParts(parts: readonly DashPart[], seconds: number): boolean {
  return parts.length > 0 && !parts.some((p) => seconds >= p.start && seconds < p.end);
}
