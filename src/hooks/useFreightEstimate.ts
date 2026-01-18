import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FreightEstimate {
  base_cost: number;
  fuel_surcharge: number;
  handling_fee: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_cost: number;
  distance_miles: number;
  estimated_transit_days: { min: number; max: number };
  rate_per_mile: number;
}

export interface FreightEstimateParams {
  origin_address: string;
  destination_address: string;
  weight_lbs?: number;
  length_inches?: number;
  width_inches?: number;
  height_inches?: number;
  item_category?: 'standard' | 'fragile' | 'heavy_equipment' | 'oversized';
}

interface UseFreightEstimateReturn {
  estimate: FreightEstimate | null;
  isLoading: boolean;
  error: string | null;
  disclaimer: string | null;
  getEstimate: (params: FreightEstimateParams) => Promise<FreightEstimate | null>;
  clearEstimate: () => void;
}

export function useFreightEstimate(): UseFreightEstimateReturn {
  const [estimate, setEstimate] = useState<FreightEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const { toast } = useToast();

  const getEstimate = useCallback(async (params: FreightEstimateParams): Promise<FreightEstimate | null> => {
    if (!params.origin_address || !params.destination_address) {
      setError('Both origin and destination addresses are required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('estimate-freight', {
        body: params,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to get freight estimate');
      }

      setEstimate(data.estimate);
      setDisclaimer(data.disclaimer);
      return data.estimate;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to estimate freight cost';
      setError(errorMessage);
      toast({
        title: 'Freight Estimate Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearEstimate = useCallback(() => {
    setEstimate(null);
    setError(null);
    setDisclaimer(null);
  }, []);

  return {
    estimate,
    isLoading,
    error,
    disclaimer,
    getEstimate,
    clearEstimate,
  };
}
