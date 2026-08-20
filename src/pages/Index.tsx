import { excludeTestListings } from '@/lib/excludeTestListings';
import { useEffect, lazy, Suspense } from 'react';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import Hero from '@/components/home/Hero';
import FinancingTopBanner from '@/components/home/FinancingTopBanner';


import AnnouncementBanner from '@/components/home/AnnouncementBanner';
import HeroBelowFold from '@/components/home/HeroBelowFold';
import ReferralPromoCard from '@/components/home/ReferralPromoCard';
import ConciergeSection from '@/components/home/ConciergeSection';
import SellerHomeBlock from '@/components/home/SellerHomeBlock';
import PremiumDiscoveryBlock from '@/components/home/PremiumDiscoveryBlock';
import HowVendibookWorks from '@/components/home/how-it-works/HowVendibookWorks';
import HomeTrustRail from '@/components/home/HomeTrustRail';

import { usePageTracking } from '@/hooks/usePageTracking';
import { Skeleton } from '@/components/ui/skeleton';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';


import { supabase } from '@/integrations/supabase/client';

// Lazy load below-the-fold components for faster initial load
const ListingsSections = lazy(() => import('@/components/home/ListingsSections'));
const HomepageFeaturedRow = lazy(() => import('@/components/home/HomepageFeaturedRow'));
const TrustInfrastructure = lazy(() => import('@/components/home/TrustInfrastructure'));
const BecomeHostSection = lazy(() => import('@/components/home/BecomeHostSection'));
const FinalCTA = lazy(() => import('@/components/home/FinalCTA'));

// Minimal loading fallback for lazy sections
const SectionSkeleton = () => (
  <div className="py-12 px-4">
    <Skeleton className="h-8 w-48 mx-auto mb-8" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  </div>
);

const Index = () => {
  const queryClient = useQueryClient();
  
  // Track page views with Google Analytics
  usePageTracking();

  // Prefetch listings data in parallel with lazy component loading
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['home-listings-v2'],
      queryFn: async () => {
        const { data, error } = await excludeTestListings(
          supabase
            .from('listings')
            .select('*')
            .eq('status', 'published').not('published_at', 'is', null).is('deleted_at', null).eq('moderation_status', 'clear')
        )
          .order('published_at', { ascending: false })
          .limit(12);

        if (error) throw error;
        return filterPubliclyVisible(data ?? []);
      },
      staleTime: 60000, // 60 seconds
    });
  }, [queryClient]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Buy & Rent Food Trucks and Food Trailers | Vendibook"
        description="Browse food trucks and food trailers nationwide with detailed listings, secure PayPal checkout, optional seller identity verification, and equipment financing options."
        canonical="/"
      />
      <JsonLd schema={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      <Header />

      <main className="flex-1">
        {/* 1. Cohesive marketplace hero: search + real-listing rotator + CTAs */}
        <Hero />

        {/* 2. Slim financing partnership strip — Vendibook × Equinox Funding */}
        <FinancingTopBanner />

        {/* 3. Compact payments & verification strip */}
        <HomeTrustRail />

        <AnnouncementBanner />

        <Suspense fallback={<SectionSkeleton />}>
          {/* 4. Featured / Pro inventory */}
          <HomepageFeaturedRow />

          {/* 5. Recently Added Trucks & Trailers */}
          <ListingsSections />
        </Suspense>

        {/* 6. Light How It Works editorial band */}
        <HowVendibookWorks />

        <Suspense fallback={<SectionSkeleton />}>
          {/* 7. Seller education + Pricing & Pro */}
          <HeroBelowFold />
          <SellerHomeBlock />
          <PremiumDiscoveryBlock />

          {/* 8. Concierge — primary soft conversion */}
          <ConciergeSection />

          {/* 9. Trust Infrastructure */}
          <TrustInfrastructure />

          {/* 10. Become a Host / Seller */}
          <BecomeHostSection />

          {/* 11. Referral program — lower down */}
          <ReferralPromoCard />

          {/* 12. Final CTA */}
          <FinalCTA />
        </Suspense>
      </main>


      <Footer />
      <NewsletterPopup />
      
      
      
    </div>
  );
};

export default Index;
