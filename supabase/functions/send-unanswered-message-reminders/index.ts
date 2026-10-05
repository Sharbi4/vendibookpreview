// Reminds sellers about buyer messages they haven't answered, so a question
// doesn't sit for weeks (the Lilburn, GA rental thread went 18 days without a
// reply in Sept 2026). Uses the transactional email system (template
// 'message-reply-reminder', same layout as 'new-message') via
// invokeTransactionalEmail, so delivery, suppression and logging match every
// other notification.
//
// Steps per unanswered buyer message (last message in the thread is from the
// buyer, sent within the last 30 days):
//   24h+  -> reminder to the seller
//   then, 48h+ after that reminder -> final reminder + a heads-up to the
//   concierge inbox
// Steps go in order (an old thread gets the first reminder first, never
// "last reminder" out of the blue); sent steps are read from email_send_log.
// Each step is sent once per (conversation, last buyer message) via the
// pipeline's idempotency key, so a new buyer message restarts the clock.
// Sellers who turned off message emails are skipped.
//
// Quality gate: threads where the buyer is suspended, on a sending hold, or
// has an open message_safety_events row are never pushed to the seller.
//
// Auth: internal callers only (service-role bearer), e.g. an hourly cron.
// Pass {"dry_run": true} to list what would be sent without sending.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { isInternalCaller, internalOnlyResponse } from "../_shared/internalAuth.ts";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { maskContactDetails } from "../_shared/contactPatterns.ts";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://vendibook.com";
const SUPPORT_INBOX = "support@vendibook.com";
const HOUR = 60 * 60 * 1000;
const FIRST_AFTER_MS = 24 * HOUR;
const FINAL_AFTER_FIRST_MS = 48 * HOUR;
const keyFor = (step: "24h" | "72h", messageId: string) => `unanswered-msg-${step}-${messageId}`;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Conversation = { id: string; listing_id: string; host_id: string; shopper_id: string };
type Message = { id: string; conversation_id: string; sender_id: string; message: string; created_at: string };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!isInternalCaller(req)) return internalOnlyResponse(corsHeaders);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;
    const now = Date.now();
    const since = new Date(now - 30 * 24 * HOUR).toISOString();

    const { data: convRows, error: convErr } = await admin
      .from("conversations")
      .select("id, listing_id, host_id, shopper_id")
      .gte("last_message_at", since);
    if (convErr) throw new Error(convErr.message);
    const conversations = (convRows ?? []) as Conversation[];
    if (!conversations.length) return json({ ok: true, candidates: 0, sent: 0 });

    // Latest message per conversation.
    const latest = new Map<string, Message>();
    const ids = conversations.map((c) => c.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await admin
        .from("conversation_messages")
        .select("id, conversation_id, sender_id, message, created_at")
        .in("conversation_id", ids.slice(i, i + 200))
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      for (const m of (data ?? []) as Message[]) if (!latest.has(m.conversation_id)) latest.set(m.conversation_id, m);
    }

    // Unanswered = last message is from the buyer and old enough for step 1.
    const waiting = conversations.filter((c) => {
      const m = latest.get(c.id);
      return !!m && m.sender_id === c.shopper_id && now - new Date(m.created_at).getTime() >= FIRST_AFTER_MS;
    });
    if (!waiting.length) return json({ ok: true, candidates: 0, sent: 0 });

    const buyerIds = [...new Set(waiting.map((c) => c.shopper_id))];
    const hostIds = [...new Set(waiting.map((c) => c.host_id))];
    const listingIds = [...new Set(waiting.map((c) => c.listing_id))];
    const [{ data: buyers }, { data: holds }, { data: events }, { data: hosts }, { data: prefs }, { data: listings }] = await Promise.all([
      admin.from("profiles").select("id, account_suspended").in("id", buyerIds),
      admin.from("message_sending_holds").select("user_id").in("user_id", buyerIds),
      admin.from("message_safety_events").select("user_id").eq("status", "open").in("user_id", buyerIds),
      admin.from("profiles").select("id, email, first_name").in("id", hostIds),
      admin.from("notification_preferences").select("user_id, message_email").in("user_id", hostIds),
      admin.from("listings").select("id, title, status, deleted_at").in("id", listingIds),
    ]);
    const blockedBuyers = new Set<string>([
      ...((buyers ?? []) as { id: string; account_suspended: boolean | null }[]).filter((b) => b.account_suspended).map((b) => b.id),
      ...((holds ?? []) as { user_id: string }[]).map((h) => h.user_id),
      ...((events ?? []) as { user_id: string }[]).map((e) => e.user_id),
    ]);
    const hostById = new Map(((hosts ?? []) as { id: string; email: string | null; first_name: string | null }[]).map((h) => [h.id, h]));
    const emailOff = new Set(((prefs ?? []) as { user_id: string; message_email: boolean }[]).filter((p) => p.message_email === false).map((p) => p.user_id));
    const listingById = new Map(((listings ?? []) as { id: string; title: string | null; status: string; deleted_at: string | null }[]).map((l) => [l.id, l]));

    // Which reminder steps already went out (and when), per buyer message.
    const keys = waiting.flatMap((c) => {
      const m = latest.get(c.id)!;
      return [keyFor("24h", m.id), keyFor("72h", m.id)];
    });
    const sentAt = new Map<string, number>();
    for (let i = 0; i < keys.length; i += 200) {
      const { data } = await admin.from("email_send_log").select("idempotency_key, created_at")
        .eq("status", "sent").in("idempotency_key", keys.slice(i, i + 200));
      for (const r of (data ?? []) as { idempotency_key: string; created_at: string }[]) {
        sentAt.set(r.idempotency_key, new Date(r.created_at).getTime());
      }
    }

    const planned: Array<{ conversation_id: string; step: string; skipped?: string }> = [];
    let sent = 0;
    for (const c of waiting) {
      const m = latest.get(c.id)!;
      const ageMs = now - new Date(m.created_at).getTime();
      const firstAt = sentAt.get(keyFor("24h", m.id));
      if (sentAt.has(keyFor("72h", m.id))) continue; // both reminders done
      if (firstAt !== undefined && now - firstAt < FINAL_AFTER_FIRST_MS) continue; // too soon for final
      const step = { key: firstAt === undefined ? "24h" : "72h" } as { key: "24h" | "72h" };
      const listing = listingById.get(c.listing_id);
      const host = hostById.get(c.host_id);
      const skip =
        blockedBuyers.has(c.shopper_id) ? "buyer flagged" :
        !listing || listing.status !== "published" || listing.deleted_at ? "listing not live" :
        emailOff.has(c.host_id) ? "seller turned off message emails" :
        !host?.email || !isMailableAddress(host.email) ? "no mailable seller email" : null;
      if (skip) { planned.push({ conversation_id: c.id, step: step.key, skipped: skip }); continue; }

      planned.push({ conversation_id: c.id, step: step.key });
      if (dryRun) continue;

      const title = String(listing!.title ?? "your listing").trim();
      const question = maskContactDetails(String(m.message ?? "").trim()).slice(0, 400) || "(attachment)";
      const hours = Math.floor(ageMs / HOUR);
      const waitingLabel = hours >= 48 ? `${Math.floor(hours / 24)} days` : `${hours} hours`;
      const final = step.key === "72h";
      const { error } = await invokeTransactionalEmail({
        templateName: "message-reply-reminder",
        recipientEmail: host!.email!.trim().toLowerCase(),
        idempotencyKey: keyFor(step.key, m.id),
        templateData: {
          recipientName: host!.first_name ?? undefined,
          listingTitle: title,
          messagePreview: question,
          conversationId: c.id,
          waitingLabel,
          final,
        },
        metadata: { conversation_id: c.id, step: step.key },
      });
      if (error) {
        console.error("[unanswered-message-reminders] send failed", { conversation: c.id, step: step.key }, error);
        continue;
      }
      sent++;
      if (final) {
        await invokeTransactionalEmail({
          templateName: "support-reply",
          recipientEmail: SUPPORT_INBOX,
          idempotencyKey: `unanswered-msg-concierge-${m.id}`,
          templateData: {
            firstName: "Vendibook Concierge",
            subject: `Buyer waiting ${waitingLabel}: ${title}`,
            bodyParagraphs: [
              `Conversation ${c.id} on ${SITE_URL}/listing/${c.listing_id}: the buyer's last message is ${waitingLabel} old and the seller has had two reminders.`,
              `Their question: "${question}"`,
              "Consider calling the seller, or offering the buyer similar live listings.",
            ],
            signedBy: "Vendibook Lead Router",
            signedTitle: "Internal Notification",
          },
        });
      }
    }

    return json({ ok: true, dry_run: dryRun, candidates: waiting.length, sent, planned });
  } catch (e) {
    console.error("send-unanswered-message-reminders error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
