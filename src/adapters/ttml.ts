import type { Cue } from './types';

/**
 * TTML / imsc1, which is what Netflix serves.
 *
 * Times come in three shapes and all three appear in the wild:
 *   "619619619t"   ticks, divided by the root's ttp:tickRate
 *   "00:01:02.500" clock
 *   "62.5s"        seconds
 */
export function parseTtml(xml: string): Cue[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return [];

  const root = doc.documentElement;
  const tickRate =
    Number(root?.getAttribute('ttp:tickRate') ?? root?.getAttribute('tickRate') ?? 0) || 10_000_000;

  const time = (v: string | null): number | null => {
    if (!v) return null;
    if (v.endsWith('t')) return Number(v.slice(0, -1)) / tickRate;
    if (v.endsWith('ms')) return Number(v.slice(0, -2)) / 1000;  // before 's'
    if (v.endsWith('s')) return Number(v.slice(0, -1));
    const parts = v.split(':').map(Number);
    if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const cues: Cue[] = [];
  for (const p of Array.from(doc.querySelectorAll('p'))) {
    const start = time(p.getAttribute('begin'));
    const end = time(p.getAttribute('end'));
    if (start === null) continue;

    // <br/> separates lines within one cue; everything else is inline.
    const text = Array.from(p.childNodes)
      .map((n) => (n.nodeName.toLowerCase() === 'br' ? '\n' : (n.textContent ?? '')))
      .join('')
      .replace(/[ \t]+/g, ' ')
      .trim();
    if (!text) continue;

    cues.push({ start, end: end ?? start + 4, text });
  }
  return cues.sort((a, b) => a.start - b.start);
}
