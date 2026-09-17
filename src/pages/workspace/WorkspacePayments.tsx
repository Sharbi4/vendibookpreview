import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import SellerPayPalConnect from '@/components/account/SellerPayPalConnect';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';

const PayoutsPanel = lazy(() => import('@/components/dashboard/tabs/PayoutsPanel'));
const TransactionsDisputesTab = lazy(
  () => import('@/components/dashboard/tabs/TransactionsDisputesTab'),
);

const Fallback = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="h-5 w-5 animate-spin opacity-60" />
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
              <PayPalWordmark className="h-6" />
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
          <SellerPayPalConnect showWhenDisabled />
        </section>

        <section className="v2-embedded-section">
          <Suspense fallback={<Fallback />}>
            <PayoutsPanel />
          </Suspense>
        </section>

        <section className="v2-embedded-section">
          <Suspense fallback={<Fallback />}>
            <TransactionsDisputesTab />
          </Suspense>
        </section>
      </div>
    </WorkspaceShell>
  );
}
