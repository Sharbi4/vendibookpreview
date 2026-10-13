import { buildHomepageSpotlight } from '@/lib/listings/homepageSpotlight';
import { excludeTestListings } from '@/lib/excludeTestListings';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { isListingFeatured, sortFeaturedFirstFair, sortNewFirstThenFeatured } from '@/lib/featured';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import HeroPremium from '@/components/home/hero/HeroPremium';
import V2ListingRow from '@/components/home/v2/V2ListingRow';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';
import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { EQUINOX_FLAG_KEY } from '@/lib/financing/disclosure';
import { trackFinancingCtaClick } from '@/lib/analytics';
import { trackLeadEvent } from '@/lib/leadTracking';
import './home-buyer.css';

/*
 * Homepage copy guardrails (do not regress):
 *  - The Vendibook Guarantee is payment protection, never custody: no "held",
 *    "escrow" or "we hold your money"; Vendibook is never a bank, lender,
 *    insurer, broker or party to the sale. The seller payout is released only
 *    after the buyer confirms the handoff, both parties sign the purchase
 *    agreement and the walkthrough video is saved
 *    (public.commerce_check_release_ready / commerce_record_release).
 *  - No refunds, money-back, insurance, inspection or condition claims.
 *  - Financing timing is "typical", footnoted and never guaranteed; no rates
 *    or payment amounts on the homepage.
 */

const ROW_LIMIT = 8;
const SALE_ROW_LIMIT = 16;
const SALE_SEARCH_HREF = '/search?mode=sale';
const GUARANTEE_ID = 'vendibook-guarantee';

const FINANCING_HEADLINE = 'Easy financing — approval decisions typically in 24–48 hours*';
const FINANCING_FOOTNOTE =
  '*Typical decision time for complete applications; not guaranteed. Financing is offered by Equinox Funding and/or its funding providers and is subject to their approval and terms. Vendibook is not a lender.';

const GUARANTEE_STEPS = [
  { title: 'Request to buy', body: 'Send a request or make an offer. Once the seller approves, the equipment is reserved for you.' },
  { title: 'Pay your Vendibook invoice', body: 'Vendibook sends it by email and to your dashboard. Paying it does not pay the seller yet.' },
  { title: 'Confirm, sign, record', body: 'You confirm the handoff, you and the seller sign the purchase agreement, and the walkthrough video is saved.' },
  { title: 'Then the seller is paid', body: 'Vendibook releases the seller’s payout only after all three are complete.' },
];

const SHOP_CHIPS = [
  { label: 'Food trucks', href: '/food-trucks-for-sale' },
  { label: 'Food trailers', href: '/food-trailers-for-sale' },
  { label: 'Coffee trucks & trailers', href: '/coffee-trucks-trailers-for-sale' },
  { label: 'Ice cream trucks & trailers', href: '/ice-cream-trucks-trailers-for-sale' },
];

type ListingCategory = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot' | 'vendor_space';

const fetchListings = async (mode: 'sale' | 'rent', categories?: readonly ListingCategory[], limit = ROW_LIMIT) => {
  let query = supabase
    .from('listings')
    .select('*')
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .is('deleted_at', null)
    .eq('moderation_status', 'clear')
    .eq('mode', mode);

  if (categories?.length) query = query.in('category', categories);

  const { data, error } = await excludeTestListings(query)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return sortNewFirstThenFeatured(filterPubliclyVisible(data ?? []) as never) as never[];
};

const fetchFeaturedListings = async () => {
  const { data, error } = await excludeTestListings(supabase.from('listings').select('*')
    .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null)
    .eq('moderation_status', 'clear').eq('featured_enabled', true)
    .gt('featured_expires_at', new Date().toISOString()))
    .limit(24);
  if (error) throw error;
  // Fair daily rotation only — the featured row should not lead with the
  // newest boosts (those get the hero spotlight instead).
  return sortFeaturedFirstFair(filterPubliclyVisible(data ?? []) as never).filter(isListingFeatured) as never[];
};

const Index = () => {
  usePageTracking();
  const { user } = useAuth();
  const sellerStartHref = user ? '/list' : '/auth?mode=signup&role=host&redirect=%2Flist';
  const financingLive = usePublicFeatureFlag(EQUINOX_FLAG_KEY);
  const { startFinancingApply, financingLeadDialog } = useFinancingHandoff();

  const saleQuery = useQuery({
    queryKey: ['home-v2-sale'],
    queryFn: () => fetchListings('sale', ['food_truck', 'food_trailer'], SALE_ROW_LIMIT),
    staleTime: 60000,
  });

  const rentQuery = useQuery({
    queryKey: ['home-v2-rent'],
    queryFn: () => fetchListings('rent'),
    staleTime: 60000,
  });

  const featuredQuery = useQuery({ queryKey: ['home-v2-featured'], queryFn: fetchFeaturedListings, staleTime: 60000 });

  // Active featured boosts keep their homepage placement: they lead the
  // matching row (sale or rent), followed by the newest listings.
  const featured = (featuredQuery.data ?? []) as Array<{ mode?: string | null }>;
  const saleListings = buildHomepageSpotlight(
    featured.filter((l) => l.mode === 'sale') as never[], (saleQuery.data ?? []) as never[], SALE_ROW_LIMIT,
  );
  const rentListings = buildHomepageSpotlight(
    featured.filter((l) => l.mode === 'rent') as never[], (rentQuery.data ?? []) as never[], ROW_LIMIT + 4,
  );
  const saleHasFeatured = saleListings.some((listing) => isListingFeatured(listing));

  return (
    <div className="min-h-screen flex flex-col v2-home">
      <SEO
        title="Buy & Rent Food Trucks and Food Trailers | Vendibook"
        description="Buy, rent, and sell food trucks, food trailers, commercial kitchens, and vendor spaces nationwide on Vendibook, with PayPal checkout and financing options where available."
        canonical="/"
      />
      <JsonLd schema={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      <Header />

      <main className="flex-1">
        <HeroPremium showGoogleSignIn={false} showRotator={false} guaranteeHref={`#${GUARANTEE_ID}`} />

        <div className="v2-home-stack">
          <div className="hb-inventory">
            <V2ListingRow
              title="Just listed for sale"
              subtitle={saleHasFeatured
                ? 'Featured listings first, then the newest food trucks and trailers for sale.'
                : 'The newest food trucks and trailers for sale, newest first.'}
              listings={saleListings}
              isLoading={saleQuery.isLoading || featuredQuery.isLoading}
              viewAllHref="/search?mode=sale&category=food_truck%2Cfood_trailer"
              viewAllLabel="Browse all for sale"
              priority
            />
            <nav aria-label="Shop by type" className="hb-chips">
              {SHOP_CHIPS.map((chip) => (
                <Link key={chip.href} to={chip.href}>{chip.label}</Link>
              ))}
            </nav>
          </div>

          <section className="v2-home-financing" aria-labelledby="home-financing-title">
            <div className="v2-home-financing-copy">
              <span className="v2-home-financing-eyebrow">
                Equipment financing with <EquinoxFundingLogo className="v2-home-financing-logo" />
              </span>
              <h2 id="home-financing-title">{FINANCING_HEADLINE}</h2>
              <p>Apply online with Equinox Funding, Vendibook’s financing partner, and know your options before you make an offer.</p>
            </div>
            <div className="v2-home-financing-actions">
              {financingLive ? (
                <>
                  <button type="button" className="v2-home-btn" onClick={() => startFinancingApply('home_banner')}>
                    Check financing<ArrowRight aria-hidden="true" />
                  </button>
                  <Link to="/financing#calculator" className="v2-home-financing-cta">Estimate a monthly payment</Link>
                </>
              ) : (
                <Link to="/financing" className="v2-home-btn" onClick={() => trackFinancingCtaClick('home_banner')}>
                  Check financing<ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>
            <small className="v2-home-financing-note">{FINANCING_FOOTNOTE}</small>
            {financingLive ? financingLeadDialog : null}
          </section>

          <section id={GUARANTEE_ID} className="hb-guarantee" aria-labelledby="hb-guarantee-title">
            <div className="hb-guarantee-intro">
              <p className="v2-home-eyebrow hb-guarantee-eyebrow"><ShieldCheck aria-hidden="true" />The Vendibook Guarantee</p>
              <h2 id="hb-guarantee-title">Buy with payment protection built in.</h2>
              <p className="hb-guarantee-lede">
                When you buy through a Vendibook invoice, the seller is paid only after you confirm the handoff, both of
                you sign the purchase agreement and the walkthrough video is saved. Members verify their phone and
                identity before they can message, make an offer or buy, and messages are risk-scanned.
              </p>
              <Link to="/how-purchasing-works" className="v2-home-link hb-guarantee-more">
                How the Vendibook Guarantee works<ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <ol className="hb-steps">
              {GUARANTEE_STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="hb-step-num" aria-hidden="true">{i + 1}</span>
                  <div><h3>{step.title}</h3><p>{step.body}</p></div>
                </li>
              ))}
            </ol>
            <p className="hb-guarantee-fine">
              A platform payment-protection policy for purchases paid through a Vendibook invoice. Not insurance, an
              inspection or a warranty of condition; Vendibook does not inspect or verify equipment.{' '}
              <Link to="/legal/payments-terms">Payment terms</Link>
            </p>
          </section>

          <V2ListingRow
            title="Available to rent"
            subtitle="Food trucks, trailers, kitchens, and spaces ready for your next move."
            listings={rentListings}
            isLoading={rentQuery.isLoading}
            viewAllHref="/search?mode=rent"
            viewAllLabel="Browse rentals"
          />

          <section className="hb-seller" id="start-selling" aria-labelledby="hb-seller-title">
            <div>
              <h2 id="hb-seller-title">Selling a truck, trailer or kitchen?</h2>
              <p>Free to list. Vendibook’s fee is taken only when a sale or booking completes. <Link to="/pricing">See pricing</Link></p>
            </div>
            <Link
              to={sellerStartHref}
              className="v2-home-btn is-quiet"
              onClick={() => trackLeadEvent('homepage_host_list_click', { source: 'home_seller_strip', destination: sellerStartHref })}
            >
              List your equipment free<ArrowRight aria-hidden="true" />
            </Link>
          </section>

          <section className="v2-home-final hb-final">
            <div><p className="v2-home-eyebrow">Ready when you are</p><h2>Find your next truck or trailer.</h2></div>
            <div>
              <Link
                to={SALE_SEARCH_HREF}
                className="v2-home-btn"
                onClick={() => trackLeadEvent('homepage_final_cta_click', { source: 'home_final', destination: SALE_SEARCH_HREF })}
              >
                Browse equipment for sale<ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/financing" className="v2-home-btn is-quiet">Check financing</Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <NewsletterPopup />
    </div>
  );
};

export default Index;
