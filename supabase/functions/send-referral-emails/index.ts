// Daily scheduled job:
//   - P6: Send referral-onboarding to users created 5 days ago who have no
//         referral_codes row (i.e., never visited /referral/dashboard) and
//         have not referred anyone.
//   - P8: Send referral-post-tx-ps to users whose FIRST completed transaction
//         (booking or sale) was ~24h ago.
//
// Idempotency keys ensure each user gets each email at most once.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = Date.now()
  const fiveDaysAgoStart = new Date(now - 6 * 86400000).toISOString()
  const fiveDaysAgoEnd = new Date(now - 5 * 86400000).toISOString()
  const oneDayAgoStart = new Date(now - 30 * 60 * 60 * 1000).toISOString()
  const oneDayAgoEnd = new Date(now - 20 * 60 * 60 * 1000).toISOString()

  let onboardingQueued = 0
  let psQueued = 0

  // ---------- P6: Day-5 onboarding ----------
  const { data: candidates } = await supabase
    .from('profiles')
    .select('id, email, first_name, display_name, full_name, created_at')
    .gte('created_at', fiveDaysAgoStart)
    .lt('created_at', fiveDaysAgoEnd)
    .not('email', 'is', null)

  for (const u of candidates || []) {
    // Skip if user already has a referral code (visited dashboard)
    const { data: code } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('user_id', u.id)
      .maybeSingle()
    if (code) continue

    // Skip if already referred someone
    const { count: refCount } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', u.id)
    if ((refCount ?? 0) > 0) continue

    const firstName = u.first_name || u.display_name || u.full_name?.split(' ')[0]
    const { error } = await invokeTransactionalEmail({
        templateName: 'referral-onboarding',
        recipientEmail: u.email,
        idempotencyKey: `referral-onboarding-${u.id}`,
        templateData: { name: firstName },
      })
    if (!error) onboardingQueued++
  }

  // ---------- P8: 24h-after-first-transaction PS ----------
  // Bookings paid in the 24h window
  const { data: recentBookings } = await supabase
    .from('booking_requests')
    .select('id, shopper_id, payment_status, created_at')
    .eq('payment_status', 'paid')
    .gte('created_at', oneDayAgoStart)
    .lt('created_at', oneDayAgoEnd)

  // Sales paid in the window
  const { data: recentSales } = await supabase
    .from('sale_transactions')
    .select('id, buyer_id, status, created_at')
    .in('status', ['paid', 'completed'])
    .gte('created_at', oneDayAgoStart)
    .lt('created_at', oneDayAgoEnd)

  type Tx = { userId: string; type: 'rental' | 'purchase' }
  const txs: Tx[] = [
    ...(recentBookings || []).map((b: any) => ({ userId: b.shopper_id, type: 'rental' as const })),
    ...(recentSales || []).map((s: any) => ({ userId: s.buyer_id, type: 'purchase' as const })),
  ].filter((t) => t.userId)

  for (const tx of txs) {
    // Only send if this is their first completed transaction overall
    const { count: bCount } = await supabase
      .from('booking_requests')
      .select('id', { count: 'exact', head: true })
      .eq('shopper_id', tx.userId)
      .eq('payment_status', 'paid')
      .lt('created_at', oneDayAgoStart)
    const { count: sCount } = await supabase
      .from('sale_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', tx.userId)
      .in('status', ['paid', 'completed'])
      .lt('created_at', oneDayAgoStart)
    if ((bCount ?? 0) + (sCount ?? 0) > 0) continue // not their first

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, first_name, display_name, full_name')
      .eq('id', tx.userId)
      .maybeSingle()
    if (!profile?.email) continue

    const firstName = profile.first_name || profile.display_name || profile.full_name?.split(' ')[0]
    const { error } = await invokeTransactionalEmail({
        templateName: 'referral-post-tx-ps',
        recipientEmail: profile.email,
        idempotencyKey: `referral-post-tx-${tx.userId}`,
        templateData: { name: firstName, transactionType: tx.type },
      })
    if (!error) psQueued++
  }

  return new Response(
    JSON.stringify({ ok: true, onboardingQueued, psQueued }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
