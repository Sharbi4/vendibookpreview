// One-shot backfill: sends the "listing published" launch-kit email
// (including share links, blog picks, and tools) to every host who already has
// a published, non-demo listing. Uses an idempotency key keyed on listing id +
// 'backfill-v1' so a host who already received the original publish email still
// gets this one, but re-running this function is safe (idempotency dedupes).
//
// Trigger by POSTing to this function. Admin-only via service role.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { isAdminOrInternalCaller, internalOnlyResponse } from '../_shared/internalAuth.ts'
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // Mass host email job — internal scheduler or signed-in admin only.
  if (!(await isAdminOrInternalCaller(req))) {
    return internalOnlyResponse(corsHeaders)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const url = new URL(req.url)
    const dryRun = url.searchParams.get('dryRun') === '1'
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? Math.max(1, Math.min(500, Number(limitParam))) : 500

    const { data: listings, error } = await supabase
      .from('listings')
      .select('id, title, category, city, cover_image_url, mode, host_id')
      .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
      .not('title', 'ilike', 'demo%')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error

    const hostIds = Array.from(new Set((listings || []).map((l: any) => l.host_id).filter(Boolean)))
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', hostIds)
    const byId = new Map((profiles || []).map((p: any) => [p.id, p]))

    const results: Array<{ listingId: string; email?: string; status: string; error?: string }> = []

    async function sendOne(l: any) {
      const profile: any = byId.get(l.host_id)
      const email = profile?.email
      if (!email) return { listingId: l.id, status: 'skipped_no_email' }
      const listingType: 'rental' | 'sale' | 'both' =
        l.mode === 'sale' ? 'sale' : l.mode === 'both' ? 'both' : 'rental'
      if (dryRun) return { listingId: l.id, email, status: 'dry_run' }
      const { error: sendErr } = await invokeTransactionalEmail({
          templateName: 'listing-published',
          recipientEmail: email,
          idempotencyKey: `listing-published-backfill-v1-${l.id}`,
          templateData: {
            hostName: (profile?.full_name || '').split(' ')[0] || profile?.full_name,
            listingTitle: l.title,
            listingId: l.id,
            category: l.category,
            city: l.city,
            coverImageUrl: l.cover_image_url,
            listingType,
          },
        })
      if (sendErr) return { listingId: l.id, email, status: 'error', error: String((sendErr as any)?.message || sendErr) }
      return { listingId: l.id, email, status: 'queued' }
    }

    // Parallel in batches of 10 to stay under edge-function timeout.
    const all = (listings || []) as any[]
    for (let i = 0; i < all.length; i += 10) {
      const batch = all.slice(i, i + 10)
      const batchResults = await Promise.all(batch.map(sendOne))
      results.push(...batchResults)
    }

    const summary = {
      total: results.length,
      queued: results.filter(r => r.status === 'queued').length,
      skipped: results.filter(r => r.status === 'skipped_no_email').length,
      errored: results.filter(r => r.status === 'error').length,
      dryRun,
    }
    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[backfill-listing-published-emails]', e)
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
