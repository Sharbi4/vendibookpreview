import { Suspense, lazy } from 'react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';

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
            <span>Business account connection</span>
          </div>
          <div className="v2-paypal-body">
            <h2>Accept secure online payments</h2>
            <p>
              Connect PayPal to let qualified buyers pay through Vendibook. Eligible marketplace
              payments are processed through your connected PayPal Business account, and
              Vendibook&apos;s platform fee is handled automatically by the approved PayPal Partner
              flow. You can create and publish listings before connecting.
            </p>
          </div>
          <SellerPayPalConnect showWhenDisabled variant="dark" />
        </section>

        <section>
          <div className="v2-section-head">
            <div>
              <h2>Earnings &amp; payouts</h2>
              <p>Proceeds Vendibook has recorded for you, and where they are sent.</p>
            </div>
          </div>
          <div className="v2-card v2-embedded-section">
            <Suspense fallback={<Fallback />}>
              <PayoutsPanel />
            </Suspense>
          </div>
        </section>

        <section>
          <div className="v2-section-head">
            <div>
              <h2>Transactions &amp; disputes</h2>
              <p>Every payment you&apos;ve made or received, with refunds and dispute status.</p>
            </div>
          </div>
          <div className="v2-card v2-embedded-section">
            <Suspense fallback={<Fallback />}>
              <TransactionsDisputesTab />
            </Suspense>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
