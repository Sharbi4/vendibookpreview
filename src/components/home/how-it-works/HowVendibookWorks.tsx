import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VideoTile } from './VideoTile';
import { ExplainerVideoModal } from './ExplainerVideoModal';
import { explainers, getExplainer, type ExplainerType } from './data/explainers';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * "How Vendibook works" — warm ivory editorial band that breaks up the dark
 * homepage. Four role tiles (Buy / Rent / Sell / Host), each linking to the
 * matching role on /how-it-works so the copy has one source of truth.
 */
export const HowVendibookWorks = () => {
  const [activeId, setActiveId] = useState<ExplainerType | null>(null);
  const reduced = useReducedMotion();

  const handleOpen = (id: ExplainerType) => {
    setActiveId(id);
    trackLeadEvent('homepage_video_opened', { video_type: id });
  };

  return (
    <div className="relative px-3 pb-6 pt-6 sm:px-4 sm:pb-8 sm:pt-8">
      {/* soft dark-to-light easing so the ivory band feels layered, not pasted */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-transparent via-white/[0.02] to-white/[0.05]"
      />
      <section
        className="sale-light relative overflow-hidden rounded-[32px] py-8 shadow-[0_40px_120px_-60px_hsl(0_0%_0%/0.9)] sm:py-10 md:py-12"
        aria-labelledby="how-vendibook-works-heading"
      >
      <div className="container mx-auto max-w-6xl px-5 sm:px-6">
        <motion.div
          className="mb-6 max-w-2xl sm:mb-8"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            How it works
          </p>
          <h2
            id="how-vendibook-works-heading"
            className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Everything you need to move a mobile food business forward.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Buy, rent, sell, or host — same tools behind every path.
          </p>
        </motion.div>


        {/* Mobile: horizontal snap carousel. Desktop: grid. */}
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {explainers.map((e, i) => (
            <motion.div
              key={e.id}
              className="w-[78%] flex-shrink-0 sm:w-auto"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: reduced ? 0 : i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <VideoTile explainer={e} onOpen={handleOpen} />
            </motion.div>
          ))}
        </div>
      </div>

      <ExplainerVideoModal
        explainer={activeId ? getExplainer(activeId) : null}
        open={!!activeId}
        onOpenChange={(open) => {
          if (!open) setActiveId(null);
        }}
      />
      </section>
    </div>
  );
};

export default HowVendibookWorks;
