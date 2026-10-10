import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A tab's sound in the offscreen document: opened from a stream id, played
 * straight back out so the tab is not silenced, recorded a line at a time,
 * and let go when the tab's capture ends.
 */

const connect = vi.fn();
const close = vi.fn(async () => {});
const ended: Array<() => void> = [];
const getUserMedia = vi.fn();

class Recorder {
  static isTypeSupported = (t: string) => t === 'audio/webm;codecs=opus';
  state: 'inactive' | 'recording' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() { this.state = 'recording'; }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([new Uint8Array(4000)]) });
    this.onstop?.();
  }
}

beforeEach(() => {
  vi.resetModules();
  connect.mockClear();
  close.mockClear();
  ended.length = 0;
  const track = { stop: vi.fn(), addEventListener: (_: string, fn: () => void) => ended.push(fn) };
  getUserMedia.mockReset().mockResolvedValue({ getTracks: () => [track] });
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal('AudioContext', class {
    destination = 'speakers';
    createMediaStreamSource() { return { connect }; }
    close = close;
  });
  vi.stubGlobal('MediaRecorder', Recorder);
});
afterEach(() => vi.unstubAllGlobals());

describe('tab capture', () => {
  it("opens the tab's sound from its stream id, and keeps it audible", async () => {
    const tc = await import('../tab-capture');
    await tc.openCapture(7, 'stream-1');
    const constraints = getUserMedia.mock.calls[0]![0] as { audio: { mandatory: Record<string, string> }; video: boolean };
    expect(constraints.audio.mandatory).toEqual({ chromeMediaSource: 'tab', chromeMediaSourceId: 'stream-1' });
    expect(constraints.video).toBe(false);
    expect(connect).toHaveBeenCalledWith('speakers');
    expect(tc.isCapturing(7)).toBe(true);
    expect(tc.isCapturing(8)).toBe(false);
  });

  it('records a line at a time from it', async () => {
    const tc = await import('../tab-capture');
    await tc.openCapture(7, 'stream-1');
    tc.startRecording(7);
    const got = await tc.stopRecording(7);
    expect(got?.type).toBe('audio/webm;codecs=opus');
    expect(atob(got!.data)).toHaveLength(4000);
    expect(await tc.stopRecording(7)).toBeNull();
  });

  it('says how to start, for a tab that is not being captured', async () => {
    const tc = await import('../tab-capture');
    expect(() => tc.startRecording(9)).toThrow(/click the Libregaku icon/);
  });

  it('lets go when the capture ends — the tab closed or reloaded', async () => {
    const tc = await import('../tab-capture');
    await tc.openCapture(7, 'stream-1');
    ended.forEach((fn) => fn());
    expect(tc.isCapturing(7)).toBe(false);
    expect(close).toHaveBeenCalled();
  });
});
