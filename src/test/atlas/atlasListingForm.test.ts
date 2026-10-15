import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageAction, pickOption, scanPage } from '@/lib/atlas/atlasPage';

// The listing editor's controls as rendered (Radix radios, checkboxes, select trigger).
const html = `
  <main>
    <h2>The basics</h2>
    <label for="listing-model-year">Vehicle / trailer model year<button type="button" aria-label="More information about Model year"></button></label>
    <button type="button" role="combobox" aria-controls="year-list" aria-expanded="false" data-placeholder="" id="listing-model-year"><span>Select year</span></button>
    <section>
      <label>Condition<span>*</span><span>(required)</span></label>
      <div role="radiogroup">
        <label for="condition-new"><button type="button" role="radio" aria-checked="true" id="condition-new"></button>New</label>
        <label for="condition-good"><button type="button" role="radio" aria-checked="false" id="condition-good"></button>Good</label>
      </div>
    </section>
    <label><button type="button" role="checkbox" aria-checked="false" id="fryer"></button>Fryer</label>
    <label><button type="button" role="checkbox" aria-checked="false" id="offers"></button>Accept offers from buyers</label>
    <label for="desc">Description</label><textarea id="desc"></textarea>
    <h2>Review</h2>
    <label><button type="button" role="checkbox" aria-checked="false"></button>I own this equipment or have authority from the owner to list it</label>
    <label><button type="button" role="checkbox" aria-checked="false"></button>The information and photos in this listing are accurate</label>
    <button type="button">Publish Listing</button>
  </main>
`;

const find = (label: string) => scanPage().controls.find((c) => c.label.startsWith(label))!;

beforeEach(() => {
  document.body.innerHTML = html;
  Element.prototype.scrollIntoView = vi.fn();
  // Radix-like select: clicking the trigger renders the option list.
  const trigger = document.getElementById('listing-model-year')!;
  trigger.addEventListener('click', () => {
    trigger.setAttribute('aria-expanded', 'true');
    const list = document.createElement('div');
    list.id = 'year-list';
    list.setAttribute('role', 'listbox');
    for (const y of ['2021', '2020', '2019']) {
      const o = document.createElement('div');
      o.setAttribute('role', 'option');
      o.textContent = y;
      o.addEventListener('click', () => {
        trigger.querySelector('span')!.textContent = y;
        trigger.removeAttribute('data-placeholder');
        trigger.setAttribute('aria-expanded', 'false');
        list.remove();
      });
      list.appendChild(o);
    }
    document.body.appendChild(list);
  });
  // Radix radios/checkboxes flip aria-checked on click.
  document.querySelectorAll('[role="radio"], [role="checkbox"]').forEach((b) =>
    b.addEventListener('click', () => {
      if (b.getAttribute('role') === 'radio') b.closest('[role="radiogroup"]')!.querySelectorAll('[role="radio"]').forEach((r) => r.setAttribute('aria-checked', 'false'));
      b.setAttribute('aria-checked', b.getAttribute('role') === 'radio' ? 'true' : String(b.getAttribute('aria-checked') !== 'true'));
    }),
  );
});

describe('Atlas fills in the listing editor', () => {
  it('names radios by their group and label, and shows which is selected', () => {
    expect(find('Condition: New').label).toBe('Condition: New (selected)');
    const good = find('Condition: Good');
    expect(pageAction({ action: 'click', target: good.ref })).toMatch(/Pressed "Condition: Good"/);
    expect(find('Condition: Good').label).toMatch(/\(selected\)/);
  });

  it('names a dropdown by its label and picks an option', async () => {
    const year = find('Vehicle / trailer model year');
    expect(year.kind).toBe('select');
    expect(await pickOption({ target: year.ref, value: '2019' })).toBe('Set "Vehicle / trailer model year" to 2019.');
    expect(find('Vehicle / trailer model year').value).toBe('2019');
  });

  it('ticks equipment and listing settings, but never agreements', () => {
    expect(pageAction({ action: 'click', target: find('Fryer').ref })).toMatch(/Pressed/);
    expect(find('Accept offers').buyer_only).toBeUndefined();
    const own = find('I own this equipment');
    const accurate = find('The information and photos');
    expect(own.buyer_only && accurate.buyer_only).toBe(true);
    expect(pageAction({ action: 'click', target: own.ref })).toMatch(/has to press themselves/);
    expect(find('Publish Listing').buyer_only).toBe(true);
  });

  it('types a full description', () => {
    const text = 'Clean 2019 trailer. '.repeat(40);
    pageAction({ action: 'fill', target: find('Description').ref, value: text });
    expect((document.getElementById('desc') as HTMLTextAreaElement).value).toBe(text);
  });
});

describe('Atlas judges buttons by what they do, not words deep in the label', () => {
  it('lets Atlas open FAQs, calculators, filters and internal links', () => {
    document.body.innerHTML = `
      <main>
        <button type="button" aria-expanded="false">What happens after I submit?</button>
        <button type="button" aria-expanded="false">Can I cancel anytime?</button>
        <button type="button">Calculate payment</button>
        <a href="/legal/payments-terms">Payment terms</a>
        <a href="/how-purchasing-works">The Vendibook Guarantee Secure checkout and a protected, recorded handoff on every purchase</a>
        <label><input type="radio" name="cat" value="food_truck" />Food Truck</label>
        <button type="button" aria-pressed="false">Instant Book</button>
        <button type="button">Pay now</button>
        <button type="button">Proceed to checkout</button>
        <button type="button">Publish listing</button>
        <a href="/auth?redirect=/list">Get started</a>
        <button type="button">Ask the Seller</button>
      </main>`;
    const map = scanPage().controls;
    const only = (l: string) => map.find((c) => c.label.startsWith(l))?.buyer_only === true;
    for (const l of ['What happens after I submit?', 'Can I cancel anytime?', 'Calculate payment', 'Payment terms', 'The Vendibook Guarantee', 'Food Truck', 'Instant Book']) {
      expect(only(l), l).toBe(false);
    }
    for (const l of ['Pay now', 'Proceed to checkout', 'Publish listing', 'Get started', 'Ask the Seller']) {
      expect(only(l), l).toBe(true);
    }
  });
});
