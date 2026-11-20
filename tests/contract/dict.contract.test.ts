import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';
import { toEntries as jishoEntries } from '../../src/dict/jisho';
import { toEntries as jotobaEntries } from '../../src/dict/jotoba';
import { parseLine } from '../../src/dict/cedict';
import { gunzipText } from '../../src/dict/download';
import { CANTO_URLS, CEDICT_URL, CXDICT_URL, HANDEDICT_URL, krdictUrl, parseCanto, wtyUrl } from '../../src/dict/sources';
import { zipFiles as unzip } from '../../src/dict/zip';
import { jmdictUrl, kanjidicUrl } from '../../src/dict/store';
import { wikdictEntries, wikdictUrl } from '../../src/dict/wikdict';
import { readRow } from '../../src/dict/wty';
import { zipFiles } from '../../src/dict/zip';
import { LINDERA_DICTS } from '../../src/morphology/dictionaries';
import { fetchCheckingHops } from './hosts';

/**
 * The dictionary is downloaded once, from a pinned GitHub release. The first
 * version of this URL pointed "latest" at a pinned filename and went 404 the
 * day a newer release shipped — with nothing on screen but a lookup card that
 * quietly used a remote API instead.
 *
 * The analyser's dictionary and the two remote APIs get the same treatment:
 * each is something we borrow, and each fails quietly when it moves.
 */

describe('dictionary contract', () => {
  it('dict.canto — the Cantonese files are still at cantonese.org, CC-CEDICT lines with Jyutping', async () => {
    const why = describeFailure('dict.canto');
    for (const url of [CANTO_URLS.words, CANTO_URLS.readings]) {
      const res = await fetchCheckingHops(url, {}, why);
      expect(res.ok, `${url} returned HTTP ${res.status}.\n${why}`).toBe(true);
      const file = unzip(new Uint8Array(await res.arrayBuffer())).find((f) => /\.txt$/.test(f.name));
      expect(file, `${url}: no text file inside.\n${why}`).toBeDefined();
      const rows = new TextDecoder().decode(await file!.bytes()).split('\n').slice(0, 2000).map(parseCanto).filter(Boolean);
      expect(rows.length, `${url}: no lines with Jyutping in its first 2000.\n${why}`).toBeGreaterThan(100);
    }
  }, 120_000);

  it('dict.krdict — krdict in the learner’s languages is still a release on GitHub', async () => {
    const why = describeFailure('dict.krdict');
    for (const lang of ['ja', 'zh', 'fr', 'es', 'ru', 'vi'] as const) {
      const res = await fetchCheckingHops(krdictUrl(lang), { method: 'HEAD' }, why);
      expect(res.ok, `${krdictUrl(lang)} returned HTTP ${res.status}.\n${why}`).toBe(true);
    }
  }, 60_000);

  it('dict.own-cedict — CFDICT (CxDICT) and HanDeDict are still CC-CEDICT lines at their addresses', async () => {
    const why = describeFailure('dict.own-cedict');
    for (const url of [CXDICT_URL, HANDEDICT_URL]) {
      const res = await fetchCheckingHops(url, {}, why);
      expect(res.ok, `${url} returned HTTP ${res.status}.\n${why}`).toBe(true);
      const lines = (await res.text()).split('\n').slice(0, 3000).map((l) => parseLine(l.replace(/\r$/, ''))).filter(Boolean);
      expect(lines.length, `${url}: no CC-CEDICT lines in its first 3000.\n${why}`).toBeGreaterThan(100);
    }
  }, 120_000);

  it('dict.jmdict-release — the pinned JMdict release is still downloadable', async () => {
    for (const edition of ['eng', 'all'] as const) {
      const res = await fetchCheckingHops(jmdictUrl(edition), { method: 'HEAD' }, describeFailure('dict.jmdict-release'));
      expect(res.ok, `${jmdictUrl(edition)} returned HTTP ${res.status}.\n${describeFailure('dict.jmdict-release')}`).toBe(true);
    }
  }, 60_000);

  it('dict.kanjidic-release — the pinned KANJIDIC2 file is still downloadable', async () => {
    const res = await fetchCheckingHops(kanjidicUrl(), { method: 'HEAD' }, describeFailure('dict.kanjidic-release'));
    expect(res.ok, `${kanjidicUrl()} returned HTTP ${res.status}.\n${describeFailure('dict.kanjidic-release')}`).toBe(true);
  }, 60_000);

  it('dict.lindera-release — the pinned analyser dictionaries are still downloadable', async () => {
    for (const [name, url] of Object.entries(LINDERA_DICTS)) {
      const res = await fetchCheckingHops(url, { method: 'HEAD' }, describeFailure('dict.lindera-release'));
      expect(res.ok, `${name}: ${url} returned HTTP ${res.status}.\n${describeFailure('dict.lindera-release')}`).toBe(true);
    }
  }, 60_000);

  it('dict.wikdict — a pair is still served, as a SQLite file the reader reads, with the words people look up', async () => {
    const why = describeFailure('dict.wikdict');
    const res = await fetchCheckingHops(wikdictUrl('fr', 'es'), {}, why);
    expect(res.ok, `${wikdictUrl('fr', 'es')} returned HTTP ${res.status}.\n${why}`).toBe(true);
    const found: Record<string, string> = {};
    let n = 0;
    for (const e of wikdictEntries(new Uint8Array(await res.arrayBuffer()))) {
      n++;
      if (['manger', 'maison'].includes(e.word)) found[e.word] = e.senses[0]?.glosses.join(', ') ?? '';
    }
    expect(n, `only ${n} entries.\n${why}`).toBeGreaterThan(30_000);
    expect(found.manger, why).toContain('comer');
    expect(found.maison, why).toContain('casa');
  }, 120_000);

  it('dict.wty-release — the pinned Wiktionary dictionaries are still downloadable, and read as the reader reads them', async () => {
    const why = describeFailure('dict.wty-release');
    for (const language of ['es', 'ko', 'fr', 'de', 'it', 'pt'] as const) {
      const res = await fetchCheckingHops(wtyUrl(language, 'en'), { method: 'HEAD' }, why);
      expect(res.ok, `${wtyUrl(language, 'en')} returned HTTP ${res.status}.\n${why}`).toBe(true);
    }
    // The real file, not only its address: the smaller of the two, whole.
    const res = await fetchCheckingHops(wtyUrl('ko', 'en'), {}, why);
    const number = (name: string): number => Number(/(\d+)\.json$/.exec(name)?.[1] ?? 0);
    const banks = zipFiles(new Uint8Array(await res.arrayBuffer()))
      .filter((f) => /^term_bank_\d+\.json$/.test(f.name))
      .sort((a, b) => number(a.name) - number(b.name));
    expect(banks.length, why).toBeGreaterThan(1);
    // The file holds its words first, then their inflected forms.
    const read = async (bank: (typeof banks)[number]) =>
      (JSON.parse(new TextDecoder().decode(await bank.bytes())) as unknown[]).map((row, i) => readRow(row, String(i)));
    const words = await read(banks[0]!);
    const forms = await read(banks[banks.length - 1]!);
    expect(words.filter((r) => r && 'entry' in r).length, why).toBeGreaterThan(100);
    expect(forms.filter((r) => r && 'inflection' in r).length, why).toBeGreaterThan(100);
  }, 240_000);

  it('dict.cedict — CC-CEDICT is still published, an entry to a line', async () => {
    const why = describeFailure('dict.cedict');
    const res = await fetchCheckingHops(CEDICT_URL, {}, why);
    expect(res.ok, `${CEDICT_URL} returned HTTP ${res.status}.\n${why}`).toBe(true);
    const text = await gunzipText(new Uint8Array(await res.arrayBuffer()));
    const rows = text.split('\n').map(parseLine).filter((r) => r !== null);
    expect(rows.length, why).toBeGreaterThan(100_000);
    expect(rows.find((r) => r.simplified === '学校'), why).toMatchObject({ traditional: '學校', pinyin: 'xue2 xiao4' });
  }, 240_000);

  it('dict.jotoba — word search still answers in the shape we read', async () => {
    const res = await fetchCheckingHops(
      'https://jotoba.de/api/search/words',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '食べる', language: 'English', no_english: false }),
      },
      describeFailure('dict.jotoba'),
    );
    expect(res.ok, `Jotoba returned HTTP ${res.status}.\n${describeFailure('dict.jotoba')}`).toBe(true);
    const [top] = jotobaEntries(((await res.json()) as { words?: never[] }).words ?? [], '食べる');
    expect(top?.word, describeFailure('dict.jotoba')).toBe('食べる');
    expect(top?.senses[0]?.glosses.length, describeFailure('dict.jotoba')).toBeGreaterThan(0);
  }, 60_000);

  it('dict.jisho — word search still answers in the shape we read', async () => {
    const res = await fetchCheckingHops(
      `https://jisho.org/api/v1/search/words?keyword=${encodeURIComponent('食べる')}`,
      // Jisho turns away Node's default user agent with a 403; the extension
      // asks as Chrome, so the canary does too.
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36' } },
      describeFailure('dict.jisho'),
    );
    expect(res.ok, `Jisho returned HTTP ${res.status}.\n${describeFailure('dict.jisho')}`).toBe(true);
    const [top] = jishoEntries(((await res.json()) as { data?: never[] }).data ?? [], '食べる');
    expect(top?.word, describeFailure('dict.jisho')).toBe('食べる');
    expect(top?.senses[0]?.glosses.length, describeFailure('dict.jisho')).toBeGreaterThan(0);
  }, 60_000);
});
