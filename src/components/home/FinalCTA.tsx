import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Final CTA uses colorful exterior shots
import trailerPinkVintage from '@/assets/trailer-pink-vintage.jpg';
import trailerOrangeGrill from '@/assets/trailer-orange-grill.jpg';
import trailerCreamParty from '@/assets/trailer-cream-party.jpg';

const FinalCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="py-14 sm:py-20 md:py-28 bg-gradient-to-br from-foreground/5 via-muted/30 to-foreground/5 relative overflow-hidden">
      {/* Background image gallery - decorative */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div className="absolute top-0 left-0 w-1/3 h-full">
          <img src={trailerPinkVintage} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
        <div className="absolute top-0 left-1/3 w-1/3 h-full">
          <img src={trailerOrangeGrill} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full">
          <img src={trailerCreamParty} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
      </div>
      
      {/* Premium overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/80 pointer-events-none" aria-hidden="true" />
      
      <div className="container max-w-4xl mx-auto px-5 sm:px-6 text-center relative z-10">
        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 sm:mb-4 text-shadow-premium">
          Your next move <span className="gradient-text-warm">starts here.</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-10 max-w-2xl mx-auto">
          Whether you're looking for equipment or have assets to list, Vendibook has you covered.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="dark-shine" size="lg" onClick={() => navigate('/search')} className="px-8 gap-2">
            <Search className="h-5 w-5" />
            Search Listings
          </Button>
          <Button variant="dark-shine" size="lg" onClick={() => navigate('/list')} className="px-8 gap-2">
            List an Asset
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button variant="dark-shine" size="lg" onClick={() => navigate('/how-it-works')} className="px-8 gap-2">
            <BookOpen className="h-5 w-5" />
            Learn More
          </Button>
        </div>
      </div>
    </section>
  );
};
export default FinalCTA;
