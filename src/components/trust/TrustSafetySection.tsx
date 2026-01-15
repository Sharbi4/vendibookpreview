import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { trustTiles, TrustTile } from './trustContent';
import TrustCard from './TrustCard';
import TrustModal from './TrustModal';

const TrustSafetySection = () => {
  const [selectedTile, setSelectedTile] = useState<TrustTile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const handleTileClick = (tile: TrustTile) => {
    setSelectedTile(tile);
    setModalOpen(true);
  };
  
  return (
    <section className="py-16 md:py-20 bg-background" aria-labelledby="trust-safety-heading">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h2 
              id="trust-safety-heading" 
              className="text-2xl md:text-3xl font-semibold text-foreground mb-2"
            >
              Trust & Safety
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Verified listings. Secure payments. Clear disputes. 24/7 support.
            </p>
          </div>
          <Link 
            to="/how-it-works" 
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 
                       transition-colors group whitespace-nowrap"
          >
            Learn how Vendibook protects every transaction
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        {/* Trust Tiles Grid */}
        {/* Desktop: 6 columns, Tablet: 3 columns, Mobile: horizontal scroll */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          {trustTiles.map((tile) => (
            <TrustCard 
              key={tile.id} 
              tile={tile} 
              onClick={() => handleTileClick(tile)} 
            />
          ))}
        </div>
        
        {/* Mobile: Horizontal scroll */}
        <div className="md:hidden -mx-4 px-4">
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {trustTiles.map((tile) => (
              <div key={tile.id} className="snap-start flex-shrink-0 w-[280px]">
                <TrustCard 
                  tile={tile} 
                  onClick={() => handleTileClick(tile)} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Modal */}
      <TrustModal 
        tile={selectedTile} 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
      />
    </section>
  );
};

export default TrustSafetySection;
