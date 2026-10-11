import { describe, expect, it } from 'vitest';
import type { TrackInfo } from '../../adapters/types';
import { studyTracks, translationTracks, chooseSecond, chooseTrack, sameTracks } from '../track-choice';

/**
 * Which of a video's tracks is studied. A site lists Chinese twice — once in
 * each script — and used to be answered with whichever it listed first.
 */

const track = (id: string, lang: string, more: Partial<TrackInfo> = {}): TrackInfo =>
  ({ id, lang, label: id, generated: false, ...more });

const pick = (tracks: TrackInfo[], want: string): string | undefined => chooseTrack(tracks, want)?.id;

describe('the track to study', () => {
  it('is the one in the script being learned, wherever the site lists it', () => {
    const both = [track('hant', 'zh-Hant'), track('hans', 'zh-Hans')];
    expect(pick(both, 'zh-Hans')).toBe('hans');
    expect(pick(both, 'zh-Hant')).toBe('hant');
    expect(pick([...both].reverse(), 'zh-Hans')).toBe('hans');
    expect(pick([...both].reverse(), 'zh-Hant')).toBe('hant');
  });

  it('knows a script by the place a site names instead', () => {
    // YouTube names Chinese tracks by place as often as by script.
    const byPlace = [track('tw', 'zh-TW'), track('hk', 'zh-HK'), track('cn', 'zh-CN'), track('plain', 'zh')];
    expect(pick(byPlace, 'zh-Hans')).toBe('cn');
    expect(pick(byPlace, 'zh-Hant')).toBe('tw');
  });

  it('settles for the other script rather than nothing', () => {
    expect(pick([track('hant', 'zh-Hant')], 'zh-Hans')).toBe('hant');
    expect(pick([track('hans', 'zh-Hans')], 'zh-Hant')).toBe('hans');
  });

  it("takes a person's subtitles in the other script before a machine's in the right one", () => {
    const tracks = [track('auto', 'zh-Hans', { generated: true }), track('hant', 'zh-Hant')];
    expect(pick(tracks, 'zh-Hans')).toBe('hant');
    // And a machine's in the right script before a machine's in the other.
    expect(pick([track('a-hant', 'zh-Hant', { generated: true }), track('a-hans', 'zh-Hans', { generated: true })], 'zh-Hans')).toBe('a-hans');
  });

  it('prefers plain subtitles to closed captions, within a script', () => {
    const tracks = [track('hans-cc', 'zh-Hans', { cc: true }), track('hans', 'zh-Hans'), track('hant', 'zh-Hant')];
    expect(pick(tracks, 'zh-Hans')).toBe('hans');
    // Captions in the script being learned still come before the other script.
    expect(pick([track('hant', 'zh-Hant'), track('hans-cc', 'zh-Hans', { cc: true })], 'zh-Hans')).toBe('hans-cc');
  });

  it('chooses as before for a language written one way', () => {
    const ja = [track('auto', 'ja', { generated: true }), track('cc', 'ja', { cc: true }), track('subs', 'ja'), track('second', 'ja')];
    expect(pick(ja, 'ja')).toBe('subs');
    expect(pick(ja.slice(0, 2), 'ja')).toBe('cc');
    expect(pick(ja.slice(0, 1), 'ja')).toBe('auto');
    expect(pick([], 'ja')).toBeUndefined();
  });

  it('takes one that is already here before one the player must be asked for, other things equal', () => {
    // Netflix names most of a title's tracks and sends the files of a few.
    expect(pick([track('later', 'ja', { onRequest: true }), track('here', 'ja')], 'ja')).toBe('here');
    // But asking is worth it for plain subtitles over captions, and for the script being learned.
    expect(pick([track('cc', 'ja', { cc: true }), track('subs', 'ja', { onRequest: true })], 'ja')).toBe('subs');
    expect(pick([track('hant', 'zh-Hant'), track('hans', 'zh-Hans', { onRequest: true })], 'zh-Hans')).toBe('hans');
    expect(pick([track('only', 'ko', { onRequest: true })], 'ko')).toBe('only');
  });
});

describe('the track for the line underneath', () => {
  const second = (tracks: TrackInfo[], native: string, studied: string): string | undefined =>
    chooseSecond(tracks, native, studied)?.id;

  it("is one in the learner's own language, plain subtitles before captions", () => {
    const tracks = [track('ja', 'ja'), track('en-cc', 'en', { cc: true }), track('en', 'en'), track('fr', 'fr')];
    expect(second(tracks, 'en', 'ja')).toBe('en');
    expect(second(tracks.filter((t) => t.id !== 'en'), 'en', 'ja')).toBe('en-cc');
    expect(second(tracks, 'de', 'ja')).toBeUndefined();
  });

  it('is never the track being studied, nor a forced one', () => {
    // Learning English with English as your own language: the other English track, if there is one.
    expect(second([track('en', 'en'), track('en-cc', 'en', { cc: true })], 'en', 'en')).toBe('en-cc');
    expect(second([track('en', 'en')], 'en', 'en')).toBeUndefined();
    expect(second([track('ja', 'ja'), track('en-forced', 'en', { forced: true })], 'en', 'ja')).toBeUndefined();
  });

  it('prefers the script the learner reads, and settles for the other', () => {
    const tracks = [track('ja', 'ja'), track('hans', 'zh-Hans'), track('hant', 'zh-Hant')];
    expect(second(tracks, 'zh-Hant', 'ja')).toBe('hant');
    expect(second(tracks, 'zh', 'ja')).toBe('hans');
    expect(second(tracks.slice(0, 2), 'zh-Hant', 'ja')).toBe('hans');
  });
});

describe('telling two track lists apart', () => {
  const list = (): TrackInfo[] => [track('ja', 'ja'), track('zh', 'zh-Hans', { onRequest: true }), track('en', 'en', { cc: true })];

  it('calls them the same when every track is, in the same order', () => {
    expect(sameTracks(list(), list())).toBe(true);
    expect(sameTracks([], [])).toBe(true);
    // A flag left out is a flag that is off.
    expect(sameTracks([{ id: 'a', lang: 'ja', label: 'a' }], [{ id: 'a', lang: 'ja', label: 'a', generated: false, forced: false, cc: false }])).toBe(true);
  });

  it('notices a track added, removed, moved, renamed, or sent since', () => {
    expect(sameTracks(list(), [...list(), track('ko', 'ko')])).toBe(false);
    expect(sameTracks(list(), list().slice(0, 2))).toBe(false);
    expect(sameTracks(list(), list().reverse())).toBe(false);
    const renamed = list();
    renamed[0] = { ...renamed[0]!, label: 'Japanese' };
    expect(sameTracks(list(), renamed)).toBe(false);
    // The player has fetched it: the same track, no longer one to ask for.
    const sent = list();
    sent[1] = track('zh', 'zh-Hans');
    expect(sameTracks(list(), sent)).toBe(false);
  });
});

describe("the toolbar's two menus", () => {
  const many = [
    track('ja', 'ja'), track('ja-cc', 'ja', { cc: true }), track('en', 'en-US'), track('fr', 'fr'),
    track('hans', 'zh-Hans'), track('hant', 'zh-Hant'), track('th', 'th'), track('xx', 'xx'),
  ];
  const ids = (list: TrackInfo[]): string[] => list.map((t) => t.id);

  it('lists, under Subtitles, only the language being learned, in either script', () => {
    expect(ids(studyTracks(many, 'ja', null))).toEqual(['ja', 'ja-cc']);
    expect(ids(studyTracks(many, 'zh', null))).toEqual(['hans', 'hant']);
    expect(ids(studyTracks(many, 'ko', null))).toEqual([]);
  });

  it('lists, under Translation, the languages a translation can be in', () => {
    expect(ids(translationTracks(many, null))).toEqual(expect.arrayContaining(['en', 'fr']));
    expect(ids(translationTracks(many, null))).not.toContain('xx');
  });

  it('keeps the track in use in either, so the menu says what is loaded', () => {
    expect(ids(studyTracks(many, 'ja', 'fr'))).toEqual(['ja', 'ja-cc', 'fr']);
    expect(ids(translationTracks(many, 'xx'))).toContain('xx');
  });
});
