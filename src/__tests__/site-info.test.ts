import { describe, expect, it } from 'vitest';
import { TRANSLATIONS } from '../i18n/all';
import { markSites } from '../site-info';

/**
 * "Protected sites" is underlined wherever the interface says it, and names
 * the sites on hover. The words are found by a pattern per language, so a
 * translation reworded past its pattern would lose the mark without anything
 * looking broken. These are the sentences that say it.
 */

function marked(text: string, locale: string): string[] {
  const el = document.createElement('p');
  el.textContent = text;
  markSites(el, locale, () => {});
  return [...el.querySelectorAll('button.sites')].map((b) => b.textContent ?? '');
}

describe('markSites', () => {
  it('marks the English phrase, one site or several', () => {
    expect(marked('Sound from protected sites, and each tab of a protected site.', 'en')).toEqual([
      'protected sites',
      'protected site',
    ]);
  });

  it('leaves the words as they were', () => {
    const el = document.createElement('p');
    el.textContent = 'Not available on protected sites, which block it.';
    markSites(el, 'en', () => {});
    expect(el.textContent).toBe('Not available on protected sites, which block it.');
  });

  for (const [code, t] of Object.entries(TRANSLATIONS)) {
    it(`${code}: every sentence that says it is marked`, () => {
      const sentences = {
        cardSentenceAudioHint: t.settings?.cardSentenceAudioHint,
        cardScreenshotHint: t.settings?.cardScreenshotHint,
        capture: t.settings?.capture,
        captureAllowed: t.settings?.captureAllowed,
        captureNeeded: t.settings?.captureNeeded,
        captureReady: t.action?.captureReady,
      };
      for (const [key, text] of Object.entries(sentences)) {
        expect(typeof text, `${code} has no ${key}`).toBe('string');
        expect(marked(text as string, code).length, `${code} ${key}: "${text}"`).toBeGreaterThan(0);
      }
    });
  }
});
