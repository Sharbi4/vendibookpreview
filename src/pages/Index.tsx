import { PostPurchasePreview } from '@/components/home/PostPurchasePreview';
import { buildHomepageSpotlight } from '@/lib/listings/homepageSpotlight';
import { excludeTestListings } from '@/lib/excludeTestListings';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { isListingFeatured, sortFeaturedFirstFair, sortNewFirstThenFeatured } from '@/lib/featured';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import HeroPremium from '@/components/home/hero/HeroPremium';
import HomeAtlasBand from '@/components/home/HomeAtlasBand';
import V2ListingRow from '@/components/home/v2/V2ListingRow';
import {
  HomeCategoryTiles,
  HomeFeaturedCards,
  HomeGuaranteeVideo,
  HomePartnerStrip,
  HomeRegisterBand,
  HomeSellBand,
} from '@/components/home/HomeBuyerSections';
import { Button } from '@/components/ui/button';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePublicFeatureFlag } from '@/hooks/usePublicFeatureFlag';
import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import { EQUINOX_FLAG_KEY } from '@/lib/financing/disclosure';
import { FINANCING_FOOTNOTE, FINANCING_HEADLINE } from '@/lib/financing/copy';
import { trackFinancingCtaClick } from '@/lib/analytics';
import financingPhoto from '@/assets/hero-financing-bg.jpg';
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
const GUARANTEE_ID = 'vendibook-guarantee';

const GUARANTEE_STEPS = [
  { title: 'Request to buy', body: 'Send a request or make an offer. Once the seller approves, the equipment is reserved for you.' },
  { title: 'Pay securely', body: 'Pay your Vendibook invoice online. It arrives by email and in your dashboard.' },
  { title: 'Protected handoff', body: 'Meet the seller, confirm you have the equipment, sign the purchase agreement together and save the walkthrough video.' },
  { title: 'Deal closed, on record', body: 'With the handoff confirmed, signed and recorded, the sale is complete and the seller’s payout is released.' },
];

type ListingCategory = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot' | 'vendor_space';

const fetchListings = async (
  mode: 'sale' | 'rent',
  categories?: readonly ListingCategory[],
  limit = ROW_LIMIT,
  newestOnly = false,
) => {
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
  const visible = filterPubliclyVisible(data ?? []) as never;
  // "Just listed" is strictly newest first; featured boosts have their own row.
  return (newestOnly ? visible : sortNewFirstThenFeatured(visible)) as never[];
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
    queryFn: () => fetchListings('sale', undefined, SALE_ROW_LIMIT, true),
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
  const saleListings = (saleQuery.data ?? []) as never[];
  const rentListings = buildHomepageSpotlight(
    featured.filter((l) => l.mode === 'rent') as never[], (rentQuery.data ?? []) as never[], ROW_LIMIT + 4,
  );

  // Featured row: every active boost, reshuffled on each page view so each
  // featured listing takes turns in the first spots.
  const featuredRow = useMemo(() => {
    const rows = [...((featuredQuery.data ?? []) as never[])];
    for (let i = rows.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    return rows;
  }, [featuredQuery.data]);

  return (
    <div className="min-h-screen flex flex-col v2-home hb-home">
      <SEO
        title="Buy & Rent Food Trucks and Food Trailers | Vendibook"
        description="Buy, rent, and sell food trucks, food trailers, commercial kitchens, and vendor spaces nationwide on Vendibook, with PayPal checkout and financing options where available."
        canonical="/"
      />
      <JsonLd schema={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      <Header />

      <main className="flex-1">
        <HeroPremium showGoogleSignIn={false} showRotator={false} guaranteeHref={`#${GUARANTEE_ID}`} />
        <HomePartnerStrip guaranteeHref={`#${GUARANTEE_ID}`} financingLive={financingLive} />

        <HomeFeaturedCards />

        {!user && <HomeRegisterBand />}

        {(featuredQuery.isLoading || featuredRow.length > 0) && (
          <section className="hb-section hb-section-featured" aria-label="Featured listings">
            <div className="hb-wrap">
              <V2ListingRow
                title="Featured listings"
                subtitle="Food trucks, trailers and kitchens our sellers are featuring right now."
                listings={featuredRow}
                isLoading={featuredQuery.isLoading}
                viewAllHref="/search"
                viewAllLabel="Browse all listings"
              />
            </div>
          </section>
        )}

        <section className="hb-section hb-section-tint" aria-label="Just listed for sale">
          <div className="hb-wrap">
            <V2ListingRow
              title="Just listed for sale"
              subtitle="The newest food trucks, trailers and equipment for sale, newest first."
              listings={saleListings}
              isLoading={saleQuery.isLoading}
              rows={2}
              viewAllHref="/search?mode=sale"
              viewAllLabel="Browse all for sale"
              priority
            />
          </div>
        </section>

        <section className="hb-section hb-section-tint" aria-label="Available to rent">
          <div className="hb-wrap">
            <V2ListingRow
              title="Available to rent"
              subtitle="Trucks, trailers, kitchens and vendor spaces by the day, week or month."
              listings={rentListings}
              isLoading={rentQuery.isLoading}
              viewAllHref="/search?mode=rent"
              viewAllLabel="Browse rentals"
            />
          </div>
        </section>

        <HomeAtlasBand />

        <section id={GUARANTEE_ID} className="hb-guarantee" aria-labelledby="hb-guarantee-title">
          <div className="hb-wrap hb-guarantee-grid">
            <div className="hb-guarantee-main">
            <div className="hb-guarantee-intro">
              <p className="hb-eyebrow">The Vendibook Guarantee</p>
              <h2 id="hb-guarantee-title">A secure handoff on every purchase.</h2>
              <p className="hb-guarantee-lede">
                Pay through Vendibook checkout, then complete the handoff together: you confirm you have the equipment,
                you and the seller sign the purchase agreement, and the walkthrough video is saved to your records.
                Every member who messages, offers or buys is phone and ID verified, and messages are scanned for scams.
              </p>
              <Link to="/how-purchasing-works" className="hb-guarantee-link" data-cta-location="home_guarantee">
                How buying works<ArrowRight aria-hidden="true" />
              </Link>
            </div>
            <ol className="hb-steps" aria-label="How the Vendibook Guarantee works">
              {GUARANTEE_STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="hb-step-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <div><h3>{step.title}</h3><p>{step.body}</p></div>
                </li>
              ))}
            </ol>
            </div>
            <HomeGuaranteeVideo />
            <p className="hb-guarantee-fine">
              A platform payment-protection policy for purchases paid through a Vendibook invoice. Not insurance, an
              inspection or a warranty of condition; Vendibook does not inspect or verify equipment.{' '}
              <Link to="/legal/payments-terms">Payment terms</Link>
            </p>
          </div>
        </section>

        <HomeCategoryTiles />

        <section className="hb-section hb-section-tight" aria-labelledby="home-financing-title">
          <div className="hb-wrap">
            <div className="hb-finance">
              <div className="hb-finance-copy">
                <span className="hb-finance-partner">
                  Financing partner <EquinoxFundingLogo className="hb-finance-logo" />
                </span>
                <h2 id="home-financing-title">{FINANCING_HEADLINE}</h2>
                <p>Apply online with Equinox Funding and know your budget before you make an offer. Startups are considered.</p>
                <div className="hb-finance-actions">
                  {financingLive ? (
                    <>
                      <Button
                        type="button"
                        variant="cta"
                        className="h-12 w-full rounded-full px-7 text-base sm:w-auto"
                        data-cta-location="home_financing_band"
                        onClick={() => startFinancingApply('home_banner')}
                      >
                        Check financing<ArrowRight aria-hidden="true" />
                      </Button>
                      <Link to="/financing#calculator" className="hb-finance-link">Estimate a monthly payment</Link>
                    </>
                  ) : (
                    <Button asChild variant="cta" className="h-12 w-full rounded-full px-7 text-base sm:w-auto">
                      <Link to="/financing" data-cta-location="home_financing_band" onClick={() => trackFinancingCtaClick('home_banner')}>
                        Check financing<ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  )}
                </div>
                <small className="hb-finance-note">{FINANCING_FOOTNOTE}</small>
              </div>
              <img className="hb-finance-photo" src={financingPhoto} alt="" width={1920} height={1080} loading="lazy" decoding="async" />
              {financingLive ? financingLeadDialog : null}
            </div>
          </div>
        </section>

        <HomeSellBand sellerStartHref={sellerStartHref} />
        <PostPurchasePreview/>
      </main>
      <Footer />
      <NewsletterPopup />
    </div>
  );
};

export default Index;
