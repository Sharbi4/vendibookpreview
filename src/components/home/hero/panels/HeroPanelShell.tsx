import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  eyebrow: string;
  headline: ReactNode;
  supportingText: ReactNode;
  primaryCta: ReactNode;
  secondaryCta?: ReactNode;
  finePrint?: ReactNode;
  visual?: ReactNode;
  accentClassName?: string;
}

const HeroPanelShell = ({
  eyebrow,
  headline,
  supportingText,
  primaryCta,
  secondaryCta,
  finePrint,
  visual,
  accentClassName,
}: Props) => {
  return (
    <div className="relative">
      {accentClassName && (
        <div className={cn('absolute inset-0 pointer-events-none', accentClassName)} />
      )}
      <div className="container relative z-10 max-w-6xl mx-auto px-5 py-10 sm:py-16 md:py-20 min-h-[560px] md:min-h-[520px] flex items-center">
        <div className="grid md:grid-cols-2 gap-10 items-center w-full">
          <div className="text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 rounded-full border border-white/[0.08] bg-white/[0.03] text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/70"
            >
              <span className="w-1 h-1 rounded-full bg-primary" />
              {eyebrow}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-[26px] leading-[1.1] sm:text-4xl md:text-5xl font-bold text-foreground tracking-tight mb-3 sm:mb-4"
            >
              {headline}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl md:mx-0 mx-auto leading-relaxed mb-6"
            >
              {supportingText}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-center md:justify-start"
            >
              {primaryCta}
              {secondaryCta}
            </motion.div>

            {finePrint && (
              <p className="mt-4 text-[11px] text-foreground/40 leading-relaxed max-w-xl md:mx-0 mx-auto">
                {finePrint}
              </p>
            )}
          </div>

          {visual && (
            <div className="hidden md:flex items-center justify-center">
              {visual}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroPanelShell;
