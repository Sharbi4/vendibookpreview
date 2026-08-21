// On-demand broadcast that asks every registered user for NPS feedback.
// Idempotent via feedback_email_sent (context_type=wave, context_id=user_id),
// so calling this twice will not re-send to anyone already mailed in this wave.
//
// Trigger:  POST /functions/v1/send-feedback-broadcast
// Optional body: { "wave": "broadcast_v2", "limit": 500, "dryRun": false }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTransactionalEmailInternal } from '../_shared/invokeTransactionalEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function genToken(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const wave: string = body.wave || 'broadcast_v1';
  const limit: number = Math.min(Number(body.limit ?? 500), 1000);
  const dryRun: boolean = body.dryRun === true;

  const sent: any[] = [];
  const skipped: any[] = [];
  const errors: any[] = [];

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, first_name')
    .not('email', 'is', null)
    .limit(limit);

  if (pErr) {
    return new Response(JSON.stringify({ success: false, error: pErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  for (const p of profiles || []) {
    const email = ((p as any).email || '').trim();
    if (!email || !email.includes('@')) { skipped.push({ id: p.id, reason: 'no-email' }); continue; }
    if (/(\+test|example\.com|noreply|@vendibook\.test)/i.test(email)) { skipped.push({ id: p.id, reason: 'synthetic' }); continue; }

    const { data: already } = await supabase
      .from('feedback_email_sent')
      .select('id')
      .eq('context_type', wave)
      .eq('context_id', p.id)
      .maybeSingle();
    if (already) { skipped.push({ id: p.id, reason: 'already-sent' }); continue; }

    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('email')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    if (suppressed) { skipped.push({ id: p.id, reason: 'suppressed' }); continue; }

    if (dryRun) { sent.push({ id: p.id, email, dryRun: true }); continue; }

    const token = genToken();
    const { error: logErr } = await supabase.from('feedback_email_sent').insert({
      context_type: wave, context_id: p.id, recipient_email: email,
    });
    if (logErr) { skipped.push({ id: p.id, reason: 'race-condition' }); continue; }

    await supabase.from('feedback_submissions').insert({
      user_id: p.id,
      context_type: 'broadcast',
      context_id: p.id,
      email,
      metadata: { token, status: 'pending', wave, recipient_email: email, recipient_name: (p as any).first_name || (p as any).full_name },
    });

    const recipientName = (p as any).first_name || ((p as any).full_name || '').split(' ')[0] || undefined;

    const resp = await sendTransactionalEmailInternal({
      templateName: 'feedback-request',
      recipientEmail: email,
      idempotencyKey: `feedback-${wave}-${p.id}`,
      templateData: { recipientName, contextType: 'broadcast', feedbackToken: token },
    });
    if (!resp.ok) {
      errors.push({ id: p.id, email, status: resp.status, error: resp.body.slice(0, 300) });
    } else {
      sent.push({ id: p.id, email });
    }
  }

  return new Response(JSON.stringify({
    success: true, wave, dryRun, sent: sent.length, skipped: skipped.length, errors: errors.length,
    skippedSample: skipped.slice(0, 10), errorsSample: errors.slice(0, 10),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
