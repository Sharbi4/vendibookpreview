import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const benefits = [
  { icon: DollarSign, text: 'Built-in booking & calendar management' },
  { icon: Shield, text: 'Verified renters with ID checks' },
  { icon: Clock, text: 'List in under 10 minutes' },
];

const BecomeHostSection = () => {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Subtle glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />
      
      <div className="container max-w-4xl mx-auto px-5 sm:px-6 relative z-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest bg-primary/10 text-primary rounded-full mb-6">
            For Owners
          </span>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Your idle truck is{' '}
            <span className="gradient-text-warm">losing you money.</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join owners earning $2,500+/mo by renting their assets. We handle payments, contracts, and verification.
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((item, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-card border border-border text-sm text-muted-foreground"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
              >
                <item.icon className="w-4 h-4 text-primary" />
                {item.text}
              </motion.div>
            ))}
          </div>

          {/* Earnings card */}
          <motion.div
            className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-card border border-border mb-10"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Average monthly earnings</p>
              <p className="text-2xl font-bold gradient-text-warm">$2,847</p>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Platform fee</p>
              <p className="text-2xl font-bold text-foreground">$0</p>
            </div>
          </motion.div>

          <div>
            <Button 
              asChild 
              size="lg" 
              className="rounded-full px-10 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 gap-2"
            >
              <Link to="/list">
                List Your Asset
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BecomeHostSection;
