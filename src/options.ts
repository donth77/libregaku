import {
  DEFAULTS,
  NATIVE_LANGUAGES,
  TARGET_LANGUAGES,
  loadSettings,
  setSetting,
  type Settings,
} from './settings';

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

  /*
   * Say plainly what each language actually gets. Tier 0 finds word boundaries
   * and nothing else, which means lookups match on the surface form — so an
   * inflected word may not find a card you already have. Better stated up
   * front than discovered as flakiness.
   */
  const NOTES: Record<0 | 1 | 2, string> = {
    2: 'Full support: dictionary forms, readings and furigana.',
    1: 'Words and lookups. No dictionary forms yet, so inflected words may not match.',
    0: 'Word boundaries only. Lookups match exactly what is on screen.',
  };

  const target = document.getElementById('target') as HTMLSelectElement;
  const note = document.getElementById('tierNote') as HTMLElement;
  for (const l of TARGET_LANGUAGES) {
    const o = document.createElement('option');
    o.value = l.code;
    o.textContent = l.label + (l.tier === 2 ? '' : ` — limited`);
    target.appendChild(o);
  }
  const showNote = (): void => {
    const tier = TARGET_LANGUAGES.find((l) => l.code === target.value)?.tier ?? 0;
    note.textContent = NOTES[tier];
  };
  target.value = s.target ?? DEFAULTS.target;
  showNote();
  target.addEventListener('change', () => {
    showNote();
    void setSetting('target', target.value);
    void setSetting('configured', true);
  });

  const native = document.getElementById('native') as HTMLSelectElement;
  for (const l of NATIVE_LANGUAGES) {
    const o = document.createElement('option');
    o.value = l.code;
    o.textContent = l.label;
    native.appendChild(o);
  }
  native.value = s.native ?? DEFAULTS.native;
  native.addEventListener('change', () => {
    void setSetting('native', native.value);
    void setSetting('configured', true);
  });

  bind('interaction', 'select');
  bind('hoverPause', 'check');
  bind('sidebarHover', 'check');
  bind('ruby', 'select');
}

void main();
