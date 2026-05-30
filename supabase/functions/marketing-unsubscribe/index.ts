// marketing-unsubscribe — handles both GET (one-click via List-Unsubscribe) and POST.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { VENDIBOOK_BASE_URL } from "../_shared/marketing-templates/constants.ts";

async function unsubscribe(email: string) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  // upsert into unsubscribes (unique on lower(email))
  const { error } = await supabase
    .from("email_unsubscribes")
    .upsert({ email: email.toLowerCase(), unsubscribed_at: new Date().toISOString() }, { onConflict: "email" });
  if (error && !error.message.includes("duplicate")) console.error("unsub error", error);
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
