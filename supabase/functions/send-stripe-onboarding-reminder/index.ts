import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[STRIPE-ONBOARDING-REMINDER] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    logStep("Function started");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: incompleteUsers, error: queryError } = await supabaseClient
      .from('profiles')
      .select('id, email, full_name, stripe_onboarding_started_at, stripe_nudge_sent_at')
      .not('stripe_account_id', 'is', null)
      .or('stripe_onboarding_complete.is.null,stripe_onboarding_complete.eq.false')
      .lt('stripe_onboarding_started_at', twentyFourHoursAgo)
      .gt('stripe_onboarding_started_at', sevenDaysAgo)
      .or(`stripe_nudge_sent_at.is.null,stripe_nudge_sent_at.lt.${fortyEightHoursAgo}`);

    if (queryError) throw new Error(`Database query error: ${queryError.message}`);

    if (!incompleteUsers?.length) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of incompleteUsers) {
      if (!user.email) continue;
      const firstName = user.full_name?.split(' ')[0] || 'there';
      try {
        const { error: emailError } = await supabaseClient.functions.invoke("send-transactional-email", {
          body: {
            templateName: "stripe-onboarding-nudge",
            recipientEmail: user.email,
            idempotencyKey: `stripe-onboarding-${user.id}-${new Date().toISOString().slice(0,10)}`,
            templateData: { name: firstName },
          },
        });
        if (emailError) {
          errors.push(`User ${user.id}: ${emailError.message}`);
          continue;
        }
        await supabaseClient.from('profiles')
          .update({ stripe_nudge_sent_at: new Date().toISOString() })
          .eq('id', user.id);
        sentCount++;
      } catch (e: any) {
        errors.push(`User ${user.id}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount, total: incompleteUsers.length, errors: errors.length ? errors : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (error: any) {
    logStep("Function failed", { error: error.message });
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
