import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_ID = "agent_0101kdmd2dn7exys7w22pnscqasf";
const API = "https://api.elevenlabs.io/v1";

/**
 * Admin-only maintenance endpoint that reads and updates the Vendi Voice
 * ElevenLabs agent (system prompt + client tool registry) so the voice agent
 * can lead a seller through the full List with Vendi listing interview.
 *
 * The ElevenLabs API key never leaves the server and is never returned.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const key = Deno.env.get("ELEVENLABS_API_KEY");
    if (!key) return json({ error: "elevenlabs_not_configured" }, 503);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Admin session required.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "unauthenticated" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "unauthenticated" }, 401);

    const { data: role } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "admin_required" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body?.action ?? "get");

    const el = async (path: string, init?: RequestInit) => {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch { /* keep raw text */ }
      return { ok: res.ok, status: res.status, body: parsed };
    };

    if (action === "get") {
      const agent = await el(`/convai/agents/${AGENT_ID}`);
      const tools = await el(`/convai/tools`);
      return json({ agent, tools }, agent.ok ? 200 : agent.status);
    }

    // Why did the last voice calls end? Returns termination reasons/errors for
    // recent conversations so dropped calls can be diagnosed without exposing
    // the API key or transcripts of unrelated agents.
    if (action === "diagnose") {
      const list = await el(`/convai/conversations?agent_id=${AGENT_ID}&page_size=5`);
      if (!list.ok) return json({ step: "list_conversations", ...list }, list.status);
      const rows = (list.body as { conversations?: Array<{ conversation_id?: string }> })?.conversations ?? [];
      const details: Array<Record<string, unknown>> = [];
      for (const row of rows.slice(0, 5)) {
        const id = row?.conversation_id;
        if (!id) continue;
        const res = await el(`/convai/conversations/${id}`);
        const meta = (res.body as Record<string, any>)?.metadata ?? {};
        details.push({
          conversation_id: id,
          status: meta?.status,
          termination_reason: meta?.termination_reason,
          error: meta?.error,
          warnings: meta?.warnings,
          duration_secs: meta?.call_duration_secs,
          mcp: meta?.features_usage?.external_mcp_servers,
        });
      }
      return json({ conversations: details });
    }


    if (action === "apply") {
      const prompt = String(body?.prompt ?? "");
      const firstMessage = String(body?.first_message ?? "");
      const toolDefs = Array.isArray(body?.tools) ? body.tools : [];
      if (!prompt) return json({ error: "prompt_required" }, 400);

      // 1. Upsert every client tool by name.
      const existing = await el(`/convai/tools`);
      if (!existing.ok) return json({ step: "list_tools", ...existing }, existing.status);
      const rows = (existing.body as { tools?: Array<Record<string, unknown>> })?.tools ?? [];
      const byName = new Map<string, string>();
      for (const row of rows) {
        const cfg = row?.tool_config as { name?: string } | undefined;
        const name = cfg?.name ?? (row?.name as string | undefined);
        const id = row?.id as string | undefined;
        if (name && id) byName.set(name, id);
      }

      const toolIds: string[] = [];
      const toolResults: Array<Record<string, unknown>> = [];
      for (const def of toolDefs) {
        const name = String((def as { name?: string })?.name ?? "");
        if (!name) continue;
        const payload = { tool_config: def };
        const id = byName.get(name);
        const res = id
          ? await el(`/convai/tools/${id}`, { method: "PATCH", body: JSON.stringify(payload) })
          : await el(`/convai/tools`, { method: "POST", body: JSON.stringify(payload) });
        const newId = (res.body as { id?: string })?.id ?? id;
        if (res.ok && newId) toolIds.push(newId);
        toolResults.push({ name, ok: res.ok, status: res.status, id: newId, error: res.ok ? undefined : res.body });
      }

      // 2. Patch the agent prompt, keeping any MCP servers already attached.
      const current = await el(`/convai/agents/${AGENT_ID}`);
      if (!current.ok) return json({ step: "get_agent", ...current }, current.status);
      const currentPrompt =
        ((current.body as Record<string, any>)?.conversation_config?.agent?.prompt ?? {}) as Record<string, unknown>;

      const patch = {
        conversation_config: {
          agent: {
            ...(firstMessage ? { first_message: firstMessage } : {}),
            prompt: {
              ...currentPrompt,
              prompt,
              tool_ids: toolIds,
            },
          },
        },
      };

      const updated = await el(`/convai/agents/${AGENT_ID}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });

      return json(
        {
          tools: toolResults,
          agent_updated: updated.ok,
          agent_status: updated.status,
          agent_error: updated.ok ? undefined : updated.body,
        },
        updated.ok ? 200 : updated.status,
      );
    }

    return json({ error: "unknown_action" }, 400);
  } catch (error) {
    console.error("elevenlabs-agent-configure error:", error);
    return json({ error: "unexpected", message: error instanceof Error ? error.message : "unknown" }, 500);
  }
});
