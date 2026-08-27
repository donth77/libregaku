import { describe, expect, it } from 'vitest';
import { sourceField, stampFor } from '../source';

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
