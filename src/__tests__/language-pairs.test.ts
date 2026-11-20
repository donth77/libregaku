import { describe, expect, it, vi } from 'vitest';
import { dictionaryName, languagePairsPage } from '../../scripts/language-pairs-page';
import { DICTIONARIES, OWN_DICTIONARIES, FALLBACK_DICTIONARIES } from '../settings';

type Files = { readFileSync(path: string, encoding: 'utf8'): string };

describe('LANGUAGE-PAIRS.md', () => {
  it('says what the code does, so the store listing’s link never describes another build', async () => {
    const { readFileSync } = await vi.importActual<Files>('node:fs');
    const file = readFileSync('LANGUAGE-PAIRS.md', 'utf8').replace(/\r\n/g, '\n');
    expect(file, 'LANGUAGE-PAIRS.md is behind the code: run node scripts/language-pairs.mjs').toBe(languagePairsPage());
  });

  it('names every dictionary a pair can use', () => {
    const ids = [
      ...Object.values(DICTIONARIES),
      ...Object.values(OWN_DICTIONARIES).flatMap((byNative) => Object.values(byNative)),
      ...Object.values(FALLBACK_DICTIONARIES),
    ];
    for (const id of ids) expect(() => dictionaryName(id), id).not.toThrow();
  });
});
