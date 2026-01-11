import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedListings from '@/components/home/FeaturedListings';
import HowItWorks from '@/components/home/HowItWorks';
import NewsletterSection from '@/components/newsletter/NewsletterSection';
import NewsletterPopup from '@/components/newsletter/NewsletterPopup';
import { ListingCategory, ListingMode } from '@/types/listing';
import { useAuth } from '@/contexts/AuthContext';

interface SearchFilters {
  query: string;
  category: ListingCategory | null;
  mode: ListingMode | null;
}

const Index = () => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: null,
    mode: null,
  });
  const { user, isVerified, isLoading } = useAuth();
  const navigate = useNavigate();

  // Check if user needs to verify identity (first time login)
  useEffect(() => {
    if (!isLoading && user && !isVerified) {
      // Check if this is first login by checking if they have a verification session
      // If not, prompt them to verify
      const hasSeenVerificationPrompt = localStorage.getItem(`verification_prompted_${user.id}`);
      if (!hasSeenVerificationPrompt) {
        localStorage.setItem(`verification_prompted_${user.id}`, 'true');
        navigate('/verify-identity');
      }
    }
  }, [user, isVerified, isLoading, navigate]);

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <Hero onSearch={handleSearch} />
        <FeaturedListings filters={filters} />
        <HowItWorks />
        <NewsletterSection />
      </main>

      <NewsletterPopup />
      <Footer />
    </div>
  );
};

export default Index;
