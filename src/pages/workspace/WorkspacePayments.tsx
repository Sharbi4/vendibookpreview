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

        <section className="v2-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-2xl">
              <div className="mb-2 flex items-center gap-2"><PayPalWordmark surface="light" /><span className="text-sm font-semibold">&amp; Vendibook</span></div>
              <h2 className="font-semibold">Your business. Payments made simpler.</h2>
              <p className="mt-1 text-sm text-muted-foreground">Connect PayPal from your main dashboard. Track earnings, receipts, and payment activity here.</p>
            </div>
            <Link to="/dashboard" className="v2-btn-outline">Go to dashboard</Link>
          </div>
          <details className="mt-4 border-t pt-4 text-sm">
            <summary className="cursor-pointer font-medium">Learn about receiving payments</summary>
            <div className="mt-3 space-y-3 text-muted-foreground">
              <p>Buyers pay through PayPal on eligible listings. You can create and publish listings before connecting your account.</p>
              <SellerBusinessAccountHelp compact />
              <p>PayPal sets processing rates, which may vary by funding source. Review your payment settings for account requirements.</p>
              <Link to="/dashboard/payments/setup" className="inline-block font-medium underline underline-offset-4">Payment settings</Link>
            </div>
          </details>
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
