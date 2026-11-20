import { describe, expect, it, vi } from 'vitest';

type Files = {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: 'utf8'): string;
};

describe('the description Chrome shows, in src/_locales', () => {
  it('is in every locale, and within the 132 characters Chrome and its store allow', async () => {
    const { readdirSync, readFileSync } = await vi.importActual<Files>('node:fs');
    const locales = readdirSync('src/_locales');
    expect(locales).toContain('en');
    for (const locale of locales) {
      const messages = JSON.parse(readFileSync(`src/_locales/${locale}/messages.json`, 'utf8')) as Record<string, { message: string }>;
      const description = messages.extDescription?.message ?? '';
      expect(description.length, locale).toBeGreaterThan(0);
      expect([...description].length, `${locale}: ${description}`).toBeLessThanOrEqual(132);
    }
  });
});
