import { describe, expect, it, vi } from 'vitest';
import { AUDIO_HOSTS, AUDIO_PLACES, audioUrlAllowed, decodedSize, findRecording, jpodQuery, pronounce, templateHost } from '../pronounce';
import { cardAudio } from '../card-audio';
import { AUDIO_CMN, AUDIO_CMN_CREDIT, COMMONS_API, COMMONS_FILES, NAVER_API, NAVER_SOUNDS, SPANISHDICT_API } from '../recordings';

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

  it("allows Commons' query API and its files, one folder of one repository at one commit, and Naver's search and recordings", () => {
    expect(AUDIO_PLACES).toEqual([COMMONS_API, COMMONS_FILES, AUDIO_CMN, NAVER_API, NAVER_SOUNDS, SPANISHDICT_API]);
    for (const url of [
      `${COMMONS_API}action=query&titles=File%3AKo-%EC%82%AC%EB%9E%8C.ogg`,
      `${COMMONS_FILES}c/c1/LL-Q1321_%28spa%29-Julie_Samothrace-casa.wav`,
      `${COMMONS_FILES}transcoded/c/c1/x.wav/x.wav.mp3`,
      `${AUDIO_CMN}cmn-%E5%9B%BE%E4%B9%A6%E9%A6%86.mp3`,
    ]) expect(audioUrlAllowed(url), url).toBe(true);
  });

  it('allows nothing else on those hosts, however the address is dressed', () => {
    for (const url of [
      // The rest of Commons, of Wikimedia's files, and of GitHub.
      'https://commons.wikimedia.org/wiki/Special:UserLogin',
      'https://commons.wikimedia.org/w/index.php?title=Special:Upload',
      'https://commons.wikimedia.org/w/api.phpx?action=query',
      'https://upload.wikimedia.org/wikipedia/en/a/ab/x.ogg',
      'https://en.wikipedia.org/w/api.php?action=query',
      'https://raw.githubusercontent.com/hugolpz/audio-cmn/master/64k/hsk/cmn-x.mp3',
      'https://raw.githubusercontent.com/someone/else/main/x.mp3',
      // Climbing out of an allowed folder gets nowhere: the address is read as the browser would write it.
      `${COMMONS_FILES}../../w/index.php`,
      `${AUDIO_CMN}../../../../../../someone/else/main/x.mp3`,
      `${COMMONS_FILES.replace('https://', 'https://user:pw@')}c/c1/x.wav`,
      COMMONS_FILES.replace('https:', 'http:') + 'c/c1/x.wav',
    ]) expect(audioUrlAllowed(url), url).toBe(false);
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

describe('the voice a word is said in', () => {
  /** A browser with these voices, and no recording of anything. */
  function voices(...langs: string[]) {
    const said: Array<{ text: string; lang: string; voice?: { lang: string } }> = [];
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: vi.fn(async () => ({ ok: false, status: 404 })) },
      storage: { sync: { get: async () => ({}) } },
    });
    vi.stubGlobal('SpeechSynthesisUtterance', class { lang = ''; rate = 1; voice?: { lang: string }; constructor(public text: string) {} });
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => langs.map((lang) => ({ lang })),
      cancel: () => undefined,
      speak: (u: { text: string; lang: string; voice?: { lang: string } }) => said.push(u),
    });
    return said;
  }

  it('speaks a word in the language being learned, not in Japanese', async () => {
    const said = voices('ja-JP', 'en-US', 'es-MX', 'es-ES', 'ko-KR', 'zh-TW', 'zh-CN');
    // Words of their own: a recording found earlier in the session stays found.
    expect(await pronounce('correr', undefined, 'es')).toEqual({ source: 'synthesis', human: false });
    await pronounce('학교', undefined, 'ko');
    await pronounce('学校', 'xué xiào', 'zh');
    expect(said.map((u) => [u.text, u.lang, u.voice?.lang])).toEqual([
      ['correr', 'es-ES', 'es-ES'], ['학교', 'ko-KR', 'ko-KR'], ['学校', 'zh-CN', 'zh-CN'],
    ]);
  });

  it("takes any voice of the language when the usual country's is not installed", async () => {
    const said = voices('en-US', 'es-MX');
    await pronounce('comer', undefined, 'es');
    expect(said[0]).toMatchObject({ lang: 'es-ES', voice: { lang: 'es-MX' } });
  });

  it('still asks for the language when the browser has no voice for it', async () => {
    const said = voices('en-US');
    await pronounce('먹다', undefined, 'ko');
    expect(said[0]?.lang).toBe('ko-KR');
    expect(said[0]?.voice).toBeUndefined();
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

/**
 * Spanish, Chinese and Korean: free recordings, found through the service
 * worker's relay. Commons' answers are cut down from what it returned on
 * 2026-10-11 (recordings.test.ts reads them in full). Each test has words of
 * its own, since what is found, and what is known to be nowhere, is kept for
 * the session.
 */
describe('recordings of Spanish, Chinese and Korean words', () => {
  type Reply = number | { json: unknown } | { status: number } | { type: string; bytes: number } | undefined;

  /** The relay, answering each address as `answer` says: so many bytes of sound, an answer from Commons, a failure. */
  function relay(answer: (url: string) => Reply, template?: string): { asked: string[] } {
    const asked: string[] = [];
    const sendMessage = vi.fn(async (msg: { type: string; url: string }) => {
      asked.push(msg.url);
      const reply = answer(msg.url);
      if (reply === undefined) return { ok: false, status: 404 };
      if (typeof reply === 'number') return { ok: true, status: 200, type: 'audio/mpeg', bytes: btoa('x'.repeat(reply)) };
      if ('status' in reply) return { ok: false, status: reply.status };
      if ('bytes' in reply) return { ok: true, status: 200, type: reply.type, bytes: btoa('x'.repeat(reply.bytes)) };
      const text = String.fromCharCode(...new TextEncoder().encode(JSON.stringify(reply.json)));
      return { ok: true, status: 200, type: 'application/json', bytes: btoa(text) };
    });
    vi.stubGlobal('chrome', {
      runtime: { sendMessage },
      storage: { sync: { get: async () => (template ? { 'libregaku.audioTemplate': template } : {}) } },
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    return { asked };
  }

  const file = (title: string, path: string, licence: string, artist = ''): Record<string, unknown> => ({
    title,
    index: 1,
    imageinfo: [{
      url: `${COMMONS_FILES}${path}?utm_source=commons.wikimedia.org`,
      descriptionurl: `https://commons.wikimedia.org/wiki/${title.replace(/ /g, '_')}`,
      extmetadata: { LicenseShortName: { value: licence }, Artist: { value: artist } },
    }],
  });
  const found = (...pages: Array<Record<string, unknown>>) => ({ json: { batchcomplete: true, query: { pages } } });
  const nothing = { json: { batchcomplete: true } };
  /** What an address asks Commons, read back out of it. */
  const search = (url: string): string => new URL(url).searchParams.get('gsrsearch') ?? '';
  const titles = (url: string): string => new URL(url).searchParams.get('titles') ?? '';

  it("finds a Spanish word in Lingua Libre, and fetches the MP3 Commons makes of it", async () => {
    const { asked } = relay((url) => {
      if (search(url).includes('-mesa\\.wav')) return found(file('File:LL-Q1321 (spa)-Millars-mesa.wav', 'a/a1/LL-Q1321_%28spa%29-Millars-mesa.wav', 'CC BY-SA 4.0'));
      if (url.endsWith('.wav.mp3')) return 19000;
      return undefined;
    });
    const rec = await findRecording('mesa', undefined, 'es');
    expect(rec).toMatchObject({
      size: 19000, type: 'audio/mpeg', source: 'commons',
      credit: { by: 'Millars', licence: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-Millars-mesa.wav' },
    });
    expect(asked).toHaveLength(2);
    expect(asked[0]?.startsWith(COMMONS_API)).toBe(true);
    expect(search(asked[0]!)).toBe('intitle:/-mesa\\.wav/i incategory:"Lingua_Libre_pronunciation-spa"');
    expect(asked[1]).toBe(`${COMMONS_FILES}transcoded/a/a1/LL-Q1321_%28spa%29-Millars-mesa.wav/LL-Q1321_%28spa%29-Millars-mesa.wav.mp3`);
    // Every address asked is one the service worker will fetch.
    for (const url of asked) expect(audioUrlAllowed(url), url).toBe(true);
  });

  it('takes the file itself where Commons has made no MP3 of it', async () => {
    const { asked } = relay((url) => {
      if (search(url).includes('-silla\\.wav')) return found(file('File:LL-Q1321 (spa)-Ana-silla.wav', 'b/b2/Silla.wav', 'CC0'));
      if (url === `${COMMONS_FILES}b/b2/Silla.wav`) return { type: 'audio/x-wav', bytes: 90000 };
      return undefined;
    });
    expect(await findRecording('silla', undefined, 'es')).toMatchObject({ type: 'audio/x-wav', size: 90000, credit: { by: 'Ana', licence: 'CC0' } });
    // The MP3 first, then the file.
    expect(asked.slice(1)).toEqual([`${COMMONS_FILES}transcoded/b/b2/Silla.wav/Silla.wav.mp3`, `${COMMONS_FILES}b/b2/Silla.wav`]);
  });

  it("finds a Chinese word in audio-cmn first, credited to its one speaker", async () => {
    const { asked } = relay((url) => (url === `${AUDIO_CMN}cmn-${encodeURIComponent('学生')}.mp3` ? 11000 : undefined));
    const rec = await findRecording('学生', 'xué shēng', 'zh');
    expect(rec).toMatchObject({ source: 'audio-cmn', size: 11000, credit: AUDIO_CMN_CREDIT });
    expect(asked).toEqual([`${AUDIO_CMN}cmn-${encodeURIComponent('学生')}.mp3`]);
  });

  it('asks for a traditional word by its simplified form too, which is what audio-cmn names it by', async () => {
    const { asked } = relay((url) => (url.includes(encodeURIComponent('医生')) ? 12000 : undefined));
    expect(await findRecording('醫生', 'yī shēng', 'zh', ['医生'])).toMatchObject({ source: 'audio-cmn', size: 12000 });
    expect(asked.map((u) => decodeURIComponent(u.slice(AUDIO_CMN.length)))).toEqual(['cmn-醫生.mp3', 'cmn-医生.mp3']);
  });

  it('goes on to Lingua Libre for a Chinese word audio-cmn lacks', async () => {
    const { asked } = relay((url) => {
      if (search(url).includes('-奶茶\\.wav')) return found(file('File:LL-Q9192 (cmn)-Luilui6666-奶茶.wav', '2/2c/Naicha.wav', 'CC BY-SA 4.0'));
      if (url.endsWith('Naicha.wav.mp3')) return 18000;
      return undefined;
    });
    expect(await findRecording('奶茶', 'nǎi chá', 'zh')).toMatchObject({ source: 'commons', credit: { by: 'Luilui6666' } });
    expect(asked[0]?.startsWith(AUDIO_CMN)).toBe(true);
    expect(search(asked[1]!)).toBe('intitle:/-奶茶\\.wav/i incategory:"Lingua_Libre_pronunciation-cmn"');
  });

  it("finds a Korean word in Wiktionary's own files by name, then in Lingua Libre", async () => {
    const first = relay((url) => {
      if (titles(url) === 'File:Ko-나무.ogg') return found(file('File:Ko-나무.ogg', '8/89/Ko-namu.ogg', 'CC BY-SA 4.0', '<a href="//commons.wikimedia.org/wiki/User:HappyMidnight">HappyMidnight</a>'));
      if (url.endsWith('Ko-namu.ogg.mp3')) return 9000;
      return undefined;
    });
    expect(await findRecording('나무', undefined, 'ko')).toMatchObject({ source: 'commons', credit: { by: 'HappyMidnight', licence: 'CC BY-SA 4.0' } });
    expect(first.asked).toHaveLength(2);

    const second = relay((url) => {
      if (titles(url)) return found({ title: 'File:Ko-구름.ogg', missing: true });
      if (search(url).includes('-구름\\.wav')) return found(file('File:LL-Q9176 (kor)-호로조-구름.wav', '7/70/Gureum.wav', 'CC0'));
      if (url.endsWith('Gureum.wav.mp3')) return 9500;
      return undefined;
    });
    expect(await findRecording('구름', undefined, 'ko')).toMatchObject({ source: 'commons', credit: { by: '호로조', licence: 'CC0' } });
    expect(titles(second.asked[0]!)).toBe('File:Ko-구름.ogg');
    expect(search(second.asked[1]!)).toContain('Lingua_Libre_pronunciation-kor');
  });

  it('asks once for a word no source has, and again once the learner names a source of their own', async () => {
    const none = relay(() => nothing);
    expect(await findRecording('zarigüeya', undefined, 'es')).toBeNull();
    expect(none.asked).toHaveLength(1);
    expect(await findRecording('zarigüeya', undefined, 'es')).toBeNull();
    expect(none.asked).toHaveLength(1);

    const own = relay((url) => (url.includes('audio.example.org') ? 4000 : nothing), 'https://audio.example.org/es/{word}.mp3');
    expect(await findRecording('zarigüeya', undefined, 'es')).toMatchObject({ source: 'custom' });
    expect(own.asked.at(-1)).toBe('https://audio.example.org/es/zarig%C3%BCeya.mp3');
  });

  it('asks again for a word whose source gave no answer the first time', async () => {
    const down = relay(() => ({ status: 503 }));
    expect(await findRecording('tormenta', undefined, 'es')).toBeNull();
    expect(await findRecording('雷雨', undefined, 'zh')).toBeNull();
    const before = down.asked.length;
    expect(await findRecording('tormenta', undefined, 'es')).toBeNull();
    expect(down.asked.length).toBeGreaterThan(before);

    const up = relay((url) => (url.startsWith(AUDIO_CMN) ? 10000 : undefined));
    expect(await findRecording('雷雨', undefined, 'zh')).toMatchObject({ source: 'audio-cmn' });
    expect(up.asked).toHaveLength(1);
  });

  it('does not ask Commons about what is not a word', async () => {
    const { asked } = relay(() => nothing);
    expect(await findRecording('¿qué?', undefined, 'es')).toBeNull();
    expect(await findRecording('a|b', undefined, 'ko')).toBeNull();
    expect(asked).toEqual([]);
  });

  it("goes on to the learner's own source when the free ones have nothing", async () => {
    const { asked } = relay((url) => (url.includes('audio.example.org') ? 4000 : nothing), 'https://audio.example.org/{word}.mp3');
    expect(await findRecording('murciélago', undefined, 'es')).toMatchObject({ source: 'custom' });
    expect(asked[0]?.startsWith(COMMONS_API)).toBe(true);
    expect(asked[1]).toBe('https://audio.example.org/murci%C3%A9lago.mp3');
  });

  it('says who recorded the word it plays', async () => {
    relay((url) => {
      if (search(url).includes('-luna\\.wav')) return found(file('File:LL-Q1321 (spa)-Rodelar-luna.wav', 'c/c3/Luna.wav', 'CC BY 4.0'));
      return url.endsWith('.mp3') ? 15000 : undefined;
    });
    vi.stubGlobal('Audio', class { play = async (): Promise<void> => {}; pause(): void {} });
    const make = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:recording');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    expect(await pronounce('luna', undefined, 'es')).toEqual({
      source: 'commons', human: true,
      credit: { by: 'Rodelar', licence: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:LL-Q1321_(spa)-Rodelar-luna.wav' },
    });
    expect(make).toHaveBeenCalledOnce();
  });

  it('puts the credit on the card with the recording, named for the word', async () => {
    relay((url) => (url.includes(encodeURIComponent('老师')) ? 11000 : undefined));
    expect(await cardAudio({ word: '老師', reading: 'lǎo shī', lang: 'zh', also: ['老师'] })).toEqual({
      data: btoa('x'.repeat(11000)),
      filename: 'libregaku_老師_lǎo_shī.mp3',
      credit: AUDIO_CMN_CREDIT,
    });
  });
  /** Naver Dictionary's answer for a word, cut down from what it returned on 2026-10-11. */
  const naver = (word: string, file = `${NAVER_SOUNDS}words/000/000904.mp3?_lsu_sa_=abc`): { json: unknown } => ({
    json: { searchResultMap: { searchResultListMap: { WORD: { items: [
      { expEntry: `<strong>${word}</strong>`, searchPhoneticSymbolList: [{ symbolValue: '', symbolFile: file }] },
    ] } } } },
  });

  it("plays Naver Dictionary's recording of a Korean word the free sources lack, credited to Naver", async () => {
    const { asked } = relay((url) => {
      if (url.startsWith(NAVER_API)) return naver('소리');
      if (url.startsWith(NAVER_SOUNDS)) return 15000;
      return nothing;
    });
    const rec = await findRecording('소리', undefined, 'ko');
    expect(rec).toMatchObject({
      source: 'naver', size: 15000,
      credit: { by: 'Naver Dictionary', licence: '© NAVER', page: `https://korean.dict.naver.com/koendict/#/search?query=${encodeURIComponent('소리')}` },
    });
    // The free sources first, then Naver's search, then the file the search names.
    expect(asked.at(-2)?.startsWith(NAVER_API)).toBe(true);
    expect(new URL(asked.at(-2)!).searchParams.get('query')).toBe('소리');
    expect(asked.at(-1)).toBe(`${NAVER_SOUNDS}words/000/000904.mp3?_lsu_sa_=abc`);
    for (const url of asked) expect(audioUrlAllowed(url), url).toBe(true);
  });

  it('does not take Naver for a card: a card gets a free recording or none', async () => {
    const naverOnly = (url: string) =>
      url.startsWith(NAVER_API) ? naver(new URL(url).searchParams.get('query') ?? '') : url.startsWith(NAVER_SOUNDS) ? 14000 : nothing;
    const { asked } = relay(naverOnly);
    expect(await cardAudio({ word: '바람', lang: 'ko' })).toBeNull();
    expect(asked.some((u) => u.startsWith(NAVER_API) || u.startsWith(NAVER_SOUNDS))).toBe(false);

    // Even after the word was played, which keeps Naver's recording for the session.
    const again = relay(naverOnly);
    expect(await findRecording('하늘', undefined, 'ko')).toMatchObject({ source: 'naver' });
    expect(await findRecording('하늘', undefined, 'ko', [], true)).toBeNull();
    expect(await cardAudio({ word: '하늘', lang: 'ko' })).toBeNull();
    expect(again.asked.filter((u) => u.startsWith(NAVER_API))).toHaveLength(1);
  });

  it("keeps a free recording for the card when one exists, and Naver's is not asked for", async () => {
    const { asked } = relay((url) => {
      if (titles(url) === 'File:Ko-물.ogg') return found(file('File:Ko-물.ogg', '1/1a/Ko-mul.ogg', 'CC BY-SA 4.0', 'Someone'));
      return url.endsWith('Ko-mul.ogg.mp3') ? 9000 : undefined;
    });
    expect(await findRecording('물', undefined, 'ko')).toMatchObject({ source: 'commons' });
    expect(await cardAudio({ word: '물', lang: 'ko' })).toMatchObject({ credit: { licence: 'CC BY-SA 4.0' } });
    expect(asked.some((u) => u.startsWith(NAVER_API))).toBe(false);
  });

  it('says a word is not in Naver when no entry of exactly that word has a recording', async () => {
    const { asked } = relay((url) => (url.startsWith(NAVER_API) ? naver('소리굽쇠') : nothing));
    expect(await findRecording('굽쇠', undefined, 'ko')).toBeNull();
    expect(asked.some((u) => u.startsWith(NAVER_SOUNDS))).toBe(false);
  });

  it('asks again when Naver gave no answer, which is what it gives a request it does not trust', async () => {
    const { asked } = relay((url) => (url.startsWith(NAVER_API) ? { type: 'application/json', bytes: 0 } : nothing));
    expect(await findRecording('구두', undefined, 'ko')).toBeNull();
    const before = asked.length;
    expect(await findRecording('구두', undefined, 'ko')).toBeNull();
    expect(asked.length).toBeGreaterThan(before);
  });

  it('refuses Naver addresses that are not its word search or its recordings', () => {
    expect(audioUrlAllowed(`${NAVER_API}query=x`)).toBe(true);
    expect(audioUrlAllowed(`${NAVER_SOUNDS}words/000/000904.mp3`)).toBe(true);
    for (const url of [
      'https://korean.dict.naver.com/api3/koen/search?query=x',
      'https://korean.dict.naver.com/koendict/',
      'https://dict-dn.pstatic.net/other/a.mp3',
      'https://dict-dn.pstatic.net.evil.example/naver/dic/naverdic/krdic/sound/a.mp3',
    ]) expect(audioUrlAllowed(url), url).toBe(false);
  });
  it("plays SpanishDict's voice for a Spanish word no recording exists of, said to be a voice and not a recording", async () => {
    const { asked } = relay((url) => (url.startsWith(SPANISHDICT_API) ? 13000 : nothing));
    vi.stubGlobal('Audio', class { play = async (): Promise<void> => {}; pause(): void {} });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:voice');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    expect(await pronounce('ñandú', undefined, 'es')).toEqual({ source: 'spanishdict', human: false });
    expect(new URL(asked.at(-1)!).searchParams.get('text')).toBe('ñandú');
    expect(new URL(asked.at(-1)!).searchParams.get('lang')).toBe('es');
    for (const url of asked) expect(audioUrlAllowed(url), url).toBe(true);
  });

  it("never puts SpanishDict's voice on a card, and leaves other languages to the browser's voice", async () => {
    const { asked } = relay((url) => (url.startsWith(SPANISHDICT_API) ? 13000 : nothing));
    expect(await findRecording('ñu', undefined, 'es')).toBeNull();
    expect(await cardAudio({ word: 'ñu', lang: 'es' })).toBeNull();
    expect(asked.some((u) => u.startsWith(SPANISHDICT_API))).toBe(false);
    vi.stubGlobal('window', { speechSynthesis: undefined });
    await pronounce('고양이', undefined, 'ko');
    expect(asked.some((u) => u.startsWith(SPANISHDICT_API))).toBe(false);
    vi.unstubAllGlobals();
  });
});

