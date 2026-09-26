import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchViaTranscriptPanel, readSegments } from '../yt-transcript';

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

describe('fetchViaTranscriptPanel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('closes the transcript panel after reading, not the first panel on the page', async () => {
    // A chapters panel comes first in the document, as it does on YouTube, and
    // the transcript's close button is labelled in Japanese — the UI language
    // a learner may well have chosen.
    document.body.innerHTML = `
      <ytd-engagement-panel-section-list-renderer target-id="engagement-panel-macro-markers">
        <ytd-engagement-panel-title-header-renderer>
          <div id="visibility-button"><button aria-label="Close">x</button></div>
        </ytd-engagement-panel-title-header-renderer>
      </ytd-engagement-panel-section-list-renderer>
      <ytd-video-description-transcript-section-renderer><button>Show transcript</button></ytd-video-description-transcript-section-renderer>
      <ytd-engagement-panel-section-list-renderer target-id="engagement-panel-searchable-transcript">
        <ytd-engagement-panel-title-header-renderer>
          <div id="visibility-button"><button aria-label="文字起こしを閉じる">x</button></div>
        </ytd-engagement-panel-title-header-renderer>
        <div id="segments"></div>
      </ytd-engagement-panel-section-list-renderer>`;

    const chapters = vi.fn();
    const transcript = vi.fn();
    document.querySelector('[target-id="engagement-panel-macro-markers"] button')!.addEventListener('click', chapters);
    document.querySelector('[target-id="engagement-panel-searchable-transcript"] button')!.addEventListener('click', transcript);
    // Opening the panel renders its lines, as YouTube does.
    document.querySelector('ytd-video-description-transcript-section-renderer button')!.addEventListener('click', () => {
      document.querySelector('#segments')!.appendChild(panel([['0:05', '彼女は'], ['0:09', '日本語を']]));
    });

    const cues = await fetchViaTranscriptPanel(1000);

    expect(cues.map((c) => c.text)).toEqual(['彼女は', '日本語を']);
    expect(transcript).toHaveBeenCalledTimes(1);
    expect(chapters).not.toHaveBeenCalled();
  });

  it('leaves a panel open that was already open', async () => {
    document.body.innerHTML = `
      <ytd-engagement-panel-section-list-renderer target-id="engagement-panel-searchable-transcript">
        <ytd-engagement-panel-title-header-renderer>
          <div id="visibility-button"><button aria-label="Close transcript">x</button></div>
        </ytd-engagement-panel-title-header-renderer>
      </ytd-engagement-panel-section-list-renderer>`;
    document.querySelector('ytd-engagement-panel-section-list-renderer')!.appendChild(panel([['0:05', '彼女は']]));
    const closed = vi.fn();
    document.querySelector('#visibility-button button')!.addEventListener('click', closed);

    expect(await fetchViaTranscriptPanel(1000)).toHaveLength(1);
    expect(closed).not.toHaveBeenCalled();
  });
});
