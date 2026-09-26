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
 *
 * It also seeks. Netflix answers a scripted change to its <video>'s
 * currentTime with error M7375, and the player API that seeks properly exists
 * only here, in the page world.
 */

import { tracksFrom, unreadableTracks, type NfPublished } from '../adapters/nf-manifest';

const TAG = 'libregaku';

/**
 * Set once the hook is in. This script is declared in the manifest *and*
 * injected by the service worker, because Netflix's CSP has blocked the
 * declared route before. When both land, wrapping JSON.parse twice would post
 * every manifest twice.
 */
const INSTALLED = '__libregakuNetflixHook';

/** Manifests kept for a content script that starts listening after they were parsed. */
const REMEMBER = 8;

interface Found {
  tracks: NfPublished[];
  movieId: string | null;
}

/** The slice of Netflix's player API this script touches. Every link may be missing. */
interface NfPlayer {
  seek(ms: number): void;
}

interface NfVideoPlayer {
  getAllPlayerSessionIds?: () => unknown;
  getVideoPlayerBySessionId?: (id: string) => unknown;
}

interface NfPage {
  netflix?: {
    appContext?: { state?: { playerApp?: { getAPI?: () => { videoPlayer?: NfVideoPlayer } | undefined } } };
  };
}

const page = window as unknown as Record<string, unknown>;

if (page[INSTALLED]) {
  console.debug('[libregaku] netflix page hook already installed');
} else {
  page[INSTALLED] = true;
  // Read by scripts/diagnose.js to prove a page hook ran.
  page['__libregakuHook'] = true;
  install();
}

function install(): void {
  console.log('%c[libregaku] netflix page hook installed', 'color:#8AA2E8');

  const remembered: Found[] = [];

  const publish = (found: Found): void => {
    window.postMessage(
      { source: TAG, kind: 'nf-tracks', tracks: found.tracks, movieId: found.movieId },
      '*',
    );
  };

  const inspect = (data: unknown): void => {
    const unread = unreadableTracks(data);
    if (unread?.length) {
      console.warn('[libregaku] netflix offered subtitles only in formats Libregaku cannot read —', unread.join('; '));
    }

    const found = tracksFrom(data);
    if (!found) return;
    // Latest last: a replay must leave the newest list for each title on top.
    const older = remembered.findIndex((f) => found.movieId !== null && f.movieId === found.movieId);
    if (older >= 0) remembered.splice(older, 1);
    remembered.push(found);
    if (remembered.length > REMEMBER) remembered.shift();

    publish(found);
    console.debug(
      '[libregaku] netflix tracks for',
      found.movieId ?? '(no movieId)',
      found.tracks.map((t) => t.language).join(', '),
    );
  };

  const nativeParse = JSON.parse;
  JSON.parse = function (this: unknown, ...args: Parameters<typeof JSON.parse>) {
    const data = nativeParse.apply(this as never, args);
    try {
      inspect(data);
    } catch {
      /* never let instrumentation break playback */
    }
    return data;
  };

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG) return;

    if (m.kind === 'nf-request-tracks') {
      remembered.forEach(publish);
    } else if (m.kind === 'nf-seek') {
      if (typeof m.ms !== 'number' || !Number.isFinite(m.ms) || m.ms < 0) return;
      const via = seekTo(Math.round(m.ms));
      window.postMessage(
        { source: TAG, kind: 'nf-seek-done', token: typeof m.token === 'number' ? m.token : null, via },
        '*',
      );
    }
  });
}

/**
 * The player of the title being watched, through Netflix's own API:
 * netflix.appContext.state.playerApp.getAPI().videoPlayer. Previews and
 * billboards run sessions of their own; the one that matters has "watch" in
 * its id. Null when any link in that chain is missing.
 */
function watchPlayer(): NfPlayer | null {
  try {
    const api = (window as unknown as NfPage).netflix?.appContext?.state?.playerApp?.getAPI?.();
    const videoPlayer = api?.videoPlayer;
    if (
      !videoPlayer ||
      typeof videoPlayer.getAllPlayerSessionIds !== 'function' ||
      typeof videoPlayer.getVideoPlayerBySessionId !== 'function'
    ) {
      return null;
    }
    const ids: unknown = videoPlayer.getAllPlayerSessionIds();
    if (!Array.isArray(ids)) return null;
    const sessions = (ids as unknown[]).filter((s): s is string => typeof s === 'string');
    const id = sessions.find((s) => s.includes('watch')) ?? (sessions.length === 1 ? sessions[0] : undefined);
    if (id === undefined) return null;
    const player = videoPlayer.getVideoPlayerBySessionId(id) as Partial<NfPlayer> | null | undefined;
    return typeof player?.seek === 'function' ? (player as NfPlayer) : null;
  } catch {
    return null;
  }
}

/** Seek through the player API; touch the <video> itself only when there is no API. */
function seekTo(ms: number): 'api' | 'currentTime' | 'none' {
  const player = watchPlayer();
  if (player) {
    try {
      player.seek(ms);
      return 'api';
    } catch (e) {
      console.warn('[libregaku] netflix player API refused a seek — setting currentTime instead:', e);
    }
  } else {
    console.warn(
      '[libregaku] netflix player API not found — setting currentTime directly, ' +
        'which Netflix may answer with error M7375',
    );
  }
  const video = document.querySelector('video');
  if (!video) return 'none';
  video.currentTime = ms / 1000;
  return 'currentTime';
}
