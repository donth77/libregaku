import { describe, expect, it } from 'vitest';
import { logo } from '../logo';

/**
 * The logo arrives from brand/ as markup. What would fail quietly is the
 * import itself — a renamed master, or a loader that hands over a URL instead
 * of the file, and the logo simply vanishes — or two copies on one page
 * sharing the masters' <title id>.
 */
describe('logo', () => {
  it('builds both versions from the masters, sized by height', () => {
    for (const kind of ['symbol', 'lockup'] as const) {
      const svg = logo(kind, 26);
      expect(svg?.tagName.toLowerCase()).toBe('svg');
      expect(svg!.querySelector('path')).not.toBeNull();
      const [, , w, h] = svg!.getAttribute('viewBox')!.split(' ').map(Number);
      expect(svg!.getAttribute('height')).toBe('26');
      expect(Number(svg!.getAttribute('width'))).toBeCloseTo((26 * w!) / h!, 1);
    }
  });

  it('is named only when given a name, and carries no id to collide on', () => {
    const named = logo('lockup', 26, 'Libregaku')!;
    expect(named.getAttribute('role')).toBe('img');
    expect(named.getAttribute('aria-label')).toBe('Libregaku');
    const plain = logo('symbol', 30)!;
    expect(plain.getAttribute('aria-hidden')).toBe('true');
    expect(plain.hasAttribute('role')).toBe(false);
    for (const svg of [named, plain]) {
      expect(svg.querySelector('title')).toBeNull();
      expect(svg.querySelector('[id]')).toBeNull();
      expect(svg.hasAttribute('aria-labelledby')).toBe(false);
    }
  });
});
