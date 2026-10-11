/**
 * The streaming sites whose video is encrypted (Widevine): Chrome will not let
 * an extension capture their sound from the <video> or copy a frame from it,
 * so sentence audio comes from the tab and cards have no screenshot
 * (src/content/capture.ts). The interface says "protected sites" and shows
 * this list where one is wanted, so it is kept in one place.
 */

export const PROTECTED_SITES: readonly string[] = ['Netflix', 'Disney+', 'Prime Video', 'Max'];

/** The list as a sentence's worth of words in `locale`: "Netflix, Disney+, Prime Video and Max". */
export function protectedSites(locale: string): string {
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(PROTECTED_SITES);
  } catch {
    return PROTECTED_SITES.join(', ');
  }
}
