import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, MotionValue } from 'framer-motion';
import { LucideIcon, Search, ShieldCheck, CreditCard, Handshake, MessageSquare, Calendar, Camera, Truck, DollarSign, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WalkthroughStep {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Right-side mock to render — choose a visual that matches the step */
  mock: 'search' | 'listing' | 'message' | 'payment' | 'verified' | 'calendar' | 'photo' | 'truck' | 'payout' | 'docs';
}

interface ScrollWalkthroughProps {
  steps: WalkthroughStep[];
  /** Tonal accent for the whole walkthrough; uses semantic tokens */
  tone?: 'neutral' | 'host' | 'seller';
}

/**
 * ScrollWalkthrough
 * Airbnb-style sticky scroll-driven product tour.
 * Left column: sticky illustrative mock that morphs per step.
 * Right column: scrollable list of steps. Active step is highlighted as it enters viewport.
 */
const ScrollWalkthrough = ({ steps, tone = 'neutral' }: ScrollWalkthroughProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [hoverIndex, setHoverIndex] = useState<number>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Scroll-driven index for the left-side visual stage only
  const activeIndex = useTransform(scrollYProgress, [0, 1], [0, steps.length - 0.001]);

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: `${steps.length * 90}vh` }}>
      <div className="sticky top-0 h-screen flex items-center">
        <div className="container max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* LEFT — sticky visual stage */}
          <div className="hidden lg:flex items-center justify-center order-1">
            <div className="relative w-full max-w-md aspect-square rounded-3xl bg-card/60 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
              {steps.map((step, i) => (
                <StepMock key={i} step={step} index={i} progress={activeIndex} tone={tone} />
              ))}
              {/* Progress rail */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-1.5">
                {steps.map((_, i) => (
                  <ProgressBar key={i} index={i} progress={activeIndex} total={steps.length} />
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — step list */}
          <div
            className="order-2 space-y-3 lg:space-y-2 max-h-[80vh] overflow-y-auto lg:overflow-visible scrollbar-hide"
            onMouseLeave={() => setHoverIndex(-1)}
          >
            {steps.map((step, i) => (
              <StepText
                key={i}
                step={step}
                index={i}
                isActive={hoverIndex === i}
                onHover={() => setHoverIndex(i)}
                tone={tone}
                reduce={!!reduce}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll spacers — one per step, drives progress */}
      <div className="absolute inset-0 pointer-events-none">
        {steps.map((_, i) => (
          <div key={i} style={{ height: '90vh' }} />
        ))}
      </div>
    </div>
  );
};

const ProgressBar = ({ index, progress, total }: { index: number; progress: MotionValue<number>; total: number }) => {
  const fill = useTransform(progress, (v) => {
    const local = Math.max(0, Math.min(1, v - index));
    return `${local * 100}%`;
  });
  return (
    <div className="flex-1 h-1 rounded-full bg-foreground/10 overflow-hidden">
      <motion.div className="h-full bg-foreground" style={{ width: fill }} />
    </div>
  );
};

const StepText = ({
  step,
  index,
  isActive,
  onHover,
  tone,
  reduce,
}: {
  step: WalkthroughStep;
  index: number;
  isActive: boolean;
  onHover: () => void;
  tone: 'neutral' | 'host' | 'seller';
  reduce: boolean;
}) => {
  const Icon = step.icon;
  const accent =
    tone === 'host' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : tone === 'seller' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
    : 'bg-primary/10 text-primary';

  return (
    <motion.div
      onMouseEnter={onHover}
      onFocus={onHover}
      tabIndex={0}
      animate={reduce ? undefined : { scale: isActive ? 1 : 0.98, opacity: isActive ? 1 : 0.72 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={cn(
        'rounded-2xl border bg-card/60 backdrop-blur-xl p-5 md:p-6 cursor-default transition-colors duration-200 outline-none',
        isActive ? 'border-foreground/40 shadow-lg' : 'border-border'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('shrink-0 w-12 h-12 rounded-xl flex items-center justify-center', accent)}>
          <Icon className="w-6 h-6" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-muted-foreground mb-1">Step {step.number}</div>
          <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1.5">{step.title}</h3>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{step.description}</p>
        </div>
      </div>
    </motion.div>
  );
};

const StepMock = ({
  step,
  index,
  progress,
  tone,
}: {
  step: WalkthroughStep;
  index: number;
  progress: MotionValue<number>;
  tone: 'neutral' | 'host' | 'seller';
}) => {
  const opacity = useTransform(progress, (v) => {
    const dist = Math.abs(v - index);
    return dist < 0.5 ? 1 - dist * 2 : 0;
  });
  const y = useTransform(progress, (v) => {
    return (v - index) * 30;
  });

  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute inset-0 flex items-center justify-center p-6"
    >
      <MockVisual variant={step.mock} tone={tone} />
    </motion.div>
  );
};

const MockVisual = ({ variant, tone }: { variant: WalkthroughStep['mock']; tone: 'neutral' | 'host' | 'seller' }) => {
  const accentClass =
    tone === 'host' ? 'text-emerald-500' : tone === 'seller' ? 'text-amber-500' : 'text-primary';

  switch (variant) {
    case 'search':
      return (
        <div className="w-full space-y-3">
          <div className="bg-background border border-border rounded-2xl p-3 flex items-center gap-2 shadow-sm">
            <Search className="w-4 h-4 text-muted-foreground" />
            <div className="text-sm text-foreground font-medium">Food trucks in Austin, TX</div>
          </div>
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-background border border-border rounded-xl p-3 flex gap-3 shadow-sm"
            >
              <div className="w-14 h-14 rounded-lg bg-foreground/10 flex items-center justify-center">
                <Truck className={cn('w-6 h-6', accentClass)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">2019 Ford Step Van</div>
                <div className="text-xs text-muted-foreground">Austin, TX • Verified</div>
                <div className={cn('text-sm font-semibold mt-0.5', accentClass)}>${(i * 75 + 175).toLocaleString()}/day</div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    case 'listing':
      return (
        <div className="w-full">
          <div className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="aspect-video bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center">
              <Truck className={cn('w-16 h-16', accentClass)} />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck className={cn('w-4 h-4', accentClass)} />
                <span className="text-xs font-medium text-muted-foreground">Verified Host</span>
              </div>
              <div className="text-base font-semibold text-foreground">2021 Mercedes Sprinter</div>
              <div className="text-xs text-muted-foreground mb-2">Fully equipped • Health certified</div>
              <div className="flex items-center justify-between">
                <div className={cn('text-lg font-bold', accentClass)}>$285/day</div>
                <div className="text-xs text-muted-foreground">★ 4.9 (47)</div>
              </div>
            </div>
          </div>
        </div>
      );
    case 'message':
      return (
        <div className="w-full space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">Conversation</div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-background border border-border rounded-2xl rounded-tl-sm p-3 max-w-[80%] shadow-sm">
            <div className="text-xs text-muted-foreground mb-0.5">Host</div>
            <div className="text-sm text-foreground">Yes, available next weekend. Generator included.</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={cn('rounded-2xl rounded-tr-sm p-3 max-w-[80%] ml-auto shadow-sm bg-foreground text-background')}>
            <div className="text-sm">Perfect, sending booking request now.</div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-2 pt-1">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
            <span className="text-xs text-muted-foreground">Host is typing…</span>
          </motion.div>
        </div>
      );
    case 'payment':
      return (
        <div className="w-full space-y-3">
          <div className="bg-background border border-border rounded-2xl p-4 shadow-sm">
            <div className="text-xs text-muted-foreground mb-2">Booking total</div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">3 days × $285</span><span className="text-foreground">$855</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Service fee</span><span className="text-foreground">$110</span></div>
              <div className="border-t border-border pt-1.5 flex justify-between font-semibold"><span className="text-foreground">Total</span><span className={accentClass}>$965</span></div>
            </div>
          </div>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-foreground text-background rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-4 h-4 opacity-60" />
              <span className="text-xs opacity-60">Held in payment protection</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">•••• 4242</span>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }} className="w-6 h-6 rounded-full bg-background/20 flex items-center justify-center">
                <span className="text-xs">✓</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      );
    case 'verified':
      return (
        <div className="w-full flex flex-col items-center justify-center text-center space-y-3">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200 }} className="w-24 h-24 rounded-full bg-foreground flex items-center justify-center shadow-xl">
            <ShieldCheck className="w-12 h-12 text-background" strokeWidth={2.2} />
          </motion.div>
          <div>
            <div className="text-base font-semibold text-foreground">Identity Verified</div>
            <div className="text-xs text-muted-foreground">through Vendibook identity verification</div>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
            {['Government ID', 'Selfie match', 'Address verified', 'Phone verified'].map((label) => (
              <div key={label} className="bg-background border border-border rounded-lg p-2 text-xs flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', accentClass.replace('text-', 'bg-'))} />
                <span className="text-foreground truncate">{label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'calendar':
      return (
        <div className="w-full">
          <div className="bg-background border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-foreground">November 2025</div>
              <Calendar className={cn('w-4 h-4', accentClass)} />
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 30 }).map((_, i) => {
                const isBooked = [4, 5, 12, 18, 19, 25].includes(i);
                const isToday = i === 14;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    className={cn(
                      'aspect-square rounded text-xs flex items-center justify-center',
                      isBooked ? `${accentClass.replace('text-', 'bg-')}/20 ${accentClass} font-medium` :
                      isToday ? 'bg-foreground text-background font-semibold' :
                      'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {i + 1}
                  </motion.div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className={cn('w-2 h-2 rounded', accentClass.replace('text-', 'bg-'))} />Booked</span>
            </div>
          </div>
        </div>
      );
    case 'photo':
      return (
        <div className="w-full">
          <div className="bg-background border border-border rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2"><Camera className={cn('w-4 h-4', accentClass)} /><span className="text-sm font-semibold text-foreground">Add photos</span></div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                  className="aspect-square rounded-lg bg-gradient-to-br from-foreground/20 to-foreground/5 flex items-center justify-center"
                >
                  {i < 4 ? <Truck className="w-5 h-5 text-foreground/40" /> : <span className="text-xl text-muted-foreground">+</span>}
                </motion.div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">4 of 10 photos uploaded</div>
          </div>
        </div>
      );
    case 'truck':
      return (
        <div className="w-full flex flex-col items-center space-y-4">
          <motion.div animate={{ x: [-20, 20, -20] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <Truck className={cn('w-24 h-24', accentClass)} strokeWidth={1.5} />
          </motion.div>
          <div className="bg-background border border-border rounded-xl px-4 py-2 text-sm font-medium text-foreground shadow-sm">
            En route to handoff
          </div>
        </div>
      );
    case 'payout':
      return (
        <div className="w-full space-y-3">
          <div className="text-xs font-medium text-muted-foreground">Earnings</div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-background border border-border rounded-2xl p-5 shadow-sm"
          >
            <div className="text-xs text-muted-foreground mb-1">Available balance</div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn('text-3xl font-bold', accentClass)}
            >
              $4,280.00
            </motion.div>
            <div className="text-xs text-muted-foreground mt-1">Auto-payout to •••• 8821</div>
          </motion.div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background border border-border rounded-xl p-3"><div className="text-xs text-muted-foreground">This month</div><div className="text-sm font-semibold text-foreground">$1,940</div></div>
            <div className="bg-background border border-border rounded-xl p-3"><div className="text-xs text-muted-foreground">Lifetime</div><div className="text-sm font-semibold text-foreground">$28,650</div></div>
          </div>
        </div>
      );
    case 'docs':
      return (
        <div className="w-full space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-1">Required documents</div>
          {[
            { label: 'Business license', status: 'approved' },
            { label: 'Liability insurance', status: 'approved' },
            { label: 'Health permit', status: 'pending' },
          ].map((doc, i) => (
            <motion.div
              key={doc.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-background border border-border rounded-xl p-3 flex items-center gap-3 shadow-sm"
            >
              <FileCheck className={cn('w-5 h-5', doc.status === 'approved' ? accentClass : 'text-muted-foreground')} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{doc.label}</div>
                <div className={cn('text-xs', doc.status === 'approved' ? accentClass : 'text-muted-foreground')}>
                  {doc.status === 'approved' ? '✓ Approved' : 'Pending review'}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );
    default:
      return null;
  }
};

export default ScrollWalkthrough;
