import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Shield, CalendarCheck, Sparkles } from 'lucide-react';

const benefits = [
  {
    icon: Clock,
    title: 'Monetize Idle Hours',
    description: 'Your kitchen sits empty 6-10 hours daily. Turn that into revenue.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: Shield,
    title: 'Verified Renters Only',
    description: 'We screen every renter with ID verification & document review.',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    icon: DollarSign,
    title: 'Get Paid Upfront',
    description: 'Payment is collected before the booking. No chasing invoices.',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
  {
    icon: CalendarCheck,
    title: 'You Stay in Control',
    description: 'Set your hours, rules, and approve every booking request.',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
];

const KitchenBenefitsAnimation = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % benefits.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const activeBenefit = benefits[activeIndex];
  const ActiveIcon = activeBenefit.icon;

  return (
    <section className="py-12 md:py-16 bg-background overflow-hidden">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          {/* Main Animation Container */}
          <div 
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Central Animated Card */}
            <div className="relative h-[280px] md:h-[240px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIndex}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                >
                  {/* Animated Icon */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl ${activeBenefit.bgColor} flex items-center justify-center mb-6`}
                  >
                    <ActiveIcon className={`w-10 h-10 md:w-12 md:h-12 ${activeBenefit.color}`} />
                  </motion.div>

                  {/* Title */}
                  <motion.h3
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl md:text-3xl font-bold mb-3"
                  >
                    {activeBenefit.title}
                  </motion.h3>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-muted-foreground text-lg max-w-md"
                  >
                    {activeBenefit.description}
                  </motion.p>
                </motion.div>
              </AnimatePresence>

              {/* Floating Sparkles */}
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute top-4 right-8 md:right-16"
              >
                <Sparkles className="w-6 h-6 text-primary/40" />
              </motion.div>
              <motion.div
                animate={{
                  y: [0, 10, 0],
                  opacity: [0.3, 0.7, 0.3],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.5,
                }}
                className="absolute bottom-8 left-8 md:left-16"
              >
                <Sparkles className="w-5 h-5 text-primary/30" />
              </motion.div>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? 'bg-primary text-primary-foreground scale-110'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                    aria-label={benefit.title}
                  >
                    <Icon className="w-5 h-5" />
                    {index === activeIndex && !isPaused && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-primary"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 1.3, opacity: 0 }}
                        transition={{ duration: 3, ease: 'linear' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pause Indicator */}
            <AnimatePresence>
              {isPaused && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-xs text-muted-foreground mt-3"
                >
                  Paused — hover off to resume
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

export default KitchenBenefitsAnimation;
