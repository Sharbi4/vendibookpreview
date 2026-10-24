import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import PublishedUpgradeJourney from '@/components/listing-wizard/PublishedUpgradeJourney';
vi.mock('@/hooks/useHostEntitlements', () => ({ useHostEntitlements: () => ({ tier: 'free', isLoading: false }) }));
vi.mock('@/hooks/useMonetizationProducts', () => ({ useMonetizationProducts: () => ({ products: [] }) }));
vi.mock('@/hooks/useCatalogPrices', () => ({ useCatalogPrices: () => ({ data: {} }) }));
vi.mock('@/hooks/useSubscriptionConsent', () => ({ useSubscriptionConsent: () => ({ requestCheckout: vi.fn(), dialog: null, pendingSlug: null }) }));
vi.mock('@/hooks/useProBoostCredit', () => ({ useProBoostCredit: () => ({ data: null }), useRedeemProBoostCredit: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
const listing = { id: 'listing-id', title: 'Mobile kitchen', mode: 'sale' } as any;
it('lets an owner skip each upgrade to reach sharing without purchasing', () => {
 const complete = vi.fn(); render(<PublishedUpgradeJourney listing={listing} featured={false} onComplete={complete} />);
 fireEvent.click(screen.getByRole('button', { name: 'Skip Pro for now' }));
 expect(screen.getByText('Put this listing in the spotlight.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button', { name: 'Continue to my share kit' }));
 expect(complete).toHaveBeenCalledOnce();
});
it('does not sell renter matching as an existing rental benefit', () => {
 render(<PublishedUpgradeJourney listing={{...listing, mode: 'rent'}} featured={false} onComplete={vi.fn()} />);
 expect(screen.getByText(/renter matching is not included/)).toBeTruthy();
 expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeDisabled();
});
it('skips the Featured pitch for a listing already featured', () => {
 const complete = vi.fn(); render(<PublishedUpgradeJourney listing={listing} featured onComplete={complete} />);
 fireEvent.click(screen.getByRole('button', { name: 'Skip Pro for now' }));
 expect(complete).toHaveBeenCalledOnce();
});
