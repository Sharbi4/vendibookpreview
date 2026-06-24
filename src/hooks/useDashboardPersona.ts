import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type DashboardPersona = 'shopper' | 'pro' | 'kitchen_pro';

interface PersonaData {
  persona: DashboardPersona;
  hasPublishedListings: boolean;
  hasGhostKitchen: boolean;
  hasFoodTruckOrTrailer: boolean;
  hasVendorSpace: boolean;
  publishedCount: number;
  draftCount: number;
}

const STORAGE_KEY = 'vendibook_persona_override';

/**
 * Auto-detects the user's dashboard persona based on their listings activity.
 * - Has any ghost_kitchen listing → 'kitchen_pro' (advanced mode unlocked)
 * - Has any other published listing → 'pro'
 * - Otherwise → 'shopper'
 *
 * Users can manually override via the header dropdown; override is persisted in localStorage.
 */
export function useDashboardPersona() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery<PersonaData>({
    queryKey: ['dashboard-persona', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          persona: 'shopper' as const,
          hasPublishedListings: false,
          hasGhostKitchen: false,
          hasFoodTruckOrTrailer: false,
          hasVendorSpace: false,
          publishedCount: 0,
          draftCount: 0,
        };
      }
      const { data: listings, error } = await supabase
        .from('listings')
        .select('id, status, category')
        .eq('host_id', user.id);

      if (error) {
        // Don't block the dashboard — log and fall back to a safe default
        console.error('useDashboardPersona query failed:', error);
        return {
          persona: 'pro' as const,
          hasPublishedListings: false,
          hasGhostKitchen: false,
          hasFoodTruckOrTrailer: false,
          hasVendorSpace: false,
          publishedCount: 0,
          draftCount: 0,
        };
      }

      const publishedCount = listings?.filter((l) => l.status === 'published').length || 0;
      const draftCount = listings?.filter((l) => l.status === 'draft').length || 0;
      const hasGhostKitchen = !!listings?.some(
        (l) => l.category === 'ghost_kitchen' && l.status === 'published'
      );
      const hasFoodTruckOrTrailer = !!listings?.some(
        (l) => (l.category === 'food_truck' || l.category === 'food_trailer') && l.status === 'published'
      );
      const hasVendorSpace = !!listings?.some(
        (l) => (l.category === 'vendor_space' || l.category === 'vendor_lot') && l.status === 'published'
      );

      let persona: DashboardPersona = 'shopper';
      if (hasGhostKitchen) persona = 'kitchen_pro';
      else if (publishedCount > 0 || draftCount > 0) persona = 'pro';

      return {
        persona,
        hasPublishedListings: publishedCount > 0,
        hasGhostKitchen,
        hasFoodTruckOrTrailer,
        hasVendorSpace,
        publishedCount,
        draftCount,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
    retryDelay: 500,
  });


  // Apply manual override (localStorage) on top of detected persona
  const override =
    typeof window !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY) as DashboardPersona | null)
      : null;

  const detectedPersona = data?.persona || 'shopper';
  const effectivePersona: DashboardPersona = override || detectedPersona;

  const setOverride = (next: DashboardPersona | null) => {
    if (next) localStorage.setItem(STORAGE_KEY, next);
    else localStorage.removeItem(STORAGE_KEY);
  };

  return {
    persona: effectivePersona,
    detectedPersona,
    override,
    setOverride,
    isLoading,
    ...data,
  };
}
