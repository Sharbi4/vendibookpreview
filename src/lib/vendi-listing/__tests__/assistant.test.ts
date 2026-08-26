import { describe, expect, it } from 'vitest';
import { parseCommand } from '../commands';
import { reconcileChange } from '../reconcile';
import {
  blockingQuestionIds, rankedNextQuestion, readinessProgress, remainingQuestionIds,
} from '../prioritize';
import { importSummary, isUrlOnly, parseExistingListing } from '../importText';
import type { VendiDraft } from '../script';

const base = (over: Partial<VendiDraft> = {}): VendiDraft => ({
  title: null, description: null, category: null, mode: null, ...over,
} as VendiDraft);

const publishable = (over: Partial<VendiDraft> = {}): VendiDraft => base({
  title: 'Turnkey coffee trailer',
  description: 'A well kept 20ft coffee trailer with a full espresso setup and three compartment sink.',
  category: 'food_trailer',
  mode: 'sale',
  city: 'Mesa',
  state: 'AZ',
  price_sale: 45000,
  ...over,
});

describe('prioritisation', () => {
  it('asks blockers before optional depth', () => {
    const q = rankedNextQuestion(base(), [], 0);
    expect(q?.id).toBe('import_choice');
    const afterImport = rankedNextQuestion(base(), ['import_choice', 'import_paste'], 0);
    expect(blockingQuestionIds(base(), 0)).toContain(afterImport!.id);
  });

  it('offers the publish gate as soon as the listing is viable', () => {
    const draft = publishable();
    const answered = ['import_choice', 'import_paste', 'category', 'mode', 'location', 'sale_price', 'description', 'title', 'photos'];
    expect(blockingQuestionIds(draft, 1)).toHaveLength(0);
    expect(rankedNextQuestion(draft, answered, 1)?.id).toBe('ready_gate');
  });

  it('reports honest readiness progress, not question count', () => {
    expect(readinessProgress(base(), 0).percent).toBeLessThan(20);
    const ready = readinessProgress(publishable(), 1);
    expect(ready.ready).toBe(true);
    expect(ready.percent).toBe(100);
    expect(ready.label).toBe('Ready to publish');
    expect(readinessProgress(publishable({ amenities: undefined }), 1).improvements.length).toBeGreaterThan(0);
  });

  it('can close out every remaining question when the seller publishes now', () => {
    const draft = publishable();
    const remaining = remainingQuestionIds(draft, ['category']);
    expect(remaining).not.toContain('category');
    expect(remaining.length).toBeGreaterThan(0);
  });
});

describe('natural corrections', () => {
  it('edits an explicit sale price', () => {
    const cmd = parseCommand('change the price to 42,000', publishable(), 1);
    expect(cmd?.kind).toBe('edit');
    if (cmd?.kind === 'edit') expect(cmd.patch.price_sale).toBe(42000);
  });

  it('never invents a value from a vague correction', () => {
    expect(parseCommand('the price is wrong', publishable(), 1)).toBeNull();
    expect(parseCommand('make it nicer', publishable(), 1)).toBeNull();
  });

  it('answers questions about captured facts without changing them', () => {
    const cmd = parseCommand("what's missing?", base(), 0);
    expect(cmd?.kind).toBe('answer');
  });

  it('recognises undo', () => {
    expect(parseCommand('undo that', publishable(), 1)?.kind).toBe('undo');
  });

  it('removes only an explicitly named item', () => {
    const draft = publishable({ amenities: ['Generator', 'Espresso machine'] });
    const cmd = parseCommand('remove generator', draft, 1);
    expect(cmd?.kind).toBe('edit');
    if (cmd?.kind === 'edit') expect(cmd.patch.amenities).toEqual(['Espresso machine']);
  });
});

describe('mode and category reconciliation', () => {
  it('clears sale pricing when switching to a rental', () => {
    const result = reconcileChange(publishable(), { mode: 'rent' });
    expect(result.patch.price_sale).toBeNull();
    expect(result.dropAnswered).toContain('sale_price');
  });

  it('keeps facts that remain true across the change', () => {
    const result = reconcileChange(publishable(), { mode: 'rent' });
    expect(result.patch.city).toBeUndefined();
    expect(result.patch.description).toBeUndefined();
  });
});

describe('bulk paste clarity', () => {
  it('refuses to imply it can read a link', () => {
    expect(isUrlOnly('https://facebook.com/marketplace/item/123')).toBe(true);
    expect(isUrlOnly('2019 coffee trailer in Mesa AZ')).toBe(false);
  });

  it('summarises only what was captured', () => {
    const result = parseExistingListing('2019 Coffee Trailer, turnkey\nGreat espresso setup inside.\nLocation: Mesa, AZ');
    const summary = importSummary(result);
    expect(summary).toContain('Location');
    expect(summary).not.toMatch(/\$/);
  });
});
