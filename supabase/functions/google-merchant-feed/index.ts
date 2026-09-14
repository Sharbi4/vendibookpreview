import { fetchMerchantRows, MERCHANT_HEADER } from "../_shared/merchantFeedRows.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rows = await fetchMerchantRows();
    const tsv = [MERCHANT_HEADER.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n") + "\n";

    return new Response(tsv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Merchant feed error:", error);
    return new Response("Internal server error", { status: 500, headers: corsHeaders });
  }
});
