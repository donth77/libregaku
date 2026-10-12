/**
 * The clock Apple TV+'s player keeps against its subtitle files.
 *
 * The files' cue times do not sit on the <video>'s clock. Near the start of a
 * film the player shows a cue about 58 s after its file time; fifteen minutes
 * in, about 56.5 s, so the two run at slightly different rates. Nothing in the
 * files says by how much, so the adapter learns it from the player: the cues
 * the player has loaded for a track carry the same text at the moment it
 * draws them, and matching the two gives pairs of times the line can be fitted
 * through.
 *
 * Pure, so it is tested without a browser.
 */

/** A cue as the player or a file gives it: the text, and the start in seconds. */
export interface Timed {
  text: string;
  start: number;
}

/** The same cue, by the file's clock and by the player's. */
export interface Pair {
  file: number;
  player: number;
}

/** player = a * file + b */
export interface Clock {
  a: number;
  b: number;
}

/** Below this span the rate cannot be told apart from noise, so only the offset is fitted. */
const RATE_SPAN = 300;

/** Pairs that must agree before a clock is trusted. */
const MIN_PAIRS = 5;

/** The text two copies of a cue share: no tags, one space between words, no case. */
export function cueKey(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Pairs of a player cue with the file cue it came from. Without a clock yet,
 * the most common difference between same-text cues stands in for the offset;
 * with one, the file cue predicted nearest the player's cue is taken, if it is
 * within `window` seconds.
 */
export function pairsFrom(player: Timed[], file: Timed[], clock: Clock | null, window = 2): Pair[] {
  const byKey = new Map<string, number[]>();
  for (const f of file) {
    const k = cueKey(f.text);
    if (!k) continue;
    const list = byKey.get(k);
    if (list) list.push(f.start);
    else byKey.set(k, [f.start]);
  }

  let guess: number | null = clock ? clock.b : null;
  if (!clock) {
    // Half-second buckets: the true offset repeats across lines, a coincidence rarely does.
    const votes = new Map<number, number>();
    for (const p of player) {
      for (const f of byKey.get(cueKey(p.text)) ?? []) {
        const d = Math.round((p.start - f) * 2) / 2;
        votes.set(d, (votes.get(d) ?? 0) + 1);
      }
    }
    let most = 0;
    for (const [d, n] of votes) {
      if (n > most) {
        most = n;
        guess = d;
      }
    }
  }
  if (guess === null) return [];

  const out: Pair[] = [];
  for (const p of player) {
    let best: number | null = null;
    let bestErr = Infinity;
    for (const f of byKey.get(cueKey(p.text)) ?? []) {
      const expected = clock ? clock.a * f + clock.b : f + guess;
      const err = Math.abs(p.start - expected);
      if (err < bestErr) {
        bestErr = err;
        best = f;
      }
    }
    if (best !== null && bestErr <= window) out.push({ file: best, player: p.start });
  }
  return out;
}

/** Least squares through the pairs: player = a * file + b. */
export function fitLine(pairs: Pair[]): Clock {
  const n = pairs.length;
  const mf = pairs.reduce((s, p) => s + p.file, 0) / n;
  const mp = pairs.reduce((s, p) => s + p.player, 0) / n;
  let cov = 0;
  let varf = 0;
  for (const p of pairs) {
    cov += (p.file - mf) * (p.player - mp);
    varf += (p.file - mf) ** 2;
  }
  if (varf === 0) return { a: 1, b: mp - mf };
  const a = cov / varf;
  return { a, b: mp - a * mf };
}

function median(xs: number[]): number {
  const s = [...xs].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

/**
 * The clock the pairs support, or null while there are too few to trust.
 * Pairs that disagree with the first fit by more than `tolerance` seconds are
 * dropped (a repeated line matched to the wrong cue), and the fit is redone
 * without them. Over a short span only the offset is fitted; the rate is
 * assumed to be one, which is what the drift is over minutes.
 */
export function fitClock(pairs: Pair[], tolerance = 0.75): Clock | null {
  if (pairs.length < MIN_PAIRS) return null;
  const offset = median(pairs.map((p) => p.player - p.file));
  // A wide first cut, around the median offset, before any fit exists.
  const rough = pairs.filter((p) => Math.abs(p.player - p.file - offset) <= tolerance * 4);
  if (rough.length < MIN_PAIRS) return null;

  const fit = (set: Pair[]): Clock => {
    const span = Math.max(...set.map((p) => p.file)) - Math.min(...set.map((p) => p.file));
    return span < RATE_SPAN ? { a: 1, b: median(set.map((p) => p.player - p.file)) } : fitLine(set);
  };

  const first = fit(rough);
  const close = rough.filter((p) => Math.abs(p.player - (first.a * p.file + first.b)) <= tolerance);
  if (close.length < MIN_PAIRS) return null;
  return fit(close);
}
