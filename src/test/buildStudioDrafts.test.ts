import { describe, expect, it } from 'vitest';
import { parseDraft, readDrafts } from '@/lib/buildStudio/drafts';

const draft = { name: 'Burger kitchen', savedAt: '2026-10-10T20:00:00Z', config: { color: 'white', items: [{ uid: 'a', id: 'griddle36', wall: 'back', x: 0 }] }, categories: ['burgers'], menu: ['Fries'] };
describe('Build Studio device drafts', () => {
  it('restores menu context and catalog placements', () => { expect(parseDraft(draft)).toEqual(draft); });
  it('rejects broken, non-finite and retired placements', () => {
    expect(parseDraft({ ...draft, config: { ...draft.config, items: [null] } })).toBeNull();
    expect(parseDraft({ ...draft, config: { ...draft.config, items: [{ ...draft.config.items[0], x: NaN }] } })).toBeNull();
    expect(parseDraft({ ...draft, config: { ...draft.config, items: [{ ...draft.config.items[0], id: 'retired' }] } })).toBeNull();
  });
  it('reports corrupt storage rather than returning an empty successful result', () => {
    expect(() => readDrafts({ getItem: () => '{broken' })).toThrow();
    expect(() => readDrafts({ getItem: () => '{}' })).toThrow();
    expect(() => readDrafts({ getItem: () => JSON.stringify([null]) })).toThrow();
  });
  it('distinguishes absent data from blocked storage', () => {
    expect(readDrafts({ getItem: () => null })).toEqual([]);
    expect(() => readDrafts({ getItem: () => { throw new Error('denied'); } })).toThrow('denied');
  });
});
