/**
 * booking-approval-watch — texts for rental requests an admin is watching.
 *
 * Event-driven: the booking_approval_watch_status trigger calls this the
 * moment a watched booking's status changes, and a one-time scheduled job
 * calls it at the watch's reminder time. Both paths go through the shared
 * SMS consent guard; each text is claimed in the watch row first so it can
 * only go out once.
 *   - status_change → booking approved/declined/cancelled: one text to the
 *     watching admin, then the watch closes.
 *   - reminder → booking still pending: one reminder text to the host with
 *     the link to approve.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getCaller, isAdminUser, isBackendCaller, serviceRoleClient } from "../_shared/callerGuard.ts";
import { normalizeNanpToE164 } from "../_shared/smsConsent.ts";
import { sendGuardedSms } from "../_shared/smsGuard.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SITE_URL = "https://vendibook.com";
const REQUESTS_URL = `${SITE_URL}/dashboard/activity?filter=requests`;
const SUPPORT_LINE = "(866) 690-6227";
const DECIDED = new Set(["approved", "declined", "cancelled", "completed"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const shortDate = (d: string | null) => {
  if (!d) return "";
  const dt = new Date(`${d}T12:00:00Z`);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

const firstName = (p: { first_name?: string | null; full_name?: string | null; display_name?: string | null } | null) =>
  (p?.first_name || p?.full_name?.split(" ")[0] || p?.display_name || "").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let allowed = await isBackendCaller(req);
  if (!allowed) {
    const caller = await getCaller(req);
    allowed = !!caller && (await isAdminUser(caller.id));
  }
  if (!allowed) return json({ error: "Forbidden" }, 403);

  const body = await req.json().catch(() => ({}));
  const bookingId = typeof body?.booking_id === "string" && UUID_RE.test(body.booking_id) ? body.booking_id : null;
  const event = body?.event === "reminder" ? "reminder" : body?.event === "status_change" ? "status_change" : null;
  if (!bookingId || !event) return json({ error: "booking_id and event (status_change | reminder) are required" }, 400);

  const db = serviceRoleClient();
  try {
    const { data: watch } = await db.from("booking_approval_watches")
      .select("id, admin_user_id, remind_host_at, host_reminded_at, admin_notified_at, closed_at")
      .eq("booking_id", bookingId).maybeSingle();
    if (!watch || watch.closed_at) return json({ ok: true, skipped: "no_open_watch" });

    const { data: booking } = await db.from("booking_requests")
      .select("id, status, host_id, shopper_id, listing_id, start_date, end_date")
      .eq("id", bookingId).maybeSingle();
    if (!booking) return json({ ok: true, skipped: "booking_missing" });

    const [{ data: listing }, { data: host }, { data: renter }] = await Promise.all([
      db.from("listings").select("title").eq("id", booking.listing_id).maybeSingle(),
      db.from("profiles").select("first_name, full_name, display_name, phone_number").eq("id", booking.host_id).maybeSingle(),
      db.from("profiles").select("first_name, full_name, display_name").eq("id", booking.shopper_id).maybeSingle(),
    ]);
    const dates = `${shortDate(booking.start_date)} - ${shortDate(booking.end_date)}`;
    const hostName = firstName(host) || "the host";
    const renterName = (renter?.full_name || firstName(renter) || "the renter").trim();
    const listingTitle = (listing?.title ?? "your listing").slice(0, 60);
    const ref = bookingId.slice(0, 8).toUpperCase();

    const finish = async (patch: Record<string, unknown>) => {
      await db.from("booking_approval_watches").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", watch.id);
    };

    // Host answered → one text to the watching admin, then close the watch.
    if (DECIDED.has(booking.status)) {
      const { data: claimed } = await db.from("booking_approval_watches")
        .update({ admin_notified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", watch.id).is("admin_notified_at", null).select("id").maybeSingle();
      if (!claimed) return json({ ok: true, skipped: "admin_already_notified" });

      const { data: admin } = await db.from("profiles").select("phone_number").eq("id", watch.admin_user_id).maybeSingle();
      const adminPhone = normalizeNanpToE164(admin?.phone_number ?? "");
      const verb = booking.status === "approved" ? "APPROVED" : booking.status.toUpperCase();
      const next = booking.status === "approved"
        ? `${renterName} has been sent the payment link.`
        : "No payment will be requested.";
      const result = adminPhone
        ? await sendGuardedSms({
          recipientPhone: adminPhone,
          category: "booking",
          templateId: "admin_booking_decision_alert",
          businessPurpose: `booking_approval_watch:${bookingId}`,
          templateVariables: { booking_id: bookingId, status: booking.status },
          body: `Vendibook alert: ${hostName} ${verb} booking #${ref} (${renterName}, ${dates}). ${next}`.slice(0, 320),
          idempotencyKey: `approval-admin-${bookingId}`,
        })
        : { ok: false as const, reason: "admin_phone_missing", logId: null };
      await finish({ closed_at: new Date().toISOString(), last_result: result.ok ? `admin_texted:${booking.status}` : `admin_text_failed:${result.reason}` });
      return json({ ok: result.ok, sent: "admin", status: booking.status, reason: result.ok ? undefined : result.reason });
    }

    // Still waiting at reminder time → one reminder text to the host.
    if (event === "reminder" && booking.status === "pending") {
      if (watch.host_reminded_at) return json({ ok: true, skipped: "host_already_reminded" });
      if (watch.remind_host_at && Date.now() < new Date(watch.remind_host_at).getTime() - 5 * 60_000) {
        return json({ ok: true, skipped: "too_early" });
      }
      const { data: claimed } = await db.from("booking_approval_watches")
        .update({ host_reminded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", watch.id).is("host_reminded_at", null).select("id").maybeSingle();
      if (!claimed) return json({ ok: true, skipped: "host_already_reminded" });

      const hostPhone = normalizeNanpToE164(host?.phone_number ?? "");
      const greeting = firstName(host) ? `Hi ${firstName(host)}` : "Hi";
      const result = hostPhone
        ? await sendGuardedSms({
          recipientPhone: hostPhone,
          userId: booking.host_id,
          category: "booking",
          templateId: "host_pending_request_reminder",
          businessPurpose: `booking_approval_watch:${bookingId}`,
          templateVariables: { booking_id: bookingId },
          body: `Vendibook: ${greeting}, friendly reminder - ${renterName} is still waiting on your answer for ${listingTitle} (${dates}). Approve or decline here: ${REQUESTS_URL} Questions? Call or text ${SUPPORT_LINE}. Reply STOP to opt out.`,
          idempotencyKey: `approval-reminder-${bookingId}`,
        })
        : { ok: false as const, reason: "host_phone_missing", logId: null };
      await finish({ last_result: result.ok ? "host_reminded" : `host_reminder_failed:${result.reason}` });
      return json({ ok: result.ok, sent: "host_reminder", reason: result.ok ? undefined : result.reason });
    }

    return json({ ok: true, skipped: `status_${booking.status}` });
  } catch (e) {
    console.error("[booking-approval-watch] error", e instanceof Error ? e.message : e);
    return json({ error: "Could not process the watch." }, 500);
  }
});
