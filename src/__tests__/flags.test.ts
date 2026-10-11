import { describe, expect, it } from 'vitest';
import { COUNTRIES, SPOKEN_IN, flagChoices, flagOf } from '../flags';
import { TARGET_LANGUAGES } from '../settings';

/** The flags the badge can show, and which come first for each language. */

describe('the flags a badge can show', () => {
  it('are made from each country\'s code', () => {
    expect(flagOf('JP')).toBe('🇯🇵');
    expect(flagOf('GB')).toBe('🇬🇧');
  });

  it('are every ISO 3166-1 country, once each, and nothing else', () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(new Set(COUNTRIES).size).toBe(COUNTRIES.length);
    for (const code of COUNTRIES) expect(code).toMatch(/^[A-Z]{2}$/);
    // Unicode has flags for these too, but none of them is a country's code.
    for (const code of ['EU', 'UN', 'XK', 'AC', 'IC']) expect(COUNTRIES).not.toContain(code);
  });

  it('start with the countries where each language is spoken, its own badge first', () => {
    for (const lang of TARGET_LANGUAGES) {
      const spoken = SPOKEN_IN[lang.code] ?? [];
      expect(spoken.length, lang.code).toBeGreaterThan(0);
      expect(new Set(spoken).size, lang.code).toBe(spoken.length);
      for (const code of spoken) expect(COUNTRIES, `${lang.code}: ${code}`).toContain(code);
      if (lang.flag) expect(flagOf(spoken[0]!), lang.code).toBe(lang.flag);
    }
  });

  it('go on with every other country, once, by its name in the interface language', () => {
    const { spoken, others } = flagChoices('pt', 'en');
    expect(spoken.slice(0, 2)).toEqual([{ flag: '🇧🇷', name: 'Brazil' }, { flag: '🇵🇹', name: 'Portugal' }]);
    expect(spoken.length + others.length).toBe(COUNTRIES.length);
    expect(others.map((c) => c.flag)).not.toContain('🇧🇷');
    const names = others.map((c) => c.name);
    expect(names).toEqual([...names].sort(new Intl.Collator('en').compare));
    expect(flagChoices('pt', 'es').spoken[0]).toEqual({ flag: '🇧🇷', name: 'Brasil' });
  });
});
