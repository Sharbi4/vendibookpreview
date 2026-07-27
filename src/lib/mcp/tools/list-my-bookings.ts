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
  name: "list_my_bookings",
  title: "List my Vendibook bookings",
  description:
    "List bookings made by the signed-in Vendibook user, most recent first. Respects Vendibook's per-user access rules.",
  inputSchema: {
    role: z
      .enum(["shopper", "host", "any"])
      .optional()
      .describe("Filter by whether you are the shopper (renter/buyer) or the host. Default any."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ role, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated." }], isError: true };
    }
    const uid = ctx.getUserId();
    let q = supabaseForUser(ctx)
      .from("bookings")
      .select(
        "id,listing_id,status,payment_status,start_date,end_date,total_amount,shopper_id,host_id,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (role === "shopper") q = q.eq("shopper_id", uid);
    else if (role === "host") q = q.eq("host_id", uid);
    else q = q.or(`shopper_id.eq.${uid},host_id.eq.${uid}`);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Query failed: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { bookings: data ?? [] },
    };
  },
});
