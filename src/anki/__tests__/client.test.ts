import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ankiCall, ankiTry } from '../rpc';
import {
  DuplicateNote, NoteTypeMismatch, addNote, addSentence, browseOurCards, countOurCards, createDeck,
  ensureModel, isDuplicate, probe,
} from '../client';
import { RELAYED_ACTIONS } from '../direct';
import { FIELDS, MODEL_NAME } from '../model';
import { buildStatusMap } from '../status';

vi.mock('../rpc', () => ({ ankiCall: vi.fn(), ankiTry: vi.fn() }));

/**
 * AnkiConnect as far as the client needs it: a note type, a deck list, and
 * whatever addNote was last handed.
 */
let modelFields: string[] | null = [...FIELDS];
let added: Array<Record<string, unknown>> = [];
const seen = new Set<string>();

async function anki(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
  seen.add(action);
  switch (action) {
    case 'version': return 6;
    case 'modelNames': return modelFields ? ['Basic', MODEL_NAME] : ['Basic'];
    case 'modelFieldNames': return modelFields ?? [];
    case 'createModel': modelFields = [...FIELDS]; return {};
    case 'deckNames': return ['Default', 'Mining'];
    case 'createDeck': return 1;
    case 'addNote': added.push(params.note as Record<string, unknown>); return 99;
    case 'findCards': return [1, 2, 3];
    case 'findNotes': return [];
    case 'notesInfo': return [];
    case 'guiBrowse': return [];
    default: throw new Error(`unexpected action ${action}`);
  }
}

beforeEach(() => {
  modelFields = [...FIELDS];
  added = [];
  seen.clear();
  vi.mocked(ankiCall).mockReset().mockImplementation(anki as typeof ankiCall);
  vi.mocked(ankiTry).mockReset().mockImplementation((async (action: string, params?: Record<string, unknown>) =>
    ({ ok: true, result: await anki(action, params) })) as typeof ankiTry);
});

const fieldsOf = (i = 0) => (added[i]?.fields ?? {}) as Record<string, string>;

describe('addNote', () => {
  it('escapes every field, keeping only the furigana brackets it built', async () => {
    await addNote({
      deck: 'Mining',
      expression: '<b>分かる</b>',
      reading: '分[わ]かる',
      meaning: 'to understand; R&D <i>',
      sentence: 'ねえ[笑]\n分かった？',
      sentenceMeaning: 'Hey (laughs)\nGot it?',
      source: '<a href="https://www.youtube.com/watch?v=x&amp;t=1s">Show · 0:01</a>',
      tags: ['libregaku'],
    });
    expect(fieldsOf()).toEqual({
      Expression: '&lt;b&gt;分かる&lt;/b&gt;',
      Reading: '分[わ]かる',
      Meaning: 'to understand; R&amp;D &lt;i&gt;',
      // Sentence renders through {{furigana:}}: a bracket of its own must stay a bracket.
      Sentence: 'ねえ&#91;笑&#93;<br>分かった？',
      SentenceMeaning: 'Hey (laughs)<br>Got it?',
      // Already HTML, escaped where it was made.
      Source: '<a href="https://www.youtube.com/watch?v=x&amp;t=1s">Show · 0:01</a>',
      Audio: '',
      Image: '',
    });
  });

  it('neutralises markup even in a reading string', async () => {
    await addNote({ deck: 'Mining', expression: 'x', reading: 'x<img onerror=1>', meaning: '', tags: [] });
    expect(fieldsOf().Reading).toBe('x&lt;img onerror=1&gt;');
  });

  it('builds the reading from segments, escaping their text', async () => {
    await addNote({
      deck: 'Mining', expression: '食べる', meaning: '', tags: [],
      reading: [{ text: '食', ruby: 'た' }, { text: 'べる[' }],
    });
    expect(fieldsOf().Reading).toBe('食[た]べる&#91;');
  });

  it('turns a duplicate refusal into something a caller can recognise', async () => {
    vi.mocked(ankiCall).mockRejectedValueOnce(new Error('cannot create note because it is a duplicate'));
    const e = await addNote({ deck: 'Mining', expression: '猫', reading: '猫', meaning: '', tags: [] })
      .catch((x: unknown) => x);
    expect(e).toBeInstanceOf(DuplicateNote);
    expect(isDuplicate(e)).toBe(true);
    expect((e as DuplicateNote).deck).toBe('Mining');
    expect((e as Error).message).toBe('Already in Mining.');
  });

  it('does not mistake a missing deck named for duplicates as a duplicate card', async () => {
    vi.mocked(ankiCall).mockRejectedValueOnce(new Error('deck was not found: Duplicates'));
    const e = await addNote({ deck: 'Duplicates', expression: '猫', reading: '猫', meaning: '', tags: [] })
      .catch((x: unknown) => x);
    expect(isDuplicate(e)).toBe(false);
  });
});

describe('addSentence', () => {
  it("escapes the line, and keeps the first field's line break raw for Anki's duplicate check", async () => {
    await addSentence({ deck: 'Mining', text: 'ねえ[笑]\n<次>', translation: 'Hey & you', tags: [] });
    expect(fieldsOf()).toMatchObject({
      Expression: 'ねえ&#91;笑&#93;\n&lt;次&gt;',
      Reading: 'ねえ&#91;笑&#93;<br>&lt;次&gt;',
      Meaning: 'Hey &amp; you',
    });
  });

  it('reports a line already added as a duplicate', async () => {
    vi.mocked(ankiCall).mockRejectedValueOnce(new Error('cannot create note because it is a duplicate'));
    const e = await addSentence({ deck: 'Mining', text: 'はい', tags: [] }).catch((x: unknown) => x);
    expect(isDuplicate(e)).toBe(true);
  });
});

describe('ensureModel', () => {
  it('installs the note type when the collection lacks it', async () => {
    modelFields = null;
    expect(await ensureModel()).toBe('created');
    expect(seen.has('createModel')).toBe(true);
  });

  it('accepts an existing note type that has every field, in any case', async () => {
    modelFields = FIELDS.map((f) => f.toUpperCase());
    expect(await ensureModel()).toBe('present');
  });

  it('refuses, and names the fields, when an existing note type cannot hold the card', async () => {
    modelFields = ['Expression', 'Reading', 'Definition'];
    const e = await ensureModel().catch((x: unknown) => x);
    expect(e).toBeInstanceOf(NoteTypeMismatch);
    expect((e as NoteTypeMismatch).missing).toEqual(['Meaning', 'Sentence', 'SentenceMeaning', 'Source', 'Audio', 'Image']);
    expect((e as Error).message).toContain('Manage Note Types');
    // It is the user's note type: nothing that would change it was sent.
    const sent = vi.mocked(ankiCall).mock.calls.map(([a]) => a);
    expect(sent).toEqual(['modelNames', 'modelFieldNames']);
  });

  it('treats losing a first-run race to create it as having it', async () => {
    modelFields = null;
    vi.mocked(ankiCall).mockImplementation((async (action: string, params?: Record<string, unknown>) => {
      if (action === 'createModel') {
        modelFields = [...FIELDS];
        throw new Error('Model name already exists');
      }
      return anki(action, params);
    }) as typeof ankiCall);
    expect(await ensureModel()).toBe('present');
  });
});

describe('probe', () => {
  it('reports each failure as its own state', async () => {
    const answer = (r: object) => vi.mocked(ankiTry).mockResolvedValueOnce({ ok: false, ...r });
    answer({ kind: 'offline', offline: true });
    expect(await probe()).toEqual({ kind: 'offline' });
    answer({ kind: 'blocked' });
    expect(await probe()).toEqual({ kind: 'blocked' });
    answer({ kind: 'occupied', error: 'HTTP 501' });
    expect(await probe()).toEqual({ kind: 'occupied', detail: 'HTTP 501' });
    answer({ kind: 'timeout', error: 'no answer' });
    expect(await probe()).toEqual({ kind: 'busy', detail: 'no answer' });
  });

  it('counts cards, not notes, when connected', async () => {
    expect(await probe()).toEqual({ kind: 'connected', decks: ['Default', 'Mining'], cards: 3, installed: 'present' });
    expect(seen.has('findCards')).toBe(true);
  });

  it('says why when the note type does not fit', async () => {
    modelFields = ['Expression'];
    const s = await probe();
    expect(s.kind).toBe('refused');
    expect(s.kind === 'refused' && s.detail).toContain('Meaning');
  });
});

describe('the relay allowlist', () => {
  it('carries every action the client and the status layer use', async () => {
    modelFields = null;
    await probe();
    await addNote({ deck: 'Mining', expression: 'x', reading: 'x', meaning: '', tags: [] });
    await addSentence({ deck: 'Mining', text: 'x', tags: [] });
    await createDeck('New');
    await browseOurCards();
    await countOurCards();
    // A collection with one studied note, so the status layer reads it too.
    vi.mocked(ankiCall).mockImplementation((async (action: string, params?: Record<string, unknown>) =>
      action === 'findNotes' ? [1] : action === 'notesInfo' ? [{}] : anki(action, params)) as typeof ankiCall);
    await buildStatusMap('');

    const used = new Set([
      ...vi.mocked(ankiCall).mock.calls.map(([a]) => a),
      ...vi.mocked(ankiTry).mock.calls.map(([a]) => a),
    ]);
    expect(used).toContain('notesInfo');
    expect([...used].filter((a) => !RELAYED_ACTIONS.has(a))).toEqual([]);
  });
});
