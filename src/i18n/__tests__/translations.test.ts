import { describe, expect, it } from 'vitest';
import { en } from '../en';
import { TRANSLATIONS } from '../all';
import type { Translation } from '..';
import { HELP_EN, type HelpBlock, type HelpTranslation } from '../../help/content';
import { HELP_TRANSLATIONS } from '../../help/all';

/**
 * Each translation follows the English string for string: the same sections
 * and keys, a function wherever English has one, taking as many values, and
 * every {placeholder} a template puts an element into. A string left out
 * would show in English; a placeholder dropped would lose a link or a button.
 * The help goes chapter by chapter and topic by topic, keeping its keys.
 */

const INTERFACE: Record<string, Translation> = TRANSLATIONS;
const HELP: Record<string, HelpTranslation> = HELP_TRANSLATIONS;

type Words = Record<string, unknown>;
const sectionOf = (t: Translation, name: string): Words => (t as Record<string, Words | undefined>)[name] ?? {};
const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
/** Values to call a string's function with: a count, then names. */
const SAMPLE = [3, 'Xyz', 'Qrs', 2];
/** What a function says for the sample values, or null where they do not suit it (a list, a status). */
const call = (fn: unknown, n: number): string | null => {
  try {
    return String((fn as (...a: unknown[]) => unknown)(...SAMPLE.slice(0, n)));
  } catch {
    return null;
  }
};

for (const [lang, t] of Object.entries(INTERFACE)) {
  describe(`the interface in ${lang}`, () => {
    it('has every string English has, and none it lacks', () => {
      const missing: string[] = [];
      const extra = Object.keys(t).filter((name) => !(name in en));
      for (const [name, words] of Object.entries(en)) {
        const theirs = sectionOf(t, name);
        for (const key of Object.keys(words)) if (!(key in theirs)) missing.push(`${name}.${key}`);
        for (const key of Object.keys(theirs)) if (!(key in words)) extra.push(`${name}.${key}`);
      }
      expect(missing).toEqual([]);
      expect(extra).toEqual([]);
    });

    it('takes what English takes, and keeps every placeholder', () => {
      const wrong: string[] = [];
      for (const [name, words] of Object.entries(en) as Array<[string, Words]>) {
        const theirs = sectionOf(t, name);
        for (const [key, value] of Object.entries(words)) {
          const mine = theirs[key];
          const at = `${name}.${key}`;
          if (mine === undefined) continue;
          if (typeof mine !== typeof value) {
            wrong.push(`${at}: a ${typeof mine}, not a ${typeof value}`);
          } else if (typeof value === 'function') {
            const fn = mine as (...a: unknown[]) => unknown;
            if (fn.length !== value.length) wrong.push(`${at}: takes ${fn.length}, not ${value.length}`);
            // Called as English is, it runs and keeps the placeholders English
            // keeps. Where English itself cannot take these values (a list, a
            // status), skip it: the types already hold it to the same values.
            const ours = call(value, value.length);
            if (ours === null) continue;
            const theirsOut = call(fn, value.length);
            if (theirsOut === null) wrong.push(`${at}: throws`);
            else if (placeholders(ours).join() !== placeholders(theirsOut).join()) wrong.push(`${at}: placeholders`);
          } else if (typeof value === 'string') {
            if (placeholders(mine as string).join() !== placeholders(value).join()) wrong.push(`${at}: placeholders`);
            if (!(mine as string).trim() && value.trim()) wrong.push(`${at}: empty`);
          } else if (value && typeof value === 'object') {
            // A table inside a section (parts of speech): every entry, as strings.
            const table = mine as Words;
            for (const k of Object.keys(value)) if (typeof table[k] !== 'string') wrong.push(`${at}.${k}`);
          }
        }
      }
      expect(wrong).toEqual([]);
    });
  });
}

/** What a block's keys are: `S`, `Esc` — they stay as they are. */
const keysIn = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]!).sort();
const textOf = (block: HelpBlock): string[] =>
  typeof block === 'string' ? [block]
    : Array.isArray(block) ? block
      : 'tip' in block ? [block.tip]
        : [...block.head, ...block.rows.flat()];
const kind = (block: HelpBlock): string =>
  typeof block === 'string' ? 'p'
    : Array.isArray(block) ? `steps×${block.length}`
      : 'tip' in block ? 'tip'
        : `table ${block.head.length}×${block.rows.length}`;

for (const [lang, t] of Object.entries(HELP)) {
  describe(`the help in ${lang}`, () => {
    it('has every chapter and topic, set out as the English is, keys and all', () => {
      const wrong: string[] = [];
      for (const key of ['title', 'intro', 'search', 'searchLabel', 'none', 'settings', 'contents', 'tipLabel', 'then', 'link'] as const) {
        if (!t[key]) wrong.push(key);
      }
      if (!t.popular?.label) wrong.push('popular');
      if (t.none && !t.none.includes('{q}')) wrong.push('none: {q}');
      for (const chapter of HELP_EN.chapters) {
        const theirs = t.chapters?.find((c) => c.id === chapter.id);
        if (!theirs) {
          wrong.push(chapter.id);
          continue;
        }
        if (Boolean(chapter.about) !== Boolean(theirs.about)) wrong.push(`${chapter.id}: about`);
        for (const topic of chapter.topics) {
          const mine = theirs.topics.find((x) => x.id === topic.id);
          if (!mine) {
            wrong.push(`${chapter.id}/${topic.id}`);
            continue;
          }
          if (mine.body.map(kind).join() !== topic.body.map(kind).join()) wrong.push(`${topic.id}: shape`);
          topic.body.forEach((block, i) => {
            const other = mine.body[i];
            if (other && keysIn(textOf(block).join(' ')).join() !== keysIn(textOf(other).join(' ')).join()) {
              wrong.push(`${topic.id}: keys in block ${i}`);
            }
          });
          if (!mine.keywords?.length) wrong.push(`${topic.id}: keywords`);
        }
        for (const extra of theirs.topics.filter((x) => !chapter.topics.some((y) => y.id === x.id))) {
          wrong.push(`${chapter.id}/${extra.id}: not in English`);
        }
      }
      for (const extra of (t.chapters ?? []).filter((c) => !HELP_EN.chapters.some((e) => e.id === c.id))) {
        wrong.push(`${extra.id}: not in English`);
      }
      expect(wrong).toEqual([]);
    });
  });
}

describe('a string to call', () => {
  it('suits the values the checks above call it with, and says when it does not', () => {
    expect(call((n: number) => `${n} cards`, 1)).toBe('3 cards');
    expect(call((list: string[]) => list.join(), 1)).toBeNull();
  });
});
