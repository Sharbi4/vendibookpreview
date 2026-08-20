import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroBackground from './HeroBackground';
import HeroSearchInput from './HeroSearchInput';
import { useHeroSearch } from './useHeroSearch';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * Premium marketplace hero.
 *
 * Calm dark surface with a warm gradient wash, compact vertical rhythm and a
 * single dominant interaction (search). Brand is carried by the header mark,
 * so no oversized wordmark here. Geometry matches the for-sale listing detail
 * system: rounded-2xl surfaces, hairline borders, restrained shadows.
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

      <div className="container relative z-10 mx-auto max-w-3xl px-5 pb-10 pt-10 sm:pb-14 sm:pt-14 md:pb-16 md:pt-20">
        <div className="text-center">
          <motion.p
            {...rise(0)}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/60 backdrop-blur-sm"
          >
            The mobile food marketplace
          </motion.p>

          <motion.h1
            id="home-hero-heading"
            {...rise(0.05)}
            className="text-balance text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl md:text-[3.4rem]"
          >
            Buy, rent, and sell food trucks in one marketplace.
          </motion.h1>

          <motion.p
            {...rise(0.12)}
            className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base"
          >
            Explore food trucks, trailers, and mobile food equipment — with structured listings,
            financing options for eligible buyers, and flexible ways to complete the deal.
          </motion.p>

          <motion.div {...rise(0.2)} className="mx-auto mt-7 max-w-xl">
            <HeroSearchInput
              {...search}
              placeholders={['Search food trucks, trailers, or a city', ...search.placeholders]}
            />
          </motion.div>

          <motion.div
            {...rise(0.28)}
            className="mx-auto mt-5 flex max-w-xl flex-col items-center gap-2.5 sm:flex-row sm:justify-center"
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
                  trackLeadEvent('homepage_hero_cta_click', { cta: 'browse', destination: '/search' })
                }
              >
                <SearchIcon className="mr-2 h-4 w-4" />
                Browse listings
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-2xl border-border/60 bg-transparent text-base font-semibold text-foreground hover:bg-foreground/5 hover:text-foreground sm:w-auto sm:px-7"
            >
              <Link
                to="/list/start?mode=sale"
                onClick={() =>
                  trackLeadEvent('homepage_hero_cta_click', {
                    cta: 'list_free',
                    destination: '/list/start?mode=sale',
                  })
                }
              >
                List your equipment free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.p {...rise(0.34)} className="mt-4 text-[13px] text-muted-foreground">
            New here?{' '}
            <Link
              to="/auth?mode=signup"
              className="text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Create a free account
            </Link>
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default HeroPremium;
