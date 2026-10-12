/** Temporary pause while equipment invoice payments are not available. */
export default function SalesPaymentSetupPaused() {
  return (
    <section className="v2-panel" aria-label="Equipment sale payments">
      <div className="v2-panel-head">
        <div>
          <p className="v2-eyebrow">Equipment sales</p>
          <h2>Online payment setup is temporarily unavailable</h2>
        </div>
      </div>
      <div className="space-y-3 p-5 text-sm text-muted-foreground">
        <p>Equipment invoice payments are not available yet. No payment account connection is needed right now.</p>
        <p>You can still view your existing transactions, receipts, and payout statuses in Payments.</p>
      </div>
    </section>
  );
}
