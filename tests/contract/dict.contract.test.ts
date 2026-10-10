import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';
import { toEntries as jishoEntries } from '../../src/dict/jisho';
import { toEntries as jotobaEntries } from '../../src/dict/jotoba';
import { jmdictUrl, kanjidicUrl } from '../../src/dict/store';
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

  it('dict.lindera-release — the pinned IPADIC build is still downloadable', async () => {
    for (const [name, url] of Object.entries(LINDERA_DICTS)) {
      const res = await fetchCheckingHops(url, { method: 'HEAD' }, describeFailure('dict.lindera-release'));
      expect(res.ok, `${name}: ${url} returned HTTP ${res.status}.\n${describeFailure('dict.lindera-release')}`).toBe(true);
    }
  }, 60_000);

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
