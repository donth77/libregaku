import { describe, expect, it } from 'vitest';
import { MATURE_DAYS } from '../status';

describe('MATURE_DAYS', () => {
  it("matches Anki's own definition of a mature card", () => {
    expect(MATURE_DAYS).toBe(21);
  });
});
