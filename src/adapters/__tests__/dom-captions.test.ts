import { afterEach, describe, expect, it } from 'vitest';
import { DomCaptionSource } from '../dom-captions';

const netflix = { container: '.player-timedtext', segment: '.player-timedtext-text-container', join: '\n' };
const youtube = { container: '.ytp-caption-window-container', segment: '.ytp-caption-segment' };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('DomCaptionSource.read', () => {
  it('leaves out ruby readings, which Netflix renders as <rt>', () => {
    document.body.innerHTML =
      '<div class="player-timedtext"><div class="player-timedtext-text-container"><span>' +
      '<ruby>漢字<rt>かんじ</rt></ruby>を<ruby>読<rp>(</rp><rt>よ</rt><rp>)</rp></ruby>む' +
      '</span></div></div>';
    expect(new DomCaptionSource(netflix).read()).toBe('漢字を読む');
  });

  it('keeps line breaks, from <br> and between text containers', () => {
    document.body.innerHTML =
      '<div class="player-timedtext">' +
      '<div class="player-timedtext-text-container"><span>－どうした？</span><br><span>－別に</span></div>' +
      '<div class="player-timedtext-text-container"><span>第十二話</span></div>' +
      '</div>';
    expect(new DomCaptionSource(netflix).read()).toBe('－どうした？\n－別に\n第十二話');
  });

  it('collapses whitespace within a line', () => {
    document.body.innerHTML =
      '<div class="player-timedtext"><div class="player-timedtext-text-container">  a \t  b  </div></div>';
    expect(new DomCaptionSource(netflix).read()).toBe('a b');
  });

  it('joins runs with nothing by default, as Japanese on YouTube needs', () => {
    document.body.innerHTML =
      '<div class="ytp-caption-window-container">' +
      '<span class="ytp-caption-segment">彼女は</span><span class="ytp-caption-segment">日本語を</span></div>';
    expect(new DomCaptionSource(youtube).read()).toBe('彼女は日本語を');
  });

  it('reads the container itself when there are no runs, and nothing when there is no container', () => {
    document.body.innerHTML = '<div class="player-timedtext">字幕</div>';
    expect(new DomCaptionSource(netflix).read()).toBe('字幕');
    document.body.innerHTML = '';
    expect(new DomCaptionSource(netflix).read()).toBe('');
  });
});
