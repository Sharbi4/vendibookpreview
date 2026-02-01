import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SignJWT } from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service accounts configuration
const SERVICE_ACCOUNTS: Record<string, { name: string; permissions: string[] }> = {
  clawdbot: {
    name: 'Clawdbot Service Account',
    permissions: ['read:listings', 'read:profiles', 'read:bookings', 'write:analytics'],
  },
  // Add more service accounts as needed
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service_account_id, api_secret } = await req.json();

    // Validate required fields
    if (!service_account_id || !api_secret) {
      return new Response(
        JSON.stringify({ error: 'Missing service_account_id or api_secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the API secret
    const expectedSecret = Deno.env.get('SERVICE_ACCOUNT_SECRET');
    if (!expectedSecret || api_secret !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: 'Invalid API secret' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if service account exists
    const serviceAccount = SERVICE_ACCOUNTS[service_account_id];
    if (!serviceAccount) {
      return new Response(
        JSON.stringify({ error: 'Unknown service account' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate JWT token
    const supabaseJwtSecret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseJwtSecret) {
      throw new Error('JWT secret not configured');
    }

    // Use the service role key to create a signing key
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(supabaseJwtSecret.substring(0, 32)); // Use first 32 chars as key

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const token = await new SignJWT({
      sub: service_account_id,
      name: serviceAccount.name,
      permissions: serviceAccount.permissions,
      type: 'service_account',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + expiresIn)
      .setIssuer('vendibook')
      .sign(secretKey);

    console.log(`Generated token for service account: ${service_account_id}`);

    return new Response(
      JSON.stringify({
        access_token: token,
        token_type: 'Bearer',
        expires_in: expiresIn,
        service_account: {
          id: service_account_id,
          name: serviceAccount.name,
          permissions: serviceAccount.permissions,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating service token:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
