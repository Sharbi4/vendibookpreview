import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  type: "social-post" | "flyer" | "promo-email" | "menu-description" | "tagline" | "image";
  data: Record<string, string>;
}

const getSystemPrompt = (type: string): string => {
  switch (type) {
    case "social-post":
      return `You are a social media marketing expert for food businesses. Create engaging, shareable social media posts.

Guidelines:
- Keep posts concise and punchy
- Include relevant emojis sparingly
- Add hashtag suggestions (5-7 relevant ones)
- Create variations for different platforms (Instagram, Facebook, Twitter)
- Include a call-to-action

Respond in this exact JSON format:
{
  "posts": [
    {
      "platform": "Instagram",
      "content": "The post content with emojis",
      "hashtags": ["hashtag1", "hashtag2"],
      "bestTime": "Suggested posting time"
    }
  ],
  "tips": ["Engagement tip 1", "Tip 2"]
}`;

    case "flyer":
      return `You are a marketing copywriter specializing in food truck and restaurant promotions. Create compelling flyer copy.

Guidelines:
- Write an attention-grabbing headline
- Keep body copy concise and scannable
- Highlight the offer/value proposition clearly
- Include a strong call-to-action
- Suggest visual layout ideas

Respond in this exact JSON format:
{
  "headline": "Main headline",
  "subheadline": "Supporting text",
  "bodyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "callToAction": "Clear CTA",
  "offerDetails": "Special offer details if any",
  "designTips": ["Visual suggestion 1", "Suggestion 2"],
  "colorSuggestions": "Recommended color palette"
}`;

    case "promo-email":
      return `You are an email marketing specialist for food businesses. Write engaging promotional emails that drive action.

Guidelines:
- Write a compelling subject line (and A/B variant)
- Create a preview text snippet
- Write personalized, conversational copy
- Include clear value proposition
- Strong call-to-action buttons

Respond in this exact JSON format:
{
  "subjectLine": "Main subject",
  "subjectLineAlt": "A/B test variant",
  "previewText": "Email preview snippet",
  "greeting": "Personalized greeting",
  "bodyParagraphs": ["Paragraph 1", "Paragraph 2"],
  "callToAction": "Button text",
  "closing": "Sign off message",
  "psLine": "Optional P.S. line for urgency"
}`;

    case "menu-description":
      return `You are a food copywriter who makes dishes sound irresistible. Write mouthwatering menu descriptions.

Guidelines:
- Use sensory language (taste, texture, aroma)
- Highlight quality ingredients
- Create desire and appetite appeal
- Keep descriptions 2-3 sentences
- Avoid clichés like "delicious" or "tasty"

Respond in this exact JSON format:
{
  "descriptions": [
    {
      "item": "Item name",
      "description": "Appetizing description",
      "callout": "Optional highlight badge text"
    }
  ],
  "categoryIntro": "Optional category description",
  "tips": ["Menu writing tip"]
}`;

    case "tagline":
      return `You are a brand strategist creating memorable taglines and slogans for food businesses.

Guidelines:
- Create multiple options (5-7)
- Mix of short punchy and longer descriptive
- Memorable and easy to say
- Capture the brand essence
- Differentiate from competitors

Respond in this exact JSON format:
{
  "taglines": [
    {
      "text": "The tagline",
      "style": "Punchy/Descriptive/Playful/Premium",
      "bestFor": "Where this works best"
    }
  ],
  "namingIdeas": ["Optional business name ideas if requested"],
  "tips": ["Branding tip"]
}`;

    default:
      return "You are a helpful marketing assistant.";
  }
};

const getUserPrompt = (type: string, data: Record<string, string>): string => {
  switch (type) {
    case "social-post":
      return `Create social media posts for:
Business Name: ${data.businessName || "My Food Truck"}
Business Type: ${data.businessType || "Food Truck"}
Post Purpose: ${data.purpose || "General promotion"}
Key Message: ${data.keyMessage || "Check us out!"}
Target Audience: ${data.audience || "Local foodies"}
Tone: ${data.tone || "Friendly and casual"}
Special Offer: ${data.offer || "None"}`;

    case "flyer":
      return `Create flyer copy for:
Business Name: ${data.businessName || "My Food Truck"}
Event/Promotion: ${data.promotion || "Grand Opening"}
Date/Time: ${data.dateTime || "Not specified"}
Location: ${data.location || "Not specified"}
Special Offer: ${data.offer || "None"}
Target Audience: ${data.audience || "General public"}
Key Selling Points: ${data.sellingPoints || "Great food, great prices"}`;

    case "promo-email":
      return `Create a promotional email for:
Business Name: ${data.businessName || "My Food Truck"}
Email Purpose: ${data.purpose || "Weekly newsletter"}
Main Offer/News: ${data.offer || "New menu items"}
Target Audience: ${data.audience || "Existing customers"}
Tone: ${data.tone || "Friendly"}
Call-to-Action Goal: ${data.goal || "Visit us"}`;

    case "menu-description":
      return `Write menu descriptions for:
Business Name: ${data.businessName || "My Food Truck"}
Cuisine Type: ${data.cuisine || "American"}
Menu Items: ${data.items || "Burger, Fries, Milkshake"}
Brand Personality: ${data.personality || "Fun and casual"}
Price Range: ${data.priceRange || "Moderate"}`;

    case "tagline":
      return `Create taglines/slogans for:
Business Name: ${data.businessName || "Not decided yet"}
Business Type: ${data.businessType || "Food Truck"}
Cuisine/Specialty: ${data.specialty || "General"}
Brand Personality: ${data.personality || "Fun and friendly"}
Unique Selling Point: ${data.usp || "Fresh, quality food"}
Target Audience: ${data.audience || "Everyone"}`;

    default:
      return data.prompt || "";
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data }: RequestBody = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Handle image generation separately
    if (type === "image") {
      console.log("Generating marketing image with prompt:", data.prompt);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Create a professional marketing image for a food business: ${data.prompt}. 
Style: ${data.style || "modern and appetizing"}. 
Purpose: ${data.purpose || "social media post"}.
Make it vibrant, appetizing, and suitable for ${data.platform || "Instagram"}.`
            }
          ],
          modalities: ["image", "text"]
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
            JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Image generation failed");
      }

      const aiResponse = await response.json();
      console.log("Image generation response received");
      
      const imageUrl = aiResponse.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      const textContent = aiResponse.choices?.[0]?.message?.content;

      return new Response(JSON.stringify({ 
        result: { 
          imageUrl,
          description: textContent || "Marketing image generated successfully"
        } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle text-based content generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: getSystemPrompt(type) },
          { role: "user", content: getUserPrompt(type, data) },
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
          JSON.stringify({ error: "AI service temporarily unavailable. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                        content.match(/```\n?([\s\S]*?)\n?```/) ||
                        [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Marketing creator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
