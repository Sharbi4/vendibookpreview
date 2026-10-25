import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** The only agents this endpoint may touch. Default: Vendi Voice (seller listing interview). */
const AGENTS: Record<string, string> = {
  vendi: "agent_0101kdmd2dn7exys7w22pnscqasf",
  // Atlas, the public sales agent (src/lib/atlas/atlasConfig.ts is the source of its prompt + tools).
  atlas: "agent_1501m4rhvkz9fsbs5ce89zvk2k7b",
};
const API = "https://api.elevenlabs.io/v1";

/**
 * Admin-only maintenance endpoint that reads and updates Vendibook's
 * ElevenLabs agents (system prompt + client tool registry): Vendi Voice
 * (body.agent "vendi", the default) and Atlas (body.agent "atlas").
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
    const target = String(body?.agent ?? "vendi");
    const AGENT_ID = target === 'allison' ? Deno.env.get('ALLISON_AGENT_ID') : (Object.hasOwn(AGENTS, target) ? AGENTS[target] : undefined);
    if (!AGENT_ID) return json({ error: "unknown_agent" }, 400);

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

    // The provider defaults to 30 tools per page. A partial registry caused
    // repeated syncs to create duplicate attachments instead of finding tools.
    const listTools = async () => {
      const rows: Array<Record<string, any>> = [];
      const seen = new Set<string>();
      let cursor = '';
      for (let page = 0; page < 100; page++) {
        const result = await el(`/convai/tools?page_size=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
        if (!result.ok) return result;
        const body = result.body as any;
        rows.push(...(body.tools ?? []));
        if (!body.has_more) return { ok: true, status: 200, body: { tools: rows } };
        if (!body.next_cursor || seen.has(body.next_cursor)) break;
        cursor = body.next_cursor; seen.add(cursor);
      }
      return { ok: false, status: 502, body: { error: 'Incomplete tool registry; no configuration changed.' } };
    };

    if (action === "get") {
      const agent = await el(`/convai/agents/${AGENT_ID}`);
      const tools = await listTools();
      return json({ agent, tools }, agent.ok ? 200 : agent.status);
    }

    if (action === "status") {
      const agent = await el(`/convai/agents/${AGENT_ID}`);
      if (!agent.ok) return json({ error: 'Unable to read agent configuration' }, agent.status);
      const registry = await listTools();
      if (!registry.ok) return json({ error: 'Unable to read tool registry' }, registry.status);
      const config = (agent.body as any)?.conversation_config?.agent ?? {};
      const prompt = config.prompt ?? {};
      const ids = Array.isArray(prompt.tool_ids) ? prompt.tool_ids : [];
      const rows = (registry.body as any)?.tools ?? [];
      const attached = rows.filter((r: any) => ids.includes(r.id)).map((r: any) => ({ name: r.tool_config?.name ?? r.name, type: r.tool_config?.type ?? 'unknown' }));
      return json({ first_message: config.first_message, attached_tools: attached,
        unresolved_tool_count: ids.length - attached.length,
        inline_tools: Array.isArray(prompt.tools) ? prompt.tools.map((t: any) => ({ name: t.name, type: t.type })) : [],
        integration_fields: Object.keys(prompt).filter(k => /mcp|integration/i.test(k)),
        has_permit_guidance: String(prompt.prompt ?? '').includes('get_permit_requirements'),
        has_buyer_follow_up: String(prompt.prompt ?? '').includes('offer_buyer_follow_up'),
        has_calendly_guidance: String(prompt.prompt ?? '').includes('Customer-success meetings through Calendly'),
        provider_auth_enabled: (agent.body as any)?.platform_settings?.auth?.enable_auth === true,
        native_transfer: prompt.built_in_tools?.transfer_to_agent ?? null,
        duplicate_tool_names: attached.map((t: any) => t.name).filter((name: string, index: number, all: string[]) => all.indexOf(name) !== index),
        configured_agent_matches_owner: target !== 'allison' || AGENT_ID === 'agent_8301m5nh7dq6e1x9wgqk2yx7k4pd',
      });
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
      // This sync only manages browser tools; existing provider integrations remain attached.
      if (
        (target === "atlas" || target === "allison") &&
        toolDefs.some((d: { type?: string; name?: string }) => d?.type !== "client" || !/^[a-z_]{1,40}$/.test(String(d?.name ?? "")))
      ) {
        return json({ error: "atlas_client_tools_only" }, 400);
      }

      // 1. Upsert every client tool by name.
      const existing = await listTools();
      if (!existing.ok) return json({ step: "list_tools", ...existing }, existing.status);
      const rows = (existing.body as { tools?: Array<Record<string, unknown>> })?.tools ?? [];
      // Tools are shared across the ElevenLabs workspace. For Atlas, only reuse
      // tools already attached to Atlas so Vendi Voice's tools are never changed.
      let allowedIds: Set<string> | null = null;
      if (target !== "vendi") {
        const agentNow = await el(`/convai/agents/${AGENT_ID}`);
        if (!agentNow.ok) return json({ step: "get_agent", ...agentNow }, agentNow.status);
        const ids = (agentNow.body as Record<string, any>)?.conversation_config?.agent?.prompt?.tool_ids;
        allowedIds = new Set(Array.isArray(ids) ? ids : []);
      }
      const byName = new Map<string, string>();
      for (const row of rows) {
        const cfg = row?.tool_config as { name?: string; type?: string } | undefined;
        const name = cfg?.name ?? (row?.name as string | undefined);
        const id = row?.id as string | undefined;
        if (name && id && (!allowedIds || (allowedIds.has(id) && cfg?.type === 'client'))) byName.set(name, id);
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

      if (toolResults.some(r => !r.ok)) return json({ agent_updated: false, error: 'Some tools failed; agent configuration was not replaced.', tools: toolResults }, 502);

      // 2. Patch the agent prompt, keeping MCP servers and existing integration tools attached.
      const current = await el(`/convai/agents/${AGENT_ID}`);
      if (!current.ok) return json({ step: "get_agent", ...current }, current.status);
      // ElevenLabs returns inline `tools` with the agent; sending them back with
      // `tool_ids` is rejected, so strip them and use tool_ids only.
      const { tools: _inlineTools, ...currentPrompt } =
        ((current.body as Record<string, any>)?.conversation_config?.agent?.prompt ?? {}) as Record<string, unknown>;
      const existingIds = Array.isArray(currentPrompt.tool_ids) ? currentPrompt.tool_ids.filter((id): id is string => typeof id === 'string') : [];
      const registryById = new Map(rows.map(r => [String(r.id), r]));
      if (existingIds.some(id => !registryById.has(id))) return json({ agent_updated: false, error: 'An attached tool could not be resolved; refusing to discard integrations.' }, 409);
      // Replace this agent's browser registry, retaining integrations. Stale
      // inherited publishing/sending tools must not remain available to Allison.
      const preservedIds = target === 'vendi' ? existingIds : existingIds.filter(id => (registryById.get(id)?.tool_config as any)?.type !== 'client');
      const mergedIds = [...new Set([...preservedIds, ...toolIds])];
      // Do not silently discard an inline integration that has no registry ID.
      // ElevenLabs echoes attached registry tools inline (often without `id`), and
      // system tools live in `built_in_tools`; both are kept, so match them by name.
      const attachedNames = new Set(rows.filter(r => existingIds.includes(String(r?.id))).map(r => String((r?.tool_config as any)?.name ?? r?.name ?? '')));
      const builtIns = (currentPrompt as any).built_in_tools;
      const builtInNames = new Set(builtIns && typeof builtIns === 'object' ? Object.entries(builtIns).filter(([, v]) => v).flatMap(([k, v]: [string, any]) => [k, String(v?.name ?? '')]) : []);
      const unmanagedInline = Array.isArray(_inlineTools) ? _inlineTools.filter((t: any) => t?.type !== 'client'
        && !existingIds.includes(t?.id) && !attachedNames.has(String(t?.name ?? ''))
        && !(t?.type === 'system' && builtInNames.has(String(t?.name ?? '')))) : [];
      if ((target === 'atlas' || target === 'allison') && unmanagedInline.length) return json({ agent_updated: false, error: 'Existing inline integration tools need preservation review before syncing.',
        unmanaged_inline: unmanagedInline.map((t: any) => ({ name: t?.name, type: t?.type })), tools: toolResults }, 409);

      const counterpart = target === 'atlas' ? Deno.env.get('ALLISON_AGENT_ID') : target === 'allison' ? AGENTS.atlas : undefined;
      const nativeTransfer = counterpart ? {
        type: 'system', name: 'transfer_to_agent',
        description: 'Outside the Vendibook website only: transfer to the other AI specialist after the customer asks or agrees. Website sessions use their browser handoff tool. A human request must never be redirected to another AI.',
        params: { system_tool_type: 'transfer_to_agent', transfers: [{
          agent_id: counterpart,
          condition: target === 'atlas'
            ? 'The customer agreed to Allison AI customer support for an account or technical issue, and this is not a Vendibook website client session. Never for a request to speak with a human.'
            : 'The customer explicitly asked for Atlas AI sales assistance or agreed to that handoff, and this is not a Vendibook website client session. Do not automatically transfer ordinary sales questions or bounce them back.',
          delay_ms: 0,
          transfer_message: target === 'atlas' ? "I'm connecting you with Allison, our AI support assistant." : "I'm connecting you with Atlas, our AI sales assistant.",
          enable_transferred_agent_first_message: false,
        }] },
      } : undefined;

      const patch = {
        conversation_config: {
          agent: {
            ...(firstMessage ? { first_message: firstMessage } : {}),
            prompt: {
              ...currentPrompt,
              ...(nativeTransfer ? { built_in_tools: { ...(builtIns ?? {}), transfer_to_agent: nativeTransfer } } : {}),
              prompt,
              tool_ids: mergedIds,
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
          preserved_tool_count: preservedIds.filter(id => !toolIds.includes(id)).length,
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
