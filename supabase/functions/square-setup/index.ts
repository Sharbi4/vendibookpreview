import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { squareConfig, squareRequest } from '../_shared/square.ts';
import { validateSquarePlan } from '../_shared/squarePlan.ts';

// Operator-only provisioning. Never creates customers, cards, subscriptions or charges.
Deno.serve(async req => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const operatorToken = Deno.env.get('SQUARE_SETUP_TOKEN');
  const presented = req.headers.get('X-Operator-Token') || '';
  const authorized =
    (Boolean(serviceKey) && req.headers.get('Authorization') === `Bearer ${serviceKey}`) ||
    (Boolean(operatorToken) && presented === operatorToken);
  if (!authorized) return new Response('Unauthorized', { status: 401 });
  if (req.method !== 'POST') return new Response('POST required', { status: 405 });
  try {
    const config = squareConfig();
    const { apply = false } = await req.json();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
    const check = (r: any) => { if (r.error) throw new Error('Billing database operation failed'); return r.data; };
    const { location } = await squareRequest('/v2/locations/' + encodeURIComponent(config.locationId));
    if (location.status !== 'ACTIVE' || location.currency !== 'USD') throw new Error('Square location must be active and use USD');
    const products = check(await admin.from('monetization_products').select('id,slug,name,price_cents,currency').eq('is_active', true).eq('billing_type', 'recurring'));
    const results = [];
    for (const p of products) {
      // Only provision the verified active catalog interval; never invent annual discounts.
      const sources = check(await admin.from('monetization_product_plans').select('billing_interval,price_cents,currency,trial_days').eq('product_id', p.id).eq('is_active', true).eq('environment', 'live'));
      if (!sources.length) throw new Error(`No approved billing intervals for ${p.slug}`);
      const unique = new Map<string, any>();
      for (const source of sources) {
        if (source.trial_days || !['monthly','quarterly','annual'].includes(source.billing_interval) || !Number.isSafeInteger(source.price_cents) || source.price_cents <= 0) throw new Error(`Unsupported billing terms for ${p.slug}`);
        const plan = { product_id: p.id, environment: config.environment, billing_interval: source.billing_interval, price_cents: source.price_cents, currency: String(source.currency).toUpperCase() };
        if (plan.currency !== 'USD') throw new Error('Only USD billing is supported');
        const previous = unique.get(plan.billing_interval);
        if (previous && JSON.stringify(previous) !== JSON.stringify(plan)) throw new Error(`Conflicting prices for ${p.slug}`);
        unique.set(plan.billing_interval, plan);
      }
      for (const plan of unique.values()) {
        const existing = check(await admin.from('square_billing_plans').select('*').eq('product_id', p.id).eq('environment', config.environment).eq('billing_interval', plan.billing_interval).maybeSingle());
        if (existing) {
          const { object } = await squareRequest('/v2/catalog/object/' + encodeURIComponent(existing.variation_id));
          validateSquarePlan(object, plan);
          if (existing.price_cents !== plan.price_cents || existing.currency !== plan.currency) throw new Error('Stored Square plan mapping differs from approved price');
          results.push({ slug: p.slug, ...plan, variation_id: existing.variation_id, status: 'verified' });
          continue;
        }
        if (!apply) { results.push({ slug: p.slug, ...plan, status: 'needs_creation' }); continue; }
        const fingerprint = JSON.stringify({ ...plan, name: p.name });
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprint));
        const key = Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, '0')).join('');
        const result = await squareRequest('/v2/catalog/batch-upsert', {
          idempotency_key: key,
          batches: [{ objects: [
            { type: 'SUBSCRIPTION_PLAN', id: '#plan', present_at_all_locations: true, subscription_plan_data: { name: `${p.name} (${plan.billing_interval})`, all_items: true } },
            { type: 'SUBSCRIPTION_PLAN_VARIATION', id: '#variation', present_at_all_locations: true, subscription_plan_variation_data: {
              name: `${p.name} · ${plan.billing_interval}`, subscription_plan_id: '#plan',
              phases: [{ ordinal: 0, cadence: { monthly: 'MONTHLY', quarterly: 'QUARTERLY', annual: 'ANNUAL' }[plan.billing_interval], pricing: { type: 'STATIC', price: { amount: plan.price_cents, currency: plan.currency } } }],
            } },
          ] }],
        });
        const variationId = result.id_mappings?.find((m: any) => m.client_object_id === '#variation')?.object_id;
        if (!variationId) throw new Error('Square did not return a plan variation ID');
        const { object } = await squareRequest('/v2/catalog/object/' + encodeURIComponent(variationId));
        validateSquarePlan(object, plan);
        // Ignore a concurrent identical insert; never replace a mapped price silently.
        check(await admin.from('square_billing_plans').upsert({ ...plan, variation_id: variationId }, { onConflict: 'product_id,environment,billing_interval', ignoreDuplicates: true }));
        const mapped = check(await admin.from('square_billing_plans').select('*').eq('product_id', p.id).eq('environment', config.environment).eq('billing_interval', plan.billing_interval).single());
        if (mapped.variation_id !== variationId) throw new Error('Concurrent plan setup needs review');
        results.push({ slug: p.slug, ...plan, variation_id: variationId, status: 'created' });
      }
    }
    return Response.json({ environment: config.environment, location_id: config.locationId, billing_enabled: config.enabled, plans: results });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Square setup failed' }, { status: 400 });
  }
});
