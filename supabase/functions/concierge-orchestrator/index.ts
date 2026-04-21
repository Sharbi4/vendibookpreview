import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Triggers the AI concierge to generate a proactive message in response to an event.
// Body: { user_id, event_type, entity_id?, payload?, channel_hint? }

interface OrchestratorRequest {
  user_id: string;
  event_type: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
  channel_hint?: "inapp" | "sms" | "email" | "auto";
}

const SYSTEM_PROMPT = `You are "Vendi", Vendibook's friendly, sharp marketplace concierge.
You write proactive, ultra-concise messages to hosts, sellers, renters, and buyers to drive engagement, sharing, and bookings.
Rules:
- Keep messages under 240 chars when channel is sms; under 600 chars otherwise.
- Always include 1-3 actionable next steps as buttons.
- Be warm, never spammy. Reference specifics from context (listing title, city, $) when present.
- Never invent facts. If context is thin, ask one short qualifying question.
Return ONLY a tool call to "compose_concierge_message".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = (await req.json()) as OrchestratorRequest;
    const { user_id, event_type, entity_id, payload = {}, channel_hint = "auto" } = body;

    if (!user_id || !event_type) {
      return new Response(JSON.stringify({ error: "user_id and event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log event
    const { data: eventRow } = await supabase
      .from("concierge_events")
      .insert({ user_id, event_type, entity_id, payload })
      .select()
      .single();

    // Pull lightweight user context
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name,full_name,business_name,public_city,public_state")
      .eq("id", user_id)
      .maybeSingle();

    const userPrompt = JSON.stringify({
      event_type,
      channel_hint,
      profile,
      payload,
    });

    // Call Lovable AI Gateway with tool-calling for structured output
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "compose_concierge_message",
            description: "Compose a proactive concierge message and CTAs.",
            parameters: {
              type: "object",
              properties: {
                topic: { type: "string", description: "Short topic label, e.g. 'Listing live'." },
                priority: { type: "string", enum: ["low", "normal", "high"] },
                channel: { type: "string", enum: ["inapp", "sms", "email"] },
                content: { type: "string" },
                actions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      label: { type: "string" },
                      url: { type: "string" },
                      kind: { type: "string", enum: ["link", "share", "dismiss"] },
                    },
                    required: ["label", "kind"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["topic", "priority", "channel", "content", "actions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "compose_concierge_message" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "ai_failed", status: aiResp.status }), {
        status: aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "no_tool_call" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(toolCall.function.arguments);
    const { topic, priority, channel, content, actions } = args;

    // Find or create thread for this topic
    const { data: existing } = await supabase
      .from("concierge_threads")
      .select("*")
      .eq("user_id", user_id)
      .eq("topic", topic)
      .eq("status", "open")
      .maybeSingle();

    let threadId = existing?.id as string | undefined;
    if (!threadId) {
      const { data: created, error: createErr } = await supabase
        .from("concierge_threads")
        .insert({
          user_id,
          topic,
          priority,
          context: { event_type, entity_id, payload },
          last_message_at: new Date().toISOString(),
          unread_count: 1,
        })
        .select()
        .single();
      if (createErr) throw createErr;
      threadId = created.id;
    } else {
      await supabase
        .from("concierge_threads")
        .update({
          priority,
          last_message_at: new Date().toISOString(),
          unread_count: (existing.unread_count || 0) + 1,
        })
        .eq("id", threadId);
    }

    // Insert AI message
    await supabase.from("concierge_messages").insert({
      thread_id: threadId,
      user_id,
      sender_role: "ai",
      content,
      actions,
      metadata: { event_type, entity_id, channel },
    });

    // Optional fan-out: SMS for high priority or sms channel
    if (channel === "sms" || (priority === "high" && channel_hint !== "inapp")) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            user_id,
            template_name: `concierge_${topic.toLowerCase().replace(/\s+/g, "_")}`,
            body: content.length > 240 ? content.slice(0, 237) + "..." : content,
            category: priority === "high" ? "alerts" : "marketing",
            metadata: { thread_id: threadId, event_type },
          }),
        });
      } catch (e) {
        console.error("sms fanout failed", e);
      }
    }

    // Mark event processed
    if (eventRow?.id) {
      await supabase.from("concierge_events").update({ processed_at: new Date().toISOString() }).eq("id", eventRow.id);
    }

    return new Response(JSON.stringify({ success: true, thread_id: threadId, topic, priority, channel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("orchestrator error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
