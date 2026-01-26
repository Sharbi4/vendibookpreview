import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import trailerPink from '@/assets/trailer-pink.jpg';
import trailerRico from '@/assets/trailer-rico.jpg';
import foodTruckCoffee from '@/assets/food-truck-coffee.jpg';

const FinalCTA = () => {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 relative overflow-hidden">
      {/* Background image gallery - decorative */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-1/3 h-full">
          <img src={trailerPink} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
        <div className="absolute top-0 left-1/3 w-1/3 h-full">
          <img src={foodTruckCoffee} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
        <div className="absolute top-0 right-0 w-1/3 h-full">
          <img src={trailerRico} alt="" className="w-full h-full object-cover" aria-hidden="true" />
        </div>
      </div>
      
      <div className="container max-w-4xl mx-auto px-4 text-center relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Your next move starts here.</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
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
