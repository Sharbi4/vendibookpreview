import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-CUSTOMER-TO-ZENDESK] ${step}${detailsStr}`);
};

interface SyncCustomerRequest {
  user_id: string;
  // Optional: force update even if user exists in Zendesk
  force_update?: boolean;
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
    logStep("Function started");

    // Get Zendesk credentials
    const ZENDESK_API_KEY = Deno.env.get("ZENDESK_API_KEY");
    const rawSubdomain = Deno.env.get("ZENDESK_SUBDOMAIN") || "vendibook1";
    const ZENDESK_SUBDOMAIN = rawSubdomain.replace(/\.zendesk\.com.*$/i, '').trim();
    const ZENDESK_EMAIL = Deno.env.get("ZENDESK_EMAIL") || "support@vendibook1.zendesk.com";

    if (!ZENDESK_API_KEY) {
      throw new Error("ZENDESK_API_KEY is not configured");
    }

    // Get Supabase credentials
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const data: SyncCustomerRequest = await req.json();
    
    if (!data.user_id) {
      throw new Error("Missing required field: user_id");
    }

    logStep("Fetching user profile", { user_id: data.user_id });

    // Fetch user profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user_id)
      .single();

    if (profileError || !profile) {
      throw new Error(`User not found: ${profileError?.message || 'No profile'}`);
    }

    logStep("Profile fetched", { 
      email: profile.email, 
      name: profile.full_name,
      role: profile.role 
    });

    // Get user stats
    const [bookingsResult, listingsResult] = await Promise.all([
      supabase
        .from('booking_requests')
        .select('id', { count: 'exact' })
        .eq('shopper_id', data.user_id),
      supabase
        .from('listings')
        .select('id', { count: 'exact' })
        .eq('host_id', data.user_id)
        .eq('status', 'published'),
    ]);

    const totalBookings = bookingsResult.count || 0;
    const totalListings = listingsResult.count || 0;

    // Build Zendesk user payload
    const zendeskUser: ZendeskUser = {
      user: {
        name: profile.full_name || profile.email?.split('@')[0] || 'Vendibook User',
        email: profile.email,
        external_id: data.user_id,
        verified: true,
        tags: ['vendibook', profile.role || 'user'],
        user_fields: {
          vendibook_user_id: data.user_id,
          user_type: profile.role || 'shopper',
          identity_verified: profile.identity_verified || false,
          total_bookings: totalBookings,
          total_listings: totalListings,
          member_since: profile.created_at?.split('T')[0] || null,
          business_name: profile.business_name || null,
        },
      },
    };

    // Add phone if available
    if (profile.phone) {
      zendeskUser.user.phone = profile.phone;
    }

    // Add host-specific tags
    if (profile.role === 'host' || totalListings > 0) {
      zendeskUser.user.tags?.push('host');
      if (profile.identity_verified) {
        zendeskUser.user.tags?.push('verified_host');
      }
    }

    logStep("Zendesk payload built", { email: profile.email, tags: zendeskUser.user.tags });

    // Auth header for Zendesk API
    const auth = btoa(`${ZENDESK_EMAIL}/token:${ZENDESK_API_KEY}`);

    // First, check if user already exists in Zendesk by external_id
    const searchResponse = await fetch(
      `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/users/search.json?external_id=${data.user_id}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    let zendeskUserId: number | null = null;
    let action: 'created' | 'updated' = 'created';

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      if (searchResult.users && searchResult.users.length > 0) {
        zendeskUserId = searchResult.users[0].id;
        action = 'updated';
        logStep("Existing Zendesk user found", { zendesk_id: zendeskUserId });
      }
    }

    let response: Response;

    if (zendeskUserId) {
      // Update existing user
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
    } else {
      // Create new user
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
    }

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Zendesk API error", { status: response.status, error: errorText });
      throw new Error(`Zendesk API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    zendeskUserId = result.user?.id;

    logStep(`User ${action} successfully`, { 
      zendesk_id: zendeskUserId,
      email: profile.email 
    });

    // Optionally update the profile with zendesk_user_id
    // (requires adding zendesk_user_id column to profiles table)
    // await supabase
    //   .from('profiles')
    //   .update({ zendesk_user_id: zendeskUserId })
    //   .eq('id', data.user_id);

    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        zendesk_user_id: zendeskUserId,
        message: `Customer ${action} in Zendesk successfully`,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
