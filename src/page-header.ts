import { logo } from './logo';

/**
 * The bar across the top of the settings page and the help page, the same on
 * both: the logo (which goes to the other page's front too, as a logo does),
 * the name of the page you are on, and a link to the other one.
 *
 * Drawn into `<header id="site-top">`, and drawn again when the interface
 * language changes: the words are the page's own, so the caller says them.
 */

export type Page = 'settings' | 'help';

/** Where each page is, relative to the other. */
const URLS: Record<Page, string> = { settings: 'options.html', help: 'help.html' };

export interface PageHeaderWords {
  /** The name of the page you are on. */
  heading: string;
  /** The link to the other page: its name. */
  other: string;
}

export function pageHeader(current: Page, words: PageHeaderWords): void {
  const host = document.getElementById('site-top');
  if (!host) return;
  const other: Page = current === 'settings' ? 'help' : 'settings';

  const bar = document.createElement('div');
  bar.className = 'bar';

  // The logo is the name of the extension and goes to the page you are on: a way back to its top.
  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = URLS[current];
  brand.setAttribute('aria-label', 'Libregaku');
  const mark = logo('lockup', 34);
  if (mark) brand.appendChild(mark);
  else brand.textContent = 'Libregaku';

  const heading = document.createElement('h1');
  heading.className = 'heading';
  heading.textContent = words.heading;

  const link = document.createElement('a');
  link.className = 'other';
  link.href = URLS[other];
  link.textContent = words.other;

  bar.append(brand, heading, link);
  host.replaceChildren(bar);
}
