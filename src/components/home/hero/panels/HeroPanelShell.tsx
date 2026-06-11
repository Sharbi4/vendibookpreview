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
    <div
      className="relative overflow-hidden ring-1 ring-black/5 shadow-2xl mx-4 sm:mx-6 mt-6"
      style={{ borderRadius: 32 }}
    >
      {/* Base cream gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #FFF8F0 0%, #FFF3E7 45%, #FFE0CC 100%)',
        }}
        aria-hidden
      />
      {bgImage && (
        <div
          className="absolute inset-0 bg-no-repeat pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundPosition: 'right -10% bottom -10%',
            backgroundSize: '70% auto',
            opacity: 0.4,
          }}
          aria-hidden
        />
      )}
      {/* Cream wash to keep all text/CTAs readable above the image */}
      {bgImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,248,240,0.96) 0%, rgba(255,243,231,0.88) 55%, rgba(255,224,204,0.72) 100%)',
          }}
          aria-hidden
        />
      )}
      {/* Desktop: keep image visible on the right side only */}
      {bgImage && (
        <div
          className="hidden md:block absolute inset-y-0 right-0 w-1/2 pointer-events-none"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right center',
            backgroundSize: 'cover',
            opacity: 0.55,
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 35%, black 80%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.6) 35%, black 80%)',
          }}
          aria-hidden
        />
      )}
      {/* Soft orange radial glow top-right */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 50% at 90% 0%, rgba(255,75,31,0.18) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      {accentClassName && (
        <div className={cn('absolute inset-0 pointer-events-none', accentClassName)} aria-hidden />
      )}

      {/* Glass module overlay layer (z-3): below text (z-10), above bg art */}
      {glassModules && (
        <div className="absolute inset-0 z-[3] pointer-events-none" aria-hidden={false}>
          {glassModules}
        </div>
      )}

      <div className="relative z-10 px-5 pt-7 pb-8 sm:px-10 sm:py-14 md:px-16 md:py-20 flex">
        <div className="w-full max-w-2xl mx-auto md:mx-0 text-left flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex self-start items-center gap-1.5 px-3.5 mb-6 rounded-full text-[11px] sm:text-[12px] font-semibold uppercase text-[#121212]"
            style={{
              height: 36,
              letterSpacing: '0.16em',
              background: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(255, 75, 31, 0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              boxShadow: '0 4px 14px rgba(18,18,18,0.06)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FF4B1F' }} />
            {eyebrow}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="font-bold text-[#121212] mb-4"
            style={{
              fontSize: 'clamp(38px, 9.5vw, 60px)',
              lineHeight: 1.08,
              letterSpacing: '-0.04em',
            }}
          >
            {headline}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-xl mb-6"
            style={{ fontSize: 18, lineHeight: 1.65, color: '#4A403A' }}
          >
            {supportingText}
          </motion.p>

          {belowSupporting && <div className="mb-6">{belowSupporting}</div>}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex flex-col gap-3 items-stretch w-full max-w-xl"
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
