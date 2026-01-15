import { useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load below-the-fold components for faster initial load
const FeaturedListings = lazy(() => import('@/components/home/FeaturedListings'));
const CategoryCarousels = lazy(() => import('@/components/home/CategoryCarousels'));
const HowItWorks = lazy(() => import('@/components/home/HowItWorks'));
const NewsletterSection = lazy(() => import('@/components/newsletter/NewsletterSection'));
const NewsletterPopup = lazy(() => import('@/components/newsletter/NewsletterPopup'));
const TrustSafetySection = lazy(() => import('@/components/trust/TrustSafetySection'));
const AIToolsSection = lazy(() => import('@/components/home/AIToolsSection'));
const HelpCenterPreview = lazy(() => import('@/components/home/HelpCenterPreview'));

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
        <Hero />
        <Suspense fallback={<SectionSkeleton />}>
          <FeaturedListings />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <CategoryCarousels />
        </Suspense>
        <Suspense fallback={null}>
          <TrustSafetySection />
        </Suspense>
        <Suspense fallback={null}>
          <AIToolsSection />
        </Suspense>
        <Suspense fallback={null}>
          <HelpCenterPreview />
        </Suspense>
        <Suspense fallback={null}>
          <HowItWorks />
        </Suspense>
        <Suspense fallback={null}>
          <NewsletterSection />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <NewsletterPopup />
      </Suspense>
      <Footer />
    </div>
  );
};

export default Index;
