/**
 * A subtitle source. One module per site under `src/adapters/`.
 *
 * Adapters are expected to break when a site changes; the contract exists so a
 * break is a patch to one file and never reaches the renderer or the segmenter.
 */

export interface Cue {
  /** Seconds. */
  start: number;
  end: number;
  text: string;
  /** Native-language line, when a second track is loaded. */
  secondary?: string;
}

export interface TrackInfo {
  id: string;
  /** BCP-47 where the site gives us one. */
  lang: string;
  label: string;
  /** True for auto-generated captions, which are lower quality. */
  generated?: boolean;
}

export interface SubtitleSource {
  readonly id: string;
  /** Where this site renders captions, for the DOM-reading fallback. */
  readonly domCaptions: { container: string; segment: string; join?: string };
  /**
   * Candidate mount points, outermost-first. Must be at or above the site's own
   * control layer in the tree, or that layer paints over the overlay and eats
   * pointer events regardless of z-index.
   */
  readonly playerRoot: string[];
  /** Whether this adapter handles the current page. */
  matches(url: string): boolean;
  /** The video element to render over. */
  video(): HTMLVideoElement | null;
  listTracks(): Promise<TrackInfo[]>;
  loadTrack(id: string): Promise<Cue[]>;
  /**
   * A second route to the full transcript, tried when loadTrack fails.
   *
   * On YouTube the signed-URL path is unreliable, but the site's own transcript
   * panel holds the whole script with timestamps — and unlike reading rendered
   * captions, it yields every line rather than the current one.
   */
  fallbackTrack?(): Promise<Cue[]>;

  /** Hide the site's own subtitle rendering so ours is the only one. */
  hideNative(): void;
  /** SPA route changes — the video changed under us. */
  onNavigate(cb: () => void): void;
  /** A track list became available. Usually after the page first loaded. */
  onTracks(cb: () => void): void;
  /** A unique id for the current video, for per-video settings. */
  videoId(): string | null;
  /** Human-readable title, for card provenance. */
  title(): string | null;
  /**
   * A URL that reopens this video at `seconds`.
   *
   * Goes on the card, so a review can jump straight back to the moment the
   * word was mined — which is most of what makes a mined card better than a
   * word list.
   */
  deepLink(seconds: number): string | null;
}
