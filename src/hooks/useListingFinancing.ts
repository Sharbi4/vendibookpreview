import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';
import {
  EQUINOX_FLAG_KEY,
  isFinanceableSaleListing,
} from '@/lib/financing/disclosure';



/**
 * Public gate for every Equinox surface (badge, apply link, purchase sheet).
 * Buyer financing is a marketplace-level benefit: it requires only the global
 * launch flag and a published for-sale listing. There is no seller opt-in.
 */
export function useEquinoxFinancingEnabled(listing: any): boolean {
  const flagOn = usePublicFeatureFlag(EQUINOX_FLAG_KEY);
  return flagOn && isFinanceableSaleListing(listing);
}
