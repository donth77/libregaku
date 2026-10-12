import { describe, expect, it } from 'vitest';
import { nameIn, protectedSites } from '../sites';

/**
 * In Arabic, a plus at the end of a site's name is drawn on the left of it
 * unless a left-to-right mark follows it. The mark is added only there: in
 * left-to-right languages the list stays as written.
 */
describe('site names in right-to-left text', () => {
  it('keeps the plus on the right of Disney+ in Arabic', () => {
    expect(nameIn('Disney+', 'ar')).toBe('Disney+‎');
    expect(nameIn('Netflix', 'ar')).toBe('Netflix');
  });

  it('leaves names alone in left-to-right languages', () => {
    expect(nameIn('Disney+', 'en')).toBe('Disney+');
    expect(nameIn('Disney+', 'fr')).toBe('Disney+');
  });

  it('marks the plus in the Arabic list only', () => {
    expect(protectedSites('ar')).toContain('Disney+‎');
    expect(protectedSites('en')).toBe('Netflix, Disney+, Prime Video, HBO Max, and Apple TV');
  });
});
