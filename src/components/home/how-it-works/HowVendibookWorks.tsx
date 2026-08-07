import { useState } from 'react';
import { motion } from 'framer-motion';
import { VideoTile } from './VideoTile';
import { ExplainerVideoModal } from './ExplainerVideoModal';
import { explainers, getExplainer, type ExplainerType } from './data/explainers';
import { trackLeadEvent } from '@/lib/leadTracking';
import { PayPalMonogram, PlaidLogo } from '@/components/brand/ProviderLogos';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';

/**
 * "See How Vendibook Works" — 4 clickable video tiles (Buying, Renting,
 * Selling, Hosting), each opening an in-browser animated explainer starring
 * Vendi, our marketplace guide character.
 */
export const HowVendibookWorks = () => {
  const [activeId, setActiveId] = useState<ExplainerType | null>(null);
  const verifiedSellerEnabled = usePublicFeatureFlag('verified_seller_enabled');

  const handleOpen = (id: ExplainerType) => {
    setActiveId(id);
    trackLeadEvent('homepage_video_opened', { video_type: id });
  };

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-background" aria-labelledby="how-vendibook-works-heading">
      <div className="container mx-auto max-w-6xl px-5 sm:px-6">
        <motion.div
          className="mb-8 text-center sm:mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
        >
          <h2 id="how-vendibook-works-heading" className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">
            See How Vendibook Works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Whether you're buying, renting, selling, or earning from your space, Vendibook makes the process simple.
          </p>
        </motion.div>

        {/* Mobile: horizontal snap carousel. Desktop: grid. */}
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {explainers.map((e) => (
            <div key={e.id} className="w-[82%] flex-shrink-0 sm:w-auto">
              <VideoTile explainer={e} onOpen={handleOpen} />
            </div>
          ))}
        </div>
        {/* Compact trust strip */}
        <a
          href="#trust-and-security"
          className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-2xl border border-border/60 bg-card/40 px-5 py-4 text-xs text-muted-foreground transition-colors hover:border-border sm:mt-8 sm:text-sm"
        >
          <span className="inline-flex items-center gap-2">
            <PayPalMonogram className="h-4" />
            Online checkout processed by PayPal.
          </span>
          {verifiedSellerEnabled && (
            <span className="inline-flex items-center gap-2">
              <PlaidLogo surface="dark" className="h-3.5" />
              Optional identity checks powered by Plaid.
            </span>
          )}
        </a>
      </div>

      <ExplainerVideoModal
        explainer={activeId ? getExplainer(activeId) : null}
        open={!!activeId}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      />
    </section>
  );
};

export default HowVendibookWorks;
