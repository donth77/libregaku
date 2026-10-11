import { describe, expect, it } from 'vitest';
import { creditField, sourceField, stampFor } from '../source';

describe('stampFor', () => {
  it('formats under an hour as m:ss', () => {
    expect(stampFor(0)).toBe('0:00');
    expect(stampFor(75)).toBe('1:15');
  });
  it('adds hours only when needed', () => {
    expect(stampFor(3725)).toBe('1:02:05');
  });
});

describe('sourceField', () => {
  it('links the title and timestamp back to the moment', () => {
    const html = sourceField({
      title: 'TEDxSannomiya', seconds: 75,
      url: 'https://www.youtube.com/watch?v=abc&t=75s',
    });
    expect(html).toBe('<a href="https://www.youtube.com/watch?v=abc&amp;t=75s">TEDxSannomiya · 1:15</a>');
  });

  it('falls back to plain text when there is no link', () => {
    expect(sourceField({ title: 'Some show', seconds: 5, url: null })).toBe('Some show · 0:05');
  });

  it('escapes a title that contains markup', () => {
    const html = sourceField({ title: '<script>x</script>', seconds: 0, url: null });
    expect(html).not.toContain('<script>');
  });

  it('handles a missing title', () => {
    expect(sourceField({ title: null, seconds: 61, url: null })).toBe('1:01');
  });
});

describe('creditField', () => {
  it("links a recording's speaker and licence to its page, in small print", () => {
    expect(creditField({ by: 'Yue Tan', licence: 'CC BY-SA 3.0 US', page: 'https://github.com/hugolpz/audio-cmn#license' }))
      .toBe('<span style="font-size:11px;opacity:.6"><a href="https://github.com/hugolpz/audio-cmn#license">Yue Tan · CC BY-SA 3.0 US</a></span> ');
  });

  it('writes no markup of its own from a name, and none of Anki\'s', () => {
    const html = creditField({ by: '<b>Tom</b> [sound:x.mp3] & "co"', licence: 'CC0', page: 'https://example.org/a?b="c"&d=[e]' });
    expect(html).not.toContain('<b>');
    expect(html).not.toContain('[sound:');
    expect(html).toContain('&lt;b&gt;Tom&lt;/b&gt; &#91;sound:x.mp3&#93; &amp; &quot;co&quot;');
    expect(html).toContain('href="https://example.org/a?b=&quot;c&quot;&amp;d=%5Be%5D"');
  });

  it('leaves out the link when the page is not one', () => {
    expect(creditField({ by: 'Ana', licence: 'CC0', page: 'javascript:alert(1)' }))
      .toBe('<span style="font-size:11px;opacity:.6">Ana · CC0</span> ');
  });
});
