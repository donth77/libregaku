/**
 * Settings groups that fold shut, in the transcript panel and on the settings
 * page alike (buildSettings does it for both).
 *
 * A group's heading folds its rows away; the heading and its line of what the
 * group is for stay, so the settings read as a list of groups. What the
 * learner chose for each group is kept in extension storage, by the group's
 * own id, so it holds in every interface language and in both places. It is a
 * convenience of the view, not a setting, and is not synced.
 */

/** The groups folded shut until the learner says otherwise: what few come to read. */
const FOLDED_AT_FIRST: ReadonlySet<string> = new Set(['lg-data-and-licences']);
const KEY = 'libregaku.settings.folded';

const chosen = new Map<string, boolean>();
let loaded: Promise<void> | null = null;

/** What was chosen before, once. A choice already made in this page wins over it. */
function loadFolds(): Promise<void> {
  loaded ??= (async () => {
    try {
      const saved: unknown = (await chrome.storage.local.get(KEY))[KEY];
      if (!saved || typeof saved !== 'object') return;
      for (const [id, shut] of Object.entries(saved)) {
        if (typeof shut === 'boolean' && !chosen.has(id)) chosen.set(id, shut);
      }
    } catch { /* no storage to read (a test, a page without the extension): the groups open as made */ }
  })();
  return loaded;
}

const isFolded = (id: string): boolean => chosen.get(id) ?? FOLDED_AT_FIRST.has(id);

function choose(id: string, shut: boolean): void {
  chosen.set(id, shut);
  void (async () => {
    try {
      // Merged into what is stored: another tab may have folded a different group since this one read it.
      const saved: unknown = (await chrome.storage.local.get(KEY))[KEY];
      const before = saved && typeof saved === 'object' ? saved : {};
      await chrome.storage.local.set({ [KEY]: { ...before, [id]: shut } });
    } catch { /* the choice holds until the page closes */ }
  })();
}

/**
 * Fold or open each group of `panel` as chosen. While `searching` every group
 * is open: a hit must not hide in one.
 */
export function showFolds(panel: HTMLElement, searching = false): void {
  for (const section of Array.from(panel.querySelectorAll<HTMLElement>('.grp-section'))) {
    const shut = isFolded(section.id);
    section.toggleAttribute('data-folded', shut);
    section.querySelector('button.fold')?.setAttribute('aria-expanded', String(!shut || searching));
  }
}

/** Make each group's heading a button that folds it. `searching` says whether a search is open, where there is one. */
export function foldable(panel: HTMLElement, searching: () => boolean = () => false): void {
  for (const section of Array.from(panel.querySelectorAll<HTMLElement>('.grp-section'))) {
    const head = section.querySelector<HTMLElement>('.grp');
    const rows = section.querySelector<HTMLElement>('.grp-rows');
    if (!head || !rows || !section.id) continue;
    rows.id = `${section.id}-rows`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fold';
    button.setAttribute('aria-controls', rows.id);
    button.append(...Array.from(head.childNodes));
    head.appendChild(button);
    button.addEventListener('click', () => {
      choose(section.id, !isFolded(section.id));
      showFolds(panel, searching());
    });
  }
  showFolds(panel, searching());
  void loadFolds().then(() => showFolds(panel, searching()));
}

/** A link to a group — from the contents or the checklist — opens it if it is folded. */
export function unfold(panel: HTMLElement, id: string, searching = false): void {
  if (!id || !isFolded(id)) return;
  choose(id, false);
  showFolds(panel, searching);
}
