import { vi } from 'vitest';
import { AnkiUnavailable } from '../rpc';
import type { AnkiResult } from '../direct';
import { FIELDS, MODEL_NAME } from '../model';

/**
 * A collection, and an AnkiConnect that answers the way Anki would — for the
 * actions and the search terms the extension actually sends. A search term it
 * does not know is an error rather than a guess: if the code starts asking
 * something new, the tests say so.
 *
 * Imported by tests that mock '../rpc' with the real AnkiUnavailable, so the
 * class thrown here is the one the code under test checks for.
 */

export interface FakeCard { id: number; ivl: number; isNew: boolean; suspended: boolean }
export interface FakeNote {
  id: number;
  model: string;
  deck: string;
  tags: string[];
  fields: Record<string, string>;
  cards: FakeCard[];
  mod: number;
}

type Params = Record<string, unknown>;

/** Anki's search, as far as the extension uses it: every term must hold for one card. */
function term(t: string, note: FakeNote, card: FakeCard): boolean {
  if (t.startsWith('-')) return !term(t.slice(1), note, card);
  const m = /^([a-z]+):(.*)$/i.exec(t);
  if (!m) throw new Error(`the fake does not know the search term "${t}"`);
  const key = (m[1] ?? '').toLowerCase();
  const raw = m[2] ?? '';
  const value = raw.startsWith('"') ? raw.slice(1, -1).replace(/\\(.)/g, '$1') : raw;
  switch (key) {
    case 'deck': return value === '*' || note.deck === value || note.deck.startsWith(`${value}::`);
    case 'note': return note.model.toLowerCase() === value.toLowerCase();
    case 'tag': {
      const v = value.toLowerCase();
      return note.tags.some((x) => x.toLowerCase() === v || x.toLowerCase().startsWith(`${v}::`));
    }
    case 'is':
      if (value === 'new') return card.isNew;
      if (value === 'suspended') return card.suspended;
      break;
    case 'prop': {
      const p = /^ivl>=(\d+)$/.exec(value);
      if (p) return card.ivl >= Number(p[1]);
      break;
    }
  }
  throw new Error(`the fake does not know the search term "${t}"`);
}

function terms(query: string): string[] {
  return query.match(/-?[a-z]+:"(?:[^"\\]|\\.)*"|\S+/gi) ?? [];
}

export class FakeAnki {
  notes: FakeNote[] = [];
  models: Record<string, string[]> = { [MODEL_NAME]: [...FIELDS] };
  decks = new Set<string>(['Default']);
  calls: Array<{ action: string; params: Params }> = [];
  offline = false;
  /** Newer AnkiConnect throws the gathered errors of a partly failed addNotes; older returns nulls. */
  addNotesFailures: 'throw' | 'null' = 'throw';
  /** First fields addNote refuses outright, as if Anki said no. */
  refuseWords = new Set<string>();
  /** Runs before each call is answered: a mark made mid-sync, say. */
  onCall: ((action: string, params: Params) => Promise<void> | void) | null = null;
  /** The media folder: file name → base64. */
  media = new Map<string, string>();

  #id = 1000;
  #clock = 1_700_000_000;

  /** A note as Anki holds it: one new card unless `cards` says otherwise. */
  add(
    fields: Record<string, string>,
    opts: Partial<Omit<FakeNote, 'fields' | 'cards'>> & { cards?: Array<Partial<FakeCard>> } = {},
  ): FakeNote {
    const { cards = [{}], ...rest } = opts;
    const note: FakeNote = {
      id: ++this.#id,
      model: MODEL_NAME,
      deck: 'Default',
      tags: [],
      mod: ++this.#clock,
      ...rest,
      fields,
      cards: cards.map((c) => ({ id: ++this.#id, ivl: 0, isNew: true, suspended: false, ...c })),
    };
    this.notes.push(note);
    return note;
  }

  /** A card that has been reviewed, with this interval. */
  static reviewed(ivl: number, more: Partial<FakeCard> = {}): Partial<FakeCard> {
    return { ivl, isNew: false, ...more };
  }

  find(query: string): FakeNote[] {
    const ts = terms(query);
    return this.notes.filter((n) => n.cards.some((c) => ts.every((t) => term(t, n, c))));
  }

  count(action: string): number {
    return this.calls.filter((c) => c.action === action).length;
  }

  /** What ankiCall resolves to — or throws, as ankiCall does. */
  readonly call = async (action: string, params: Params = {}): Promise<unknown> => {
    if (this.offline) throw new AnkiUnavailable(`Nothing is listening on port 8765.`);
    this.calls.push({ action, params });
    await this.onCall?.(action, params);
    return this.answer(action, params);
  };

  /** What ankiTry resolves to. */
  readonly try = async (action: string, params: Params = {}): Promise<AnkiResult<unknown>> => {
    if (this.offline) return { ok: false, kind: 'offline', offline: true, error: 'Nothing is listening on port 8765.' };
    try {
      return { ok: true, result: await this.call(action, params) };
    } catch (e) {
      return { ok: false, kind: 'refused', error: e instanceof Error ? e.message : String(e) };
    }
  };

  answer(action: string, params: Params): unknown {
    switch (action) {
      case 'version': return 6;
      case 'modelNames': return Object.keys(this.models);
      case 'modelFieldNames': {
        const fields = this.models[String(params.modelName)];
        if (!fields) throw new Error(`model was not found: ${String(params.modelName)}`);
        return fields;
      }
      case 'createModel': {
        const name = String(params.modelName);
        if (this.models[name]) throw new Error('Model name already exists');
        this.models[name] = [...(params.inOrderFields as string[])];
        return {};
      }
      case 'deckNames': return [...this.decks];
      case 'createDeck': {
        const name = String(params.deck);
        const parts = name.split('::');
        for (let i = 1; i <= parts.length; i++) this.decks.add(parts.slice(0, i).join('::'));
        return 1;
      }
      case 'findNotes': return this.find(String(params.query)).map((n) => n.id);
      case 'findCards': {
        const ts = terms(String(params.query));
        return this.notes.flatMap((n) => n.cards.filter((c) => ts.every((t) => term(t, n, c))).map((c) => c.id));
      }
      case 'notesInfo':
        return (params.notes as number[]).map((id) => {
          const n = this.notes.find((x) => x.id === id);
          if (!n) return {};
          const fields = Object.fromEntries(Object.entries(n.fields).map(([k, value], order) => [k, { value, order }]));
          return { noteId: n.id, modelName: n.model, tags: [...n.tags], fields, mod: n.mod, cards: n.cards.map((c) => c.id) };
        });
      case 'addNote': return this.addNote(params.note as Params);
      case 'addNotes': {
        const errors: string[] = [];
        const ids = (params.notes as Params[]).map((spec) => {
          try {
            return this.addNote(spec);
          } catch (e) {
            errors.push(e instanceof Error ? e.message : String(e));
            return null;
          }
        });
        if (errors.length && this.addNotesFailures === 'throw') throw new Error(JSON.stringify(errors));
        return ids;
      }
      case 'addTags':
      case 'removeTags': {
        const tags = String(params.tags).split(/\s+/).filter(Boolean);
        for (const id of params.notes as number[]) {
          const n = this.notes.find((x) => x.id === id);
          if (!n) continue;
          if (action === 'addTags') {
            for (const t of tags) if (!n.tags.some((x) => x.toLowerCase() === t.toLowerCase())) n.tags.push(t);
          } else {
            n.tags = n.tags.filter((x) => !tags.some((t) => t.toLowerCase() === x.toLowerCase()));
          }
          n.mod = ++this.#clock;
        }
        return null;
      }
      case 'suspend': {
        for (const n of this.notes) for (const c of n.cards) if ((params.cards as number[]).includes(c.id)) c.suspended = true;
        return true;
      }
      case 'deleteNotes': {
        const gone = new Set(params.notes as number[]);
        this.notes = this.notes.filter((n) => !gone.has(n.id));
        return null;
      }
      case 'guiBrowse': return [];
      default: throw new Error(`the fake does not answer "${action}"`);
    }
  }

  addNote(spec: Params): number {
    const model = String(spec.modelName);
    const fields = this.models[model];
    if (!fields) throw new Error(`model was not found: ${model}`);
    const deck = String(spec.deckName);
    if (!this.decks.has(deck)) throw new Error(`deck was not found: ${deck}`);
    const given = spec.fields as Record<string, string>;
    // AnkiConnect keeps only the fields the note type has, matched without case.
    const values = Object.fromEntries(fields.map((f) => [
      f, Object.entries(given).find(([k]) => k.toLowerCase() === f.toLowerCase())?.[1] ?? '',
    ]));
    const first = values[fields[0] ?? ''] ?? '';
    if (!first.trim()) throw new Error('cannot create note because it is empty');
    if (this.refuseWords.has(first)) throw new Error(`Anki refused ${first}`);
    const options = (spec.options ?? {}) as { allowDuplicate?: boolean; duplicateScope?: string };
    if (!options.allowDuplicate) {
      const clash = this.notes.some((n) => n.model === model && (n.fields[fields[0] ?? ''] ?? '') === first &&
        (options.duplicateScope !== 'deck' || n.deck === deck));
      if (clash) throw new Error('cannot create note because it is a duplicate');
    }
    // AnkiConnect stores each file, then appends [sound:…] to the fields named
    // — only those the note type has, matched exactly.
    for (const m of (spec.audio ?? []) as Array<{ data: string; filename: string; fields: string[] }>) {
      this.media.set(m.filename, m.data);
      for (const f of m.fields) if (f in values) values[f] += `[sound:${m.filename}]`;
    }
    return this.add(values, { model, deck, tags: [...(spec.tags as string[])] }).id;
  }
}

/** chrome.storage, asynchronous like the real one and handing out copies. */
export class FakeStorage {
  local: Record<string, unknown> = {};
  sync: Record<string, unknown> = {};

  readonly api = {
    local: {
      get: vi.fn(async (keys: string | string[] | null) => { await tick(); return pick(this.local, keys); }),
      set: vi.fn(async (patch: Record<string, unknown>) => { await tick(); Object.assign(this.local, structuredClone(patch)); }),
      remove: vi.fn(async (keys: string | string[]) => { await tick(); for (const k of [keys].flat()) delete this.local[k]; }),
    },
    sync: {
      get: vi.fn(async (keys: string | string[]) => { await tick(); return pick(this.sync, keys); }),
      set: vi.fn(async (patch: Record<string, unknown>) => { Object.assign(this.sync, patch); }),
      remove: vi.fn(async (key: string) => { delete this.sync[key]; }),
    },
  };

  reset(): void {
    this.local = {};
    this.sync = {};
    for (const area of [this.api.local, this.api.sync]) {
      for (const fn of Object.values(area)) fn.mockReset();
    }
    this.api.local.get.mockImplementation(async (keys) => { await tick(); return pick(this.local, keys); });
    this.api.local.set.mockImplementation(async (patch) => { await tick(); Object.assign(this.local, structuredClone(patch)); });
    this.api.local.remove.mockImplementation(async (keys) => { await tick(); for (const k of [keys].flat()) delete this.local[k]; });
    this.api.sync.get.mockImplementation(async (keys) => { await tick(); return pick(this.sync, keys); });
    this.api.sync.set.mockImplementation(async (patch) => { Object.assign(this.sync, patch); });
    this.api.sync.remove.mockImplementation(async (key) => { delete this.sync[key]; });
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/** chrome.storage's get: the keys asked for, or everything for null. */
function pick(area: Record<string, unknown>, keys: string | string[] | null): Record<string, unknown> {
  if (keys === null) return structuredClone(area);
  return Object.fromEntries(
    (Array.isArray(keys) ? keys : [keys]).filter((k) => k in area).map((k) => [k, structuredClone(area[k])]),
  );
}
