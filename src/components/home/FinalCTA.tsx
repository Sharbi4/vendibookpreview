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
          className="sale-light rounded-3xl bg-background p-8 sm:p-14 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]"
        >
          <h2 className="text-3xl sm:text-4xl md:text-[44px] font-semibold tracking-tight text-foreground mb-4 leading-[1.1]">
            Find it, list it, or tell us what you need.
          </h2>
          <p className="mx-auto mb-8 max-w-md text-muted-foreground leading-relaxed">
            Food trucks, trailers, and commissary kitchens — free to browse, free to list.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              variant="cta"
              onClick={handleConcierge}
              className="rounded-2xl px-8 gap-2"
            >
              Tell Vendibook what you need
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleBrowse}
              className="rounded-2xl border-border bg-transparent px-8 gap-2 text-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              Browse listings
            </Button>
          </div>
        </motion.div>
      </div>

      <TellVendibookModal open={open} onOpenChange={setOpen} sourcePage="home_final_cta" />
    </section>
  );
};

export default FinalCTA;
