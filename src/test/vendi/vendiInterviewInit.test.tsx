import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

/**
 * Opening-experience regressions for List with Vendi: a fresh seller sees one
 * welcome, a returning seller sees one resume line, and no prompt is ever
 * replayed by hydration, autosave, or "Start over".
 */

const { navigate, USER } = vi.hoisted(() => ({
  navigate: vi.fn(),
  USER: { id: 'user-1', email: 'seller@example.com' },
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), message: vi.fn() }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: USER, isLoading: false }) }));
vi.mock('@/hooks/useLegalDocument', () => ({ useLegalDocument: () => ({ data: null }) }));
vi.mock('@/hooks/useRecordConsent', () => ({
  useRecordConsent: () => ({ mutateAsync: vi.fn(async () => 'consent-1'), isPending: false }),
}));
vi.mock('@/components/ai-listing/LivePreviewPanel', () => ({ default: () => null }));
vi.mock('@/components/vendi-listing/VendiAuthGate', () => ({ default: () => null }));

vi.mock('@/integrations/supabase/client', () => {
  const table = () => {
    const b: Record<string, unknown> = {};
    Object.assign(b, {
      update: () => ({ eq: async () => ({ error: null }) }),
      delete: () => ({ eq: async () => ({ error: null }) }),
      insert: async () => ({ error: null }),
      select: () => b,
      eq: () => b,
      maybeSingle: async () => ({ data: null, error: null }),
    });
    return b;
  };
  return {
    supabase: {
      from: table,
      auth: { getSession: async () => ({ data: { session: { access_token: 'token' } } }) },
      functions: { invoke: async () => ({ data: { id: 'listing-1' }, error: null }) },
      storage: {
        from: () => ({
          upload: async () => ({ error: null }),
          getPublicUrl: () => ({ data: { publicUrl: 'https://cdn.test/a.jpg' } }),
        }),
      },
    },
  };
});

import VendiListingBuilder from '@/components/vendi-listing/VendiListingBuilder';
import { QUESTIONS, VENDI_WELCOME, promptText, VendiDraft } from '@/lib/vendi-listing/script';

const STORAGE_KEY = `vendibook_list_with_vendi_v1:${USER.id}`;
const EMPTY: VendiDraft = { title: null, description: null, category: null, mode: null };
const question = (id: string) => QUESTIONS.find((x) => x.id === id)!;

const occurrences = (needle: string) => {
  const haystack = document.body.textContent ?? '';
  return haystack.split(needle).length - 1;
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => localStorage.clear());

describe('List with Vendi opening', () => {
  it('gives a fresh seller exactly one welcome and one first question', async () => {
    render(<VendiListingBuilder />);
    const firstPrompt = promptText(question('import_choice'), EMPTY);
    await screen.findByText(firstPrompt);

    expect(occurrences(VENDI_WELCOME)).toBe(1);
    expect(occurrences(firstPrompt)).toBe(1);
    expect(occurrences('Welcome back')).toBe(0);
  });

  it('gives a returning seller one resume line and never replays the pending prompt', async () => {
    const draft: VendiDraft = { ...EMPTY, category: 'food_trailer' };
    const pending = promptText(question('mode'), draft);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft,
        answered: ['import_choice', 'import_paste', 'category'],
        asked: ['import_choice', 'import_paste', 'category', 'mode'],
        messages: [
          { id: 'a', role: 'vendi', content: VENDI_WELCOME },
          { id: 'b', role: 'user', content: 'Food trailer' },
          { id: 'c', role: 'vendi', content: pending },
        ],
      }),
    );

    render(<VendiListingBuilder />);
    await waitFor(() => expect(occurrences('Welcome back')).toBe(1));

    expect(occurrences(pending)).toBe(1);
    expect(occurrences(VENDI_WELCOME)).toBe(1); // restored history, not re-issued
    // The import decision is never offered a second time.
    expect(occurrences(promptText(question('import_choice'), draft))).toBe(0);
  });

  it('does not re-ask after an autosave-triggered re-render', async () => {
    render(<VendiListingBuilder />);
    const firstPrompt = promptText(question('import_choice'), EMPTY);
    await screen.findByText(firstPrompt);
    // Autosave writes state; a persisted round trip must not add bubbles.
    await waitFor(() => expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull());
    await new Promise((r) => setTimeout(r, 60));
    expect(occurrences(firstPrompt)).toBe(1);
    expect(occurrences(VENDI_WELCOME)).toBe(1);
  });

  it('starts over into a single clean welcome', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        draft: {
          title: 'Turnkey trailer', description: 'A turnkey trailer available for monthly lease.',
          category: 'food_trailer', mode: 'rent', city: 'Spring Hill', state: 'TN',
          price_monthly: 1000, rent_period: 'monthly', fulfillment_type: 'pickup',
          image_urls: ['https://cdn.test/a.jpg'],
        },
        answered: [
          'import_choice', 'import_paste', 'category', 'mode', 'subcategory', 'location',
          'rent_period', 'rent_price', 'description', 'fulfillment', 'instant_book', 'photos',
          'title', 'ready_gate', 'rent_extra_rates', 'deposit', 'availability',
          'required_documents', 'pickup_instructions', 'amenities', 'highlights', 'dimensions',
        ],
        asked: QUESTIONS.map((x) => x.id),
        messages: [],
        uploadedUrls: ['https://cdn.test/a.jpg'],
      }),
    );

    render(<VendiListingBuilder />);
    fireEvent.click(await screen.findByRole('button', { name: /start over/i }));

    await waitFor(() => expect(occurrences(VENDI_WELCOME)).toBe(1));
    if (occurrences('Welcome back')) console.log('DOM>>>', document.body.textContent);
    expect(occurrences('Welcome back')).toBe(0);
    expect(occurrences(promptText(question('import_choice'), EMPTY))).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain('Welcome back');
  });
});
