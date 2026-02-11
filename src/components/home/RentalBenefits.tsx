import { Sparkles, ShieldCheck, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const benefits = [
  {
    icon: Sparkles,
    title: 'Capital Efficiency',
    description: "Launch and scale. Don't get locked into a 5-year loan. Whether you need a short-term rental to test a concept or a turnkey asset to own, we provide the inventory to scale on your terms.",
  },
  {
    icon: ShieldCheck,
    title: 'Built-in Trust',
    description: "Verified & Professional. We've standardized the industry. From Stripe-backed ID verification to secure escrow and digital agreements, we've handled the risk so you can focus on the food.",
  },
  {
    icon: MapPin,
    title: 'Strategic Placement',
    description: 'A home for your business. A great truck needs a great location. Instantly discover and book verified vendor slots, commissary kitchens, and food truck parks with professional logistics.',
  },
];

const RentalBenefits = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 bg-background">
      <div className="container max-w-6xl mx-auto px-5 sm:px-6">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
            The modern way to start a food business.
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Skip the $50k down payment. Start cooking next week.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
          {benefits.map((benefit, index) => (
            <motion.div 
              key={index} 
              className="text-center sm:text-left group cursor-default"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -3, transition: { duration: 0.25 } }}
            >
              <motion.div 
                className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-primary/10 text-primary mb-4 sm:mb-5"
                whileHover={{ scale: 1.1, rotate: -3, transition: { duration: 0.3 } }}
              >
                <benefit.icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </motion.div>
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2 sm:mb-3 group-hover:text-primary transition-colors duration-300">
                {benefit.title}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RentalBenefits;
