import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroBackground from './HeroBackground';
import HeroSearchInput from './HeroSearchInput';
import { useHeroSearch } from './useHeroSearch';
import HeroListingRotator from './HeroListingRotator';
import { trackLeadEvent } from '@/lib/leadTracking';
import { useAuth } from '@/contexts/AuthContext';
import GoogleContinueButton from '@/components/auth/GoogleContinueButton';

/**
 * Premium marketplace hero.
 *
 * Editorial dark surface with a single dominant interaction (search), one
 * primary action, one quiet secondary action, and a signed-out-only account
 * acquisition row using Google's official button. Geometry matches the
 * for-sale listing detail system: rounded-2xl, hairline borders, soft shadow.
 */
const HeroPremium = () => {
  const search = useHeroSearch();
  const reduced = useReducedMotion();
  const { user, isLoading } = useAuth();
  const signedOut = !isLoading && !user;

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

      <div className="container relative z-10 mx-auto max-w-3xl px-5 pb-10 pt-9 sm:pb-14 sm:pt-12 md:pb-16 md:pt-16">
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
            className="text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-tight text-foreground sm:text-[2.6rem] md:text-[3rem]"
          >
            Buy, rent, and sell food trucks and trailers
            <span className="block text-foreground/60">in one marketplace.</span>
          </motion.h1>

          <motion.p
            {...rise(0.12)}
            className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base"
          >
            Structured listings, financing options for eligible buyers, and flexible ways to
            complete the deal — online or in person.
          </motion.p>

          <motion.div {...rise(0.2)} className="mx-auto mt-7 max-w-xl">
            <HeroSearchInput
              {...search}
              placeholders={['Search food trucks, trailers, or a city', ...search.placeholders]}
            />
          </motion.div>

          <motion.div {...rise(0.24)} className="mt-7">
            <HeroListingRotator />
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

          {signedOut && (
            <motion.div
              {...rise(0.34)}
              className="mx-auto mt-8 max-w-sm rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"
            >
              <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.16em] text-foreground/45">
                Save searches &amp; message owners
              </p>
              <GoogleContinueButton className="w-full" returnPath="/" />
              <p className="mt-3 text-[13px] text-muted-foreground">
                Prefer email?{' '}
                <Link
                  to="/auth?mode=signup"
                  className="text-foreground/80 underline underline-offset-4 transition-colors hover:text-foreground"
                >
                  Create a free account
                </Link>
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroPremium;
