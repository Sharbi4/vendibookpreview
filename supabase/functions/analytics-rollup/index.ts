import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isInternalCaller } from "../_shared/internalAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * analytics-rollup
 * Aggregates listing_views + booking_requests + sale_transactions into
 * listing_analytics_daily for one host.
 *
 * POST { host_id?: string, days?: number = 30 }
 *
 * Authorization: the host ID is always derived from the caller's verified
 * session. A client-supplied host_id override is honored only for internal
 * service-role callers (cron) or signed-in admins — never for public traffic.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let body: { host_id?: string; days?: number } = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const days = Math.min(Math.max(body.days || 30, 1), 365);

    const authHeader = req.headers.get("Authorization");
    let hostId: string | undefined;

    if (isInternalCaller(req)) {
      // Trusted backend caller (cron / service role) may target any host.
      hostId = body.host_id;
    } else if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await userClient.auth.getUser();
      const userId = u?.user?.id;
      if (!userId) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      hostId = userId;
      // A host_id different from the caller's own ID requires admin role.
      if (body.host_id && body.host_id !== userId) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (isAdmin) {
          hostId = body.host_id;
        }
      }
    }

    if (!hostId) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: listings } = await supabase
      .from("listings")
      .select("id, host_id")
      .eq("host_id", hostId);
    if (!listings || listings.length === 0) {
      return new Response(JSON.stringify({ rolled_up: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const listingIds = listings.map((l) => l.id);

    // Fetch raw events
    const [viewsRes, bookingsRes, salesRes] = await Promise.all([
      supabase
        .from("listing_views")
        .select("listing_id, viewer_id, viewed_at, referrer")
        .in("listing_id", listingIds)
        .gte("viewed_at", since.toISOString()),
      supabase
        .from("booking_requests")
        .select("listing_id, created_at, total_price, payment_status, status")
        .in("listing_id", listingIds)
        .gte("created_at", since.toISOString()),
      supabase
        .from("sale_transactions")
        .select("listing_id, created_at, amount, status")
        .in("listing_id", listingIds)
        .gte("created_at", since.toISOString()),
    ]);

    type Row = {
      listing_id: string;
      host_id: string;
      date: string;
      views: number;
      unique_viewers: number;
      inquiries: number;
      bookings: number;
      revenue: number;
      source_breakdown: Record<string, number>;
      _viewers: Set<string>;
    };
    const map = new Map<string, Row>();
    const key = (lid: string, d: string) => `${lid}__${d}`;
    const dayOf = (iso: string) => iso.split("T")[0];

    const ensure = (lid: string, date: string): Row => {
      const k = key(lid, date);
      if (!map.has(k)) {
        map.set(k, {
          listing_id: lid,
          host_id: hostId!,
          date,
          views: 0,
          unique_viewers: 0,
          inquiries: 0,
          bookings: 0,
          revenue: 0,
          source_breakdown: {},
          _viewers: new Set(),
        });
      }
      return map.get(k)!;
    };

    for (const v of viewsRes.data || []) {
      const r = ensure(v.listing_id, dayOf(v.viewed_at));
      r.views += 1;
      if (v.viewer_id) r._viewers.add(v.viewer_id);
      const src = classifyReferrer(v.referrer);
      r.source_breakdown[src] = (r.source_breakdown[src] || 0) + 1;
    }
    for (const b of bookingsRes.data || []) {
      const r = ensure(b.listing_id, dayOf(b.created_at));
      r.inquiries += 1;
      if (b.payment_status === "paid" || b.status === "approved") {
        r.bookings += 1;
        r.revenue += Number(b.total_price || 0);
      }
    }
    for (const s of salesRes.data || []) {
      const r = ensure(s.listing_id, dayOf(s.created_at));
      if (s.status !== "cancelled") {
        r.bookings += 1;
        r.revenue += Number(s.amount || 0);
      }
    }

    const rows = Array.from(map.values()).map((r) => ({
      listing_id: r.listing_id,
      host_id: r.host_id,
      date: r.date,
      views: r.views,
      unique_viewers: r._viewers.size,
      inquiries: r.inquiries,
      bookings: r.bookings,
      revenue: r.revenue,
      source_breakdown: r.source_breakdown,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("listing_analytics_daily")
        .upsert(rows, { onConflict: "listing_id,date" });
      if (error) {
        console.error("Upsert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ rolled_up: rows.length, days }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analytics-rollup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function classifyReferrer(ref: string | null | undefined): string {
  if (!ref) return "direct";
  const r = ref.toLowerCase();
  if (r.includes("google")) return "google";
  if (r.includes("facebook") || r.includes("fb.")) return "facebook";
  if (r.includes("instagram")) return "instagram";
  if (r.includes("tiktok")) return "tiktok";
  if (r.includes("twitter") || r.includes("t.co")) return "twitter";
  if (r.includes("youtube")) return "youtube";
  if (r.includes("vendibook")) return "internal";
  return "other";
}
