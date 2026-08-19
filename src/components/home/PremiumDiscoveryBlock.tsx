import { Link } from 'react-router-dom';
import { ArrowRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * Compact premium discovery block on the homepage.
 * Visually restrained, light premium card on the dark editorial page.
 * Sends users to /pricing as the single source of truth for upgrades.
 */
const PremiumDiscoveryBlock = () => {
  const handleClick = () => {
    trackLeadEvent('homepage_premium_discovery_click', {
      route: '/',
      source: 'home_premium_discovery',
      destination: '/pricing',
    });
  };

  return (
    <section className="py-10 sm:py-14 bg-background">
      <div className="container max-w-6xl mx-auto px-5 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="sale-light relative overflow-hidden rounded-3xl p-6 sm:p-10 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]"
        >
          {/* Warm ember wash */}
          <div
            className="absolute -top-1/2 -right-1/4 w-[420px] h-[420px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,81,36,0.10) 0%, rgba(255,186,8,0.05) 40%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />

          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-foreground/[0.08] bg-foreground/[0.03] mb-4">
                <Crown className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70">
                  Vendibook Pro & upgrades
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight leading-[1.15] mb-2">
                More visibility. Better tools. Lower fees.
              </h2>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
                Explore Vendibook Pro, Featured Boosts, Pro Listings, Concierge Listing, and PermitPath Plus.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:items-end gap-3">
              <Button
                asChild
                variant="cta"
                size="lg"
                className="rounded-2xl px-6 gap-2 whitespace-nowrap"
                onClick={handleClick}
              >
                <Link to="/pricing">
                  See pricing & premium tools
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground sm:text-right">
                Start free. Upgrade only when it makes sense for your business.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PremiumDiscoveryBlock;
