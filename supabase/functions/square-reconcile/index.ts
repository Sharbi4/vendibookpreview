import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { squareConfig } from '../_shared/square.ts';
import { syncSquareSubscription } from '../_shared/squareSubscription.ts';

function timingSafeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function authorized(req: Request) {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const bearer = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (serviceKey && timingSafeEqual(bearer, serviceKey)) return true;
  const cronToken = Deno.env.get('SQUARE_RECONCILE_TOKEN') || '';
  const provided = (req.headers.get('x-operator-token') || '').trim();
  return !!cronToken && timingSafeEqual(provided, cronToken);
}

Deno.serve(async req => {
  if (req.method !== 'POST' || !authorized(req)) return new Response('Unauthorized', { status: 401 });
  try {
    const config = squareConfig();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data, error } = await admin
      .from('square_billing_attempts')
      .select('*')
      .eq('kind', 'subscription')
      .eq('environment', config.environment)
      .not('subscription_id', 'is', null)
      .order('updated_at')
      .limit(100);
    if (error) throw error;
    for (const attempt of data || []) await syncSquareSubscription(admin, attempt);
    return Response.json({ reconciled: data?.length || 0 });
  } catch {
    return new Response('Reconciliation failed', { status: 500 });
  }
});
