/**
 * The parts of an HLS playlist a subtitle adapter reads: which subtitle
 * renditions a master playlist offers, which segments a rendition is made of,
 * and where a WebVTT segment sits on the programme's clock.
 *
 * Pure, so it is tested without a browser. Nothing here fetches.
 */

import { parseVtt } from './netflix';
import type { Cue } from './types';

export interface HlsRendition {
  /** BCP-47, as the playlist's LANGUAGE gives it. Empty when it gives none. */
  language: string;
  name: string;
  forced: boolean;
  /** Describes sound as well as speech (SDH). */
  cc: boolean;
  /** The rendition's own playlist, resolved against the master's URL. */
  uri: string;
}

/** `KEY=value,KEY="quoted, value"` as a map. Keys are upper-cased. */
export function attributesOf(list: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z0-9-]+)=("([^"]*)"|[^,]*)/g;
  for (let m = re.exec(list); m; m = re.exec(list)) {
    const key = m[1];
    if (key) out[key.toUpperCase()] = m[3] ?? m[2] ?? '';
  }
  return out;
}

function resolve(uri: string, base: string): string | null {
  try {
    return new URL(uri, base).href;
  } catch {
    return null;
  }
}

/** The subtitle renditions a master playlist lists, in its order. */
export function subtitleRenditions(master: string, base: string): HlsRendition[] {
  const out: HlsRendition[] = [];
  for (const raw of master.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/^#EXT-X-MEDIA:/i.test(line)) continue;
    const a = attributesOf(line.slice(line.indexOf(':') + 1));
    if ((a.TYPE ?? '').toUpperCase() !== 'SUBTITLES' || !a.URI) continue;
    const uri = resolve(a.URI, base);
    if (!uri) continue;
    const name = a.NAME ?? '';
    out.push({
      language: a.LANGUAGE ?? '',
      name: name || (a.LANGUAGE ?? ''),
      forced: /^yes$/i.test(a.FORCED ?? '') || /forced/i.test(a.URI),
      cc: /transcribes-spoken-dialog|describes-music-and-sound/i.test(a.CHARACTERISTICS ?? '') || /\bSDH\b|\[CC\]/i.test(name),
      uri,
    });
  }
  return out;
}

/** A media playlist's segment URLs, in order, resolved against the playlist's URL. */
export function segmentUrls(playlist: string, base: string): string[] {
  const out: string[] = [];
  for (const raw of playlist.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const url = resolve(line, base);
    if (url) out.push(url);
  }
  return out;
}

const clock = (v: string): number => {
  const p = v.trim().split(':').map(Number);
  if (p.some((n) => !Number.isFinite(n))) return NaN;
  if (p.length === 3) return (p[0] ?? 0) * 3600 + (p[1] ?? 0) * 60 + (p[2] ?? 0);
  if (p.length === 2) return (p[0] ?? 0) * 60 + (p[1] ?? 0);
  return NaN;
};

/**
 * Seconds to add to a WebVTT segment's cue times to put them on the
 * programme's clock, from its X-TIMESTAMP-MAP (MPEGTS in 90 kHz ticks against
 * a LOCAL cue time). Null when the segment carries no map.
 */
export function timestampOffset(vtt: string): number | null {
  const line = /^X-TIMESTAMP-MAP\s*=\s*([^\r\n]+)$/im.exec(vtt)?.[1];
  if (!line) return null;
  const local = /(?:^|,)\s*LOCAL:([^,\s]+)/i.exec(line)?.[1];
  const mpegts = /(?:^|,)\s*MPEGTS:(\d+)/i.exec(line)?.[1];
  if (!local || !mpegts) return null;
  const offset = Number(mpegts) / 90_000 - clock(local);
  return Number.isFinite(offset) ? offset : null;
}

/**
 * One track's cues from its segments' text, in segment order.
 *
 * Each segment says where it sits with X-TIMESTAMP-MAP. The first segment's
 * offset is taken as zero and the rest are shifted by their difference from
 * it, so a track whose segments all share one offset is left alone. A cue
 * that straddles two segments is listed in both, and kept once.
 */
export function cuesFromSegments(segments: string[]): Cue[] {
  const out: Cue[] = [];
  const seen = new Set<string>();
  let base: number | null = null;
  for (const text of segments) {
    const offset = timestampOffset(text) ?? 0;
    if (base === null) base = offset;
    const shift = offset - base;
    for (const cue of parseVtt(text)) {
      const start = cue.start + shift;
      const end = cue.end + shift;
      const key = `${start.toFixed(3)}|${end.toFixed(3)}|${cue.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ start, end, text: cue.text });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
