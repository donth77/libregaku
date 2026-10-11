/**
 * Icons, from Lucide (ISC). Inlined rather than depended upon: six glyphs do
 * not justify a package, and a shadow root cannot use an external sprite sheet.
 */

const ICONS: Record<string, string> = {
  keyboard:
    '<path d="M10 8h.01"/><path d="M12 12h.01"/><path d="M14 8h.01"/><path d="M16 12h.01"/><path d="M18 8h.01"/><path d="M6 8h.01"/><path d="M7 16h10"/><path d="M8 12h.01"/><rect width="20" height="16" x="2" y="4" rx="2"/>',
  volume:
    '<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
  copy:
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  quote:
    '<path d="M17 5H3"/><path d="M21 12H8"/><path d="M21 19H8"/><path d="M3 12v7"/>',
  external:
    '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  loader: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>',
  panel:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/>',
  lock:
    '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock:
    '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  captions:
    '<rect width="18" height="14" x="3" y="5" rx="2"/><path d="M7 15h4"/><path d="M15 15h2"/><path d="M7 11h2"/><path d="M13 11h4"/>',
  ruby:
    '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  /* Furigana's three states, drawn: two words, with a reading over both, one, or neither. */
  rubyAll:
    '<path d="M3 13h7"/><path d="M6.5 13v7"/><path d="M14 13h7"/><path d="M17.5 13v7"/><path d="M4 7.5h5"/><path d="M15 7.5h5"/>',
  rubySome:
    '<path d="M3 13h7"/><path d="M6.5 13v7"/><path d="M14 13h7"/><path d="M17.5 13v7"/><path d="M15 7.5h5"/>',
  rubyOff:
    '<path d="M3 13h7"/><path d="M6.5 13v7"/><path d="M14 13h7"/><path d="M17.5 13v7"/>',
  bookmark:
    '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  chevronsUp:
    '<path d="m17 11-5-5-5 5"/><path d="m17 18-5-5-5 5"/>',
  plus:
    '<path d="M5 12h14"/><path d="M12 5v14"/>',
  /* A line of dialogue, added: message-square-plus. */
  linePlus:
    '<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 8v6"/><path d="M9 11h6"/>',
  check:
    '<path d="M20 6 9 17l-5-5"/>',
  arrowRight:
    '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  chevronDown:
    '<path d="m6 9 6 6 6-6"/>',
  circleCheck:
    '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  target:
    '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  ban:
    '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
  settings:
    '<path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  x:
    '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  eye:
    '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  filter:
    '<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  forward:
    '<path d="m9 18 6-6-6-6"/>',
  back:
    '<path d="m15 18-6-6 6-6"/>',
};

export function icon(name: keyof typeof ICONS | string, size = 15): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name] ?? '';
  return svg;
}
