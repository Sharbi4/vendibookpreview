// Retired for new purchases. Historical cash orders remain readable.
import { corsHeaders, jsonError } from "../_shared/jsonError.ts";
Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return jsonError(410, "cash_sales_retired", "Equipment purchases require seller approval and invoice payment. Return to the listing to submit a purchase request.");
});
