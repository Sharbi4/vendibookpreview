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
    const { rawDescription, category, mode, title } = await req.json();

    if (!rawDescription || rawDescription.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Please provide a description with at least 10 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const categoryLabel = category?.replace(/_/g, ' ') || 'mobile food asset';
    const modeLabel = mode === 'sale' ? 'for sale' : 'for rent';

    const systemPrompt = `You are an expert copywriter specializing in mobile food business marketplace listings. Your job is to transform rough descriptions into compelling, professional listing descriptions that convert browsers into buyers or renters.

Guidelines:
- Write in a friendly but professional tone
- Highlight key selling points and unique features
- Use sensory language when describing food-related equipment
- Include relevant details about condition, capabilities, and included features
- Keep the description between 150-300 words
- Use short paragraphs for readability
- Do NOT use bullet points in the main description (those go in highlights)
- Do NOT make up features or specifications not mentioned in the input
- Do NOT include pricing information
- Focus on benefits to the renter/buyer
- Be honest and accurate - never exaggerate

The listing is a ${categoryLabel} listed ${modeLabel}${title ? ` titled "${title}"` : ''}.`;

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
          { 
            role: "user", 
            content: `Please rewrite and optimize this listing description:\n\n"${rawDescription}"\n\nMake it professional, engaging, and optimized for a marketplace listing.` 
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to optimize description");
    }

    const data = await response.json();
    const optimizedDescription = data.choices?.[0]?.message?.content?.trim();

    if (!optimizedDescription) {
      throw new Error("No response from AI");
    }

    return new Response(
      JSON.stringify({ optimizedDescription }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error optimizing description:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to optimize description" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
