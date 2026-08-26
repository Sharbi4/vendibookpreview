import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, MessageSquare, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { SELF_SERVE_BENEFITS } from '@/config/listingConcierge';

const VENDI_BENEFITS = [
  'Answer simple questions in a chat — no forms to hunt through',
  'Watch your listing build itself in a live preview',
  'Photos, pricing and location handled as you go',
  'Free, self-serve, and you stay in control before publishing',
];

interface ChoiceCardProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  blurb: string;
  benefits: string[];
  cta: string;
  onClick: () => void;
  emphasis?: boolean;
  footnote?: string;
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({
  icon,
  title,
  badge,
  blurb,
  benefits,
  cta,
  onClick,
  emphasis,
  footnote,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35 }}
    className={`relative flex flex-col rounded-3xl border bg-card p-6 sm:p-8 ${
      emphasis
        ? 'border-primary/30 shadow-[0_1px_2px_rgba(24,20,16,0.04),0_18px_40px_-28px_rgba(24,20,16,0.35)]'
        : 'border-border shadow-[0_1px_2px_rgba(24,20,16,0.04)]'
    }`}
  >
    <div className="mb-5 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-foreground">
        {icon}
      </span>
      {badge && (
        <span className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
          {badge}
        </span>
      )}
    </div>

    <h2 className="text-xl font-semibold text-foreground sm:text-2xl">{title}</h2>
    <p className="mt-1 text-base font-semibold text-foreground">Free</p>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{blurb}</p>

    <ul className="mt-5 flex-1 space-y-2.5">
      {benefits.map((b) => (
        <li key={b} className="flex items-start gap-2 text-sm text-foreground/90">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{b}</span>
        </li>
      ))}
    </ul>

    <Button
      size={emphasis ? 'cta' : 'lg'}
      variant={emphasis ? 'cta' : 'outline'}
      onClick={onClick}
      className={emphasis ? 'mt-7 w-full' : 'mt-7 h-12 w-full rounded-2xl text-base'}
    >
      {cta}
      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
    </Button>

    {footnote && <p className="mt-3 text-center text-xs text-muted-foreground">{footnote}</p>}
  </motion.div>
);

interface ListingPathChoiceProps {
  /** Called when the visitor picks the manual wizard. */
  onChooseManual: () => void;
  /** Query string (mode/category) carried into the Vendi builder. */
  search?: string;
}

/**
 * The first screen of the listing flow: assisted "List with Vendi" (recommended)
 * or the existing manual wizard. Never buried behind Concierge.
 */
const ListingPathChoice: React.FC<ListingPathChoiceProps> = ({ onChooseManual, search = '' }) => {
  const navigate = useNavigate();

  const chooseVendi = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_vendi_selected' });
    navigate(`/list-with-vendi${search || ''}`);
  };

  const chooseManual = () => {
    trackEvent({ category: 'Supply', action: 'listing_path_self_selected' });
    onChooseManual();
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <ChoiceCard
        icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
        title="List with Vendi"
        badge="Recommended"
        blurb="Vendi asks a few plain-English questions and builds your listing with you, live, as you answer."
        benefits={VENDI_BENEFITS}
        cta="Start with Vendi"
        onClick={chooseVendi}
        emphasis
        footnote="Free. Nothing publishes until you confirm."
      />

      <ChoiceCard
        icon={<PencilLine className="h-5 w-5" aria-hidden="true" />}
        title="Build it myself"
        blurb="Prefer the classic step-by-step form? Use the full listing wizard exactly as it is today."
        benefits={SELF_SERVE_BENEFITS}
        cta="Use the step-by-step wizard"
        onClick={chooseManual}
      />
    </div>
  );
};

export default ListingPathChoice;
