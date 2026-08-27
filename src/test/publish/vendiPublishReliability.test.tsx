import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

/**
 * Publish reliability for the List with Vendi builder:
 * the seller's local recovery state must survive every failure path, and may
 * only be cleared once the server row is verified live.
 */

const { navigate, toastSuccess, toastError, USER, listingUpdate, publishVendiListing } = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  USER: { id: 'user-1', email: 'seller@example.com' },
  listingUpdate: vi.fn(async () => ({ error: null })),
  publishVendiListing: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: toastSuccess, error: toastError, message: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: USER, isLoading: false }),
}));

vi.mock('@/hooks/useLegalDocument', () => ({ useLegalDocument: () => ({ data: null }) }));
vi.mock('@/hooks/useRecordConsent', () => ({
  useRecordConsent: () => ({ mutateAsync: vi.fn(async () => 'consent-1'), isPending: false }),
}));
vi.mock('@/components/ai-listing/LivePreviewPanel', () => ({ default: () => null }));
vi.mock('@/components/vendi-listing/VendiAuthGate', () => ({ default: () => null }));

vi.mock('@/integrations/supabase/client', () => {
  const table = () => {
    const b: any = {
      update: () => ({ eq: async () => listingUpdate() }),
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
      select: () => b,
      eq: () => b,
      is: () => b,
      not: () => b,
      order: () => b,
      limit: () => b,
      // The builder verifies its cached draft id against the server on arrival;
      // this row is the seller's still-unfinished draft.
      maybeSingle: async () => ({
        data: {
          id: 'listing-1', host_id: USER.id, status: 'draft', deleted_at: null,
          mode: 'rent', category: 'food_trailer', vendi_session_key: 'key-1',
          created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z',
        },
        error: null,
      }),

    };
    return b;
  };
  return {
    supabase: {
      from: table,
      auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
      functions: { invoke: async () => ({ data: { id: 'listing-1' }, error: null }) },
      storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/a.jpg' } }) }) },
    },
  };
});

vi.mock('@/lib/vendi-listing/publishVendiListing', () => ({
  publishVendiListing: (...a: unknown[]) => publishVendiListing(...a),
  publicListingPath: (id: string) => `/listing/${id}`,
}));

import VendiListingBuilder from '@/components/vendi-listing/VendiListingBuilder';

const STORAGE_KEY = `vendibook_list_with_vendi_v1:${USER.id}`;

/** A fully answered rental draft ($1,000/month, Spring Hill TN) parked at review. */
const seedSession = (consentId: string | null) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      draft: {
        title: 'Like new turnkey food trailer for lease',
        description: 'Turnkey trailer available for monthly lease in Spring Hill, TN.',
        category: 'food_trailer',
        mode: 'rent',
        city: 'Spring Hill',
        state: 'TN',
        price_monthly: 1000,
        rent_period: 'monthly',
        fulfillment_type: 'pickup',
        image_urls: ['https://cdn.test/a.jpg'],
        condition: 'like_new',
        operational_status: 'towable',
        no_known_problems: true,
        known_problems: [],
        included_items: 'All cooking equipment and two propane tanks',
        photos_exclusions_answered: true,
      },
      answered: [
        'import_choice',
        'import_paste',
        'mode',
        'category',
        'subcategory',
        'location',
        'rent_period',
        'rent_price',
        'description',
        'fulfillment',
        'instant_book',
        'photos',
        'title',
        'ready_gate',
        'rent_extra_rates',
        'deposit',
        'availability',
        'required_documents',
        'pickup_instructions',
        'amenities',
        'highlights',
        'dimensions',
      ],
      messages: [],
      draftId: 'listing-1',
      consentId,
      uploadedUrls: ['https://cdn.test/a.jpg'],
    }),
  );
};

const publishButton = async () =>
  await screen.findByRole('button', { name: /publish listing/i });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // jsdom does not implement scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => localStorage.clear());

describe('List with Vendi publish reliability', () => {
  it('cannot publish without a recorded typed-YES attestation', async () => {
    seedSession(null);
    render(<VendiListingBuilder />);
    const btn = await publishButton();
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(publishVendiListing).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('keeps local recovery state and does not claim success when publishing fails', async () => {
    seedSession('consent-1');
    publishVendiListing.mockRejectedValue(new Error('Publishing did not complete.'));
    render(<VendiListingBuilder />);
    const btn = await publishButton();
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(navigate).not.toHaveBeenCalledWith('/listing/listing-1');
  });

  it('clears recovery state and routes to the canonical public listing only after verification', async () => {
    seedSession('consent-1');
    publishVendiListing.mockResolvedValue({
      listingId: 'listing-1', firstPublish: true,
      publishedAt: '2026-08-26T00:00:00Z', publicPath: '/listing/listing-1',
    });
    render(<VendiListingBuilder />);
    fireEvent.click(await publishButton());

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/listing/listing-1'));
    expect(toastSuccess).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    // Fields + media were flushed to the owned row before publishing.
    expect(listingUpdate).toHaveBeenCalled();
    const args = publishVendiListing.mock.calls[0][0];
    expect(args.userId).toBe(USER.id);
    expect(args.expectedImages).toContain('https://cdn.test/a.jpg');
  });

  it('is idempotent under double-click — only one publish is attempted', async () => {
    seedSession('consent-1');
    let resolvePublish: (v: unknown) => void = () => {};
    publishVendiListing.mockImplementation(() => new Promise((res) => { resolvePublish = res; }));
    render(<VendiListingBuilder />);
    const btn = await publishButton();
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    await waitFor(() => expect(publishVendiListing).toHaveBeenCalledTimes(1));
    resolvePublish({ listingId: 'listing-1', firstPublish: true, publishedAt: 'x', publicPath: '/listing/listing-1' });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/listing/listing-1'));
    expect(publishVendiListing).toHaveBeenCalledTimes(1);
  });
});
