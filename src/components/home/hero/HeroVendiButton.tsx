import { Headset, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';

const HeroVendiButton = () => (
  <motion.div
    className="flex flex-col items-center gap-3 mt-2"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.8, duration: 0.5 }}
  >
    {/* Neon gradient divider */}
    <div className="w-56 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />

    <div className="flex items-center gap-2">
      <motion.button
        onClick={() => {
          trackEventToDb('hero_vendi_click', 'cta', { source: 'hero' });
          const vendiBtn = document.querySelector('[title="Talk to Vendi"]') as HTMLButtonElement;
          if (vendiBtn) vendiBtn.click();
        }}
        className="relative inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 group cursor-pointer
          bg-white/[0.05]
           border-2 border-white/[0.12] hover:border-foreground/35
           text-muted-foreground hover:text-foreground
           shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_4px_24px_-4px_rgba(0,0,0,0.4)]
           hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_32px_-4px_rgba(255,255,255,0.08)]
          hover:bg-white/[0.08]"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Ambient glow behind icon */}
        <span className="relative flex items-center justify-center">
          <span className="absolute inset-0 w-6 h-6 -m-1 rounded-full bg-foreground/10 blur-md group-hover:bg-foreground/15 transition-colors" />
          <Headset className="relative w-4 h-4 text-foreground/70 group-hover:text-foreground transition-colors" />
        </span>
        <span className="relative">
          <span className="bg-gradient-to-r from-muted-foreground via-foreground/80 to-muted-foreground group-hover:from-foreground group-hover:via-foreground group-hover:to-foreground/80 bg-clip-text text-transparent transition-all duration-300">
            Let Vendi guide you
          </span>
        </span>
        {/* Shimmer sweep on hover */}
        <span className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </span>
      </motion.button>

      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="p-1.5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-sm p-3 backdrop-blur-xl bg-card/90 border-border/50">
            <p className="font-semibold mb-1">Meet Vendi 🎙️</p>
            <p className="text-muted-foreground text-xs">
              Vendi is your AI voice guide. Search listings, create new ones, or get answers about the platform — all by voice.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  </motion.div>
);

export default HeroVendiButton;
