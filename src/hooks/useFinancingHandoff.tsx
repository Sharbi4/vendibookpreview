import { useCallback } from 'react';
import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';
import { trackFinancingApplyClick, type FinancingSource } from '@/lib/analytics';

/**
 * Open the APPROVE tab synchronously inside the click so popup blockers allow
 * it. `noopener` in the features string makes window.open return null, which
 * left an empty tab and navigated this page away; cut the opener link by hand
 * instead so the new tab still cannot reach Vendibook.
 */
const openBlankTab = (): Window | null => {
  const win = window.open('', '_blank');
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* some browsers make opener read-only; the tab still works */
    }
  }
  return win;
};

/** Open APPROVE directly for guests and members, without a lead capture form. */
export function useFinancingHandoff() {
  const startFinancingApply = useCallback((source: FinancingSource, listingId?: string) => {
    const win = openBlankTab();
    if (win && !win.closed) win.location.href = EQUINOX_APPLY_URL;
    else window.location.assign(EQUINOX_APPLY_URL);
    trackFinancingApplyClick(source, listingId);
  }, []);
  return { startFinancingApply };
}
