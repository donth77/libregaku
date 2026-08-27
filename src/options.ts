import { DEFAULTS, loadSettings, setSetting, type Settings } from './settings';

/** Options page. Every control writes straight through — no Save button. */

async function main(): Promise<void> {
  const s = await loadSettings();

  const bind = <K extends keyof Settings>(id: K, kind: 'select' | 'check'): void => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) return;

    if (kind === 'check') (el as HTMLInputElement).checked = Boolean(s[id] ?? DEFAULTS[id]);
    else (el as HTMLSelectElement).value = String(s[id] ?? DEFAULTS[id]);

    el.addEventListener('change', () => {
      const value = kind === 'check' ? (el as HTMLInputElement).checked : (el as HTMLSelectElement).value;
      void setSetting(id, value as Settings[K]);
    });
  };

  bind('interaction', 'select');
  bind('hoverPause', 'check');
  bind('sidebarHover', 'check');
  bind('ruby', 'select');
}

void main();
