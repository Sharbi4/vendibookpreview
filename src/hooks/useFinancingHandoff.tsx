import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EQUINOX_APPLY_URL } from '@/lib/financing/disclosure';
import {
  trackFinancingApplyClick,
  trackFinancingLeadCaptured,
  type FinancingSource,
} from '@/lib/analytics';
import {
  FinancingLeadDialog,
  type FinancingLeadValues,
} from '@/components/financing/FinancingLeadDialog';

interface Pending {
  source: FinancingSource;
  listingId?: string;
}

/**
 * Single entry point for every "apply for financing" action.
 *
 * Order of operations: track the placement click, capture the lead for
 * Vendibook (silently when signed in, via a skippable form when not), then
 * hand off to Equinox. Lead capture is best-effort and never blocks handoff.
 */
export function useFinancingHandoff() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef<Pending | null>(null);

  const saveLead = useCallback(
    async (values: FinancingLeadValues, ctx: Pending, mode: 'signed_in' | 'form') => {
      try {
        await (supabase as any).from('financing_leads').insert({
          listing_id: ctx.listingId ?? null,
          user_id: user?.id ?? null,
          name: values.name || null,
          email: values.email,
          source: ctx.source,
        });
        trackFinancingLeadCaptured(ctx.source, ctx.listingId, mode);
      } catch (err) {
        // Never block the handoff on lead capture.
        console.warn('[financing] lead capture failed', err);
      }
    },
    [user?.id],
  );

  const openApply = useCallback(async (ctx: Pending, win: Window | null) => {
    let url = EQUINOX_APPLY_URL;
    if (ctx.listingId) {
      try {
        const { data, error } = await supabase.functions.invoke('financing-apply-link', {
          body: { listingId: ctx.listingId },
        });
        if (error || !data?.applyUrl) throw new Error('apply_unavailable');
        url = data.applyUrl;
      } catch {
        win?.close();
        toast.error('Could not open the financing application. Please try again.');
        return;
      }
    }
    if (win) win.location.href = url;
    else window.location.href = url;
  }, []);

  /** Call directly from the click handler so the popup is not blocked. */
  const startFinancingApply = useCallback(
    (source: FinancingSource, listingId?: string) => {
      const ctx: Pending = { source, listingId };
      trackFinancingApplyClick(source, listingId);

      if (user?.email) {
        const win = window.open('', '_blank', 'noopener,noreferrer');
        const name =
          (user.user_metadata as any)?.full_name ?? (user.user_metadata as any)?.name ?? '';
        void saveLead({ name, email: user.email }, ctx, 'signed_in');
        void openApply(ctx, win);
        return;
      }

      pending.current = ctx;
      setDialogOpen(true);
    },
    [user, saveLead, openApply],
  );

  const handleContinue = useCallback(
    async (values: FinancingLeadValues | null) => {
      const ctx = pending.current;
      if (!ctx) return;
      const win = window.open('', '_blank', 'noopener,noreferrer');
      setSubmitting(true);
      try {
        if (values?.email) await saveLead(values, ctx, 'form');
        await openApply(ctx, win);
      } finally {
        setSubmitting(false);
        setDialogOpen(false);
        pending.current = null;
      }
    },
    [saveLead, openApply],
  );

  const financingLeadDialog = (
    <FinancingLeadDialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) pending.current = null;
      }}
      onContinue={handleContinue}
      submitting={submitting}
    />
  );

  return { startFinancingApply, financingLeadDialog };
}
