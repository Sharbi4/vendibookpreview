import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NUDGE_QUIET_MS, createAttentionNudger, currentJourney, journeyBriefing, watchAttention, type AttentionItem } from '@/lib/atlas/journeyContext';
import { ATLAS_DEFAULT_OPENING, ATLAS_FIRST_MESSAGE } from '@/lib/atlas/atlasConfig';
import { ALLISON_FIRST_MESSAGE } from '@/lib/atlas/allisonConfig';

const at = (path: string, html = '') => {
  window.history.replaceState({}, '', path);
  document.body.innerHTML = html;
};

describe('journey context: where the user is', () => {
  it('opens on a sale listing with its title and Purchase Protection', () => {
    at('/listing/abc', '<div data-atlas-listing="sale"><h1>2019 Ford Step Van</h1></div>');
    const j = currentJourney();
    expect(j.stage).toBe('listing');
    expect(j.salesOpening).toBe("I see you're looking at the 2019 Ford Step Van. Want help with the price, what's included, or how buying with Purchase Protection works?");
    expect(j.supportOpening).toContain('2019 Ford Step Van');
  });

  it('shortens long listing titles to a speakable name', () => {
    at('/listing/r', '<div data-atlas-listing="rental"><h1>Black 14ft food trailer available for rent! Can start cooking from day 1!</h1></div>');
    expect(currentJourney().salesOpening).toMatch(/^I see you're looking at the Black 14ft food trailer available for rent\. Want help/);
    at('/listing/t', '<div data-atlas-listing="sale"><h1>The Taco Truck - 2018 Ford, low miles</h1></div>');
    expect(currentJourney().salesOpening).toMatch(/^I see you're looking at The Taco Truck\. /);
  });

  it('talks dates and pricing on a rental listing', () => {
    at('/listing/xyz', '<div data-atlas-listing="rental"><h1>Shared Kitchen Downtown</h1></div>');
    const j = currentJourney();
    expect(j.salesOpening).toContain('dates');
    expect(j.teaser).toBe('Questions about this rental?');
  });

  it('reads search terms from the URL', () => {
    at('/search?q=food-truck&location=Austin', '<h1>Results</h1>');
    expect(currentJourney().salesOpening).toContain('browsing food truck listings in Austin');
  });

  it('never reads content on private pages, only the stage', () => {
    at('/checkout/abc', '<h1>Pay $48,000 to Jane Smith</h1>');
    const j = currentJourney();
    expect(j).toMatchObject({ stage: 'checkout', private: true }); expect(j.subject).toBeUndefined();
    expect(journeyBriefing(j)).not.toContain('Jane');
    expect(journeyBriefing(j)).toContain('private');
    at('/dashboard/messages/1', '<h1>Chat with Bob</h1>');
    expect(currentJourney()).toMatchObject({ stage: 'messages', private: true }); expect(currentJourney().subject).toBeUndefined();
  });

  it('recognizes listing, orders, walkthrough and home stages', () => {
    for (const [path, stage] of [['/list', 'selling'], ['/sell-my-food-truck', 'selling'], ['/dashboard/transactions/9', 'orders'], ['/walkthrough/5', 'walkthrough'], ['/', 'home'], ['/pricing', 'pricing'], ['/help', 'support']] as const) {
      at(path, '<h1>x</h1>');
      expect(currentJourney().stage, path).toBe(stage);
    }
    at('/', '');
    expect(currentJourney().salesOpening).toBe(ATLAS_DEFAULT_OPENING);
  });

  it('first messages end with the page_opening variable', () => {
    expect(ATLAS_FIRST_MESSAGE).toMatch(/\{\{page_opening\}\}$/);
    expect(ALLISON_FIRST_MESSAGE).toMatch(/\{\{page_opening\}\}$/);
  });
});

describe('attention: what the user points at', () => {
  let seen: AttentionItem[];
  let stop: () => void;
  const hover = (el: Element) => el.dispatchEvent(Object.assign(new MouseEvent('pointerover', { bubbles: true }), { pointerType: 'mouse' }));

  beforeEach(() => {
    vi.useFakeTimers();
    seen = [];
    at('/listing/abc', `
      <section><h2>Delivery options</h2><button>Check delivery to my ZIP</button></section>
      <section><h2>Contact</h2><label for="e">Email</label><input id="e" type="email" value="me@example.com"></section>
      <div data-atlas-ui><button>End call</button></div>`);
    stop = watchAttention((a) => seen.push(a));
  });
  afterEach(() => { stop(); vi.useRealTimers(); });

  it('reports a control the pointer rests on, with its section', () => {
    hover(document.querySelector('section button')!);
    vi.advanceTimersByTime(1500);
    expect(seen).toEqual([{ kind: 'pointing at', label: '"Check delivery to my ZIP" in the "Delivery options" section' }]);
  });

  it('ignores quick passes, sensitive fields, values and the agent UI', () => {
    hover(document.querySelector('section button')!);
    vi.advanceTimersByTime(500);
    hover(document.querySelector('input')!);
    vi.advanceTimersByTime(1500);
    hover(document.querySelector('[data-atlas-ui] button')!);
    vi.advanceTimersByTime(1500);
    expect(seen).toEqual([]);
    expect(JSON.stringify(seen)).not.toContain('me@example.com');
  });

  it('does not repeat itself or report on private pages', () => {
    const btn = document.querySelector('section button')!;
    hover(btn); vi.advanceTimersByTime(1500);
    vi.advanceTimersByTime(6000);
    hover(document.body); hover(btn); vi.advanceTimersByTime(1500);
    expect(seen).toHaveLength(1);
    window.history.replaceState({}, '', '/checkout/abc');
    vi.advanceTimersByTime(61000);
    hover(btn); vi.advanceTimersByTime(1500);
    expect(seen).toHaveLength(1);
  });
});

describe('speaking up about what the user is looking at', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const item = { kind: 'pointing at' as const, label: '"Delivery options"' };

  it('offers help after the user goes quiet on something, once per item', () => {
    const nudge = vi.fn();
    const n = createAttentionNudger({ isBusy: () => false, nudge });
    vi.advanceTimersByTime(NUDGE_QUIET_MS);
    n.attention(item);
    vi.advanceTimersByTime(NUDGE_QUIET_MS);
    expect(nudge).toHaveBeenCalledTimes(1);
    expect(nudge.mock.calls[0][0]).toMatch(/^\[Screen note from the website, not words the user said: they paused, pointing at "Delivery options"/);
    vi.advanceTimersByTime(60000);
    n.attention(item);
    vi.advanceTimersByTime(NUDGE_QUIET_MS);
    expect(nudge).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while anyone is talking or typing', () => {
    const nudge = vi.fn();
    let busy = true;
    const n = createAttentionNudger({ isBusy: () => busy, nudge });
    vi.advanceTimersByTime(NUDGE_QUIET_MS);
    n.attention(item);
    vi.advanceTimersByTime(NUDGE_QUIET_MS);
    expect(nudge).not.toHaveBeenCalled();
    busy = false;
    n.attention({ kind: 'reading', label: 'the "Photos" section' });
    vi.advanceTimersByTime(3000);
    n.activity();
    vi.advanceTimersByTime(NUDGE_QUIET_MS);
    expect(nudge).not.toHaveBeenCalled();
  });
});
