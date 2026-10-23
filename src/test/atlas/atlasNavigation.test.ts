import { describe, expect, it } from 'vitest';
import { asksToPauseNavigation } from '@/lib/atlas/atlasNavigation';

describe('Atlas local navigation stop', () => {
  it('recognizes direct stop and page control requests', () => {
    for (const text of ['Stop!', 'Please stop.', 'stop changing the pages', "don't change pages", 'stay on this page', 'pause scrolling']) expect(asksToPauseNavigation(text)).toBe(true);
  });
  it('does not pause for unrelated uses of stop', () => {
    for (const text of ['Where can my truck stop?', 'Can I stop renting?', 'Do not stop showing listings', 'How do I change my menu?']) expect(asksToPauseNavigation(text)).toBe(false);
  });
});
