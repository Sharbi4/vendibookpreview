// marketing-unsubscribe — handles both GET (one-click via List-Unsubscribe) and POST.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { VENDIBOOK_BASE_URL } from "../_shared/marketing-templates/constants.ts";

async function unsubscribe(email: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const lower = email.toLowerCase();
  const now = new Date().toISOString();

  // Write to ALL suppression sources so every sender (marketing, transactional,
  // newsletter, broadcast) will skip this address going forward.
  const [a, b, c] = await Promise.all([
    supabase
      .from("email_unsubscribes")
      .upsert({ email: lower, unsubscribed_at: now }, { onConflict: "email" }),
    supabase
      .from("suppressed_emails")
      // scope 'marketing' — must NOT block receipts/booking mail.
      .upsert({ email: lower, reason: "unsubscribe", scope: "marketing" }, { onConflict: "email" }),
    supabase
      .from("newsletter_subscribers")
      .upsert(
        { email: lower, source: "unsubscribe", unsubscribed_at: now },
        { onConflict: "email" }
      ),
  ]);
  if (a.error && !a.error.message.includes("duplicate")) console.error("email_unsubscribes", a.error);
  if (b.error && !b.error.message.includes("duplicate")) console.error("suppressed_emails", b.error);
  if (c.error && !c.error.message.includes("duplicate")) console.error("newsletter_subscribers", c.error);
}

const PAGE = (email: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:-apple-system,sans-serif;background:#08080a;color:#f4f4f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px;}
.card{max-width:480px;}h1{font-size:24px;margin:0 0 12px;}p{color:#a1a1aa;line-height:1.6;}a{color:#FF5124;}</style>
</head><body><div class="card">
<h1>You've been unsubscribed</h1>
<p>${email} will no longer receive The Vendibook Report.</p>
<p><a href="${VENDIBOOK_BASE_URL}">Return to Vendibook →</a></p>
</div></body></html>`;

serve(async (req) => {
  const url = new URL(req.url);
  let email = url.searchParams.get("e") ?? "";
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body.email) email = body.email;
    } catch { /* ignore */ }
  }
  if (!email) return new Response("Missing email", { status: 400 });
  await unsubscribe(email);
  return new Response(PAGE(email), { status: 200, headers: { "Content-Type": "text/html" } });
});
