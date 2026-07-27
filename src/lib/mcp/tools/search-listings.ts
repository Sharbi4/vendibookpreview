import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;

export default defineTool({
  name: "search_listings",
  title: "Search Vendibook listings",
  description:
    "Search published Vendibook marketplace listings (food trucks, trailers, shared kitchens, vendor lots) by keyword, city, or transaction type. Returns public listing summaries only.",
  inputSchema: {
    query: z
      .string()
      .optional()
      .describe("Free-text search across title and description."),
    city: z.string().optional().describe("Filter by city name."),
    transaction_type: z
      .enum(["rent", "sale", "any"])
      .optional()
      .describe("Filter by rent, sale, or any."),
    limit: z.number().int().min(1).max(25).optional().describe("Max results, default 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, city, transaction_type, limit }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = supabase
      .from("listings")
      .select("id,title,city,state,price,transaction_type,category,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(limit ?? 10);
    if (query) q = q.ilike("title", `%${query}%`);
    if (city) q = q.ilike("city", `%${city}%`);
    if (transaction_type && transaction_type !== "any") {
      q = q.eq("transaction_type", transaction_type);
    }
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Search failed: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});
