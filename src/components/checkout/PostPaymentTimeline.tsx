import { ShieldCheck, BellRing, PackageCheck, CircleDollarSign } from 'lucide-react';

/**
 * "What happens after you pay" — 4-step timeline shown on the review
 * step of an immersive high-ticket checkout. Uses payment-protection
 * vocabulary (never "payment protection" here — buyer-facing).
 */
const STEPS = [
  {
    icon: ShieldCheck,
    title: 'Your payment is protected',
    body: 'We hold your funds securely — the seller doesn\'t receive a cent until you confirm the item.',
  },
  {
    icon: BellRing,
    title: 'The seller is notified',
    body: 'The seller gets an alert and arranges pickup, delivery, or freight scheduling with you.',
  },
  {
    icon: PackageCheck,
    title: 'You receive and inspect',
    body: 'Look the item over. If anything is off, open a claim from your dashboard within the protection window.',
  },
  {
    icon: CircleDollarSign,
    title: 'Funds release to the seller',
    body: 'Confirm the item is as described — funds transfer to the seller and the sale is complete.',
  },
];

const PostPaymentTimeline = () => (
  <section
    aria-label="What happens after you pay"
    className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5"
  >
    <h3 className="text-sm font-semibold text-foreground mb-4">
      What happens after you pay
    </h3>
    <ol className="space-y-4">
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const isLast = i === STEPS.length - 1;
        return (
          <li key={s.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border/60 mt-1" />}
            </div>
            <div className={isLast ? '' : 'pb-1'}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {s.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
    <p className="text-[11px] text-muted-foreground mt-4 pt-4 border-t border-border/60">
      Questions?{' '}
      <a href="/help" className="text-primary hover:underline font-medium">
        Contact us
      </a>{' '}
      — support Mon–Fri, 9am–5pm AZ.
    </p>
  </section>
);

export default PostPaymentTimeline;
