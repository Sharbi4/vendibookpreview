import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!;

function supabaseForUser(ctx: ToolContext) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_listings",
  title: "List my Vendibook listings",
  description:
    "List all listings owned by the signed-in Vendibook user (drafts, published, and archived).",
  inputSchema: {
    status: z
      .enum(["draft", "published", "archived", "any"])
      .optional()
      .describe("Filter by status, default any."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    let q = supabaseForUser(ctx)
      .from("listings")
      .select("id,title,status,transaction_type,city,state,price,published_at,updated_at")
      .eq("owner_id", ctx.getUserId())
      .order("updated_at", { ascending: false })
      .limit(limit ?? 25);
    if (status && status !== "any") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Query failed: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
