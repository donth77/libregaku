import { describe, expect, it } from 'vitest';
import { describeFailure } from '../../src/assumptions';
import { jmdictUrl } from '../../src/dict/store';
import { fetchCheckingHops } from './hosts';

/**
 * The dictionary is downloaded once, from a pinned GitHub release. The first
 * version of this URL pointed "latest" at a pinned filename and went 404 the
 * day a newer release shipped — with nothing on screen but a lookup card that
 * quietly used a remote API instead.
 */

describe('dictionary contract', () => {
  it('dict.jmdict-release — the pinned JMdict release is still downloadable', async () => {
    for (const edition of ['eng', 'all'] as const) {
      const res = await fetchCheckingHops(jmdictUrl(edition), { method: 'HEAD' }, describeFailure('dict.jmdict-release'));
      expect(res.ok, `${jmdictUrl(edition)} returned HTTP ${res.status}.\n${describeFailure('dict.jmdict-release')}`).toBe(true);
    }
  }, 60_000);
});
