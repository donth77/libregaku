import lockupMarkup from '../brand/libregaku-logo-horizontal-color-on-dark.svg';
import symbolMarkup from '../brand/libregaku-symbol-color-on-dark.svg';

/**
 * The logo, straight from brand/.
 *
 * Imported rather than copied, so the UI cannot drift from the masters and
 * replacing the files in brand/ replaces the logo everywhere it appears. Only
 * the on-dark versions: every surface that shows it — the toolbar popup, the
 * options page, the bar over the player — is dark.
 *
 * Inline rather than an <img>: the player bar lives in the host page, where an
 * extension URL would have to be declared web-accessible, and that would let
 * any site detect the extension.
 */
const MARKUP = { symbol: symbolMarkup, lockup: lockupMarkup } as const;

export type LogoKind = keyof typeof MARKUP;

/**
 * The logo as an <svg> of the given height; the width follows the artwork.
 * With a label it is an image by that name, without one it is decoration.
 */
export function logo(kind: LogoKind, height: number, label?: string): SVGSVGElement | null {
  const tpl = document.createElement('template');
  tpl.innerHTML = MARKUP[kind];
  const svg = tpl.content.querySelector('svg');
  if (!svg) return null;

  // The masters name themselves with <title id="title">. Two on one page, or
  // one inside a host document, would share that id.
  svg.querySelector('title')?.remove();
  svg.removeAttribute('aria-labelledby');

  const [, , w = 1, h = 1] = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  const ratio = w > 0 && h > 0 ? w / h : 1;
  svg.setAttribute('height', String(height));
  svg.setAttribute('width', String(Math.round(height * ratio * 100) / 100));

  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.removeAttribute('role');
    svg.setAttribute('aria-hidden', 'true');
  }
  return svg;
}
