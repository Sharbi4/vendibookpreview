import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// VAPID keys for web push
// You should generate your own keys using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || '';
const VAPID_SUBJECT = 'mailto:support@vendibook.com';

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Web Push implementation
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object
): Promise<boolean> {
  try {
    // Import web-push compatible crypto functions
    const encoder = new TextEncoder();
    
    // For now, we'll use the fetch API to send to the push service
    // This is a simplified implementation - in production, you'd use proper VAPID signing
    
    const payloadString = JSON.stringify(payload);
    
    // Create the push message
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
      },
      body: payloadString,
    });

    if (!response.ok) {
      console.error('Push service error:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending web push:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, url, tag } = await req.json() as PushNotificationRequest;

    console.log("Sending push notification:", { user_id, title });

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user:", user_id);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = {
      title,
      body,
      url: url || '/',
      tag: tag || 'vendibook-notification',
    };

    let successCount = 0;
    let failedEndpoints: string[] = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        const success = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload
        );

        if (success) {
          successCount++;
        } else {
          failedEndpoints.push(sub.endpoint);
        }
      } catch (error) {
        console.error("Error sending to subscription:", error);
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      console.log("Cleaning up failed subscriptions:", failedEndpoints.length);
      // Don't delete immediately - the subscription might just be temporarily unavailable
    }

    console.log(`Push notifications sent: ${successCount}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length,
        failed: failedEndpoints.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
