import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const FinalCTA = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      {/* Subtle closing ambient */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[160px]" style={{ background: 'radial-gradient(ellipse, rgba(255,81,36,0.025) 0%, rgba(255,186,8,0.012) 40%, transparent 70%)' }} />
      
      <div className="container max-w-3xl mx-auto px-5 sm:px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Your next move{' '}
            <span className="text-muted-foreground">starts here.</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Whether you're looking for equipment or have assets to list, Vendibook has you covered.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="glass-cta"
              onClick={() => navigate('/search')}
              className="rounded-full px-8 gap-2"
            >
              <Search className="h-4 w-4" />
              Search Listings
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/list')}
              className="rounded-full px-8 border-border hover:border-foreground/20 hover:bg-foreground/5 text-foreground gap-2"
            >
              <Sparkles className="h-4 w-4" />
              List an Asset
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
