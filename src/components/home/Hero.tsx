import { useState } from 'react';
import SearchBar from '@/components/search/SearchBar';
import CategoryPills from '@/components/search/CategoryPills';
import ModeToggle from '@/components/search/ModeToggle';
import { ListingCategory, ListingMode } from '@/types/listing';

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
      <div className="container">
        {/* Hero Content */}
        <div className="max-w-3xl mx-auto text-center mb-10 animate-fade-in">
          {/* Logo Mark */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground text-3xl font-bold">V</span>
            </div>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            vendi<span className="text-primary">book</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Rent or buy food trucks, food trailers, ghost kitchens, vendor lots and other mobile business assets.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 animate-slide-up">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Filters */}
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
