import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightData {
  listings: {
    total: number;
    published: number;
    drafts: number;
    rentals: number;
    sales: number;
    topListings: { title: string; views: number; category: string }[];
  };
  bookings: {
    total: number;
    pending: number;
    approved: number;
    declined: number;
    completed: number;
    averageResponseTime?: number;
  };
  revenue: {
    totalEarnings: number;
    monthlyTrend: { month: string; amount: number }[];
    pendingPayouts: number;
    averageTransactionValue: number;
  };
  reviews: {
    averageRating: number;
    totalReviews: number;
    recentReviews: { rating: number; text: string; date: string }[];
  };
  views: {
    totalViews: number;
    viewsTrend: number;
    viewsThisMonth: number;
    viewsLastMonth: number;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error("Not authenticated");
    }

    const userId = userData.user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      listingsResult,
      bookingsResult,
      salesResult,
      reviewsResult,
      viewsThisMonthResult,
      viewsLastMonthResult,
      profileResult
    ] = await Promise.all([
      // Listings
      supabaseClient
        .from("listings")
        .select("id, title, status, mode, category, view_count")
        .eq("host_id", userId),
      
      // Bookings
      supabaseClient
        .from("booking_requests")
        .select("id, status, created_at, responded_at")
        .eq("host_id", userId),
      
      // Sales/Revenue
      supabaseClient
        .from("sale_transactions")
        .select("id, amount, seller_payout, platform_fee, status, created_at, payout_completed_at")
        .eq("seller_id", userId),
      
      // Reviews
      supabaseClient
        .from("reviews")
        .select("id, rating, review_text, created_at")
        .eq("host_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      
      // Views this month
      supabaseClient
        .from("listing_views")
        .select("id, listing_id")
        .gte("viewed_at", thirtyDaysAgo.toISOString())
        .in("listing_id", (await supabaseClient.from("listings").select("id").eq("host_id", userId)).data?.map(l => l.id) || []),
      
      // Views last month
      supabaseClient
        .from("listing_views")
        .select("id")
        .gte("viewed_at", sixtyDaysAgo.toISOString())
        .lt("viewed_at", thirtyDaysAgo.toISOString())
        .in("listing_id", (await supabaseClient.from("listings").select("id").eq("host_id", userId)).data?.map(l => l.id) || []),
      
      // Profile for Stripe account
      supabaseClient
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", userId)
        .maybeSingle()
    ]);

    // Process listings data
    const listings = listingsResult.data || [];
    const publishedListings = listings.filter(l => l.status === 'published');
    const draftListings = listings.filter(l => l.status === 'draft');
    const rentalListings = listings.filter(l => l.mode === 'rent');
    const saleListings = listings.filter(l => l.mode === 'sale');
    const topListings = listings
      .filter(l => l.view_count && l.view_count > 0)
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 5)
      .map(l => ({ title: l.title, views: l.view_count || 0, category: l.category }));

    // Process bookings data
    const bookings = bookingsResult.data || [];
    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const approvedBookings = bookings.filter(b => b.status === 'approved');
    const declinedBookings = bookings.filter(b => b.status === 'declined');
    const completedBookings = bookings.filter(b => b.status === 'completed');
    
    // Calculate average response time
    const respondedBookings = bookings.filter(b => b.responded_at);
    let avgResponseTime: number | undefined;
    if (respondedBookings.length > 0) {
      const totalResponseTime = respondedBookings.reduce((sum, b) => {
        const created = new Date(b.created_at).getTime();
        const responded = new Date(b.responded_at!).getTime();
        return sum + (responded - created);
      }, 0);
      avgResponseTime = totalResponseTime / respondedBookings.length / (1000 * 60 * 60); // hours
    }

    // Process sales/revenue data
    const sales = salesResult.data || [];
    const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'paid');
    const totalEarnings = completedSales.reduce((sum, s) => sum + (s.seller_payout || 0), 0);
    const pendingPayouts = sales
      .filter(s => s.status === 'paid' && !s.payout_completed_at)
      .reduce((sum, s) => sum + (s.seller_payout || 0), 0);
    const avgTransactionValue = completedSales.length > 0 
      ? totalEarnings / completedSales.length 
      : 0;
    
    // Monthly revenue trend
    const monthlyRevenue: { [key: string]: number } = {};
    completedSales.forEach(s => {
      const month = new Date(s.created_at).toISOString().slice(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + (s.seller_payout || 0);
    });
    const monthlyTrend = Object.entries(monthlyRevenue)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, amount]) => ({ month, amount }));

    // Process reviews data
    const reviews = reviewsResult.data || [];
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    const recentReviews = reviews.slice(0, 5).map(r => ({
      rating: r.rating,
      text: r.review_text || '',
      date: r.created_at
    }));

    // Process views data
    const viewsThisMonth = viewsThisMonthResult.data?.length || 0;
    const viewsLastMonth = viewsLastMonthResult.data?.length || 0;
    const totalViews = listings.reduce((sum, l) => sum + (l.view_count || 0), 0);
    const viewsTrend = viewsLastMonth > 0 
      ? ((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100 
      : viewsThisMonth > 0 ? 100 : 0;

    // Fetch Stripe balance if connected
    let stripeBalance = 0;
    if (profileResult.data?.stripe_account_id) {
      try {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
          apiVersion: "2023-10-16",
        });
        const balance = await stripe.balance.retrieve({
          stripeAccount: profileResult.data.stripe_account_id
        });
        stripeBalance = balance.available.reduce((sum: number, b: { amount: number }) => sum + b.amount, 0) / 100;
      } catch (e) {
        console.log("Could not fetch Stripe balance:", e);
      }
    }

    // Compile insight data
    const insightData: InsightData = {
      listings: {
        total: listings.length,
        published: publishedListings.length,
        drafts: draftListings.length,
        rentals: rentalListings.length,
        sales: saleListings.length,
        topListings
      },
      bookings: {
        total: bookings.length,
        pending: pendingBookings.length,
        approved: approvedBookings.length,
        declined: declinedBookings.length,
        completed: completedBookings.length,
        averageResponseTime: avgResponseTime
      },
      revenue: {
        totalEarnings,
        monthlyTrend,
        pendingPayouts,
        averageTransactionValue: avgTransactionValue
      },
      reviews: {
        averageRating: avgRating,
        totalReviews: reviews.length,
        recentReviews
      },
      views: {
        totalViews,
        viewsTrend,
        viewsThisMonth,
        viewsLastMonth
      }
    };

    // Generate AI insights using Lovable AI
    const prompt = `You are an expert business analyst for a marketplace platform (Vendibook) where hosts list food trucks, trailers, and commercial kitchens for rent or sale.

Analyze this host's performance data and provide 3-4 actionable insights. Be specific with numbers and percentages. Focus on:
1. Revenue optimization opportunities
2. Listing performance improvements  
3. Booking/conversion rate analysis
4. Customer satisfaction based on reviews
5. Urgent actions needed (pending bookings, drafts, etc.)

HOST DATA:
${JSON.stringify(insightData, null, 2)}

Stripe Available Balance: $${stripeBalance.toFixed(2)}

Respond with a JSON array of insights. Each insight must have:
- type: "success" | "warning" | "tip" | "opportunity"
- title: Short attention-grabbing title (max 40 chars)
- description: Detailed actionable insight (2-3 sentences, include specific numbers)
- action: Optional call-to-action text (max 25 chars)
- priority: 1-4 (1 being highest priority)

Use "success" for positive trends, "warning" for urgent issues, "tip" for improvement suggestions, "opportunity" for growth potential.

Return ONLY valid JSON array, no markdown or explanation.`;

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      throw new Error("Failed to generate AI insights");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "[]";
    
    // Parse the AI response
    let insights;
    try {
      // Clean up the response in case it has markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Fallback to basic insights if AI parsing fails
      insights = generateFallbackInsights(insightData);
    }

    // Sort by priority and limit to 4
    insights = insights
      .sort((a: any, b: any) => (a.priority || 4) - (b.priority || 4))
      .slice(0, 4);

    return new Response(
      JSON.stringify({ 
        insights,
        dataSnapshot: {
          totalEarnings,
          totalViews,
          avgRating,
          pendingBookings: pendingBookings.length,
          stripeBalance
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error generating AI insights:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

function generateFallbackInsights(data: InsightData) {
  const insights = [];

  if (data.bookings.pending > 0) {
    insights.push({
      type: "warning",
      title: `${data.bookings.pending} Pending Request${data.bookings.pending > 1 ? 's' : ''}`,
      description: `You have ${data.bookings.pending} booking request${data.bookings.pending > 1 ? 's' : ''} waiting for your response. Quick responses lead to 40% more successful bookings.`,
      action: "Review requests",
      priority: 1
    });
  }

  if (data.listings.drafts > 0) {
    insights.push({
      type: "opportunity",
      title: `${data.listings.drafts} Unpublished Draft${data.listings.drafts > 1 ? 's' : ''}`,
      description: `Complete and publish your draft listings to start earning. Each published listing increases your visibility on the platform.`,
      action: "Finish drafts",
      priority: 2
    });
  }

  if (data.views.viewsTrend > 10) {
    insights.push({
      type: "success",
      title: "Views Trending Up! 📈",
      description: `Your listings are getting ${data.views.viewsTrend.toFixed(0)}% more views than last month. Consider this a good time to optimize pricing.`,
      priority: 3
    });
  } else if (data.views.viewsTrend < -10) {
    insights.push({
      type: "tip",
      title: "Boost Your Visibility",
      description: `Views are down ${Math.abs(data.views.viewsTrend).toFixed(0)}% from last month. Try updating photos or adjusting your pricing to attract more interest.`,
      action: "Update listings",
      priority: 2
    });
  }

  if (data.reviews.averageRating >= 4.5 && data.reviews.totalReviews >= 3) {
    insights.push({
      type: "success",
      title: "Excellent Reviews! ⭐",
      description: `You maintain a ${data.reviews.averageRating.toFixed(1)} star rating across ${data.reviews.totalReviews} reviews. This builds trust with potential renters.`,
      priority: 4
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: "tip",
      title: "Get Started",
      description: "Create your first listing to start receiving bookings and building your analytics dashboard.",
      action: "Create listing",
      priority: 1
    });
  }

  return insights;
}
