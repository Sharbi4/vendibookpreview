import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const json = (body: unknown, status = 200, extraHeaders?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

const MCP_VERSION = "2025-06-18";

const TOOLS = [
  {
    name: "check_listing_blockers",
    description:
      "Return the remaining blockers that prevent a Vendibook listing from being published. The caller must own the listing.",
    inputSchema: {
      type: "object" as const,
      properties: { listing_id: { type: "string" as const, description: "The listing UUID to inspect." } },
      required: ["listing_id"],
    },
  },
  {
    name: "publish_listing",
    description:
      "Publish a Vendibook listing owned by the signed-in user. Requires all blockers to be cleared and the seller's typed YES consent to be recorded in the app first.",
    inputSchema: {
      type: "object" as const,
      properties: {
        listing_id: { type: "string" as const, description: "The listing UUID to publish." },
        consent_acknowledged: {
          type: "boolean" as const,
          description: "Must be true. Verifies the seller's typed YES consent is recorded server-side.",
        },
      },
      required: ["listing_id", "consent_acknowledged"],
    },
  },
  {
    name: "list_upsell_products",
    description:
      "Return the Vendibook upgrade products available to the signed-in user, such as Vendibook Pro membership, Featured Boost, and Listing Concierge.",
    inputSchema: {
      type: "object" as const,
      properties: {
        listing_id: { type: "string" as const, description: "Optional listing UUID to scope upgrades to." },
      },
      required: [],
    },
  },
  {
    name: "create_upgrade_checkout",
    description:
      "Return a Vendibook checkout URL for an upgrade product (Vendibook Pro, Featured Boost, Listing Concierge). The user completes payment on the secure PayPal checkout page.",
    inputSchema: {
      type: "object" as const,
      properties: {
        product_slug: {
          type: "string" as const,
          enum: ["vendibook_pro", "boost-featured-30", "pro_listing_30", "listing_concierge"],
          description: "The upgrade product to purchase.",
        },
        listing_id: { type: "string" as const, description: "Optional listing UUID to attach the upgrade to." },
        discount_code: { type: "string" as const, description: "Optional promo/discount code." },
      },
      required: ["product_slug"],
    },
  },
];

async function validateToken(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, token };
}

function userClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
}

async function handleCheckBlockers(args: unknown, uid: string, token: string) {
  const parsed = z.object({ listing_id: z.string().uuid() }).safeParse(args);
  if (!parsed.success) return { isError: true, content: [{ type: "text", text: "Invalid listing_id." }] };
  const { listing_id } = parsed.data;
  const supabase = userClient(token);
  const { data: row, error } = await supabase
    .from("listings")
    .select(
      "id, host_id, status, title, description, category, mode, city, state, price_sale, price_monthly, price_weekly, price_daily, price_hourly, image_urls, condition, operational_status, title_status, has_lien, no_known_problems, known_problems, included_items, length_inches, height_inches, photos_exclusions_answered, published_at, deleted_at, moderation_status"
    )
    .eq("id", listing_id)
    .maybeSingle();
  if (error) return { isError: true, content: [{ type: "text", text: `Lookup failed: ${error.message}` }] };
  if (!row) return { isError: true, content: [{ type: "text", text: "Listing not found." }] };
  if (row.host_id !== uid) return { isError: true, content: [{ type: "text", text: "You do not own this listing." }] };
  if (row.deleted_at) return { isError: true, content: [{ type: "text", text: "This listing has been deleted." }] };

  const blockers: string[] = [];
  if (!row.title) blockers.push("Add a headline/title.");
  if (!row.description) blockers.push("Add a description.");
  if (!row.category) blockers.push("Select a category.");
  if (!row.mode) blockers.push("Select sale or rent.");
  if (!row.city || !row.state) blockers.push("Set city and state.");
  const images = Array.isArray(row.image_urls) ? row.image_urls : [];
  if (!images.length) blockers.push("Upload at least one photo.");
  if (row.mode === "sale") {
    if (Number(row.price_sale) <= 0) blockers.push("Set the sale price.");
  } else if (row.mode === "rent") {
    const hasRate =
      Number(row.price_monthly) > 0 ||
      Number(row.price_weekly) > 0 ||
      Number(row.price_daily) > 0 ||
      Number(row.price_hourly) > 0;
    if (!hasRate) blockers.push("Set at least one rental rate.");
  }
  const moderation = row.moderation_status;
  if (moderation && moderation !== "clear") {
    blockers.push("This listing is under review by our team and cannot be published right now.");
  }
  const isPublished = row.status === "published" && row.published_at;
  return {
    content: [
      {
        type: "text" as const,
        text:
          blockers.length === 0
            ? isPublished
              ? "This listing is already published and live."
              : "No blockers — the listing is ready to publish."
            : `Blockers (${blockers.length}): ${blockers.join("; ")}`,
      },
    ],
    structuredContent: { listing_id, ready: blockers.length === 0 && !isPublished, already_published: Boolean(isPublished), blockers },
  };
}

async function handlePublish(args: unknown, uid: string, token: string) {
  const parsed = z.object({ listing_id: z.string().uuid(), consent_acknowledged: z.boolean() }).safeParse(args);
  if (!parsed.success) return { isError: true, content: [{ type: "text", text: "Invalid arguments." }] };
  const { listing_id, consent_acknowledged } = parsed.data;
  if (!consent_acknowledged) {
    return {
      isError: true,
      content: [{ type: "text", text: "You must acknowledge the seller disclosure and type YES on screen before publishing." }],
    };
  }
  const supabase = userClient(token);
  const { data: current, error: readError } = await supabase
    .from("listings")
    .select(
      "id, host_id, status, published_at, deleted_at, moderation_status, title, description, category, mode, city, state, price_sale, price_monthly, price_weekly, price_daily, price_hourly, image_urls, seller_disclosure_acknowledged"
    )
    .eq("id", listing_id)
    .maybeSingle();
  if (readError) return { isError: true, content: [{ type: "text", text: `Read failed: ${readError.message}` }] };
  if (!current) return { isError: true, content: [{ type: "text", text: "Listing not found." }] };
  if (current.host_id !== uid) return { isError: true, content: [{ type: "text", text: "You do not own this listing." }] };
  if (current.deleted_at || ["removed", "rejected", "suspended", "sold", "rented"].includes(current.status)) {
    return { isError: true, content: [{ type: "text", text: "This listing cannot be published right now." }] };
  }
  if (current.status === "published" && current.published_at) {
    return {
      content: [{ type: "text", text: "This listing is already published." }],
      structuredContent: { listing_id, public_url: `/listing/${listing_id}`, already_published: true },
    };
  }
  if (!current.seller_disclosure_acknowledged) {
    return {
      isError: true,
      content: [{ type: "text", text: "The seller disclosure has not been acknowledged. The seller must type YES on screen." }],
    };
  }
  const blockers: string[] = [];
  if (!current.title) blockers.push("Add a headline/title.");
  if (!current.description) blockers.push("Add a description.");
  if (!current.category) blockers.push("Select a category.");
  if (!current.mode) blockers.push("Select sale or rent.");
  if (!current.city || !current.state) blockers.push("Set city and state.");
  const images = Array.isArray(current.image_urls) ? current.image_urls : [];
  if (!images.length) blockers.push("Upload at least one photo.");
  if (current.mode === "sale") {
    if (Number(current.price_sale) <= 0) blockers.push("Set the sale price.");
  } else if (current.mode === "rent") {
    const hasRate =
      Number(current.price_monthly) > 0 ||
      Number(current.price_weekly) > 0 ||
      Number(current.price_daily) > 0 ||
      Number(current.price_hourly) > 0;
    if (!hasRate) blockers.push("Set at least one rental rate.");
  }
  if (blockers.length) {
    return { isError: true, content: [{ type: "text", text: `Cannot publish yet. ${blockers.join("; ")}` }] };
  }
  const nowIso = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("listings")
    .update({ status: "published", published_at: nowIso } as never)
    .eq("id", listing_id)
    .is("published_at", null)
    .select("published_at");
  if (claimError) return { isError: true, content: [{ type: "text", text: `Publish failed: ${claimError.message}` }] };
  if (!claimed || claimed.length === 0) {
    const { data: rows, error: updateError } = await supabase
      .from("listings")
      .update({ status: "published" } as never)
      .eq("id", listing_id)
      .select("published_at");
    if (updateError) return { isError: true, content: [{ type: "text", text: `Publish failed: ${updateError.message}` }] };
    if (!rows || rows.length === 0) {
      return { isError: true, content: [{ type: "text", text: "Publishing did not complete. Please try again." }] };
    }
  }
  const { data: verified, error: verifyError } = await supabase
    .from("listings")
    .select("status, published_at")
    .eq("id", listing_id)
    .maybeSingle();
  if (verifyError || !verified || verified.status !== "published" || !verified.published_at) {
    return { isError: true, content: [{ type: "text", text: "Publishing did not complete. Your listing is still a draft." }] };
  }
  return {
    content: [{ type: "text" as const, text: `Published! Your listing is live at /listing/${listing_id}.` }],
    structuredContent: { listing_id, public_url: `/listing/${listing_id}`, published_at: verified.published_at },
  };
}

async function handleListUpsells(args: unknown, uid: string, token: string) {
  const parsed = z.object({ listing_id: z.string().uuid().optional() }).safeParse(args);
  if (!parsed.success) return { isError: true, content: [{ type: "text", text: "Invalid arguments." }] };
  const { listing_id } = parsed.data;
  const supabase = userClient(token);
  const { data, error } = await supabase
    .from("monetization_products")
    .select("id, slug, name, description, billing_type, price_cents, promo_price_cents, promo_starts_at, promo_ends_at, duration_days, is_active")
    .eq("is_active", true)
    .in("slug", ["vendibook_pro", "boost-featured-30", "pro_listing_30", "listing_concierge"])
    .order("display_order");
  if (error) return { isError: true, content: [{ type: "text", text: `Catalog lookup failed: ${error.message}` }] };
  const products = (data ?? []).map((p) => {
    const now = Date.now();
    const inPromo =
      p.promo_price_cents != null &&
      (!p.promo_starts_at || new Date(p.promo_starts_at).getTime() <= now) &&
      (!p.promo_ends_at || new Date(p.promo_ends_at).getTime() > now);
    const cents = inPromo ? p.promo_price_cents : p.price_cents;
    const price = cents ? `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}` : "$0";
    const cadence = p.billing_type === "recurring" ? "/mo" : p.duration_days ? ` · ${p.duration_days} days` : "";
    return { slug: p.slug, name: p.name, description: p.description, price_display: `${price}${cadence}`, listing_id: listing_id ?? null };
  });
  return {
    content: [{ type: "text" as const, text: JSON.stringify(products, null, 2) }],
    structuredContent: { products, listing_id: listing_id ?? null },
  };
}

async function handleCreateCheckout(args: unknown, uid: string, token: string) {
  const parsed = z
    .object({
      product_slug: z.enum(["vendibook_pro", "boost-featured-30", "pro_listing_30", "listing_concierge"]),
      listing_id: z.string().uuid().optional(),
      discount_code: z.string().optional(),
    })
    .safeParse(args);
  if (!parsed.success) return { isError: true, content: [{ type: "text", text: "Invalid arguments." }] };
  const { product_slug, listing_id, discount_code } = parsed.data;
  const supabase = userClient(token);
  const { data: product, error } = await supabase
    .from("monetization_products")
    .select("billing_type, is_active")
    .eq("slug", product_slug)
    .maybeSingle();
  if (error) return { isError: true, content: [{ type: "text", text: `Catalog lookup failed: ${error.message}` }] };
  if (!product?.is_active) return { isError: true, content: [{ type: "text", text: "That upgrade is not currently available." }] };

  if (product.billing_type === "recurring") {
    const { data, error: fnError } = await supabase.functions.invoke("paypal-subscription-create", {
      body: {
        product_slug,
        billing_interval: /annual|yearly/i.test(product_slug) ? "annual" : "monthly",
        return_path: listing_id ? `/listing/${listing_id}` : "/account",
        cancel_path: listing_id ? `/listing/${listing_id}` : "/pricing",
      },
    });
    if (fnError) return { isError: true, content: [{ type: "text", text: `Checkout failed: ${fnError.message}` }] };
    const payload = data as { approve_url?: string; url?: string; message?: string; error?: string };
    const url = payload?.approve_url ?? payload?.url;
    if (!url) return { isError: true, content: [{ type: "text", text: payload?.message ?? payload?.error ?? "We could not start that checkout." }] };
    return {
      content: [{ type: "text" as const, text: `Complete payment here: ${url}` }],
      structuredContent: { product_slug, listing_id: listing_id ?? null, checkout_url: url },
    };
  }

  const params = new URLSearchParams();
  if (listing_id) params.set("listing_id", listing_id);
  params.set("success", listing_id ? `/listing/${listing_id}` : "/account");
  params.set("cancel", listing_id ? `/listing/${listing_id}` : "/pricing");
  if (discount_code) params.set("discount", discount_code);
  const qs = params.toString();
  const url = `/checkout/product/${product_slug}${qs ? `?${qs}` : ""}`;
  return {
    content: [{ type: "text" as const, text: `Complete payment on the secure checkout page: ${url}` }],
    structuredContent: { product_slug, listing_id: listing_id ?? null, checkout_url: url },
  };
}

async function dispatchTool(name: string, args: unknown, uid: string, token: string) {
  switch (name) {
    case "check_listing_blockers":
      return handleCheckBlockers(args, uid, token);
    case "publish_listing":
      return handlePublish(args, uid, token);
    case "list_upsell_products":
      return handleListUpsells(args, uid, token);
    case "create_upgrade_checkout":
      return handleCreateCheckout(args, uid, token);
    default:
      return { isError: true, content: [{ type: "text" as const, text: `Unknown tool: ${name}` }] };
  }
}

const SESSION_ID = "vendibook-mcp";

function rpcRespond(req: Request, payload: unknown, status = 200) {
  const accept = req.headers.get("accept") ?? "";
  const wantsSse = accept.includes("text/event-stream") && !accept.includes("application/json");
  if (wantsSse) {
    const body = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
    return new Response(body, {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Mcp-Session-Id": SESSION_ID,
      },
    });
  }
  return json(payload, status, { "Mcp-Session-Id": SESSION_ID });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, accept, mcp-session-id, mcp-protocol-version",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      },
    });
  }

  // Streamable HTTP clients may open a GET stream or close the session with DELETE.
  if (req.method === "GET") {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(": connected\n\n"));
      },
    });
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Mcp-Session-Id": SESSION_ID,
      },
    });
  }
  if (req.method === "DELETE") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const rpc = body as { jsonrpc?: string; id?: number | string | null; method?: string; params?: any };
  if (rpc.jsonrpc !== "2.0") {
    return rpcRespond(req, { jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32600, message: "Invalid Request" } }, 400);
  }

  const method = rpc.method ?? "";

  // Handshake + discovery are unauthenticated so MCP clients can validate the
  // connection before a user session token is available. Tool execution below
  // still requires a valid Supabase access token.
  if (method === "initialize") {
    const requested = rpc.params?.protocolVersion;
    return rpcRespond(req, {
      jsonrpc: "2.0",
      id: rpc.id ?? null,
      result: {
        protocolVersion: typeof requested === "string" && requested ? requested : MCP_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "vendibook-elevenlabs-mcp", version: "0.1.0" },
      },
    });
  }

  if (typeof method === "string" && method.startsWith("notifications/")) {
    return new Response(null, { status: 202, headers: corsHeaders });
  }

  if (method === "ping") {
    return rpcRespond(req, { jsonrpc: "2.0", id: rpc.id ?? null, result: {} });
  }

  if (method === "tools/list") {
    return rpcRespond(req, { jsonrpc: "2.0", id: rpc.id ?? null, result: { tools: TOOLS } });
  }

  if (method === "resources/list") {
    return rpcRespond(req, { jsonrpc: "2.0", id: rpc.id ?? null, result: { resources: [] } });
  }

  if (method === "prompts/list") {
    return rpcRespond(req, { jsonrpc: "2.0", id: rpc.id ?? null, result: { prompts: [] } });
  }

  if (method === "tools/call") {
    const auth = await validateToken(req);
    if (!auth) {
      return rpcRespond(req, {
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: "You need to be signed in to Vendibook for this action. Ask the user to sign in and start the session again.",
            },
          ],
          isError: true,
        },
      });
    }
    const name = rpc.params?.name as string | undefined;
    const args = rpc.params?.arguments ?? {};
    if (!name) {
      return rpcRespond(req, { jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32602, message: "Missing tool name" } }, 400);
    }
    try {
      const result = await dispatchTool(name, args, auth.user.id, auth.token);
      return rpcRespond(req, {
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        result: {
          content: result.content,
          isError: result.isError ?? false,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "tool_error";
      return rpcRespond(req, {
        jsonrpc: "2.0",
        id: rpc.id ?? null,
        result: { content: [{ type: "text", text: message }], isError: true },
      });
    }
  }

  return rpcRespond(req, { jsonrpc: "2.0", id: rpc.id ?? null, error: { code: -32601, message: `Method not found: ${method}` } }, 404);
});

