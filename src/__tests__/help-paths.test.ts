import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnkiState } from '../anki/client';

/**
 * The help names settings by their path — {Settings → Anki → New cards go
 * to} — and a path is only any use if the settings say the same words. Each
 * language's help is read against that language's settings panel.
 */

vi.mock('../anki/client', () => ({
  probe: async (): Promise<AnkiState> => ({ kind: 'offline' }),
  browseOurCards: async () => {},
  browseMarks: async () => {},
  createDeck: async () => {},
}));

vi.stubGlobal('chrome', {
  storage: {
    sync: { get: async () => ({}), set: async () => {} },
    local: { get: async () => ({}), set: async () => {} },
    onChanged: { addListener: () => {} },
  },
  runtime: { getURL: (p: string) => `chrome-extension://testid/${p}` },
});

import { HELP_EN, helpFor, type HelpBlock } from '../help/content';
import { setUiLanguage, UI_LANGUAGES } from '../i18n';
import { buildSettings } from '../content/settings-panel';

const textOf = (block: HelpBlock): string[] =>
  typeof block === 'string' ? [block]
    : Array.isArray(block) ? block
      : 'tip' in block ? [block.tip]
        : [...block.head, ...block.rows.flat()];

afterEach(() => setUiLanguage('en'));

describe('a setting named in the help', () => {
  for (const lang of UI_LANGUAGES) {
    it(`is named as the settings name it, in ${lang}`, () => {
      setUiLanguage(lang);
      const help = helpFor(lang);
      const panel = buildSettings(() => {});
      // Each section's title, and what can be found in it: a row's name or a button.
      const sections = new Map<string, Set<string>>();
      for (const section of Array.from(panel.querySelectorAll('.grp-section'))) {
        const title = section.querySelector('.grp')?.textContent ?? '';
        const names = Array.from(section.querySelectorAll('.set > .name, button')).map((n) => n.textContent ?? '');
        sections.set(title, new Set(names));
      }
      const wrong: string[] = [];
      for (const topic of help.chapters.flatMap((c) => c.topics)) {
        for (const text of topic.body.flatMap(textOf)) {
          for (const [, path] of text.matchAll(/\{([^}]+)\}/g)) {
            const [root, section, setting] = path!.split('→').map((s) => s.trim());
            const ok = root === help.settings
              && (section === undefined || sections.has(section))
              && (setting === undefined || Boolean(sections.get(section!)?.has(setting)));
            if (!ok) wrong.push(`${topic.id}: {${path}}`);
          }
        }
      }
      expect(wrong).toEqual([]);
    });
  }

  it('is in the English help at all, so the check above checks something', () => {
    const paths = HELP_EN.chapters.flatMap((c) => c.topics).flatMap((t) => t.body.flatMap(textOf)).join(' ').match(/\{[^}]+\}/g);
    expect(paths?.length).toBeGreaterThan(10);
  });
});
