import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isBuyerOnly, pageAction, pageOutline, readSection, scanPage } from '@/lib/atlas/atlasPage';

const html = `
  <header><nav><a href="/search">Browse</a><a href="/auth">Sign in</a></nav></header>
  <main>
    <h1>2019 Taco Trailer</h1>
    <button type="button" aria-label="Next photo">›</button>
    <button type="button">Open photo 1 of 3</button><button type="button">Open photo 2 of 3</button><button type="button">Open photo 3 of 3</button>
    <h2>Equipment</h2>
    <ul><li>36" flat-top griddle</li><li>Double fryer</li></ul>
    <h3>Power</h3>
    <p>Runs on a 7,000 W generator.</p>
    <h2>Delivery</h2>
    <label for="zip">ZIP code</label><input id="zip" type="text" />
    <button type="button" id="check">Check delivery</button>
    <button type="button">Request to buy</button>
    <button type="button" aria-label="Save listing">♡</button>
    <button type="button" aria-expanded="false">Show more</button>
    <button type="button" disabled>Make offer</button>
    <select aria-label="Sort"><option value="new">Newest</option><option value="low">Price: low to high</option></select>
    <form><label for="m">Message</label><textarea id="m"></textarea><button>Send</button></form>
    <label for="card">Card number</label><input id="card" type="text" autocomplete="cc-number" />
    <input type="email" aria-label="Email" />
    <a href="https://example.com/x">Outside site</a>
    <a href="/checkout/abc">Checkout</a>
    <div data-atlas-ui role="dialog" aria-label="Call with Atlas"><button>End call</button></div>
  </main>
  <footer><a href="/terms">Terms</a></footer>
`;

const byLabel = (label: string) => scanPage().controls.find((c) => c.label.startsWith(label));
const sectionRef = (label: string) => scanPage().sections.find((s) => s.label === label)!.ref;

beforeEach(() => {
  document.body.innerHTML = html;
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  window.scrollBy = vi.fn() as unknown as typeof window.scrollBy;
});

describe('scanPage', () => {
  it('lists headings and controls, main content before the header, and skips Atlas UI and the footer', () => {
    const map = scanPage();
    expect(map.sections.map((s) => s.label)).toEqual(['2019 Taco Trailer', 'Equipment', 'Power', 'Delivery']);
    const labels = map.controls.map((c) => c.label);
    expect(labels[0]).toBe('Next photo');
    expect(labels.filter((l) => l.startsWith('Open photo'))).toEqual(['Open photo 1 of 3']);
    expect(labels.indexOf('Browse')).toBeGreaterThan(labels.indexOf('Check delivery'));
    expect(labels).not.toContain('End call');
    expect(labels).not.toContain('Terms');
    expect(byLabel('Show more')?.label).toBe('Show more (closed)');
    expect(byLabel('Sort')).toMatchObject({ kind: 'select', value: 'Newest' });
  });

  it('marks send, pay, buy, save, sign in, payment fields and outside links as buyer_only', () => {
    for (const l of ['Request to buy', 'Save listing', 'Send', 'Sign in', 'Card number', 'Email', 'Outside site', 'Checkout']) {
      expect(byLabel(l)?.buyer_only, l).toBe(true);
    }
    for (const l of ['Next photo', 'Check delivery', 'ZIP code', 'Show more', 'Browse', 'Message']) {
      expect(byLabel(l)?.buyer_only, l).toBeUndefined();
    }
  });

  it('works inside an open dialog only', () => {
    document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><h2>Make an offer</h2><button>Close</button></div>');
    const map = scanPage();
    expect(map.in_dialog).toBe(true);
    expect(map.sections.map((s) => s.label)).toEqual(['Make an offer']);
  });

  it('gives a short outline', () => {
    expect(pageOutline()).toBe('Sections on this page: 2019 Taco Trailer · Equipment · Power · Delivery.');
  });
});

describe('pageAction', () => {
  it('scrolls and highlights a section, and reads it up to the next heading at its level', () => {
    const ref = sectionRef('Equipment');
    expect(pageAction({ action: 'highlight', target: ref })).toBe('Highlighted "Equipment" on their screen.');
    const el = document.querySelector(`[data-atlas-ref="${ref}"]`)!;
    expect(el.classList.contains('atlas-spotlight')).toBe(true);
    expect(el.scrollIntoView).toHaveBeenCalled();
    const read = JSON.parse(pageAction({ action: 'read', target: sectionRef('Equipment') }));
    expect(read.text).toBe('36" flat-top griddle Double fryer Power Runs on a 7,000 W generator.');
  });

  it('reads a section without leaking into the next one', () => {
    const h3 = document.querySelector('h3') as HTMLElement;
    expect(readSection(h3)).toBe('Runs on a 7,000 W generator.');
  });

  it('presses safe buttons but never buyer_only ones', () => {
    const next = vi.fn();
    const buy = vi.fn();
    document.querySelector('[aria-label="Next photo"]')!.addEventListener('click', next);
    Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Request to buy')!.addEventListener('click', buy);
    expect(pageAction({ action: 'click', target: byLabel('Next photo')!.ref })).toBe('Pressed "Next photo".');
    expect(next).toHaveBeenCalledTimes(1);
    expect(pageAction({ action: 'click', target: byLabel('Request to buy')!.ref })).toMatch(/has to press themselves/);
    expect(buy).not.toHaveBeenCalled();
  });

  it('never submits a form', () => {
    const submit = vi.fn((e: Event) => e.preventDefault());
    document.querySelector('form')!.addEventListener('submit', submit);
    pageAction({ action: 'click', target: byLabel('Send')!.ref });
    expect(submit).not.toHaveBeenCalled();
  });

  it('types a ZIP code with input events, refuses payment and email fields', () => {
    const zip = document.getElementById('zip') as HTMLInputElement;
    const onInput = vi.fn();
    zip.addEventListener('input', onInput);
    expect(pageAction({ action: 'fill', target: byLabel('ZIP code')!.ref, value: '85701' })).toBe('Typed "85701" into "ZIP code".');
    expect(zip.value).toBe('85701');
    expect(onInput).toHaveBeenCalled();

    expect(pageAction({ action: 'fill', target: byLabel('Card number')!.ref, value: '4111' })).toMatch(/private/);
    expect((document.getElementById('card') as HTMLInputElement).value).toBe('');
    expect(pageAction({ action: 'fill', target: byLabel('Email')!.ref, value: 'a@b.co' })).toMatch(/private/);
  });

  it('picks a select option by its text', () => {
    expect(pageAction({ action: 'fill', target: byLabel('Sort')!.ref, value: 'price: low to high' })).toBe('Set "Sort" to Price: low to high.');
    expect((document.querySelector('select') as HTMLSelectElement).value).toBe('low');
  });

  it('lists greyed-out controls as unavailable and does not press them', () => {
    expect(byLabel('Make offer')?.unavailable).toBe(true);
    expect(pageAction({ action: 'click', target: byLabel('Make offer')!.ref })).toMatch(/greyed out/);
  });

  it('scrolls by direction and rejects stale or bogus refs', () => {
    expect(pageAction({ action: 'scroll', target: 'down' })).toBe('Scrolled down.');
    expect(window.scrollBy).toHaveBeenCalled();
    expect(pageAction({ action: 'click', target: 'c999' })).toMatch(/look_at_page/);
    expect(pageAction({ action: 'click', target: '"],body,[x="' })).toMatch(/look_at_page/);
    expect(pageAction({ action: 'explode', target: sectionRef('Power') })).toMatch(/Unknown action/);
  });

  it('treats external and checkout links as buyer_only', () => {
    expect(isBuyerOnly(document.querySelector('a[href="https://example.com/x"]')!)).toBe(true);
    expect(isBuyerOnly(document.querySelector('a[href="/search"]')!)).toBe(false);
  });
});

describe('private pages', () => {
  const go = (path: string) => window.history.pushState({}, '', path);
  afterEach(() => go('/'));

  it.each(['/dashboard/messages', '/messages/abc', '/dashboard/account', '/checkout/abc', '/admin/invoices', '/dashboard/payments', '/build-studio/my-builds', '/auth'])(
    'exposes nothing and does nothing on %s',
    (path) => {
      const ref = sectionRef('Equipment');
      const zipRef = byLabel('ZIP code')!.ref;
      go(path);
      const map = scanPage();
      expect(map.sections).toEqual([]);
      expect(map.controls).toEqual([]);
      expect(JSON.stringify(map)).not.toContain('Taco');
      expect(pageOutline()).not.toContain('Taco');
      expect(readSection(document.querySelector('h2') as HTMLElement)).toBe('');
      expect(pageAction({ action: 'read', target: ref })).toMatch(/private/);
      expect(pageAction({ action: 'fill', target: zipRef, value: '85701' })).toMatch(/private/);
      expect((document.getElementById('zip') as HTMLInputElement).value).toBe('');
    },
  );

  it('blocks a dialog with password or card fields and anything marked private', () => {
    document.body.insertAdjacentHTML('beforeend', '<div role="dialog"><h2>Pay</h2><input autocomplete="cc-number" /></div>');
    expect(scanPage().sections).toEqual([]);
    document.body.innerHTML = html + '<div data-atlas-private>secret</div>';
    expect(scanPage().controls).toEqual([]);
  });

  it('keeps public listing and search pages working', () => {
    for (const path of ['/listing/abc', '/search?q=taco', '/food-trucks-for-sale/texas', '/hosting-guide']) {
      go(path);
      expect(scanPage().sections.length).toBeGreaterThan(0);
    }
  });
});
