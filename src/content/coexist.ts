/**
 * Sharing the player with other subtitle extensions.
 *
 * A named list of competitors rots: there are dozens, most are closed-source,
 * and their class names change without notice. Maintaining one is the same
 * treadmill this project avoids everywhere else.
 *
 * So the mechanism is structural. Anything rendering subtitles over the video
 * leaves an absolutely-positioned block of text across the player; we measure
 * where those sit and put our line in the free space. That works for
 * extensions nobody has heard of yet.
 *
 * The named list survives only as a hint — it gives a better log message and a
 * known layout convention — never as the thing detection depends on.
 */

export interface Known {
  name: string;
  selector: string;
  /** Where this extension conventionally puts the target-language line. */
  primaryAt?: 'top' | 'bottom';
}

const KNOWN: Known[] = [
  { name: 'NflxMultiSubs', selector: '.nflxmultisubs-subtitle-svg, .nflxmultisubs-subtitle-wrapper', primaryAt: 'top' },
  { name: 'Language Reactor', selector: '[class*="lln-"], #lln-subs, .lln-container' },
  { name: 'Trancy', selector: '[class*="trancy"], #trancy-subtitle' },
  { name: 'asbplayer', selector: '[class*="asbplayer"]' },
  { name: 'Subadub', selector: '#subadub-custom-subs' },
  { name: 'Migaku', selector: '[class*="migaku"], #migaku-subtitles' },
  { name: 'EasySubs', selector: '[class*="es-subs"], [class*="easysubs"]' },
  { name: 'Dualsub', selector: '[class*="dualsub"], [id*="dualsub"]' },
];

export function namedMatches(): Known[] {
  return KNOWN.filter((k) => {
    try {
      return document.querySelector(k.selector) !== null;
    } catch {
      return false;
    }
  });
}

/** Ours — never counted as competition. */
const OURS = '.libregaku-root, .libregaku-notice';

/**
 * Vertical bands of the player already covered by somebody else's subtitles,
 * as fractions of player height.
 */
export function occupiedBands(player: HTMLElement, nativeSelector: string): Array<[number, number]> {
  const box = player.getBoundingClientRect();
  if (!box.height) return [];

  const bands: Array<[number, number]> = [];
  const covered = new Set<Element>();

  const record = (el: Element): void => {
    const r = el.getBoundingClientRect();
    if (!r.height || !r.width) return;
    if (r.bottom < box.top || r.top > box.bottom) return;
    bands.push([(r.top - box.top) / box.height, (r.bottom - box.top) / box.height]);
  };

  const mine = (el: Element): boolean =>
    Boolean(el.closest(OURS)) || Boolean(nativeSelector && el.closest(nativeSelector));

  // HTML subtitle blocks: positioned, text-bearing, spanning a good part of
  // the player. Wrappers are skipped so one line is not counted twice.
  for (const el of Array.from(player.querySelectorAll<HTMLElement>('div, span, p, section'))) {
    if (mine(el) || covered.has(el)) continue;

    const text = (el.textContent ?? '').trim();
    if (text.length < 2 || text.length > 400) continue;

    const cs = getComputedStyle(el);
    if (cs.position !== 'absolute' && cs.position !== 'fixed') continue;
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;

    const r = el.getBoundingClientRect();
    if (r.width < box.width * 0.15) continue;

    el.querySelectorAll('*').forEach((c) => covered.add(c));
    record(el);
  }

  /*
   * SVG-rendered subtitles need separate handling, and NflxMultiSubs is exactly
   * why: it draws its second line as SVG <text>, which the query above never
   * sees. Its <svg> container is also stretched over the whole player, so
   * measuring that would report the entire frame as occupied. Measure the drawn
   * glyphs instead — and skip the position check, since SVG children are laid
   * out by SVG coordinates and compute to `static`.
   */
  for (const el of Array.from(player.querySelectorAll<SVGGraphicsElement>('svg text, svg image'))) {
    if (mine(el)) continue;
    const owner = el.ownerSVGElement;
    if (owner && getComputedStyle(owner).visibility === 'hidden') continue;
    if ((el.textContent ?? '').trim().length < 1 && el.tagName.toLowerCase() !== 'image') continue;
    record(el);
  }

  return bands;
}

/** Merge bands that touch, so a two-line subtitle counts as one block. */
export function mergeBands(bands: Array<[number, number]>): Array<[number, number]> {
  const sorted = [...bands].sort((a, b) => a[0] - b[0]);
  const out: Array<[number, number]> = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && b[0] <= last[1] + 0.02) last[1] = Math.max(last[1], b[1]);
    else out.push([...b] as [number, number]);
  }
  return out;
}

/**
 * How far up from the bottom our line should sit, as a percentage of player
 * height.
 *
 * Subtitles belong in the lower part of the frame, always. Sharing the player
 * with another extension means *stacking* above its line, never jumping to the
 * opposite edge — an earlier version anchored to the top and put Japanese
 * above the video, which is worse than overlapping.
 */
export const DEFAULT_BOTTOM = 12;

/** Never rise past this, whatever else is on screen. */
const CEILING = 42;

/** Gap between our line and whatever sits below it. */
const GAP = 2;

/**
 * A subtitle block is never this tall. Anything taller is a full-player
 * wrapper, not a line of text.
 *
 * NflxMultiSubs is the case in point: `.nflxmultisubs-primary-wrapper` is
 * `position:absolute; width:100%; height:100%` and wraps Netflix's own text
 * container, so it looks exactly like a positioned, text-bearing, full-width
 * subtitle block — and measures as the entire frame. Believing it pushed our
 * line to the ceiling, stranding it mid-video.
 */
const MAX_BAND = 0.3;

export function bottomOffset(raw: Array<[number, number]>): number {
  // Drop container-shaped bands before merging, or one wrapper swallows
  // everything it contains.
  const real = raw.filter(([t, b]) => b - t <= MAX_BAND);
  const bands = mergeBands(real);
  // Only lines in the lower half compete with us for space.
  const lower = bands.filter(([, b]) => b > 0.55);
  if (!lower.length) return DEFAULT_BOTTOM;

  // Sit above the highest of them.
  const highestTop = Math.min(...lower.map(([t]) => t));
  const offset = (1 - highestTop) * 100 + GAP;

  return Math.min(Math.max(offset, DEFAULT_BOTTOM), CEILING);
}
