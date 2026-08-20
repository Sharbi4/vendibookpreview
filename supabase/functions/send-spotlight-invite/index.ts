// Vendibook Business Spotlight invitation campaign.
//
// Admin-gated. Modes: preview_count | preview_html | test | broadcast.
// Broadcast requires an explicit confirmation string, so previewing and test
// sends can never mail the audience by accident.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { isMailableAddress } from "../_shared/marketingAudience.ts";
import { isInternalCaller } from "../_shared/internalAuth.ts";
import {
  SPOTLIGHT_CAMPAIGN_ID,
  SPOTLIGHT_SUBJECTS,
  buildSpotlightInviteHtml,
  buildSpotlightInviteText,
  type SpotlightSubjectVariant,
} from "../_shared/marketing-templates/business-spotlight-invite.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM = "Vendibook <report@updates.vendibook.com>";
const REPLY_TO = "support@vendibook.com";
const CAMPAIGN_ID = SPOTLIGHT_CAMPAIGN_ID;
const TEST_TITLE_PREFIXES = ["Demo%", "QA %", "QA_%", "QA-%", "Test %", "E2E %", "Smoke %"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Recipient = { email: string; user_id: string; first_name?: string | null };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey);

    // Trusted backend callers (service-role key) may drive the campaign
    // directly; everyone else must present an admin end-user JWT.
    const internal = isInternalCaller(req);
    let callerId: string | null = null;

    if (!internal) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      if (!token) return json({ error: "Unauthorized" }, 401);

      const { data: userRes } = await admin.auth.getUser(token);
      callerId = userRes?.user?.id ?? null;
      if (!callerId) {
        const fallback = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: alt } = await fallback.auth.getUser();
        callerId = alt?.user?.id ?? null;
      }
      if (!callerId) return json({ error: "Unauthorized" }, 401);

      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
    }


    const body = await req.json().catch(() => ({}));
    const mode: "preview_count" | "preview_html" | "test" | "broadcast" = body.mode ?? "preview_count";
    const variant: SpotlightSubjectVariant = body.variant === "b" ? "b" : "a";
    const subject = SPOTLIGHT_SUBJECTS[variant];

    const unsubFor = (email: string) =>
      `${supabaseUrl}/functions/v1/marketing-unsubscribe?e=${encodeURIComponent(email)}`;

    if (mode === "preview_html") {
      return json({
        subject,
        variant,
        html: buildSpotlightInviteHtml(unsubFor("preview@vendibook.com"), {
          firstName: body.previewFirstName ?? null,
          businessName: body.previewBusinessName ?? null,
        }),
        text: buildSpotlightInviteText(unsubFor("preview@vendibook.com")),
      });
    }

    // ---- segment ----
    // Default: every Vendibook account holder with an email, minus opt-outs.
    // audience: "hosts" narrows to people with a published listing.
    const audience: "all" | "hosts" = body.audience === "hosts" ? "hosts" : "all";

    let hostIds: string[] = [];
    let publishedListings = 0;

    if (audience === "hosts") {
      let listingQuery = admin
        .from("listings")
        .select("host_id")
        .is("deleted_at", null)
        .eq("status", "published");
      for (const p of TEST_TITLE_PREFIXES) listingQuery = listingQuery.not("title", "ilike", p);

      const { data: listings, error: listingError } = await listingQuery;
      if (listingError) return json({ error: `Segment query failed: ${listingError.message}` }, 500);
      publishedListings = (listings ?? []).length;
      hostIds = Array.from(
        new Set((listings ?? []).map((l: any) => l.host_id).filter(Boolean)),
      ) as string[];
    }

    // Paginated profile fetch so large audiences are not truncated at 1000 rows.
    const allProfiles: any[] = [];
    const PAGE = 1000;
    for (let from = 0; from < 100000; from += PAGE) {
      let q = admin
        .from("profiles")
        .select("id, email, first_name")
        .order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (audience === "hosts") {
        if (!hostIds.length) break;
        q = q.in("id", hostIds);
      }
      const { data: page, error: pageError } = await q;
      if (pageError) return json({ error: `Profile query failed: ${pageError.message}` }, 500);
      allProfiles.push(...(page ?? []));
      if (!page || page.length < PAGE) break;
    }

    const [{ data: profiles }, { data: unsubs }, { data: suppressed }, { data: alreadySent }] =
      await Promise.all([
        Promise.resolve({ data: allProfiles }),
        admin.from("email_unsubscribes").select("email"),
        admin.from("suppressed_emails").select("email"),
        admin
          .from("blog_campaign_sends")
          .select("email, user_id")
          .eq("campaign_id", CAMPAIGN_ID)
          .eq("is_test", false)
          .eq("status", "sent"),
      ]);

    const blocked = new Set<string>();
    for (const r of [...(unsubs ?? []), ...(suppressed ?? [])]) {
      if (r?.email) blocked.add(String(r.email).toLowerCase());
    }
    const sentEmails = new Set((alreadySent ?? []).map((r: any) => String(r.email ?? "").toLowerCase()));
    const sentUsers = new Set((alreadySent ?? []).map((r: any) => r.user_id).filter(Boolean));

    let missingEmail = 0;
    let invalidEmail = 0;
    let suppressedCount = 0;
    let alreadySentCount = 0;

    const byUser = new Map<string, Recipient>();
    const seenEmail = new Set<string>();

    for (const p of (profiles ?? []) as any[]) {
      const email = String(p?.email ?? "").trim().toLowerCase();
      if (!email) { missingEmail++; continue; }
      if (!isMailableAddress(email)) { invalidEmail++; continue; }
      if (blocked.has(email)) { suppressedCount++; continue; }
      if (sentEmails.has(email) || sentUsers.has(p.id)) { alreadySentCount++; continue; }
      if (byUser.has(p.id) || seenEmail.has(email)) continue;
      seenEmail.add(email);
      byUser.set(p.id, { email, user_id: p.id, first_name: p.first_name ?? null });
    }

    const recipients = Array.from(byUser.values());
    const counts = {
      audience,
      publishedListings,
      totalAccounts: allProfiles.length,
      mailable: recipients.length,
      missingEmail,
      invalidEmail,
      suppressed: suppressedCount,
      alreadySent: alreadySentCount,
    };

    if (mode === "preview_count") {
      return json({
        campaignId: CAMPAIGN_ID,
        subject,
        eligibleRecipients: recipients.length,
        counts,
        sample: recipients.slice(0, 5).map((r) => r.email),
        consentNote:
          "Community invitation sent to Vendibook account holders with a published listing. One-click unsubscribe on every message; suppressed and already-sent addresses are skipped.",
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500);
    const resend = new Resend(resendKey);

    const isTest = mode === "test";
    let queue: Recipient[] = recipients;

    if (isTest) {
      const testEmail = String(body.testEmail ?? "").trim().toLowerCase();
      if (!isMailableAddress(testEmail)) return json({ error: "Valid testEmail required" }, 400);
      queue = [{ email: testEmail, user_id: callerId ?? "00000000-0000-0000-0000-000000000000", first_name: body.previewFirstName ?? null }];
    } else {
      if (body.confirm !== CAMPAIGN_ID) {
        return json({ error: "Broadcast requires explicit approval confirmation." }, 400);
      }
      if (!queue.length) {
        return json({ ok: true, mode, campaignId: CAMPAIGN_ID, attempted: 0, sent: 0, failed: 0, counts });
      }
    }

    let sent = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const r of queue) {
      const unsubUrl = unsubFor(r.email);
      const personalization = { firstName: r.first_name ?? null, businessName: null };
      try {
        const { data, error } = await resend.emails.send({
          from: FROM,
          to: [r.email],
          subject,
          html: buildSpotlightInviteHtml(unsubUrl, personalization),
          text: buildSpotlightInviteText(unsubUrl, personalization),
          reply_to: REPLY_TO,
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
          tags: [
            { name: "type", value: "community" },
            { name: "campaign", value: "business_spotlight_invite" },
          ],
        });
        if (error) throw new Error(error.message);
        sent++;
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID,
          user_id: r.user_id,
          email: r.email,
          status: "sent",
          resend_message_id: data?.id ?? null,
          is_test: isTest,
        });
      } catch (e) {
        failed++;
        const message = (e as Error).message;
        failures.push({ email: r.email, error: message });
        await admin.from("blog_campaign_sends").insert({
          campaign_id: CAMPAIGN_ID,
          user_id: r.user_id,
          email: r.email,
          status: "failed",
          error_message: message,
          is_test: isTest,
        });
      }
      await sleep(550);
    }

    return json({
      ok: true,
      mode,
      campaignId: CAMPAIGN_ID,
      attempted: queue.length,
      sent,
      failed,
      counts,
      failures: failures.slice(0, 20),
    });
  } catch (e) {
    console.error("send-spotlight-invite error:", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
