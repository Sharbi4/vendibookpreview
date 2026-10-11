import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { freightQuote } from "../_shared/freightRates.ts";
import { coerceCoords, geocodeAddress, haversineMiles } from "../_shared/geo.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[FREIGHT] ${step}`, details ? JSON.stringify(details) : "");
};

interface FreightEstimateRequest {
  // Support both camelCase and snake_case
  originAddress?: string;
  origin_address?: string;
  destinationAddress?: string;
  destination_address?: string;
  lengthInches?: number;
  length_inches?: number;
  widthInches?: number;
  width_inches?: number;
  heightInches?: number;
  height_inches?: number;
  weightLbs?: number;
  weight_lbs?: number;
  item_category?: string;
}

interface FreightEstimateResponse {
  success: boolean;
  estimate?: {
    distance_miles: number;
    base_cost: number;
    fuel_surcharge: number;
    handling_fee: number;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_cost: number;
    rate_per_mile: number;
    estimated_transit_days: { min: number; max: number };
  };
  disclaimer?: string;
  error?: string;
}

// Freight rates live in _shared/freightRates.ts (also used for the listing-page range).

function estimateTransitDays(distanceMiles: number): { min: number; max: number } {
  // Standard 7-10 business days for all US shipments
  if (distanceMiles <= 500) {
    return { min: 7, max: 10 };
  } else if (distanceMiles <= 1500) {
    return { min: 7, max: 10 };
  } else {
    return { min: 7, max: 10 };
  }
}

const handler = async (req: Request): Promise<Response> => {
  logStep("Freight estimate function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: FreightEstimateRequest & {
      origin_coords?: { lat: number; lng: number };
      destination_coords?: { lat: number; lng: number };
    } = await req.json();
    logStep("Request body", body);

    // Support both camelCase and snake_case parameter names
    const originAddress = body.originAddress || body.origin_address;
    const destinationAddress = body.destinationAddress || body.destination_address;
    const lengthInches = body.lengthInches || body.length_inches;
    const widthInches = body.widthInches || body.width_inches;
    const heightInches = body.heightInches || body.height_inches;
    const weightLbs = body.weightLbs || body.weight_lbs;
    const providedOrigin = coerceCoords(body.origin_coords);
    const providedDest = coerceCoords(body.destination_coords);

    if ((!originAddress && !providedOrigin) || (!destinationAddress && !providedDest)) {
      return new Response(
        JSON.stringify({ success: false, error: "Origin and destination addresses are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Geocode both endpoints (coordinates win when the caller already has them)
    logStep("Resolving origin", { originAddress, providedOrigin });
    const originCoords =
      providedOrigin ?? (await geocodeAddress(originAddress as string));

    if (!originCoords) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not geocode origin address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    logStep("Origin coordinates", originCoords);

    logStep("Resolving destination", { destinationAddress, providedDest });
    const destCoords =
      providedDest ?? (await geocodeAddress(destinationAddress as string));

    if (!destCoords) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not geocode destination address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    logStep("Destination coordinates", destCoords);


    // Calculate distance
    const distanceMiles = haversineMiles(originCoords, destCoords);
    logStep("Calculated distance", { distanceMiles });

    // Calculate freight cost
    const costs = freightQuote(distanceMiles);
    logStep("Calculated costs", costs);

    // Estimate transit time
    const transitDays = estimateTransitDays(distanceMiles);
    logStep("Estimated transit days", transitDays);

    const response: FreightEstimateResponse = {
      success: true,
      estimate: {
        distance_miles: Math.round(distanceMiles),
        ...costs,
        estimated_transit_days: transitDays,
      },
      disclaimer: "Freight rate: $4.50/mile. Final pricing confirmed within 2 business days after payment.",
    };

    logStep("Returning estimate", response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    logStep("Error in freight estimate", { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
