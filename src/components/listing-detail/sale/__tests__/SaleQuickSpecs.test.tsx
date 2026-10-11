import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SaleQuickSpecs } from '../SaleQuickSpecs';

vi.mock('@/hooks/useListingSpecs', () => ({ useListingSpecs: () => ({ values: {}, loading: false }) }));

afterEach(cleanup);

// Frostproof, FL listing (acb2ab5c) as stored on 2026-10-05.
const frostproof = {
  id: 'acb2ab5c-afc8-45e1-96d0-45b9d6ca001a',
  mode: 'sale',
  category: 'food_trailer',
  condition: 'good',
  operational_status: 'towable',
  title_status: 'clean',
  has_lien: 'no',
};

describe('SaleQuickSpecs disclosures', () => {
  it('shows condition, running status, title and lien on sale listings', () => {
    render(<SaleQuickSpecs listing={frostproof} />);
    expect(screen.getByText('Condition')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Road ready and towable')).toBeInTheDocument();
    expect(screen.getByText('Clean title')).toBeInTheDocument();
    expect(screen.getByText('No lien')).toBeInTheDocument();
  });

  it('omits title and lien on rentals and hides unknown answers', () => {
    render(<SaleQuickSpecs listing={{ ...frostproof, mode: 'rent', operational_status: 'unknown' }} />);
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.queryByText('Clean title')).not.toBeInTheDocument();
    expect(screen.queryByText('No lien')).not.toBeInTheDocument();
    expect(screen.queryByText('Running status')).not.toBeInTheDocument();
  });
});
