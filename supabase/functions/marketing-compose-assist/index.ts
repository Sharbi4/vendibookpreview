// marketing-compose-assist — AI-generated headlines & insight blurbs via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callAI(messages: any[], tool?: any): Promise<any> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const body: any = { model: MODEL, messages };
  if (tool) {
    body.tools = [tool];
    body.tool_choice = { type: "function", function: { name: tool.function.name } };
  }
  const res = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Rate limited — please wait a moment and try again.");
  if (res.status === 402) throw new Error("Credits exhausted — add funds in Settings → Workspace → Usage.");
  if (!res.ok) throw new Error(`AI gateway error ${res.status}: ${await res.text()}`);
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { mode, theme } = await req.json();

    if (mode === "headlines") {
      const tool = {
        type: "function",
        function: {
          name: "return_headlines",
          description: "Return 3 distinct hero headline options for a luxury food-marketplace newsletter.",
          parameters: {
            type: "object",
            properties: {
              headlines: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
            },
            required: ["headlines"],
            additionalProperties: false,
          },
        },
      };
      const r = await callAI(
        [
          {
            role: "system",
            content:
              "You write editorial-style headlines for a premium food-business marketplace called Vendibook. Headlines are short (5–10 words), confident, and feel like a luxury magazine — never gimmicky, never emoji-laden. Examples: 'The market is moving. Are you?' / 'Your next opportunity is already listed.' Avoid clichés.",
          },
          { role: "user", content: "Generate 3 distinct hero headline options for this week's Vendibook Report." },
        ],
        tool
      );
      const args = JSON.parse(r.choices[0].message.tool_calls[0].function.arguments);
      return new Response(JSON.stringify({ headlines: args.headlines }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "insight") {
      const tool = {
        type: "function",
        function: {
          name: "return_insight",
          description: "Return a short editorial insight piece.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string" },
              pullQuote: { type: "string", description: "A 8–15 word italicized magazine-style pull quote." },
              body: { type: "string", description: "120–150 words of editorial copy from the Vendibook team." },
            },
            required: ["title", "pullQuote", "body"],
            additionalProperties: false,
          },
        },
      };
      const r = await callAI(
        [
          {
            role: "system",
            content:
              "You write short editorial notes for Vendibook — a food-business marketplace (trucks, kitchens, vendor spaces). Tone: insider, calm, premium, useful. Not promotional. 120–150 words. End with one practical takeaway. Do not include 'Sincerely' or a signature — the template adds '— The Vendibook Team'.",
          },
          { role: "user", content: `Write this week's insight on the theme: "${theme}"` },
        ],
        tool
      );
      const args = JSON.parse(r.choices[0].message.tool_calls[0].function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-compose-assist error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
