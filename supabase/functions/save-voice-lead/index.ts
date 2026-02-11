import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { summary, intent_type, category, location, dates, budget, listing_mode, raw_transcript, session_id, metadata } = await req.json();

    if (!summary || typeof summary !== "string") {
      return new Response(
        JSON.stringify({ error: "summary is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to extract user_id from auth header
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
      if (token !== anonKey) {
        const userClient = createClient(supabaseUrl, anonKey!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: { user } } = await userClient.auth.getUser(token);
        user_id = user?.id || null;
      }
    }

    const { error } = await supabase.from("voice_agent_leads").insert({
      user_id,
      session_id: session_id || null,
      intent_type: intent_type || "other",
      category: category || null,
      location: location || null,
      dates: dates || null,
      budget: budget || null,
      listing_mode: listing_mode || null,
      summary: summary.substring(0, 2000),
      raw_transcript: raw_transcript?.substring(0, 5000) || null,
      metadata: metadata || {},
    });

    if (error) {
      console.error("Insert error:", error);
      throw new Error("Failed to save lead");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Save voice lead error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
