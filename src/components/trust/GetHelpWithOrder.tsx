import { useState } from 'react';
import { Undo2, ShieldAlert, MessageSquareWarning, MessageCircle, LifeBuoy } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ReportIssueDialog } from '@/components/support/ReportIssueDialog';
import { RefundRequestModal } from './RefundRequestModal';
import { DisputeModal } from './DisputeModal';
import { cn } from '@/lib/utils';

type BuyerAction = 'refund' | 'dispute' | 'report' | 'contact';
type SellerAction = 'dispute_respond' | 'report_buyer' | 'contact';

/**
 * Trust actions block for the buyer or seller view of an order / transaction.
 * Rendered on TransactionDetail and OrderTracking — never in the sidebar or navbar.
 */
export interface GetHelpWithOrderProps {
  role: 'buyer' | 'seller';
  transactionId: string;
  listingId?: string | null;
  /** Buyer-only: total the buyer paid, used in the refund review step. */
  orderTotal?: number;
  orderLabel?: string;
  /** Refund availability is state-dependent (paid / not yet completed / not already refunded). */
  refundEligible?: boolean;
  /** Dispute availability — after payment, still inside protection window. */
  disputeEligible?: boolean;
  className?: string;
  onChanged?: () => void;
}

export function GetHelpWithOrder({
  role, transactionId, listingId, orderTotal = 0, orderLabel,
  refundEligible, disputeEligible, className, onChanged,
}: GetHelpWithOrderProps) {
  const [openRefund, setOpenRefund] = useState(false);
  const [openDispute, setOpenDispute] = useState(false);
  const [openReport, setOpenReport] = useState(false);
  const [openReportBuyer, setOpenReportBuyer] = useState(false);

  const openConcierge = () => {
    const prefill = orderLabel
      ? `I need help with order ${orderLabel} (id ${transactionId.slice(0, 8)}). `
      : `I need help with order ${transactionId.slice(0, 8)}. `;
    window.dispatchEvent(new CustomEvent('open-vendi-chat', { detail: { prefill } }));
  };

  const items: Array<{
    key: BuyerAction | SellerAction;
    icon: typeof Undo2;
    label: string;
    hint: string;
    onClick: () => void;
    show: boolean;
  }> = role === 'buyer'
    ? [
        {
          key: 'refund', icon: Undo2, label: 'Request a refund',
          hint: 'Our team reviews within 1 business day.',
          onClick: () => setOpenRefund(true),
          show: !!refundEligible,
        },
        {
          key: 'dispute', icon: ShieldAlert, label: 'Open a dispute',
          hint: 'Pauses any pending payout while we investigate.',
          onClick: () => setOpenDispute(true),
          show: !!disputeEligible,
        },
        {
          key: 'report', icon: MessageSquareWarning, label: 'Report an issue',
          hint: 'Tell us about a bug or something that seems off.',
          onClick: () => setOpenReport(true),
          show: true,
        },
        {
          key: 'contact', icon: MessageCircle, label: 'Contact us',
          hint: 'Chat with Vendi — prefilled with this order.',
          onClick: openConcierge,
          show: true,
        },
      ]
    : [
        {
          key: 'dispute_respond', icon: ShieldAlert, label: 'Respond to dispute',
          hint: 'Add your side of the story and evidence.',
          onClick: () => setOpenDispute(true),
          show: !!disputeEligible,
        },
        {
          key: 'report_buyer', icon: MessageSquareWarning, label: 'Report a problem with this buyer',
          hint: 'Flag suspected fraud, abuse, or no-show.',
          onClick: () => setOpenReportBuyer(true),
          show: true,
        },
        {
          key: 'contact', icon: MessageCircle, label: 'Contact us',
          hint: 'Chat with Vendi — prefilled with this order.',
          onClick: openConcierge,
          show: true,
        },
      ];

  const visible = items.filter((i) => i.show);
  if (visible.length === 0) return null;

  return (
    <>
      <Card className={cn('border-white/10 bg-white/[0.03] p-5', className)}>
        <div className="mb-4 flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-orange-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">
            Get help with this order
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map(({ key, icon: Icon, label, hint, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              className="group flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-left transition hover:border-orange-400/40 hover:bg-white/[0.05]"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-orange-300 group-hover:text-orange-200" />
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="mt-0.5 text-xs text-white/60">{hint}</div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {role === 'buyer' && (
        <>
          <RefundRequestModal
            open={openRefund}
            onOpenChange={setOpenRefund}
            transactionId={transactionId}
            listingId={listingId}
            orderTotal={orderTotal}
            orderLabel={orderLabel}
            onSubmitted={onChanged}
          />
          <ReportIssueDialog
            open={openReport}
            onOpenChange={setOpenReport}
            context={{
              featureArea: 'purchase',
              related: { sale_transaction_id: transactionId, listing_id: listingId ?? null },
            }}
          />
        </>
      )}

      {role === 'seller' && (
        <ReportIssueDialog
          open={openReportBuyer}
          onOpenChange={setOpenReportBuyer}
          context={{
            featureArea: 'fraud',
            defaultCategory: 'buyer_report',
            related: { sale_transaction_id: transactionId, listing_id: listingId ?? null },
          }}
        />
      )}

      <DisputeModal
        open={openDispute}
        onOpenChange={setOpenDispute}
        transactionId={transactionId}
        role={role}
        onSubmitted={onChanged}
      />
    </>
  );
}

export default GetHelpWithOrder;
