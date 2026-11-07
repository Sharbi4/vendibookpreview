// Cron-triggered: scans booking_drafts for abandoned sessions and sends recovery emails
// at 2 hours and 24 hours after the last update.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeTransactionalEmail } from '../_shared/invokeTransactionalEmail.ts'
import { isAdminOrBackendCaller, forbiddenResponse } from "../_shared/callerGuard.ts";
import { buyerCommitted, saleResumeUrl } from "./saleRecovery.ts";
import { listingAcceptsGuestDraft } from "../_shared/guestCheckoutDraft.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!(await isAdminOrBackendCaller(req))) return forbiddenResponse();

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

    // Never nudge a renter who actually paid (or whose draft was completed
    // after this batch was selected).
    const { data: paidBooking } = await supabase
      .from("booking_requests")
      .select("id")
      .eq("shopper_id", draft.user_id)
      .eq("listing_id", draft.listing_id)
      .eq("payment_status", "paid")
      .limit(1)
      .maybeSingle();
    if (paidBooking) {
      await supabase
        .from("booking_drafts")
        .update({ completed_at: now.toISOString() })
        .eq("id", draft.id);
      return false;
    }

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

    // Resume reopens the checkout with the renter's dates preselected.
    const safePath =
      typeof draft.resume_path === "string" && draft.resume_path.startsWith("/book/")
        ? draft.resume_path
        : null;
    const params = new URLSearchParams();
    if (draft.start_date) params.set("start", draft.start_date);
    if (draft.end_date) params.set("end", draft.end_date);
    const qs = params.toString();
    const resumeUrl = safePath
      ? `https://vendibook.com${safePath}`
      : `https://vendibook.com/book/${listing.id}${qs ? `?${qs}` : ""}`;

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

  // ── Equipment sale checkouts (same sweep, no extra schedule) ──
  let saleSent2h = 0;
  let saleSent24h = 0;
  const money = (n: number | null) =>
    typeof n === "number" && n > 0
      ? n.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : undefined;

  const sendSaleEmail = async (draft: any, variant: "2h" | "24h") => {
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title, status, mode")
      .eq("id", draft.listing_id)
      .maybeSingle();
    // Sold, paused or removed listings get no nudge.
    if (!listing || listing.status !== "published") {
      await supabase.from("sale_checkout_drafts").update({ completed_at: now.toISOString() }).eq("id", draft.id);
      return false;
    }

    const [{ data: txs }, { count: reqCount }] = await Promise.all([
      supabase.from("sale_transactions").select("status")
        .eq("buyer_id", draft.user_id).eq("listing_id", draft.listing_id)
        .gte("created_at", draft.created_at),
      supabase.from("sale_purchase_requests").select("id", { count: "exact", head: true })
        .eq("buyer_id", draft.user_id).eq("listing_id", draft.listing_id)
        .gte("created_at", draft.created_at),
    ]);
    if (buyerCommitted((txs || []).map((t: any) => t.status), reqCount ?? 0)) {
      await supabase.from("sale_checkout_drafts").update({ completed_at: now.toISOString() }).eq("id", draft.id);
      return false;
    }

    const { data: profile } = await supabase
      .from("profiles").select("first_name, full_name").eq("id", draft.user_id).maybeSingle();
    const buyerName = profile?.first_name || (profile?.full_name || "").split(" ")[0] || undefined;

    const { error } = await invokeTransactionalEmail({
      templateName: "sale-checkout-abandoned",
      recipientEmail: draft.email,
      idempotencyKey: `sale-abandon-${variant}-${draft.id}-${draft.updated_at}`,
      templateData: {
        buyerName,
        listingTitle: listing.title,
        totalPrice: money(draft.total_price),
        resumeUrl: saleResumeUrl(draft.resume_path, listing.id, !!draft.request_only),
        requestOnly: !!draft.request_only,
        variant,
      },
    });
    if (error) {
      errors.push(`sale-${variant}/${draft.id}: ${error.message}`);
      return false;
    }
    return true;
  };

  const { data: sale2h } = await supabase
    .from("sale_checkout_drafts").select("*")
    .is("completed_at", null).is("email_2h_sent_at", null)
    .lte("updated_at", cutoff2h).gt("updated_at", cutoff72h).limit(100);
  for (const draft of sale2h || []) {
    if (await sendSaleEmail(draft, "2h")) {
      await supabase.from("sale_checkout_drafts").update({ email_2h_sent_at: now.toISOString() }).eq("id", draft.id);
      saleSent2h++;
    }
  }

  const { data: sale24h } = await supabase
    .from("sale_checkout_drafts").select("*")
    .is("completed_at", null).is("email_24h_sent_at", null).not("email_2h_sent_at", "is", null)
    .lte("updated_at", cutoff24h).gt("updated_at", cutoff72h).limit(100);
  for (const draft of sale24h || []) {
    if (await sendSaleEmail(draft, "24h")) {
      await supabase.from("sale_checkout_drafts").update({ email_24h_sent_at: now.toISOString() }).eq("id", draft.id);
      saleSent24h++;
    }
  }

  // ── Guest checkouts (email left at the first step, not signed in) ──
  let guestSent2h = 0;
  let guestSent24h = 0;

  const completeGuest = (id: string) =>
    supabase.from("guest_checkout_drafts").update({ completed_at: now.toISOString() }).eq("id", id);

  const sendGuestEmail = async (draft: any, variant: "2h" | "24h") => {
    const { data: listing } = await supabase
      .from("listings").select("id, title, status, mode").eq("id", draft.listing_id).maybeSingle();
    if (!listingAcceptsGuestDraft(draft.flow, listing)) {
      await completeGuest(draft.id);
      return false;
    }

    // Marketing unsubscribes are honored for guest reminders too.
    const { count: unsubCount } = await supabase
      .from("email_unsubscribes").select("id", { count: "exact", head: true }).ilike("email", draft.email);
    if ((unsubCount ?? 0) > 0) {
      await completeGuest(draft.id);
      return false;
    }

    // They sent a guest Request to Buy / message for this listing: no nudge.
    const { count: leadCount } = await supabase
      .from("listing_leads").select("id", { count: "exact", head: true })
      .eq("listing_id", draft.listing_id).ilike("email", draft.email).gte("created_at", draft.created_at);
    if ((leadCount ?? 0) > 0) {
      await completeGuest(draft.id);
      return false;
    }

    // They signed in and continued: the signed-in draft (or the purchase) takes over.
    const signedInTable = draft.flow === "sale" ? "sale_checkout_drafts" : "booking_drafts";
    const { count: signedInCount } = await supabase
      .from(signedInTable).select("id", { count: "exact", head: true })
      .eq("listing_id", draft.listing_id).ilike("email", draft.email).gte("updated_at", draft.updated_at);
    if ((signedInCount ?? 0) > 0) {
      await completeGuest(draft.id);
      return false;
    }
    const { data: profiles } = await supabase
      .from("profiles").select("id").ilike("email", draft.email).limit(5);
    const ids = (profiles || []).map((p: any) => p.id);
    if (ids.length) {
      let committed = false;
      if (draft.flow === "sale") {
        const [{ data: txs }, { count: reqCount }] = await Promise.all([
          supabase.from("sale_transactions").select("status")
            .in("buyer_id", ids).eq("listing_id", draft.listing_id).gte("created_at", draft.created_at),
          supabase.from("sale_purchase_requests").select("id", { count: "exact", head: true })
            .in("buyer_id", ids).eq("listing_id", draft.listing_id).gte("created_at", draft.created_at),
        ]);
        committed = buyerCommitted((txs || []).map((t: any) => t.status), reqCount ?? 0);
      } else {
        const { count } = await supabase
          .from("booking_requests").select("id", { count: "exact", head: true })
          .in("shopper_id", ids).eq("listing_id", draft.listing_id).gte("created_at", draft.created_at);
        committed = (count ?? 0) > 0;
      }
      if (committed) {
        await completeGuest(draft.id);
        return false;
      }
    }

    const fmt = (d: string | null) =>
      d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined;

    const { error } = draft.flow === "sale"
      ? await invokeTransactionalEmail({
          templateName: "sale-checkout-abandoned",
          recipientEmail: draft.email,
          idempotencyKey: `guest-sale-abandon-${variant}-${draft.id}-${draft.updated_at}`,
          templateData: {
            listingTitle: listing!.title,
            totalPrice: money(draft.total_price),
            resumeUrl: saleResumeUrl(draft.resume_path, listing!.id, !!draft.request_only),
            requestOnly: !!draft.request_only,
            variant,
          },
        })
      : await invokeTransactionalEmail({
          templateName: "booking-abandoned",
          recipientEmail: draft.email,
          idempotencyKey: `guest-abandon-${variant}-${draft.id}-${draft.updated_at}`,
          templateData: {
            listingTitle: listing!.title,
            startDate: fmt(draft.start_date),
            endDate: fmt(draft.end_date),
            resumeUrl: `https://vendibook.com${
              typeof draft.resume_path === "string" && draft.resume_path.startsWith("/book/") && !draft.resume_path.startsWith("//")
                ? draft.resume_path
                : `/book/${listing!.id}`
            }`,
            variant,
          },
        });
    if (error) {
      errors.push(`guest-${variant}/${draft.id}: ${error.message}`);
      return false;
    }
    return true;
  };

  const { data: guest2h } = await supabase
    .from("guest_checkout_drafts").select("*")
    .is("completed_at", null).is("email_2h_sent_at", null)
    .lte("updated_at", cutoff2h).gt("updated_at", cutoff72h).limit(100);
  for (const draft of guest2h || []) {
    if (await sendGuestEmail(draft, "2h")) {
      await supabase.from("guest_checkout_drafts").update({ email_2h_sent_at: now.toISOString() }).eq("id", draft.id);
      guestSent2h++;
    }
  }

  const { data: guest24h } = await supabase
    .from("guest_checkout_drafts").select("*")
    .is("completed_at", null).is("email_24h_sent_at", null).not("email_2h_sent_at", "is", null)
    .lte("updated_at", cutoff24h).gt("updated_at", cutoff72h).limit(100);
  for (const draft of guest24h || []) {
    if (await sendGuestEmail(draft, "24h")) {
      await supabase.from("guest_checkout_drafts").update({ email_24h_sent_at: now.toISOString() }).eq("id", draft.id);
      guestSent24h++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent2h, sent24h, saleSent2h, saleSent24h, guestSent2h, guestSent24h, errors }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
