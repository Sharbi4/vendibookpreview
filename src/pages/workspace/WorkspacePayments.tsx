import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import PayPalReadyBadge from '@/components/workspace/PayPalReadyBadge';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';
import WorkspaceBookingPayments from '@/components/workspace/WorkspaceBookingPayments';
import PayoutCalendar from '@/components/workspace/PayoutCalendar';
import SellerPayoutBalance from '@/components/workspace/SellerPayoutBalance';
import SellerEarningsTable from '@/components/workspace/SellerEarningsTable';
import SellerBusinessAccountHelp from '@/components/payments/SellerBusinessAccountHelp';

const PayoutsPanel = lazy(() => import('@/components/dashboard/tabs/PayoutsPanel'));
const TransactionsDisputesTab = lazy(
  () => import('@/components/dashboard/tabs/TransactionsDisputesTab'),
);

/** Layout-matched placeholder so the money center doesn't jump while loading. */
const Fallback = () => (
  <div className="space-y-3 p-5">
    <div className="v2-skeleton h-5 w-44" />
    <div className="v2-skeleton h-24 w-full" />
    <div className="v2-skeleton h-24 w-full" />
  </div>
);

export default function WorkspacePayments() {
  return (
    <WorkspaceShell>
      <div className="v2-page-stack">
        <header className="v2-page-heading">
          <p className="v2-eyebrow">Money center</p>
          <h1>Payments</h1>
          <p>Your payment setup, earnings, purchases, receipts, charges, and disputes.</p>
        </header>

        <section className="v2-paypal-module">
          <div className="v2-paypal-header">
            <div>
              <p>Payment partner</p>
              <PayPalWordmark className="mt-2 h-6" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <span>Business account connection</span>
              <PayPalReadyBadge tone="dark" showDetails />
            </div>
          </div>
          <div className="v2-paypal-body">
            <h2>Accept secure online payments</h2>
            <p>
              Connect PayPal to let qualified buyers pay through Vendibook. Eligible marketplace
              payments are processed through your connected PayPal Business account, and
              Vendibook&apos;s platform fee is handled automatically by the approved PayPal Partner
              flow. You can create and publish listings before connecting.
            </p>
            <SellerBusinessAccountHelp className="mt-3" compact />
            <p className="mt-3 text-xs">
              Pay Later and other funding sources may have different processing rates set and
              charged by PayPal to you as the seller. See PayPal for current pricing.
            </p>
            <Link to="/dashboard/payments/setup" className="v2-paypal-cta mt-4 inline-flex w-fit">
              Open payment setup
            </Link>
          </div>
          <SellerPayPalConnect showWhenDisabled variant="dark" />
        </section>

        <section className="v2-panel">
          <SellerPayoutBalance />
        </section>

        <section className="v2-panel">
          <SellerEarningsTable />
        </section>

        <section className="v2-panel">
          <WorkspaceBookingPayments />
        </section>

        <section className="v2-panel">
          <PayoutCalendar />
        </section>

        <section>
          <div className="v2-panel v2-embedded-section">
            <Suspense fallback={<Fallback />}>
              <PayoutsPanel />
            </Suspense>
          </div>
        </section>

        <section>
          <div className="v2-panel v2-embedded-section">
            <Suspense fallback={<Fallback />}>
              <TransactionsDisputesTab />
            </Suspense>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
