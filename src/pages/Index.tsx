import { useMemo } from 'react';
import { excludeTestListings } from '@/lib/excludeTestListings';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Map, MessageSquare, ShieldCheck, Truck, Wallet, Gauge, Landmark } from 'lucide-react';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { isListingFeatured, sortFeaturedFirstFair, sortNewFirstThenFeatured } from '@/lib/featured';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import V2HomeHero from '@/components/home/v2/V2HomeHero';
import V2ListingRow from '@/components/home/v2/V2ListingRow';
import { usePageTracking } from '@/hooks/usePageTracking';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import vendibookWordmark from '@/assets/vendibook-wordmark.png';
import { PayPalWordmark, EquinoxFundingLogo } from '@/components/brand/ProviderLogos';
import paypalBannerAsset from '@/assets/paypal-banner.png.asset.json';

const ROW_LIMIT = 8;

const SELLER_STEPS = [
  { title: 'Create your account', body: 'Get started and build your seller profile.' },
  { title: 'Build your listing', body: 'Add photos, equipment details, price, and location.' },
  { title: 'Go live', body: 'Publish, respond to buyers, and connect PayPal when you want online checkout.' },
];

type ListingCategory = 'food_truck' | 'food_trailer' | 'ghost_kitchen' | 'vendor_lot' | 'vendor_space';

const fetchListings = async (mode: 'sale' | 'rent', categories?: readonly ListingCategory[]) => {
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
    .limit(ROW_LIMIT);

  if (error) throw error;
  return sortNewFirstThenFeatured(filterPubliclyVisible(data ?? []) as never) as never[];
};

const fetchFeaturedListings = async () => {
  const { data, error } = await excludeTestListings(supabase.from('listings').select('*')
    .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null)
    .eq('moderation_status', 'clear').eq('featured_enabled', true)
    .gt('featured_expires_at', new Date().toISOString()))
    .limit(12);
  if (error) throw error;
  // Fair daily rotation only — the featured row should not lead with the
  // newest boosts (those get the hero spotlight instead).
  return sortFeaturedFirstFair(filterPubliclyVisible(data ?? []) as never).filter(isListingFeatured) as never[];
};

const TRUST_POINTS = [
  {
    icon: Wallet,
    title: 'Pay online with PayPal',
    body: 'Eligible listings can offer secure checkout through PayPal.',
  },
  {
    icon: ShieldCheck,
    title: 'See the details that matter',
    body: 'Photos, equipment details, pricing, location, seller profiles, and available trust signals in one place.',
  },
  {
    icon: Truck,
    title: 'Keep the deal moving',
    body: 'Message, schedule a video walkthrough, arrange the handoff, and keep transaction details together.',
  },
];

const Index = () => {
  usePageTracking();
  const { user } = useAuth();
  const sellerStartHref = user ? '/list' : '/auth?mode=signup&role=host&redirect=%2Flist';

  const saleQuery = useQuery({
    queryKey: ['home-v2-sale'],
    queryFn: () => fetchListings('sale', ['food_truck', 'food_trailer']),
    staleTime: 60000,
  });

  const rentQuery = useQuery({
    queryKey: ['home-v2-rent'],
    queryFn: () => fetchListings('rent'),
    staleTime: 60000,
  });

  const featuredQuery = useQuery({ queryKey: ['home-v2-featured'], queryFn: fetchFeaturedListings, staleTime: 60000 });
  // Hero slideshow: featured listings first (offset so the first slide is not
  // the same card leading the row below), falling back to the latest inventory.
  const heroSlides = useMemo(() => {
    const featured = (featuredQuery.data ?? []) as never[];
    const fallback = [...((saleQuery.data ?? []) as never[]), ...((rentQuery.data ?? []) as never[])];
    const pool = featured.length ? featured : fallback;
    if (featured.length > 1) {
      const offset = Math.min(2, featured.length - 1);
      return [...featured.slice(offset), ...featured.slice(0, offset)];
    }
    return pool.slice(0, 8);
  }, [featuredQuery.data, saleQuery.data, rentQuery.data]);

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
        <div className="v2-home-stack">
          <V2HomeHero slides={heroSlides} />

          <Link to="/payments" className="v2-home-paypal">
            <span className="v2-home-paypal-mark"><img src={paypalBannerAsset.url} alt="PayPal" /></span>
            <span className="v2-home-paypal-copy">
              <strong>Pay with PayPal on Vendibook</strong>
              <small>Secure online checkout is available on eligible listings.</small>
            </span>
            <span className="v2-home-paypal-cta">How payments work<ArrowRight aria-hidden="true" /></span>
          </Link>


          <Link to="/financing" className="v2-home-financing">
            <span className="v2-home-financing-copy">
              <span className="v2-home-financing-eyebrow">For sellers</span>
              <strong>Help more buyers say yes.</strong>
              <small>Add financing options to eligible listings through third-party funding partners. Financing is subject to application, approval, and lender terms. Vendibook is not a lender.</small>
            </span>
            <span className="v2-home-financing-cta">See financing options<ArrowRight aria-hidden="true" /></span>
          </Link>

          <V2ListingRow title="Featured on Vendibook" subtitle="Listings getting extra visibility right now." listings={featuredQuery.data ?? []} isLoading={featuredQuery.isLoading} viewAllHref="/search" viewAllLabel="Browse marketplace" priority featured />

          <V2ListingRow
            title="Food trucks and trailers for sale"
            subtitle="Fresh inventory from owners and dealers nationwide."
            listings={saleQuery.data ?? []}
            isLoading={saleQuery.isLoading}
            viewAllHref="/search?mode=sale&category=food_truck%2Cfood_trailer"
            viewAllLabel="Browse all for sale"
            priority
          />

          <V2ListingRow
            title="Available to rent"
            subtitle="Food trucks, trailers, kitchens, and spaces ready for your next move."
            listings={rentQuery.data ?? []}
            isLoading={rentQuery.isLoading}
            viewAllHref="/search?mode=rent"
            viewAllLabel="Browse rentals"
          />

          <section className="v2-home-section">
            <header className="v2-home-section-head"><div><p className="v2-home-eyebrow">Why Vendibook</p><h2>Built for how mobile food deals actually happen.</h2></div></header>
            <div className="v2-home-trust">
              {TRUST_POINTS.map((point) => (
                <article key={point.title}>
                  <point.icon aria-hidden="true" />
                  <h3>{point.title}</h3>
                  <p>{point.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="v2-home-section" id="start-selling">
            <div className="v2-home-sell">
              <div>
                <p className="v2-home-eyebrow">Sell on Vendibook</p>
                <h2>Turn your truck or trailer into a live listing.</h2>
                <p>Create your listing, reach buyers nationwide, and add online checkout when you're ready.</p>
                <div className="v2-home-sell-actions">
                  <Link to={sellerStartHref} className="v2-home-btn">
                    {user ? 'Create a listing' : 'Start selling'}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                  <Link to="/pricing" className="v2-home-btn is-quiet">
                    See pricing
                  </Link>
                </div>
                {!user && (
                  <p className="v2-home-sell-note">
                    Already have an account? <Link to="/auth?redirect=%2Flist">Sign in</Link>
                  </p>
                )}
              </div>
              <ol className="v2-home-steps">
                {SELLER_STEPS.map((step, i) => (
                  <li key={step.title}>
                    <span className="v2-home-step-num">{i + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="v2-home-editorial">
            <div className="v2-home-editorial-intro"><p className="v2-home-eyebrow">Built for this market</p><h2>More than a classifieds page.</h2></div>
            <div className="v2-home-editorial-grid">
              <article><BadgeCheck /><h3>Compare what matters</h3><p>See photos, specs, pricing, location, and seller details before you reach out.</p></article>
              <article><Map /><h3>Shop beyond your city</h3><p>Explore equipment nationwide, with financing and delivery options where available.</p></article>
              <article><MessageSquare /><h3>Keep the deal organized</h3><p>Messages, walkthroughs, offers, agreements, and transaction records stay connected.</p></article>
            </div>
          </section>

          <section className="v2-home-tools">
            <header className="v2-home-section-head"><div><p className="v2-home-eyebrow">Tools for the next step</p><h2>Price it. Finance it. Move it.</h2></div></header>
            <div className="v2-home-tools-grid">
              <Link to="/tools/pricepilot"><Gauge /><span><strong>Price your equipment</strong><small>See a market-backed pricing range</small></span><ArrowRight /></Link>
              <Link to="/financing"><Landmark /><span><strong>Explore financing</strong><small>See financing options from third-party equipment partners</small></span><ArrowRight /></Link>
              <Link to="/vendibook-freight"><Truck /><span><strong>Plan delivery</strong><small>Arrange delivery support for eligible equipment</small></span><ArrowRight /></Link>
            </div>
          </section>

          <section className="v2-home-partners" aria-label="Transaction support">
            <div className="v2-home-partners-copy">
              <p className="v2-home-eyebrow">Transaction support</p>
              <h2>The infrastructure behind the deal.</h2>
              <p className="v2-home-partners-sub">Everything you need to move from interest to handoff in one connected flow.</p>
            </div>
            <div className="v2-home-partner-tiles">
              <article>
                <span className="v2-home-partner-mark"><PayPalWordmark surface="light" className="h-7 w-auto" /></span>
                <div className="v2-home-partner-copy"><h3>Secure checkout</h3><p>Smooth online payment through PayPal</p></div>
              </article>
              <article className="v2-home-partner-tile--dark">
                <span className="v2-home-partner-mark"><EquinoxFundingLogo className="h-7 w-auto" /></span>
                <div className="v2-home-partner-copy"><h3>Equipment financing</h3><p>Financing options for qualified buyers</p></div>
              </article>
              <article>
                <span className="v2-home-partner-mark"><img src={vendibookWordmark} alt="Vendibook" /></span>
                <div className="v2-home-partner-copy"><h3>Deal workflow &amp; records</h3><p>Messages, agreements, tracking, and order details in one place</p></div>
              </article>
            </div>
          </section>


          <section className="v2-home-final">
            <div><p className="v2-home-eyebrow">Ready when you are</p><h2>Find your next truck, trailer, kitchen, or space.</h2></div>
            <div><Link to="/search" className="v2-home-btn">Browse marketplace<ArrowRight /></Link><Link to="/list" className="v2-home-link">List an asset</Link></div>
          </section>
        </div>
      </main>

      <Footer />
      <NewsletterPopup />
    </div>
  );
};

export default Index;
