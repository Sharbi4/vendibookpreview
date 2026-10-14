import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    from: () => ({ insert: async () => ({ error: null }) }),
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'buyer@example.test', user_metadata: {} } }),
}));
vi.mock('@/lib/analytics', () => ({
  trackFinancingApplyClick: vi.fn(),
  trackFinancingLeadCaptured: vi.fn(),
}));
vi.mock('@/components/financing/FinancingLeadDialog', () => ({ FinancingLeadDialog: () => null }));

import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';
import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';

describe('financing apply opens Equinox in a new tab', () => {
  let tab: { location: { href: string }; opener: unknown; closed: boolean; close: () => void };
  let open: ReturnType<typeof vi.spyOn>;
  const assign = vi.fn();

  beforeEach(() => {
    tab = { location: { href: '' }, opener: window, closed: false, close: vi.fn() };
    open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } });
  });
  afterEach(() => { open.mockRestore(); assign.mockReset(); invoke.mockReset(); });

  it('sends the new tab to Equinox, cuts the opener and leaves this page alone', async () => {
    const { result } = renderHook(() => useFinancingHandoff());
    await act(async () => { result.current.startFinancingApply('financing_page_hero' as never); });
    // No 'noopener' feature: that makes window.open return null.
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(tab.opener).toBeNull();
    expect(tab.location.href).toBe(EQUINOX_APPLY_URL);
    expect(assign).not.toHaveBeenCalled();
  });

  it('uses the listing-specific apply link in the new tab', async () => {
    invoke.mockResolvedValue({ data: { applyUrl: 'https://equinox-funding.com/efapplication/?ref=l1' }, error: null });
    const { result } = renderHook(() => useFinancingHandoff());
    await act(async () => { result.current.startFinancingApply('listing_detail' as never, 'l1'); });
    expect(tab.location.href).toBe('https://equinox-funding.com/efapplication/?ref=l1');
    expect(assign).not.toHaveBeenCalled();
  });

  it('falls back to this tab only when the popup is blocked', async () => {
    open.mockReturnValue(null);
    const { result } = renderHook(() => useFinancingHandoff());
    await act(async () => { result.current.startFinancingApply('financing_page_hero' as never); });
    expect(assign).toHaveBeenCalledWith(EQUINOX_APPLY_URL);
  });
});
