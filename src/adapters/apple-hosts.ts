/**
 * Where Apple TV+ serves playlists and subtitle segments. A URL anywhere else
 * did not come from its player, and the adapter drops it.
 *
 * Its own module, and pure, so the daily canary (tests/contract) checks what
 * Apple serves against the same rule the adapter applies.
 */
const MEDIA_HOST = /(^|\.)(tv|itunes)\.apple\.com$/;

export function isAppleMediaUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && MEDIA_HOST.test(url.hostname);
  } catch {
    return false;
  }
}
