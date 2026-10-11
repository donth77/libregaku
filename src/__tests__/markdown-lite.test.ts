import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../markdown-lite';

const html = (md: string): string => {
  const box = document.createElement('div');
  box.appendChild(renderMarkdown(md));
  return box.innerHTML;
};

describe('markdown in an answer', () => {
  it('draws a bulleted list with bold names, as the model writes it', () => {
    expect(html('*   **Screenshot:** Settings → Anki cards → Screenshot.\n*   **I\'m learning:** Settings → Languages.'))
      .toBe('<ul><li><strong>Screenshot:</strong> Settings → Anki cards → Screenshot.</li>' +
        '<li><strong>I\'m learning:</strong> Settings → Languages.</li></ul>');
  });

  it('draws numbered lists, paragraphs, headings, italic and code', () => {
    expect(html('1. One\n2. Two')).toBe('<ol><li>One</li><li>Two</li></ol>');
    expect(html('First.\n\nSecond *really* uses `R`.')).toBe('<p>First.</p><p>Second <em>really</em> uses <code>R</code>.</p>');
    expect(html('## Title\nText')).toBe('<p><strong>Title</strong></p><p>Text</p>');
    expect(html('a\nb')).toBe('<p>a<br>b</p>');
  });

  it('links only https addresses, in a new tab', () => {
    expect(html('[Anki](https://apps.ankiweb.net)')).toBe('<p><a href="https://apps.ankiweb.net" target="_blank" rel="noopener">Anki</a></p>');
    expect(html('[x](javascript:alert(1))')).toBe('<p>[x](javascript:alert(1))</p>');
  });

  it('never turns text into markup', () => {
    const out = html('<img src=x onerror=alert(1)> **<b>hi</b>**');
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
    expect(out).toContain('<strong>&lt;b&gt;hi&lt;/b&gt;</strong>');
  });

  it('leaves a mark that is not closed yet as typed, and stars used as a list alone', () => {
    expect(html('Turn **off')).toBe('<p>Turn **off</p>');
    expect(html('2 * 3 * 4')).toBe('<p>2 * 3 * 4</p>');
  });
});
