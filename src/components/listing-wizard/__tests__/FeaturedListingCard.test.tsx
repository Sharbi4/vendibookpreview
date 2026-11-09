import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useCatalogPrices', () => ({
  useCatalogPrice: () => ({
    cents: 4900,
    amountUsd: 49,
    label: '$49',
    labelWithCadence: '$49',
    detailLabel: '$49',
    billingType: 'recurring',
    durationDays: null,
    name: null,
    isActive: true,
    loading: false,
  }),
}));

import { FeaturedListingCard } from '../FeaturedListingCard';

// Regression: this card renders on the final publish step. A stray undefined
// variable crashed the whole page ("Something went wrong"), so sellers could
// not publish at all (support ticket VB-931D779D, 2026-11-09).
describe('FeaturedListingCard', () => {
  it('renders on the publish step without crashing, off and on', () => {
    const { rerender } = render(<FeaturedListingCard enabled={false} onEnabledChange={() => {}} />);
    expect(screen.getByText('Feature this listing')).toBeInTheDocument();
    expect(screen.getByText(/30-day periods/)).toBeInTheDocument();
    rerender(<FeaturedListingCard enabled onEnabledChange={() => {}} />);
    expect(screen.getByText('Feature this listing')).toBeInTheDocument();
  });
});
