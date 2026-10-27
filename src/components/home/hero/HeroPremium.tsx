import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HeroListingRotator from './HeroListingRotator';
import GoogleSignInButton from '@/components/auth/GoogleSignInButton';
import { trackLeadEvent } from '@/lib/leadTracking';
import heroPhoto from '@/assets/home-hero-food-truck-night.jpg.asset.json';
import './hero-premium.css';

/**
 * Buyer-first marketplace hero: full-bleed food truck photo under a dark
 * gradient, a large headline, one supporting line and two stacked CTAs
 * (shop / sell or rent).
 *
 * Copy guardrails (do not regress): never describe Vendibook as holding,
 * escrowing or safekeeping buyer funds. The Guarantee is payment protection —
 * the seller payout is released only after the buyer confirms the handoff,
 * both parties sign the purchase agreement and the walkthrough video is saved
 * (public.commerce_check_release_ready / commerce_record_release).
 */
interface HeroPremiumProps {
  /** Show the compact Google sign-in under the CTAs. */
  showGoogleSignIn?: boolean;
  /** Show the rotating real-listing strip below the hero copy. */
  showRotator?: boolean;
  /** Where the "Vendibook Guarantee" link points (in-page anchor or route). */
  guaranteeHref?: string;
}

const SALE_SEARCH_HREF = '/search?mode=sale';
const SELL_HREF = '/list';

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

  const guaranteeLink = guaranteeHref.startsWith('#') ? (
    <a href={guaranteeHref} data-cta-location="home_hero_guarantee">Vendibook Guarantee</a>
  ) : (
    <Link to={guaranteeHref} data-cta-location="home_hero_guarantee">Vendibook Guarantee</Link>
  );

  return (
    <section className="hp-hero" aria-labelledby="home-hero-heading">
      <img
        className="hp-hero-photo"
        src={heroPhoto.url}
        alt=""
        width={1920}
        height={1280}
        // @ts-expect-error fetchpriority is valid HTML; React 18 only accepts the lowercase attribute
        fetchpriority="high"
        loading="eager"
      />
      <div className="hp-hero-shade" aria-hidden="true" />

      <div className="hp-hero-inner">
        <div className="hp-hero-copy">
          <motion.p {...rise(0)} className="hp-hero-kicker">Food trucks · Trailers · Commissary kitchens</motion.p>
          <motion.h1 id="home-hero-heading" {...rise(0.05)}>
            Buy, sell &amp; rent food trucks and trailers
          </motion.h1>
          <motion.p {...rise(0.12)} className="hp-hero-lede">
            Secure checkout and a protected handoff on every purchase with the {guaranteeLink}. Financing available
            through{' '}
            <Link
              to="/financing"
              data-cta-location="home_hero_financing"
              onClick={() => trackLeadEvent('hero_financing_clicked', { source: 'home_hero', destination: '/financing' })}
            >
              Equinox Funding
            </Link>
            .
          </motion.p>
        </div>

        <motion.div {...rise(0.18)} className="hp-hero-actions">
          <Button asChild variant="cta" size="cta" className="hp-hero-btn w-full">
            <Link
              to={SALE_SEARCH_HREF}
              data-cta-location="home_hero_primary"
              onClick={() => trackLeadEvent('homepage_browse_click', { source: 'home_hero', destination: SALE_SEARCH_HREF })}
            >
              Shop trucks &amp; trailers
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Link
            to={SELL_HREF}
            className="hp-hero-btn hp-hero-btn-light"
            data-cta-location="home_hero_sell"
            onClick={() => trackLeadEvent('homepage_host_list_click', { source: 'home_hero', destination: SELL_HREF })}
          >
            Sell or rent yours
          </Link>
          <p className="hp-hero-actions-note">
            Free to list.{' '}
            <Link to="/buy-on-vendibook" data-cta-location="home_hero_how_buying">
              How buying works<ArrowRight aria-hidden="true" />
            </Link>
          </p>
          {showGoogleSignIn && <GoogleSignInButton width={200} className="flex justify-center" />}
        </motion.div>
      </div>

      {showRotator && (
        <div className="hp-hero-rotator">
          <HeroListingRotator />
        </div>
      )}
    </section>
  );
};

export default HeroPremium;
