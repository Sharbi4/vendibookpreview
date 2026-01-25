import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface KitchenEarningsEstimate {
  hourly_low: number;
  hourly_suggested: number;
  hourly_high: number;
  daily_low: number;
  daily_suggested: number;
  daily_high: number;
  weekly_low: number;
  weekly_suggested: number;
  weekly_high: number;
  monthly_low: number;
  monthly_suggested: number;
  monthly_high: number;
  expected_occupancy_percent: number;
  annual_potential_low: number;
  annual_potential_high: number;
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  market_insights: string[];
  tips: string[];
}

export interface KitchenEstimateParams {
  city: string;
  state?: string;
  kitchenType: 'full_commercial' | 'shared_space' | 'prep_kitchen' | 'commissary';
  squareFootage?: number;
  equipment?: string[];
  certifications?: string[];
}

export const useKitchenEarningsEstimate = () => {
  const [estimate, setEstimate] = useState<KitchenEarningsEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEstimate = async (params: KitchenEstimateParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('estimate-kitchen-earnings', {
        body: params,
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setEstimate(data);
      return data;
    } catch (err) {
      console.error('Error fetching kitchen earnings estimate:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get estimate';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setEstimate(null);
    setError(null);
  };

  return {
    estimate,
    isLoading,
    error,
    getEstimate,
    reset,
  };
};
