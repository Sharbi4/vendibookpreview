import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, Wrench, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import conciergeImage from '@/assets/concierge-kitchen.jpg';

const STORAGE_KEY = 'smart_concierge_dismissed';
const SCROLL_THRESHOLD = 0.3; // 30% of page
const FALLBACK_DELAY_MS = 30000; // 30s fallback if page isn't scrollable

const BENEFITS = [
  'Answer a few plain-English questions',
  'Watch your listing build itself live',
  'Publish free — no listing fees, ever',
];

/**
 * Homepage invitation to "List with Vendi" — the free, self-serve guided
 * listing builder. This is intentionally NOT a lead form and NOT a human
 * concierge handoff; paid Concierge lives separately at /list/concierge.
 */
const SmartConciergeModal = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setIsOpen(true);
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(fallbackTimer);
    };

    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      if (window.scrollY / scrollable >= SCROLL_THRESHOLD) trigger();
    };

    const fallbackTimer = setTimeout(trigger, FALLBACK_DELAY_MS);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const go = (path: string) => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsOpen(false);
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismiss}
          role="dialog"
          aria-modal="true"
          aria-label="List with Vendi"
        >
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-2 text-foreground backdrop-blur transition hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative h-36 w-full overflow-hidden sm:h-44">
              <img src={conciergeImage} alt="" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
            </div>

            <div className="px-6 pb-6 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Wand2 className="h-3.5 w-3.5" /> Free · New
              </span>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">List with Vendi</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Have a truck, trailer, kitchen, or vendor space? Vendi walks you through it in a
                short conversation and builds the listing as you talk.
              </p>

              <ul className="mt-4 space-y-2">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => go('/list-with-vendi')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Wand2 className="h-4 w-4" /> Start with Vendi
                </button>
                <button
                  type="button"
                  onClick={() => go('/list')}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold transition hover:bg-muted"
                >
                  <Wrench className="h-4 w-4" /> Build it myself
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SmartConciergeModal;
