/* Paste into the DevTools console on a YouTube watch page. */
(() => {
  const pr = window.ytInitialPlayerResponse;
  const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  const out = {
    url: location.href,
    'A. page hook ran': !!window.__libregakuHook,
    'B. ytInitialPlayerResponse': typeof pr,
    'C. caption tracks': tracks
      ? tracks.map((t) => t.languageCode + (t.kind === 'asr' ? ' (auto)' : ' (human)'))
      : 'NONE — no captions on this video',
    'D. video element': !!document.querySelector('video.html5-main-video, #movie_player video'),
    'E. our overlay in DOM': !!document.querySelector('.libregaku-root'),
    'F. native captions hidden': document.documentElement.classList.contains('libregaku-active'),
    'G. competing extensions': [
      ['Migaku', '[class*="migaku" i]'],
      ['Language Reactor', '[class*="lln" i], [id*="lln" i]'],
      ['asbplayer', '[class*="asbplayer" i]'],
      ['Trancy', '[class*="trancy" i]'],
      ['Subadub', '#subadub-custom-subs'],
    ].filter(([, sel]) => document.querySelector(sel)).map(([n]) => n),
  };
  console.table(out);
  return out;
})();
