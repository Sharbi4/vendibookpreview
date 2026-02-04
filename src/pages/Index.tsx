import { useEffect, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroRentalSearch from '@/components/home/HeroRentalSearch';
import RentalBenefits from '@/components/home/RentalBenefits';
import AnnouncementBanner from '@/components/home/AnnouncementBanner';
import VerificationBanner from '@/components/home/VerificationBanner';
import PaymentsBanner from '@/components/home/PaymentsBanner';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Skeleton } from '@/components/ui/skeleton';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import { supabase } from '@/integrations/supabase/client';

// Lazy load below-the-fold components for faster initial load
const ListingsSections = lazy(() => import('@/components/home/ListingsSections'));
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
      queryKey: ['home-listings'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(12);
        
        if (error) throw error;
        return data;
      },
      staleTime: 30000, // 30 seconds
    });
  }, [queryClient]);

  // Show verification banner for logged-in, unverified users
  const showVerificationBanner = !isLoading && user && !isVerified;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Vendibook: The Food Truck Marketplace"
        description="Buy food trucks, rent food trailers, and find ghost kitchen rentals. The #1 marketplace for mobile food vendors with vendor lots across the United States."
        canonical="/"
      />
      <JsonLd schema={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      <Header />
      <AnnouncementBanner />
      
      {showVerificationBanner && <VerificationBanner userId={user.id} />}
      
      <main className="flex-1">
        {/* 1. Hero - Immersive Rental-First Search */}
        <HeroRentalSearch />
        
        {/* 2. Rental Benefits - Why Rent? */}
        <RentalBenefits />

        <Suspense fallback={<SectionSkeleton />}>
          {/* 3. Listings - Rentals First, Then Sales */}
          <ListingsSections />

          {/* 4. BNPL Banner */}
          <PaymentsBanner />
          
          {/* 5. Become a Host CTA (Dark themed) */}
          <BecomeHostSection />
          
          {/* 6. Final CTA */}
          <FinalCTA />
        </Suspense>
      </main>

      <Footer />
      
      <NewsletterPopup />
    </div>
  );
};

export default Index;
