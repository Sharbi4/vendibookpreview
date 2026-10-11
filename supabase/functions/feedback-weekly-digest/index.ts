// Weekly AI digest of all feedback collected in the last 7 days.
// Sends a themed summary + suggested fixes to support@vendibook.com.
// Triggered by pg_cron weekly or on-demand via POST.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: subs, error } = await supabase
    .from('feedback_submissions')
    .select('rating, nps, message, context_type, metadata, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const valid = (subs || []).filter((s) => s.nps != null || s.rating != null || (s.message && s.message.trim().length > 0));
  if (valid.length === 0) {
    return new Response(JSON.stringify({ success: true, sent: false, reason: 'no-data' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const npsValues = valid.map((s) => s.nps).filter((n): n is number => typeof n === 'number');
  const avgNps = npsValues.length ? Math.round((npsValues.reduce((a, b) => a + b, 0) / npsValues.length) * 10) / 10 : null;
  const promoters = npsValues.filter((n) => n >= 9).length;
  const detractors = npsValues.filter((n) => n <= 6).length;

  const corpus = valid.slice(0, 200).map((s, i) => {
    const parts = [`#${i + 1}`];
    if (s.nps != null) parts.push(`NPS=${s.nps}`);
    if (s.rating != null) parts.push(`★${s.rating}`);
    if ((s.metadata as any)?.business_type) parts.push(`(${(s.metadata as any).business_type})`);
    if (s.message) parts.push(`— ${s.message.replace(/\s+/g, ' ').slice(0, 400)}`);
    return parts.join(' ');
  }).join('\n');

  let themes: any[] = [];
  let highlightQuotes: string[] = [];
  let rawSummary = '';
  try {
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a product analyst for Vendibook, a marketplace for food trucks, commercial kitchens, and event spaces. Cluster user feedback into 3–6 themes, each with a concrete suggested fix the engineering team can ship. Severity must be high/medium/low. Return strict JSON only.' },
          { role: 'user', content: `Summarize this week's feedback. Return JSON: { "themes": [{ "title": string, "summary": string, "suggested_fix": string, "severity": "high"|"medium"|"low", "count": number }], "highlightQuotes": string[], "rawSummary": string }\n\nFEEDBACK:\n${corpus}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (aiResp.ok) {
      const aiJson = await aiResp.json();
      const content = aiJson.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        themes = Array.isArray(parsed.themes) ? parsed.themes : [];
        highlightQuotes = Array.isArray(parsed.highlightQuotes) ? parsed.highlightQuotes : [];
        rawSummary = parsed.rawSummary || '';
      }
    } else {
      rawSummary = `AI summary unavailable (status ${aiResp.status}). Raw corpus included.`;
    }
  } catch (e) {
    rawSummary = `AI summary failed: ${e instanceof Error ? e.message : String(e)}`;
  }

  const weekLabel = `Week ending ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  let sendErr: any = null;
  for (const adminTo of ['support@vendibook.com']) {
    const { error } = await invokeTransactionalEmail({
        templateName: 'feedback-weekly-digest',
        recipientEmail: adminTo,
        idempotencyKey: `feedback-digest-${new Date().toISOString().slice(0, 10)}-${adminTo}`,
        templateData: { weekLabel, totalSubmissions: valid.length, avgNps, promoters, detractors, themes, highlightQuotes, rawSummary },
      });
    if (error) sendErr = error;
  }

  return new Response(JSON.stringify({
    success: !sendErr, sent: !sendErr, count: valid.length, avgNps, themes: themes.length, error: sendErr?.message,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
