import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
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
          <p className="v2-eyebrow">Payments</p>
          <h1>Money center</h1>
          <p>Manage PayPal setup, earnings, purchases, receipts, and disputes.</p>
        </header>


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
