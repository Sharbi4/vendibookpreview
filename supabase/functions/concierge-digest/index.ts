import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendTransactionalEmailInternal } from "../_shared/invokeTransactionalEmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Daily concierge digest:
// - Finds users with low-priority unread concierge messages from the past 24h
// - Sends a single summary email instead of pinging them all day
// Intended to be invoked by pg_cron once per day.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find users with low/normal priority unread messages
    const { data: threads } = await supabase
      .from("concierge_threads")
      .select("user_id, topic, priority, unread_count, last_message_at")
      .gt("unread_count", 0)
      .in("priority", ["low", "normal"])
      .gte("last_message_at", since);

    const byUser = new Map<string, any[]>();
    (threads ?? []).forEach((t) => {
      const arr = byUser.get(t.user_id) ?? [];
      arr.push(t);
      byUser.set(t.user_id, arr);
    });

    let sent = 0;
    for (const [userId, items] of byUser.entries()) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, first_name, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (!profile?.email) continue;

      try {
        const res = await sendTransactionalEmailInternal({
          templateName: "shopper-daily-digest",
          recipientEmail: profile.email,
          idempotencyKey: `concierge-digest-${userId}-${new Date().toISOString().slice(0, 10)}`,
          templateData: {
            first_name: profile.first_name || profile.full_name || "there",
            items: items.map((i) => ({
              topic: i.topic,
              priority: i.priority,
              unread: i.unread_count,
            })),
            cta_url: "https://vendibook.com/dashboard",
          },
        });
        if (!res.ok) {
          console.error("digest send failed for", userId, res.status, res.body);
          continue;
        }
        sent++;
      } catch (e) {
        console.error("digest send failed for", userId, e);
      }
    }

    return new Response(JSON.stringify({ success: true, users_emailed: sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("concierge-digest error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
