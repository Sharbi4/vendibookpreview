// Thin proxy: routes new-message notification emails through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const b = await req.json();
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

    const { error } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'new-message',
        recipientEmail,
        idempotencyKey: idemKey,
        templateData: {
          recipientName: b.recipient_name || b.recipientName,
          senderName: b.sender_name || b.senderName,
          messagePreview: b.message_preview || b.messagePreview,
          conversationId,
          unreadCount: b.unread_count || 1,
        },
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
