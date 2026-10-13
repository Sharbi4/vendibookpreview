import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Search as SearchIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroListingRotator from './HeroListingRotator';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { trackLeadEvent } from '@/lib/leadTracking';
import { supabase } from '@/integrations/supabase/client';
import { excludeTestListings } from '@/lib/excludeTestListings';

/**
 * Buyer-first marketplace hero — warm ivory editorial styling: live
 * inventory chip, buy-focused headline, Browse + Check financing CTAs and a
 * one-line Vendibook Guarantee trust strip.
 *
 * Copy guardrails (do not regress): never describe Vendibook as holding,
 * escrowing or safekeeping buyer funds. The Guarantee is payment protection —
 * the seller payout is released only after the buyer confirms the handoff,
 * both parties sign the purchase agreement and the walkthrough video is saved
 * (public.commerce_check_release_ready / commerce_record_release). Live counts
 * are real counts of discoverable for-sale listings; nothing is shown on error.
 */
interface HeroPremiumProps {
  /** Show the compact Google sign-in beside the CTAs. */
  showGoogleSignIn?: boolean;
  /** Show the rotating real-listing strip below the CTAs. */
  showRotator?: boolean;
  /** Where the "Vendibook Guarantee" trust strip links (in-page anchor). */
  guaranteeHref?: string;
}

const SALE_SEARCH_HREF = '/search?mode=sale';
const TRUST_STRIP = [
  'Payout released only after you confirm handoff',
  'Verified members',
  'Signed purchase agreement',
  'Walkthrough video before payout',
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const countSaleListings = async (since?: string): Promise<number> => {
  let query = supabase
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .eq('moderation_status', 'clear')
    .eq('mode', 'sale');
  if (since) query = query.gte('published_at', since);
  // excludeTestListings also drops admin-unlisted listings.
  const { count, error } = await excludeTestListings(query);
  if (error) throw error;
  return count ?? 0;
};

const formatCount = (n: number) => new Intl.NumberFormat('en-US').format(n);

function LiveInventoryChip() {
  const { data } = useQuery({
    queryKey: ['home-v2-sale-activity'],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const since = new Date(Date.now() - WEEK_MS).toISOString();
      const [forSale, newThisWeek] = await Promise.all([countSaleListings(), countSaleListings(since)]);
      return { forSale, newThisWeek };
    },
  });
  const live = !!data && data.forSale > 0;

  return (
    <p className="mb-5 inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground shadow-sm">
      <span
        className={`h-1.5 w-1.5 flex-none rounded-full ${live ? 'bg-emerald-600 ring-[3px] ring-emerald-600/20' : 'bg-primary'}`}
        aria-hidden="true"
      />
      {live ? (
        <span>
          <strong className="font-bold">{formatCount(data.forSale)}</strong>{' '}
          {data.forSale === 1 ? 'listing' : 'listings'} for sale now
          {data.newThisWeek > 0 ? (
            <>
              <span className="mx-1.5 text-muted-foreground" aria-hidden="true">·</span>
              <strong className="font-bold">{formatCount(data.newThisWeek)}</strong> new this week
            </>
          ) : null}
        </span>
      ) : (
        <span className="uppercase tracking-[0.16em] text-[11px]">The mobile food marketplace</span>
      )}
    </p>
  );
}

const HeroPremium = ({ showGoogleSignIn = true, showRotator = true, guaranteeHref = '/how-purchasing-works' }: HeroPremiumProps = {}) => {
  const reduced = useReducedMotion();

  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3, delay } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  const isAnchor = guaranteeHref.startsWith('#');
  const trustContent = (
    <>
      <span className="inline-flex basis-full items-center justify-center gap-1.5 font-bold uppercase tracking-[0.12em] text-[11px] text-foreground sm:basis-auto">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Vendibook Guarantee
      </span>
      {TRUST_STRIP.map((item) => (
        <span key={item} className="inline-flex items-center gap-1">
          <Check className="h-3.5 w-3.5 flex-none text-emerald-700" aria-hidden="true" />
          {item}
        </span>
      ))}
    </>
  );
  const trustClass =
    'mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[12.5px] font-medium leading-snug text-foreground/80 underline-offset-4 hover:underline';

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

      <div className="container relative z-10 mx-auto max-w-3xl px-4 pb-10 pt-9 sm:px-5 sm:pb-14 sm:pt-14 md:pb-16">
        <div className="text-center">
          <motion.div {...rise(0)}>
            <LiveInventoryChip />
          </motion.div>

          <motion.h1
            id="home-hero-heading"
            {...rise(0.05)}
            className="text-balance text-[2rem] font-bold leading-[1.16] tracking-tight text-foreground sm:text-[2.75rem] md:text-[3.1rem]"
          >
            Find your truck. Finance it. <span className="text-highlighter">Buy it protected.</span>
          </motion.h1>

          <motion.p
            {...rise(0.12)}
            className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-lg"
          >
            Food trucks and trailers from owners and dealers nationwide. Easy financing, and when you pay through
            Vendibook, the seller is paid only after you confirm the handoff.
          </motion.p>

          <motion.div
            {...rise(0.18)}
            className="mx-auto mt-6 flex max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
          >
            <Button
              asChild
              size="lg"
              variant="cta"
              className="h-12 w-full rounded-full text-base font-semibold sm:w-auto sm:px-7"
            >
              <Link
                to={SALE_SEARCH_HREF}
                onClick={() =>
                  trackLeadEvent('homepage_browse_click', { source: 'home_hero', destination: SALE_SEARCH_HREF })
                }
              >
                <SearchIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                Browse equipment for sale
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="cta-outline"
              className="h-12 w-full rounded-full bg-card text-base font-semibold sm:w-auto sm:px-7"
            >
              <Link
                to="/financing"
                onClick={() =>
                  trackLeadEvent('hero_financing_clicked', { source: 'home_hero', destination: '/financing' })
                }
              >
                Check financing
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>

            {showGoogleSignIn && <GoogleSignInButton width={200} className="flex justify-center" />}
          </motion.div>

          <motion.div {...rise(0.22)}>
            {isAnchor ? (
              <a href={guaranteeHref} className={trustClass}>{trustContent}</a>
            ) : (
              <Link to={guaranteeHref} className={trustClass}>{trustContent}</Link>
            )}
          </motion.div>

          {showRotator && (
            <motion.div {...rise(0.26)} className="mt-8">
              <HeroListingRotator />
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroPremium;
