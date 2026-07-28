import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Phase 4 — Central AI Orchestrator
// Body: { user_id, event_type, entity_id?, payload? }
// Decides channel + timing + content, then dispatches via concierge-orchestrator (in-app/SMS) or send-transactional-email.

interface RouteRequest {
  user_id: string;
  event_type: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
  force?: boolean; // bypass cooldown
}

const ROUTER_SYSTEM = `You are Vendibook's communications router. Given an event, user journey signals, channel preferences, and rule defaults, decide:
- channel: "inapp" | "sms" | "email" | "skip"
- priority: "low" | "normal" | "high"
- delay_minutes: integer (0 for immediate)
- rationale: 1 short sentence (why this channel + timing)

Rules:
- Respect user opt-outs (sms_opted_in=false → never sms; email_opted_in=false → never email).
- Prefer SMS for time-sensitive (booking requests, instant book, payouts) — only if opted in.
- Prefer in-app for celebrations, tips, optimization nudges.
- Prefer email for digests, receipts, weekly summaries.
- If quiet hours apply and not high priority, set delay_minutes to push past the window.
- If rule cooldown was hit recently, return "skip" with reason.
Return ONLY a tool call to "decide_route".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = (await req.json()) as RouteRequest;
    const { user_id, event_type, entity_id, payload = {}, force = false } = body;

    if (!user_id || !event_type) {
      return new Response(JSON.stringify({ error: "user_id and event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load rule
    const { data: rule } = await supabase
      .from("orchestration_rules")
      .select("*")
      .eq("event_type", event_type)
      .maybeSingle();

    if (rule && !rule.enabled) {
      return logAndReturn(supabase, { user_id, event_type, entity_id, payload, suppressed: true, suppression_reason: "rule_disabled" });
    }

    // Cooldown check
    if (!force && rule?.cooldown_minutes && rule.cooldown_minutes > 0) {
      const since = new Date(Date.now() - rule.cooldown_minutes * 60_000).toISOString();
      const { count } = await supabase
        .from("orchestration_decisions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("event_type", event_type)
        .eq("suppressed", false)
        .gte("created_at", since);
      if ((count ?? 0) > 0) {
        return logAndReturn(supabase, { user_id, event_type, entity_id, payload, suppressed: true, suppression_reason: "cooldown" });
      }
    }

    // Load user signals
    const [{ data: profile }, { data: journey }, { data: smsSub }] = await Promise.all([
      supabase.from("profiles").select("first_name,full_name,business_name,public_city,public_state,quiet_hours_start,quiet_hours_end,quiet_hours_timezone").eq("id", user_id).maybeSingle(),
      supabase.from("user_journey_state").select("*").eq("user_id", user_id).maybeSingle(),
      supabase.from("sms_subscriptions").select("opted_in,phone_number").eq("user_id", user_id).maybeSingle().then((r) => r).catch(() => ({ data: null })) as any,
    ]);

    const sms_opted_in = !!smsSub?.opted_in && !!smsSub?.phone_number;
    const email_opted_in = true; // assume yes unless user unsubscribed (handled downstream)

    // Ask AI to decide
    const decisionInput = {
      event_type,
      rule: rule ? { default_channel: rule.default_channel, priority: rule.priority, respect_quiet_hours: rule.respect_quiet_hours, template_hint: rule.template_hint } : null,
      profile,
      journey,
      sms_opted_in,
      email_opted_in,
      payload,
      now_iso: new Date().toISOString(),
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: ROUTER_SYSTEM },
          { role: "user", content: JSON.stringify(decisionInput) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "decide_route",
            description: "Pick channel, priority, delay, and rationale.",
            parameters: {
              type: "object",
              properties: {
                channel: { type: "string", enum: ["inapp", "sms", "email", "skip"] },
                priority: { type: "string", enum: ["low", "normal", "high"] },
                delay_minutes: { type: "integer" },
                rationale: { type: "string" },
              },
              required: ["channel", "priority", "delay_minutes", "rationale"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "decide_route" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI router failed", aiResp.status, t);
      // Fallback to rule defaults
      const fallback = {
        channel: rule?.default_channel ?? "inapp",
        priority: rule?.priority ?? "normal",
        delay_minutes: 0,
        rationale: "ai_unavailable_fallback_to_rule",
      };
      return await dispatch(supabase, SUPABASE_URL, SERVICE_KEY, { user_id, event_type, entity_id, payload, decision: fallback, sms_opted_in });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const decision = toolCall ? JSON.parse(toolCall.function.arguments) : {
      channel: rule?.default_channel ?? "inapp",
      priority: rule?.priority ?? "normal",
      delay_minutes: 0,
      rationale: "no_tool_call_fallback",
    };

    return await dispatch(supabase, SUPABASE_URL, SERVICE_KEY, { user_id, event_type, entity_id, payload, decision, sms_opted_in });
  } catch (e: any) {
    console.error("orchestrator-route error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function dispatch(
  supabase: any,
  SUPABASE_URL: string,
  SERVICE_KEY: string,
  args: { user_id: string; event_type: string; entity_id?: string; payload: any; decision: any; sms_opted_in: boolean },
) {
  const { user_id, event_type, entity_id, payload, decision, sms_opted_in } = args;

  if (decision.channel === "skip") {
    return logAndReturn(supabase, { user_id, event_type, entity_id, payload, suppressed: true, suppression_reason: decision.rationale, chosen_channel: "skip", priority: decision.priority, rationale: decision.rationale });
  }

  // Hard guards
  if (decision.channel === "sms" && !sms_opted_in) {
    decision.channel = "inapp";
    decision.rationale = `${decision.rationale} (downgraded: no sms opt-in)`;
  }

  // Forward to concierge orchestrator which handles AI compose + delivery + SMS fan-out
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/concierge-orchestrator`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        user_id,
        event_type,
        entity_id,
        payload: { ...payload, _orchestrator: { rationale: decision.rationale, priority: decision.priority } },
        channel_hint: decision.channel === "email" ? "email" : decision.channel,
      }),
    });
  } catch (e) {
    console.error("dispatch to concierge failed", e);
  }

  return logAndReturn(supabase, {
    user_id, event_type, entity_id, payload,
    suppressed: false,
    chosen_channel: decision.channel,
    priority: decision.priority,
    rationale: decision.rationale,
    outcome: { delay_minutes: decision.delay_minutes, dispatched_at: new Date().toISOString() },
  });
}

async function logAndReturn(supabase: any, row: any) {
  await supabase.from("orchestration_decisions").insert({
    user_id: row.user_id,
    event_type: row.event_type,
    entity_id: row.entity_id ?? null,
    chosen_channel: row.chosen_channel ?? null,
    priority: row.priority ?? null,
    suppressed: !!row.suppressed,
    suppression_reason: row.suppression_reason ?? null,
    rationale: row.rationale ?? null,
    payload: row.payload ?? {},
    outcome: row.outcome ?? {},
  });
  return new Response(JSON.stringify({ success: true, ...row }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
