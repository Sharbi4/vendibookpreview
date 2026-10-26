import { Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, Video, PenLine, BadgeCheck, ChevronRight } from 'lucide-react';
import { SaleCard } from './SaleCard';

/**
 * Vendibook Purchase Protection (owner, 2026-10-26). Buying has no deposit:
 * the full payment is held by Vendibook and released to the seller only after
 * the buyer's recorded walkthrough, confirmation and signatures. The same
 * wording is used by Atlas, Allison and the phone line (atlasGuideFaq).
 */
const STEPS = [
  {
    icon: CreditCard,
    title: 'Pay securely, we hold it',
    body: 'Pay the full price through Vendibook checkout. There is no deposit, and the seller is not paid yet.',
  },
  {
    icon: Video,
    title: 'Walk through and test drive',
    body: 'At handoff, inspect, test and test-drive the equipment while your walkthrough video is recorded.',
  },
  {
    icon: PenLine,
    title: 'Confirm and sign',
    body: 'If it matches the listing, confirm and both of you sign the purchase agreement in Vendibook.',
  },
  {
    icon: BadgeCheck,
    title: 'Then the seller is paid',
    body: 'Only after your confirmation and signatures does Vendibook release the funds to the seller.',
  },
] as const;

export function PurchaseProtectionCard({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-2.5 rounded-2xl bg-primary/5 p-3 ring-1 ring-primary/20" data-testid="purchase-protection-compact">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">Purchase Protection.</span>{' '}
          <span className="text-muted-foreground">No deposit. Vendibook holds your payment until you confirm at the walkthrough and sign.</span>
        </p>
      </div>
    );
  }

  return (
    <SaleCard variant="warm" bronze padding="lg" aria-labelledby="purchase-protection-title" data-testid="purchase-protection">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/15 blur-3xl" aria-hidden />
      <div className="relative space-y-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-orange-600 text-primary-foreground shadow-lg shadow-primary/30">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Included with every Vendibook purchase</p>
            <h2 id="purchase-protection-title" className="mt-0.5 text-lg font-semibold tracking-tight sm:text-xl">
              Vendibook Purchase Protection
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">No deposit. Your payment is held until you are sure.</p>
          </div>
        </div>

        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3 rounded-2xl bg-background/40 p-3.5 ring-1 ring-border/60">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/25">
                <step.icon className="h-4 w-4" aria-hidden />
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {i + 1}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{step.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-2xl bg-background/50 p-3.5 ring-1 ring-border/60">
          <p className="text-xs leading-relaxed">
            <span className="font-semibold">Not as described?</span>{' '}
            <span className="text-muted-foreground">
              If you find a problem at the walkthrough that wasn&rsquo;t disclosed in the listing, or decide not to go ahead,
              don&rsquo;t confirm. The purchase is canceled under the Vendibook Guarantee. Agreeing to buy is a good-faith
              commitment, so review the listing and ask questions first.
            </span>
          </p>
        </div>

        <Link to="/terms" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Read the Vendibook Guarantee <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </SaleCard>
  );
}

export default PurchaseProtectionCard;
