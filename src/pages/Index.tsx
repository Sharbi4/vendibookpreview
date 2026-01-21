import { useEffect, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import AnnouncementBanner from '@/components/home/AnnouncementBanner';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import SEO, { generateOrganizationSchema, generateWebSiteSchema } from '@/components/SEO';
import JsonLd from '@/components/JsonLd';
import affirmLogo from '@/assets/affirm-logo-new.png';
import afterpayLogo from '@/assets/afterpay-logo-new.png';
// Lazy load below-the-fold components for faster initial load
const ListingsSections = lazy(() => import('@/components/home/ListingsSections'));
const SupplySection = lazy(() => import('@/components/home/SupplySection'));

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
      <SEO
        title="Vendibook: The Food Truck Marketplace"
        description="Buy food trucks, rent food trailers, and find ghost kitchen rentals. The #1 marketplace for mobile food vendors with vendor lots across the United States."
        canonical="/"
      />
      <JsonLd schema={[generateOrganizationSchema(), generateWebSiteSchema()]} />
      <Header />
      <AnnouncementBanner />
      
      <main className="flex-1">
        {/* 1. Hero - above the fold */}
        <Hero />
        
        <Suspense fallback={<SectionSkeleton />}>
          {/* 2. For Sale & For Rent Sections */}
          <ListingsSections />

          {/* BNPL Banner */}
          <section className="py-8 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-y border-border">
            <div className="container">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                <div className="text-center md:text-left">
                  <p className="text-lg md:text-xl font-semibold text-foreground">
                    Now accepting flexible payments
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Let buyers pay over time — you get paid upfront
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <img 
                    src={affirmLogo} 
                    alt="Affirm" 
                    className="h-6 md:h-8 object-contain dark:invert" 
                  />
                  <img 
                    src={afterpayLogo} 
                    alt="Afterpay" 
                    className="h-5 md:h-6 object-contain dark:invert" 
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link to="/payments">
                    Learn more
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
          
          {/* 3. Supply Section (Owners/Hosts + AI tools callout) */}
          <SupplySection />
          
          
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
