// Public endpoint hit from inline NPS buttons in feedback emails.
// Records the NPS score against the pending feedback_submissions row keyed by token,
// then 302-redirects the user to /feedback?token=...&nps=N for an optional comment.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { queueTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const SITE_URL = 'https://vendibook.com';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const scoreRaw = url.searchParams.get('score');
  const score = scoreRaw === null ? NaN : parseInt(scoreRaw, 10);

  const redirect = (extra = '') =>
    new Response(null, { status: 302, headers: { Location: `${SITE_URL}/feedback?token=${encodeURIComponent(token)}${extra}` } });

  if (!token || Number.isNaN(score) || score < 0 || score > 10) {
    return redirect();
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: row } = await supabase
      .from('feedback_submissions')
      .select('id, metadata, nps, email')
      .filter('metadata->>token', 'eq', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (row) {
      const meta = (row.metadata as any) || {};
      const newMetadata = { ...meta, nps_clicked_at: new Date().toISOString(), nps_source: 'email' };
      await supabase
        .from('feedback_submissions')
        .update({ nps: score, metadata: newMetadata })
        .eq('id', row.id);

      // Best-effort instant admin ping — lets us see signal even if no comment follows.
      for (const adminTo of ['support@vendibook.com']) {
        queueTransactionalEmail({
            templateName: 'feedback-received-admin',
            recipientEmail: adminTo,
            idempotencyKey: `feedback-admin-nps-${row.id}-${score}-${adminTo}`,
            templateData: {
              fromEmail: row.email || meta.recipient_email,
              fromName: meta.recipient_name,
              rating: null,
              nps: score,
              message: '(NPS click from email — no written comment yet)',
              contextType: 'broadcast_nps',
              contextLabel: 'One-tap email NPS',
              businessType: null,
              canShare: false,
            },
          });
      }
    }
  } catch (_) {
    // swallow — always redirect somewhere useful
  }

  return redirect(`&nps=${score}`);
});
