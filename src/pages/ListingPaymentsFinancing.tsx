import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, ExternalLink, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Header } from '@/components/layout/Header';
import SEO from '@/components/SEO';
import { toast } from 'sonner';
import { usePayoutPreference } from '@/hooks/usePayoutPreference';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';
import { FinancingAvailableBadge } from '@/components/financing/FinancingAvailableBadge';
import {
  EQUINOX_APPLY_URL,
  EQUINOX_DISCLOSURE_TEXT,
  EQUINOX_DISCLOSURE_VERSION,
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
  const [saving, setSaving] = useState(false);

  const [optIn, setOptIn] = useState(false);
  const [includeVin, setIncludeVin] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [savedVersion, setSavedVersion] = useState<string | null>(null);

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

        const { data: pref } = await (supabase as any)
          .from('listing_financing_preferences')
          .select('equinox_opt_in, include_vin, disclosure_version')
          .eq('listing_id', listingId)
          .maybeSingle();
        if (!active) return;
        if (pref) {
          setOptIn(!!pref.equinox_opt_in);
          setIncludeVin(!!pref.include_vin);
          setSavedVersion(pref.disclosure_version ?? null);
          setAccepted(pref.disclosure_version === EQUINOX_DISCLOSURE_VERSION);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [authLoading, user, listingId, navigate]);

  const eligible = useMemo(() => isFinanceableSaleListing(listing), [listing]);
  const needsAcceptance = optIn && !accepted;

  const handleSave = async () => {
    if (!listing || !user) return;
    if (needsAcceptance) {
      toast.error('Please accept the financing disclosure to offer financing options.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('listing_financing_preferences')
        .upsert(
          {
            listing_id: listing.id,
            host_id: user.id,
            equinox_opt_in: optIn,
            include_vin: optIn ? includeVin : false,
            disclosure_version: optIn ? EQUINOX_DISCLOSURE_VERSION : savedVersion,
            disclosure_accepted_at: optIn ? new Date().toISOString() : null,
          },
          { onConflict: 'listing_id' },
        );
      if (error) throw error;
      setSavedVersion(optIn ? EQUINOX_DISCLOSURE_VERSION : savedVersion);
      toast.success('Payment & financing preferences saved. Your listing stays live.');
    } catch {
      toast.error('Could not save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
          <Link to="/dashboard?view=host&tab=listings">
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
            <span className="shrink-0 w-9 h-9 rounded-full bg-primary/10 ring-1 ring-primary/25 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-primary" />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold">How buyers pay and how you get paid</h2>
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

        {/* Equinox opt-in */}
        {eligible ? (
          <section className={PANEL}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Offer financing options through Equinox Funding</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Optional. When enabled, buyers see a financing badge, an{' '}
                  <a
                    href={EQUINOX_APPLY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Apply with Equinox
                    <ExternalLink className="inline h-3 w-3 ml-0.5" />
                  </a>{' '}
                  link, and a downloadable pro forma purchase summary on this listing. Turning this
                  on or off never unpublishes or recreates your listing.
                </p>
              </div>
              <Switch checked={optIn} onCheckedChange={setOptIn} aria-label="Offer financing options through Equinox Funding" />
            </div>

            {optIn && (
              <div className="mt-5 space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={includeVin}
                    onCheckedChange={(v) => setIncludeVin(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    Include the full VIN / serial number on the financing purchase summary. The full
                    VIN is never shown on the public listing page &mdash; it only appears on the
                    generated summary when you check this box.
                  </span>
                </label>

                <div className="rounded-xl border-2 border-white/10 bg-black/40 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Seller disclosure
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {EQUINOX_DISCLOSURE_TEXT}
                  </p>
                  <label className="flex items-start gap-3 mt-4 cursor-pointer">
                    <Checkbox
                      checked={accepted}
                      onCheckedChange={(v) => setAccepted(v === true)}
                      className="mt-0.5"
                    />
                    <span className="text-xs leading-relaxed">
                      I have read and accept this disclosure ({EQUINOX_DISCLOSURE_VERSION}).
                    </span>
                  </label>
                </div>

                {!flagOn && (
                  <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                    Financing options are not live to buyers yet. Your preference is saved now and
                    applies automatically when Vendibook launches financing.
                  </p>
                )}
                {flagOn && accepted && (
                  <div>
                    <p className="text-[11px] text-muted-foreground/80 mb-2">Buyers will see:</p>
                    <FinancingAvailableBadge asLink={false} />
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <Button onClick={() => void handleSave()} disabled={saving || needsAcceptance}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save preferences
              </Button>
            </div>
          </section>
        ) : (
          <section className={PANEL}>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Financing options are currently available for food truck and food trailer listings
              offered for sale.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
