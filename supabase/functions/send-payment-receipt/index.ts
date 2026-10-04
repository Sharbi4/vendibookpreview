// Thin proxy: routes payment receipts through Lovable Emails queue.
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { getAuthedUser, isTrustedInternal } from '../_shared/trustedCaller.ts';

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
    // Signed-in shoppers can only email a receipt to their own account email.
    if (!isTrustedInternal(req)) {
      const user = await getAuthedUser(req);
      if (!user?.email) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      d.email = user.email;
    }

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
