// Per-user weekly digest for hosts — personalized stats + AI insight + tip.
// Triggered by pg_cron weekly OR by admin manually. One email per host (transactional).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIPS = [
  "Add 3 more photos to your top listing — listings with 8+ photos book 60% more.",
  "Reply to inquiries within an hour to triple your booking rate.",
  "Enable Instant Book to lift conversion ~30%.",
  "Lower weekday rates by 10–15% to fill open midweek slots.",
  "Add a short video — listings with video earn 2.4× more inquiries.",
  "Clarify access instructions — it cuts cancellations by half.",
  "Keep your calendar accurate — stale availability hurts ranking.",
];

async function aiInsight(stats: any, key: string | undefined): Promise<string | null> {
  if (!key) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You write a 1-sentence punchy insight for a host weekly digest on Vendibook. Be specific about what changed and what to do next. Max 140 chars. No emoji." },
          { role: "user", content: `Stats: ${JSON.stringify(stats)}` },
        ],
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim()?.slice(0, 200) || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limitHosts: number = body?.limit ?? 500;

    // Compute window: last 7 days
    const now = new Date();
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sinceIso = since.toISOString();
    const weekLabel = `WEEK OF ${since.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}`;

    // Find active hosts (have at least one published listing)
    const { data: hosts, error: hErr } = await supabase
      .from("listings")
      .select("host_id")
      .eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear")
      .not("host_id", "is", null)
      .limit(2000);
    if (hErr) throw hErr;
    const hostIds = Array.from(new Set((hosts || []).map((h: any) => h.host_id))).slice(0, limitHosts);

    let queued = 0;
    const results: any[] = [];

    for (const hostId of hostIds) {
      // Profile + email
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,email,first_name,full_name,display_name")
        .eq("id", hostId)
        .maybeSingle();
      if (!profile?.email) continue;

      // Aggregate views (listing_views)
      const { data: hostListings } = await supabase
        .from("listings")
        .select("id,title")
        .eq("host_id", hostId);
      const listingIds = (hostListings || []).map((l: any) => l.id);
      if (listingIds.length === 0) continue;

      const [{ count: viewsCount }, { data: bookings }, { count: inquiriesCount }] = await Promise.all([
        supabase.from("listing_views").select("id", { count: "exact", head: true }).in("listing_id", listingIds).gte("viewed_at", sinceIso),
        supabase.from("booking_requests").select("id,total_price,status,listing_id,created_at").eq("host_id", hostId).gte("created_at", sinceIso),
        supabase.from("listing_leads").select("id", { count: "exact", head: true }).eq("host_id", hostId).gte("created_at", sinceIso),
      ]);

      const paidBookings = (bookings || []).filter((b: any) => ["approved", "completed", "paid"].includes(b.status));
      const earnings = paidBookings.reduce((acc: number, b: any) => acc + Number(b.total_price || 0), 0);

      // Top listing by views in window
      const viewsByListing: Record<string, number> = {};
      for (const id of listingIds) viewsByListing[id] = 0;
      const { data: viewRows } = await supabase
        .from("listing_views")
        .select("listing_id")
        .in("listing_id", listingIds)
        .gte("viewed_at", sinceIso);
      (viewRows || []).forEach((v: any) => { viewsByListing[v.listing_id] = (viewsByListing[v.listing_id] || 0) + 1; });
      const topId = Object.entries(viewsByListing).sort((a, b) => b[1] - a[1])[0]?.[0];
      const topListing = (hostListings || []).find((l: any) => l.id === topId);

      const stats = {
        views: viewsCount || 0,
        inquiries: inquiriesCount || 0,
        bookings: paidBookings.length,
        earnings,
        topListing: topListing?.title,
      };

      // Skip totally inactive hosts
      if (stats.views === 0 && stats.inquiries === 0 && stats.bookings === 0) continue;

      const insight = await aiInsight(stats, LOVABLE_KEY);
      const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
      const firstName = profile.first_name || profile.display_name || profile.full_name?.split(" ")[0];

      // Rotate referral mention every 3rd week — Purchase, Supply, Rental cycle
      const weekNumber = Math.floor(since.getTime() / (7 * 24 * 60 * 60 * 1000));
      const referralProgram = weekNumber % 3 === 0
        ? (['purchase', 'supply', 'rental'] as const)[Math.floor(weekNumber / 3) % 3]
        : null;

      const templateData = {
        hostName: firstName,
        weekLabel,
        views: stats.views,
        inquiries: stats.inquiries,
        bookings: stats.bookings,
        earnings: stats.earnings,
        topListingTitle: topListing?.title,
        topListingId: topListing?.id,
        aiInsight: insight,
        tip,
        aiSubject: true,
        referralProgram,
      };

      if (dryRun) {
        results.push({ hostId, email: profile.email, templateData });
        continue;
      }

      const { error: invErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "host-weekly-digest",
          recipientEmail: profile.email,
          idempotencyKey: `host-digest-${hostId}-${since.toISOString().slice(0, 10)}`,
          templateData,
        },
      });
      if (!invErr) queued++;
    }

    return new Response(JSON.stringify({ success: true, hostsConsidered: hostIds.length, queued, dryRun, results: dryRun ? results.slice(0, 10) : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("host weekly digest error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
