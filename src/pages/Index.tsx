import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedListings from '@/components/home/FeaturedListings';
import CategoryCarousels from '@/components/home/CategoryCarousels';
import HowItWorks from '@/components/home/HowItWorks';
import NewsletterSection from '@/components/newsletter/NewsletterSection';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import { TrustSafetySection } from '@/components/trust';
import AIToolsSection from '@/components/home/AIToolsSection';
import HelpCenterPreview from '@/components/home/HelpCenterPreview';
import { useAuth } from '@/contexts/AuthContext';

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
        <FeaturedListings />
        <CategoryCarousels />
        <TrustSafetySection />
        <AIToolsSection />
        <HelpCenterPreview />
        <HowItWorks />
        <NewsletterSection />
      </main>

      <NewsletterPopup />
      <Footer />
    </div>
  );
};

export default Index;
