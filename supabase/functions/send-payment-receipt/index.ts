// Thin proxy: routes payment receipts through Lovable Emails queue.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function fmtMoney(n?: number) {
  if (n == null || isNaN(Number(n))) return '';
  return `$${Number(n).toFixed(2)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const d = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!d?.email || !d?.transactionId) {
      return new Response(JSON.stringify({ error: 'email and transactionId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const templateData = {
      customerName: d.fullName?.split(' ')[0] || d.fullName,
      orderNumber: `VB-${String(d.transactionId).slice(0, 8).toUpperCase()}`,
      amount: fmtMoney(d.amount),
      paymentMethod: d.paymentMethod || 'Card',
      paidAt: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      listingTitle: d.listingTitle || d.itemName,
      description: d.transactionType === 'rental'
        ? `Rental${d.startDate ? ` (${d.startDate} → ${d.endDate})` : ''}`
        : 'Purchase',
    };

    const { error } = await invokeTransactionalEmail({
        templateName: 'payment-receipt',
        recipientEmail: d.email,
        idempotencyKey: `receipt-${d.transactionId}`,
        templateData,
      });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[send-payment-receipt]', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
