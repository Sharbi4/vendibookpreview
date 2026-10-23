import { beforeEach, describe, expect, it, vi } from 'vitest';

const rows: Record<string, unknown>[] = [];
const single: { data: Record<string, unknown> | null } = { data: null };
const invoke = vi.fn();

// Chainable query stub: every filter returns itself; awaiting yields rows.
function query() {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'is', 'not', 'or', 'lte', 'gte', 'order', 'in']) q[m] = () => q;
  q.then = (res: (v: unknown) => unknown) => res({ data: rows.map(l => ({state:'TX', ...l})), error: null });
  q.limit = (limit:number) => Promise.resolve({ data: rows.slice(0,limit).map(l => ({state:'TX', ...l})), error: null });
  q.range = (from:number,to:number) => Promise.resolve({ data: rows.slice(from,to+1).map(l => ({state:'TX', ...l})), error: null });
  q.maybeSingle = () => Promise.resolve({ data: single.data, error: null });
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => query() } }));
vi.mock('@/lib/edge/invokeFunction', () => ({ invokeEdge: (...a: unknown[]) => invoke(...a) }));

import { createAtlasTools, isStillOffered, listingPriceText, liveListingIds, resolveListingRef, safeKeywords, toCard } from '@/lib/atlas/atlasTools';
import { buildResumeBriefing } from '@/lib/atlas/atlasMemory';
import { ATLAS_SYSTEM_PROMPT, ATLAS_TOOL_DEFINITIONS } from '@/lib/atlas/atlasConfig';

const ID = '2b8a5106-53e8-4999-96a1-7fc4890ff6b7';
const deps = () => ({ navigate: vi.fn(), showResults: vi.fn(), currentListingId: () => null });

beforeEach(() => {
  rows.length = 0;
  single.data = null;
  invoke.mockReset();
});

describe('Atlas helpers', () => {
  it('keeps search keywords safe for PostgREST filters', () => {
    expect(safeKeywords('Tacos, pizza-oven; DROP')).toEqual(['tacos', 'pizza', 'oven', 'drop']);
    expect(safeKeywords('a,b')).toEqual([]);
  });

  it('formats sale and rental prices', () => {
    expect(listingPriceText({ mode: 'sale', price_sale: '39000.00' })).toBe('$39,000');
    expect(listingPriceText({ mode: 'rent', price_daily: 350 })).toBe('$350/day');
    expect(toCard({ id: ID, title: ' Trailer ', mode: 'sale', price_sale: 1, city: 'Tampa', state: 'FL', image_urls: ['a.jpg'] }))
      .toMatchObject({ title: 'Trailer', location: 'Tampa, FL', photo: 'a.jpg' });
  });
});

describe('Atlas tools', () => {
  it('opens the buyer-owned follow-up form without sending a message', async () => {
    const open = vi.fn().mockReturnValue(true);
    const tools = createAtlasTools({ ...deps(), openBuyerFollowUp: open });
    expect(await tools.offer_buyer_follow_up({ topic: 'Offer help', summary: 'Buyer is considering a local trailer.' })).toContain('Nothing is saved');
    expect(open).toHaveBeenCalledOnce();
    expect(invoke).not.toHaveBeenCalled();
    expect(await tools.offer_buyer_follow_up({ declined: true })).toContain('Suppress the end-of-call prompt');
    expect(open).toHaveBeenLastCalledWith({ topic: '', summary: '', declined: true });
    open.mockReturnValue(false);
    expect(await tools.offer_buyer_follow_up({})).toContain('Do not repeat');
  });
  it('search shows result cards and returns compact listings', async () => {
    rows.push({ id: ID, title: 'Ice Cream Trailer', mode: 'sale', price_sale: 39000, city: 'North Port', state: 'FL', description: 'x'.repeat(400) });
    const d = deps();
    const out = await createAtlasTools(d).search_listings({state:'FL', keywords: 'ice cream', mode: 'sale', max_price: 50000 });
    expect(d.showResults).toHaveBeenCalledWith([expect.objectContaining({ id: ID, priceText: '$39,000' })]);
    const parsed = JSON.parse(out);
    expect(parsed.results[0].about.length).toBeLessThanOrEqual(221);
  });

  it('show_listing opens the page; unavailable listings never navigate', async () => {
    const d = deps();
    expect(await createAtlasTools(d).show_listing({ listing_id: ID })).toMatch(/no longer available/);
    expect(d.navigate).not.toHaveBeenCalled();
    single.data = { id: ID, title: 'T', mode: 'sale', price_sale: 1 };
    await createAtlasTools(d).show_listing({ listing_id: ID });
    expect(d.navigate).toHaveBeenCalledWith(`/listing/${ID}`);
  });

  it('delivery quote gives totals only, never the rate or the math', async () => {
    single.data = {
      id: ID, mode: 'sale', city: 'North Port', state: 'FL', latitude: 27.04, longitude: -82.2,
      vendibook_freight_enabled: true, freight_payer: 'buyer', fulfillment_type: 'delivery',
      delivery_fee: 3, delivery_fee_type: 'per_mile', delivery_radius_miles: 5000,
    };
    invoke.mockImplementation(async (name: string) =>
      name === 'geocode-location'
        ? { data: { results: [{ center: [-95.36, 29.76], city: 'Houston', state: 'TX' }] }, error: null }
        : { data: { estimate: { total_cost: 4321.5, estimated_transit_days: { min: 5, max: 8 } } }, error: null });
    const out = await createAtlasTools(deps()).get_delivery_quote({ listing_id: ID, zip: '77002' });
    expect(out).toContain('$4,322');
    expect(out).not.toMatch(/mile|\/mi\b|per_mile|fuel|handling|rate/i);
  });

  it('request to buy sends sale listings to checkout and rentals to the listing', async () => {
    const d = deps();
    single.data = { id: ID, mode: 'sale' };
    await createAtlasTools(d).start_request_to_buy({ listing_id: ID });
    expect(d.navigate).toHaveBeenLastCalledWith(`/checkout/${ID}`);
    single.data = { id: ID, mode: 'rent' };
    await createAtlasTools(d).start_request_to_buy({ listing_id: ID });
    expect(d.navigate).toHaveBeenLastCalledWith(`/listing/${ID}`);
  });

  it('open_page only opens known pages', async () => {
    const d = deps();
    expect(await createAtlasTools(d).open_page({ page: 'admin' })).toMatch(/not available/);
    await createAtlasTools(d).open_page({ page: 'search', search_text: 'taco truck' });
    expect(d.navigate).toHaveBeenCalledWith('/search?q=taco%20truck');
  });
});

describe('Atlas config', () => {
  it('registers a definition for every implemented tool', () => {
    const impl = Object.keys(createAtlasTools(deps())).sort();
    expect(ATLAS_TOOL_DEFINITIONS.map((t) => t.name).sort()).toEqual(impl);
  });

  it('prompt keeps the legal and pricing guardrails', () => {
    expect(ATLAS_SYSTEM_PROMPT).toMatch(/Never explain how a shipping or delivery price is calculated/);
    expect(ATLAS_SYSTEM_PROMPT).toMatch(/Never say Vendibook holds, escrows/);
    expect(ATLAS_SYSTEM_PROMPT).not.toMatch(/stripe/i);
  });
});

describe('Atlas search relevance', () => {
  it('checks beyond 24 national rows for a local generic kitchen with taco equipment', async()=>{
    for(let i=0;i<30;i++) rows.push({id:`other-${i}`,state:'CA',title:'Taco truck',description:'griddle',mode:'sale'});
    rows.push({id:ID,state:'Arizona',city:'Tucson',title:'Mobile kitchen',amenities:['flat_top_griddle'],mode:'sale'});
    const result=JSON.parse(await createAtlasTools(deps()).search_listings({state:'AZ',city:'Tucson',food_concept:'tacos',mode:'sale'}));
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({id:ID,fit_status:'potential_equipment_match'});
    expect(result.results[0].listed_cooking_equipment).toContain('griddle');
    expect(result.search_scope).toBe('requested_state');
  });
  it('keeps undocumented local kitchens as unconfirmed instead of pitching freight',async()=>{
    rows.push({id:ID,state:'AZ',title:'Mobile kitchen',mode:'sale'});
    const result=JSON.parse(await createAtlasTools(deps()).search_listings({state:'AZ',food_concept:'tacos'}));
    expect(result.results[0].fit_status).toBe('equipment_unconfirmed');
    expect(result.note).toMatch(/Do not immediately pitch nationwide shipping/);
  });
  it('does not invent a buyer location or start a national search when it is missing',async()=>{
    const result=JSON.parse(await createAtlasTools(deps()).search_listings({food_concept:'tacos'}));
    expect(result.search_status).toBe('location_needed');expect(result.results).toEqual([]);
  });
  it('ranks the full phrase first and drops substring-only hits', async () => {
    const { keywordScore } = await import('@/lib/atlas/atlasTools');
    const words = ['ice', 'cream'];
    expect(keywordScore({ title: 'Fully Custom Ice Cream Trailer' }, words, 'ice cream')).toBeGreaterThan(
      keywordScore({ title: 'Coffee truck', description: 'great service and price, cream colored' }, words, 'ice cream'),
    );
    expect(keywordScore({ title: 'Coffee truck', description: 'great service and price' }, words, 'ice cream')).toBe(0);
  });
});

describe('Atlas negotiation and earnings', () => {
  it('drafts an offer below asking and opens it for the buyer to send', async () => {
    const openOffer = vi.fn();
    const d = { ...deps(), openOffer };
    single.data = { id: ID, host_id: 'h1', title: 'T', mode: 'sale', price_sale: 39000, accepts_offers: true };
    const out = await createAtlasTools(d).draft_offer({ listing_id: ID, amount: 35000, note: 'Cash ready' });
    expect(openOffer).toHaveBeenCalledWith(expect.objectContaining({ amount: 35000, askingPrice: 39000, hostId: 'h1' }));
    expect(out).toMatch(/They review it and tap Send/);
    expect(await createAtlasTools(d).draft_offer({ listing_id: ID, amount: 40000 })).toMatch(/at or above/);
    single.data = { ...single.data, accepts_offers: false };
    expect(await createAtlasTools(d).draft_offer({ listing_id: ID, amount: 30000 })).toMatch(/not taking offers/);
    expect(openOffer).toHaveBeenCalledTimes(1);
  });

  it('drafts a seller message without sending it', async () => {
    const openMessage = vi.fn();
    single.data = { id: ID, host_id: 'h1', title: 'T', mode: 'sale' };
    const out = await createAtlasTools({ ...deps(), openMessage }).draft_seller_message({ listing_id: ID, message: 'Is the price flexible?' });
    expect(openMessage).toHaveBeenCalledWith(expect.objectContaining({ message: 'Is the price flexible?' }));
    expect(out).toMatch(/nothing is sent yet/);
  });

  it('earnings math uses only the buyer\'s numbers and says it is not a promise', async () => {
    const tools = createAtlasTools(deps());
    expect(await tools.estimate_earnings({ avg_ticket: 12 })).toMatch(/Ask the buyer/);
    const out = JSON.parse(await tools.estimate_earnings({ avg_ticket: 12, customers_per_day: 100, days_per_week: 5, food_cost_percent: 30, equipment_price: 39000 }));
    expect(out.monthly_sales).toBe('$25,980');
    expect(out.monthly_after_food_cost).toBe('$18,186');
    expect(out.months_of_after_food_cost_to_equal_price).toBe(3);
    expect(out.say_this).toMatch(/not a prediction or a promise/);
  });
});

describe('Atlas call memory', () => {
  it('resumes within 30 minutes and expires after', async () => {
    const m = await import('@/lib/atlas/atlasMemory');
    m.clearAtlasMemory();
    m.saveAtlasMemory({ turns: [{ from: 'you', text: 'tacos' }], cards: [], lastPath: '/search' }, 1_000);
    expect(m.loadAtlasMemory(1_000 + 29 * 60_000)?.turns).toHaveLength(1);
    expect(m.loadAtlasMemory(1_000 + 31 * 60_000)).toBeNull();
    expect(m.loadAtlasMemory(1_000)).toBeNull(); // expired entry was cleared
  });

  it('briefs Atlas to continue, not restart', async () => {
    const { buildResumeBriefing } = await import('@/lib/atlas/atlasMemory');
    const text = buildResumeBriefing({ updatedAt: 0, turns: [{ from: 'atlas', text: 'Hi' }], cards: [], lastPath: '/listing/x' });
    expect(text).toMatch(/Do not reintroduce yourself/);
    expect(text).toMatch(/Atlas: Hi/);
  });
});

describe('Atlas pricing', () => {
  it('quotes the real fees and live upgrade prices, never the concierge service', async () => {
    rows.push(
      { slug: 'vendibook_pro', name: 'Vendibook Pro', price_cents: 7900, is_active: true },
      { slug: 'boost-featured-30', name: 'Featured Boost — 30 days', price_cents: 4900, is_active: true },
    );
    const out = JSON.parse(await createAtlasTools(deps()).get_pricing());
    expect(out.equipment_sales).toMatch(/8\.7% commission/);
    expect(out.equipment_sales).toMatch(/Buyers pay no Vendibook platform fee/);
    expect(out.rentals).toMatch(/12\.9% service fee/);
    expect(out.optional_upgrades).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Vendibook Pro', price: '$79/month' })]));
    const { ATLAS_PRODUCTS } = await import('@/lib/atlas/atlasTools');
    expect(Object.keys(ATLAS_PRODUCTS)).not.toContain('listing_concierge');
  });
});

describe('Atlas listing references (voice-safe ids)', () => {
  const A = '2b8a5106-53e8-4999-96a1-7fc4890ff6b7';
  const B = 'f4fbb682-17db-4a3d-b081-e2631ae063ff';
  const C = 'a7594e1f-fbe2-4e5a-abad-b5fe2069c00b';
  const recent = [
    { id: A, title: 'Fully Custom Ice Cream Trailer' },
    { id: B, title: '2020 The Food Trailer' },
    { id: C, title: 'Food Trailer for sale in Austin, TX' },
  ];

  it('takes exact ids, result numbers and ordinals', () => {
    expect(resolveListingRef(B, recent, null)).toBe(B);
    expect(resolveListingRef('1', recent, null)).toBe(A);
    expect(resolveListingRef('#3', recent, null)).toBe(C);
    expect(resolveListingRef('second one', recent, null)).toBe(B);
    expect(resolveListingRef('last', recent, null)).toBe(C);
    expect(resolveListingRef('7', recent, null)).toBeNull();
    expect(resolveListingRef('constructor', recent, null)).toBeNull();
  });

  it('uses the listing on screen for "this"/"current" or a missing id', () => {
    expect(resolveListingRef('current', recent, C)).toBe(C);
    expect(resolveListingRef('this one', recent, C)).toBe(C);
    expect(resolveListingRef(undefined, recent, B)).toBe(B);
  });

  it('recovers ids the voice model garbled or truncated', () => {
    expect(resolveListingRef('f4fbb682-17db-4a3d-b081-e2631ae063f', recent, null)).toBe(B); // dropped a char
    expect(resolveListingRef('f4fbb682-17db-4a3d-b018-e2631ae063ff', recent, null)).toBe(B); // swapped chars
    expect(resolveListingRef('a7594e1f', recent, null)).toBe(C); // first 8 only
    expect(resolveListingRef('2b8a5106 53e8 4999 96a1 7fc4890ff6b7', recent, null)).toBe(A); // spoken with spaces
  });

  it('matches a unique title, and gives up rather than guess', () => {
    expect(resolveListingRef('ice cream trailer', recent, null)).toBe(A);
    expect(resolveListingRef('food trailer', recent, null)).toBeNull(); // 3 titles match
    expect(resolveListingRef('pizza truck', recent, null)).toBeNull();
  });

  it('opens result 1 after a search, and never calls a mistyped id "unavailable"', async () => {
    rows.push({ id: A, title: 'Fully Custom Ice Cream Trailer', mode: 'sale', price_sale: 39000 }, { id: B, title: '2020 The Food Trailer', mode: 'sale', price_sale: 25000 });
    const d = deps();
    const tools = createAtlasTools(d);
    await tools.search_listings({state:'TX',  mode: 'sale' });
    single.data = { id: A, title: 'Fully Custom Ice Cream Trailer', mode: 'sale', price_sale: 39000 };
    await tools.show_listing({ listing_id: '1' });
    expect(d.navigate).toHaveBeenLastCalledWith(`/listing/${A}`);

    d.navigate.mockClear();
    const out = await tools.show_listing({ listing_id: 'zzz-not-an-id' });
    expect(out).toMatch(/Not sure which listing/);
    expect(out).not.toMatch(/no longer available/);
    expect(d.navigate).not.toHaveBeenCalled();
  });

  it('says "taken down" only when the listing really is not public', async () => {
    single.data = null;
    const out = await createAtlasTools(deps()).show_listing({ listing_id: A });
    expect(out).toMatch(/taken down/);
  });

  it('numbers search results for the agent', async () => {
    rows.push({ id: A, title: 'X', mode: 'sale', price_sale: 1 });
    const out = JSON.parse(await createAtlasTools(deps()).search_listings({state:'TX', }));
    expect(out.results[0].result).toBe(1);
  });

  it('keeps out-of-state shipping inventory out of an unexpanded local search', async () => {
    rows.push(
      { id: A, title: 'Ships', mode: 'sale', price_sale: 30000, state: 'FL', vendibook_freight_enabled: true, freight_payer: 'buyer' },
      { id: B, title: 'Local only', mode: 'sale', price_sale: 25000, state: 'GA', vendibook_freight_enabled: false },
    );
    const out = JSON.parse(await createAtlasTools(deps()).search_listings({ state: 'TX' }));
    expect(out.in_your_state).toBe(0);
    expect(out.results).toEqual([]);
    expect(out.note).toMatch(/Only expand nationwide after the buyer agrees/);
  });

  it('asks for clarification before expanding an empty local search', async () => {
    expect(await createAtlasTools(deps()).search_listings({ state: 'TX' })).toMatch(/Only expand nationwide after the buyer agrees/);
  });
});

describe('Atlas sending a seller message for the buyer', () => {
  const listing = { id: ID, host_id: 'host-1', title: 'Ice Cream Trailer', mode: 'sale', price_sale: 39000 };
  const setup = (userId: string | null = 'buyer-1') => {
    const send = vi.fn().mockResolvedValue('conv-1');
    const d = { ...deps(), openMessage: vi.fn(), currentUserId: () => userId, sendSellerMessage: send };
    single.data = listing;
    return { d, send, tools: createAtlasTools(d) };
  };

  it('never sends without the buyer saying yes, or without a draft on screen', async () => {
    const { tools, send } = setup();
    expect(await tools.send_seller_message({ listing_id: ID, buyer_approved: false })).toMatch(/Not sent. Ask the buyer/);
    expect(await tools.send_seller_message({ listing_id: ID, buyer_approved: true })).toMatch(/no current draft/);
    expect(send).not.toHaveBeenCalled();
  });

  it('sends exactly the draft that was shown, once approved', async () => {
    const { tools, send, d } = setup();
    const shown = await tools.draft_seller_message({ listing_id: ID, message: 'Hi! Would you take $35,000? I can pick it up this week.' });
    expect(shown).toMatch(/Want me to send that for you/);
    expect(d.openMessage).toHaveBeenCalled();
    const out = await tools.send_seller_message({ listing_id: ID, buyer_approved: true, message: 'something else entirely' });
    expect(out).toMatch(/Sent to the seller/);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ listingId: ID, hostId: 'host-1', message: 'Hi! Would you take $35,000? I can pick it up this week.' }));
    // The draft is used up: a second "yes" can't resend it.
    expect(await tools.send_seller_message({ listing_id: ID, buyer_approved: true })).toMatch(/no current draft/);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('only signed-in buyers, never their own listing', async () => {
    const guest = setup(null);
    expect(await guest.tools.draft_seller_message({ listing_id: ID, message: 'Hi' })).toMatch(/not signed in/);
    expect(await guest.tools.send_seller_message({ listing_id: ID, buyer_approved: true })).toMatch(/need to be signed in/);
    expect(guest.send).not.toHaveBeenCalled();

    const owner = setup('host-1');
    await owner.tools.draft_seller_message({ listing_id: ID, message: 'Hi' });
    expect(await owner.tools.send_seller_message({ listing_id: ID, buyer_approved: true })).toMatch(/own listing/);
    expect(owner.send).not.toHaveBeenCalled();
  });

  it('drafts expire after 15 minutes', async () => {
    const { tools, send } = setup();
    const now = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now);
    await tools.draft_seller_message({ listing_id: ID, message: 'Hi' });
    spy.mockReturnValue(now + 16 * 60 * 1000);
    expect(await tools.send_seller_message({ listing_id: ID, buyer_approved: true })).toMatch(/no current draft/);
    expect(send).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('explains the phone/ID check when Vendibook blocks the send', async () => {
    const { tools, send } = setup();
    send.mockRejectedValueOnce(new Error('Please verify your phone number to message sellers'));
    await tools.draft_seller_message({ listing_id: ID, message: 'Hi' });
    expect(await tools.send_seller_message({ listing_id: ID, buyer_approved: true })).toMatch(/verify their phone and ID/);
  });
});

describe('Atlas policy knowledge (owner master guide v5.3)', () => {
  it('answers policy questions from the guide FAQ bank', async () => {
    const tools = createAtlasTools(deps());
    const escrow = JSON.parse(await tools.get_faq({ question: 'Does Vendibook hold my money in escrow?' }));
    expect(escrow.answers[0].question).toBe('Does Vendibook hold payments in escrow?');
    const fee = JSON.parse(await tools.get_faq({ question: "what's the fee for selling online" }));
    expect(fee.answers[0].answer).toMatch(/8\.7%/);
    const rental = JSON.parse(await tools.get_faq({ question: 'rental fees' }));
    expect(rental.answers.map((a: { answer: string }) => a.answer).join(' ')).toMatch(/12\.9%/);
  });

  it('has no pay in person or cash option', async () => {
    const out = JSON.parse(await createAtlasTools(deps()).get_faq({ question: 'Can I pay the seller in person?' }));
    expect(out.answers[0].answer).toMatch(/^No\. Vendibook does not offer Pay in Person/);
    const { GUIDE_FAQ } = await import('@/lib/atlas/atlasGuideFaq');
    expect(GUIDE_FAQ.some((e) => /\$0 .*commission|in person.*free/i.test(e.answer))).toBe(false);
    expect(GUIDE_FAQ).toHaveLength(87);
  });

  it('knows account closure, FLIP insurance and financing from v5.3', async () => {
    const tools = createAtlasTools(deps());
    const close = JSON.parse(await tools.get_faq({ question: 'How do I close my account?' }));
    expect(close.answers[0].answer).toMatch(/Dashboard → Account/);
    const flip = JSON.parse(await tools.get_faq({ question: 'Is insurance included with my rental?' }));
    expect(flip.answers.map((a: { answer: string }) => a.answer).join(' ')).toMatch(/not automatically included/);
    const lender = JSON.parse(await tools.get_faq({ question: 'Do I pay the seller directly after my lender approves?' }));
    expect(lender.answers[0].answer).toMatch(/^No direct buyer-to-seller settlement/);
  });

  it('applies owner overrides: 24-hour payouts after confirmed completion, rentals via Square, mission', async () => {
    const tools = createAtlasTools(deps());
    const paid = JSON.parse(await tools.get_faq({ question: 'When do I get paid?' }));
    expect(paid.answers[0].answer).toMatch(/within 24 hours after the sale or rental is complete and confirmed/);
    const card = JSON.parse(await tools.get_faq({ question: 'Can I pay with a card for a rental?' }));
    expect(card.answers.map((a: { answer: string }) => a.answer).join(' ')).toMatch(/Square/);
    const about = JSON.parse(await tools.get_faq({ question: 'What is Vendibook?' }));
    expect(about.answers[0].answer).toMatch(/support the food truck community/);
    expect(ATLAS_SYSTEM_PROMPT).toMatch(/here to support the food truck community/);
  });

  it('says it does not know instead of guessing', async () => {
    expect(await createAtlasTools(deps()).get_faq({ question: 'zebra quantum pickles' })).toMatch(/do not guess/);
  });

  it('pricing has no pay-in-person option and keeps the Pro rental host rate', async () => {
    const out = JSON.parse(await createAtlasTools(deps()).get_pricing());
    expect(out.pay_in_person).toMatch(/no longer supports/);
    expect(out.equipment_sales).toMatch(/8\.7%/);
    expect(out.rentals).toMatch(/10\.9%/);
  });
});

describe('Atlas follow-up with a person (owner 2026-10-15)', () => {
  it('needs a name and a way to reach a guest before calling the server', async () => {
    const tools = createAtlasTools(deps());
    expect(await tools.request_follow_up({ topic: 'x', summary: 'y' })).toMatch(/name first/);
    expect(await tools.request_follow_up({ name: 'Ana', topic: 'x', summary: 'y' })).toMatch(/phone number or email/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('sets up the follow-up and reads back the time and reference', async () => {
    invoke.mockResolvedValueOnce({ data: { reference_code: 'VB-AB12CD34', follow_up_by: 'Thursday 12:00 PM ET', team_open_now: true }, error: null });
    const out = JSON.parse(
      await createAtlasTools({ ...deps(), currentListingId: () => ID }).request_follow_up({
        name: 'Ana', phone: '(520) 555-0100', topic: 'financing', summary: 'Wants financing on the trailer.',
      }),
    );
    expect(invoke).toHaveBeenCalledWith('atlas-follow-up', { body: expect.objectContaining({ name: 'Ana', listing_id: ID }) });
    expect(out.say).toMatch(/by Thursday 12:00 PM ET.*VB-AB12CD34/);
  });

  it('signed-in members can skip phone and email', async () => {
    invoke.mockResolvedValueOnce({ data: { reference_code: 'VB-1', follow_up_by: 'Monday 10:00 AM ET', team_open_now: false }, error: null });
    const out = JSON.parse(await createAtlasTools({ ...deps(), currentUserId: () => 'u1' }).request_follow_up({ name: 'Ana', topic: 't', summary: 's' }));
    expect(out.say).toMatch(/offline right now/);
  });

  it('is registered for ElevenLabs and in the prompt', () => {
    expect(ATLAS_TOOL_DEFINITIONS.map((t) => t.name)).toContain('request_follow_up');
    expect(ATLAS_SYSTEM_PROMPT).toMatch(/within 2 hours.*8 AM to 8 PM Eastern/);
  });
});

describe('Atlas never offers an old, archived or test listing (owner 2026-10-15)', () => {
  const ID2 = '9b8a5106-53e8-4999-96a1-7fc4890ff6b7';
  it('skips rentals whose availability has ended and test listings', () => {
    expect(isStillOffered({ mode: 'rent', title: 'Taco trailer', available_to: '2026-10-01' }, '2026-10-15')).toBe(false);
    expect(isStillOffered({ mode: 'rent', title: 'Taco trailer', available_to: '2026-12-01' }, '2026-10-15')).toBe(true);
    expect(isStillOffered({ mode: 'sale', title: 'Sandbox PayPal certification listing' })).toBe(false);
    expect(isStillOffered({ mode: 'sale', title: '2020 Food Concession Trailer' })).toBe(true);
  });

  it('search drops ended rentals before showing results', async () => {
    rows.push(
      { id: ID, title: 'Old rental', mode: 'rent', price_daily: 100, available_to: '2020-01-01' },
      { id: ID2, title: 'Live rental', mode: 'rent', price_daily: 120 },
    );
    const d = deps();
    const out = JSON.parse(await createAtlasTools(d).search_listings({state:'TX',  mode: 'rent' }));
    expect(out.results.map((r: { id: string }) => r.id)).toEqual([ID2]);
  });

  it('opening an archived or ended listing says it is no longer available', async () => {
    single.data = null; // archived/paused/deleted listings fail the public filter
    expect(await createAtlasTools(deps()).show_listing({ listing_id: ID })).toMatch(/no longer available/);
    single.data = { id: ID, title: 'Ended rental', mode: 'rent', price_daily: 1, available_to: '2020-01-01' };
    expect(await createAtlasTools(deps()).show_listing({ listing_id: ID })).toMatch(/no longer available/);
  });

  it('re-checks remembered listings and tells Atlas which are gone', async () => {
    rows.push({ id: ID2, title: 'Live one', mode: 'sale' });
    const live = await liveListingIds([ID, ID2]);
    expect([...live]).toEqual([ID2]);
    const briefing = buildResumeBriefing({ turns: [], cards: [], lastPath: '/search', updatedAt: 0 } as never, ['Old BBQ trailer']);
    expect(briefing).toMatch(/No longer available.*Old BBQ trailer.*Never offer or open/);
  });
});
