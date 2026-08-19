import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import {
  PayPalMonogram,
  PayPalWordmark,
  EquinoxFundingLogo,
} from '@/components/brand/ProviderLogos';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { toast } from 'sonner';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import {
  EQUINOX_APPLY_URL,
  EQUINOX_DISCLOSURE_TEXT,
  EQUINOX_FLAG_KEY,
  isFinanceableSaleListing,
} from '@/lib/financing/disclosure';

const PANEL =
  'rounded-2xl border-2 border-white/12 bg-[linear-gradient(140deg,#101014_0%,#08080a_60%,#15151b_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] p-5 sm:p-6';

/**
 * Seller-facing "Payments & financing" manage surface for a single listing.
 * Saving never touches listing status, publication, or checkout.
 */
export default function ListingPaymentsFinancing() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { preference } = usePayoutPreference();
  const flagOn = usePublicFeatureFlag(EQUINOX_FLAG_KEY);

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/listings/${listingId}/payments-financing`)}`);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from('listings')
          .select('id, title, mode, category, status, host_id, price_sale')
          .eq('id', listingId)
          .maybeSingle();
        if (!active) return;
        if (!data || data.host_id !== user.id) {
          toast.error('That listing is not available.');
          navigate('/dashboard');
          return;
        }
        setListing(data);

      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, listingId, navigate]);

  const eligible = useMemo(() => isFinanceableSaleListing(listing), [listing]);
  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Payments & financing | Vendibook"
        description="Manage how buyers pay for this listing and whether you offer financing options through Equinox Funding."
        noindex
      />
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/host/listings">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to listings
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">Payments &amp; financing</h1>
          <p className="text-sm text-muted-foreground mt-1">{listing?.title}</p>
        </div>

        {/* How you get paid */}
        <section className={PANEL}>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-9 h-9 rounded-full bg-white/[0.06] ring-1 ring-white/15 flex items-center justify-center">
              <PayPalMonogram className="h-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold">How buyers pay and how you get paid</h2>
                <PayPalWordmark className="h-3.5" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Supported buyer payments run through PayPal checkout. Seller proceeds are recorded
                by Vendibook and paid out manually to your chosen destination: PayPal, Venmo, Cash
                App, or ACH.
              </p>
              <p className="text-xs mt-3">
                <span className="text-muted-foreground">Current payout preference: </span>
                <span className="font-medium">
                  {preference?.display_label || preference?.method || 'Not set yet'}
                </span>
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to="/dashboard?view=host&tab=payouts">Manage payout preference</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Buyer financing — automatic on every published for-sale listing */}
        {eligible ? (
          <section className={PANEL}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <EquinoxFundingLogo className="h-5" />
              <h2 className="text-base font-semibold">Buyer financing is included</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every published for-sale listing on Vendibook shows financing options through Equinox
              Funding — there is nothing to switch on. Buyers see a financing badge, an{' '}
              <a
                href={EQUINOX_APPLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                Apply with Equinox
                <ExternalLink className="inline h-3 w-3 ml-0.5" />
              </a>{' '}
              link, and a downloadable pro forma purchase summary. Financing never changes how or
              when you get paid.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">
              If you provided a VIN / serial number, it is never shown on your public listing, but
              it is printed on the financing purchase summary the buyer and lender receive.
            </p>
            <div className="mt-4 rounded-xl border-2 border-white/10 bg-black/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wide">Good to know</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {EQUINOX_DISCLOSURE_TEXT}
              </p>
            </div>
            {flagOn ? (
              <div className="mt-4">
                <p className="text-[11px] text-muted-foreground/80 mb-2">Buyers will see:</p>
                <FinancingAvailableBadge asLink={false} />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed mt-4">
                Financing options are not live to buyers yet. They appear automatically on this
                listing when Vendibook launches financing.
              </p>
            )}
          </section>
        ) : (
          <section className={PANEL}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Buyer financing appears on published for-sale listings.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
