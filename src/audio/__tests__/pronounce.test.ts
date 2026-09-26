import { describe, expect, it } from 'vitest';
import { AUDIO_HOSTS, audioUrlAllowed, jpodQuery, templateHost } from '../pronounce';

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

