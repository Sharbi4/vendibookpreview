import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This endpoint is public. Never expose a server or connector credential.
    // Owner-supplied key (billing-enabled, vendibook.com referrers) takes priority
    // over the auto-managed key, which cannot be overwritten.
    const BROWSER_KEY =
      Deno.env.get("VENDIBOOK_MAPS_BROWSER_KEY") || Deno.env.get("GOOGLE_MAPS_BROWSER_KEY");

    if (!BROWSER_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Maps API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ apiKey: BROWSER_KEY }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
