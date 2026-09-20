import { createHash } from 'node:crypto';
import { appendFileSync } from 'node:fs';

// Approved catalog snapshot, verified against Vendibook's database on 2026-09-20.
const plans = [
  { product_id: '4c93f657-0bf4-4a20-8652-348da8f70df0', slug: 'permit_path_plus_monthly', name: 'PermitPath Plus', price_cents: 799 },
  { product_id: 'c2d6a419-4131-460e-b85d-4c5a8b431d80', slug: 'vendibook_pro', name: 'Vendibook Pro', price_cents: 7900 },
];
const token = process.env.SQUARE_ACCESS_TOKEN;
if (!token) throw new Error('Save SQUARE_ACCESS_TOKEN in GitHub Actions repository secrets.');
const locationId = 'LQKF8A6PRKSRM';
async function request(path, body) {
  const response = await fetch('https://connect.squareup.com' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Square-Version': '2026-09-16', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000),
  });
  const data = await response.json();
  if (!response.ok || data.errors?.length) throw new Error(`Square request failed: ${data.errors?.[0]?.code || response.status}`);
  return data;
}
const { location } = await request('/v2/locations/' + locationId);
if (location?.id !== locationId || location.status !== 'ACTIVE' || location.currency !== 'USD') throw new Error('Unexpected Square location or currency');
const objects = [];
let cursor;
do {
  const page = await request('/v2/catalog/list?types=SUBSCRIPTION_PLAN_VARIATION' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
  objects.push(...(page.objects || [])); cursor = page.cursor;
} while (cursor);
const mappings = [];
for (const p of plans) {
  const name = `${p.name} · monthly`;
  const valid = o => {
    const phases = o?.subscription_plan_variation_data?.phases;
    return o?.type === 'SUBSCRIPTION_PLAN_VARIATION' && !o.is_deleted && o.present_at_all_locations !== false &&
      phases?.length === 1 && phases[0].periods == null && phases[0].cadence === 'MONTHLY' &&
      phases[0].pricing?.type === 'STATIC' && phases[0].pricing?.price?.amount === p.price_cents && phases[0].pricing?.price?.currency === 'USD';
  };
  const matches = objects.filter(o => o.subscription_plan_variation_data?.name === name);
  if (matches.length > 1 || (matches.length && !valid(matches[0]))) throw new Error(`Existing Square plan needs review: ${p.slug}`);
  let variationId = matches[0]?.id;
  if (!variationId) {
    const key = createHash('sha256').update(JSON.stringify({ product_id: p.product_id, environment: 'production', billing_interval: 'monthly', price_cents: p.price_cents, currency: 'USD', name: p.name })).digest('hex');
    const result = await request('/v2/catalog/batch-upsert', { idempotency_key: key, batches: [{ objects: [
      { type: 'SUBSCRIPTION_PLAN', id: '#plan', present_at_all_locations: true, subscription_plan_data: { name: `${p.name} (monthly)`, all_items: true } },
      { type: 'SUBSCRIPTION_PLAN_VARIATION', id: '#variation', present_at_all_locations: true, subscription_plan_variation_data: { name, subscription_plan_id: '#plan', phases: [{ ordinal: 0, cadence: 'MONTHLY', pricing: { type: 'STATIC', price: { amount: p.price_cents, currency: 'USD' } } }] } },
    ] }] });
    variationId = result.id_mappings?.find(m => m.client_object_id === '#variation')?.object_id;
  }
  if (!variationId) throw new Error('No Square variation ID returned');
  const { object } = await request('/v2/catalog/object/' + encodeURIComponent(variationId));
  if (!valid(object)) throw new Error(`Square verification failed: ${p.slug}`);
  mappings.push({ product_id: p.product_id, environment: 'production', billing_interval: 'monthly', variation_id: variationId, price_cents: p.price_cents, currency: 'USD' });
}
console.log('SQUARE_PLAN_MAPPINGS=' + JSON.stringify(mappings));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY,
  '# Square catalog verified\n\n' + mappings.map((m, i) => `- ${plans[i].name}: $${(m.price_cents / 100).toFixed(2)}/month — variation \`${m.variation_id}\``).join('\n') +
  '\n\nNo customers, subscriptions, or charges were created. These are plan definitions. Inspect them with Catalog → ListCatalog in Square API Explorer (Production).\n');
