import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroBackground from './HeroBackground';
import HeroSearchInput from './HeroSearchInput';
import { useHeroSearch } from './useHeroSearch';
import HeroListingRotator from './HeroListingRotator';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * Premium marketplace hero — one cohesive unit: eyebrow, short headline,
 * one supporting line, search, real-listing rotator, then two actions.
 * No auth module here; Google One Tap handles signed-out acquisition quietly.
 */
const HeroPremium = () => {
  const search = useHeroSearch();
  const reduced = useReducedMotion();

  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <section className="relative overflow-hidden bg-background" aria-labelledby="home-hero-heading">
      <HeroBackground />

      <div className="container relative z-10 mx-auto max-w-3xl px-5 pb-8 pt-8 sm:pb-12 sm:pt-12 md:pb-14">
        <div className="text-center">
          <motion.p
            {...rise(0)}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60 backdrop-blur-sm"
          >
            The mobile food marketplace
          </motion.p>

          <motion.h1
            id="home-hero-heading"
            {...rise(0.05)}
            className="text-balance text-[1.75rem] font-semibold leading-[1.14] tracking-tight text-foreground sm:text-[2.4rem] md:text-[2.75rem]"
          >
            Buy, rent, and sell food trucks and trailers.
          </motion.h1>

          <motion.p
            {...rise(0.12)}
            className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]"
          >
            Real listings, real owners — online or in person.
          </motion.p>

          <motion.div {...rise(0.18)} className="mx-auto mt-5 max-w-xl">
            <HeroSearchInput
              {...search}
              placeholders={['Search food trucks, trailers, or a city', ...search.placeholders]}
            />
          </motion.div>

          <motion.div
            {...rise(0.22)}
            className="mx-auto mt-4 flex max-w-xl flex-col items-center gap-2.5 sm:flex-row sm:justify-center"
          >
            <Button
              asChild
              size="lg"
              variant="cta"
              className="h-12 w-full rounded-2xl text-base font-semibold sm:w-auto sm:px-7"
            >
              <Link
                to="/search"
                onClick={() =>
                  trackLeadEvent('homepage_browse_click', { source: 'home_hero', destination: '/search' })
                }
              >
                <SearchIcon className="mr-2 h-4 w-4" />
                Browse listings
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 w-full rounded-2xl text-base font-medium text-foreground/80 hover:bg-foreground/5 hover:text-foreground sm:w-auto sm:px-6"
            >
              <Link
                to="/list/start?mode=sale"
                onClick={() =>
                  trackLeadEvent('homepage_host_list_click', {
                    source: 'home_hero',
                    destination: '/list/start?mode=sale',
                  })
                }
              >
                List your equipment free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div {...rise(0.26)} className="mt-6">
            <HeroListingRotator />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroPremium;

