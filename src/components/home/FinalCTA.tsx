import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { TellVendibookModal } from '@/components/lead/TellVendibookModal';
import { trackLeadEvent } from '@/lib/leadTracking';

const FinalCTA = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleConcierge = () => {
    trackLeadEvent('homepage_final_cta_click', {
      route: '/',
      cta: 'concierge',
      source: 'home_final_cta'});
    setOpen(true);
  };

  const handleBrowse = () => {
    trackLeadEvent('homepage_final_cta_click', {
      route: '/',
      cta: 'browse',
      source: 'home_final_cta'});
    navigate('/search');
  };

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden">
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[160px]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(255,81,36,0.025) 0%, rgba(255,186,8,0.012) 40%, transparent 70%)'}}
      />

      <div className="container max-w-3xl mx-auto px-5 sm:px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-8 leading-tight">
            Ready to find or list a{' '}
            <span className="gradient-text-warm">food truck or trailer?</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="dark-shine"
              onClick={handleConcierge}
              className="rounded-full px-8 gap-2"
            >
              
              Tell Vendibook What You Need
            </Button>
            <Button
              variant="glass-cta"
              size="lg"
              onClick={handleBrowse}
              className="rounded-full px-8 gap-2"
            >
              <Search className="h-4 w-4" />
              Browse Listings
            </Button>
          </div>
        </motion.div>
      </div>

      <TellVendibookModal open={open} onOpenChange={setOpen} sourcePage="home_final_cta" />
    </section>
  );
};

export default FinalCTA;
