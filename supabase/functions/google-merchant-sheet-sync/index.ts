import { fetchMerchantRows, MERCHANT_HEADER } from "../_shared/merchantFeedRows.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-task-secret",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = Deno.env.get("MERCHANT_SHEET_ID") ?? "1Q5ccY7wuvXhU4xnuLeB7upqwe4Ciqe6SM_K97optgpI";
const SHEET_TAB = Deno.env.get("MERCHANT_SHEET_TAB") ?? "Sheet1";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sheets(method: string, path: string, body?: unknown) {
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY ?? "",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const details = await res.text();
    console.error(`Sheets request failed [${res.status}]: ${details}`);
    throw new Error(`[${res.status}] ${details}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
      return json({ error: "Google Sheets connection is not configured" }, 500);
    }

    const secrets = [Deno.env.get("DIGEST_TEST_SECRET"), Deno.env.get("FEATURE_CAMPAIGN_TOKEN")].filter(Boolean);
    const provided = req.headers.get("x-admin-task-secret");
    const serviceKey = req.headers.get("authorization")?.replace("Bearer ", "");
    const isService = serviceKey && serviceKey === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isService && !(provided && secrets.includes(provided))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const rows = await fetchMerchantRows();

    // Clear old products (keep the header row), then write the fresh set.
    await sheets("POST", `/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_TAB}!A2:AL1000:clear`, {});

    const values = [MERCHANT_HEADER, ...rows];
    await sheets(
      "PUT",
      `/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_TAB}!A1:AL${values.length}?valueInputOption=RAW`,
      { range: `${SHEET_TAB}!A1:AL${values.length}`, majorDimension: "ROWS", values },
    );

    return json({ ok: true, products: rows.length, spreadsheetId: SPREADSHEET_ID, tab: SHEET_TAB });
  } catch (error) {
    console.error("Sheet sync error:", error);
    return json({ error: "Sheet sync failed", details: String(error) }, 500);
  }
});
