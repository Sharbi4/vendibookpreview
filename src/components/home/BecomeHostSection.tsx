import { Link } from 'react-router-dom';
import { ArrowRight, DollarSign, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import supplyImage from '@/assets/supply-food-truck.jpg';

const BecomeHostSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-foreground text-background">
      <div className="container max-w-6xl mx-auto px-5 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div 
            className="order-2 lg:order-1"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/20 text-primary rounded-full mb-6">
              Become a Host
            </span>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
              Your idle truck is{' '}
              <span className="text-primary">losing you money.</span>
            </h2>
            
            <p className="text-lg text-background/70 mb-8 max-w-lg">
              Join thousands of owners earning $2,500+/mo by renting their assets on Vendibook. We handle the payments, contracts, and insurance verification.
            </p>

            {/* Benefits List */}
            <div className="space-y-4 mb-10">
              {[
                { icon: DollarSign, text: 'Built-in booking & calendar management' },
                { icon: Shield, text: 'Verified renters with ID checks' },
                { icon: Clock, text: 'List in under 10 minutes' },
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  className="flex items-center gap-3 group"
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-background/80 group-hover:text-background transition-colors duration-300">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <Button 
              asChild 
              size="lg" 
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              <Link to="/list">
                List Your Asset
                <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>

          {/* Image */}
          <motion.div 
            className="order-1 lg:order-2 relative"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl group">
              <img
                src={supplyImage}
                alt="Food truck owner"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            {/* Floating earnings card */}
            <motion.div 
              className="absolute -bottom-4 -left-4 md:bottom-6 md:-left-6 bg-background text-foreground p-4 rounded-xl shadow-xl"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
            >
              <p className="text-xs text-muted-foreground mb-1">Average monthly earnings</p>
              <p className="text-2xl font-bold text-primary">$2,847</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BecomeHostSection;
