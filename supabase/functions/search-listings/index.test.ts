/**
 * E2E test: `fulfillment=` URL param → search-listings filter mapping.
 *
 * Verifies:
 *   1. Baseline (no filter) returns listings with mixed fulfillment_type.
 *   2. fulfillment_types=['pickup']    → only pickup | both
 *   3. fulfillment_types=['delivery']  → only delivery | both
 *   4. fulfillment_types=['on_site']   → only on_site
 *   5. fulfillment_types=['pickup','delivery'] → union of the above two
 *
 * Runs against the live deployed edge function with the anon key.
 */
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/search-listings`;

type FT = "pickup" | "delivery" | "on_site" | "both" | null;

async function search(body: Record<string, unknown>) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ mode: "all", page: 1, page_size: 100, ...body }),
  });
  const json = await res.json();
  assertEquals(res.status, 200, `edge function returned ${res.status}`);
  return json as { listings: Array<{ id: string; fulfillment_type: FT }> };
}

const matches = (ft: FT, wants: Set<string>) => {
  if (!ft) return false;
  if (wants.has("pickup") && (ft === "pickup" || ft === "both")) return true;
  if (wants.has("delivery") && (ft === "delivery" || ft === "both")) return true;
  if (wants.has("on_site") && ft === "on_site") return true;
  return false;
};

Deno.test("baseline returns listings (sanity)", async () => {
  const { listings } = await search({});
  assert(listings.length > 0, "expected at least one published listing");
});

Deno.test("fulfillment=pickup returns only pickup|both", async () => {
  const { listings } = await search({ fulfillment_types: ["pickup"] });
  assert(listings.length > 0, "expected pickup results");
  for (const l of listings) {
    assert(
      l.fulfillment_type === "pickup" || l.fulfillment_type === "both",
      `listing ${l.id} has fulfillment_type=${l.fulfillment_type}`,
    );
  }
});

Deno.test("fulfillment=delivery returns only delivery|both", async () => {
  const { listings } = await search({ fulfillment_types: ["delivery"] });
  for (const l of listings) {
    assert(
      l.fulfillment_type === "delivery" || l.fulfillment_type === "both",
      `listing ${l.id} has fulfillment_type=${l.fulfillment_type}`,
    );
  }
});

Deno.test("fulfillment=on_site returns only on_site", async () => {
  const { listings } = await search({ fulfillment_types: ["on_site"] });
  for (const l of listings) {
    assertEquals(l.fulfillment_type, "on_site", `listing ${l.id} leaked`);
  }
});

Deno.test("fulfillment=pickup+delivery is union (no on_site)", async () => {
  const wants = new Set(["pickup", "delivery"]);
  const { listings } = await search({ fulfillment_types: ["pickup", "delivery"] });
  for (const l of listings) {
    assert(matches(l.fulfillment_type, wants), `listing ${l.id} ft=${l.fulfillment_type} leaked`);
    assert(l.fulfillment_type !== "on_site", `on_site listing ${l.id} leaked`);
  }
});
