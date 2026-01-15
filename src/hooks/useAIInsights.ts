import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AIInsight {
  type: 'success' | 'warning' | 'tip' | 'opportunity';
  title: string;
  description: string;
  action?: string;
  priority?: number;
}

interface DataSnapshot {
  totalEarnings: number;
  totalViews: number;
  avgRating: number;
  pendingBookings: number;
  stripeBalance: number;
}

interface UseAIInsightsReturn {
  insights: AIInsight[];
  dataSnapshot: DataSnapshot | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export const useAIInsights = (): UseAIInsightsReturn => {
  const { session } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [dataSnapshot, setDataSnapshot] = useState<DataSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-ai-insights', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        throw fnError;
      }

      if (data?.insights) {
        setInsights(data.insights);
        setDataSnapshot(data.dataSnapshot || null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
      // Set fallback insights on error
      setInsights([{
        type: 'tip',
        title: 'Insights Unavailable',
        description: 'We couldn\'t generate personalized insights right now. Please try again later.',
        priority: 1
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return {
    insights,
    dataSnapshot,
    isLoading,
    error,
    refresh: fetchInsights,
    lastUpdated
  };
};
