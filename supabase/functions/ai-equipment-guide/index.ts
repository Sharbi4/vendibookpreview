import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  gatherSources,
  formatSourceContext,
  sourcesToCitations,
  todayISO,
} from "../_shared/firecrawl-research.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TODAY = todayISO();
const YEAR = new Date().getUTCFullYear();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { equipment, issue, maintenanceType } = await req.json();

    if (!equipment || equipment.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Equipment name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedEquipment = equipment.trim().slice(0, 200);
    const trimmedIssue = issue?.trim().slice(0, 500) || "";
    const trimmedType = maintenanceType?.trim() || "general";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Live grounding — pull manufacturer/manual/maintenance docs.
    const focusQuery =
      trimmedType === "troubleshooting"
        ? `${trimmedEquipment} troubleshooting ${trimmedIssue || "common problems"} ${YEAR}`
        : trimmedType === "preventive"
          ? `${trimmedEquipment} preventive maintenance schedule ${YEAR}`
          : `${trimmedEquipment} maintenance guide manual ${YEAR}`;

    const sources = await gatherSources(
      [
        focusQuery,
        `${trimmedEquipment} commercial kitchen maintenance best practices`,
        `${trimmedEquipment} safety inspection NFPA OSHA`,
      ],
      3,
      8,
    );
    const sourceContext = formatSourceContext(sources);

    const systemPrompt = `You are a master commercial kitchen and mobile food equipment technician. Today is ${TODAY}. You produce accurate, safety-first maintenance guides grounded in manufacturer docs and industry standards (NFPA 96, OSHA, NSF).

Rules:
- Ground specific intervals, torque specs, voltages, refrigerant types, and code citations in the SOURCE MATERIAL when available; cite with [N] markers.
- If a spec isn't in the sources, give a conservative general best-practice and mark it "(verify in your unit's manual)".
- Always include lockout/tagout, gas shut-off, and PPE warnings where relevant.
- Tell the operator when a licensed technician is required (gas, refrigerant, high-voltage, hood suppression).

Respond ONLY with valid JSON:
{
  "title": "guide title",
  "equipment": "${trimmedEquipment}",
  "overview": "1-2 sentence equipment role + why maintenance matters",
  "maintenanceSchedule": {
    "daily": ["task 1"],
    "weekly": ["task 1"],
    "monthly": ["task 1"],
    "quarterly": ["task 1"],
    "annually": ["task 1"]
  },
  "stepByStepGuide": [
    { "step": 1, "title": "step title", "instructions": "detailed steps with [N] citations", "tips": "pro tip", "warnings": "safety warning" }
  ],
  "troubleshooting": [
    { "problem": "problem", "cause": "likely cause", "solution": "fix with [N] citation if sourced" }
  ],
  "safetyTips": ["tip 1"],
  "complianceNotes": ["NFPA/OSHA/health-code reference if applicable"],
  "estimatedTime": "time estimate",
  "toolsNeeded": ["tool 1"],
  "partsConsumables": ["filter type", "gasket type"],
  "professionalHelpNeeded": "when to call a licensed tech",
  "lastUpdated": "${TODAY}"
}`;

    const userPrompt = `Create a ${YEAR} maintenance guide for:
Equipment: ${trimmedEquipment}
${trimmedIssue ? `Specific Issue/Concern: ${trimmedIssue}` : ""}
Maintenance Focus: ${trimmedType === "preventive" ? "Preventive maintenance and care" : trimmedType === "troubleshooting" ? "Troubleshooting and repairs" : "General maintenance and care"}

Tailor for a food truck operator or commercial kitchen manager working in the field.

SOURCE MATERIAL (live web results, ${TODAY}):
${sourceContext}`;

    console.log("ai-equipment-guide grounded:", trimmedEquipment, `(${sources.length} sources)`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate equipment guide");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content in AI response");

    let result: any;
    try {
      result = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("Could not parse AI response");
      result = JSON.parse(m[0]);
    }

    result.sources = sourcesToCitations(sources);
    if (!result.lastUpdated) result.lastUpdated = TODAY;

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in ai-equipment-guide function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
