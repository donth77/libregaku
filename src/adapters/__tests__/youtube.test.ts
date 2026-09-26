import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { YouTubeAdapter, parseJson3, parseTimedTextXml } from '../youtube';

describe('parseJson3', () => {
  it('converts events to cues in seconds', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 1500, dDurationMs: 2000, segs: [{ utf8: '彼女は' }, { utf8: '日本語を' }] },
      ],
    });
    expect(cues).toEqual([{ start: 1.5, end: 3.5, text: '彼女は日本語を' }]);
  });

  it('drops empty and whitespace-only events', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: '\n' }] },
        { tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: '   ' }] },
        { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: 'ok' }] },
      ],
    });
    expect(cues).toHaveLength(1);
    expect(cues[0]?.text).toBe('ok');
  });

  it('skips events with no start time, and sorts by start', () => {
    const cues = parseJson3({
      events: [
        { tStartMs: 5000, dDurationMs: 1000, segs: [{ utf8: 'second' }] },
        { dDurationMs: 1000, segs: [{ utf8: 'no start' }] },
        { tStartMs: 1000, dDurationMs: 1000, segs: [{ utf8: 'first' }] },
      ],
    });
    expect(cues.map((c) => c.text)).toEqual(['first', 'second']);
  });

  it('defaults a missing duration rather than producing NaN', () => {
    const cues = parseJson3({ events: [{ tStartMs: 0, segs: [{ utf8: 'x' }] }] });
    expect(cues[0]?.end).toBeGreaterThan(0);
    expect(Number.isFinite(cues[0]?.end)).toBe(true);
  });

  it('tolerates a missing events array', () => {
    expect(parseJson3({})).toEqual([]);
  });
});

describe('parseTimedTextXml', () => {
  it('decodes the character references srv1 leaves behind after XML parsing', () => {
    const cues = parseTimedTextXml(
      '<transcript><text start="1" dur="2">I&amp;#39;m &amp;quot;fine&amp;quot; &amp;amp; you?</text></transcript>',
    );
    expect(cues[0]?.text).toBe('I\'m "fine" & you?');
  });

  it('leaves a reference that names no character as it was', () => {
    const cues = parseTimedTextXml('<transcript><text start="0">x &amp;#99999999; y</text></transcript>');
    expect(cues[0]?.text).toBe('x &#99999999; y');
  });
});

/*
 * The adapter's per-video discipline. YouTube keeps one player and one page
 * across every video you click through, and plays ads in it, so a signal is
 * only trusted when it names the video in the address bar.
 */
describe('YouTubeAdapter', () => {
  const page = window as unknown as { happyDOM: { setURL(u: string): void } };
  const post = (data: unknown, source: unknown = window) =>
    window.dispatchEvent(new MessageEvent('message', { data, source: source as MessageEventSource }));
  const list = (videoId: string, tracks: unknown[], title = 'A title') =>
    post({ source: 'libregaku', kind: 'track-list', videoId, title, tracks });
  const track = (languageCode: string, kind?: string) => ({ baseUrl: `https://www.youtube.com/api/timedtext?v=x&lang=${languageCode}`, languageCode, kind });
  const signed = (v: string, lang: string, extra = '') =>
    `https://www.youtube.com/api/timedtext?v=${v}&lang=${lang}&signature=s&pot=p${extra}`;
  let adapters: YouTubeAdapter[] = [];
  const make = () => {
    const a = new YouTubeAdapter();
    adapters.push(a);
    return a;
  };

  beforeEach(() => {
    page.happyDOM.setURL('https://www.youtube.com/watch?v=current');
    document.title = 'Fallback title - YouTube';
    document.body.innerHTML = '<div id="movie_player"><div class="ytp-chrome-bottom"></div><video></video></div>';
  });

  afterEach(() => {
    adapters = [];
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('takes the video id from the address bar', () => {
    expect(make().videoId()).toBe('current');
  });

  it('ignores a track list for any other video', async () => {
    const a = make();
    list('previous', [track('ja')]);
    expect(await a.listTracks()).toEqual([]);
    list('current', [track('ja'), track('en')]);
    expect((await a.listTracks()).map((t) => t.lang)).toEqual(['ja', 'en']);
  });

  it('ignores messages that did not come from this window', async () => {
    const a = make();
    post({ source: 'libregaku', kind: 'track-list', videoId: 'current', tracks: [track('ja')] }, null);
    expect(await a.listTracks()).toEqual([]);
  });

  it('forgets the previous video on navigation, and does not reset on a repeat of the same one', async () => {
    const a = make();
    const nav = vi.fn();
    a.onNavigate(nav);
    list('current', [track('ja')], 'First video');

    window.dispatchEvent(new Event('yt-navigate-finish'));
    expect(nav).not.toHaveBeenCalled();
    expect(await a.listTracks()).toHaveLength(1);

    page.happyDOM.setURL('https://www.youtube.com/watch?v=next');
    window.dispatchEvent(new Event('yt-navigate-finish'));
    expect(nav).toHaveBeenCalledOnce();
    expect(await a.listTracks()).toEqual([]);
    expect(a.videoId()).toBe('next');
    // Not the first video's title, which is what <meta name="title"> still says.
    expect(a.title()).toBe('Fallback title');
  });

  it("uses the player's own title for this video", () => {
    const a = make();
    list('current', [track('ja')], 'The real title');
    expect(a.title()).toBe('The real title');
    expect(a.deepLink(61.9)).toBe('https://www.youtube.com/watch?v=current&t=61s');
  });

  it('says so when the player reports no captions at all, but not before it has reported', () => {
    const a = make();
    expect(a.noSubtitles()).toBe(false);
    list('current', []);
    expect(a.noSubtitles()).toBe(true);
  });

  it('reports an ad from the player class', () => {
    const a = make();
    expect(a.isAd()).toBe(false);
    document.getElementById('movie_player')!.classList.add('ad-showing');
    expect(a.isAd()).toBe(true);
  });

  it("never loads an ad's captions, or a machine translation, as the video's own", async () => {
    vi.useFakeTimers();
    const fetched: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetched.push(url);
      return new Response(JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: 'x' }] }] }));
    }));
    const a = make();
    list('current', [track('ja')]);
    // An ad's captions, and an auto-translation into Japanese: both "lang=ja"-ish, neither ours.
    post({ source: 'libregaku', kind: 'track-url', url: signed('the-ad', 'ja') });
    post({ source: 'libregaku', kind: 'track-url', url: signed('current', 'en', '&tlang=ja') });

    const loading = a.loadTrack('0');
    await vi.advanceTimersByTimeAsync(11_000);
    await loading;
    expect(fetched.some((u) => u.includes('the-ad'))).toBe(false);
    expect(fetched.some((u) => u.includes('tlang'))).toBe(false);
    vi.useRealTimers();
  });

  it('uses the signed URL captured for this video and track', async () => {
    const fetched: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetched.push(url);
      return new Response(JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: '日本語' }] }] }));
    }));
    const a = make();
    list('current', [track('ja'), track('ja', 'asr')]);
    post({ source: 'libregaku', kind: 'track-url', url: signed('current', 'ja', '&kind=asr') });
    post({ source: 'libregaku', kind: 'track-url', url: signed('current', 'ja') });

    const cues = await a.loadTrack('0');
    expect(cues[0]?.text).toBe('日本語');
    // The human track, not the auto-generated one captured alongside it.
    expect(fetched[0]).toContain('v=current');
    expect(fetched[0]).not.toContain('kind=asr');
  });

  it("ignores a request sent before the player had its token — YouTube answers those with nothing", async () => {
    vi.useFakeTimers();
    const fetched: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      fetched.push(url);
      return new Response('');
    }));
    const a = make();
    list('current', [track('ja')]);
    post({ source: 'libregaku', kind: 'track-url', url: 'https://www.youtube.com/api/timedtext?v=current&lang=ja&signature=s' });
    const loading = a.loadTrack('0').catch(() => []);
    await vi.advanceTimersByTimeAsync(11_000);
    await loading;
    expect(fetched.some((u) => u.includes('signature=s'))).toBe(false);
    vi.useRealTimers();
  });

  it('asks the player again, forcing a fresh request, until a signed one arrives', async () => {
    vi.useFakeTimers();
    const asks: Array<{ force?: boolean }> = [];
    const onAsk = (e: MessageEvent) => {
      const d = e.data as { kind?: string; force?: boolean };
      if (d?.kind === 'enable-captions') asks.push(d);
    };
    window.addEventListener('message', onAsk);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('')));
    const a = make();
    list('current', [track('ja')]);
    const loading = a.loadTrack('0').catch(() => []);
    await vi.advanceTimersByTimeAsync(6000);
    window.removeEventListener('message', onAsk);
    expect(asks.length).toBeGreaterThanOrEqual(2);
    expect(asks[0]?.force).toBe(false);
    expect(asks[1]?.force).toBe(true);
    await vi.advanceTimersByTimeAsync(6000);
    await loading;
    vi.useRealTimers();
  });

  it('measures the control bar from the bottom of the player', () => {
    const a = make();
    const player = document.getElementById('movie_player')!;
    const bar = player.querySelector('.ytp-chrome-bottom')!;
    vi.spyOn(player, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 500, left: 0, right: 800, width: 800, height: 500 } as DOMRect);
    vi.spyOn(bar, 'getBoundingClientRect').mockReturnValue({ top: 440, bottom: 488, left: 12, right: 788, width: 776, height: 48 } as DOMRect);
    expect(a.controlsHeight()).toBe(60);
  });
});
