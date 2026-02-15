import { Phone, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const HeroVendiButton = () => (
  <motion.div
    className="flex items-center justify-center gap-3 mt-3"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.8 }}
  >
    <span className="text-[11px] text-muted-foreground/40">or</span>
    <button
      onClick={() => {
        // Trigger the floating Vendi voice button
        const vendiBtn = document.querySelector('[title="Talk to Vendi"]') as HTMLButtonElement;
        if (vendiBtn) vendiBtn.click();
      }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:border-primary/40 bg-card/50 hover:bg-card text-sm text-muted-foreground hover:text-foreground transition-all group"
    >
      <Phone className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
      <span>Let Vendi guide you</span>
    </button>
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-sm p-3">
          <p className="font-semibold mb-1">Meet Vendi 🎙️</p>
          <p className="text-muted-foreground text-xs">
            Vendi is your AI voice guide. Search listings, create new ones, or get answers about the platform — all by voice.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </motion.div>
);

export default HeroVendiButton;
