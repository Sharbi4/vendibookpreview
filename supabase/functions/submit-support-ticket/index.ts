// Submits a support ticket. Server-side is the only path that:
//   - Determines priority from category (users can never escalate their own tickets)
//   - Sends the user confirmation email and admin notification
//   - Guards against duplicate submissions via idempotency key
//
// The client is only trusted for description content and non-sensitive context.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { forwardTicketToTawk } from "../_shared/tawkForward.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const URGENT_CATEGORIES = new Set([
  "suspected_fraud",
  "unauthorized_transaction",
  "security_privacy",
  "seller_did_not_receive_payment",
  "item_not_received",
  "cannot_access_purchase",
]);

const HIGH_CATEGORIES = new Set([
  "listing_will_not_publish",
  "permit_path_will_not_save",
  "purchase_cannot_progress",
  "rental_cannot_progress",
  "cannot_access_draft",
  "confirmation_action_failed",
  "payment_issue",
  "pay_in_person_confirmation",
]);

function derivePriority(category: string, isBlocking: boolean): "urgent" | "high" | "normal" | "low" {
  if (URGENT_CATEGORIES.has(category)) return "urgent";
  if (HIGH_CATEGORIES.has(category)) return "high";
  if (isBlocking) return "high";
  return "normal";
}

interface Payload {
  feature_area: string;
  category: string;
  title: string;
  description: string;
  what_i_was_doing?: string;
  what_happened_instead?: string;
  is_blocking?: boolean;
  reply_email?: string;
  related_listing_id?: string | null;
  related_sale_transaction_id?: string | null;
  related_booking_id?: string | null;
  related_permit_roadmap_id?: string | null;
  related_draft_id?: string | null;
  related_conversation_id?: string | null;
  related_review_id?: string | null;
  related_reported_user_id?: string | null;
  page_url?: string;
  wizard_step?: string;
  transaction_status?: string;
  payment_method?: string;
  browser_info?: string;
  device_type?: string;
  last_error_id?: string | null;
  last_error_category?: string;
  request_id?: string;
  app_version?: string;
  attachment_storage_paths?: Array<{ path: string; name: string; content_type?: string; size?: number }>;
  idempotency_key?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) throw new Error("Not authenticated");

    const svc = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userErr } = await svc.auth.getUser(auth.replace("Bearer ", ""));
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const body: Payload = await req.json();

    // Basic validation
    const title = (body.title ?? "").trim();
    const description = (body.description ?? "").trim();
    const category = (body.category ?? "").trim();
    const featureArea = (body.feature_area ?? "").trim();

    if (title.length < 3 || title.length > 200) throw new Error("Title must be 3–200 characters.");
    if (description.length < 10 || description.length > 5000) throw new Error("Description must be 10–5000 characters.");
    if (!category) throw new Error("Category is required.");
    if (!featureArea) throw new Error("Feature area is required.");

    // Idempotency: if the same user submits the same key within 24h, return existing ticket.
    if (body.idempotency_key) {
      const { data: existing } = await svc
        .from("support_tickets")
        .select("id, reference_code")
        .eq("user_id", user.id)
        .eq("request_id", body.idempotency_key)
        .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ticket_id: existing.id, reference_code: existing.reference_code, deduped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    let priority = derivePriority(category, !!body.is_blocking);

    // Paid-tier support elevation: Growth (Pro) subscribers get their tickets
    // bumped one level (normal → high), Operator (Premium) get bumped to urgent.
    // Category-derived urgent/high always wins — this only ever raises priority.
    try {
      const { data: sub } = await svc
        .from("host_subscriptions")
        .select("tier,status")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing", "past_due"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tierRaw = (sub?.tier ?? "").toLowerCase();
      const isPro = /pro|growth/.test(tierRaw);
      const isOperator = /premium|operator/.test(tierRaw);
      if (isOperator && priority !== "urgent") priority = "urgent";
      else if (isPro && priority === "normal") priority = "high";
      else if (isPro && priority === "low") priority = "high";
    } catch (_err) {
      // Non-fatal — fall back to category-derived priority.
    }

    const insertPayload = {
      user_id: user.id,
      feature_area: featureArea,
      category,
      priority,
      title,
      description,
      what_i_was_doing: body.what_i_was_doing?.slice(0, 2000) || null,
      what_happened_instead: body.what_happened_instead?.slice(0, 2000) || null,
      is_blocking: !!body.is_blocking,
      reply_email: body.reply_email?.slice(0, 255) || user.email || null,
      related_listing_id: body.related_listing_id || null,
      related_sale_transaction_id: body.related_sale_transaction_id || null,
      related_booking_id: body.related_booking_id || null,
      related_permit_roadmap_id: body.related_permit_roadmap_id || null,
      related_draft_id: body.related_draft_id || null,
      related_conversation_id: body.related_conversation_id || null,
      related_review_id: body.related_review_id || null,
      related_reported_user_id: body.related_reported_user_id || null,
      page_url: body.page_url?.slice(0, 500) || null,
      wizard_step: body.wizard_step?.slice(0, 100) || null,
      transaction_status: body.transaction_status?.slice(0, 50) || null,
      payment_method: body.payment_method?.slice(0, 50) || null,
      browser_info: body.browser_info?.slice(0, 500) || null,
      device_type: body.device_type?.slice(0, 50) || null,
      last_error_id: body.last_error_id || null,
      last_error_category: body.last_error_category?.slice(0, 100) || null,
      request_id: body.idempotency_key?.slice(0, 100) || body.request_id?.slice(0, 100) || null,
      app_version: body.app_version?.slice(0, 50) || null,
    };

    const { data: ticket, error: insertErr } = await svc
      .from("support_tickets")
      .insert(insertPayload)
      .select("id, reference_code, priority, feature_area, category, title, created_at")
      .single();

    if (insertErr || !ticket) throw new Error(`Failed to create ticket: ${insertErr?.message ?? "unknown"}`);

    // Attach uploaded files (client uploaded to storage first).
    if (body.attachment_storage_paths?.length) {
      const attachRows = body.attachment_storage_paths.slice(0, 10).map((a) => ({
        ticket_id: ticket.id,
        uploaded_by: user.id,
        storage_path: a.path,
        file_name: a.name,
        content_type: a.content_type || null,
        size_bytes: a.size || null,
      }));
      await svc.from("support_ticket_attachments").insert(attachRows);
    }

    // Send confirmation email to the user (best-effort — never blocks the ticket).
    const recipient = insertPayload.reply_email;
    if (recipient) {
      try {
        await svc.functions.invoke("send-transactional-email", {
          body: {
            templateName: "generic-notice",
            recipientEmail: recipient,
            idempotencyKey: `support-ticket-received-${ticket.id}`,
            templateData: {
              subject: `We received your report — ${ticket.reference_code}`,
              kicker: "Support ticket received",
              heading: "Thanks — we're on it.",
              greeting: `Hi${user.user_metadata?.first_name ? " " + user.user_metadata.first_name : ""},`,
              paragraphs: [
                `Vendibook Customer Success received your report. Your reference number is ${ticket.reference_code} — please keep it for any follow-up.`,
                "You can reply to this email with anything else that might help us investigate. Screenshots are welcome.",
              ],
              details: [
                { label: "Reference", value: ticket.reference_code, mono: true },
                { label: "Category", value: category.replace(/_/g, " ") },
                { label: "What you told us", value: title },
              ],
              ctaLabel: "Go to Vendibook",
              ctaUrl: "https://vendibook.com/dashboard",
              footnote: "Questions? Call (725) 755-9598 (Mon–Fri 9am–5pm AZ). We do not promise a fixed response window — urgent reports (fraud, payment problems, safety) get first priority.",
            },
          },
        });
      } catch (e) {
        console.error("[submit-support-ticket] confirmation email failed", e);
      }
    }

    // Admin notification: create in-app notifications for every admin, and email support inbox.
    try {
      const { data: admins } = await svc.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await svc.from("notifications").insert(
          admins.map((a: { user_id: string }) => ({
            user_id: a.user_id,
            type: "support_ticket",
            title: `${priority === "urgent" ? "🚨 URGENT" : priority === "high" ? "⚠️ High" : "New"} report — ${ticket.reference_code}`,
            message: title.slice(0, 200),
            link: `/admin/support?ticket=${ticket.id}`,
          })),
        );
      }

      await svc.functions.invoke("send-transactional-email", {
        body: {
          templateName: "generic-notice",
          recipientEmail: "support@vendibook.com",
          idempotencyKey: `support-ticket-admin-${ticket.id}`,
          templateData: {
            subject: `[${priority.toUpperCase()}] Support ticket ${ticket.reference_code} — ${featureArea}`,
            kicker: `${priority} priority`,
            heading: title,
            paragraphs: [
              description.slice(0, 1500),
            ],
            details: [
              { label: "Reference", value: ticket.reference_code, mono: true },
              { label: "User", value: user.email || user.id },
              { label: "Feature", value: featureArea },
              { label: "Category", value: category.replace(/_/g, " ") },
              { label: "Blocking?", value: body.is_blocking ? "Yes" : "No" },
              { label: "Page", value: insertPayload.page_url || "—" },
            ],
            ctaLabel: "Open in admin",
            ctaUrl: `https://vendibook.com/admin/support?ticket=${ticket.id}`,
          },
        },
      });
    } catch (e) {
      console.error("[submit-support-ticket] admin notify failed", e);
    }

    // Forward to private Tawk inbound-mail address (server-side only).
    // Delivery outcome is written back to the ticket row; failures never
    // block the customer response because the ticket is already persisted.
    let forwardingStatus: string = "skipped";
    try {
      const fwd = await forwardTicketToTawk({
        referenceCode: ticket.reference_code,
        ticketId: ticket.id,
        subject: title,
        priority,
        category,
        featureArea,
        source: "in_app",
        customerName: user.user_metadata?.full_name ?? null,
        customerEmail: recipient,
        emailVerified: !!user.email_confirmed_at,
        callbackPhone: null,
        bodyText: description,
        context: {
          is_blocking: body.is_blocking,
          page_url: insertPayload.page_url,
          wizard_step: insertPayload.wizard_step,
          transaction_status: insertPayload.transaction_status,
        },
        replyTo: recipient,
      });
      forwardingStatus = fwd.status;
      await svc.from("support_tickets").update({
        forwarding_status: fwd.status,
        forwarding_last_error: fwd.error ?? null,
        forwarded_at: fwd.status === "delivered" ? new Date().toISOString() : null,
      }).eq("id", ticket.id);
    } catch (e) {
      console.error("[submit-support-ticket] tawk forward failed", e);
    }

    return new Response(
      JSON.stringify({
        ticket_id: ticket.id,
        reference_code: ticket.reference_code,
        priority: ticket.priority,
        forwarding_status: forwardingStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[submit-support-ticket] ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
