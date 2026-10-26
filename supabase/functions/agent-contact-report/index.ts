// Every-2-hours contact report (owner, 2026-10-26): what customers asked of
// every Vendibook agent and team inbox in the last two hours, emailed to the
// support inbox and the owner. Runs from pg_cron (dispatch_agent_contact_report)
// with the internal cron secret; admins can also trigger it.
//
// Covers: ElevenLabs conversations for Atlas, Allison and the phone line,
// phone-line callers and follow-up requests, Atlas/Allison follow-up tickets,
// overdue follow-ups, guest inquiries and their review queue, and member
// messages held, relayed or declined. Names and ticket links only, never
// customer phone numbers or email addresses.
import { createClient } from "npm:@supabase/supabase-js@2";
import { invokeTransactionalEmail } from "../_shared/invokeTransactionalEmail.ts";
import { getCaller, isAdminUser, isCronCaller } from "../_shared/callerGuard.ts";
import { formatEt } from "../_shared/followUpWindow.ts";

const REPORT_TO = ["support@vendibook.com", "atlasmom421@gmail.com"];
const WINDOW_MS = 2 * 60 * 60 * 1000;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

type Agent = { key: string; label: string; id: string | undefined };

/** ElevenLabs conversations per agent since `since`; null when the API is unavailable. */
async function agentCalls(agents: Agent[], since: Date) {
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (!key) return null;
  const out: Record<string, { conversations: number; minutes: number } | null> = {};
  for (const agent of agents) {
    if (!agent.id) { out[agent.key] = null; continue; }
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${encodeURIComponent(agent.id)}&call_start_after_unix=${Math.floor(since.getTime() / 1000)}&page_size=100`,
        { headers: { "xi-api-key": key }, signal: AbortSignal.timeout(10000) },
      );
      if (!res.ok) { out[agent.key] = null; continue; }
      const rows = ((await res.json())?.conversations ?? []) as Array<{ call_duration_secs?: number }>;
      out[agent.key] = {
        conversations: rows.length,
        minutes: Math.round(rows.reduce((sum, r) => sum + Number(r.call_duration_secs ?? 0), 0) / 60),
      };
    } catch {
      out[agent.key] = null;
    }
  }
  return out;
}

const firstLast = (name: string | null) => {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? `${parts[0]}${parts[1] ? ` ${parts[1][0]}.` : ""}` : "Unnamed";
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await isCronCaller(req))) {
    const caller = await getCaller(req);
    if (!caller || !(await isAdminUser(caller.id))) return json({ error: "Forbidden" }, 403);
  }
  const dryRun = (await req.json().catch(() => ({})))?.dry_run === true;

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
      auth: { persistSession: false },
    });
    const now = new Date();
    const since = new Date(now.getTime() - WINDOW_MS);
    const sinceIso = since.toISOString();

    const [tickets, overdue, leads, reviewQueue, relayed, declined, heldConv, heldBooking] = await Promise.all([
      db.from("support_tickets").select("id, reference_code, title, customer_name, submission_channel, request_id, priority, status, first_response_due_at")
        .gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(100),
      db.from("support_tickets").select("id", { count: "exact", head: true })
        .eq("category", "callback_request").is("first_response_at", null).lt("first_response_due_at", now.toISOString())
        .not("status", "in", "(resolved,closed)"),
      db.from("listing_leads").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
      db.from("managed_inquiry_messages").select("id", { count: "exact", head: true }).eq("held", true).is("sent_at", null),
      db.from("conversation_messages").select("id", { count: "exact", head: true }).gte("relayed_at", sinceIso),
      db.from("conversation_messages").select("id", { count: "exact", head: true }).gte("relay_declined_at", sinceIso),
      db.from("conversation_messages").select("id", { count: "exact", head: true })
        .eq("held_for_relay", true).is("relayed_at", null).is("relay_declined_at", null),
      db.from("booking_messages").select("id", { count: "exact", head: true })
        .eq("held_for_relay", true).is("relayed_at", null).is("relay_declined_at", null),
    ]);

    const rows = tickets.data ?? [];
    const phone = rows.filter((t) => t.submission_channel === "phone_agent");
    const phoneFollowUps = phone.filter((t) => t.priority === "high");
    const atlas = rows.filter((t) => String(t.request_id ?? "").startsWith("atlas-"));
    const otherTickets = rows.length - phone.length - atlas.length;

    const calls = await agentCalls([
      { key: "atlas", label: "Atlas", id: Deno.env.get("ATLAS_AGENT_ID") || "agent_1501m4rhvkz9fsbs5ce89zvk2k7b" },
      { key: "allison", label: "Allison", id: Deno.env.get("ALLISON_AGENT_ID") },
      { key: "phone", label: "Phone line", id: Deno.env.get("PHONE_AGENT_ID") },
    ], since);
    const callLine = (k: string) => {
      const c = calls?.[k];
      return c ? `${c.conversations} conversation${c.conversations === 1 ? "" : "s"}, ${c.minutes} min` : "not available";
    };

    const details = [
      { label: "Phone line calls", value: callLine("phone") },
      { label: "Phone callers who left details", value: String(phone.length) },
      { label: "Phone follow-ups requested", value: String(phoneFollowUps.length) },
      { label: "Atlas conversations", value: callLine("atlas") },
      { label: "Allison conversations", value: callLine("allison") },
      { label: "Atlas/Allison follow-up requests", value: String(atlas.length) },
      { label: "Other support tickets", value: String(otherTickets) },
      { label: "Follow-ups past due (all time)", value: String(overdue.count ?? 0) },
      { label: "Guest inquiries", value: String(leads.count ?? 0) },
      { label: "Guest messages awaiting review", value: String(reviewQueue.count ?? 0) },
      { label: "Member messages relayed", value: String(relayed.count ?? 0) },
      { label: "Member messages declined", value: String(declined.count ?? 0) },
      { label: "Member messages awaiting relay", value: String((heldConv.count ?? 0) + (heldBooking.count ?? 0)) },
    ];
    const recent = [...phone, ...atlas].slice(0, 10).map((t) =>
      `${t.reference_code} · ${t.submission_channel === "phone_agent" ? "Phone" : "Atlas/Allison"} · ${firstLast(t.customer_name)} · ${t.title.replace(/^Phone line( call)?: /, "")}${t.first_response_due_at ? ` · due ${formatEt(new Date(t.first_response_due_at))}` : ""}`
    );
    const total = rows.length + (leads.count ?? 0) + (relayed.count ?? 0) + (declined.count ?? 0);
    const windowLabel = `${formatEt(since)} – ${formatEt(now)} ET`;

    const report = { window: windowLabel, details, recent };
    if (dryRun) return json({ dry_run: true, ...report });

    const sent: string[] = [];
    for (const to of REPORT_TO) {
      const { error } = await invokeTransactionalEmail({
        templateName: "generic-notice",
        recipientEmail: to,
        idempotencyKey: `agent-contact-report:${since.toISOString().slice(0, 13)}:${to}`,
        templateData: {
          subject: `Vendibook contacts ${windowLabel}: ${total} new`,
          kicker: "2-hour contact report",
          heading: total ? `${total} new contact${total === 1 ? "" : "s"} in the last 2 hours` : "No new contacts in the last 2 hours",
          paragraphs: recent.length ? ["Most recent requests:", ...recent] : ["No phone or Atlas/Allison follow-up requests in this window."],
          details,
          ctaLabel: "Open support tickets",
          ctaUrl: "https://vendibook.com/admin/support",
        },
      });
      if (!error) sent.push(to);
    }
    return json({ ok: true, sent: sent.length, ...report });
  } catch (e) {
    console.error("[agent-contact-report] error", e);
    return json({ error: "Report failed" }, 500);
  }
});
