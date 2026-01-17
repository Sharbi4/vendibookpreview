import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load below-the-fold components for faster initial load
const FeaturedListings = lazy(() => import('@/components/home/FeaturedListings'));
const HowItWorks = lazy(() => import('@/components/home/HowItWorks'));
const SupplySection = lazy(() => import('@/components/home/SupplySection'));
const ReviewsSection = lazy(() => import('@/components/home/ReviewsSection'));
const CategoryCarousels = lazy(() => import('@/components/home/CategoryCarousels'));
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
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user && !isVerified) {
      const hasSeenVerificationPrompt = localStorage.getItem(`verification_prompted_${user.id}`);
      if (!hasSeenVerificationPrompt) {
        localStorage.setItem(`verification_prompted_${user.id}`, 'true');
        navigate('/verify-identity');
      }
    }
  }, [user, isVerified, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* 1. Hero - above the fold */}
        <Hero />
        
        <Suspense fallback={<SectionSkeleton />}>
          {/* 2. Listings Grid (Demand) */}
          <FeaturedListings />
          
          {/* 3. How It Works (4 steps, lightweight) */}
          <HowItWorks />
          
          {/* 4. Supply Section (Owners/Hosts + AI tools callout) */}
          <SupplySection />
          
          {/* 5. Social Proof */}
          <ReviewsSection />
          
          {/* 6. SEO Lists - Browse by Category */}
          <CategoryCarousels />
          
          {/* 7. Final CTA */}
          <FinalCTA />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
