import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIXEL_ID = "1070006041675593";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FB-CAPI] ${step}${detailsStr}`);
};

// Hash function for PII (SHA256 as required by Facebook)
async function hashData(data: string): Promise<string> {
  if (!data) return '';
  const normalized = data.toLowerCase().trim();
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface EventData {
  event_name: string;
  event_time?: number;
  event_source_url?: string;
  event_id?: string;
  action_source?: string;
  user_data?: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    external_id?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    contents?: Array<{ id: string; quantity: number; item_price?: number }>;
    num_items?: number;
    search_string?: string;
    status?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get("FB_CONVERSIONS_API_TOKEN");
    
    if (!accessToken) {
      logStep("ERROR: FB_CONVERSIONS_API_TOKEN not configured");
      return new Response(JSON.stringify({ 
        error: "Facebook Conversions API token not configured",
        success: false 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const eventData: EventData = await req.json();
    logStep("Received event", { event_name: eventData.event_name });

    // Get client IP and User Agent from request headers
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || "";
    const userAgent = req.headers.get("user-agent") || "";

    // Hash PII data
    const userData: Record<string, string> = {};
    
    if (eventData.user_data) {
      if (eventData.user_data.email) {
        userData.em = await hashData(eventData.user_data.email);
      }
      if (eventData.user_data.phone) {
        // Remove non-numeric characters before hashing
        userData.ph = await hashData(eventData.user_data.phone.replace(/\D/g, ''));
      }
      if (eventData.user_data.first_name) {
        userData.fn = await hashData(eventData.user_data.first_name);
      }
      if (eventData.user_data.last_name) {
        userData.ln = await hashData(eventData.user_data.last_name);
      }
      if (eventData.user_data.city) {
        userData.ct = await hashData(eventData.user_data.city);
      }
      if (eventData.user_data.state) {
        userData.st = await hashData(eventData.user_data.state);
      }
      if (eventData.user_data.zip) {
        userData.zp = await hashData(eventData.user_data.zip);
      }
      if (eventData.user_data.country) {
        userData.country = await hashData(eventData.user_data.country);
      }
      if (eventData.user_data.external_id) {
        userData.external_id = await hashData(eventData.user_data.external_id);
      }
      // Non-hashed fields
      if (eventData.user_data.fbc) {
        userData.fbc = eventData.user_data.fbc;
      }
      if (eventData.user_data.fbp) {
        userData.fbp = eventData.user_data.fbp;
      }
    }

    // Always include IP and UA if available
    if (clientIp) userData.client_ip_address = clientIp;
    if (userAgent) userData.client_user_agent = userAgent;

    // Build the event payload
    const eventPayload = {
      data: [{
        event_name: eventData.event_name,
        event_time: eventData.event_time || Math.floor(Date.now() / 1000),
        event_source_url: eventData.event_source_url || "https://vendibook.com",
        event_id: eventData.event_id || crypto.randomUUID(),
        action_source: eventData.action_source || "website",
        user_data: userData,
        custom_data: eventData.custom_data || {},
      }],
      // Enable test mode if test_event_code is set
      // test_event_code: "TEST12345", // Uncomment for testing
    };

    logStep("Sending to Facebook", { 
      event_name: eventData.event_name,
      has_email: !!userData.em,
      has_external_id: !!userData.external_id,
    });

    // Send to Facebook Conversions API
    const fbResponse = await fetch(
      `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      }
    );

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      logStep("Facebook API error", { 
        status: fbResponse.status, 
        error: fbResult 
      });
      return new Response(JSON.stringify({ 
        success: false, 
        error: fbResult 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: fbResponse.status,
      });
    }

    logStep("Event sent successfully", { 
      events_received: fbResult.events_received,
      fbtrace_id: fbResult.fbtrace_id,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      events_received: fbResult.events_received,
      fbtrace_id: fbResult.fbtrace_id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
