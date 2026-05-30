// Public endpoint — logs a referral link click and returns the destination URL.
// Called by /r/:code handler client-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DESTINATIONS: Record<string, string> = {
  supply: "/list",
  purchase: "/browse",
  rental: "/search",
};

async function hashIp(ip: string): Promise<string> {
  const buf = new TextEncoder().encode(`vendibook:${ip}`);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code, program_type, source } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "code required" }), { status: 400, headers: corsHeaders });
    }
    const normalized = code.trim().toUpperCase();
    const program = (program_type && DESTINATIONS[program_type]) ? program_type : "purchase";

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: lookup } = await admin.rpc("lookup_referral_code", { p_code: normalized });
    const ref = Array.isArray(lookup) ? lookup[0] : lookup;
    if (!ref) {
      return new Response(JSON.stringify({ error: "invalid_code" }), { status: 404, headers: corsHeaders });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ua = req.headers.get("user-agent") || "";
    const device = /Mobile|iPhone|Android/i.test(ua) ? "mobile" : /Tablet|iPad/i.test(ua) ? "tablet" : "desktop";

    await admin.from("referral_clicks").insert({
      code: normalized,
      program_type: program,
      destination_path: DESTINATIONS[program],
      hashed_ip: await hashIp(ip),
      user_agent: ua.slice(0, 500),
      device_type: device,
      source_header: (source || req.headers.get("referer") || "").slice(0, 500),
      country: req.headers.get("cf-ipcountry") || null,
      cookie_set: true,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        code: normalized,
        program_type: program,
        destination: DESTINATIONS[program],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
