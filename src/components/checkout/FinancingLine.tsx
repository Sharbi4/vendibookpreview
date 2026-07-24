interface FinancingLineProps {
  /** Purchase total in USD (dollars, not cents). */
  totalUsd: number;
}

/**
 * Static "as low as $X/mo with Affirm" hint shown near the total so
 * buyers see a financing option before choosing a payment method.
 * Approval still happens on Affirm/Klarna/Afterpay's side after they
 * pick that tab in the PaymentElement — this is a nudge, not an offer.
 *
 * Hidden below the Affirm minimum ($50) since financing isn't available.
 */
const FinancingLine = ({ totalUsd }: FinancingLineProps) => {
  if (!totalUsd || totalUsd < 50) return null;
  // Simple 12-month, 0% APR illustrative split — the true APR is set at
  // approval by the provider and shown on their screen.
  const monthly = Math.max(1, Math.round((totalUsd / 12) * 100) / 100);
  const formatted = monthly.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: monthly < 100 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return (
    <p className="text-[11px] text-muted-foreground text-right">
      or as low as <span className="text-foreground font-medium">{formatted}/mo</span> with Affirm,
      Klarna, or Afterpay
    </p>
  );
};

export default FinancingLine;
