import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileCheck,
  UserCheck,
  CalendarCheck,
  Wallet,
  MessageSquare,
  Truck,
  BadgeCheck,
  ArrowRight} from 'lucide-react';
import { Button } from '@/components/ui/button';
import trustKitchen from '@/assets/home/trust-kitchen.jpg';
import trustHandoff from '@/assets/home/trust-handoff.jpg';
import ownersFoodTruck from '@/assets/home/owners-food-truck.jpg';

const TRUST_PHOTOS = [
  { src: ownersFoodTruck, alt: 'Food truck owners at their truck', label: 'Food trucks' },
  { src: trustHandoff, alt: 'Food trailer hitched to a pickup truck', label: 'Food trailers' },
  { src: trustKitchen, alt: 'Commercial commissary kitchen in operation', label: 'Real businesses' }];

const PILLARS = [
  {
    icon: FileCheck,
    title: 'Document collection',
    body: 'COI, licenses, permits, and contracts collected before pickup.'},
  {
    icon: UserCheck,
    title: 'Owner profiles',
    body: 'Profiles, listing history, and reviews help you evaluate who you are dealing with.'},
  {
    icon: CalendarCheck,
    title: 'Booking requests',
    body: 'Calendar sync, instant book, and approval flow built in.'},
  {
    icon: Wallet,
    title: 'Deposits & payouts',
    body: 'Set security deposit terms. Seller and host payouts are reviewed and sent manually.'},
  {
    icon: MessageSquare,
    title: 'Messaging',
    body: 'In-platform messages keep details, files, and history in one place.'},
  {
    icon: Truck,
    title: 'Delivery coordination',
    body: 'Define radius, fees, pickup, and on-site fulfillment in one place.'},
  {
    icon: BadgeCheck,
    title: 'Reviews & trust',
    body: 'Verified post-transaction reviews build long-term reputation.'}];

const TrustInfrastructure = () => {
  return (
    <section id="trust-and-security" className="py-20 sm:py-28 relative overflow-hidden scroll-mt-24">
      {/* Very subtle ambient */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.02) 0%, transparent 70%)'}}
      />

      <div className="container max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
        {/* Section header */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] bg-foreground/[0.06] text-foreground/70 rounded-full mb-5 border border-foreground/[0.10]">
            MARKETPLACE TOOLS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground leading-[1.1] tracking-tight mb-4 max-w-2xl mx-auto">
            Keep every detail organized.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Documents, owner profiles, messaging, booking requests, delivery details, and reviews stay together—giving buyers, renters, owners, and sellers a clearer path forward.
          </p>
        </motion.div>

        {/* Real photos strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-10 sm:mb-14">
          {TRUST_PHOTOS.map((photo, i) => (
            <motion.div
              key={photo.label}
              className="group relative overflow-hidden rounded-2xl border border-border/50 aspect-[4/3] sm:aspect-[5/4]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                width={1024}
                height={768}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
              <span className="absolute bottom-4 left-4 right-4 text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-foreground/90">
                {photo.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                className="glass-premium group relative rounded-2xl p-5 sm:p-6 hover:-translate-y-0.5 transition-all duration-300"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.05 + (i % 3) * 0.06 }}
                whileHover={{ y: -2 }}
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] border border-foreground/[0.10] flex items-center justify-center mb-4 group-hover:bg-primary/[0.08] group-hover:border-primary/30 transition-colors duration-300">
                  <Icon className="w-4.5 h-4.5 text-foreground/70 group-hover:text-primary transition-colors duration-300" strokeWidth={1.75} />
                </div>

                {/* Title */}
                <h3 className="text-base font-semibold text-foreground mb-1.5 tracking-tight">
                  {pillar.title}
                </h3>

                {/* Body */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {pillar.body}
                </p>
              </motion.div>
            );
          })}

          {/* Featured Sign-up CTA — spans 2 cols on lg, sits beside Reviews & trust */}
          <motion.div
            className="glass-premium relative overflow-hidden rounded-3xl p-6 sm:p-8 sm:col-span-2 lg:col-span-2 group transition-all duration-300"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -2 }}
          >
            {/* Warm radial accent inside the card */}
            <div
              className="absolute -top-1/3 -right-1/4 w-[420px] h-[420px] rounded-full pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle, rgba(255,81,36,0.12) 0%, rgba(255,186,8,0.05) 40%, transparent 70%)',
                filter: 'blur(50px)'}}
            />
            {/* Subtle shimmer sweep on hover */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
            </div>

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] bg-primary/15 text-primary rounded-full mb-3 border border-primary/25">
                  
                  Free to join
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-[1.2] mb-2">
                  Move your next food business asset.{' '}
                  <span className="gradient-text-warm">Start in minutes.</span>
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  Create your account, list an asset, or book a rental in under five minutes. Free to list. The 12.9% platform fee applies only when a transaction is paid through Vendibook or funded through the financing flow; cash/pay-in-person sales are not charged this platform fee.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                <Button asChild variant="dark-shine" size="lg" className="rounded-full px-6 gap-2 whitespace-nowrap">
                  <Link to="/auth?mode=signup">
                    Sign Up Free
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
                <Button asChild variant="glass-cta" size="lg" className="rounded-full px-6 gap-2 whitespace-nowrap">
                  <Link to="/search">
                    Browse Listings
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TrustInfrastructure;
