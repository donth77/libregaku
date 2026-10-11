import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';
import { audioUrlAllowed } from '../../src/audio/pronounce';
import {
  audioCmnUrl, filesIn, linguaLibreOf, linguaLibreSearch, mp3Of, namedOf, namedQuery, namedTitle, naverSearch, naverSoundIn, spanishDictVoice,
} from '../../src/audio/recordings';
import { fetchCheckingHops } from './hosts';

/**
 * The pronunciation endpoint is unofficial. It has served Yomitan, Anki
 * add-ons and others for years, but nobody promised it would keep working —
 * and its failure mode is silence, since we fall through to synthesis and
 * everything still appears to function.
 *
 * So it gets a canary like any other borrowed assumption.
 */

const JPOD = 'https://assets.languagepod101.com/dictionary/japanese/audiomp3.php';
const PLACEHOLDER_BYTES = 52288;

async function size(kanji: string, kana: string): Promise<number> {
  const res = await fetch(`${JPOD}?${new URLSearchParams({ kanji, kana })}`);
  expect(res.ok, `jpod101 returned HTTP ${res.status}`).toBe(true);
  return (await res.arrayBuffer()).byteLength;
}

describe('audio contract', () => {
  it('audio.jpod101 — every redirect hop is a host the manifest permits', async () => {
    // The endpoint 301s to a CDN. If that CDN is not in host_permissions the
    // content script's fetch fails outright, and the card falls back to
    // synthesis without a word about it.
    const res = await fetchCheckingHops(
      `${JPOD}?${new URLSearchParams({ kanji: '勉強', kana: 'べんきょう' })}`,
      {},
      describeFailure('audio.jpod101'),
    );
    expect(res.ok, `jpod101 returned HTTP ${res.status}`).toBe(true);
    // The service worker checks where a redirect lands against its own list,
    // separately from the manifest. A new CDN has to be on both.
    expect(
      audioUrlAllowed(res.url),
      `${res.url} is not in AUDIO_HOSTS in src/audio/pronounce.ts — the service worker ` +
        `will refuse the recording.\n${describeFailure('audio.jpod101')}`,
    ).toBe(true);
  }, 60_000);

  it('audio.jpod101 — still returns recordings for common vocabulary', async () => {
    for (const [k, r] of [['食べる', 'たべる'], ['勉強', 'べんきょう']] as const) {
      const n = await size(k, r);
      expect(
        n > 512 && n !== PLACEHOLDER_BYTES,
        `${k} returned ${n} bytes.\n${describeFailure('audio.jpod101')}`,
      ).toBe(true);
    }
  }, 60_000);

  it('audio.jpod101 — the missing-word placeholder is still that exact size', async () => {
    // Absence is detected by size, so a change here would make every word look
    // present and play a "not found" clip instead.
    const n = await size('ZZZZ', 'ずずず');
    expect(
      n,
      `The placeholder is now ${n} bytes, not ${PLACEHOLDER_BYTES}. ` +
        `Update JPOD_MISSING_BYTES in src/audio/pronounce.ts.`,
    ).toBe(PLACEHOLDER_BYTES);
  }, 60_000);

  it('audio.jpod101 — still rejects katakana readings, as the code assumes', async () => {
    // If this ever starts working, the hiragana normalisation is redundant
    // rather than load-bearing — worth knowing, not worth breaking over.
    const n = await size('食べる', 'タベル');
    expect(n).toBe(PLACEHOLDER_BYTES);
  }, 60_000);

  /*
   * The free recordings of Spanish, Chinese and Korean words. Asked the way
   * the extension asks, with its own questions (src/audio/recordings.ts), so
   * a change in what Commons answers, in how Lingua Libre names its files or
   * in where the MP3s live shows here and not as a voice quietly taking a
   * recording's place. Wikimedia limits clients that do not say who they are.
   */
  const WHO = {
    'User-Agent': 'Libregaku-canary/1 (https://github.com/donth77/libregaku)',
    'Api-User-Agent': 'Libregaku-canary/1 (https://github.com/donth77/libregaku)',
  };

  /** A recording at an address the extension would fetch: its type and size. */
  async function recording(url: string, id: string): Promise<{ type: string; bytes: number }> {
    expect(audioUrlAllowed(url), `${url} is not a place the service worker fetches from.\n${describeFailure(id)}`).toBe(true);
    const res = await fetchCheckingHops(url, { headers: WHO }, describeFailure(id));
    expect(res.ok, `${url} returned HTTP ${res.status}.\n${describeFailure(id)}`).toBe(true);
    return { type: res.headers.get('content-type') ?? '', bytes: (await res.arrayBuffer()).byteLength };
  }

  async function ask(url: string): Promise<unknown> {
    expect(audioUrlAllowed(url), `${url} is not a place the service worker fetches from`).toBe(true);
    const res = await fetchCheckingHops(url, { headers: WHO }, describeFailure('audio.commons'));
    expect(res.ok, `Commons returned HTTP ${res.status}.\n${describeFailure('audio.commons')}`).toBe(true);
    return res.json();
  }

  it('audio.commons — Lingua Libre still has common words, each with a licence and an MP3', async () => {
    for (const [word, iso] of [['casa', 'spa'], ['图书馆', 'cmn'], ['먹다', 'kor'], ['maison', 'fra'], ['Haus', 'deu'], ['猫', 'jpn']] as const) {
      const hit = linguaLibreOf(filesIn(await ask(linguaLibreSearch(word, iso))), word, iso);
      expect(hit, `No Lingua Libre recording of ${word} (${iso}) was found.\n${describeFailure('audio.commons')}`).not.toBeNull();
      expect(hit!.speaker.length, `no speaker in ${hit!.file.title}`).toBeGreaterThan(0);
      expect(hit!.file.licence, `${hit!.file.title} names no Creative Commons licence`).toMatch(/^CC/);
      const mp3 = mp3Of(hit!.file.url);
      expect(mp3, `${hit!.file.url} is not where Commons files were`).not.toBeNull();
      const got = await recording(mp3!, 'audio.commons');
      expect(
        got.type.startsWith('audio/mpeg') && got.bytes > 512,
        `${mp3} is ${got.bytes} bytes of ${got.type}.\n${describeFailure('audio.commons')}`,
      ).toBe(true);
    }
  }, 120_000);

  it("audio.commons — a Korean word is still found by its file's name, and a missing one is said to be missing", async () => {
    const title = namedTitle('Ko', '사람');
    const file = namedOf(filesIn(await ask(namedQuery(title))), title);
    expect(file, `${title} was not found.\n${describeFailure('audio.commons')}`).not.toBeNull();
    expect(file!.licence).toMatch(/^CC/);
    const got = await recording(mp3Of(file!.url)!, 'audio.commons');
    expect(got.type.startsWith('audio/mpeg') && got.bytes > 512, `${got.bytes} bytes of ${got.type}`).toBe(true);

    const none = namedTitle('Ko', '없는단어없는단어');
    expect(namedOf(filesIn(await ask(namedQuery(none))), none)).toBeNull();
  }, 60_000);

  it('audio.audio-cmn — the commit read still serves its words, and 404s for one it lacks', async () => {
    const got = await recording(audioCmnUrl('图书馆')!, 'audio.audio-cmn');
    expect(
      got.type.startsWith('audio/mpeg') && got.bytes > 512,
      `cmn-图书馆.mp3 is ${got.bytes} bytes of ${got.type}.\n${describeFailure('audio.audio-cmn')}`,
    ).toBe(true);
    // A word it lacks is told from a failure by this status.
    const missing = await fetch(audioCmnUrl('你好')!);
    expect(missing.status, describeFailure('audio.audio-cmn')).toBe(404);
  }, 60_000);
  it('audio.naver — a common word has a recording, and the search wants the dictionary\'s own Referer', async () => {
    const url = naverSearch('소리');
    expect(audioUrlAllowed(url), `${url} is not a place the service worker fetches from`).toBe(true);
    const asked = async (referer: string): Promise<string> => {
      const res = await fetchCheckingHops(url, { headers: { Referer: referer } }, describeFailure('audio.naver'));
      expect(res.ok, `Naver returned HTTP ${res.status}.\n${describeFailure('audio.naver')}`).toBe(true);
      return res.text();
    };
    const hit = naverSoundIn(JSON.parse(await asked('https://korean.dict.naver.com/')) as unknown, '소리');
    expect(hit, `No Naver recording of 소리 was found.\n${describeFailure('audio.naver')}`).not.toBeNull();
    const got = await recording(hit!.url, 'audio.naver');
    expect(got.type.startsWith('audio/mpeg') && got.bytes > 512, `${got.bytes} bytes of ${got.type}`).toBe(true);
    // Without its own Referer it answers with nothing; if that changes, the rule in background.ts can go.
    expect(await asked('https://example.org/'), 'Naver now answers a search from any Referer').toBe('');
  }, 60_000);
  it('audio.spanishdict — a Spanish word is said as an MP3, with no header asked for', async () => {
    const got = await recording(spanishDictVoice('casa'), 'audio.spanishdict');
    expect(got.type.startsWith('audio/mpeg') && got.bytes > 512, `${got.bytes} bytes of ${got.type}`).toBe(true);
  }, 60_000);
});
