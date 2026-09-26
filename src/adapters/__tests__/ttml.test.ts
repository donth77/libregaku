import { describe, expect, it } from 'vitest';
import { parseTtml } from '../ttml';
import { parseVtt } from '../netflix';

const wrap = (body: string, tickRate = '10000000') =>
  `<tt xmlns="http://www.w3.org/ns/ttml" ttp:tickRate="${tickRate}"
       xmlns:ttp="http://www.w3.org/ns/ttml#parameter"><body><div>${body}</div></body></tt>`;

/** A document with any root parameters, and tts: bound for inline styling. */
const doc = (body: string, params = '') =>
  `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling"
       xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ${params}><body><div>${body}</div></body></tt>`;

const text = (xml: string): string | undefined => parseTtml(xml)[0]?.text;

/**
 * Shaped like Netflix's Japanese imsc1.1: ruby roles set on <style> elements
 * the spans refer to (which is how Netflix's own parser resolves them),
 * vertical text in a side region with tate-chu-yoko digits, and a two-speaker
 * line whose <br/> sits inside the span.
 */
const NETFLIX_JA = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttp="http://www.w3.org/ns/ttml#parameter"
    xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttm="http://www.w3.org/ns/ttml#metadata"
    ttp:profile="http://www.w3.org/ns/ttml/profile/imsc1.1/text" ttp:tickRate="10000000"
    ttp:timeBase="media" xml:lang="ja">
  <head>
    <styling>
      <style xml:id="s0" tts:fontSize="100%" tts:color="white"/>
      <style xml:id="rubyContainer" tts:ruby="container" tts:rubyPosition="outside"/>
      <style xml:id="rubyBase" tts:ruby="base"/>
      <style xml:id="rubyText" tts:ruby="text" tts:fontSize="50%"/>
      <style xml:id="tcy" tts:textCombine="all"/>
    </styling>
    <layout>
      <region xml:id="bottom" tts:origin="10% 80%" tts:extent="80% 15%" tts:displayAlign="after"/>
      <region xml:id="right" tts:origin="85% 10%" tts:extent="10% 80%" tts:writingMode="tbrl"/>
    </layout>
  </head>
  <body>
    <div>
      <p begin="12012000t" end="36036000t" region="bottom" style="s0" xml:id="subtitle1">
        <span style="rubyContainer"><span style="rubyBase">漢字</span><span style="rubyText">かんじ</span></span>を<span style="rubyContainer"><span style="rubyBase">読</span><span style="rubyText">よ</span></span>む
      </p>
      <p begin="40000000t" end="60000000t" region="right" style="s0" tts:writingMode="tbrl" xml:id="subtitle2"><span>第</span><span style="tcy">12</span><span>話</span></p>
      <p begin="70000000t" end="90000000t" region="bottom" style="s0" xml:id="subtitle3"><span>－どうした？<br/>－別に</span></p>
    </div>
  </body>
</tt>`;

describe('parseTtml', () => {
  it('converts ticks using the declared tickRate', () => {
    const cues = parseTtml(wrap('<p begin="10000000t" end="30000000t">彼女は</p>'));
    expect(cues).toEqual([{ start: 1, end: 3, text: '彼女は' }]);
  });

  it('reads clock times', () => {
    const cues = parseTtml(wrap('<p begin="00:00:01.500" end="00:00:03.500">test</p>'));
    expect(cues[0]?.start).toBeCloseTo(1.5);
    expect(cues[0]?.end).toBeCloseTo(3.5);
  });

  it('reads seconds and milliseconds', () => {
    expect(parseTtml(wrap('<p begin="2s" end="4s">a</p>'))[0]?.start).toBe(2);
    expect(parseTtml(wrap('<p begin="500ms" end="1s">a</p>'))[0]?.start).toBeCloseTo(0.5);
  });

  it('turns <br/> into a newline and keeps the rest inline', () => {
    const cues = parseTtml(wrap('<p begin="0s" end="1s">one<br/>two</p>'));
    expect(cues[0]?.text).toBe('one\ntwo');
  });

  it('honours a non-default tickRate', () => {
    const cues = parseTtml(wrap('<p begin="1000t" end="2000t">a</p>', '1000'));
    expect(cues[0]?.start).toBe(1);
  });

  it('skips cues with no begin, and sorts by start', () => {
    const cues = parseTtml(wrap(
      '<p begin="5s" end="6s">second</p><p end="1s">no begin</p><p begin="1s" end="2s">first</p>',
    ));
    expect(cues.map((c) => c.text)).toEqual(['first', 'second']);
  });

  it('returns empty for malformed XML rather than throwing', () => {
    expect(parseTtml('<tt><body><div><p begin=')).toEqual([]);
  });

  describe('Netflix Japanese imsc1.1', () => {
    const cues = parseTtml(NETFLIX_JA);

    it('keeps the ruby base and drops the reading, with roles set on referenced styles', () => {
      expect(cues[0]).toEqual({ start: 1.2012, end: 3.6036, text: '漢字を読む' });
    });

    it('keeps tate-chu-yoko digits in vertical text as ordinary text', () => {
      expect(cues[1]?.text).toBe('第12話');
    });

    it('breaks the line at a <br/> inside a span', () => {
      expect(cues[2]?.text).toBe('－どうした？\n－別に');
    });
  });

  describe('ruby', () => {
    it('drops inline tts:ruby text spans', () => {
      expect(text(doc(
        '<p begin="1s" end="2s"><span tts:ruby="container"><span tts:ruby="base">漢字</span>' +
          '<span tts:ruby="text">かんじ</span></span>を読む</p>',
      ))).toBe('漢字を読む');
    });

    it('drops delimiters, which carry parentheses for players without ruby', () => {
      expect(text(doc(
        '<p begin="1s" end="2s"><span tts:ruby="container"><span tts:ruby="base">東京</span>' +
          '<span tts:ruby="delimiter">（</span><span tts:ruby="text">とうきょう</span>' +
          '<span tts:ruby="delimiter">）</span></span>へ</p>',
      ))).toBe('東京へ');
    });

    it('keeps a base container and drops a text container', () => {
      expect(text(doc(
        '<p begin="1s" end="2s"><span tts:ruby="container">' +
          '<span tts:ruby="baseContainer"><span tts:ruby="base">漢</span><span tts:ruby="base">字</span></span>' +
          '<span tts:ruby="textContainer"><span tts:ruby="text">かん</span><span tts:ruby="text">じ</span></span>' +
          '</span></p>',
      ))).toBe('漢字');
    });

    it('follows a style that refers on to the style carrying the role', () => {
      const xml = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling">
        <head><styling>
          <style xml:id="reading" tts:ruby="text"/>
          <style xml:id="small" style="reading" tts:fontSize="50%"/>
        </styling></head>
        <body><div><p begin="1s" end="2s"><span>読</span><span style="small">よ</span>む</p></div></body></tt>`;
      expect(text(xml)).toBe('読む');
    });

    it('drops HTML-style rt and rp wherever they turn up', () => {
      expect(text(doc('<p begin="1s" end="2s">東京<rp>(</rp><rt>とうきょう</rt><rp>)</rp>へ</p>'))).toBe('東京へ');
    });

    it('ignores the prefix a file binds the styling namespace to', () => {
      const xml = `<tt xmlns="http://www.w3.org/ns/ttml" xmlns:s="http://www.w3.org/ns/ttml#styling">
        <body><div><p begin="1s" end="2s"><span s:ruby="container"><span s:ruby="base">字</span>` +
        `<span s:ruby="text">じ</span></span></p></div></body></tt>`;
      expect(text(xml)).toBe('字');
    });
  });

  describe('whitespace', () => {
    it('does not put a space inside Japanese that was only pretty-printed across lines', () => {
      expect(text(doc(`<p begin="1s" end="2s">
          <span>日本語の</span>
          <span>字幕</span>
        </p>`))).toBe('日本語の字幕');
    });

    it('keeps the space pretty-printing implies between words that use them', () => {
      expect(text(doc(`<p begin="1s" end="2s">
          <span>Hello</span>
          <span>world</span>
        </p>`))).toBe('Hello world');
      // Hangul is spaced by word, so a line break there is a space too.
      expect(text(doc('<p begin="1s" end="2s"><span>안녕</span>\n<span>하세요</span></p>'))).toBe('안녕 하세요');
    });

    it('keeps the intended break and drops the indentation around it', () => {
      expect(text(doc(`<p begin="1s" end="2s">
          <span>一行目</span>
          <br/>
          <span>二行目</span>
        </p>`))).toBe('一行目\n二行目');
    });

    it('treats a line feed as a line break under xml:space="preserve"', () => {
      expect(text(doc('<p begin="1s" end="2s" xml:space="preserve">一行目\n二行目</p>'))).toBe('一行目\n二行目');
    });

    it('collapses runs of spaces and drops empty lines', () => {
      expect(text(doc('<p begin="1s" end="2s">a   b<br/><br/>  c  </p>'))).toBe('a b\nc');
    });
  });

  describe('time expressions', () => {
    it('reads frames at the effective frame rate', () => {
      const cue = parseTtml(doc(
        '<p begin="00:00:01:12" end="00:00:02:00">a</p>',
        'ttp:frameRate="24" ttp:frameRateMultiplier="1000 1001"',
      ))[0];
      expect(cue?.start).toBeCloseTo(1 + 12 / (24 * 1000 / 1001), 6);
      expect(cue?.end).toBe(2);
    });

    it('reads sub-frames', () => {
      const cue = parseTtml(doc(
        '<p begin="00:00:01:12.1" end="00:00:02:00">a</p>',
        'ttp:frameRate="25" ttp:subFrameRate="2"',
      ))[0];
      expect(cue?.start).toBeCloseTo(1 + 12.5 / 25, 6);
    });

    it('defaults to 30 frames per second when no rate is declared', () => {
      expect(parseTtml(doc('<p begin="00:00:01:15" end="2s">a</p>'))[0]?.start).toBeCloseTo(1.5);
    });

    it('reads frame, minute and hour offsets', () => {
      expect(parseTtml(doc('<p begin="30f" end="60f">a</p>', 'ttp:frameRate="30"'))[0]).toMatchObject({ start: 1, end: 2 });
      expect(parseTtml(doc('<p begin="1.5m" end="2m">a</p>'))[0]).toMatchObject({ start: 90, end: 120 });
      expect(parseTtml(doc('<p begin="0.5h" end="1h">a</p>'))[0]).toMatchObject({ start: 1800, end: 3600 });
    });

    it('counts ticks in frames when only a frame rate is declared', () => {
      expect(parseTtml(doc('<p begin="50t" end="75t">a</p>', 'ttp:frameRate="25"'))[0]).toMatchObject({ start: 2, end: 3 });
    });

    it('honours dur when there is no end', () => {
      expect(parseTtml(doc('<p begin="1s" dur="0.5s">short</p>'))[0]).toMatchObject({ start: 1, end: 1.5 });
    });

    it('offsets a cue by the begin of the div around it', () => {
      const xml = `<tt xmlns="http://www.w3.org/ns/ttml"><body><div begin="100s">
        <p begin="1s" end="2s">late</p></div></body></tt>`;
      expect(parseTtml(xml)[0]).toMatchObject({ start: 101, end: 102 });
    });

    it('never lets a cue outlive its parent, and times an untimed p by its parent', () => {
      const xml = `<tt xmlns="http://www.w3.org/ns/ttml"><body>
        <div begin="10s" end="12s"><p begin="1s" end="5s">clipped</p></div>
        <div begin="20s" end="22s"><p>whole div</p></div></body></tt>`;
      expect(parseTtml(xml)).toEqual([
        { start: 11, end: 12, text: 'clipped' },
        { start: 20, end: 22, text: 'whole div' },
      ]);
    });

    it('drops a cue that ends before it begins', () => {
      expect(parseTtml(doc('<p begin="5s" end="4s">never shown</p>'))).toEqual([]);
    });
  });
});

describe('parseVtt', () => {
  it('parses cues with an index line', () => {
    const cues = parseVtt('WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\n日本語を\n');
    expect(cues).toEqual([{ start: 1, end: 3, text: '日本語を' }]);
  });

  it('keeps multi-line cue text', () => {
    const cues = parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\none\ntwo\n');
    expect(cues[0]?.text).toBe('one\ntwo');
  });

  it('ignores trailing cue settings on the timing line', () => {
    const cues = parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000 line:90%\nx\n');
    expect(cues[0]?.end).toBe(2);
  });

  it("strips Netflix's class spans and keeps the ruby base without its reading", () => {
    const cues = parseVtt(
      'WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000 position:50% line:85%\n' +
        '<c.japanese><c.bg_transparent><ruby>漢字<rt>かんじ</rt></ruby>&lrm;です</c.bg_transparent></c.japanese>\n',
    );
    expect(cues[0]?.text).toBe('漢字です');
  });

  it('drops an rt whose end tag was left out', () => {
    expect(parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<ruby>東京<rt>とうきょう</ruby>へ\n')[0]?.text).toBe('東京へ');
  });

  it('removes italics, bold, underline, voices, language spans and timestamps', () => {
    const cues = parseVtt(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n' +
        '<v Roger Bingham><i>We</i> <b>are</b> <u>in</u></v> <lang en-GB>New</lang> <00:00:01.500>York\n',
    );
    expect(cues[0]?.text).toBe('We are in New York');
  });

  it('decodes entities after the tags are gone, so escaped markup stays text', () => {
    const cues = parseVtt(
      'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nTom &amp; Jerry &lt;i&gt; &#x3042;&#12354;&nbsp;x‏\n',
    );
    expect(cues[0]?.text).toBe('Tom & Jerry <i> ああ x');
  });

  it('skips a cue that is nothing but tags', () => {
    expect(parseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<c.japanese></c.japanese>\n')).toEqual([]);
  });
});
