import { describe, expect, it, vi } from 'vitest';
import { AUDIO_HOSTS, audioUrlAllowed, decodedSize, findRecording, jpodQuery, templateHost } from '../pronounce';
import { cardAudio } from '../card-audio';

const parse = (q: string) => Object.fromEntries(new URLSearchParams(q));

describe('jpodQuery', () => {
  it('converts a katakana reading to hiragana', () => {
    // Lindera returns katakana; the service only answers to hiragana, so this
    // was silently missing for every kanji word.
    expect(parse(jpodQuery('食べる', 'タベル'))).toEqual({ kanji: '食べる', kana: 'たべる' });
  });

  it('leaves a hiragana reading alone', () => {
    expect(parse(jpodQuery('勉強', 'べんきょう')).kana).toBe('べんきょう');
  });

  it('always sends kana, falling back to the word itself', () => {
    // kanji=やばい alone misses; kanji=やばい&kana=やばい returns audio.
    expect(parse(jpodQuery('やばい'))).toEqual({ kanji: 'やばい', kana: 'やばい' });
  });

  it('normalises a kana-only word given as katakana', () => {
    expect(parse(jpodQuery('ヤバイ')).kana).toBe('やばい');
  });
});

describe('what the service worker may fetch as audio', () => {
  const JPOD = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kanji=%E7%8C%AB&kana=%E3%81%AD%E3%81%93';

  it('allows jpod101 and the CDN it redirects to', () => {
    expect(audioUrlAllowed(JPOD)).toBe(true);
    expect(audioUrlAllowed('https://cdn.innovativelanguage.com/sizes/x.mp3')).toBe(true);
    expect(AUDIO_HOSTS).toHaveLength(2);
  });

  it('refuses every other host, including ones dressed up as jpod101', () => {
    for (const url of [
      'https://example.org/a.mp3',
      'https://assets.languagepod101.com.evil.example/a.mp3',
      'https://evil.example/assets.languagepod101.com/a.mp3',
      'https://mail.google.com/mail/u/0/',
    ]) expect(audioUrlAllowed(url)).toBe(false);
  });

  it('refuses plain http, credentials in the URL, and anything that is not a URL', () => {
    expect(audioUrlAllowed(JPOD.replace('https:', 'http:'))).toBe(false);
    expect(audioUrlAllowed('https://user:pw@assets.languagepod101.com/a.mp3')).toBe(false);
    expect(audioUrlAllowed('not a url')).toBe(false);
  });

  it("allows the user's own template host, and only that host and port", () => {
    const template = 'https://audio.example.org:8443/ja/{word}.mp3';
    expect(templateHost(template)).toBe('audio.example.org:8443');
    expect(audioUrlAllowed('https://audio.example.org:8443/ja/%E7%8C%AB.mp3', template)).toBe(true);
    expect(audioUrlAllowed('https://audio.example.org/ja/x.mp3', template)).toBe(false);
    expect(audioUrlAllowed('https://other.example.org:8443/x.mp3', template)).toBe(false);
  });

  it('ignores a template that is not usable', () => {
    expect(templateHost('https://example.org/no-placeholder.mp3')).toBeNull();
    expect(templateHost('http://example.org/{word}.mp3')).toBeNull();
    expect(templateHost(42)).toBeNull();
    expect(audioUrlAllowed('https://example.org/x.mp3', 'http://example.org/{word}.mp3')).toBe(false);
  });
});


/** The service worker's fetch-audio answers: by URL, a body of this many bytes. */
function serve(bodies: Record<string, number>, template?: string): ReturnType<typeof vi.fn> {
  const sendMessage = vi.fn(async (msg: { type: string; url: string }) => {
    const hit = Object.entries(bodies).find(([part]) => msg.url.includes(part));
    if (!hit) return { ok: false, status: 404 };
    return { ok: true, status: 200, type: 'audio/mpeg', bytes: btoa('x'.repeat(hit[1])) };
  });
  vi.stubGlobal('chrome', {
    runtime: { sendMessage },
    storage: { sync: { get: async () => (template ? { 'libregaku.audioTemplate': template } : {}) } },
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  return sendMessage;
}

const kana = (s: string) => encodeURIComponent(s);

describe('decodedSize', () => {
  it('counts the bytes behind base64, padding included', () => {
    for (const n of [0, 1, 2, 3, 4, 52288]) expect(decodedSize(btoa('x'.repeat(n)))).toBe(n);
  });
});

describe('findRecording', () => {
  it('returns what jpod101 has, as base64 with its size', async () => {
    serve({ [kana('ねこ')]: 9000 });
    const rec = await findRecording('猫', 'ネコ', 'ja');
    expect(rec).toMatchObject({ size: 9000, type: 'audio/mpeg', source: 'jpod101' });
    expect(rec?.data).toBe(btoa('x'.repeat(9000)));
  });

  it("takes jpod101's placeholder for no recording", async () => {
    serve({ [kana('ぬえ')]: 52288 });
    expect(await findRecording('鵺', 'ぬえ', 'ja')).toBeNull();
  });

  it('fetches a word once, however often it is played or carded', async () => {
    const sent = serve({ [kana('いぬ')]: 9000 });
    await findRecording('犬', 'いぬ', 'ja');
    await findRecording('犬', 'いぬ', 'ja');
    expect(sent).toHaveBeenCalledOnce();
  });

  it("never asks jpod101 about another language, but tries the learner's own source", async () => {
    const sent = serve({ 'audio.example.org': 4000 }, 'https://audio.example.org/es/{word}.mp3');
    const rec = await findRecording('hablar', undefined, 'es');
    expect(rec?.source).toBe('custom');
    expect(sent.mock.calls.every(([m]) => !String((m as { url: string }).url).includes('languagepod101'))).toBe(true);
  });

  it('has nothing when no source does', async () => {
    // A word of its own: recordings found earlier stay found for the session.
    serve({});
    expect(await findRecording('comer', undefined, 'es')).toBeNull();
  });
});

describe('cardAudio', () => {
  it('names the recording for the card', async () => {
    serve({ [kana('とり')]: 9000 });
    expect(await cardAudio({ word: '鳥', reading: 'とり', lang: 'ja' }))
      .toEqual({ data: btoa('x'.repeat(9000)), filename: 'libregaku_鳥_とり.mp3' });
  });

  it('does not hold a card up for a recording that is slow to come', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: () => new Promise(() => {}) },
      storage: { sync: { get: async () => ({}) } },
    });
    const pending = cardAudio({ word: '亀', reading: 'かめ', lang: 'ja' });
    await vi.advanceTimersByTimeAsync(6000);
    expect(await pending).toBeNull();
    vi.useRealTimers();
  });
});
