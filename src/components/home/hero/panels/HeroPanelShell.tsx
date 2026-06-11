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
  /** Optional accent tint for the satin glow direction (e.g. 'from-amber-200/40'). */
  accentClassName?: string;
  /** Optional decorative background image (art only — no baked-in UI). */
  bgImage?: string;
  /** Optional glassmorphism overlay modules (absolutely positioned, real HTML). */
  glassModules?: ReactNode;
  /** Optional inline content rendered below supporting text but above CTAs (e.g. logos row). */
  belowSupporting?: ReactNode;
}

const HeroPanelShell = ({
  eyebrow,
  headline,
  supportingText,
  primaryCta,
  secondaryCta,
  finePrint,
  accentClassName,
  bgImage,
  glassModules,
  belowSupporting,
}: Props) => {
  return (
    <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5 shadow-2xl">
      {/* Base cream gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #fff7ee 0%, #fde4cc 45%, #f6cfa6 100%)',
        }}
        aria-hidden
      />
      {bgImage && (
        <div
          className="absolute inset-0 bg-no-repeat bg-right-bottom bg-contain md:bg-cover md:bg-center"
          style={{
            backgroundImage: `url(${bgImage})`,
            maskImage:
              'linear-gradient(to right, transparent 0%, transparent 35%, rgba(0,0,0,0.6) 60%, black 80%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, transparent 35%, rgba(0,0,0,0.6) 60%, black 80%)',
          }}
          aria-hidden
        />
      )}
      {/* Left-side legibility wash for text */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none md:hidden"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,247,238,0.92) 0%, rgba(255,247,238,0.7) 55%, rgba(255,247,238,0.2) 100%)',
          }}
          aria-hidden
        />
      )}
      {/* Soft orange radial glow top-right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 50% at 85% 10%, hsla(24, 95%, 60%, 0.35) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      {/* Satin light trail */}
      <div
        className="absolute inset-0 pointer-events-none opacity-70"
        style={{
          background:
            'radial-gradient(120% 40% at 50% 110%, hsla(28, 100%, 70%, 0.45) 0%, transparent 60%)',
        }}
        aria-hidden
      />
      {/* Subtle dotted noise top-left */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(hsla(20, 30%, 40%, 0.18) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          maskImage:
            'radial-gradient(50% 40% at 10% 10%, black 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(50% 40% at 10% 10%, black 0%, transparent 70%)',
        }}
        aria-hidden
      />
      {accentClassName && (
        <div className={cn('absolute inset-0 pointer-events-none', accentClassName)} aria-hidden />
      )}

      <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 md:py-20 min-h-[560px] flex">
        <div className="w-full max-w-2xl mx-auto md:mx-0 text-left flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex self-start items-center gap-1.5 px-3 py-1 mb-5 rounded-full border border-orange-500/40 bg-white/60 backdrop-blur-sm text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-900"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {eyebrow}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-[34px] leading-[1.05] sm:text-5xl md:text-6xl font-bold text-neutral-900 tracking-tight mb-4"
          >
            {headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-base md:text-lg text-neutral-700 max-w-xl leading-relaxed mb-6"
          >
            {supportingText}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col sm:flex-row gap-3 items-stretch w-full max-w-xl"
          >
            {primaryCta}
            {secondaryCta}
          </motion.div>

          {finePrint && (
            <p className="mt-4 text-[11px] text-neutral-600 leading-relaxed max-w-xl">
              {finePrint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroPanelShell;
