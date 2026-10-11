/**
 * Getting text out of the extension.
 *
 * Both paths are here because both fail in different places: the clipboard
 * needs a user gesture and a focused document, and a download needs the host
 * page to allow a blob link. Each reports whether it worked so the button can
 * say so rather than appear to do nothing.
 */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* no permission, or the document is not focused — try the old way */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    // Off-screen rather than hidden: a display:none field cannot be selected.
    ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * Copy text still being put together. The clipboard wants the click that
 * asked for it, and a click is spent by the time a slow answer comes; a
 * clipboard item made from a promise keeps it. Without one, the text is
 * awaited and copied the old way.
 */
export async function copyWhenReady(text: Promise<string>): Promise<boolean> {
  try {
    if (typeof ClipboardItem === 'function' && navigator.clipboard?.write) {
      const blob = text.then((t) => new Blob([t], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return true;
    }
  } catch {
    /* refused, or no focus — the old way may still work */
  }
  return copyText(await text);
}

/**
 * Save text as a file.
 *
 * The anchor has to be in the page's own document — a click on a node inside
 * our shadow root, or on one that was never connected, does nothing.
 */
export function downloadText(name: string, text: string, type = 'text/plain'): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Long enough for the download to start, short enough not to leak.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return true;
  } catch {
    return false;
  }
}

/** A field that will not break a tab-separated line. */
export function tsvCell(s: string | undefined): string {
  return (s ?? '').replace(/[\t\r\n]+/g, ' ').trim();
}
