import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

const SITE = Deno.env.get('SITE_URL') || 'https://vendibook.com';

const displayName = (p: { business_name?: string | null; display_name?: string | null; full_name?: string | null } | null) =>
  p?.business_name || p?.display_name || p?.full_name || null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { data: { user } } = await admin.auth.getUser(token || '');
    if (!user) return new Response('{}', { status: 401, headers: cors });

    const { walkthrough_id, action } = await req.json();
    const { data: w } = await admin
      .from('video_walkthroughs')
      .select('*,listing:listings(id,title,city,state,cover_image_url)')
      .eq('id', walkthrough_id)
      .maybeSingle();
    if (!w || ![w.buyer_id, w.seller_id].includes(user.id)) return new Response('{}', { status: 403, headers: cors });

    const title = action === 'cancelled'
      ? 'Video walkthrough cancelled'
      : action === 'rescheduled'
        ? 'Video walkthrough rescheduled'
        : 'Video walkthrough scheduled';

    const whenLong = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full', timeStyle: 'short', timeZone: w.timezone_snapshot,
    }).format(new Date(w.starts_at));
    const listingTitle = w.listing?.title || 'Listing';
    const message = `${listingTitle} · ${whenLong} (${w.timezone_snapshot})`;
    const link = `/walkthrough/${w.id}`;
    const durationMinutes = Math.round((+new Date(w.ends_at) - +new Date(w.starts_at)) / 60000);
    const listingLocation = [w.listing?.city, w.listing?.state].filter(Boolean).join(', ') || undefined;

    // In-app notification goes to the other participant — the actor already knows.
    const otherId = user.id === w.buyer_id ? w.seller_id : w.buyer_id;
    const { data: n } = await admin
      .from('notifications')
      .insert({ user_id: otherId, type: `walkthrough_${action}`, title, message, link })
      .select()
      .single();

    // Both sides receive the meeting email so each has the link, time and listing.
    const { data: people } = await admin
      .from('profiles')
      .select('id,email,full_name,display_name,business_name')
      .in('id', [w.buyer_id, w.seller_id]);
    const byId = Object.fromEntries((people || []).map((p) => [p.id, p]));
    const buyer = byId[w.buyer_id] || null;
    const seller = byId[w.seller_id] || null;

    const sendTo = async (role: 'buyer' | 'seller') => {
      const me = role === 'buyer' ? buyer : seller;
      const them = role === 'buyer' ? seller : buyer;
      if (!me?.email) return;
      await invokeTransactionalEmail({
        templateName: 'video-walkthrough-scheduled',
        recipientEmail: me.email,
        idempotencyKey: `walkthrough-${w.id}-${action}-${role}-${w.updated_at}`,
        templateData: {
          recipientName: me.full_name || me.display_name || undefined,
          role,
          action,
          otherPartyName: displayName(them) || undefined,
          listingTitle,
          listingLocation,
          listingImageUrl: w.listing?.cover_image_url || undefined,
          listingPath: w.listing?.id ? `/listing/${w.listing.id}` : undefined,
          whenLong,
          timezoneLabel: w.timezone_snapshot,
          durationMinutes,
          joinPath: link,
          topics: Array.isArray(w.requested_topics) ? w.requested_topics : undefined,
          buyerNote: w.buyer_note || undefined,
        },
        metadata: { walkthrough_id: w.id, action, role, site: SITE },
      });
    };

    await Promise.allSettled([sendTo('buyer'), sendTo('seller')]);

    return new Response(JSON.stringify({ success: true, notification_id: n?.id }), { headers: cors });
  } catch (e) {
    console.error('[video-walkthrough-notify]', e instanceof Error ? e.message : 'failed');
    return new Response(JSON.stringify({ error: 'notification_failed' }), { status: 500, headers: cors });
  }
});
