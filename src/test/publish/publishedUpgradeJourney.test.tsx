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
 fireEvent.click(screen.getByRole('button', { name: 'Skip upgrades — continue to share kit' }));
 expect(complete).toHaveBeenCalledOnce();
});
it('includes renter matching for hosts while blocking checkout when pricing is unavailable', () => {
 render(<PublishedUpgradeJourney listing={{...listing, mode: 'rent'}} featured={false} onComplete={vi.fn()} />);
 expect(screen.getByText('BuyerMatch AI — priority renter matching')).toBeTruthy();
 expect(screen.queryByText(/renter matching is not included/)).toBeNull();
 expect(screen.getByRole('button', { name: 'Upgrade to Pro' })).toBeDisabled();
});
it('skips the Featured pitch for a listing already featured', () => {
 const complete = vi.fn(); render(<PublishedUpgradeJourney listing={listing} featured onComplete={complete} />);
 fireEvent.click(screen.getByRole('button', { name: 'Continue to sharing' }));
 expect(complete).toHaveBeenCalledOnce();
});

it('keeps Featured monthly when annual Pro is selected', () => {
 render(<PublishedUpgradeJourney listing={listing} featured={false} onComplete={vi.fn()} />);
 fireEvent.click(screen.getByRole('button', {name:/Annual/}));
 expect(screen.getByText(/Save \$158/)).toBeTruthy();
 expect(screen.getByText(/Automatically cancels when this listing is marked sold/)).toBeTruthy();
 expect(screen.getByText(/Billing options apply to Pro/)).toBeTruthy();
});
it('opens the BuyerMatch overview without leaving the share kit', () => {
 render(<PublishedUpgradeJourney listing={listing} featured={false} onComplete={vi.fn()} />);
 fireEvent.click(screen.getByRole('button', {name:'Explore BuyerMatch AI'}));
 expect(screen.getByRole('heading', {name:'Meet BuyerMatch AI'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button', {name:'Back to plans'}));
 expect(screen.getByRole('button',{name:'Skip upgrades — continue to share kit'})).toBeTruthy();
});

it('uses Starter and the shared gold Featured listing badge', () => {
 render(<PublishedUpgradeJourney listing={listing} featured={false} onComplete={vi.fn()} />);
 expect(screen.getByRole('heading', {name:'Starter'})).toBeTruthy();
 expect(screen.queryByText('Keep it simple')).toBeNull();
 expect(screen.getByTitle('Featured listing')).toHaveClass('featured-gold');
});
it.each([['Explore PricePilot','PricePilot','/tools/pricepilot'],['Explore PermitPath','PermitPath Plus','/tools/permitpath']])('opens %s without dismissing publishing', (button, heading, destination) => {
 const complete=vi.fn();render(<PublishedUpgradeJourney listing={listing} featured={false} onComplete={complete} />);
 fireEvent.click(screen.getByRole('button',{name:button}));
 expect(screen.getByRole('heading',{name:heading})).toBeTruthy();
 expect(screen.getByRole('link')).toHaveAttribute('href',destination);
 fireEvent.click(screen.getByRole('button',{name:'Back to plans'}));
 expect(complete).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Upgrade to Pro'})).toBeTruthy();
});
