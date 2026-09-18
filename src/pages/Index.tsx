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

import { EquinoxFundingLogo, PayPalWordmark } from '@/components/brand/ProviderLogos';
import vendibookWordmark from '@/assets/vendibook-wordmark.png';

const ROW_LIMIT = 8;

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
    title: 'Secure PayPal checkout',
    body: 'Secure payments through PayPal, with transaction records kept in Vendibook.',
  },
  {
    icon: ShieldCheck,
    title: 'Reviewed listings',
    body: 'Every listing is reviewed before it goes live, with optional seller identity checks.',
  },
  {
    icon: Truck,
    title: 'Delivery and freight',
    body: 'Arrange pickup, seller delivery, or nationwide freight right inside checkout.',
  },
];

const Index = () => {
  usePageTracking();

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
        description="Browse food trucks and food trailers nationwide with detailed listings, secure PayPal checkout, optional seller identity verification, and equipment financing options."
        canonical="/"
      />
      <JsonLd schema={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      <Header />

      <main className="flex-1">
        <div className="v2-home-stack">
          <V2HomeHero slides={heroSlides} />

          <V2ListingRow title="Featured on Vendibook" subtitle="Standout trucks and trailers getting extra visibility." listings={featuredQuery.data ?? []} isLoading={featuredQuery.isLoading} viewAllHref="/search" viewAllLabel="Browse marketplace" priority featured />

          <V2ListingRow
            title="Food trucks and trailers for sale"
            subtitle="Recently listed by owners and dealers."
            listings={saleQuery.data ?? []}
            isLoading={saleQuery.isLoading}
            viewAllHref="/search?mode=sale&category=food_truck%2Cfood_trailer"
            viewAllLabel="Browse all for sale"
            priority
          />

          <V2ListingRow
            title="Available to rent"
            subtitle="Trucks, trailers, and commercial kitchens you can book by the day."
            listings={rentQuery.data ?? []}
            isLoading={rentQuery.isLoading}
            viewAllHref="/search?mode=rent"
            viewAllLabel="Browse rentals"
          />

          <section className="v2-home-section">
            <header className="v2-home-section-head"><div><p className="v2-home-eyebrow">Why Vendibook</p><h2>Built for mobile food businesses.</h2></div></header>
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

          <section className="v2-home-section">
            <div className="v2-home-sell">
              <div>
                <p className="v2-home-eyebrow">Sell or rent out your asset</p>
                <h2>List your truck, trailer, or kitchen on Vendibook.</h2>
                <p>
                  Create a listing in minutes. When you're ready for online payments, connect
                  PayPal and make your listing transaction-ready.
                </p>
              </div>
              <div className="v2-home-sell-actions">
                <Link to="/list" className="v2-home-btn">
                  Create a listing
                  <ArrowRight aria-hidden="true" />
                </Link>
                <Link to="/pricing" className="v2-home-btn is-quiet">
                  See pricing
                </Link>
              </div>
            </div>
          </section>

          <section className="v2-home-editorial">
            <div className="v2-home-editorial-intro"><p className="v2-home-eyebrow">A marketplace that knows the category</p><h2>Find the right fit—not just the closest listing.</h2></div>
            <div className="v2-home-editorial-grid">
              <article><BadgeCheck /><h3>See serious inventory</h3><p>Real photos, useful specs, price, and location up front.</p></article>
              <article><Map /><h3>Go beyond your zip code</h3><p>Explore financing, delivery, and freight options where available.</p></article>
              <article><MessageSquare /><h3>Move with confidence</h3><p>Seller profiles, completed trust signals, messages, offers, and transaction records.</p></article>
            </div>
          </section>

          <section className="v2-home-tools">
            <header className="v2-home-section-head"><div><p className="v2-home-eyebrow">Tools to help you make the move</p><h2>From valuation to delivery.</h2></div></header>
            <div className="v2-home-tools-grid">
              <Link to="/tools/pricepilot"><Gauge /><span><strong>Price your equipment</strong><small>Use PricePilot for a market-backed pricing range.</small></span><ArrowRight /></Link>
              <Link to="/financing"><Landmark /><span><strong>Explore financing</strong><small>See third-party equipment financing options.</small></span><ArrowRight /></Link>
              <Link to="/vendibook-freight"><Truck /><span><strong>Plan shipping</strong><small>Request help moving eligible equipment.</small></span><ArrowRight /></Link>
            </div>
          </section>

          <section className="v2-home-partners" aria-label="Transaction support">
            <div className="v2-home-partners-copy">
              <p className="v2-home-eyebrow">Transaction support</p>
              <h2>Built to help you move from listing to deal.</h2>
            </div>
            <div className="v2-home-partner-tiles">
              <article>
                <span className="v2-home-partner-mark"><img src={paypalMonogramAsset.url} alt="PayPal" /></span>
                <small>Secure checkout</small>
              </article>
              <article className="v2-home-partner-tile--dark">
                <span className="v2-home-partner-mark"><img src={equinoxLogoAsset.url} alt="Equinox Funding" /></span>
                <small>Financing options</small>
              </article>
              <article>
                <span className="v2-home-partner-mark"><img src={vendibookWordmark} alt="Vendibook" /></span>
                <small>Marketplace records &amp; support</small>
              </article>
            </div>
          </section>


          <section className="v2-home-final">
            <div><p className="v2-home-eyebrow">Ready when you are</p><h2>Find your next mobile food business asset.</h2></div>
            <div><Link to="/search" className="v2-home-btn">Browse listings<ArrowRight /></Link><Link to="/list" className="v2-home-link">Create a listing</Link></div>
          </section>
        </div>
      </main>

      <Footer />
      <NewsletterPopup />
    </div>
  );
};

export default Index;
