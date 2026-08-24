// Cron-triggered: sends 24h SMS reminders for upcoming confirmed bookings
// AND 24h email reminders. Idempotent via per-booking flag check.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Window: bookings starting in 22-26 hours from now
  const now = new Date();
  const windowStart = new Date(now.getTime() + 22 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 26 * 60 * 60 * 1000);

  const { data: bookings, error } = await supabase
    .from("booking_requests")
    .select("id, shopper_id, host_id, listing_id, start_date, address_snapshot, access_instructions_snapshot, document_reminder_sent_at, listings:listing_id(title, address)")
    .in("status", ["approved"])
    .eq("payment_status", "paid")
    .gte("start_date", windowStart.toISOString().slice(0, 10))
    .lte("start_date", windowEnd.toISOString().slice(0, 10))
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sms = 0;
  let emails = 0;
  const errors: string[] = [];

  for (const b of bookings || []) {
    // Use document_reminder_sent_at as a generic 24h-reminder-sent marker (overload acceptable; fast win)
    if (b.document_reminder_sent_at) continue;

    const listingTitle = (b.listings as any)?.title || "your booking";
    const address = b.address_snapshot || (b.listings as any)?.address || undefined;
    const startFmt = new Date(b.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

    // Get shopper profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, full_name, email")
      .eq("id", b.shopper_id)
      .maybeSingle();

    const shopperName = profile?.first_name || (profile?.full_name || "").split(" ")[0];

    // SMS
    try {
      const smsBody = `VendiBook reminder: "${listingTitle}" starts tomorrow (${startFmt}). ${address ? "Location: " + address + ". " : ""}Reply STOP to opt out.`;
      await supabase.functions.invoke("send-sms", {
        body: {
          user_id: b.shopper_id,
          template_name: "booking_reminder_24h",
          body: smsBody,
          category: "transactional",
          metadata: { booking_id: b.id },
        },
      });
      sms++;
    } catch (e: any) {
      errors.push(`sms/${b.id}: ${e.message}`);
    }

    // Email (idempotent via send-transactional-email)
    if (profile?.email) {
      try {
        await invokeTransactionalEmail({
            templateName: "booking-reminder-24h",
            recipientEmail: profile.email,
            idempotencyKey: `reminder24h-${b.id}`,
            templateData: {
              shopperName,
              listingTitle,
              startDate: startFmt,
              address,
              bookingId: b.id,
              accessInstructions: b.access_instructions_snapshot,
            },
          });
        emails++;
      } catch (e: any) {
        errors.push(`email/${b.id}: ${e.message}`);
      }
    }

    await supabase
      .from("booking_requests")
      .update({ document_reminder_sent_at: now.toISOString() })
      .eq("id", b.id);
  }

  return new Response(
    JSON.stringify({ ok: true, sms, emails, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
