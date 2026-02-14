import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchMarketPricing(category: string, city: string | null, state: string | null): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("listings")
      .select("price_daily, price_weekly, price_monthly, price_hourly, price_sale, mode, city, state")
      .eq("category", category)
      .eq("status", "active");

    if (state) query = query.eq("state", state);

    const { data, error } = await query.limit(50);
    if (error || !data || data.length === 0) return "";

    const rentals = data.filter(l => l.mode === "rent");
    const sales = data.filter(l => l.mode === "sale");

    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

    const dailyPrices = rentals.map(l => l.price_daily).filter(Boolean) as number[];
    const weeklyPrices = rentals.map(l => l.price_weekly).filter(Boolean) as number[];
    const monthlyPrices = rentals.map(l => l.price_monthly).filter(Boolean) as number[];
    const salePrices = sales.map(l => l.price_sale).filter(Boolean) as number[];

    let summary = `\n\n[MARKET DATA for ${category}${state ? ` in ${state}` : ""}]: `;
    summary += `${data.length} active listings found. `;
    if (dailyPrices.length) summary += `Avg daily: $${avg(dailyPrices)} (range $${Math.min(...dailyPrices)}-$${Math.max(...dailyPrices)}). `;
    if (weeklyPrices.length) summary += `Avg weekly: $${avg(weeklyPrices)} (range $${Math.min(...weeklyPrices)}-$${Math.max(...weeklyPrices)}). `;
    if (monthlyPrices.length) summary += `Avg monthly: $${avg(monthlyPrices)} (range $${Math.min(...monthlyPrices)}-$${Math.max(...monthlyPrices)}). `;
    if (salePrices.length) summary += `Avg sale price: $${avg(salePrices)} (range $${Math.min(...salePrices)}-$${Math.max(...salePrices)}). `;

    return summary;
  } catch (e) {
    console.error("Market pricing error:", e);
    return "";
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const mapboxToken = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!mapboxToken) return null;

    const resp = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxToken}&limit=1&country=us`
    );
    const data = await resp.json();
    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    return null;
  } catch (e) {
    console.error("Geocode error:", e);
    return null;
  }
}

const SYSTEM_PROMPT = `You are VendiBot, an AI listing creation assistant for Vendibook — a marketplace for food trucks, food trailers, commercial kitchens, vendor lots, and vendor spaces.

Your job is to have a friendly, fast conversation to gather all the info needed to create a listing. Ask ONE question at a time. Be concise and encouraging.

## CRITICAL: Incremental Preview Updates

You MUST output an updated \`\`\`listing-preview JSON block after EVERY single response. This is absolutely required — the app uses this block to render a live preview. Without it, the user sees nothing. Fields you don't have yet should be null. Even your very first greeting MUST include this block with all null values.

The JSON format is:
\`\`\`listing-preview
{
  "ready": false,
  "listing": {
    "title": "string or null",
    "description": "string or null",
    "category": "food_truck|food_trailer|ghost_kitchen|vendor_lot|vendor_space|null",
    "mode": "rent|sale|null",
    "address": "string or null",
    "city": "string or null",
    "state": "string or null",
    "latitude": number or null,
    "longitude": number or null,
    "price_daily": number or null,
    "price_weekly": number or null,
    "price_monthly": number or null,
    "price_hourly": number or null,
    "price_sale": number or null,
    "amenities": [],
    "fulfillment_type": "pickup|delivery|both|on_site|null",
    "length_inches": number or null,
    "width_inches": number or null,
    "height_inches": number or null,
    "weight_lbs": number or null,
    "highlights": [],
    "instant_book": boolean or null,
    "deposit_amount": number or null,
    "available_from": "YYYY-MM-DD or null",
    "available_to": "YYYY-MM-DD or null",
    "operating_hours_start": "HH:MM or null",
    "operating_hours_end": "HH:MM or null",
    "subcategory": "string or null",
    "total_slots": number or null,
    "slot_names": ["string"] or []
  }
}
\`\`\`

Set "ready": true ONLY when you have gathered ALL required information and are presenting the final preview.

## Conversation Flow

1. **Category** — Ask what they want to list. Options: Food Truck, Food Trailer, Commercial Kitchen (Ghost Kitchen), Vendor Lot, Vendor Space.

2. **Mode** — Ask if they want to rent it out or sell it.

3. **Photos** — Right after learning the category and mode, ask the user to upload photos. Say something like: "📸 Great! Let's add some photos of your [category]. Tap the camera icon (📷) at the bottom of the chat to upload. I'll analyze your photos to help auto-fill the description, amenities, and dimensions — so the more you upload, the less you have to type! Try for at least 3-5 photos." If the user says they'll add photos later, acknowledge it and continue, but remind them again before the final preview.

4. **Title** — Ask them to describe their asset briefly (e.g., "18ft fully equipped food truck"). If photos were uploaded, use the [PHOTO_ANALYSIS] to suggest a title. You'll craft a great title from this.

5. **Location** — Ask for the city and state (e.g., "Tampa, FL"). Also ask for the full street address if they're comfortable sharing. IMPORTANT: For STATIC/FIXED-LOCATION assets (commercial kitchens, vendor lots, vendor spaces), you MUST ask for the full street address — this is the physical location renters/buyers will visit. For mobile assets (food trucks, food trailers), the address is optional (it's just a general area).

6. **Description** — Ask them to tell you about their asset — what makes it special, what's included, condition, etc. If [PHOTO_ANALYSIS] is available, pre-fill a draft description based on what was detected in the photos and ask the user to confirm or adjust. Tell them you'll polish it up.

7. **Pricing** — Based on mode:
   - If RENT: Suggest competitive pricing based on the [MARKET DATA] provided in the system context (if available). Present the market average and range, then ask the user to confirm or adjust. Ask for daily rate first, then optionally weekly/monthly/hourly rates.
   - If SALE: Suggest a price range based on [MARKET DATA] if available, then ask the user to confirm.

8. **Deposit & Booking** — For rentals: "Do you want to require a security deposit? If so, how much?" Then ask: "Should renters be able to instantly book, or do you prefer to approve each request?"

9. **Availability & Access** — Ask: "When is this available? Any specific start/end dates, or is it available immediately?"
   - **For Commercial Kitchens (Ghost Kitchens):** This is CRITICAL — you MUST ask:
     - "How many slots/stations are available at a time?" (total_slots — e.g., 3 prep stations, 5 kitchen bays)
     - "What are the names of each slot?" (e.g., "Station A", "Bay 1", "Prep Area 2")
     - "What are the hours of access?" (operating_hours_start and operating_hours_end, e.g., "6 AM to 10 PM")
     - "Do you offer hourly rentals? If so, what's the hourly rate?"
   - **For Vendor Lots:** Ask about total_slots (parking spots/vendor spots available), slot names, and operating hours.
   - **For Vendor Spaces:** Ask about operating hours and access hours.
   - **For Trucks/Trailers:** Operating hours are usually not needed unless on-site.

10. **Amenities/Features** — Ask what amenities or features are included. If [PHOTO_ANALYSIS] detected equipment, pre-fill and confirm. Give category-specific examples:
    - Trucks/Trailers: hood system, fryer, generator, refrigeration, serving window, water tanks, propane, AC
    - Kitchens: walk-in cooler, prep stations, storage, ovens, dishwasher, grease trap, hood system, fire suppression
    - Lots/Spaces: parking spots, electricity, water hookup, shade/cover, signage, foot traffic, restrooms

11. **Fulfillment** — Ask HOW renters/buyers will access the asset. IMPORTANT — choose the right default based on category:
    - **Kitchens, Lots, Spaces:** Default to "on_site" — the renter comes to the location. Ask: "Renters will come to your location to use the space, correct?"
    - **Trucks/Trailers for RENT:** Ask: "How will renters access this? Options: Pickup at your location, you deliver it, or both?"
    - **Trucks/Trailers for SALE:** Ask: "How will the buyer receive this? Pickup at your location, you deliver it, or both?"

12. **Dimensions** (for trucks/trailers) — Ask length, width, height, and weight if applicable. If [PHOTO_ANALYSIS] estimated dimensions, suggest those and ask the user to confirm. Convert feet to inches for storage (e.g., 18ft = 216 inches).

13. **Preview** — Once you have enough info, set "ready": true in the preview block. Craft an SEO-optimized title and professional 2-3 paragraph description. If the user has NOT uploaded any photos yet, remind them one more time before marking ready.

IMPORTANT: Photos come right after category + mode so the AI analysis can inform the rest of the listing.

After showing the final preview, ask: "Does this look good? I can adjust anything, or you can save it as a draft and fine-tune it in the editor."

If they say it looks good, explain the next steps clearly before outputting the confirmed block:
- "Great! I'm saving your listing as a draft. Here's what's next:"
- "1. You'll be taken to the listing editor to review and polish everything"
- "2. Add or rearrange photos"
- "3. Connect your payment account so you can get paid"
- "4. Hit Publish when you're ready — and then share it!"
Then output the JSON block with "confirmed": true.

## Photo Analysis

When the user uploads photos and the message contains [PHOTO_ANALYSIS], use that analysis to:
- Auto-detect equipment, condition, features and include them in the description and amenities
- Pre-fill dimensions if visible (e.g., truck length from exterior shots)
- Suggest relevant highlights based on what's visible
- Mention specific details you noticed from the photos to the user (e.g., "I can see you have a nice serving window and what looks like a generator setup!")

## Smart Pricing

When [MARKET DATA] is included in messages, use it to suggest competitive pricing. Present the data conversationally:
- "Based on similar listings in your area, the average daily rate is $X. I'd suggest starting around $Y — does that work for you?"
- Provide context on why you're suggesting that price

## Rules
- Be warm, professional, and brief. Use emoji sparingly (1 per message max).
- If they give multiple pieces of info at once, acknowledge all of them and move to the next missing piece.
- Don't ask for info they already provided.
- When crafting the title, make it SEO-friendly: include category, key feature, and location. Example: "18ft Food Truck for Rent in Tampa, FL — Full Kitchen Setup"
- When crafting the description, make it professional, highlight key features, and include a call-to-action.
- ALWAYS include the listing-preview JSON block after each user response (even partial data).
- For the very first message (greeting), include a preview block with all nulls and ready: false.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, imageUrls } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build enriched messages with context
    const enrichedMessages = [...messages];

    // Extract category, city, state from conversation for market data
    const fullConvo = messages.map((m: any) => m.content).join(" ").toLowerCase();
    let detectedCategory: string | null = null;
    let detectedCity: string | null = null;
    let detectedState: string | null = null;

    // Detect category
    if (fullConvo.includes("food truck")) detectedCategory = "food_truck";
    else if (fullConvo.includes("food trailer") || fullConvo.includes("trailer")) detectedCategory = "food_trailer";
    else if (fullConvo.includes("commercial kitchen") || fullConvo.includes("ghost kitchen") || fullConvo.includes("kitchen")) detectedCategory = "ghost_kitchen";
    else if (fullConvo.includes("vendor lot") || fullConvo.includes("lot")) detectedCategory = "vendor_lot";
    else if (fullConvo.includes("vendor space") || fullConvo.includes("space")) detectedCategory = "vendor_space";

    // Detect state abbreviation
    const stateMatch = fullConvo.match(/\b([A-Z]{2})\b/i) || fullConvo.match(/,\s*(\w{2})\b/);
    if (stateMatch) {
      const stateAbbrs = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
      const st = stateMatch[1].toUpperCase();
      if (stateAbbrs.includes(st)) detectedState = st;
    }

    // Inject market data if we have category
    if (detectedCategory) {
      const marketData = await fetchMarketPricing(detectedCategory, detectedCity, detectedState);
      if (marketData) {
        // Append market data to the last user message
        const lastIdx = enrichedMessages.length - 1;
        if (enrichedMessages[lastIdx]?.role === "user") {
          enrichedMessages[lastIdx] = {
            ...enrichedMessages[lastIdx],
            content: enrichedMessages[lastIdx].content + marketData,
          };
        }
      }
    }

    // Handle photo analysis - if image URLs are provided, ask vision model to analyze
    if (imageUrls && imageUrls.length > 0) {
      try {
        const analysisResp = await fetch(
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
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analyze these photos of a food service asset (food truck, trailer, kitchen, or vendor space). Identify: 1) Type of asset, 2) Visible equipment and amenities (fryer, grill, serving window, generator, etc.), 3) Estimated dimensions if visible, 4) Condition (new, good, fair), 5) Notable features or selling points. Be specific and concise.",
                    },
                    ...imageUrls.map((url: string) => ({
                      type: "image_url",
                      image_url: { url },
                    })),
                  ],
                },
              ],
            }),
          }
        );

        if (analysisResp.ok) {
          const analysisData = await analysisResp.json();
          const analysis = analysisData.choices?.[0]?.message?.content;
          if (analysis) {
            // Inject photo analysis into the last user message
            const lastIdx = enrichedMessages.length - 1;
            if (enrichedMessages[lastIdx]?.role === "user") {
              enrichedMessages[lastIdx] = {
                ...enrichedMessages[lastIdx],
                content: enrichedMessages[lastIdx].content + `\n\n[PHOTO_ANALYSIS]: ${analysis}`,
              };
            }
          }
        }
      } catch (e) {
        console.error("Photo analysis error:", e);
      }
    }

    // Geocode: check if location info exists, geocode on the fly
    // We'll look for address/city in the last user message for geocoding
    const lastUserMsg = enrichedMessages.filter((m: any) => m.role === "user").pop();
    if (lastUserMsg) {
      const addressMatch = lastUserMsg.content.match(/(\d+\s+[\w\s]+(?:St|Street|Ave|Avenue|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane|Way|Ct|Court|Pl|Place|Cir|Circle)[^,]*,\s*\w[\w\s]*,?\s*[A-Z]{2})/i);
      const cityStateMatch = lastUserMsg.content.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s*([A-Z]{2})\b/);
      const locationToGeocode = addressMatch?.[1] || (cityStateMatch ? `${cityStateMatch[1]}, ${cityStateMatch[2]}` : null);

      if (locationToGeocode) {
        const coords = await geocodeAddress(locationToGeocode);
        if (coords) {
          const lastIdx = enrichedMessages.length - 1;
          if (enrichedMessages[lastIdx]?.role === "user") {
            enrichedMessages[lastIdx] = {
              ...enrichedMessages[lastIdx],
              content: enrichedMessages[lastIdx].content + `\n\n[GEOCODED_LOCATION]: latitude=${coords.lat}, longitude=${coords.lng}. Include these in the listing-preview JSON as "latitude" and "longitude" fields.`,
            };
          }
        }
      }
    }

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
            ...enrichedMessages,
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
