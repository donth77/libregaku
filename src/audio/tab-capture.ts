import { base64Of, recordingType, type Media } from '../content/capture';

/**
 * A tab's sound, for sentence audio where the video itself cannot be
 * recorded — Netflix, whose video is encrypted. Runs in the offscreen
 * document: the service worker cannot hold a MediaStream, and a content
 * script cannot reach chrome.tabCapture.
 *
 * Chrome only hands over a tab's sound after the learner has invoked the
 * extension on that tab (clicked its icon), and capturing it silences the
 * tab for them — the sound goes to the capturer instead. So the stream is
 * opened from the toolbar popup, kept for as long as the tab lives, and
 * played straight back out here.
 */

/**
 * Why the service worker could not start capturing a tab, as it tells the
 * toolbar popup: each is a key of src/i18n/en/errors.ts, where the words are.
 * Neither the worker nor this document follows the interface language.
 */
export type CaptureFailure = 'captureNotAllowed' | 'captureRefused';

interface Capture {
  stream: MediaStream;
  output: AudioContext;
  type: string;
  recorder: MediaRecorder | null;
  chunks: Blob[];
}

const captures = new Map<number, Capture>();

/** Open the tab's sound from a stream id the service worker obtained, and keep it audible. */
export async function openCapture(tabId: number, streamId: string): Promise<void> {
  closeCapture(tabId);
  const type = recordingType((t) => MediaRecorder.isTypeSupported(t));
  if (!type) throw new Error('this browser cannot record audio');
  const stream = await navigator.mediaDevices.getUserMedia({
    // Chrome's own constraint names for a tab's sound; not in the DOM types.
    audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } } as MediaTrackConstraints,
    video: false,
  });
  const output = new AudioContext();
  output.createMediaStreamSource(stream).connect(output.destination);
  captures.set(tabId, { stream, output, type, recorder: null, chunks: [] });
  // Closing the tab, or reloading it, ends the capture.
  for (const track of stream.getTracks()) track.addEventListener('ended', () => closeCapture(tabId));
}

export function isCapturing(tabId: number): boolean {
  return captures.has(tabId);
}

export function startRecording(tabId: number): void {
  const c = captures.get(tabId);
  if (!c) throw new Error("this tab's sound is not being captured — click the Libregaku icon and choose Record here");
  if (c.recorder?.state === 'recording') c.recorder.stop();
  c.chunks = [];
  const recorder = new MediaRecorder(c.stream, { mimeType: c.type, audioBitsPerSecond: 96_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size) c.chunks.push(e.data);
  };
  recorder.start();
  c.recorder = recorder;
}

export function stopRecording(tabId: number): Promise<Media | null> {
  const c = captures.get(tabId);
  const r = c?.recorder;
  if (!c || !r || r.state === 'inactive') return Promise.resolve(null);
  return new Promise((resolve) => {
    r.onstop = () => {
      const blob = new Blob(c.chunks, { type: c.type });
      c.chunks = [];
      if (blob.size < 1000) resolve(null);
      else void base64Of(blob).then((data) => resolve({ data, type: c.type }), () => resolve(null));
    };
    r.stop();
  });
}

export function closeCapture(tabId: number): void {
  const c = captures.get(tabId);
  if (!c) return;
  captures.delete(tabId);
  if (c.recorder?.state === 'recording') c.recorder.stop();
  for (const track of c.stream.getTracks()) track.stop();
  void c.output.close().catch(() => {});
}
