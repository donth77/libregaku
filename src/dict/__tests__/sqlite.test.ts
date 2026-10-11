import { describe, expect, it } from 'vitest';
import { readTable } from '../sqlite';
import { MINI_ROWS, MINI_SQLITE } from './fixtures/mini-sqlite';

const file = Uint8Array.from(atob(MINI_SQLITE), (c) => c.charCodeAt(0));

describe('reading a table out of a SQLite file', () => {
  it('names the columns from the table’s own definition', () => {
    expect(readTable(file, 'translation').columns).toEqual([
      'lexentry', 'sense_num', 'sense', 'written_rep', 'trans_list', 'score', 'is_good', 'importance',
    ]);
  });

  it('gives every row, in order, as SQLite wrote them', () => {
    const rows = [...readTable(file, 'translation').rows];
    expect(rows.length).toBe(MINI_ROWS.length);
    const round = (v: unknown): unknown => (typeof v === 'number' ? Math.round(v * 1e9) / 1e9 : v);
    for (const [i, row] of rows.entries()) expect(row.map(round), `row ${i}`).toEqual((MINI_ROWS[i] ?? []).map(round));
    // The long ones came back whole, from the pages they spill onto.
    expect(String(rows[50]?.[2]).length).toBe(1504);
    expect(String(rows[100]?.[2]).length).toBe(3004);
  });

  it('reads the rows of one table and not another', () => {
    expect([...readTable(file, 'other').rows]).toEqual([[1, 'a'], [2, 'b']]);
  });

  it('says so for a table that is not there, and for what is not a SQLite file', () => {
    expect(() => readTable(file, 'nothing')).toThrow(/no table nothing/);
    expect(() => readTable(new TextEncoder().encode('not a database at all, just text'), 'x')).toThrow(/not a sqlite file/);
  });
});
