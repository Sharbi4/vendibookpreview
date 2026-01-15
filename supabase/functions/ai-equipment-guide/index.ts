import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert commercial kitchen equipment technician and maintenance specialist. You provide detailed, practical maintenance guides for food truck, food trailer, and commercial kitchen equipment.

Your responses should be:
- Practical and actionable
- Safety-focused with proper warnings
- Include step-by-step instructions
- Cover preventive maintenance schedules
- Include troubleshooting tips
- Reference industry best practices

Always respond with valid JSON in this exact format:
{
  "title": "Maintenance guide title",
  "equipment": "Equipment name",
  "overview": "Brief overview of the equipment and its importance",
  "maintenanceSchedule": {
    "daily": ["task 1", "task 2"],
    "weekly": ["task 1", "task 2"],
    "monthly": ["task 1", "task 2"],
    "quarterly": ["task 1", "task 2"]
  },
  "stepByStepGuide": [
    {
      "step": 1,
      "title": "Step title",
      "instructions": "Detailed instructions",
      "tips": "Pro tips for this step",
      "warnings": "Safety warnings if applicable"
    }
  ],
  "troubleshooting": [
    {
      "problem": "Common problem",
      "cause": "Likely cause",
      "solution": "How to fix it"
    }
  ],
  "safetyTips": ["tip 1", "tip 2"],
  "estimatedTime": "Time estimate",
  "toolsNeeded": ["tool 1", "tool 2"],
  "professionalHelpNeeded": "When to call a professional"
}`;

    const userPrompt = `Create a comprehensive maintenance guide for:
Equipment: ${trimmedEquipment}
${trimmedIssue ? `Specific Issue/Concern: ${trimmedIssue}` : ""}
Maintenance Focus: ${trimmedType === "preventive" ? "Preventive maintenance and care" : trimmedType === "troubleshooting" ? "Troubleshooting and repairs" : "General maintenance and care"}

Provide detailed, practical guidance that a food truck operator or commercial kitchen manager can follow. Include safety precautions and when to seek professional help.`;

    console.log("Generating equipment guide for:", trimmedEquipment);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
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

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response");
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log("Equipment guide generated successfully");

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
