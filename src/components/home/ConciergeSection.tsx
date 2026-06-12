import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { trackLeadEvent } from '@/lib/leadTracking';

const ConciergeSection = () => {
  const handleClick = () => {
    trackLeadEvent('homepage_concierge_click', {
      route: '/',
      source: 'home_sell_learn_section',
      destination: '/sell',
    });
  };

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[500px] rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(ellipse, rgba(255,81,36,0.02) 0%, rgba(255,186,8,0.008) 40%, transparent 70%)',
        }}
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-premium rounded-3xl p-8 sm:p-12 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/10 border-2 border-foreground/20 text-foreground text-[10px] font-semibold uppercase tracking-widest mb-6">
              For Sellers
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Learn about selling on Vendibook{' '}
              <span className="text-[#FF6B00]">(it's free!)</span>
            </h2>

            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              See how owners list food trucks, trailers, and concession units — from pricing guidance
              and verified buyers to payouts and post-sale support.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['12.9% seller commission', 'Payouts in 25 days', 'Verified buyers'].map((text) => (
                <span
                  key={text}
                  className="text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-accent border-2 border-border/80"
                >
                  {text}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                variant="glass-cta"
                className="rounded-full px-8 gap-2"
                onClick={handleClick}
              >
                <Link to="/sell">
                  Learn about selling
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ConciergeSection;
