import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Panel1Marketplace from './panels/Panel1Marketplace';
import Panel2Financing from './panels/Panel2Financing';
import Panel3HostTools from './panels/Panel3HostTools';
import Panel4Payments from './panels/Panel4Payments';
import { trackLeadEvent } from '@/lib/leadTracking';
import { cn } from '@/lib/utils';

const PANELS = [
  { key: 'marketplace', name: 'Marketplace Search', Component: Panel1Marketplace },
  { key: 'financing', name: 'Flexible Payment Options', Component: Panel2Financing },
  { key: 'host_tools', name: 'Host Tools', Component: Panel3HostTools },
  { key: 'payments', name: 'Secure Payments', Component: Panel4Payments },
] as const;

const ROTATE_MS = 8000;

const RotatingHero = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const dragStartX = useRef<number | null>(null);

  useEffect(() => {
    trackLeadEvent('hero_panel_viewed', {
      panel_name: PANELS[index].key,
      panel_index: index,
    });
  }, [index]);

  useEffect(() => {
    if (paused || reduce) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % PANELS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, reduce]);

  const go = (next: number, source: 'dot' | 'swipe' | 'key' = 'dot') => {
    const safe = (next + PANELS.length) % PANELS.length;
    setIndex(safe);
    setPaused(true);
    if (source === 'swipe') {
      trackLeadEvent('hero_panel_swiped', { panel_name: PANELS[safe].key });
    }
  };

  const Active = PANELS[index].Component;

  return (
    <section
      className="relative overflow-hidden bg-background"
      onMouseEnter={() => setPaused(true)}
      onFocusCapture={() => setPaused(true)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1, 'key');
        if (e.key === 'ArrowLeft') go(index - 1, 'key');
      }}
    >
      

      <div className="relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={PANELS[index].key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onPointerDown={(e) => {
              dragStartX.current = e.clientX;
            }}
            onPointerUp={(e) => {
              const start = dragStartX.current;
              dragStartX.current = null;
              if (start == null) return;
              const dx = e.clientX - start;
              if (Math.abs(dx) < 60) return;
              go(dx < 0 ? index + 1 : index - 1, 'swipe');
            }}
            className="touch-pan-y"
          >
            <Active />
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="relative z-20 flex items-center justify-center gap-2 pt-6 sm:pt-8 pb-6 sm:pb-8">
          {PANELS.map((p, i) => {
            const active = i === index;
            return (
              <button
                key={p.key}
                type="button"
                aria-label={`Show ${p.name}`}
                onClick={() => go(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 border border-white/10',
                  active
                    ? 'w-8 bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.55)]'
                    : 'w-2 bg-white/15 hover:bg-white/30'
                )}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RotatingHero;
