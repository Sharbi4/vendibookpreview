import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  BadgeDollarSign,
  Truck,
  MessageCircle,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import imgCoffee from '@/assets/food-truck-coffee.jpg';
import imgGrilledCheese from '@/assets/food-truck-grilled-cheese.jpg';
import imgPopcorn from '@/assets/food-truck-popcorn.jpg';
import { Button } from '@/components/ui/button';

/**
 * Homepage education funnel — warm, editorial, understandable in ~10 seconds.
 *
 * Three editorial moments (discover / beyond-local / confidence) in a varied
 * composition — NOT three equal workflow cards. A small discovery-style tools
 * strip sits underneath.
 *
 * Copy guardrails: PayPal online checkout or Pay in Person only, no escrow,
 * no payout-timing promises, verification stays "where completed", financing
 * is third-party, no fabricated metrics.
 */

const ease = [0.22, 1, 0.36, 1] as const;

/* Small mock listing cards — illustrative treatment, no real metrics. */
const MOCK_LISTINGS = [
  { img: imgCoffee, name: 'Coffee trailer', where: 'Austin, TX' },
  { img: imgGrilledCheese, name: 'Grilled cheese truck', where: 'Denver, CO' },
  { img: imgPopcorn, name: 'Popcorn trailer', where: 'Nashville, TN' },
];

const TOOL_LINKS: { icon: LucideIcon; label: string; to: string }[] = [
  { icon: BadgeDollarSign, label: 'Price your equipment', to: '/tools/pricepilot' },
  { icon: BadgeDollarSign, label: 'Explore financing', to: '/financing' },
  { icon: Truck, label: 'Shipping across the U.S.', to: '/vendibook-freight' },
  { icon: Tag, label: 'Selling? Start here', to: '/how-it-works-seller' },
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
        className="sale-light relative overflow-hidden rounded-[32px] py-10 shadow-[0_40px_120px_-60px_hsl(0_0%_0%/0.9)] sm:py-14"
        aria-labelledby="how-vendibook-works-heading"
      >
        <div className="container mx-auto max-w-6xl px-5 sm:px-6">
          {/* Header — benefit-led, one-sentence explainer */}
          <motion.div
            className="mb-8 max-w-2xl sm:mb-10"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Made for the mobile-food world
            </p>
            <h2
              id="how-vendibook-works-heading"
              className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Find the right truck — not just the closest listing.
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Food trucks, trailers, kitchens, and vendor spaces — plus the financing,
              shipping, and tools to actually make a move. Serious buyers and sellers,
              all in one place.
            </p>
          </motion.div>

          {/* Editorial composition: one large moment + two stacked moments */}
          <div className="grid gap-4 md:gap-5 lg:grid-cols-12">
            {/* 1 — Discover something better (large, with listing-stack visual) */}
            <motion.article
              className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-md lg:col-span-7"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, ease }}
            >
              <div className="p-6 sm:p-7">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Discover something better
                </p>
                <h3 className="mb-2.5 text-lg font-semibold leading-snug text-foreground sm:text-xl">
                  Browse serious inventory from your couch.
                </h3>
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  Real photos and video, full specs, price and location up front.
                  Message the seller, make an offer where it&rsquo;s supported, and
                  compare your shortlist — instead of refreshing classifieds and hoping.
                </p>
              </div>

              {/* Listing-stack collage */}
              <div className="mt-auto grid grid-cols-3 gap-3 px-6 pb-6 sm:gap-4 sm:px-7 sm:pb-7" aria-hidden="true">
                {MOCK_LISTINGS.map((l, i) => (
                  <motion.div
                    key={l.name}
                    className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.4, delay: reduced ? 0 : 0.12 + i * 0.09, ease }}
                  >
                    <img
                      src={l.img}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="p-2.5 sm:p-3">
                      <p className="truncate text-[11px] font-semibold text-foreground sm:text-xs">
                        {l.name}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground sm:text-[11px]">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {l.where}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="border-t border-border px-6 py-3.5 sm:px-7">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                  Questions and offers stay with the listing — no lost texts, no phone tag.
                </p>
              </div>
            </motion.article>

            {/* Right column — two stacked moments */}
            <div className="flex flex-col gap-4 md:gap-5 lg:col-span-5">
              {/* 2 — Go beyond your ZIP code */}
              <motion.article
                className="flex-1 rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-md sm:p-7"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: reduced ? 0 : 0.08, ease }}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Go beyond your ZIP code
                </p>
                <h3 className="mb-2.5 text-lg font-semibold leading-snug text-foreground">
                  The right truck might be three states away.
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Financing through third-party partners, seller delivery, pickup, and
                  Vendibook Freight where available — so distance stops deciding for you.
                </p>
                {/* Quiet route cue */}
                <div
                  className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                  aria-hidden="true"
                >
                  <span className="text-xs font-medium text-foreground">Austin</span>
                  <span className="relative h-px flex-1">
                    <span className="absolute inset-0 border-t border-dashed border-border" />
                    <motion.span
                      className="absolute -top-[3px] h-[7px] w-[7px] rounded-full bg-primary"
                      animate={reduced ? undefined : { left: ['0%', 'calc(100% - 7px)'] }}
                      transition={reduced ? undefined : { duration: 3.2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                    />
                  </span>
                  <span className="text-xs font-medium text-foreground">Denver</span>
                  <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </div>
              </motion.article>

              {/* 3 — Move with more confidence */}
              <motion.article
                className="flex-1 rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-md sm:p-7"
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: reduced ? 0 : 0.16, ease }}
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Move with more confidence
                </p>
                <h3 className="mb-2.5 text-lg font-semibold leading-snug text-foreground">
                  Less chaos than classifieds.
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Seller profiles and verification signals where completed. Messages and
                  offers in one place. PayPal checkout or Pay in Person, as the listing
                  allows — and a transaction record you can always come back to.
                </p>
              </motion.article>
            </div>
          </div>

          {/* CTA row */}
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-9"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 0.1, ease }}
          >
            <Button variant="cta" className="rounded-full" asChild>
              <Link to="/browse">
                Browse food trucks &amp; trailers
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Link
              to="/how-purchasing-works"
              className="group inline-flex items-center text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              See how purchasing works
              <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/list/start?mode=sale"
              className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              List for free
            </Link>
          </motion.div>

          {/* Small discovery-style tools strip */}
          <motion.nav
            aria-label="Tools and resources"
            className="mt-7 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border pt-5 text-sm"
            initial={reduced ? { opacity: 0 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 0.18 }}
          >
            {TOOL_LINKS.map((t, i) => (
              <span key={t.label} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden className="mr-2 text-border">·</span>}
                <Link
                  to={t.to}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
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
