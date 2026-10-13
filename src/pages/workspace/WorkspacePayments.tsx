import { Suspense, lazy } from 'react';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import WorkspaceBookingPayments from '@/components/workspace/WorkspaceBookingPayments';
import PayoutCalendar from '@/components/workspace/PayoutCalendar';
import SellerPayoutBalance from '@/components/workspace/SellerPayoutBalance';
import SellerEarningsTable from '@/components/workspace/SellerEarningsTable';
import SalesPaymentSetupPaused from '@/components/payments/SalesPaymentSetupPaused';
import PaymentsDisputesEntry from '@/components/workspace/PaymentsDisputesEntry';
import { TaxExemptionManager } from '@/components/tax/TaxExemptButton';

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
          <p>Manage earnings, purchases, receipts, and disputes.</p>
        </header>

        <SalesPaymentSetupPaused />

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

        <section className="v2-panel" aria-label="Sales tax exemption">
          <div className="v2-panel-head">
            <div>
              <p className="v2-eyebrow">Sales tax</p>
              <h2>Tax exemption certificates</h2>
            </div>
          </div>
          <div className="space-y-3 p-5">
            <p className="text-sm text-muted-foreground">
              Buying for resale or tax exempt? Add your state certificate. It applies to your purchases, rentals and Vendibook subscriptions in that state right away.
            </p>
            <TaxExemptionManager />
          </div>
        </section>

        <section className="v2-panel" aria-label="Disputes">
          <PaymentsDisputesEntry />
        </section>
      </div>
    </WorkspaceShell>
  );
}
