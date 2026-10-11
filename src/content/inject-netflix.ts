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
 * The request for that manifest passes through `JSON.stringify` on its way
 * out, and there one format is added to the ones the player asks for: text,
 * for the languages Netflix would otherwise send only as pictures
 * (addTextProfile). Nothing the player asked for is taken out.
 *
 * A title's first manifest carries the files of a few tracks and names the
 * rest; the player asks for a track's files when the viewer chooses it, and
 * they come in another manifest (NfPublished.waiting). So a title's manifests
 * are read together (mergeFound), and a track still waiting is asked for the
 * way the viewer would: through the player, which is put back on the track
 * it was on once the files are here. asbplayer fetches them the same way.
 *
 * It also seeks. Netflix answers a scripted change to its <video>'s
 * currentTime with error M7375, and the player API that seeks properly exists
 * only here, in the page world.
 */

import { addTextProfile, mergeFound, tracksFrom, unreadableTracks, type NfFound } from '../adapters/nf-manifest';

const TAG = 'libregaku';

/**
 * Set once the hook is in. This script is declared in the manifest *and*
 * injected by the service worker, because Netflix's CSP has blocked the
 * declared route before. When both land, wrapping JSON.parse twice would post
 * every manifest twice.
 */
const INSTALLED = '__libregakuNetflixHook';

/** Titles whose tracks are kept, for a content script that starts listening after their manifests were parsed. */
const REMEMBER = 8;

/** How long the player has to fetch a track's files before the wait is given up. */
const SEND_TRACK_MS = 20_000;

/**
 * Why a track's files could not be had, as the content script is told: the
 * player is not there (yet), it is there without the calls that change its
 * track, it is playing another title, it does not offer that track, it
 * refused the change, or the change went through and no manifest with the
 * track's text followed.
 */
type NotSent = 'no-player' | 'cannot-ask' | 'another-title' | 'not-offered' | 'refused' | 'nothing-came';

/** The slice of Netflix's player API this script touches. Every link may be missing. */
interface NfPlayer {
  seek(ms: number): void;
  getMovieId?: () => unknown;
  /** The subtitle tracks the viewer can choose, each with the manifest's id for it as trackId. */
  getTimedTextTrackList?: () => unknown;
  getTimedTextTrack?: () => unknown;
  /** Takes one of the list's own objects. Resolves once the track's files are in, when they had to be fetched. */
  setTimedTextTrack?: (track: unknown) => unknown;
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

  /** One entry a title, from all its manifests together; the latest heard of last. */
  const remembered: NfFound[] = [];

  const publish = (found: NfFound): void => {
    window.postMessage(
      { source: TAG, kind: 'nf-tracks', tracks: found.tracks, movieId: found.movieId, pictures: found.pictures },
      '*',
    );
  };

  /** Whether a track's text has been sent, in any manifest of its title. */
  const sent = (movieId: string, trackId: string): boolean =>
    Boolean(remembered.find((f) => f.movieId === movieId)?.tracks.some((t) => t.trackId === trackId && !t.waiting));

  const inspect = (data: unknown): void => {
    const unread = unreadableTracks(data);
    if (unread?.length) {
      console.warn('[libregaku] netflix offered subtitles only in formats Libregaku cannot read —', unread.join('; '));
    }

    const read = tracksFrom(data);
    if (!read) return;
    // Latest last: a replay must leave the newest list for each title on top.
    const older = remembered.findIndex((f) => read.movieId !== null && f.movieId === read.movieId);
    // With what the title's earlier manifests sent: this one may be the answer to asking for one track.
    const found = mergeFound(older >= 0 ? remembered[older] : undefined, read);
    if (older >= 0) remembered.splice(older, 1);
    remembered.push(found);
    if (remembered.length > REMEMBER) {
      // Never the title being watched: its later manifests need what its first one sent.
      const watching = /\/watch\/([^/?#]+)/.exec(location.pathname)?.[1];
      const oldest = remembered.findIndex((f) => f.movieId === null || f.movieId !== watching);
      remembered.splice(oldest >= 0 ? oldest : 0, 1);
    }

    publish(found);
    console.debug(
      '[libregaku] netflix tracks for',
      found.movieId ?? '(no movieId)',
      found.tracks.map((t) => (t.waiting ? `${t.language} (not sent)` : t.language)).join(', '),
    );
  };

  /** One at a time: each is a change of track in the player, and back. */
  let asking: Promise<unknown> = Promise.resolve();
  /**
   * What came of putting the player on a track, by title and track. That is
   * done once: a second change of track brings nothing the first did not.
   */
  const asked = new Map<string, Promise<NotSent | null>>();

  /** A track's files, through the player. Null once they are here. */
  const askFor = (movieId: string, trackId: string): Promise<NotSent | null> => {
    if (sent(movieId, trackId)) return Promise.resolve(null);
    const key = `${movieId}\n${trackId}`;
    const before = asked.get(key);
    if (before) return before.then((why) => (sent(movieId, trackId) ? null : why));

    const answer = asking.then(() => sendTrack(movieId, trackId, () => sent(movieId, trackId)));
    asking = answer.catch(() => null);
    asked.set(key, answer);
    void answer.then(
      (why) => {
        // The player was never put on the track: the next request may find it ready to be.
        if (why !== null && why !== 'nothing-came' && why !== 'cannot-ask') asked.delete(key);
      },
      () => asked.delete(key),
    );
    return answer;
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

  const nativeStringify = JSON.stringify;
  JSON.stringify = function (this: unknown, ...args: Parameters<typeof JSON.stringify>) {
    try {
      if (addTextProfile(args[0])) console.debug('[libregaku] netflix: asked for subtitles as text too');
    } catch {
      /* never let instrumentation break playback */
    }
    return nativeStringify.apply(this as never, args);
  } as typeof JSON.stringify;

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window) return;
    const d: unknown = e.data;
    if (typeof d !== 'object' || d === null) return;
    const m = d as Record<string, unknown>;
    if (m.source !== TAG) return;

    if (m.kind === 'nf-request-tracks') {
      remembered.forEach(publish);
    } else if (m.kind === 'nf-send-track') {
      if (typeof m.movieId !== 'string' || typeof m.trackId !== 'string') return;
      const token = typeof m.token === 'number' ? m.token : null;
      const done = (why: NotSent | null): void => {
        window.postMessage({ source: TAG, kind: 'nf-track-sent', token, why }, '*');
      };
      askFor(m.movieId, m.trackId).then(done, (e: unknown) => {
        console.warn('[libregaku] netflix: asking the player for a subtitle track failed:', e);
        done('refused');
      });
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
 * Every player on the page, by its session's id, through Netflix's own API:
 * netflix.appContext.state.playerApp.getAPI().videoPlayer. Previews and
 * billboards run sessions of their own, and the episode just left can keep
 * its session for a while. Empty when any link in that chain is missing.
 */
function players(): Array<{ id: string; player: NfPlayer }> {
  try {
    const api = (window as unknown as NfPage).netflix?.appContext?.state?.playerApp?.getAPI?.();
    const videoPlayer = api?.videoPlayer;
    if (
      !videoPlayer ||
      typeof videoPlayer.getAllPlayerSessionIds !== 'function' ||
      typeof videoPlayer.getVideoPlayerBySessionId !== 'function'
    ) {
      return [];
    }
    const ids: unknown = videoPlayer.getAllPlayerSessionIds();
    if (!Array.isArray(ids)) return [];
    const found: Array<{ id: string; player: NfPlayer }> = [];
    for (const id of ids as unknown[]) {
      if (typeof id !== 'string') continue;
      const player = videoPlayer.getVideoPlayerBySessionId(id) as Partial<NfPlayer> | null | undefined;
      if (typeof player?.seek === 'function') found.push({ id, player: player as NfPlayer });
    }
    return found;
  } catch {
    return [];
  }
}

/** The player of the title being watched: the session with "watch" in its id, or the only one there is. */
function watchPlayer(): NfPlayer | null {
  const all = players();
  return (all.find((p) => p.id.includes('watch')) ?? (all.length === 1 ? all[0] : undefined))?.player ?? null;
}

/**
 * The player playing this title, by the title it names itself. Told apart
 * from "none": 'another-title' is a page whose players are all on something
 * else — an advert before the film, the episode just left.
 */
function playerOf(movieId: string): NfPlayer | 'another-title' | null {
  const all = players();
  const playing = (p: NfPlayer): string | null => {
    try {
      const id: unknown = typeof p.getMovieId === 'function' ? p.getMovieId() : null;
      return id == null ? null : String(id);
    } catch {
      return null;
    }
  };
  const mine = all.filter((p) => playing(p.player) === movieId);
  const pick = mine.find((p) => p.id.includes('watch')) ?? mine[0];
  if (pick) return pick.player;
  // A player that does not say what it plays: the watch page's, taken on trust.
  const watch = watchPlayer();
  if (!watch) return null;
  return playing(watch) === null ? watch : 'another-title';
}

/**
 * Have the player fetch a subtitle track's files: put it on that track, as
 * choosing it in Netflix's menu does, wait for the manifest that brings them,
 * and put it back on the track the viewer had. The manifest is read as it
 * passes through JSON.parse like any other; `sent` says whether it came.
 *
 * Only a track in the player's own list of choices is asked for, so the
 * audio is left alone, and only on the player of the title asked about:
 * a preview's player has a list of its own.
 */
async function sendTrack(movieId: string, trackId: string, sent: () => boolean): Promise<NotSent | null> {
  const player = playerOf(movieId);
  if (!player) return 'no-player';
  if (player === 'another-title') return player;
  if (
    typeof player.getTimedTextTrackList !== 'function' ||
    typeof player.getTimedTextTrack !== 'function' ||
    typeof player.setTimedTextTrack !== 'function'
  ) {
    // Netflix has renamed them: waiting will not bring them back.
    console.warn(
      '[libregaku] the Netflix player has no getTimedTextTrackList / getTimedTextTrack / setTimedTextTrack — ' +
        'a subtitle track it was not sent can only be had by choosing it in Netflix\'s own menu',
    );
    return 'cannot-ask';
  }

  // By id, never by the object: the player makes a new one for a track once its files are in.
  const idOf = (t: unknown): unknown => (typeof t === 'object' && t !== null ? (t as { trackId?: unknown }).trackId : undefined);
  const offered = (id: unknown): unknown => {
    const list: unknown = player.getTimedTextTrackList?.();
    return Array.isArray(list) ? (list as unknown[]).find((t) => idOf(t) === id) : undefined;
  };
  const track = offered(trackId);
  if (!track) return 'not-offered';
  const before = idOf(player.getTimedTextTrack());
  // Already the one in use, so the player has its files, and no manifest we saw brought them.
  if (before === trackId) return 'nothing-came';

  const set = player.setTimedTextTrack.bind(player);
  let refused = false;
  const change = Promise.resolve()
    .then(() => set(track))
    .catch((e: unknown) => {
      refused = true;
      console.warn('[libregaku] netflix would not change to a subtitle track to fetch it:', e);
    });
  // Back on the viewer's own track, unless they chose another meanwhile.
  const back = change.then(async () => {
    try {
      const was = before === undefined ? undefined : offered(before);
      if (was && idOf(player.getTimedTextTrack?.()) === trackId) await set(was);
    } catch (e) {
      console.warn('[libregaku] netflix would not go back to the subtitle track it was on:', e);
    }
  });
  // A change that never settles must not hold up the next one for good.
  let timer = 0;
  await Promise.race([back, new Promise((resolve) => { timer = window.setTimeout(resolve, SEND_TRACK_MS); })]);
  window.clearTimeout(timer);
  if (sent()) return null;
  return refused ? 'refused' : 'nothing-came';
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
