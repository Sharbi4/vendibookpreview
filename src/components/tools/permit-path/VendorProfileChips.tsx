import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface VendorProfile {
  alcohol?: 'yes' | 'no';
  frying?: 'yes' | 'no';
  multi_jurisdiction?: 'yes' | 'no';
  employees?: 'yes' | 'no';
  commissary?: 'yes' | 'no' | 'unsure';
  prep_style?: 'prepackaged' | 'cook_to_order';
}

interface Props {
  value: VendorProfile;
  onChange: (next: VendorProfile) => void;
}

const QUESTIONS: Array<{
  key: keyof VendorProfile;
  label: string;
  options: Array<{ value: string; label: string }>;
}> = [
  { key: 'alcohol',            label: 'Do you serve alcohol?',          options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
  { key: 'frying',             label: 'Fry or cook with grease?',       options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] },
  { key: 'multi_jurisdiction', label: 'Operate in 2+ cities/counties?', options: [{ value: 'no', label: 'One area' }, { value: 'yes', label: 'Multiple' }] },
  { key: 'employees',          label: 'Hiring employees?',              options: [{ value: 'no', label: 'Just me' }, { value: 'yes', label: 'Yes' }] },
  { key: 'commissary',         label: 'Have a commissary yet?',         options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unsure', label: 'Not sure' }] },
  { key: 'prep_style',         label: 'Prep style?',                    options: [{ value: 'cook_to_order', label: 'Cooked-to-order' }, { value: 'prepackaged', label: 'Prepackaged' }] },
];

export default function VendorProfileChips({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const answered = Object.values(value).filter(Boolean).length;

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#FF5124]/30 to-[#FF5124]/5 border border-[#FF5124]/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-[#FF7A52]" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-white">Refine your roadmap (optional)</div>
          <div className="text-xs text-white/55">
            {answered > 0 ? `${answered} of ${QUESTIONS.length} answered` : 'Tell us a bit more so we can branch your requirements'}
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-white/45 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/5">
              {QUESTIONS.map((q) => (
                <div key={q.key} className="flex flex-wrap items-center gap-2">
                  <div className="text-xs text-white/70 mr-1 min-w-[170px]">{q.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt) => {
                      const active = value[q.key] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            onChange({ ...value, [q.key]: active ? undefined : (opt.value as any) })
                          }
                          className={cn(
                            'text-xs px-2.5 py-1 rounded-full border transition-all',
                            active
                              ? 'bg-[#FF5124] border-[#FF5124] text-white shadow-[0_4px_14px_-4px_rgba(255,81,36,0.6)]'
                              : 'bg-white/5 border-white/10 text-white/70 hover:border-white/25 hover:text-white',
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-white/40 pt-1">
                Skip any question you're unsure about — we'll assume the safer requirement.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
