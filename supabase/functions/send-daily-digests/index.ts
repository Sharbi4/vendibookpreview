// Daily digest router — sends role-based personalized digests to hosts, shoppers, sellers, admins.
// One email per user. Activity-gated: skips users with nothing to report.
// Triggered by pg_cron daily at 13:00 UTC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const HOST_TIPS = [
  "Reply to inquiries within an hour to triple your booking rate.",
  "Add 3 more photos to your top listing — listings with 8+ photos book 60% more.",
  "Enable Instant Book to lift conversion ~30%.",
  "Lower weekday rates 10–15% to fill open midweek slots.",
  "Add a short video — listings with video earn 2.4× more inquiries.",
  "Keep your calendar accurate — stale availability hurts ranking.",
];
const SHOPPER_TIPS = [
  "Send a quick message to hosts — fast replies book first.",
  "Save your favorites to compare side-by-side.",
  "Book mid-week to save 10–20% on most listings.",
  "Use the map view to spot listings near transit.",
];
const SELLER_TIPS = [
  "Counter at 92% of list — converts ~3x more than holding firm.",
  "Reply to offers within 12h or they go cold.",
  "Reduce listing age: refresh photos every 30 days.",
  "Bundle low-mover items — moves inventory 2x faster.",
];

async function aiInsight(role: string, stats: any, key?: string): Promise<string | null> {
  if (!key) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You write a 1-sentence punchy insight for a Vendibook ${role} daily digest. Be specific and actionable. Max 140 chars. No emoji.` },
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

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const firstNameOf = (p: any) => p?.first_name || p?.display_name || p?.full_name?.split(" ")[0];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const onlyRole: string | undefined = body?.role;
    const limit: number = body?.limit ?? 1000;

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const yIso = startOfYesterday.toISOString();
    const tIso = startOfToday.toISOString();
    const dateLabel = startOfYesterday.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();

    const summary = { hosts: 0, shoppers: 0, sellers: 0, admins: 0, skipped: 0 };
    const previews: any[] = [];

    const send = async (templateName: string, email: string, idemp: string, data: any) => {
      if (dryRun) { previews.push({ templateName, email, data }); return true; }
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: { templateName, recipientEmail: email, idempotencyKey: idemp, templateData: { ...data, aiSubject: true } },
      });
      return !error;
    };

    // ===== HOSTS (daily perf + tip) =====
    if (!onlyRole || onlyRole === "host") {
      const { data: hostRoles } = await supabase.from("user_roles").select("user_id").eq("role", "host").limit(limit);
      const hostIds = (hostRoles || []).map((r: any) => r.user_id);
      for (const hostId of hostIds) {
        const { data: profile } = await supabase.from("profiles").select("id,email,first_name,full_name,display_name").eq("id", hostId).maybeSingle();
        if (!profile?.email) { summary.skipped++; continue; }

        const { data: hostListings } = await supabase.from("listings").select("id,title").eq("host_id", hostId);
        const listingIds = (hostListings || []).map((l: any) => l.id);
        if (listingIds.length === 0) { summary.skipped++; continue; }

        const [{ count: viewsCount }, { data: bookings }, { count: inquiriesCount }, { data: viewRows }] = await Promise.all([
          supabase.from("listing_views").select("id", { count: "exact", head: true }).in("listing_id", listingIds).gte("viewed_at", yIso).lt("viewed_at", tIso),
          supabase.from("booking_requests").select("id,total_price,status,listing_id").eq("host_id", hostId).gte("created_at", yIso).lt("created_at", tIso),
          supabase.from("listing_leads").select("id", { count: "exact", head: true }).eq("host_id", hostId).gte("created_at", yIso).lt("created_at", tIso),
          supabase.from("listing_views").select("listing_id").in("listing_id", listingIds).gte("viewed_at", yIso).lt("viewed_at", tIso),
        ]);

        const paid = (bookings || []).filter((b: any) => ["approved", "completed", "paid"].includes(b.status));
        const earnings = paid.reduce((acc: number, b: any) => acc + Number(b.total_price || 0), 0);
        const stats = { views: viewsCount || 0, inquiries: inquiriesCount || 0, bookings: paid.length, earnings };

        // Activity gate
        if (stats.views === 0 && stats.inquiries === 0 && stats.bookings === 0) { summary.skipped++; continue; }

        const counts: Record<string, number> = {};
        (viewRows || []).forEach((v: any) => { counts[v.listing_id] = (counts[v.listing_id] || 0) + 1; });
        const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topListing = (hostListings || []).find((l: any) => l.id === topId);

        const insight = await aiInsight("host", { ...stats, topListing: topListing?.title }, LOVABLE_KEY);
        const ok = await send("host-daily-digest", profile.email, `host-daily-${hostId}-${yIso.slice(0, 10)}`, {
          hostName: firstNameOf(profile), dateLabel, ...stats, topListingTitle: topListing?.title, topListingId: topListing?.id, aiInsight: insight, tip: pick(HOST_TIPS),
        });
        if (ok) summary.hosts++;
      }
    }

    // ===== SHOPPERS (new listings near saved area + tip) =====
    if (!onlyRole || onlyRole === "shopper") {
      const { data: shopperRoles } = await supabase.from("user_roles").select("user_id").eq("role", "shopper").limit(limit);
      const shopperIds = (shopperRoles || []).map((r: any) => r.user_id);
      for (const sid of shopperIds) {
        const { data: profile } = await supabase.from("profiles").select("id,email,first_name,full_name,display_name,city,state,public_city,public_state,zip_code").eq("id", sid).maybeSingle();
        if (!profile?.email) { summary.skipped++; continue; }

        const city = profile.public_city || profile.city;
        const state = profile.public_state || profile.state;
        let q = supabase.from("listings").select("id,title,city,state,price_daily,price_sale,cover_image_url,published_at").eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").gte("published_at", yIso).lt("published_at", tIso).not("title", "ilike", "demo%").order("published_at", { ascending: false }).limit(5);
        if (city) q = q.eq("city", city);
        const { data: nearby } = await q;
        let listings = nearby || [];
        // Fallback: state-only if city yielded nothing
        if (listings.length === 0 && state) {
          const { data: stateListings } = await supabase.from("listings").select("id,title,city,state,price_daily,price_sale,cover_image_url,published_at").eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").eq("state", state).gte("published_at", yIso).lt("published_at", tIso).not("title", "ilike", "demo%").order("published_at", { ascending: false }).limit(5);
          listings = stateListings || [];
        }
        if (listings.length === 0) { summary.skipped++; continue; }

        const mapped = listings.map((l: any) => ({
          id: l.id, title: l.title, city: l.city, state: l.state, coverImageUrl: l.cover_image_url,
          priceLabel: l.price_daily ? `$${Number(l.price_daily).toLocaleString()}/day` : l.price_sale ? `$${Number(l.price_sale).toLocaleString()}` : undefined,
        }));

        const area = [city, state].filter(Boolean).join(", ");
        const insight = await aiInsight("shopper", { count: mapped.length, area }, LOVABLE_KEY);
        const ok = await send("shopper-daily-digest", profile.email, `shopper-daily-${sid}-${yIso.slice(0, 10)}`, {
          shopperName: firstNameOf(profile), area, listings: mapped, aiInsight: insight, tip: pick(SHOPPER_TIPS),
        });
        if (ok) summary.shoppers++;
      }
    }

    // ===== SELLERS (open offers + market tip) — sellers = hosts with sale listings =====
    if (!onlyRole || onlyRole === "seller") {
      const { data: sellerListings } = await supabase.from("listings").select("host_id").eq("mode", "sale").eq("status", "published").not("published_at", "is", null).is("deleted_at", null).eq("moderation_status", "clear").not("host_id", "is", null).limit(2000);
      const sellerIds = Array.from(new Set((sellerListings || []).map((l: any) => l.host_id))).slice(0, limit);
      for (const sid of sellerIds) {
        const { data: profile } = await supabase.from("profiles").select("id,email,first_name,full_name,display_name").eq("id", sid).maybeSingle();
        if (!profile?.email) { summary.skipped++; continue; }

        const { data: openOffers } = await supabase.from("offers").select("id,offer_amount,status,listing_id,listings(title)").eq("seller_id", sid).in("status", ["pending", "countered"]).limit(10);

        // Sales yesterday
        const { data: salesYday } = await supabase.from("booking_requests").select("id,total_price,status").eq("host_id", sid).gte("created_at", yIso).lt("created_at", tIso);
        const paidYday = (salesYday || []).filter((s: any) => ["approved", "completed", "paid"].includes(s.status));
        const revenueYesterday = paidYday.reduce((a: number, s: any) => a + Number(s.total_price || 0), 0);

        const offerCount = (openOffers || []).length;
        if (offerCount === 0 && paidYday.length === 0) { summary.skipped++; continue; }

        const mapped = (openOffers || []).map((o: any) => ({ id: o.id, listingTitle: o.listings?.title || "Listing", offerAmount: Number(o.offer_amount || 0), status: o.status }));
        const insight = await aiInsight("seller", { openOffers: offerCount, salesYesterday: paidYday.length, revenueYesterday }, LOVABLE_KEY);
        const ok = await send("seller-daily-digest", profile.email, `seller-daily-${sid}-${yIso.slice(0, 10)}`, {
          sellerName: firstNameOf(profile), dateLabel, openOffers: mapped, salesYesterday: paidYday.length, revenueYesterday, aiInsight: insight, tip: pick(SELLER_TIPS),
        });
        if (ok) summary.sellers++;
      }
    }

    // ===== ADMINS (ops digest) =====
    if (!onlyRole || onlyRole === "admin") {
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (adminRoles || []).map((r: any) => r.user_id);

      // Aggregates platform-wide
      const [signups, listings, bookings, disputes, payouts] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", yIso).lt("created_at", tIso),
        supabase.from("listings").select("id", { count: "exact", head: true }).gte("created_at", yIso).lt("created_at", tIso),
        supabase.from("booking_requests").select("id,total_price,status,payment_status").gte("created_at", yIso).lt("created_at", tIso),
        supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("dispute_status", "open"),
        supabase.from("booking_requests").select("id", { count: "exact", head: true }).eq("payout_processed", false).eq("payment_status", "paid"),
      ]);
      const allBookings = (bookings.data || []) as any[];
      const paidBookings = allBookings.filter((b) => b.payment_status === "paid");
      const grossRevenue = paidBookings.reduce((a, b) => a + Number(b.total_price || 0), 0);

      const stats = {
        newSignups: signups.count || 0,
        newListings: listings.count || 0,
        newBookings: paidBookings.length,
        grossRevenue,
        openDisputes: disputes.count || 0,
        pendingPayouts: payouts.count || 0,
      };

      // Always send admin digest (ops needs daily visibility)
      const insight = await aiInsight("admin", stats, LOVABLE_KEY);
      for (const aid of adminIds) {
        const { data: profile } = await supabase.from("profiles").select("id,email").eq("id", aid).maybeSingle();
        if (!profile?.email) continue;
        const ok = await send("admin-daily-digest", profile.email, `admin-daily-${aid}-${yIso.slice(0, 10)}`, { dateLabel, ...stats, aiInsight: insight });
        if (ok) summary.admins++;
      }
    }

    return new Response(JSON.stringify({ success: true, summary, dryRun, previews: dryRun ? previews.slice(0, 10) : undefined }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily digest error:", err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
