import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroSearchInput from './HeroSearchInput';
import { useHeroSearch } from './useHeroSearch';
import HeroListingRotator from './HeroListingRotator';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { trackLeadEvent } from '@/lib/leadTracking';

/**
 * Premium marketplace hero — warm ivory editorial styling matching
 * /how-it-works: soft warm canvas, badge, highlighter headline, pill CTAs,
 * real-listing rotator, plus a compact Google sign-in for signed-out visitors.
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
    <section
      className="sale-light relative overflow-hidden bg-background"
      aria-labelledby="home-hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 480px at 85% -10%, rgba(255,106,26,0.10), transparent 65%), radial-gradient(700px 420px at 10% 0%, rgba(255,186,8,0.07), transparent 60%)',
        }}
        aria-hidden="true"
      />

      <div className="container relative z-10 mx-auto max-w-3xl px-5 pb-10 pt-10 sm:pb-14 sm:pt-14 md:pb-16">
        <div className="text-center">
          <motion.p
            {...rise(0)}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            The mobile food marketplace
          </motion.p>

          <motion.h1
            id="home-hero-heading"
            {...rise(0.05)}
            className="text-balance text-[2rem] font-bold leading-[1.12] tracking-tight text-foreground sm:text-[2.75rem] md:text-[3.1rem]"
          >
            <span className="text-highlighter">Buy, rent, and sell</span> food trucks and trailers.
          </motion.h1>

          <motion.p
            {...rise(0.12)}
            className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Real listings from real owners — with the transaction built in, online or in person.
          </motion.p>

          <motion.div {...rise(0.18)} className="mx-auto mt-6 max-w-xl">
            <HeroSearchInput
              {...search}
              placeholders={['Search food trucks, trailers, or a city', ...search.placeholders]}
            />
          </motion.div>

          <motion.div
            {...rise(0.22)}
            className="mx-auto mt-5 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
          >
            <Button
              asChild
              size="lg"
              variant="cta"
              className="h-12 w-full rounded-full text-base font-semibold sm:w-auto sm:px-7"
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
              variant="cta-outline"
              className="h-12 w-full rounded-full text-base font-medium sm:w-auto sm:px-6"
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

            <GoogleSignInButton width={200} className="flex justify-center" />
          </motion.div>

          <motion.div {...rise(0.26)} className="mt-8">
            <HeroListingRotator />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroPremium;
