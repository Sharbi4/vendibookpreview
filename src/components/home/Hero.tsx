import { useState } from 'react';
import SearchBar from '@/components/search/SearchBar';
import CategoryPills from '@/components/search/CategoryPills';
import ModeToggle from '@/components/search/ModeToggle';
import { ListingCategory, ListingMode } from '@/types/listing';
import vendibookLogo from '@/assets/vendibook-logo.jpg';

interface HeroProps {
  onSearch?: (filters: { query: string; category: ListingCategory | null; mode: ListingMode | null }) => void;
}

const Hero = ({ onSearch }: HeroProps) => {
  const [selectedCategory, setSelectedCategory] = useState<ListingCategory | null>(null);
  const [selectedMode, setSelectedMode] = useState<ListingMode | null>(null);

  const handleSearch = (query: string) => {
    onSearch?.({ query, category: selectedCategory, mode: selectedMode });
  };

  return (
    <section className="relative bg-gradient-to-b from-vendibook-cream to-background pt-8 pb-16">
      <div className="container max-w-5xl mx-auto px-4">
        {/* Hero Content */}
        <div className="max-w-3xl mx-auto text-center mb-10 animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center animate-fade-in">
            <img 
              src={vendibookLogo} 
              alt="Vendibook" 
              className="h-32 md:h-40 w-auto mix-blend-multiply mb-4 transition-transform duration-300 hover:scale-105"
            />
          </div>
          
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Rent or buy food trucks, food trailers, ghost kitchens, vendor lots and other mobile business assets.
          </p>
        </div>

        {/* Search Bar - Centered */}
        <div className="max-w-3xl mx-auto mb-8 animate-slide-up">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Filters - Centered */}
        <div className="flex flex-col items-center gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Mode Toggle */}
          <ModeToggle mode={selectedMode} onModeChange={setSelectedMode} />
          
          {/* Category Pills */}
          <CategoryPills 
            selectedCategory={selectedCategory} 
            onSelectCategory={setSelectedCategory} 
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
