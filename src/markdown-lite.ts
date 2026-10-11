/**
 * The little of Markdown a model's answer uses, drawn as elements: paragraphs,
 * headings, bullet and numbered lists, **bold**, *italic*, `code` and
 * [words](https://…) links.
 *
 * Built node by node, never as HTML, so nothing in an answer can become markup
 * or script. Anything it does not know stays as the text it was. Safe to call on
 * an answer that is half written: a mark not yet closed shows as typed until it is.
 */

const INLINE = new RegExp([
  '\\*\\*(?!\\s)(.+?)(?<!\\s)\\*\\*',               // **bold**
  '\\*(?![\\s*])([^*\\n]+?)(?<![\\s*])\\*',          // *italic*
  '`([^`\\n]+)`',                                    // `code`
  '\\[([^\\]\\n]+)\\]\\((https:\\/\\/[^)\\s]+)\\)',  // [words](https://…)
].join('|'), 'g');

/** A line of text as nodes. */
function inline(text: string): Node[] {
  const out: Node[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > at) out.push(document.createTextNode(text.slice(at, m.index)));
    if (m[1] !== undefined) {
      const b = document.createElement('strong');
      b.append(...inline(m[1]));
      out.push(b);
    } else if (m[2] !== undefined) {
      const i = document.createElement('em');
      i.append(...inline(m[2]));
      out.push(i);
    } else if (m[3] !== undefined) {
      const c = document.createElement('code');
      c.textContent = m[3];
      out.push(c);
    } else if (m[4] !== undefined && m[5] !== undefined) {
      const a = document.createElement('a');
      a.href = m[5];
      a.target = '_blank';
      a.rel = 'noopener';
      a.append(...inline(m[4]));
      out.push(a);
    }
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push(document.createTextNode(text.slice(at)));
  return out;
}

const BULLET = /^\s*[*+-]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*#{1,6}\s+(.*)$/;

export function renderMarkdown(text: string): DocumentFragment {
  const out = document.createDocumentFragment();
  let list: HTMLUListElement | HTMLOListElement | null = null;
  let para: HTMLParagraphElement | null = null;
  const close = (): void => {
    list = null;
    para = null;
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    const heading = HEADING.exec(line);
    if (!line.trim()) {
      close();
    } else if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (!list || list.tagName.toLowerCase() !== kind) {
        close();
        list = document.createElement(kind);
        out.appendChild(list);
      }
      para = null;
      const li = document.createElement('li');
      li.append(...inline((bullet ?? numbered)![1]!));
      list.appendChild(li);
    } else if (heading) {
      close();
      const p = document.createElement('p');
      const b = document.createElement('strong');
      b.append(...inline(heading[1]!));
      p.appendChild(b);
      out.appendChild(p);
    } else {
      list = null;
      if (!para) {
        para = document.createElement('p');
        out.appendChild(para);
      } else {
        para.appendChild(document.createElement('br'));
      }
      para.append(...inline(line));
    }
  }
  return out;
}
