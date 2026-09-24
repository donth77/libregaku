/**
 * Page-world script for Netflix.
 *
 * Netflix delivers its subtitle track list inside the player manifest, which
 * arrives as JSON. Rather than guess at an endpoint URL, we hook `JSON.parse`
 * and watch for any object that looks like one — the approach Subadub has used
 * since 2018, and the reason it needs a fix roughly once every two years
 * rather than constantly.
 *
 * The manifest itself travels encrypted now, but it is decrypted and parsed in
 * the page before the player reads it, so the hook still sees it. Recognising
 * its shape lives in `nf-manifest.ts`, away from this plumbing, so it can be
 * tested without a browser.
 */

import { tracksFrom } from '../adapters/nf-manifest';

const TAG = 'libregaku';

console.log('%c[libregaku] netflix page hook installed', 'color:#8AA2E8');
(window as unknown as Record<string, unknown>)['__libregakuHook'] = true;

const nativeParse = JSON.parse;
JSON.parse = function (this: unknown, ...args: Parameters<typeof JSON.parse>) {
  const data = nativeParse.apply(this as never, args);
  try {
    const found = tracksFrom(data);
    if (found) {
      window.postMessage(
        { source: TAG, kind: 'nf-tracks', tracks: found.tracks, movieId: found.movieId },
        '*',
      );
      console.debug(
        '[libregaku] netflix tracks:',
        found.tracks.map((t) => t.language).join(', '),
      );
    }
  } catch {
    /* never let instrumentation break playback */
  }
  return data;
};

export {};
