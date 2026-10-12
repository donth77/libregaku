/**
 * The streaming sites whose video is encrypted (Widevine): Chrome will not let
 * an extension capture their sound from the <video> or copy a frame from it,
 * so sentence audio comes from the tab and cards have no screenshot
 * (src/content/capture.ts). The interface says "protected sites" and shows
 * this list where one is wanted, so it is kept in one place.
 */

export const PROTECTED_SITES: readonly string[] = ['Netflix', 'Disney+', 'Prime Video', 'Max', 'Apple TV'];

/**
 * A site's name as it is written in `locale`. In right-to-left text a plus at the end of a name
 * moves to the left of it ("+Disney"), so a left-to-right mark keeps it on the right.
 */
export function nameIn(name: string, locale: string): string {
  return name.endsWith('+') && /^ar\b/.test(locale) ? `${name}\u200E` : name;
}

/** The list as a sentence's worth of words in `locale`: "Netflix, Disney+, Prime Video, Max and Apple TV". */
export function protectedSites(locale: string): string {
  const names = PROTECTED_SITES.map((name) => nameIn(name, locale));
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(names);
  } catch {
    return names.join(', ');
  }
}
