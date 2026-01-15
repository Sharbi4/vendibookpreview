import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ESTIMATE-FREIGHT] ${step}${detailsStr}`);
};

interface FreightEstimateRequest {
  origin_address: string;
  destination_address: string;
  // Item dimensions
  weight_lbs?: number;
  length_inches?: number;
  width_inches?: number;
  height_inches?: number;
  // Optional: item category for specialized pricing
  item_category?: 'standard' | 'fragile' | 'heavy_equipment' | 'oversized';
}

interface FreightEstimateResponse {
  success: boolean;
  estimate?: {
    base_cost: number;
    fuel_surcharge: number;
    handling_fee: number;
    total_cost: number;
    distance_miles: number;
    estimated_transit_days: { min: number; max: number };
    rate_per_mile: number;
    dimensional_weight: number;
    billable_weight: number;
  };
  disclaimer: string;
  error?: string;
}

// Rate structure for Vendibook Freight
const FREIGHT_RATES = {
  // Base rate per mile (tiered by distance)
  perMile: {
    under100: 3.50,    // Local: $3.50/mile
    under500: 2.75,    // Regional: $2.75/mile
    under1000: 2.25,   // Long haul: $2.25/mile
    over1000: 1.95,    // Cross-country: $1.95/mile
  },
  // Minimum charges
  minimumCharge: 150,
  // Weight surcharge (per 100 lbs over 500 lbs)
  weightSurcharge: 15,
  // Dimensional weight divisor (standard industry: 139 for inches)
  dimWeightDivisor: 139,
  // Fuel surcharge percentage
  fuelSurchargePercent: 12,
  // Handling fees by category
  handlingFees: {
    standard: 50,
    fragile: 125,
    heavy_equipment: 200,
    oversized: 175,
  },
  // Transit time estimates (days per 500 miles)
  transitDaysBase: 1,
  transitDaysPer500Miles: 1,
};

async function geocodeAddress(address: string, mapboxToken: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&country=US&limit=1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      logStep("Geocoding failed", { status: response.status, address });
      return null;
    }
    
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    logStep("Geocoding error", { error: String(error), address });
    return null;
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Haversine formula for distance between two points
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
  weightLbs: number,
  lengthIn: number,
  widthIn: number,
  heightIn: number,
  category: string
): {
  baseCost: number;
  fuelSurcharge: number;
  handlingFee: number;
  totalCost: number;
  ratePerMile: number;
  dimensionalWeight: number;
  billableWeight: number;
} {
  // Calculate dimensional weight
  const cubicInches = lengthIn * widthIn * heightIn;
  const dimensionalWeight = cubicInches / FREIGHT_RATES.dimWeightDivisor;
  
  // Billable weight is the greater of actual or dimensional
  const billableWeight = Math.max(weightLbs, dimensionalWeight);
  
  // Determine rate per mile based on distance tier
  let ratePerMile: number;
  if (distanceMiles < 100) {
    ratePerMile = FREIGHT_RATES.perMile.under100;
  } else if (distanceMiles < 500) {
    ratePerMile = FREIGHT_RATES.perMile.under500;
  } else if (distanceMiles < 1000) {
    ratePerMile = FREIGHT_RATES.perMile.under1000;
  } else {
    ratePerMile = FREIGHT_RATES.perMile.over1000;
  }
  
  // Base cost = distance × rate
  let baseCost = distanceMiles * ratePerMile;
  
  // Weight surcharge for heavy items
  if (billableWeight > 500) {
    const extraWeight = billableWeight - 500;
    const weightSurcharge = Math.ceil(extraWeight / 100) * FREIGHT_RATES.weightSurcharge;
    baseCost += weightSurcharge;
  }
  
  // Apply minimum charge
  baseCost = Math.max(baseCost, FREIGHT_RATES.minimumCharge);
  
  // Fuel surcharge
  const fuelSurcharge = baseCost * (FREIGHT_RATES.fuelSurchargePercent / 100);
  
  // Handling fee based on category
  const handlingFee = FREIGHT_RATES.handlingFees[category as keyof typeof FREIGHT_RATES.handlingFees] 
    || FREIGHT_RATES.handlingFees.standard;
  
  // Total
  const totalCost = baseCost + fuelSurcharge + handlingFee;
  
  return {
    baseCost: Math.round(baseCost * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    handlingFee,
    totalCost: Math.round(totalCost * 100) / 100,
    ratePerMile: Math.round(ratePerMile * 100) / 100,
    dimensionalWeight: Math.round(dimensionalWeight * 10) / 10,
    billableWeight: Math.round(billableWeight * 10) / 10,
  };
}

function estimateTransitDays(distanceMiles: number): { min: number; max: number } {
  const baseDays = FREIGHT_RATES.transitDaysBase;
  const additionalDays = Math.ceil(distanceMiles / 500) * FREIGHT_RATES.transitDaysPer500Miles;
  const totalDays = baseDays + additionalDays;
  
  // Add buffer for scheduling and carrier availability
  return {
    min: Math.max(3, totalDays), // Minimum 3 days (72 hours)
    max: Math.min(10, totalDays + 3), // Maximum 10 days as per Pod 2/3
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (!mapboxToken) {
      throw new Error("MAPBOX_ACCESS_TOKEN is not configured");
    }

    const body: FreightEstimateRequest = await req.json();
    const {
      origin_address,
      destination_address,
      weight_lbs = 100,
      length_inches = 48,
      width_inches = 40,
      height_inches = 48,
      item_category = 'standard',
    } = body;

    logStep("Request received", {
      origin: origin_address,
      destination: destination_address,
      weight: weight_lbs,
      dimensions: `${length_inches}x${width_inches}x${height_inches}`,
      category: item_category,
    });

    if (!origin_address || !destination_address) {
      throw new Error("Both origin_address and destination_address are required");
    }

    // Geocode both addresses
    const [originCoords, destCoords] = await Promise.all([
      geocodeAddress(origin_address, mapboxToken),
      geocodeAddress(destination_address, mapboxToken),
    ]);

    if (!originCoords) {
      throw new Error("Could not geocode origin address");
    }
    if (!destCoords) {
      throw new Error("Could not geocode destination address");
    }

    logStep("Addresses geocoded", {
      origin: originCoords,
      destination: destCoords,
    });

    // Calculate distance
    const distanceMiles = calculateDistance(
      originCoords.lat, originCoords.lng,
      destCoords.lat, destCoords.lng
    );

    logStep("Distance calculated", { distanceMiles: Math.round(distanceMiles) });

    // Calculate freight cost
    const costs = calculateFreightCost(
      distanceMiles,
      weight_lbs,
      length_inches,
      width_inches,
      height_inches,
      item_category
    );

    // Estimate transit time
    const transitDays = estimateTransitDays(distanceMiles);

    const response: FreightEstimateResponse = {
      success: true,
      estimate: {
        base_cost: costs.baseCost,
        fuel_surcharge: costs.fuelSurcharge,
        handling_fee: costs.handlingFee,
        total_cost: costs.totalCost,
        distance_miles: Math.round(distanceMiles),
        estimated_transit_days: transitDays,
        rate_per_mile: costs.ratePerMile,
        dimensional_weight: costs.dimensionalWeight,
        billable_weight: costs.billableWeight,
      },
      disclaimer: "This is an estimate only. Final freight cost will be confirmed after carrier pickup scheduling. Vendibook coordinates freight through a third-party carrier.",
    };

    logStep("Estimate calculated", {
      totalCost: costs.totalCost,
      distance: Math.round(distanceMiles),
      transitDays,
    });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    const response: FreightEstimateResponse = {
      success: false,
      error: errorMessage,
      disclaimer: "Unable to calculate estimate at this time.",
    };
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
