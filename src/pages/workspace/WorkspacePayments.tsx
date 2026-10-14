import { Link } from 'react-router-dom';
import WorkspaceShell from '@/components/workspace/WorkspaceShell';
import PayoutCalendar from '@/components/workspace/PayoutCalendar';
import SellerPayoutBalance from '@/components/workspace/SellerPayoutBalance';
import SellerEarningsTable from '@/components/workspace/SellerEarningsTable';
import PaymentsDisputesEntry from '@/components/workspace/PaymentsDisputesEntry';
import PayoutMethodPanel from '@/components/workspace/money/PayoutMethodPanel';
import BoostHistoryTable from '@/components/workspace/money/BoostHistoryTable';
import { LightScope } from '@/components/workspace/money/LightScope';
import { TaxExemptionManager } from '@/components/tax/TaxExemptButton';
import { PageHeader, Panel, ws } from '@/components/workspace/ui';
import { useSellerPayables } from '@/hooks/useSellerPayables';

/**
 * Payouts & payments: the seller's finance view (balance, payouts, payout
 * method, earnings per order, expected dates), plus tax certificates and
 * disputes for everyone. Every figure comes from the seller's own recorded
 * payables and payment records; nothing on this page moves money.
 *
 * The full payment ledger for buyers and sellers (with filters, receipts and
 * "report an issue") lives on /dashboard/transactions; rental bookings live
 * there too, under the Rentals filter.
 */
export default function WorkspacePayments() {
  const payables = useSellerPayables();
  // Earnings and the calendar only mean something once there is a payable;
  // keep them while loading or on error so failures stay visible.
  const showSellerDetail = payables.isLoading || payables.isError || (payables.data?.length ?? 0) > 0;

  return (
    <WorkspaceShell>
      <div className={ws.page}>
        <div className={ws.stack}>
          <PageHeader
            eyebrow="Money"
            title="Payouts & payments"
            description="What you’ve earned, what’s on the way and where it’s paid out. Vendibook reviews and sends every payout manually."
            actions={
              <>
                <Link to="/dashboard/transactions" className={ws.secondary}>Transactions</Link>
                <Link to="/dashboard/invoices" className={ws.secondary}>Invoices</Link>
              </>
            }
          />

          <SellerPayoutBalance aside={<PayoutMethodPanel />} />

          {showSellerDetail && <SellerEarningsTable />}
          {showSellerDetail && <PayoutCalendar />}

          <BoostHistoryTable />

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
            <PaymentsDisputesEntry />
            <Panel
              title="Sales tax exemption"
              description="Buying for resale or tax exempt? Add your state certificate. It applies to your purchases, rentals and Vendibook subscriptions in that state right away."
              label="Sales tax exemption"
            >
              <LightScope className="[&_input]:border [&_input]:border-[#E2DBD0] [&_input]:bg-white [&_input]:text-[#1C1B1A] [&_select]:border-[#E2DBD0] [&_select]:bg-white [&_select]:text-[#1C1B1A]">
                <TaxExemptionManager />
              </LightScope>
            </Panel>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}
