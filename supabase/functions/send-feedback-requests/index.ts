// Scans completed bookings/sales from the last 14 days and sends a one-time
// feedback request email per (context_type, context_id). Idempotency is
// guaranteed by the unique constraint on feedback_email_sent.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function genToken(): string {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const sentLog: any[] = []
  const errors: any[] = []
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const minAge = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // wait 4h after completion

  // 1) Completed bookings (rentals): status approved + booking_end_timestamp passed
  try {
    const { data: bookings } = await supabase
      .from('booking_requests')
      .select('id, shopper_id, listing_id, booking_end_timestamp, end_date, listings(title)')
      .eq('status', 'approved')
      .lt('booking_end_timestamp', minAge)
      .gt('booking_end_timestamp', cutoff)
      .limit(200)

    // shopper_id references auth.users, not profiles — fetch profiles separately.
    const shopperIds = Array.from(new Set((bookings || []).map((b: any) => b.shopper_id).filter(Boolean)))
    const profilesById = new Map<string, any>()
    if (shopperIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name')
        .in('id', shopperIds)
      ;(profileRows || []).forEach((p: any) => profilesById.set(p.id, p))
    }

    for (const b of bookings || []) {
      const profile: any = profilesById.get((b as any).shopper_id)
      const listing: any = (b as any).listings
      const email = profile?.email
      if (!email) continue

      const { data: already } = await supabase
        .from('feedback_email_sent')
        .select('id')
        .eq('context_type', 'booking')
        .eq('context_id', b.id)
        .maybeSingle()
      if (already) continue

      const token = genToken()
      await supabase.from('feedback_email_sent').insert({
        context_type: 'booking', context_id: b.id, recipient_email: email,
      })
      // Pre-create a feedback row tied to token so the page can resolve it
      await supabase.from('feedback_submissions').insert({
        user_id: b.shopper_id, context_type: 'booking', context_id: b.id, email,
        metadata: { token, status: 'pending', listing_title: listing?.title },
      })

      const recipientName = profile?.first_name || profile?.full_name?.split(' ')[0]
      const contextLabel = listing?.title ? `your booking at ${listing.title}` : 'your recent booking'

      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'feedback-request',
          recipientEmail: email,
          idempotencyKey: `feedback-booking-${b.id}`,
          templateData: {
            recipientName, contextLabel, contextType: 'booking',
            feedbackToken: token, aiSubject: true,
          },
        },
      })
      if (error) errors.push({ booking: b.id, error: error.message })
      else sentLog.push({ type: 'booking', id: b.id, email })
    }
  } catch (e) {
    errors.push({ stage: 'bookings', error: e instanceof Error ? e.message : String(e) })
  }

  // 2) Completed sales
  try {
    const { data: sales } = await supabase
      .from('sale_transactions')
      .select('id, buyer_id, listing_id, updated_at, listings(title), profiles!sale_transactions_buyer_id_fkey(email, full_name, first_name)')
      .in('status', ['completed', 'confirmed'])
      .lt('updated_at', minAge)
      .gt('updated_at', cutoff)
      .limit(200)

    for (const s of sales || []) {
      const profile: any = (s as any).profiles
      const listing: any = (s as any).listings
      const email = profile?.email
      if (!email) continue

      const { data: already } = await supabase
        .from('feedback_email_sent')
        .select('id')
        .eq('context_type', 'sale')
        .eq('context_id', s.id)
        .maybeSingle()
      if (already) continue

      const token = genToken()
      await supabase.from('feedback_email_sent').insert({
        context_type: 'sale', context_id: s.id, recipient_email: email,
      })
      await supabase.from('feedback_submissions').insert({
        user_id: s.buyer_id, context_type: 'sale', context_id: s.id, email,
        metadata: { token, status: 'pending', listing_title: listing?.title },
      })

      const recipientName = profile?.first_name || profile?.full_name?.split(' ')[0]
      const contextLabel = listing?.title ? `your purchase of ${listing.title}` : 'your recent purchase'

      const { error } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'feedback-request',
          recipientEmail: email,
          idempotencyKey: `feedback-sale-${s.id}`,
          templateData: {
            recipientName, contextLabel, contextType: 'sale',
            feedbackToken: token, aiSubject: true,
          },
        },
      })
      if (error) errors.push({ sale: s.id, error: error.message })
      else sentLog.push({ type: 'sale', id: s.id, email })
    }
  } catch (e) {
    errors.push({ stage: 'sales', error: e instanceof Error ? e.message : String(e) })
  }

  return new Response(JSON.stringify({ success: true, sent: sentLog.length, errors }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
