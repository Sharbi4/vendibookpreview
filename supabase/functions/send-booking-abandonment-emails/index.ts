// Cron-triggered: scans booking_drafts for abandoned sessions and sends recovery emails
// at 2 hours and 24 hours after the last update.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const now = new Date();
  const cutoff2h = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

  let sent2h = 0;
  let sent24h = 0;
  const errors: string[] = [];

  const sendEmail = async (
    draft: any,
    variant: "2h" | "24h",
  ) => {
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title")
      .eq("id", draft.listing_id)
      .maybeSingle();

    if (!listing) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, full_name")
      .eq("id", draft.user_id)
      .maybeSingle();

    const shopperName =
      profile?.first_name || (profile?.full_name || "").split(" ")[0] || undefined;

    const fmt = (d: string | null) =>
      d
        ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : undefined;

    const resumeUrl = `https://vendibook.com/listing/${listing.id}?resume=${draft.recovery_token}`;

    const { error } = await invokeTransactionalEmail({
        templateName: "booking-abandoned",
        recipientEmail: draft.email,
        idempotencyKey: `abandon-${variant}-${draft.id}`,
        templateData: {
          shopperName,
          listingTitle: listing.title,
          startDate: fmt(draft.start_date),
          endDate: fmt(draft.end_date),
          resumeUrl,
          variant,
        },
      });

    if (error) {
      errors.push(`${variant}/${draft.id}: ${error.message}`);
      return false;
    }
    return true;
  };

  // 2-hour batch
  const { data: pending2h } = await supabase
    .from("booking_drafts")
    .select("*")
    .is("completed_at", null)
    .is("email_2h_sent_at", null)
    .lte("updated_at", cutoff2h)
    .gt("updated_at", cutoff72h)
    .limit(100);

  for (const draft of pending2h || []) {
    const ok = await sendEmail(draft, "2h");
    if (ok) {
      await supabase
        .from("booking_drafts")
        .update({ email_2h_sent_at: now.toISOString() })
        .eq("id", draft.id);
      sent2h++;
    }
  }

  // 24-hour batch
  const { data: pending24h } = await supabase
    .from("booking_drafts")
    .select("*")
    .is("completed_at", null)
    .is("email_24h_sent_at", null)
    .not("email_2h_sent_at", "is", null)
    .lte("updated_at", cutoff24h)
    .gt("updated_at", cutoff72h)
    .limit(100);

  for (const draft of pending24h || []) {
    const ok = await sendEmail(draft, "24h");
    if (ok) {
      await supabase
        .from("booking_drafts")
        .update({ email_24h_sent_at: now.toISOString(), abandoned_at: now.toISOString() })
        .eq("id", draft.id);
      sent24h++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent2h, sent24h, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
