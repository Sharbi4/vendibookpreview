import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ShoppingBag,
  Tag,
  CalendarClock,
  ArrowRight,
  BadgeDollarSign,
  Truck,
  LifeBuoy,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

/**
 * Homepage education funnel — compact, premium, scannable.
 * Three pathway cards (buy / sell / rent-or-host) plus one quiet resource row.
 * Sits immediately after HeroBelowFold, before referral/announcement.
 *
 * Copy guardrails: PayPal online checkout or Pay in Person only, no escrow or
 * payout-timing promises, identity verification stays optional, financing is
 * third-party. Mirrors /how-purchasing-works and /how-it-works.
 */

interface Pathway {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  steps: string[];
  primary: { label: string; to: string };
  secondary?: { label: string; to: string };
}

const PATHWAYS: Pathway[] = [
  {
    icon: ShoppingBag,
    eyebrow: 'Buy equipment',
    title: 'Purchase a truck or trailer with structure',
    steps: [
      'Discover equipment with photos, specs, and location up front',
      'Message the seller, or make an offer where supported',
      'Pay through PayPal online checkout or in person, as the listing allows',
      'Coordinate pickup, delivery, or freight — then confirm the handoff',
    ],
    primary: { label: 'How purchasing works', to: '/how-purchasing-works' },
    secondary: { label: 'Browse equipment', to: '/browse' },
  },
  {
    icon: Tag,
    eyebrow: 'Sell equipment',
    title: 'List for free and sell on your terms',
    steps: [
      'Publish a standard listing free — photos, specs, and your price',
      'Hear from buyers and review questions or offers where supported',
      'Choose PayPal online checkout, Pay in Person, or both',
      'Complete the handoff and Vendibook records and reviews your payout',
    ],
    primary: { label: 'List equipment for sale', to: '/list/start?mode=sale' },
    secondary: { label: 'Read the seller guide', to: '/how-it-works-seller' },
  },
  {
    icon: CalendarClock,
    eyebrow: 'Rent or list for rent',
    title: 'Book — or earn from — equipment, kitchens, and space',
    steps: [
      'Browse trucks, kitchens, and vendor spaces with live availability — or list your own',
      'Request to book, or use Instant Book where the host offers it',
      'Pay online through PayPal checkout or in person, as the listing allows',
      'Coordinate access, complete the booking, and the transaction closes out',
    ],
    primary: { label: 'Browse rentals', to: '/search?mode=rent' },
    secondary: { label: 'List for rent', to: '/list/start?mode=rent' },
  },
];

const RESOURCES: { icon: LucideIcon; label: string; to: string }[] = [
  { icon: BadgeDollarSign, label: 'Financing', to: '/financing' },
  { icon: Truck, label: 'Vendibook Freight', to: '/help/shipping-freight' },
  { icon: LifeBuoy, label: 'Buyer support', to: '/help/dispute-evidence' },
  { icon: HelpCircle, label: 'Help Center', to: '/help' },
];

export const HowVendibookWorks = () => {
  const reduced = useReducedMotion();

  return (
    <div className="relative px-3 pb-6 pt-6 sm:px-4 sm:pb-8 sm:pt-8">
      {/* soft dark-to-light easing so the ivory band feels layered, not pasted */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-transparent via-white/[0.02] to-white/[0.05]"
      />
      <section
        className="sale-light relative overflow-hidden rounded-[32px] py-10 shadow-[0_40px_120px_-60px_hsl(0_0%_0%/0.9)] sm:py-12"
        aria-labelledby="how-vendibook-works-heading"
      >
        <div className="container mx-auto max-w-6xl px-5 sm:px-6">
          <motion.div
            className="mb-8 max-w-2xl sm:mb-10"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Built for the mobile-food economy
            </p>
            <h2
              id="how-vendibook-works-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              How Vendibook works
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Find, list, finance, and move food trucks, trailers, kitchens, and vendor space
              through one structured marketplace.
            </p>
          </motion.div>

          {/* Three pathway cards */}
          <div className="grid gap-4 md:grid-cols-3 md:gap-5">
            {PATHWAYS.map((path, i) => {
              const Icon = path.icon;
              return (
                <motion.article
                  key={path.eyebrow}
                  className="flex flex-col rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-md"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{
                    duration: 0.4,
                    delay: reduced ? 0 : i * 0.07,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
                      <Icon className="h-[18px] w-[18px] text-foreground/70" />
                    </span>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                      {path.eyebrow}
                    </p>
                  </div>
                  <h3 className="mb-3 text-lg font-semibold leading-snug text-foreground">
                    {path.title}
                  </h3>
                  <ol className="mb-5 flex-1 space-y-2">
                    {path.steps.map((step, si) => (
                      <li key={si} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                        <span
                          aria-hidden
                          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70"
                        />
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-col gap-1.5">
                    <Link
                      to={path.primary.to}
                      className="group inline-flex items-center text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                    >
                      {path.primary.label}
                      <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    {path.secondary && (
                      <Link
                        to={path.secondary.to}
                        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                      >
                        {path.secondary.label}
                      </Link>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>

          {/* Quiet inline resource row */}
          <motion.nav
            aria-label="Related resources"
            className="mt-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 border-t border-border pt-6 text-sm"
            initial={reduced ? { opacity: 0 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 0.15 }}
          >
            {RESOURCES.map((r, i) => (
              <span key={r.label} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden className="mr-2 text-border">·</span>}
                <Link
                  to={r.to}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <r.icon className="h-3.5 w-3.5" />
                  {r.label}
                </Link>
              </span>
            ))}
          </motion.nav>
        </div>
      </section>
    </div>
  );
};

export default HowVendibookWorks;
