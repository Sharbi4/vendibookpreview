import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
  Rocket,
  ShieldCheck,
  Store,
} from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useMyPayPalConnection } from '@/hooks/useMyPayPalConnection';
import SellerBusinessAccountHelp from '@/components/payments/SellerBusinessAccountHelp';

type StepState = 'done' | 'blocked' | 'pending';

type Step = {
  id: string;
  title: string;
  body: string;
  state: StepState;
  icon: typeof Store;
  action?: { label: string; to: string };
};

type ProfileRow = {
  full_name: string | null;
  business_name: string | null;
  phone_number: string | null;
};

type ListingRow = { id: string; status: string | null; accept_paypal_checkout: boolean | null };

/**
 * Seller onboarding inside the workspace.
 *
 * Every step is derived from real backend state: the seller's own profile row,
 * their PayPal connection, and their own listings. No money logic, payout
 * behaviour or listing rules change here — payouts stay manually reviewed.
 */
export default function WorkspaceSellerOnboarding() {
  const { user } = useAuth();
  const { connection, status, isReady } = useMyPayPalConnection();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [profileRes, listingsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, business_name, phone_number')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('listings')
        .select('id, status, accept_paypal_checkout')
        .eq('host_id', user.id)
        .neq('status', 'archived'),
    ]);
    setProfile((profileRes.data as ProfileRow) ?? null);
    setListings((listingsRes.data as ListingRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.title = 'Seller setup | Vendibook';
  }, []);

  const reasons = connection?.action_reasons ?? [];
  const emailUnconfirmed =
    connection?.primary_email_confirmed === false || reasons.includes('primary_email_unconfirmed');
  const notReceivable =
    connection?.payments_receivable === false || reasons.includes('payments_receivable_false');

  const steps: Step[] = useMemo(() => {
    const businessDone = Boolean(profile?.business_name && profile?.phone_number);
    const connected =
      Boolean(connection) && status !== 'disconnected' && status !== 'revoked';
    const published = listings.filter((l) => l.status === 'published');
    const onlineReady =
      listings.length > 0 && listings.every((l) => l.accept_paypal_checkout === true);

    return [
      {
        id: 'business',
        title: 'Add your business details',
        body: businessDone
          ? `${profile?.business_name} · ${profile?.phone_number}`
          : 'Vendibook sellers are businesses. Add your business name and a contact phone so buyers and our team can reach you.',
        state: businessDone ? 'done' : 'pending',
        icon: Building2,
        action: { label: businessDone ? 'Review details' : 'Add details', to: '/dashboard/account' },
      },
      {
        id: 'connect',
        title: 'Connect your PayPal Business account',
        body: isReady
          ? connection?.paypal_email
            ? `Connected — ${connection.paypal_email}`
            : 'Connected and able to receive payments.'
          : connected
            ? 'You started connecting PayPal. Finish on PayPal, then check your status.'
            : 'Connect a PayPal Business account for online payments. Individual owners can use a Sole Proprietorship account in their own legal name.',
        state: isReady ? 'done' : connected ? 'pending' : 'pending',
        icon: CreditCard,
        action: { label: isReady ? 'Manage connection' : 'Open payment setup', to: '/dashboard/payments/setup' },
      },
      {
        id: 'health',
        title: 'Clear anything PayPal still needs',
        body:
          emailUnconfirmed || notReceivable
            ? 'PayPal flagged something on your account that stops payments from reaching you. Resolve it in payment setup.'
            : isReady
              ? 'Your email is confirmed and your account can receive payments.'
              : 'Once you connect, we’ll show exactly what PayPal still needs from you.',
        state: emailUnconfirmed || notReceivable ? 'blocked' : isReady ? 'done' : 'pending',
        icon: ShieldCheck,
        action: { label: 'Open payment setup', to: '/dashboard/payments/setup' },
      },
      {
        id: 'listing',
        title: 'Create your first listing',
        body: listings.length
          ? `${listings.length} listing${listings.length === 1 ? '' : 's'} in your account · ${published.length} live`
          : 'Add your truck, trailer, kitchen, or vendor space. You can save and come back any time.',
        state: listings.length ? 'done' : 'pending',
        icon: Store,
        action: {
          label: listings.length ? 'View listings' : 'Start a listing',
          to: listings.length ? '/dashboard/listings' : '/dashboard/listings/new',
        },
      },
      {
        id: 'golive',
        title: 'Accept online payments and go live',
        body: !listings.length
          ? 'Create a listing first, then switch on online payments for it.'
          : onlineReady && published.length
            ? 'Your live listings accept online payments through Vendibook.'
            : onlineReady
              ? 'Online payments are on. Publish a listing to start getting inquiries.'
              : 'Some listings don’t accept online payments yet. Turn them on in one click.',
        state: onlineReady && published.length ? 'done' : 'pending',
        icon: Rocket,
        action: { label: 'Turn on online payments', to: '/dashboard/payments/setup' },
      },
    ];
  }, [profile, connection, status, isReady, emailUnconfirmed, notReceivable, listings]);

  const done = steps.filter((s) => s.state === 'done').length;
  const pct = Math.round((done / steps.length) * 100);

  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Seller setup</p>
          <h1>Get set up to sell on Vendibook</h1>
          <p>
            Finish these steps so your listings can go live and buyers can pay you securely.
            {loading ? ' Checking your progress…' : ` ${done} of ${steps.length} complete.`}
          </p>
          <div
            className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Seller setup progress"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </header>

        <section className="v2-panel">
          <div className="v2-panel-head">
            <div>
              <p className="v2-eyebrow">Your checklist</p>
              <h2>Steps to start selling</h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-wrap items-start gap-4 p-5">
                <span
                  className={`v2-task-marker ${step.state === 'done' ? 'is-ok' : step.state === 'blocked' ? 'is-warn' : ''}`}
                >
                  {step.state === 'done' ? (
                    <CheckCircle2 />
                  ) : step.state === 'blocked' ? (
                    <AlertTriangle />
                  ) : (
                    <step.icon />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Step {index + 1}
                  </p>
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
                {step.action && (
                  <Link
                    to={step.action.to}
                    className={step.state === 'done' ? 'v2-btn-quiet' : 'v2-btn'}
                  >
                    {step.action.label}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="v2-paypal-module">
          <div className="v2-paypal-header">
            <div>
              <p>Payment partner</p>
              <PayPalWordmark className="mt-2 h-6" />
            </div>
          </div>
          <div className="v2-paypal-body">
            <h2>Connect PayPal right here</h2>
            <p>
              You&apos;ll sign in at PayPal and approve the connection, then come back. You can
              create and publish listings before connecting — buyers just won&apos;t be able to pay
              online until it&apos;s ready.
            </p>
            <SellerBusinessAccountHelp className="mt-3" compact />
          </div>
          <SellerPayPalConnect showWhenDisabled variant="dark" />
        </section>

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
            <Link to="/dashboard/payments" className="v2-btn-quiet w-fit">
              Go to Payments
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
