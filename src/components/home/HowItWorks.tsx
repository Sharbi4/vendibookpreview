import { Link } from 'react-router-dom';
import { Compass, BadgeCheck, Landmark, ArrowRight, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: Compass,
    title: 'Find or List',
    description: 'Browse verified listings or create your own',
  },
  {
    icon: BadgeCheck,
    title: 'Verify & Approve',
    description: 'Upload documents, get approved, stay compliant',
  },
  {
    icon: Landmark,
    title: 'Transact Securely',
    description: 'Payments held in escrow until complete',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-10 sm:py-12 md:py-16 bg-background">
      <div className="container max-w-4xl mx-auto px-5 sm:px-6">
        <motion.div 
          className="text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2">
            How It Works
          </h2>
          <p className="text-muted-foreground">
            Three simple steps to get started
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div 
                key={index} 
                className="relative overflow-hidden text-center group p-6 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-amber-500/5 to-yellow-400/5 cursor-default"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: index * 0.12 }}
                whileHover={{ y: -4, transition: { duration: 0.25, ease: 'easeOut' } }}
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-yellow-400/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <motion.div 
                  className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-amber-500 mb-3 shadow-md"
                  whileHover={{ scale: 1.15, rotate: 3, transition: { duration: 0.3 } }}
                >
                  <Icon className="h-5 w-5 text-white" strokeWidth={2} />
                </motion.div>
                <div className="relative text-xs font-medium text-primary mb-1">Step {index + 1}</div>
                <h3 className="relative text-base font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="relative text-muted-foreground text-sm">{step.description}</p>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button 
            variant="outline" 
            asChild
            className="border-primary/30 hover:bg-gradient-to-r hover:from-primary/10 hover:to-amber-500/10 transition-all duration-300 hover:shadow-md"
          >
            <Link to="/how-it-works" className="gap-2">
              Learn more
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
