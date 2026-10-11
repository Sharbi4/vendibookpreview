interface FinancingLineProps {
  /** Purchase total in USD (dollars, not cents). */
  totalUsd: number;
}

/**
 * Accurate payment note shown near the checkout total. Vendibook checkout is
 * processed by PayPal; equipment financing is a separate application with
 * Equinox Funding and only on opted-in for-sale listings.
 */
const FinancingLine = ({ totalUsd }: FinancingLineProps) => {
  if (!totalUsd) return null;
  return (
    <p className="text-[11px] text-muted-foreground text-right">
      Checkout is processed securely by PayPal.
    </p>
  );
};

export default FinancingLine;
