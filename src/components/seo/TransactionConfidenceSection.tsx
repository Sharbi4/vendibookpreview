import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardCheck, CreditCard, FileSignature, ShieldCheck } from 'lucide-react';
import { PayPalWordmark } from '@/components/brand/ProviderLogos';
import FlipInsuranceSection from '@/components/booking/FlipInsuranceSection';

type Audience = 'buyer' | 'renter' | 'seller' | 'host';

const COPY: Record<Audience, { eyebrow: string; title: string; steps: { icon: typeof CreditCard; title: string; text: string }[] }> = {
  buyer: {
    eyebrow: 'How buying works on Vendibook',
    title: 'One organized purchase, start to finish.',
    steps: [
      { icon: ClipboardCheck, title: 'Walk through it first', text: 'Ask questions and schedule an in-person or video walkthrough before you commit.' },
      { icon: FileSignature, title: 'Agree on terms', text: 'Price, delivery or pickup, and handoff details are recorded with your order.' },
      { icon: CreditCard, title: 'Pay with PayPal', text: 'Card, PayPal balance, or Pay Later where eligible. No PayPal account needed to pay by card.' },
      { icon: ShieldCheck, title: 'Documented handoff', text: 'Both sides confirm the handoff in Vendibook, creating a clear transaction record.' },
    ],
  },
  renter: {
    eyebrow: 'How renting works on Vendibook',
    title: 'Book with clarity. Hand off with a record.',
    steps: [
      { icon: ClipboardCheck, title: 'Request your dates', text: 'Share your plans and required documents so the host can review your request.' },
      { icon: CreditCard, title: 'Pay with PayPal', text: 'Secure checkout by card or PayPal balance. Pay Later where eligible.' },
      { icon: FileSignature, title: 'Rental agreement', text: 'Terms, dates, and requirements are recorded with your booking.' },
      { icon: ShieldCheck, title: 'Documented handoff', text: 'Pickup and return are confirmed in Vendibook with photos and timestamps.' },
    ],
  },
  seller: {
    eyebrow: 'How selling works on Vendibook',
    title: 'Get paid through an organized sale.',
    steps: [
      { icon: ClipboardCheck, title: 'List for free', text: 'Photos, specs, and price in minutes. Buyers reach you through Vendibook messaging.' },
      { icon: FileSignature, title: 'Agree on terms', text: 'Offers, delivery, and handoff details are recorded with the sale.' },
      { icon: CreditCard, title: 'Buyer pays with PayPal', text: 'Card, PayPal balance, or Pay Later where eligible. Cash sales in person stay free.' },
      { icon: ShieldCheck, title: 'Handoff, then payout', text: 'After the documented handoff, Vendibook reviews and sends your payout, typically within 24–48 hours.' },
    ],
  },
  host: {
    eyebrow: 'How hosting works on Vendibook',
    title: 'Rent out your equipment with a clear record.',
    steps: [
      { icon: ClipboardCheck, title: 'Set your requirements', text: 'Choose rates, documents, and insurance requirements renters must meet.' },
      { icon: CreditCard, title: 'Renter pays with PayPal', text: 'Bookings are paid through secure PayPal checkout.' },
      { icon: ShieldCheck, title: 'Documented handoff', text: 'Pickup and return are confirmed in Vendibook with photos and timestamps.' },
      { icon: FileSignature, title: 'Reviewed payouts', text: 'Vendibook reviews and releases payouts, typically 24 hours after the booking starts.' },
    ],
  },
};

export default function TransactionConfidenceSection({ audience, source }: { audience: Audience; source: string }) {
  const c = COPY[audience];
  const rental = audience === 'renter' || audience === 'host';
  return (
    <>
      <section aria-labelledby={`tx-${source}`} className="rounded-3xl border border-border bg-card p-6 md:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">{c.eyebrow}</p>
            <h2 id={`tx-${source}`} className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{c.title}</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Checkout by</span>
            <PayPalWordmark surface="light" className="h-4" />
          </div>
        </div>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><s.icon className="h-4 w-4" /></span>
                <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
          <Link to="/payments" className="inline-flex items-center gap-1 text-foreground underline underline-offset-4">How payments work <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/how-it-works" className="inline-flex items-center gap-1 text-foreground underline underline-offset-4">How handoffs work <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
          Pay Later offers are subject to PayPal eligibility and terms. Vendibook does not inspect, title-check, or guarantee listings; review each item before you pay.
        </p>
      </section>
      {rental && <FlipInsuranceSection source={source} owner={audience === 'host'} />}
    </>
  );
}
