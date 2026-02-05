import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  DollarSign, 
  FileText, 
  MapPin, 
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WalkthroughStep {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  mockup: React.ReactNode;
}

const ListingWalkthrough = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const steps: WalkthroughStep[] = [
    {
      id: 1,
      title: 'Choose what you\'re listing',
      description: 'Select your asset type and whether you want to sell or rent.',
      icon: <FileText className="h-5 w-5" />,
      mockup: (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">What are you listing?</div>
          <div className="grid grid-cols-2 gap-2">
            {['Food Truck', 'Food Trailer', 'Ghost Kitchen', 'Vendor Space'].map((type, i) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "p-3 rounded-lg border text-center text-sm cursor-pointer transition-all",
                  i === 0 ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/50"
                )}
              >
                {type}
              </motion.div>
            ))}
          </div>
          <div className="text-sm font-medium text-muted-foreground mt-4 mb-2">Mode</div>
          <div className="flex gap-2">
            {['Sell', 'Rent'].map((mode, i) => (
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className={cn(
                  "flex-1 p-3 rounded-lg border text-center text-sm cursor-pointer transition-all",
                  i === 0 ? "border-primary bg-primary/10 text-primary font-medium" : "border-border"
                )}
              >
                {mode}
              </motion.div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: 'Add photos & details',
      description: 'Upload high-quality photos and describe your asset.',
      icon: <Camera className="h-5 w-5" />,
      mockup: (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">Photos</div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15 }}
                className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center"
              >
                <Camera className="h-4 w-4 text-primary/60" />
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-sm font-medium text-muted-foreground mb-2 mt-4">Title</div>
            <div className="p-2.5 rounded-lg border border-border bg-background text-sm">
              2019 Custom Food Truck - Fully Equipped
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
            <div className="p-2.5 rounded-lg border border-border bg-background text-sm text-muted-foreground line-clamp-2">
              Turnkey operation ready for your menu. Commercial grade equipment...
            </div>
          </motion.div>
        </div>
      ),
    },
    {
      id: 3,
      title: 'Set your location',
      description: 'Let buyers know where your asset is located.',
      icon: <MapPin className="h-5 w-5" />,
      mockup: (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">Pickup Location</div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg border border-border bg-background"
          >
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              <span>Austin, TX 78701</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="rounded-lg overflow-hidden border border-border h-24 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center"
          >
            <div className="text-center">
              <MapPin className="h-6 w-6 text-primary mx-auto mb-1" />
              <span className="text-xs text-muted-foreground">Map Preview</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20"
          >
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">Vendibook Freight available in your area</span>
          </motion.div>
        </div>
      ),
    },
    {
      id: 4,
      title: 'Set your price',
      description: 'Choose your asking price and payment options.',
      icon: <DollarSign className="h-5 w-5" />,
      mockup: (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground mb-2">Asking Price</div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 rounded-lg border border-primary bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-foreground">45,000</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-sm font-medium text-muted-foreground mb-2 mt-4">Payment Options</div>
            <div className="space-y-2">
              {['Accept cash/check (in-person)', 'Accept card payments (Stripe)'].map((opt, i) => (
                <motion.div
                  key={opt}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border"
                >
                  <div className="w-4 h-4 rounded border-2 border-primary bg-primary flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-xs">{opt}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      ),
    },
    {
      id: 5,
      title: 'Review & publish',
      description: 'Preview your listing and go live!',
      icon: <Sparkles className="h-5 w-5" />,
      mockup: (
        <div className="space-y-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-border overflow-hidden"
          >
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary/40" />
            </div>
            <div className="p-3">
              <div className="font-medium text-sm mb-1">2019 Custom Food Truck</div>
              <div className="text-xs text-muted-foreground mb-2">Austin, TX</div>
              <div className="text-primary font-bold">$45,000</div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            {['Photos uploaded', 'Description complete', 'Price set', 'Location added'].map((item, i) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-2 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <span className="text-muted-foreground">{item}</span>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="pt-2"
          >
            <div className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-center text-sm font-medium">
              Publish Listing
            </div>
          </motion.div>
        </div>
      ),
    },
  ];

  // Auto-advance steps
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const goToStep = (index: number) => {
    setCurrentStep(index);
    setIsPlaying(false);
  };

  const goNext = () => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
    setIsPlaying(false);
  };

  const goPrev = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
    setIsPlaying(false);
  };

  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Listing Wizard</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted relative">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              {steps[currentStep].icon}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Step {currentStep + 1} of {steps.length}</div>
              <div className="font-semibold text-sm">{steps[currentStep].title}</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">{steps[currentStep].description}</p>

        {/* Mockup content */}
        <div className="min-h-[280px] sm:min-h-[260px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].mockup}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep ? "bg-primary w-6" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={goPrev} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goNext} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingWalkthrough;
