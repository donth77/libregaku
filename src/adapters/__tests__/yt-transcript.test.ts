import { describe, expect, it } from 'vitest';
import { readSegments } from '../yt-transcript';

function panel(rows: Array<[string, string]>): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = rows
    .map(
      ([t, s]) =>
        `<ytd-transcript-segment-renderer>
           <div class="segment-timestamp">${t}</div>
           <div class="segment-text">${s}</div>
         </ytd-transcript-segment-renderer>`,
    )
    .join('');
  return root;
}

describe('readSegments', () => {
  it('reads timestamps and text', () => {
    const cues = readSegments(panel([['0:05', '彼女は'], ['0:09', '日本語を']]));
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({ start: 5, text: '彼女は' });
  });

  it('derives each end time from the next start, since the panel gives none', () => {
    const cues = readSegments(panel([['0:05', 'a'], ['0:09', 'b']]));
    expect(cues[0]?.end).toBe(9);
  });

  it('gives the last line a sensible duration', () => {
    const cues = readSegments(panel([['0:05', 'only']]));
    expect(cues[0]?.end).toBeGreaterThan(5);
  });

  it('parses hour-length timestamps', () => {
    const cues = readSegments(panel([['1:02:05', 'late']]));
    expect(cues[0]?.start).toBe(3725);
  });

  it('skips rows missing a timestamp or text', () => {
    const root = panel([['0:05', 'kept']]);
    root.innerHTML += '<ytd-transcript-segment-renderer><div class="segment-text">no stamp</div></ytd-transcript-segment-renderer>';
    expect(readSegments(root)).toHaveLength(1);
  });

  it('returns nothing when the panel is absent', () => {
    expect(readSegments(document.createElement('div'))).toEqual([]);
  });
});
