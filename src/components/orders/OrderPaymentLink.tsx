import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt, ArrowRight } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';

interface OrderPaymentLinkProps {
  /** A sale transaction id or booking request id tied to a payment record. */
  saleTransactionId?: string | null;
  bookingRequestId?: string | null;
  className?: string;
}

/**
 * Surfaces the payment/receipt page for a transaction, but only once a
 * payment record actually exists — cash and unpaid orders show nothing.
 */
const OrderPaymentLink = ({ saleTransactionId, bookingRequestId, className }: OrderPaymentLinkProps) => {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const column = saleTransactionId ? 'sale_transaction_id' : bookingRequestId ? 'booking_request_id' : null;
    const value = saleTransactionId ?? bookingRequestId;
    if (!column || !value) return;

    (async () => {
      const { data } = await (supabase as any)
        .from('payment_records')
        .select('id, reference')
        .eq(column, value)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data) return;
      setOrderId(data.id as string);
      setReference((data.reference as string) ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [saleTransactionId, bookingRequestId]);

  if (!orderId) return null;

  return (
    <Link
      to={`/orders/${orderId}`}
      className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:bg-accent/40 ${className ?? ''}`}
    >
      <span className="flex items-center gap-3">
        <Receipt className="h-4 w-4 text-muted-foreground" />
        <span>
          <span className="font-medium">Payment &amp; receipt</span>
          {reference && <span className="ml-2 text-xs text-muted-foreground">{reference}</span>}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
};

export default OrderPaymentLink;
