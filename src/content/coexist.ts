/**
 * Other subtitle extensions.
 *
 * Anything that replaces subtitles competes for the same strip of screen, so
 * running two is normally mutually exclusive. But a bilingual extension is a
 * reasonable thing to want alongside this one: it supplies the native-language
 * line we do not have yet, while we tokenize the target-language line.
 *
 * The convention those extensions follow is target on top, native underneath.
 * So when one is present we move our overlay to the top rather than fighting
 * for the bottom.
 */

export interface Coexisting {
  name: string;
  /** Where this extension puts the line we are replacing. */
  primaryAt: 'top' | 'bottom';
  selector: string;
}

const KNOWN: Coexisting[] = [
  { name: 'NflxMultiSubs', primaryAt: 'top', selector: '.nflxmultisubs-subtitle-svg, .nflxmultisubs-subtitle-wrapper' },
  { name: 'Language Reactor', primaryAt: 'bottom', selector: '.lln-container, [class^="lln-"], #lln-subs' },
  { name: 'Trancy', primaryAt: 'bottom', selector: '[class*="trancy-subtitle"], #trancy-subtitle' },
  { name: 'asbplayer', primaryAt: 'bottom', selector: '.asbplayer-subtitles-container, [class*="asbplayer-subtitle"]' },
  { name: 'Subadub', primaryAt: 'bottom', selector: '#subadub-custom-subs' },
  { name: 'Migaku', primaryAt: 'bottom', selector: '[class*="migaku-"], #migaku-subtitles' },
];

export function detect(): Coexisting[] {
  return KNOWN.filter((k) => {
    try {
      return document.querySelector(k.selector) !== null;
    } catch {
      return false;
    }
  });
}

/**
 * Where our tokenized line should sit.
 *
 * Alone: the bottom, where subtitles belong. Beside a bilingual extension: the
 * top, so its native-language line keeps the bottom and the two stack in the
 * order people expect rather than overlapping.
 */
export function preferredAnchor(found: Coexisting[]): 'top' | 'bottom' {
  return found.some((f) => f.primaryAt === 'top') ? 'top' : 'bottom';
}
