import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/commissions';
import { cn } from '@/lib/utils';

export interface CampusPartnerBenefitRow {
  code: string | null;
  partner_name: string | null;
  credit_cents: number;
  status: string;
  redemption_kind: string | null;
}

/** Statuses where the buyer still holds the benefit on this transaction. */
const SHOWN = ['reserved', 'completed', 'partially_refunded'];

/**
 * The buyer's Campus Partner redemption for one transaction, read from their
 * own promo_code_uses row (RLS: users see only their own). Null when none.
 */
export function useCampusPartnerBenefit(ref: {
  paymentRecordId?: string | null;
  bookingRequestId?: string | null;
  saleTransactionId?: string | null;
}) {
  const [row, setRow] = useState<CampusPartnerBenefitRow | null>(null);
  const { paymentRecordId, bookingRequestId, saleTransactionId } = ref;
  useEffect(() => {
    let cancelled = false;
    const column = paymentRecordId ? 'payment_record_id' : bookingRequestId ? 'booking_request_id' : saleTransactionId ? 'sale_transaction_id' : null;
    const value = paymentRecordId || bookingRequestId || saleTransactionId;
    if (!column || !value) { setRow(null); return; }
    void (async () => {
      try {
        // Snapshot columns are newer than the generated types.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = (await (supabase.from('promo_code_uses') as any)
          .select('code, partner_name, credit_cents, status, redemption_kind')
          .eq(column, value)
          .in('status', SHOWN)
          .order('created_at', { ascending: false })
          .limit(1)) ?? {};
        const first = (data as CampusPartnerBenefitRow[] | null | undefined)?.[0];
        if (!cancelled) setRow(first && Number(first.credit_cents) > 0 ? first : null);
      } catch {
        // The benefit card is informational; a failed lookup never breaks the page.
        if (!cancelled) setRow(null);
      }
    })();
    return () => { cancelled = true; };
  }, [paymentRecordId, bookingRequestId, saleTransactionId]);
  return row;
}

interface Props {
  paymentRecordId?: string | null;
  bookingRequestId?: string | null;
  saleTransactionId?: string | null;
  className?: string;
}

/**
 * "Campus Partner benefit" card for confirmation, receipt and order/booking
 * detail screens. Renders nothing when the transaction used no code.
 */
export default function CampusPartnerBenefit({ className, ...ref }: Props) {
  const row = useCampusPartnerBenefit(ref);
  if (!row) return null;
  return (
    <div
      className={cn('rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm', className)}
      data-testid="campus-partner-benefit"
    >
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <GraduationCap className="h-4 w-4 text-emerald-600" aria-hidden /> Campus Partner benefit
      </p>
      {row.partner_name ? <p className="mt-1 text-foreground">{row.partner_name}</p> : null}
      {row.code ? <p className="font-mono text-xs text-muted-foreground">{row.code}</p> : null}
      <p className="mt-2 text-muted-foreground">
        You saved <span className="font-semibold text-foreground">{formatCurrency(Number(row.credit_cents) / 100)}</span> with your school's Vendibook benefit.
      </p>
    </div>
  );
}
