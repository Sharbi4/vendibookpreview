import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[FREIGHT] ${step}`, details ? JSON.stringify(details) : "");
};

interface FreightEstimateRequest {
  originAddress: string;
  destinationAddress: string;
  lengthInches?: number;
  widthInches?: number;
  heightInches?: number;
  weightLbs?: number;
}

interface FreightEstimateResponse {
  success: boolean;
  estimate?: {
    distanceMiles: number;
    baseCost: number;
    fuelSurcharge: number;
    handlingFee: number;
    totalCost: number;
    transitDaysMin: number;
    transitDaysMax: number;
  };
  error?: string;
}

// Freight rate calculations (simplified)
const FREIGHT_RATES = {
  baseRatePerMile: 4.50,
  minimumCharge: 150,
  fuelSurchargePercent: 0.15,
  handlingFee: 75,
  maxMilesForStandard: 500,
};

async function geocodeAddress(address: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}&components=country:US`;
    
    const response = await fetch(url);
    if (!response.ok) {
      logStep("Geocoding failed", { status: response.status, address });
      return null;
    }
    
    const data = await response.json();
    if (data.status === "OK" && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    return null;
  } catch (error) {
    logStep("Geocoding error", { error: String(error), address });
    return null;
  }
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
  lengthInches?: number,
  widthInches?: number,
  heightInches?: number,
  weightLbs?: number
): { baseCost: number; fuelSurcharge: number; handlingFee: number; totalCost: number } {
  // Base cost calculation
  let baseCost = Math.max(
    FREIGHT_RATES.minimumCharge,
    distanceMiles * FREIGHT_RATES.baseRatePerMile
  );

  // Add size/weight surcharge if applicable
  if (weightLbs && weightLbs > 500) {
    baseCost *= 1.25;
  }
  if (lengthInches && lengthInches > 120) {
    baseCost *= 1.15;
  }

  const fuelSurcharge = baseCost * FREIGHT_RATES.fuelSurchargePercent;
  const handlingFee = FREIGHT_RATES.handlingFee;
  const totalCost = baseCost + fuelSurcharge + handlingFee;

  return {
    baseCost: Math.round(baseCost * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    handlingFee,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

function estimateTransitDays(distanceMiles: number): { min: number; max: number } {
  if (distanceMiles <= 250) {
    return { min: 1, max: 3 };
  } else if (distanceMiles <= 500) {
    return { min: 2, max: 5 };
  } else if (distanceMiles <= 1000) {
    return { min: 3, max: 7 };
  } else if (distanceMiles <= 1500) {
    return { min: 5, max: 10 };
  } else {
    return { min: 7, max: 14 };
  }
}

const handler = async (req: Request): Promise<Response> => {
  logStep("Freight estimate function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    
    if (!GOOGLE_MAPS_API_KEY) {
      logStep("Google Maps API key not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Geocoding service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: FreightEstimateRequest = await req.json();
    logStep("Request body", body);

    const { originAddress, destinationAddress, lengthInches, widthInches, heightInches, weightLbs } = body;

    if (!originAddress || !destinationAddress) {
      return new Response(
        JSON.stringify({ success: false, error: "Origin and destination addresses are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Geocode both addresses
    logStep("Geocoding origin address", { originAddress });
    const originCoords = await geocodeAddress(originAddress, GOOGLE_MAPS_API_KEY);
    
    if (!originCoords) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not geocode origin address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    logStep("Origin coordinates", originCoords);

    logStep("Geocoding destination address", { destinationAddress });
    const destCoords = await geocodeAddress(destinationAddress, GOOGLE_MAPS_API_KEY);
    
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
    const costs = calculateFreightCost(distanceMiles, lengthInches, widthInches, heightInches, weightLbs);
    logStep("Calculated costs", costs);

    // Estimate transit time
    const transitDays = estimateTransitDays(distanceMiles);
    logStep("Estimated transit days", transitDays);

    const response: FreightEstimateResponse = {
      success: true,
      estimate: {
        distanceMiles: Math.round(distanceMiles),
        ...costs,
        transitDaysMin: transitDays.min,
        transitDaysMax: transitDays.max,
      },
    };

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
