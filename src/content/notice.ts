import { HUMAN } from '../assumptions';

/**
 * A visible failure notice.
 *
 * The dangerous failure mode for this extension is silence: a site changes,
 * subtitles simply stop appearing, and nothing says why. Daily canaries catch
 * renames, but a behavioural change can leave every string intact and still
 * break rendering. So when the extension gives up, it says so on screen rather
 * than only in a console nobody has open.
 */

const STYLE = `
  :host {
    position: absolute !important;
    left: 50% !important; bottom: 8% !important;
    transform: translateX(-50%) !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
  }
  .card {
    pointer-events: auto;
    display: flex; align-items: flex-start; gap: 12px;
    max-width: 460px; padding: 12px 14px;
    background: #161B2E; color: #E8ECF6;
    border: 1px solid #2A3348; border-left: 3px solid #E5806C;
    border-radius: 8px;
    font: 13px/1.5 system-ui, -apple-system, sans-serif;
    box-shadow: 0 8px 32px -8px rgba(0,0,0,.7);
  }
  .body { flex: 1; }
  .title { font-weight: 600; margin-bottom: 2px; }
  .detail { color: #B4BDD4; font-size: 12px; }
  .id {
    font: 10px/1.4 ui-monospace, monospace; color: #838DA8;
    letter-spacing: .06em; margin-top: 5px;
  }
  button {
    flex: none; background: none; border: 0; cursor: pointer;
    color: #838DA8; font: 600 11px/1 ui-monospace, monospace;
    letter-spacing: .08em; text-transform: uppercase; padding: 3px 5px;
  }
  button:hover { color: #E8ECF6; }
  button:focus-visible { outline: 2px solid #F2F5FC; outline-offset: 2px; border-radius: 3px; }
  @media (prefers-reduced-motion: no-preference) {
    .card { animation: in .18s ease-out; }
    @keyframes in { from { opacity: 0; transform: translateY(6px); } }
  }
`;

/** Reasons the user has already waved away this session. */
const dismissed = new Set<string>();

let host: HTMLElement | null = null;

export function clearNotice(): void {
  host?.remove();
  host = null;
}

export function showNotice(mount: HTMLElement, id: string, detail?: string): void {
  if (dismissed.has(id)) return;
  clearNotice();

  host = document.createElement('div');
  host.className = 'libregaku-notice';
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE;

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'status');

  const body = document.createElement('div');
  body.className = 'body';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = HUMAN[id] ?? 'Libregaku hit an unexpected problem.';

  body.appendChild(title);

  if (detail) {
    const d = document.createElement('div');
    d.className = 'detail';
    d.textContent = detail;
    body.appendChild(d);
  }

  // Surfacing the id makes a user report actionable without a debug session.
  if (HUMAN[id]) {
    const tag = document.createElement('div');
    tag.className = 'id';
    tag.textContent = id;
    body.appendChild(tag);
  }

  const close = document.createElement('button');
  close.textContent = 'Dismiss';
  close.addEventListener('click', () => {
    dismissed.add(id);
    clearNotice();
  });

  card.append(body, close);
  root.append(style, card);
  mount.appendChild(host);
}
