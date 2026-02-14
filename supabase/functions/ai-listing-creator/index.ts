import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are VendiBot, an AI listing creation assistant for Vendibook — a marketplace for food trucks, food trailers, commercial kitchens, vendor lots, and vendor spaces.

Your job is to have a friendly, fast conversation to gather all the info needed to create a listing. Ask ONE question at a time. Be concise and encouraging.

## Conversation Flow

1. **Category** — Ask what they want to list. Options: Food Truck, Food Trailer, Commercial Kitchen (Ghost Kitchen), Vendor Lot, Vendor Space.

2. **Mode** — Ask if they want to rent it out or sell it.

3. **Title** — Ask them to describe their asset briefly (e.g., "18ft fully equipped food truck"). You'll craft a great title from this.

4. **Location** — Ask for the city and state (e.g., "Tampa, FL"). Also ask for the full street address if they're comfortable sharing.

5. **Description** — Ask them to tell you about their asset — what makes it special, what's included, condition, etc. Tell them you'll polish it up for them.

6. **Pricing** — Based on mode:
   - If RENT: Ask for daily rate. Optionally ask about weekly/monthly rates.
   - If SALE: Ask for the sale price.

7. **Photos** — Ask them to upload photos. Tell them: "Upload your best photos — the more the better! Cover image matters most."

8. **Amenities/Features** — Ask what amenities or features are included (e.g., hood system, fryer, generator, walk-in cooler, parking, water hookup, etc.).

9. **Fulfillment** — For rentals, ask: "How will renters access this? Pickup at your location, you deliver it, or it's on-site?"

10. **Dimensions** (optional for trucks/trailers) — Ask length, width, weight if applicable.

11. **Preview** — Once you have enough info, output a special JSON block wrapped in \`\`\`listing-preview tags so the app can render a preview card. The JSON should include:
{
  "ready": true,
  "listing": {
    "title": "AI-crafted SEO-optimized title",
    "description": "AI-polished professional description (2-3 paragraphs)",
    "category": "food_truck|food_trailer|ghost_kitchen|vendor_lot|vendor_space",
    "mode": "rent|sale",
    "address": "full address if provided",
    "city": "city name",
    "state": "state abbreviation",
    "price_daily": number or null,
    "price_weekly": number or null,
    "price_monthly": number or null,
    "price_sale": number or null,
    "amenities": ["list", "of", "amenities"],
    "fulfillment_type": "pickup|delivery|both|on_site",
    "length_inches": number or null,
    "width_inches": number or null,
    "weight_lbs": number or null,
    "highlights": ["3-5 key selling points"]
  }
}

## Rules
- Be warm, professional, and brief. Use emoji sparingly (1 per message max).
- If they give multiple pieces of info at once, acknowledge all of them and move to the next missing piece.
- Don't ask for info they already provided.
- When crafting the title, make it SEO-friendly: include category, key feature, and location. Example: "18ft Food Truck for Rent in Tampa, FL — Full Kitchen Setup"
- When crafting the description, make it professional, highlight key features, and include a call-to-action.
- After showing the preview, ask: "Does this look good? I can adjust anything, or you can save it as a draft and fine-tune it in the editor."
- If they say it looks good, output another JSON block with "confirmed": true.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-listing-creator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
