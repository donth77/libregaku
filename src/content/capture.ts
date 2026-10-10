/**
 * Sentence audio and a still for a card, taken from the video.
 *
 * From the <video> element itself where the site allows it: captureStream()
 * gives its sound to a MediaRecorder, and a canvas copies a frame. YouTube
 * allows both. Netflix's video is encrypted, and Chrome will neither capture
 * nor copy encrypted media — so there the sound comes from capturing the tab
 * (an optional permission, started from the toolbar popup; see
 * src/audio/tab-capture.ts), and there is no picture to be had.
 */

/** Media for a card, as AnkiConnect takes it. */
export interface Media {
  /** Base64. */
  data: string;
  type: string;
}

/** Records one line: started as it plays, stopped for its bytes. */
export interface LineRecorder {
  start(): Promise<void>;
  /** The recording, or null when nothing usable came of it. */
  stop(): Promise<Media | null>;
  /** Let go of whatever it holds. */
  dispose(): void;
}

/**
 * What to record into. AAC in MP4 first: every Anki client plays it, which is
 * not true of Opus in WebM on older iPhones. Chrome records MP4 from 126 on;
 * before that, WebM is what there is.
 */
export function recordingType(supported: (type: string) => boolean): string | null {
  for (const type of ['audio/mp4;codecs=mp4a.40.2', 'audio/webm;codecs=opus', 'audio/webm']) {
    if (supported(type)) return type;
  }
  return null;
}

export function extensionFor(type: string): string {
  if (type.startsWith('audio/mp4')) return 'm4a';
  if (type.startsWith('audio/webm')) return 'webm';
  if (type.startsWith('image/jpeg')) return 'jpg';
  return 'bin';
}

/** Encrypted media is the site's, not the page's: Chrome refuses to capture or copy it. */
export function isEncrypted(video: HTMLVideoElement): boolean {
  return Boolean(video.mediaKeys);
}

export async function base64Of(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Recordings shorter than this are a failed start, not a line. */
const MIN_BYTES = 1000;

/** The element's own sound, or null where Chrome will not give it. */
export function elementRecorder(video: HTMLVideoElement): LineRecorder | null {
  const capture = (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream;
  if (isEncrypted(video) || typeof capture !== 'function' || typeof MediaRecorder === 'undefined') return null;
  const type = recordingType((t) => MediaRecorder.isTypeSupported(t));
  if (!type) return null;
  let stream: MediaStream;
  try {
    stream = capture.call(video);
  } catch {
    return null;   // a cross-origin source: not the page's to record
  }
  const chunks: Blob[] = [];
  let recorder: MediaRecorder | null = null;
  return {
    async start() {
      const audio = new MediaStream(stream.getAudioTracks());
      if (!audio.getAudioTracks().length) throw new Error('the video has no sound to record');
      recorder = new MediaRecorder(audio, { mimeType: type, audioBitsPerSecond: 96_000 });
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.start();
    },
    stop() {
      return new Promise<Media | null>((resolve) => {
        const r = recorder;
        if (!r || r.state === 'inactive') {
          resolve(null);
          return;
        }
        r.onstop = () => {
          const blob = new Blob(chunks, { type });
          if (blob.size < MIN_BYTES) resolve(null);
          else void base64Of(blob).then((data) => resolve({ data, type }), () => resolve(null));
        };
        r.stop();
      });
    },
    dispose() {
      // Ends the captured tracks only; the video plays on.
      for (const t of stream.getTracks()) t.stop();
    },
  };
}

/** The tab's sound, recorded in the offscreen document, once the tab is being captured. */
export function tabRecorder(): LineRecorder {
  return {
    async start() {
      const r = (await chrome.runtime.sendMessage({ type: 'record-start' })) as { ok?: boolean; error?: string } | undefined;
      if (!r?.ok) throw new Error(r?.error ?? 'the recording did not start');
    },
    async stop() {
      const r = (await chrome.runtime.sendMessage({ type: 'record-stop' })) as
        | { ok?: boolean; data?: string; type?: string }
        | undefined;
      return r?.ok && r.data && r.type ? { data: r.data, type: r.type } : null;
    },
    dispose() {},
  };
}

/** Whether this tab's sound is being captured — started from the toolbar popup. */
export async function tabCaptured(): Promise<boolean> {
  try {
    const r = (await chrome.runtime.sendMessage({ type: 'capture-status' })) as { capturing?: boolean } | undefined;
    return Boolean(r?.capturing);
  } catch {
    return false;
  }
}

/**
 * The frame on screen as a JPEG at most `width` wide, or null where the
 * picture cannot be copied — encrypted video, or none loaded yet.
 */
export async function stillOf(video: HTMLVideoElement, width = 800): Promise<Media | null> {
  if (isEncrypted(video) || !video.videoWidth || !video.videoHeight) return null;
  const scale = Math.min(1, width / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    return blob ? { data: await base64Of(blob), type: 'image/jpeg' } : null;
  } catch {
    return null;   // a tainted canvas: the frame came from somewhere the page may not read
  }
}
