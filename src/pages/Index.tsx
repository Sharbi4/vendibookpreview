import { excludeTestListings } from '@/lib/excludeTestListings';
import { useEffect, lazy, Suspense } from 'react';
import { filterPubliclyVisible } from '@/lib/listings/publicVisibility';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import Hero from '@/components/home/Hero';


import AnnouncementBanner from '@/components/home/AnnouncementBanner';
import HeroBelowFold from '@/components/home/HeroBelowFold';
import ReferralPromoCard from '@/components/home/ReferralPromoCard';
import VerificationBanner from '@/components/home/VerificationBanner';
import ConciergeSection from '@/components/home/ConciergeSection';
import SellerHomeBlock from '@/components/home/SellerHomeBlock';
import HowVendibookWorks from '@/components/home/how-it-works/HowVendibookWorks';

import { useAuth } from '@/contexts/AuthContext';
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
  const { user, isVerified, isLoading } = useAuth();
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

  // Show verification banner for logged-in, unverified users
  const showVerificationBanner = !isLoading && user && !isVerified;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Buy & Rent Food Trucks and Food Trailers | Vendibook"
        description="The #1 US marketplace for food trucks and food trailers. Verified listings, secure payments, 24/7 support. Rent or buy your next mobile kitchen."
        canonical="/"
      />
      <JsonLd schema={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      <Header />

      {showVerificationBanner && <VerificationBanner userId={user.id} />}
      
      <main className="flex-1">
        {/* 1. Hero */}
        <Hero />

        {/* Mobile-only secondary actions + trust strip (moved out of hero) */}
        <HeroBelowFold />

        {/* Referral promo — below hero, not in rotation */}
        <ReferralPromoCard />

        {/* Announcement moved below the hero */}
        <AnnouncementBanner />

        {/* See How Vendibook Works — 4 in-browser animated explainers */}
        <HowVendibookWorks />

        <Suspense fallback={<SectionSkeleton />}>
          {/* 2. Featured Listings — premium row (hidden if none active) */}
          <HomepageFeaturedRow />

          {/* 3. Recently Added Trucks & Trailers */}
          <ListingsSections />

          {/* Seller funnel block — crawlable internal links into /sell-food-truck */}
          <SellerHomeBlock />

          {/* 4. Concierge — primary soft conversion */}
          <ConciergeSection />

          {/* 5. Trust Infrastructure */}
          <TrustInfrastructure />

          {/* 6. Become a Host / Seller */}
          <BecomeHostSection />

          {/* 7. Final CTA */}
          <FinalCTA />
        </Suspense>
      </main>

      <Footer />
      <NewsletterPopup />
      
      
      
    </div>
  );
};

export default Index;
