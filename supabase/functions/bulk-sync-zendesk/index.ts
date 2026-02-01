import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BULK-SYNC-ZENDESK] ${step}${detailsStr}`);
};

interface BulkSyncRequest {
  // Optional filters
  role?: 'host' | 'shopper' | 'admin';
  verified_only?: boolean;
  limit?: number;
  offset?: number;
}

interface ZendeskUser {
  user: {
    name: string;
    email: string;
    phone?: string;
    external_id?: string;
    verified?: boolean;
    user_fields?: Record<string, string | number | boolean | null>;
    tags?: string[];
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Bulk sync started");

    // Get credentials
    const ZENDESK_API_KEY = Deno.env.get("ZENDESK_API_KEY");
    const rawSubdomain = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook1";
    const ZENDESK_SUBDOMAIN = rawSubdomain.replace(/\.zendesk\.com.*$/i, '').trim();
    const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "support@vendibook1.zendesk.com";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!ZENDESK_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);

    const data: BulkSyncRequest = await req.json().catch(() => ({}));
    const limit = Math.min(data.limit || 100, 500); // Max 500 per batch
    const offset = data.offset || 0;

    logStep("Fetching users", { limit, offset, role: data.role });

    // Build query
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (data.role) {
      query = query.eq('role', data.role);
    }
    if (data.verified_only) {
      query = query.eq('identity_verified', true);
    }

    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          synced: 0, 
          failed: 0,
          message: "No users to sync" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep(`Found ${profiles.length} users to sync`);

    // Get stats for all users in one query
    const userIds = profiles.map(p => p.id);
    
    const [bookingsResult, listingsResult] = await Promise.all([
      supabase
        .from('booking_requests')
        .select('shopper_id')
        .in('shopper_id', userIds),
      supabase
        .from('listings')
        .select('host_id')
        .in('host_id', userIds)
        .eq('status', 'published'),
    ]);

    // Count bookings and listings per user
    const bookingCounts: Record<string, number> = {};
    const listingCounts: Record<string, number> = {};
    
    bookingsResult.data?.forEach(b => {
      bookingCounts[b.shopper_id] = (bookingCounts[b.shopper_id] || 0) + 1;
    });
    listingsResult.data?.forEach(l => {
      listingCounts[l.host_id] = (listingCounts[l.host_id] || 0) + 1;
    });

    // Process users
    const results = {
      synced: 0,
      failed: 0,
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const profile of profiles) {
      try {
        const totalBookings = bookingCounts[profile.id] || 0;
        const totalListings = listingCounts[profile.id] || 0;

        const zendeskUser: ZendeskUser = {
          user: {
            name: profile.full_name || profile.email?.split('@')[0] || 'Vendibook User',
            email: profile.email,
            external_id: profile.id,
            verified: true,
            tags: ['vendibook', 'bulk-sync', profile.role || 'user'],
            user_fields: {
              vendibook_user_id: profile.id,
              user_type: profile.role || 'shopper',
              identity_verified: profile.identity_verified || false,
              total_bookings: totalBookings,
              total_listings: totalListings,
              member_since: profile.created_at?.split('T')[0] || null,
              business_name: profile.business_name || null,
            },
          },
        };

        if (profile.phone) {
          zendeskUser.user.phone = profile.phone;
        }

        if (profile.role === 'host' || totalListings > 0) {
          zendeskUser.user.tags?.push('host');
          if (profile.identity_verified) {
            zendeskUser.user.tags?.push('verified_host');
          }
        }

        // Check if user exists in Zendesk
        const searchResponse = await fetch(
          `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users/search.json?external_id=${profile.id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${auth}`,
            },
          }
        );

        let zendeskUserId: number | null = null;
        if (searchResponse.ok) {
          const searchResult = await searchResponse.json();
          if (searchResult.users && searchResult.users.length > 0) {
            zendeskUserId = searchResult.users[0].id;
          }
        }

        let response: Response;
        if (zendeskUserId) {
          response = await fetch(
            `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users/${zendeskUserId}.json`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
              },
              body: JSON.stringify(zendeskUser),
            }
          );
          if (response.ok) results.updated++;
        } else {
          response = await fetch(
            `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
              },
              body: JSON.stringify(zendeskUser),
            }
          );
          if (response.ok) results.created++;
        }

        if (response.ok) {
          results.synced++;
        } else {
          const errorText = await response.text();
          results.failed++;
          results.errors.push(`${profile.email}: ${response.status}`);
          logStep("User sync failed", { email: profile.email, error: errorText });
        }

        // Rate limiting - Zendesk allows ~400 requests/min
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (userError) {
        results.failed++;
        results.errors.push(`${profile.email}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      }
    }

    logStep("Bulk sync completed", results);

    return new Response(
      JSON.stringify({ 
        success: true,
        ...results,
        message: `Synced ${results.synced} users (${results.created} created, ${results.updated} updated), ${results.failed} failed`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
