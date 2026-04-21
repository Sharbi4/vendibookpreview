import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Allow a user to reply to Vendi inside a concierge thread.
// Saves the user message, then asks Lovable AI to compose a follow-up reply with optional CTAs.

const SYSTEM = `You are Vendi, Vendibook's concierge. The user just replied inside an existing thread.
Respond briefly, helpfully, and in plain English. If a clear next step exists, return up to 2 actions
(label + url). If you don't have enough info, ask one clarifying question. Keep it under 60 words.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { thread_id, content } = await req.json();

    if (!thread_id || !content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "thread_id and content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership
    const { data: thread } = await supabase
      .from("concierge_threads")
      .select("id, user_id, topic, context")
      .eq("id", thread_id)
      .maybeSingle();
    if (!thread || thread.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert user message
    await supabase.from("concierge_messages").insert({
      thread_id,
      user_id: user.id,
      sender_role: "user",
      content: content.slice(0, 2000),
    });

    // Bump thread
    await supabase.from("concierge_threads").update({
      last_message_at: new Date().toISOString(),
    }).eq("id", thread_id);

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: true, ai_skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load recent context
    const { data: history } = await supabase
      .from("concierge_messages")
      .select("sender_role, content")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = [
      { role: "system", content: SYSTEM },
      { role: "system", content: `Thread topic: ${thread.topic}. Context: ${JSON.stringify(thread.context ?? {})}` },
      ...(history ?? []).map((m: any) => ({
        role: m.sender_role === "ai" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [{
          type: "function",
          function: {
            name: "reply",
            description: "Compose Vendi's reply.",
            parameters: {
              type: "object",
              properties: {
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
              required: ["content"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "reply" } },
      }),
    });

    let aiContent = "Got it — I'll keep an eye on that.";
    let actions: any[] = [];
    if (aiResp.ok) {
      const json = await aiResp.json();
      const tc = json?.choices?.[0]?.message?.tool_calls?.[0];
      if (tc) {
        try {
          const parsed = JSON.parse(tc.function.arguments);
          aiContent = parsed.content || aiContent;
          actions = Array.isArray(parsed.actions) ? parsed.actions.slice(0, 2) : [];
        } catch {}
      }
    }

    await supabase.from("concierge_messages").insert({
      thread_id,
      user_id: user.id,
      sender_role: "ai",
      content: aiContent,
      actions,
    });

    await supabase.from("concierge_threads").update({
      last_message_at: new Date().toISOString(),
      unread_count: 1,
    }).eq("id", thread_id);

    return new Response(JSON.stringify({ success: true, content: aiContent, actions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("concierge-reply error", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
