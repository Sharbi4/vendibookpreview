import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, Banknote, HandCoins, Receipt, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  PayPalMonogram,
  PayPalWordmark,
  PlaidLogo,
  EquinoxFundingLogo,
} from '@/components/brand/ProviderLogos';

/**
 * Shared payment-rails explainer used across /how-it-works,
 * /how-it-works-seller and /how-it-works-host. Each page passes an
 * `audience` so the copy differs (no duplicated blocks), while the
 * provider branding, flow steps and detail overlays stay consistent.
 */

export type RailsAudience = 'buyer' | 'seller' | 'host';

type RailKey = 'paypal' | 'inperson' | 'equinox' | 'plaid';

interface RailLink {
  label: string;
  href: string;
}

interface RailDef {
  key: RailKey;
  logo: JSX.Element;
  title: string;
  summary: string;
  detailTitle: string;
  detailSteps: string[];
  detailNote: string;
  link?: RailLink;
  /** Deep-link into the actual product flow (dashboard / publish wizard). */
  flowLink?: RailLink;
}

const paypalRail = (audience: RailsAudience): RailDef => ({
  key: 'paypal',
  logo: <PayPalWordmark className="h-5" />,
  title: 'Online checkout with PayPal',
  summary:
    audience === 'buyer'
      ? 'Pay online with your PayPal balance, bank, or the card in your PayPal wallet. No Vendibook account balance required.'
      : 'Turn on PayPal Checkout for your listing and buyers or renters can pay online in a few taps.',
  detailTitle: 'How PayPal checkout works on Vendibook',
  detailSteps: [
    'You (or your buyer) open the listing and choose PayPal Checkout.',
    'Vendibook creates the order and hands off to PayPal to approve the payment.',
    'PayPal confirms the payment back to Vendibook and the order is recorded.',
    'Both sides get a receipt by email and can follow the order in the dashboard.',
    audience === 'buyer'
      ? 'You coordinate pickup, delivery, or booking details with the other party.'
      : 'Vendibook records your proceeds, minus the 12.9% platform fee, and an administrator issues your payout to the destination you saved.',
  ],
  detailNote:
    'PayPal Checkout only appears on listings where the seller or host has enabled it. Payout destinations are saved privately in your dashboard.',
  link: { label: 'More about payments', href: '/payments' },
  flowLink:
    audience === 'buyer'
      ? { label: 'See the exact steps in your orders', href: '/dashboard?view=shopper&tab=orders' }
      : { label: 'See the exact steps in Payouts', href: '/dashboard?view=host&tab=payouts' },
});

const inPersonRail = (audience: RailsAudience): RailDef => ({
  key: 'inperson',
  logo: <HandCoins className="h-5 w-5 text-foreground/70" />,
  title: 'Pay in person',
  summary:
    audience === 'buyer'
      ? 'Some listings accept cash, certified funds, or a bank transfer arranged directly with the seller at handoff.'
      : 'Prefer to settle offline? Keep Pay in Person on and arrange payment directly at handoff.',
  detailTitle: 'How Pay in Person works',
  detailSteps: [
    'The listing shows Pay in Person as an accepted method.',
    'Buyer and seller message on Vendibook to agree on time, place, and method.',
    'Payment happens directly between the two parties at handoff.',
    'Mark the transaction complete in your dashboard so records stay accurate.',
  ],
  detailNote:
    'Pay-in-person sales carry no Vendibook commission and no buyer fee. Vendibook does not process or hold these funds, so inspect before you pay.',
  flowLink:
    audience === 'buyer'
      ? { label: 'See the exact steps in Transactions', href: '/dashboard?view=shopper&tab=transactions' }
      : { label: 'See the exact steps in the listing flow', href: '/list/start' },
});

const equinoxRail = (audience: RailsAudience): RailDef => ({
  key: 'equinox',
  logo: <EquinoxFundingLogo className="h-6" />,
  title: 'Equipment financing with Equinox Funding',
  summary:
    audience === 'buyer'
      ? 'On eligible for-sale listings you can apply for equipment financing and download a pro forma purchase sheet.'
      : 'Add the optional Equinox Funding add-on to your for-sale listing so buyers can apply for equipment financing.',
  detailTitle: 'How Equinox financing works',
  detailSteps: [
    'The seller turns on the Equinox add-on and accepts the financing disclosure.',
    'Buyers see “Apply Now with Equinox” and can download the purchase sheet PDF.',
    'Equinox Funding reviews the application and issues terms directly to the buyer.',
    'If funded, Equinox settles the purchase and Vendibook records the sale.',
  ],
  detailNote:
    'Financing is offered by Equinox Funding LLC, not Vendibook, and is subject to credit approval. A 12.9% platform fee applies to financed sales. PayPal does not process an Equinox-funded purchase.',
  link: { label: 'See financing details', href: '/financing' },
  flowLink:
    audience === 'buyer'
      ? { label: 'See the exact steps on eligible listings', href: '/search?mode=sale' }
      : { label: 'See the exact steps to enable financing', href: '/financing/enable' },
});

const plaidRail = (audience: RailsAudience): RailDef => ({
  key: 'plaid',
  logo: <PlaidLogo surface="dark" className="h-4" />,
  title: 'Identity verification',
  summary:
    audience === 'buyer'
      ? 'Sellers can add a Plaid-powered identity check, which shows as a verified badge on their listings.'
      : 'An optional paid add-on. Verify once with Plaid and carry a verified badge across your listings.',
  detailTitle: 'How identity verification works',
  detailSteps: [
    'Start the add-on from your dashboard and review the disclosure.',
    'Payment is authorized through PayPal and only captured if verification succeeds.',
    'Plaid runs the identity check with a government ID and a selfie match.',
    'On success, the verified badge appears on your profile and listings.',
  ],
  detailNote:
    '*Identity verification is an optional paid add-on. It is never required to publish a listing, receive bookings, or get paid.',
  link: { label: 'Identity verification details', href: '/identity-verification' },
  flowLink:
    audience === 'buyer'
      ? undefined
      : { label: 'See the exact steps to get verified', href: '/verify-identity' },
});

const audienceCopy: Record<RailsAudience, { eyebrow: string; heading: string; sub: string }> = {
  buyer: {
    eyebrow: 'Payments',
    heading: 'How you pay on Vendibook',
    sub: 'Every listing shows exactly which methods it accepts before you commit. Tap any option for the full flow.',
  },
  seller: {
    eyebrow: 'Getting paid',
    heading: 'How sellers get paid',
    sub: 'Choose the methods your listing accepts. Tap any option to see the step-by-step flow.',
  },
  host: {
    eyebrow: 'Getting paid',
    heading: 'How hosts get paid',
    sub: 'Rentals run through the same rails as sales. Tap any option to see the step-by-step flow.',
  },
};

export const PaymentRailsSection = ({ audience }: { audience: RailsAudience }) => {
  const [open, setOpen] = useState<RailDef | null>(null);

  const rails: RailDef[] = [
    paypalRail(audience),
    inPersonRail(audience),
    ...(audience === 'host' ? [] : [equinoxRail(audience)]),
    plaidRail(audience),
  ];

  const copy = audienceCopy[audience];

  return (
    <section className="py-14 md:py-20 border-y border-border bg-card/30">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="text-center mb-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
            {copy.eyebrow}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">{copy.heading}</h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {copy.sub}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rails.map((rail, i) => (
            <motion.button
              key={rail.key}
              type="button"
              onClick={() => setOpen(rail)}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="text-left rounded-2xl border border-border bg-background p-5 transition-all hover:border-foreground/30 hover:shadow-lg"
            >
              <div className="h-8 flex items-center mb-3">{rail.logo}</div>
              <h3 className="text-base font-semibold text-foreground mb-1.5">{rail.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{rail.summary}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70">
                <Info className="w-3.5 h-3.5" /> See the steps
              </span>
            </motion.button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Platform fee is 12.9%. Pay-in-person sales are free — no commission, no buyer fee.
        </p>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg border-border bg-background/95 backdrop-blur-xl">
          {open && (
            <>
              <DialogHeader>
                <div className="h-8 flex items-center mb-1">{open.logo}</div>
                <DialogTitle className="text-foreground">{open.detailTitle}</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {open.summary}
                </DialogDescription>
              </DialogHeader>
              <ol className="space-y-3 mt-1">
                {open.detailSteps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground/85">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-foreground/8 border border-border grid place-items-center font-mono text-[11px] text-foreground/70">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
                {open.detailNote}
              </p>
              <div className="mt-1 grid gap-2">
                {open.flowLink && (
                  <Button className="rounded-full w-full" asChild>
                    <Link to={open.flowLink.href} onClick={() => setOpen(null)}>
                      {open.flowLink.label} <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </Button>
                )}
                {open.link && (
                  <Button variant="outline" className="rounded-full w-full" asChild>
                    <Link to={open.link.href} onClick={() => setOpen(null)}>
                      {open.link.label} <ArrowRight className="ml-1.5 w-4 h-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

/** Small strip of provider marks — used under heroes for instant trust. */
export const ProviderTrustStrip = ({ showEquinox = true }: { showEquinox?: boolean }) => (
  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
    <span className="inline-flex items-center gap-2">
      <PayPalMonogram className="h-4" /> Checkout by PayPal
    </span>
    {showEquinox && (
      <span className="inline-flex items-center gap-2">
        <EquinoxFundingLogo className="h-5" /> Financing by Equinox Funding
      </span>
    )}
    <span className="inline-flex items-center gap-2">
      <PlaidLogo surface="dark" className="h-3.5" /> Identity checks by Plaid*
    </span>
  </div>
);

/** Cross-links so each page points onward instead of repeating content. */
export const KeepExploring = ({ current }: { current: 'overview' | 'seller' | 'host' }) => {
  const all = [
    {
      id: 'overview',
      icon: Receipt,
      title: 'All paths compared',
      body: 'Rent, buy, host, or sell — see the full walkthrough for each role.',
      href: '/how-it-works',
    },
    {
      id: 'seller',
      icon: Banknote,
      title: 'Selling on Vendibook',
      body: 'List free, take PayPal or in-person payment, and offer Equinox financing.',
      href: '/how-it-works-seller',
    },
    {
      id: 'host',
      icon: BadgeCheck,
      title: 'Hosting on Vendibook',
      body: 'Open your calendar, approve requests, and get paid after each rental.',
      href: '/how-it-works-host',
    },
  ].filter((c) => c.id !== current);

  const extras = [
    { id: 'payments', icon: Receipt, title: 'Payments overview', body: 'How PayPal checkout, fees, and payouts work.', href: '/payments' },
    { id: 'financing', icon: Banknote, title: 'Equipment financing', body: 'Apply with Equinox Funding on eligible sale listings.', href: '/financing' },
    { id: 'identity', icon: BadgeCheck, title: 'Identity verification', body: 'The optional Plaid-powered trust add-on.', href: '/identity-verification' },
  ];

  const cards = [...all, ...extras];

  return (
    <section className="py-14 md:py-18">
      <div className="container max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">Keep exploring</h2>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Short, focused pages — no repeats.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.id}
                to={c.href}
                className="group rounded-2xl border border-border bg-card/40 p-5 transition-all hover:border-foreground/30 hover:shadow-lg"
              >
                <Icon className="w-5 h-5 text-foreground/70 mb-3" />
                <h3 className="text-base font-semibold text-foreground mb-1">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{c.body}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                  Open <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PaymentRailsSection;
