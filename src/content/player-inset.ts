/**
 * Make room for the transcript panel.
 *
 * The panel sits over the player, so an open panel covered the right third of
 * the picture. Migaku does not do that: it puts the video beside the panel,
 * and losing part of the frame during a scene is a real cost for a tool you
 * watch films with.
 *
 * The picture is scaled to fit the width the panel leaves and re-centred
 * there. Deliberately a transform rather than a resize of the site's player:
 * nothing the page measures changes, so none of the player's own layout code
 * has an opinion about it, it works the same inline, in theater mode and in
 * fullscreen, and removing it restores the original frame exactly.
 *
 * The transform goes on the element *containing* the video, never on the
 * video itself. Netflix centres its video with `left: 50%` and its own
 * `transform`, so writing ours there replaced their centring and threw the
 * picture half a screen to the right. On both sites that container holds the
 * video and nothing else that matters, the site's own subtitle layer aside,
 * which we hide anyway.
 *
 * The site's own controls still span the full width and pass under the panel.
 * That is unchanged, and costs nothing that was not already lost.
 */

/** Below this the picture is too small to watch; better to overlap a little. */
const MIN_SCALE = 0.35;

export class PlayerInset {
  #video: HTMLVideoElement;
  #root: HTMLElement;
  /** The element we transform: the video's container, not the video. */
  #stage: HTMLElement;
  #inset = 0;
  /** How far the picture's bottom edge rose, so subtitles can follow it. */
  #lift = 0;
  #onLift: (px: number) => void;
  #ro: ResizeObserver;

  constructor(video: HTMLVideoElement, root: HTMLElement, onLift: (px: number) => void) {
    this.#video = video;
    this.#root = root;
    this.#onLift = onLift;
    this.#stage = pickStage(video, root);

    // Theater mode, fullscreen and window resizes all change the box the
    // picture is centred in, and the site recomputes the video's size without
    // telling anyone.
    this.#ro = new ResizeObserver(() => this.#apply());
    this.#ro.observe(root);
    this.#ro.observe(video);
  }

  set(px: number): void {
    if (px === this.#inset) return;
    this.#inset = px;
    this.#apply();
  }

  #clear(): void {
    this.#stage.style.removeProperty('transform');
    this.#stage.style.removeProperty('transform-origin');
  }

  #apply(): void {
    // Measure without our own transform, or every pass compounds the last.
    this.#clear();

    if (this.#inset <= 0) {
      this.#report(0);
      return;
    }

    const root = this.#root.getBoundingClientRect();
    const box = this.#video.getBoundingClientRect();
    const stage = this.#stage.getBoundingClientRect();
    if (!root.width || !box.width || !box.height) {
      this.#report(0);
      return;
    }

    const avail = root.width - this.#inset;
    if (avail <= 0) {
      this.#report(0);
      return;
    }
    /*
     * Scale by the picture, not the player. YouTube sizes the <video> to the
     * picture, so a pillarboxed video — theater mode, 4:3, a vertical clip —
     * is narrower than the player, and may already fit beside the panel with
     * no shrinking at all. It still has to move out from under it.
     */
    const scale = Math.max(MIN_SCALE, Math.min(1, avail / box.width));
    const already = box.left >= root.left && box.right <= root.left + avail;
    if (scale >= 1 && already) {
      this.#report(0);
      return;
    }

    /*
     * Pin the origin to the stage's own top-left rather than assume where it
     * is, then work out where the picture lands under that scale and move it
     * the rest of the way. Doing it from measurements means an unexpected
     * origin, or a container that is not flush with the player, cannot put
     * the picture somewhere surprising.
     *
     * At the MIN_SCALE floor the picture is wider than the space left, and
     * centring it there would push its left edge off the player. Keep the
     * left edge in; let the overlap fall under the panel instead.
     */
    const scaledLeft = stage.left + scale * (box.left - stage.left);
    const scaledTop = stage.top + scale * (box.top - stage.top);
    const targetLeft = root.left + Math.max(0, (avail - box.width * scale) / 2);
    const targetTop = root.top + (root.height - box.height * scale) / 2;

    this.#stage.style.setProperty('transform-origin', '0 0', 'important');
    this.#stage.style.setProperty(
      'transform',
      `translate(${targetLeft - scaledLeft}px, ${targetTop - scaledTop}px) scale(${scale})`,
      'important',
    );

    // Measured rather than derived: the subtitle has to sit on the picture,
    // not under it on the letterbox the shrunk frame leaves behind.
    const after = this.#video.getBoundingClientRect();
    this.#report(Math.max(0, Math.round(root.bottom - after.bottom)));
  }

  #report(lift: number): void {
    if (lift === this.#lift) return;
    this.#lift = lift;
    this.#onLift(lift);
  }

  destroy(): void {
    this.#ro.disconnect();
    this.#clear();
    this.#report(0);
  }
}

/**
 * The nearest thing above the video that we can transform without taking
 * something else with us, or overwriting a transform the site is relying on.
 * Falling back to the video means a site we have never seen still gets the
 * behaviour, at the risk of replacing a transform of its own.
 */
function pickStage(video: HTMLVideoElement, root: HTMLElement): HTMLElement {
  const parent = video.parentElement;
  if (parent && parent !== root && getComputedStyle(parent).transform === 'none') return parent;
  return video;
}
