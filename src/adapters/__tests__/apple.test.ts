import { describe, expect, it } from 'vitest';
import { titleFrom, titleIdOf } from '../apple';

describe('titleIdOf', () => {
  it('reads the id of an episode, a show and a film', () => {
    expect(titleIdOf('/us/episode/chapter-one/umc.cmc.4k8qxa0ob0jh9spx6uuy1st5q')).toBe('umc.cmc.4k8qxa0ob0jh9spx6uuy1st5q');
    expect(titleIdOf('/us/show/pachinko/umc.cmc.17vf6g68dy89kk1l1nnb6min4')).toBe('umc.cmc.17vf6g68dy89kk1l1nnb6min4');
    expect(titleIdOf('/gb/movie/some-film/umc.cmc.abc')).toBe('umc.cmc.abc');
  });

  it('is null on a page that is not a title', () => {
    expect(titleIdOf('/us')).toBeNull();
    expect(titleIdOf('/us/search')).toBeNull();
  });
});

describe('titleFrom', () => {
  it('drops the mark, the verb and the site from the page title', () => {
    // As tv.apple.com writes it, the left-to-right mark included.
    expect(titleFrom('‎Watch Chapter One - Pachinko (Season 1, Episode 1) - Apple TV')).toBe('Chapter One - Pachinko (Season 1, Episode 1)');
    expect(titleFrom('‎Watch Pachinko - Apple TV')).toBe('Pachinko');
  });

  it('still reads the name the site had before', () => {
    expect(titleFrom('Watch Severance - Apple TV+')).toBe('Severance');
  });

  it('has nothing to say on a page with only the site for a title', () => {
    expect(titleFrom('‎Apple TV')).toBeNull();
    expect(titleFrom('')).toBeNull();
  });
});
