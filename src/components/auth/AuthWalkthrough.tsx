import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Zap, 
  TrendingUp, 
  Users, 
  DollarSign,
  CheckCircle2,
  Truck,
  Building2,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalkthroughStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  visual: React.ReactNode;
}

export const AuthWalkthrough = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const steps: WalkthroughStep[] = [
    {
      id: 1,
      title: 'Verified Community',
      subtitle: 'Every user is identity-verified for your protection',
      icon: <Shield className="h-5 w-5" />,
      visual: (
        <div className="space-y-3">
          {[
            { label: 'ID Verification', status: 'Complete', icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
            { label: 'Background Check', status: 'Passed', icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
            { label: 'Reviews Verified', status: '4.9 ★', icon: <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.status}</span>
            </motion.div>
          ))}
        </div>
      ),
    },
    {
      id: 2,
      title: 'Instant Bookings',
      subtitle: 'Get your first booking within 24 hours',
      icon: <Zap className="h-5 w-5" />,
      visual: (
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl border-2 border-primary bg-primary/10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">New Booking Request!</p>
                <p className="text-xs text-muted-foreground">Food Truck • 3 days</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-primary">$450</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 text-xs text-muted-foreground justify-center"
          >
            <Zap className="h-3 w-3 text-yellow-500" />
            <span>Average response time: 2 hours</span>
          </motion.div>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Maximize Earnings',
      subtitle: 'Turn idle assets into consistent income',
      icon: <TrendingUp className="h-5 w-5" />,
      visual: (
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {[
              { label: 'This Month', value: '$2,450', change: '+18%' },
              { label: 'Bookings', value: '12', change: '+5' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="p-3 rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm text-center"
              >
                <p className="text-lg font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xs text-green-500 mt-1">{stat.change}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="h-16 flex items-end justify-between gap-1 px-2"
          >
            {[40, 65, 45, 80, 60, 95, 75].map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.4 + i * 0.05, type: 'spring', stiffness: 100 }}
                className="flex-1 bg-gradient-to-t from-primary to-primary/50 rounded-t"
              />
            ))}
          </motion.div>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Join 10,000+ Users',
      subtitle: 'The trusted marketplace for food entrepreneurs',
      icon: <Users className="h-5 w-5" />,
      visual: (
        <div className="space-y-3">
          <div className="flex justify-center -space-x-3">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/80 to-primary border-2 border-background flex items-center justify-center text-primary-foreground text-xs font-bold"
              >
                {['M', 'J', 'S', 'K', 'A'][i]}
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
            >
              +9K
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-2 text-center"
          >
            {[
              { value: '$2M+', label: 'Paid to Hosts' },
              { value: '98%', label: 'Satisfaction' },
              { value: '24/7', label: 'Support' },
            ].map((stat, i) => (
              <div key={stat.label} className="p-2">
                <p className="text-sm font-bold text-primary">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      ),
    },
  ];

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;
    
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isPaused, steps.length]);

  const goToStep = (index: number) => {
    setCurrentStep(index);
    setIsPaused(true);
    // Resume auto-advance after 8 seconds of inactivity
    setTimeout(() => setIsPaused(false), 8000);
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => goToStep(index)}
            className={cn(
              "relative h-1.5 rounded-full transition-all duration-300",
              index === currentStep ? "w-8 bg-primary" : "w-2 bg-primary/30 hover:bg-primary/50"
            )}
          >
            {index === currentStep && (
              <motion.div
                className="absolute inset-0 bg-primary rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 4, ease: "linear" }}
                style={{ transformOrigin: 'left' }}
                key={currentStep}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-5 rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {steps[currentStep].icon}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{steps[currentStep].title}</h3>
              <p className="text-xs text-muted-foreground">{steps[currentStep].subtitle}</p>
            </div>
          </div>

          {/* Visual content */}
          <div className="min-h-[180px]">
            {steps[currentStep].visual}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation hints */}
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={() => goToStep((currentStep - 1 + steps.length) % steps.length)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={() => goToStep((currentStep + 1) % steps.length)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
};
