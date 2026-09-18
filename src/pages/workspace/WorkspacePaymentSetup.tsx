import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Circle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import { useSellerPaymentReadiness } from '@/hooks/useSellerPaymentReadiness';
import SellerBusinessAccountHelp from '@/components/payments/SellerBusinessAccountHelp';

type SetupListing = {
  id: string;
  title: string;
  status: string | null;
  mode: string | null;
  accept_paypal_checkout: boolean | null;
  accept_cash_payment: boolean | null;
};

type StepState = 'done' | 'blocked' | 'pending';

const marker = (state: StepState) =>
  state === 'done' ? <CheckCircle2 /> : state === 'blocked' ? <AlertTriangle /> : <Circle />;

/**
 * Guided seller payment setup.
 *
 * Every state here is read from real backend data (the seller's own PayPal
 * connection row, the security-definer readiness RPC, and their own listings).
 * Nothing is marked complete on guesswork, and no money logic, routing, or
 * payout behaviour changes on this page — payouts stay manually reviewed.
 */
export default function WorkspacePaymentSetup() {
  const { user } = useAuth();
  const { connection, status, isReady, isLoading, isRefreshing, refreshFromPayPal, lastCheckedAt, lastRefreshError } =
    useMyPayPalConnection();
  const readiness = useSellerPaymentReadiness(user?.id ?? null);

  const [listings, setListings] = useState<SetupListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const loadListings = useCallback(async () => {
    if (!user) {
      setListings([]);
      setListingsLoading(false);
      return;
    }
    setListingsLoading(true);
    const { data } = await supabase
      .from('listings')
      .select('id, title, status, mode, accept_paypal_checkout, accept_cash_payment')
      .eq('host_id', user.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    setListings((data as SetupListing[]) ?? []);
    setListingsLoading(false);
  }, [user]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const reasons = connection?.action_reasons ?? [];
  const emailUnconfirmed =
    connection?.primary_email_confirmed === false || reasons.includes('primary_email_unconfirmed');
  const notReceivable =
    connection?.payments_receivable === false || reasons.includes('payments_receivable_false');

  const needsOnlineCheckout = useMemo(
    () => listings.filter((l) => l.accept_paypal_checkout !== true),
    [listings],
  );

  /**
   * Once the seller's PayPal connection is genuinely ready, switch online
   * payments on for their listings so the gating flag goes green without a
   * second trip through the wizard. Listings the seller deliberately set to
   * pay-in-person only are left alone — those need the explicit button below.
   * No money logic, routing, or payout behaviour changes here.
   */
  const autoActivated = useRef(false);

  useEffect(() => {
    if (!user || !isReady || listingsLoading || autoActivated.current) return;
    const targets = listings.filter(
      (l) => l.accept_paypal_checkout !== true && l.accept_cash_payment !== true,
    );
    if (targets.length === 0) return;
    autoActivated.current = true;
    (async () => {
      const { error } = await supabase
        .from('listings')
        .update({ accept_paypal_checkout: true })
        .in(
          'id',
          targets.map((l) => l.id),
        )
        .eq('host_id', user.id);
      if (error) {
        autoActivated.current = false;
        return;
      }
      toast.success(
        targets.length === 1
          ? 'Your PayPal account is connected — online payments are on for your listing.'
          : `Your PayPal account is connected — online payments are on for ${targets.length} listings.`,
      );
      await loadListings();
    })();
  }, [user, isReady, listings, listingsLoading, loadListings]);

  const enableAllOnlineCheckout = async () => {
    if (!user || needsOnlineCheckout.length === 0) return;
    setBulkSaving(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ accept_paypal_checkout: true })
        .in(
          'id',
          needsOnlineCheckout.map((l) => l.id),
        )
        .eq('host_id', user.id);
      if (error) throw new Error(error.message);
      toast.success('Online payments turned on for every listing.');
      await loadListings();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't update your listings. Please try again.",
      );
    } finally {
      setBulkSaving(false);
    }
  };

  const enableOnlineCheckout = async (listing: SetupListing) => {
    setSavingId(listing.id);
    try {
      const { error } = await supabase
        .from('listings')
        .update({ accept_paypal_checkout: true })
        .eq('id', listing.id);
      if (error) throw new Error(error.message);
      toast.success(`Online payments turned on for “${listing.title}”.`);
      await loadListings();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Couldn't update this listing. Please try again.",
      );
    } finally {
      setSavingId(null);
    }
  };

  const connectState: StepState = isLoading
    ? 'pending'
    : !connection
      ? 'pending'
      : status === 'ready'
        ? 'done'
        : status === 'action_required' || status === 'revoked' || status === 'disconnected'
          ? 'blocked'
          : 'pending';

  const healthState: StepState = !connection
    ? 'pending'
    : emailUnconfirmed || notReceivable
      ? 'blocked'
      : isReady
        ? 'done'
        : 'pending';

  const listingState: StepState = listingsLoading
    ? 'pending'
    : listings.length === 0
      ? 'pending'
      : needsOnlineCheckout.length === 0
        ? 'done'
        : 'blocked';

  const completed = [connectState, healthState, listingState].filter((s) => s === 'done').length;

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <div className="mb-3 flex flex-wrap gap-2">
            <Link to="/dashboard/payments" className="v2-btn-quiet inline-flex w-fit">
              <ArrowLeft className="h-4 w-4" />
              Back to Payments
            </Link>
            <Link to="/dashboard/seller-setup" className="v2-btn-quiet inline-flex w-fit">
              Full seller setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="v2-eyebrow">Payment setup</p>
          <h1>Get ready to accept payments</h1>
          <p>
            Three steps to accept secure online payments from buyers and renters on Vendibook.
            {' '}
            {completed} of 3 complete.
          </p>
        </header>

        {/* Step 1 — connect */}
        <section className="v2-paypal-module">
          <div className="v2-paypal-header">
            <div>
              <p>Step 1 · Payment partner</p>
              <PayPalWordmark className="mt-2 h-6" />
            </div>
            <span className={`v2-status ${connectState === 'done' ? 'is-ok' : 'is-warn'}`}>
              {connectState === 'done' ? 'Connected' : 'Not finished'}
            </span>
          </div>
          <div className="v2-paypal-body">
            <h2>Connect your PayPal Business account</h2>
            <p>
              You&apos;ll sign in at PayPal and approve the connection, then come back here.
            </p>
            <SellerBusinessAccountHelp className="mt-3" compact />
            <p className="mt-3 text-xs text-muted-foreground">
              Pay Later and other funding sources may have different processing rates set and
              charged by PayPal to you as the seller. See PayPal for current pricing.
            </p>
          </div>
          <SellerPayPalConnect showWhenDisabled variant="dark" />
        </section>

        {/* Step 2 — account health */}
        <section className="v2-panel">
          <div className="v2-panel-head">
            <div>
              <p className="v2-eyebrow">Step 2</p>
              <h2>Clear anything holding up your payments</h2>
            </div>
            <span className={`v2-status ${healthState === 'done' ? 'is-ok' : healthState === 'blocked' ? 'is-alert' : ''}`}>
              {isRefreshing
                ? 'Checking with PayPal…'
                : healthState === 'done'
                ? 'All clear'
                : healthState === 'blocked'
                  ? 'Action required'
                  : 'Waiting on PayPal'}
            </span>
          </div>
          <div className="space-y-3 p-5">
            {!connection && (
              <p className="text-sm text-muted-foreground">
                Finish step 1 first. Once your account is connected we&apos;ll show exactly what
                PayPal still needs from you.
              </p>
            )}

            {connection && (
              <ul className="v2-checklist" style={{ borderColor: 'hsl(var(--v2-line))' }}>
                <li className={emailUnconfirmed ? 'is-blocked' : isReady ? 'is-done' : 'is-pending'}>
                  {marker(emailUnconfirmed ? 'blocked' : isReady ? 'done' : 'pending')}
                  Primary email confirmed on your PayPal account
                </li>
                <li className={notReceivable ? 'is-blocked' : isReady ? 'is-done' : 'is-pending'}>
                  {marker(notReceivable ? 'blocked' : isReady ? 'done' : 'pending')}
                  Your PayPal account can receive payments
                </li>
              </ul>
            )}
            {lastRefreshError && (
              <p className="v2-inline-error" role="alert">
                We couldn&apos;t verify your PayPal status. Your saved status is still shown above; try again when ready.
              </p>
            )}

            {emailUnconfirmed && (
              <p className="text-sm text-amber-700">
                Attention: Please confirm your email address on{' '}
                <a
                  className="underline"
                  href="https://www.paypal.com/businessprofile/settings"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  paypal.com/businessprofile/settings
                </a>{' '}
                in order to receive payments! You currently cannot receive payments.
              </p>
            )}
            {notReceivable && (
              <p className="text-sm text-amber-700">
                Attention: You currently cannot receive payments due to restriction on your PayPal
                account. Please reach out to PayPal Customer Support or connect to{' '}
                <a
                  className="underline"
                  href="https://www.paypal.com"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  www.paypal.com
                </a>{' '}
                for more information.
              </p>
            )}

            {connection && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="v2-btn-quiet"
                  disabled={isRefreshing}
                  onClick={async () => {
                    const row = await refreshFromPayPal();
                    if (!row) {
                      toast.error("Couldn't check your PayPal status. Please try again.");
                      return;
                    }
                    if (
                      row.onboarding_status === 'ready' &&
                      row.primary_email_confirmed &&
                      row.payments_receivable
                    ) {
                      toast.success('PayPal confirmed your account can receive payments.');
                    } else {
                      toast.info('We checked with PayPal — some steps are still outstanding.');
                    }
                  }}
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Checking with PayPal…
                    </>
                  ) : (
                    'Check my status with PayPal'
                  )}
                </button>
                {lastCheckedAt && (
                  <span className="text-xs text-muted-foreground">
                    Last checked {new Date(lastCheckedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Step 3 — listings accept online payments */}
        <section className="v2-panel">
          <div className="v2-panel-head">
            <div>
              <p className="v2-eyebrow">Step 3</p>
              <h2>Turn on online payments for your listings</h2>
            </div>
            <span className={`v2-status ${listingState === 'done' ? 'is-ok' : listingState === 'blocked' ? 'is-warn' : ''}`}>
              {listingsLoading
                ? 'Loading'
                : listings.length === 0
                  ? 'No listings yet'
                  : needsOnlineCheckout.length === 0
                    ? 'All listings ready'
                    : `${needsOnlineCheckout.length} to update`}
            </span>
          </div>
          <div className="space-y-3 p-5">
            {listingsLoading && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking your listings…
              </p>
            )}

            {!listingsLoading && listings.length === 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  You don&apos;t have any listings yet. Create one and you can switch on online
                  payments right here.
                </p>
                <Link to="/dashboard/listings/new" className="v2-btn">
                  Create a listing
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}

            {!listingsLoading && listings.length > 0 && needsOnlineCheckout.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Every active listing accepts online payments.
              </p>
            )}

            {needsOnlineCheckout.length > 1 && (
              <button
                type="button"
                className="v2-btn w-fit"
                onClick={enableAllOnlineCheckout}
                disabled={bulkSaving}
              >
                {bulkSaving ? 'Saving…' : `Turn on for all ${needsOnlineCheckout.length} listings`}
              </button>
            )}

            {needsOnlineCheckout.map((listing) => (
              <div
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{listing.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {listing.status === 'published' ? 'Live' : listing.status || 'Draft'} ·{' '}
                    {listing.accept_cash_payment
                      ? 'Currently pay in person only'
                      : 'No payment method selected'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="v2-btn"
                    onClick={() => enableOnlineCheckout(listing)}
                    disabled={savingId === listing.id}
                  >
                    {savingId === listing.id ? 'Saving…' : 'Accept online payments'}
                  </button>
                  <Link to={`/dashboard/listings/${listing.id}/edit`} className="v2-btn-quiet">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How payouts work */}
        <section className="v2-panel">
          <div className="v2-panel-head">
            <div>
              <p className="v2-eyebrow">After a sale</p>
              <h2>How you get paid</h2>
            </div>
          </div>
          <div className="space-y-3 p-5 text-sm text-muted-foreground">
            <p>
              Vendibook records what you&apos;re owed on every completed transaction. Payouts are
              reviewed and released by our team — typically within 24 hours of delivery
              confirmation, and we always strive for 24–48 hours. Rental payouts release 24 hours
              after the booking start.
            </p>
            {readiness.gatingActive && !readiness.ready && (
              <p className="text-amber-700">
                Online checkout on your listings stays paused until the steps above are complete.
              </p>
            )}
            <Link to="/dashboard/payments" className="v2-btn-quiet w-fit">
              View earnings and receipts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
