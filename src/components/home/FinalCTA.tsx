import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
const FinalCTA = () => {
  const navigate = useNavigate();
  return <section className="py-16 md:py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="container max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">Your next move starts here.</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Whether you're looking for equipment or have assets to list, Vendibook has you covered.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button variant="gradient-premium" size="lg" onClick={() => navigate('/search')} className="px-8 gap-2">
            <Search className="h-5 w-5" />
            Search Listings
          </Button>
          <Button variant="outline" size="lg" onClick={() => navigate('/list')} className="px-8 gap-2">
            List an Asset
            <ArrowRight className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="lg" onClick={() => navigate('/how-it-works')} className="px-8 gap-2">
            <BookOpen className="h-5 w-5" />
            Learn More
          </Button>
        </div>
      </div>
    </section>;
};
export default FinalCTA;