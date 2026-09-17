import { excludeTestListings } from '@/lib/excludeTestListings';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { sortNewFirstThenFeatured } from '@/lib/featured';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import V2HomeHero from '@/components/home/v2/V2HomeHero';
import V2ListingRow from '@/components/home/v2/V2ListingRow';
import HowVendibookWorks from '@/components/home/how-it-works/HowVendibookWorks';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Skeleton } from '@/components/ui/skeleton';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import { supabase } from '@/integrations/supabase/client';

const FinancingTopBanner = lazy(() => import('@/components/home/FinancingTopBanner'));
const ConciergeSection = lazy(() => import('@/components/home/ConciergeSection'));
const BecomeHostSection = lazy(() => import('@/components/home/BecomeHostSection'));
const FinalCTA = lazy(() => import('@/components/home/FinalCTA'));

const SectionSkeleton = () => (
  <div className="py-10">
    <Skeleton className="h-40 w-full rounded-2xl" />
  </div>
);

const ROW_LIMIT = 8;

const fetchListings = async (mode: 'sale' | 'rent', categories?: string[]) => {
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

const TRUST_POINTS = [
  {
    icon: Wallet,
    title: 'Secure PayPal checkout',
    body: 'Buyers pay through PayPal. Sellers are paid after delivery is confirmed.',
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
          <V2HomeHero />

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
                  Create a listing in minutes, connect your PayPal Business account, and start
                  accepting payments from verified buyers and renters.
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
        </div>

        <HowVendibookWorks />

        <Suspense fallback={<SectionSkeleton />}>
          <FinancingTopBanner />
          <ConciergeSection />
          <BecomeHostSection />
          <FinalCTA />
        </Suspense>
      </main>

      <Footer />
      <NewsletterPopup />
    </div>
  );
};

export default Index;
