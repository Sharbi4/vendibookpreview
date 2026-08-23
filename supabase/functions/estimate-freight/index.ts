import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

// Freight rate calculations - Premium flat rate
const FREIGHT_RATES = {
  ratePerMile: 4.50,
  minimumCharge: 150,
  // Shipping preparation & coordination fee (product decision 2026-08-23: $199, replaces $75 handling)
  handlingFee: 199,
  fuelSurchargePercent: 0.08, // 8% fuel surcharge
  // No universal tax rate: jurisdiction-aware tax is not implemented, so the
  // estimate must not add tax. Applicable taxes, if any, are handled in the transaction.
  defaultTaxRate: 0,
};

async function geocodeViaMapbox(address: string): Promise<{ lat: number; lng: number } | null> {
  const token = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
  if (!token) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?country=us&limit=1&access_token=${token}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const center = data?.features?.[0]?.center;
    if (Array.isArray(center) && center.length === 2) {
      return { lat: Number(center[1]), lng: Number(center[0]) };
    }
    return null;
  } catch (error) {
    logStep("Mapbox geocoding error", { error: String(error), address });
    return null;
  }
}

async function geocodeAddress(address: string, apiKey: string | undefined): Promise<{ lat: number; lng: number } | null> {
  if (apiKey) {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&components=country:US`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          return { lat: location.lat, lng: location.lng };
        }
        logStep("Google geocoding returned no result", { status: data.status, address });
      } else {
        logStep("Geocoding failed", { status: response.status, address });
      }
    } catch (error) {
      logStep("Geocoding error", { error: String(error), address });
    }
  }
  // Mapbox is the fallback so estimates keep working if Google is unavailable.
  return await geocodeViaMapbox(address);
}

function coerceCoords(value: any): { lat: number; lng: number } | null {
  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}


function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateFreightCost(
  distanceMiles: number,
  taxRate: number = FREIGHT_RATES.defaultTaxRate
): { 
  base_cost: number; 
  fuel_surcharge: number;
  handling_fee: number; 
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_cost: number;
  rate_per_mile: number;
} {
  // Base cost: $4.50/mile with minimum charge
  const baseCost = Math.max(
    FREIGHT_RATES.minimumCharge,
    distanceMiles * FREIGHT_RATES.ratePerMile
  );

  // Fuel surcharge: 8% of base cost
  const fuelSurcharge = baseCost * FREIGHT_RATES.fuelSurchargePercent;

  // Shipping preparation & coordination fee: flat $199
  const handlingFee = FREIGHT_RATES.handlingFee;
  
  // Subtotal before tax
  const subtotal = baseCost + fuelSurcharge + handlingFee;
  
  // Tax calculation
  const taxAmount = subtotal * taxRate;
  
  // Total cost
  const totalCost = subtotal + taxAmount;

  return {
    base_cost: Math.round(baseCost * 100) / 100,
    fuel_surcharge: Math.round(fuelSurcharge * 100) / 100,
    handling_fee: handlingFee,
    subtotal: Math.round(subtotal * 100) / 100,
    tax_rate: taxRate,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total_cost: Math.round(totalCost * 100) / 100,
    rate_per_mile: FREIGHT_RATES.ratePerMile,
  };
}

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
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

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
      providedOrigin ?? (await geocodeAddress(originAddress as string, GOOGLE_MAPS_API_KEY));

    if (!originCoords) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not geocode origin address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    logStep("Origin coordinates", originCoords);

    logStep("Resolving destination", { destinationAddress, providedDest });
    const destCoords =
      providedDest ?? (await geocodeAddress(destinationAddress as string, GOOGLE_MAPS_API_KEY));

    if (!destCoords) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not geocode destination address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    logStep("Destination coordinates", destCoords);


    // Calculate distance
    const distanceMiles = calculateDistance(
      originCoords.lat,
      originCoords.lng,
      destCoords.lat,
      destCoords.lng
    );
    logStep("Calculated distance", { distanceMiles });

    // Calculate freight cost
    const costs = calculateFreightCost(distanceMiles);
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
      disclaimer: "Estimate only: $4.50/mile base ($150 minimum), 8% fuel surcharge, and a $199 shipping preparation & coordination fee. Applicable taxes, if any, are calculated in the transaction. Final pricing and scheduling are confirmed during freight coordination.",
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
