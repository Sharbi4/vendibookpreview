import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// VAPID public key for web push
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_SUBJECT = 'mailto:support@vendibook.com';

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PUSH-NOTIFICATION] ${step}${detailsStr}`);
};

// Base64 URL encoding utilities
function base64UrlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - str.length % 4) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Create VAPID JWT token for authorization
async function createVapidJwt(audience: string, subject: string, privateKeyBase64: string): Promise<string | null> {
  try {
    const header = { typ: 'JWT', alg: 'ES256' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: subject,
    };

    const encoder = new TextEncoder();
    const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import the private key (expected in raw 32-byte format, base64url encoded)
    const privateKeyBytes = base64UrlDecode(privateKeyBase64);
    
    // Create a proper PKCS8 wrapper for the raw private key
    // This is the standard format for importing ECDSA P-256 private keys
    const pkcs8Header = new Uint8Array([
      0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
      0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
      0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
    ]);
    
    const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyBytes.length);
    pkcs8Key.set(pkcs8Header);
    pkcs8Key.set(privateKeyBytes, pkcs8Header.length);

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Key.buffer as ArrayBuffer,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    // Sign the token
    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      encoder.encode(unsignedToken)
    );

    // Convert signature from DER to raw format (64 bytes for P-256)
    const signatureB64 = base64UrlEncode(signature);
    return `${unsignedToken}.${signatureB64}`;
  } catch (error) {
    logStep("VAPID JWT creation failed", { error: (error as Error).message });
    return null;
  }
}

// Send web push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);
    logStep("Preparing push", { endpoint: subscription.endpoint.substring(0, 60) + "..." });

    // Get audience from endpoint
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    // Try with VAPID authorization if we have a private key
    if (vapidPrivateKey) {
      const jwt = await createVapidJwt(audience, VAPID_SUBJECT, vapidPrivateKey);
      
      if (jwt) {
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'TTL': '86400',
            'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
            'Urgency': 'normal',
          },
          // Send empty body - the notification content will be shown from the service worker
          body: new Uint8Array(0),
        });

        if (response.ok || response.status === 201) {
          logStep("Push sent with VAPID", { status: response.status });
          return true;
        }
        
        // Handle subscription gone/expired
        if (response.status === 410 || response.status === 404) {
          logStep("Subscription expired", { status: response.status });
          return false;
        }

        const errorText = await response.text();
        logStep("VAPID push failed", { status: response.status, error: errorText.substring(0, 100) });
      }
    }

    // Fallback: simple POST without auth (may work for some endpoints during testing)
    const fallbackResponse = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'TTL': '86400',
      },
      body: payloadString,
    });

    if (fallbackResponse.ok || fallbackResponse.status === 201) {
      logStep("Fallback push sent", { status: fallbackResponse.status });
      return true;
    }
    
    // Log final failure
    logStep("Push failed completely", { status: fallbackResponse.status });
    return false;
  } catch (error) {
    logStep("Push error", { error: (error as Error).message });
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
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, title, body, url, tag } = await req.json() as PushNotificationRequest;

    logStep("Request received", { user_id, title });

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "user_id, title, and body are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!vapidPrivateKey) {
      logStep("Warning: VAPID_PRIVATE_KEY not configured - push may fail");
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      logStep("Error fetching subscriptions", { error: subError.message });
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      logStep("No push subscriptions found", { user_id });
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Found subscriptions", { count: subscriptions.length });

    const payload = {
      title,
      body,
      url: url || '/',
      tag: tag || 'vendibook-notification',
    };

    let successCount = 0;
    const failedEndpoints: string[] = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPrivateKey
      );

      if (success) {
        successCount++;
      } else {
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up invalid/expired subscriptions after multiple failures
    // Only delete if endpoint consistently fails (subscription truly expired)
    if (failedEndpoints.length > 0) {
      logStep("Failed endpoints", { count: failedEndpoints.length });
      // Note: We're not auto-deleting on first failure to avoid false positives
      // In production, you'd want to track failure counts per endpoint
    }

    logStep("Push complete", { sent: successCount, total: subscriptions.length, failed: failedEndpoints.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length,
        failed: failedEndpoints.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Error", { error: (error as Error).message });
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
