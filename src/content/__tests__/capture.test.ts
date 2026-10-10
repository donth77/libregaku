import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { base64Of, elementRecorder, extensionFor, isEncrypted, recordingType, stillOf } from '../capture';

/**
 * Taking a line's sound and a still from the video element: what Chrome will
 * allow, what it records into, and what comes back when it will not.
 */

/** A MediaRecorder that hands back these bytes when stopped. */
function fakeRecorder(bytes: number, supported: string[] = ['audio/mp4;codecs=mp4a.40.2']) {
  const made: Array<{ stream: MediaStream; options?: MediaRecorderOptions }> = [];
  class Recorder {
    static isTypeSupported = (t: string) => supported.includes(t);
    state: 'inactive' | 'recording' = 'inactive';
    ondataavailable: ((e: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    constructor(stream: MediaStream, options?: MediaRecorderOptions) { made.push({ stream, options }); }
    start() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({ data: new Blob([new Uint8Array(bytes)]) });
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', Recorder);
  return made;
}

class Stream {
  constructor(public tracks: Array<{ kind: string; stop: () => void }> = []) {}
  getAudioTracks() { return this.tracks.filter((t) => t.kind === 'audio'); }
  getTracks() { return this.tracks; }
}

beforeEach(() => vi.stubGlobal('MediaStream', Stream));

function video(opts: { encrypted?: boolean; capture?: boolean; tracks?: Array<{ kind: string; stop: () => void }> } = {}): HTMLVideoElement {
  const v = document.createElement('video');
  Object.defineProperty(v, 'mediaKeys', { value: opts.encrypted ? {} : null });
  // happy-dom has a captureStream of its own; this one is the test's, or none.
  Object.defineProperty(v, 'captureStream', {
    value: opts.capture === false
      ? undefined
      : () => new Stream(opts.tracks ?? [{ kind: 'audio', stop: vi.fn() }, { kind: 'video', stop: vi.fn() }]),
  });
  return v;
}

afterEach(() => vi.unstubAllGlobals());

describe('what a line is recorded into', () => {
  it('prefers AAC in MP4, which every Anki client plays, then Opus in WebM', () => {
    expect(recordingType(() => true)).toBe('audio/mp4;codecs=mp4a.40.2');
    expect(recordingType((t) => t.startsWith('audio/webm'))).toBe('audio/webm;codecs=opus');
    expect(recordingType(() => false)).toBeNull();
  });

  it('names the files by what they hold', () => {
    expect(extensionFor('audio/mp4;codecs=mp4a.40.2')).toBe('m4a');
    expect(extensionFor('audio/webm;codecs=opus')).toBe('webm');
    expect(extensionFor('image/jpeg')).toBe('jpg');
  });

  it('carries bytes as base64', async () => {
    expect(await base64Of(new Blob(['abc']))).toBe(btoa('abc'));
  });
});

describe('recording from the video element', () => {
  it("records only the element's sound, and hands it back as base64", async () => {
    const made = fakeRecorder(5000);
    const tracks = [{ kind: 'audio', stop: vi.fn() }, { kind: 'video', stop: vi.fn() }];
    const rec = elementRecorder(video({ tracks }))!;
    await rec.start();
    expect((made[0]!.stream as unknown as Stream).getTracks().map((t) => t.kind)).toEqual(['audio']);
    expect(made[0]!.options?.mimeType).toBe('audio/mp4;codecs=mp4a.40.2');
    const got = await rec.stop();
    expect(got?.type).toBe('audio/mp4;codecs=mp4a.40.2');
    expect(atob(got!.data)).toHaveLength(5000);
    rec.dispose();
    for (const t of tracks) expect(t.stop).toHaveBeenCalled();
  });

  it('has nothing from encrypted video, or a browser that cannot capture or record', () => {
    fakeRecorder(5000);
    expect(isEncrypted(video({ encrypted: true }))).toBe(true);
    expect(elementRecorder(video({ encrypted: true }))).toBeNull();
    expect(elementRecorder(video({ capture: false }))).toBeNull();
    fakeRecorder(5000, []);
    expect(elementRecorder(video())).toBeNull();
  });

  it('calls a recording too short to be a line nothing, and says when there is no sound to record', async () => {
    fakeRecorder(10);
    const rec = elementRecorder(video())!;
    await rec.start();
    expect(await rec.stop()).toBeNull();
    await expect(elementRecorder(video({ tracks: [{ kind: 'video', stop: () => {} }] }))!.start()).rejects.toThrow(/no sound/);
  });
});

describe('a still from the video', () => {
  it('is not taken from encrypted video, or one with no frame yet', async () => {
    const encrypted = video({ encrypted: true });
    Object.defineProperty(encrypted, 'videoWidth', { value: 1280 });
    Object.defineProperty(encrypted, 'videoHeight', { value: 720 });
    expect(await stillOf(encrypted)).toBeNull();
    expect(await stillOf(video())).toBeNull();
  });
});
