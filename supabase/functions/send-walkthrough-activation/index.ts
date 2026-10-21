import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { isAdminOrInternalCaller } from '../_shared/internalAuth.ts';
import { readAllRows } from '../_shared/readAllRows.ts';
import { isMailableAddress } from '../_shared/marketingAudience.ts';
import { unsubToken } from '../_shared/unsubscribeToken.ts';
import { MARKETING_FROM, MARKETING_REPLY_TO, mailingAddressConfigured } from '../_shared/marketing-templates/brand.ts';
import { WALKTHROUGH_CAMPAIGN_ID, WALKTHROUGH_SUBJECT, buildWalkthroughCampaignHtml, buildWalkthroughCampaignText } from '../_shared/marketing-templates/activate-walkthroughs.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const TEST_RECIPIENTS = new Set(['atlasmom421@gmail.com', 'shawnnaharbin@vendibook.com']);
const CAMPAIGN = WALKTHROUGH_CAMPAIGN_ID;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!await isAdminOrInternalCaller(req)) return json({ error: 'not_authorized' }, 403);
  try {
    const body = await req.json();
    const mode = body.mode || 'preview_count';
    if (!['preview_count', 'preview_html', 'test', 'broadcast'].includes(mode)) return json({ error: 'invalid_mode' }, 400);
    const base = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(base, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const unsubscribe = (email: string) => `${base}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`;
    if (mode === 'preview_html') {
      const d = { firstName: 'there', unsubscribeUrl: unsubscribe('preview@vendibook.com') };
      return json({ subject: WALKTHROUGH_SUBJECT, html: buildWalkthroughCampaignHtml(d), text: buildWalkthroughCampaignText(d) });
    }
    // Required exclusion reads fail closed and paginate; missing rows cannot
    // silently turn an opted-out or suppressed address into a recipient.
    const [unsubs, suppressions, sent] = await Promise.all([
      readAllRows<{ email: string }>((from, to) => admin.from('email_unsubscribes').select('email').order('id').range(from, to)),
      readAllRows<{ email: string }>((from, to) => admin.from('suppressed_emails').select('email').order('id').range(from, to)),
      readAllRows<{ email: string }>((from, to) => admin.from('blog_campaign_sends').select('email').eq('campaign_id', CAMPAIGN).eq('status', 'sent').eq('is_test', false).order('id').range(from, to)),
    ]);
    const blocked = new Set([...unsubs, ...suppressions].map(r => r.email.trim().toLowerCase()));
    const alreadySent = new Set(sent.map(r => r.email.trim().toLowerCase()));
    type Recipient = { email: string; user_id: string | null; firstName: string | null };
    let recipients: Recipient[] = [];
    const isTest = mode === 'test';
    if (isTest) {
      const email = String(body.testEmail || '').trim().toLowerCase();
      if (!TEST_RECIPIENTS.has(email)) return json({ error: 'test_recipient_not_authorized' }, 400);
      if (blocked.has(email)) return json({ error: 'test_recipient_suppressed_or_unsubscribed' }, 409);
      recipients = [{ email, user_id: null, firstName: null }];
    } else {
      const listings = await readAllRows<{ host_id: string; title: string }>((from, to) => admin.from('listings')
        .select('host_id,title').eq('status', 'published').eq('moderation_status', 'clear').is('deleted_at', null)
        .eq('unlisted', false).in('mode', ['sale', 'rent']).order('id').range(from, to));
      const hosts = [...new Set(listings.filter(l => !/^(demo|qa[ _-]|test |e2e |smoke |sandbox )/i.test(l.title)).map(l => l.host_id))];
      const profiles: { id: string; email: string | null; first_name: string | null; account_suspended: boolean | null }[] = [];
      for (let i = 0; i < hosts.length; i += 200) profiles.push(...await readAllRows<{ id: string; email: string | null; first_name: string | null; account_suspended: boolean | null }>((from, to) => admin.from('profiles')
        .select('id,email,first_name,account_suspended').in('id', hosts.slice(i, i + 200)).order('id').range(from, to)));
      const seen = new Set<string>();
      for (const p of profiles) {
        const email = String(p.email || '').trim().toLowerCase();
        if (!isMailableAddress(email) || p.account_suspended || blocked.has(email) || alreadySent.has(email) || seen.has(email)) continue;
        seen.add(email);
        recipients.push({ email, user_id: p.id, firstName: p.first_name });
      }
      if (mode === 'preview_count') return json({ campaignId: CAMPAIGN, activeListings: listings.length, activeOwners: hosts.length, eligibleRecipients: recipients.length, alreadySent: alreadySent.size });
      if (body.confirm !== CAMPAIGN) return json({ error: 'campaign_confirmation_required' }, 400);
      if (!mailingAddressConfigured()) return json({ error: 'complete_marketing_mailing_address_required' }, 409);
    }
    const eligible = recipients.length;
    recipients = recipients.slice(0, Math.min(50, Math.max(1, Number(body.limit) || 20)));
    const key = Deno.env.get('RESEND_API_KEY');
    if (!key) return json({ error: 'email_provider_unavailable' }, 503);
    const results: { status: string; messageId?: string; error?: string }[] = [];
    for (const r of recipients) {
      const data = { firstName: r.firstName, unsubscribeUrl: unsubscribe(r.email) };
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${CAMPAIGN}:${isTest ? 'test-v1:' : ''}${r.email}` },
        body: JSON.stringify({ from: MARKETING_FROM, reply_to: MARKETING_REPLY_TO, to: [r.email],
          subject: `${isTest ? '[TEST] ' : ''}${WALKTHROUGH_SUBJECT}`, html: buildWalkthroughCampaignHtml(data), text: buildWalkthroughCampaignText(data),
          headers: { 'List-Unsubscribe': `<${data.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
          tags: [{ name: 'type', value: 'marketing' }, { name: 'campaign', value: 'activate_walkthroughs_2026_10' }],
        }),
      });
      const result = await response.json().catch(() => ({}));
      const status = response.ok ? 'sent' : 'failed';
      const { error: logError } = await admin.from('blog_campaign_sends').insert({ campaign_id: CAMPAIGN, user_id: r.user_id, email: r.email, status, is_test: isTest, resend_message_id: result.id || null, error_message: response.ok ? null : String(result.message || 'Email send failed') });
      if (logError) return json({ error: 'send_log_failed', lastSendStatus: status, messageId: result.id || null }, 500);
      results.push({ status, messageId: result.id, ...(!response.ok ? { error: result.message || 'Email send failed' } : {}) });
      if (!response.ok) break;
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    return json({ campaignId: CAMPAIGN, mode, eligibleRecipients: eligible, attempted: results.length, sent: results.filter(r => r.status === 'sent').length, remaining: Math.max(0, eligible - results.length), results });
  } catch (e) {
    console.error('[send-walkthrough-activation]', e instanceof Error ? e.message : 'failed');
    return json({ error: e instanceof Error ? e.message : 'campaign_failed' }, 500);
  }
});
