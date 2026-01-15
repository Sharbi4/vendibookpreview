import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { trustTiles, TrustTile } from './trustContent';
import TrustCard from './TrustCard';
import TrustModal from './TrustModal';
import { trackTrustSectionImpression, trackTileClick, trackModalOpen, trackModalClose } from '@/lib/analytics';

const TrustSafetySection = () => {
  const [selectedTile, setSelectedTile] = useState<TrustTile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const hasTrackedImpression = useRef(false);
  
  // Track section impression when it enters viewport
  useEffect(() => {
    if (!sectionRef.current || hasTrackedImpression.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression.current) {
            trackTrustSectionImpression();
            hasTrackedImpression.current = true;
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(sectionRef.current);
    
    return () => observer.disconnect();
  }, []);
  
  const handleTileClick = (tile: TrustTile) => {
    trackTileClick({ tileId: tile.id, tileTitle: tile.title });
    setSelectedTile(tile);
    setModalOpen(true);
  };
  
  const handleModalOpenChange = (open: boolean) => {
    if (open && selectedTile) {
      trackModalOpen({ tileId: selectedTile.id, tileTitle: selectedTile.title });
    } else if (!open && selectedTile) {
      trackModalClose({ tileId: selectedTile.id, tileTitle: selectedTile.title });
    }
    setModalOpen(open);
  };
  
  return (
    <section 
      ref={sectionRef}
      className="py-16 md:py-20 relative overflow-hidden bg-gradient-to-br from-emerald-500/5 via-background to-blue-500/5" 
      aria-labelledby="trust-safety-heading"
    >
      {/* Vibrant decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      </div>
      <div className="container max-w-7xl mx-auto px-4 relative z-10">
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
        onOpenChange={handleModalOpenChange} 
      />
    </section>
  );
};

export default TrustSafetySection;
