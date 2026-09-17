import { Receipt } from 'lucide-react';

/**
 * Charges panel for the order confirmation page.
 *
 * Shows exactly what the buyer was charged on this order: item price, seller
 * delivery, buyer-paid Vendibook Freight and sales tax. Every figure comes
 * from the recorded sale transaction — nothing is estimated here.
 */
interface Props {
  amount: number;
  deliveryFee?: number | null;
  freightCost?: number | null;
  /** Freight is only part of this total when the buyer paid it. */
  freightChargedToBuyer?: boolean;
  taxAmount?: number | null;
  /** True for pay-in-person orders, where nothing is collected online. */
  isCash?: boolean;
}

const usd = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrderChargesSummary({
  amount,
  deliveryFee,
  freightCost,
  freightChargedToBuyer,
  taxAmount,
  isCash,
}: Props) {
  const item = Number(amount ?? 0);
  const delivery = Number(deliveryFee ?? 0);
  const freight = freightChargedToBuyer ? Number(freightCost ?? 0) : 0;
  const tax = Number(taxAmount ?? 0);
  const total = item + delivery + freight + tax;

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Item price', value: usd(item) },
    ...(delivery > 0 ? [{ label: 'Seller delivery', value: usd(delivery) }] : []),
    ...(freight > 0 ? [{ label: 'Vendibook Freight', value: usd(freight) }] : []),
    ...(tax > 0 ? [{ label: 'Sales tax', value: usd(tax) }] : []),
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Receipt className="h-4 w-4" /> Charges
      </h2>
      <dl className="mt-4 space-y-2.5 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="text-foreground">{r.value}</dd>
          </div>
        ))}
        <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="text-sm font-semibold text-foreground">
            {isCash ? 'Total agreed' : 'Total paid'}
          </dt>
          <dd className="text-lg font-semibold text-foreground">{usd(total)}</dd>
        </div>
      </dl>
      {isCash ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          This order is paid in person. Vendibook doesn&apos;t collect this money — you settle it
          directly with the seller.
        </p>
      ) : null}
    </div>
  );
}
