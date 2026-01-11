import { useState } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/home/Hero';
import FeaturedListings from '@/components/home/FeaturedListings';
import HowItWorks from '@/components/home/HowItWorks';
import { ListingCategory, ListingMode } from '@/types/listing';

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
      </main>

      <Footer />
    </div>
  );
};

export default Index;
