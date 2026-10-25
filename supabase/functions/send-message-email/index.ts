// Thin proxy: routes new-message notification emails through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { isAdminOrBackendCaller, forbiddenResponse } from "../_shared/callerGuard.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();
  try {
    const b = await req.json();
    if (b.relay_alert === true) {
      // Every member message is held for Vendibook to relay; alert the relay inboxes.
      const table = b.table === 'booking_messages' ? 'booking_messages' : 'conversation_messages';
      const id = typeof b.message_id === 'string' ? b.message_id : '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return new Response(JSON.stringify({ error: 'message_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const { data: m, error: mErr } = await db.from(table).select('*').eq('id', id).maybeSingle();
      if (mErr || !m) throw mErr ?? new Error('message not found');
      const { data: sender } = await db.from('profiles').select('full_name, email').eq('id', m.sender_id).maybeSingle();
      const threadId = table === 'booking_messages' ? m.booking_id : m.conversation_id;
      const preview = `[${table === 'booking_messages' ? 'Booking' : 'Conversation'} ${threadId}] From ${sender?.full_name ?? 'member'} (${sender?.email ?? m.sender_id}): ${String(m.message ?? '').slice(0, 2000)}${m.attachment_url ? `\nAttachment: ${m.attachment_url}` : ''}`;
      for (const to of ['support@vendibook.com', 'atlasmom421@gmail.com']) {
        const { error } = await invokeTransactionalEmail({
          templateName: 'new-message',
          recipientEmail: to,
          idempotencyKey: `relay-${id}-${to}`,
          templateData: { recipientName: 'Vendibook team', senderName: sender?.full_name ?? 'A member', messagePreview: preview, unreadCount: 1, linkPath: '/admin' },
        });
        if (error) console.error('[send-message-email] relay alert failed', to, error);
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const recipientEmail = b.recipient_email || b.recipientEmail;
    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'recipient_email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const linkPath = typeof b.link === 'string' && b.link.startsWith('/') ? b.link : undefined;
    const conversationId = b.conversation_id || b.conversationId || (b.link ? String(b.link).split('/').pop() : undefined);
    const idemKey = `msg-${b.message_id || `${conversationId || recipientEmail}-${Date.now()}`}`;

    const { error } = await invokeTransactionalEmail({
        templateName: 'new-message',
        recipientEmail,
        idempotencyKey: idemKey,
        templateData: {
          recipientName: b.recipient_name || b.recipientName,
          senderName: b.sender_name || b.senderName,
          messagePreview: b.message_preview || b.messagePreview,
          conversationId,
          unreadCount: b.unread_count || 1,
          linkPath,
        },
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-message-email]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
