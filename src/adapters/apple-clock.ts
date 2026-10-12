/**
 * The offset between Apple TV+'s subtitle files and the player's clock.
 *
 * The player shows a cue a fixed number of seconds after the file's own cue
 * time, about a minute: 58.06 s in one session, 56.47 s in another, and the
 * same for every cue within a session, however far in the film or after how
 * many seeks. Nothing in the files says what the number is, so the adapter
 * learns it from the player: the cues the player has loaded for a track carry
 * the same text at the moment it draws them, and matching the two gives pairs
 * of times whose difference is the offset.
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

/** Pairs that must agree before an offset is trusted. */
const MIN_PAIRS = 5;

/** The text two copies of a cue share: no tags, one space between words, no case. */
export function cueKey(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Pairs of a player cue with the file cue it came from. Without an offset yet,
 * the most common difference between same-text cues stands in for it; with
 * one, the file cue predicted nearest the player's cue is taken, if it is
 * within `window` seconds.
 */
export function pairsFrom(player: Timed[], file: Timed[], offset: number | null, window = 2): Pair[] {
  const byKey = new Map<string, number[]>();
  for (const f of file) {
    const k = cueKey(f.text);
    if (!k) continue;
    const list = byKey.get(k);
    if (list) list.push(f.start);
    else byKey.set(k, [f.start]);
  }

  let guess: number | null = offset;
  if (guess === null) {
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
      const err = Math.abs(p.start - (f + guess));
      if (err < bestErr) {
        bestErr = err;
        best = f;
      }
    }
    if (best !== null && bestErr <= window) out.push({ file: best, player: p.start });
  }
  return out;
}

function median(xs: number[]): number {
  const s = [...xs].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
}

/**
 * The offset the pairs agree on, in seconds (player time minus file time), or
 * null while there are too few to trust. Pairs that sit more than `tolerance`
 * from the consensus are dropped (a repeated line matched to the wrong cue),
 * and the offset is the median of those that remain.
 */
export function fitOffset(pairs: Pair[], tolerance = 0.75): number | null {
  if (pairs.length < MIN_PAIRS) return null;
  const consensus = median(pairs.map((p) => p.player - p.file));
  const close = pairs.filter((p) => Math.abs(p.player - p.file - consensus) <= tolerance);
  if (close.length < MIN_PAIRS) return null;
  return median(close.map((p) => p.player - p.file));
}
