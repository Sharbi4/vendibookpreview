import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { useListingQuota } from '@/hooks/useListingQuota';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MiniPlansComparison } from '@/components/monetization/MiniPlansComparison';

const LS_KEY = 'vb:mship-panel-dismissed:v1';

interface MembershipInlinePanelProps {
  /** Return URL used only for the secondary "compare all plans" link. */
  returnTo: string;
  /** Draft listing id — required so we can return to the wizard step
   *  and attach any listing-scoped context on success. */
  listingId?: string;
}

/**
 * Slim, dismissible panel shown once per user inside the publish flow.
 * The "Go Pro" CTA routes to the premium /pricing hub — never straight
 * into the recurring-billing consent gate. Consent only appears after the
 * member has reviewed plans and picked one on the pricing page.
 */
export const MembershipInlinePanel: React.FC<MembershipInlinePanelProps> = ({ returnTo, listingId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useHostEntitlements();
  const quota = useListingQuota();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(LS_KEY) === '1';
  });

  useEffect(() => {
    let alive = true;
    if (dismissed || !user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('membership_panel_dismissed_at')
        .eq('id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (data?.membership_panel_dismissed_at) {
        window.localStorage.setItem(LS_KEY, '1');
        setDismissed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dismissed, user]);

  // Recommended plan is the active membership in the catalog (Vendibook Pro).
  const growthProduct = useMemo(
    () => products.find((p) => p.slug === ACTIVE_PRODUCT_SLUGS.vendibookPro) ?? null,
    [products],
  );

  if (dismissed || tier !== 'free') return null;

  const persistDismiss = async () => {
    window.localStorage.setItem(LS_KEY, '1');
    setDismissed(true);
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ membership_panel_dismissed_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {
        /* non-critical */
      }
    }
  };

  const handleUpgrade = async () => {
    if (!growthProduct) {
      // Product catalog not loaded yet — fall back to the pricing hub so the
      // user is never left with a dead click.
      navigate(`/pricing?returnTo=${encodeURIComponent(returnTo)}${listingId ? `&listingContext=${listingId}` : ''}`);
      return;
    }
    const suffix = listingId ? `/${listingId}` : '';
    await requestCheckout(growthProduct, {
      listingId,
      interval: 'monthly',
      successPath: `/create-listing${suffix}?unlocked=${growthProduct.slug}&step=review`,
      cancelPath: `/create-listing${suffix}?membership_cancelled=true&step=review`,
    });
  };

  const isPending = pendingSlug === growthProduct?.slug;

  return (
    <>
      <div className="relative rounded-lg border border-border/70 bg-card/80 p-5 space-y-4">
        <button
          type="button"
          aria-label="Dismiss membership panel"
          onClick={persistDismiss}
          className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-8">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Your listing is free. Members get seen first.
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Listing is free, always. Memberships are optional boosts — never required to publish.
          </p>
        </div>

        <MiniPlansComparison compact isFoundingMember={quota.isGrandfathered} />

        {quota.isGrandfathered && (
          <p className="text-xs text-emerald-500/90">
            You have unlimited listings as an early member — thank you.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button variant="outline" onClick={persistDismiss} className="w-full">
            Continue free
          </Button>
          <Button onClick={handleUpgrade} disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting checkout…
              </>
            ) : (
              'Go Pro'
            )}
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/pricing?returnTo=${encodeURIComponent(returnTo)}${listingId ? `&listingContext=${listingId}` : ''}`,
              )
            }
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Compare all plans
          </button>
        </div>
      </div>
      {/* Consent dialog must be rendered inside the wizard tree. */}
      {dialog}
    </>
  );
};

export default MembershipInlinePanel;
