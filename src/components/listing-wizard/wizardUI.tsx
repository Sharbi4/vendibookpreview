import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Wizard-only layout & style primitives.
 * Keeps premium "black-glass" styling in one place instead of duplicating
 * long class strings across the seven listing steps.
 */

export const wizardClasses = {
  /** Primary glass panel (form workspace, sidebar cards) */
  panel:
    'rounded-[22px] border-2 border-border/15 bg-card/70 backdrop-blur-xl shadow-[0_1px_0_0_hsl(0_0%_100%/0.05)_inset,0_18px_45px_-25px_rgb(0_0_0/0.9)]',
  /** Secondary sub-card used to break long forms into sections */
  subPanel:
    'rounded-[18px] border-2 border-border/10 bg-background/40 shadow-[0_10px_30px_-24px_rgb(0_0_0/0.9)]',
  /** Selectable choice tile, unselected */
  tile:
    'relative w-full text-left rounded-[18px] border-2 border-border/15 bg-card/60 p-5 transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-border/30 hover:bg-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none motion-reduce:hover:translate-y-0',
  /** Selectable choice tile, selected */
  tileSelected:
    'border-primary bg-primary/10 -translate-y-0.5 shadow-[0_16px_40px_-24px_hsl(var(--primary)/0.8)]',
  /** Glossy black primary action */
  glossyAction:
    'bg-[linear-gradient(180deg,hsl(0_0%_18%),hsl(0_0%_8%))] border-2 border-border/20 text-foreground hover:border-border/35',
  eyebrow:
    'text-[11px] font-semibold uppercase tracking-[0.16em] text-primary',
} as const;

interface WizardPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const WizardPanel: React.FC<WizardPanelProps> = ({ className, children, ...rest }) => (
  <div className={cn(wizardClasses.panel, className)} {...rest}>
    {children}
  </div>
);

interface SectionCardProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Titled sub-card so long steps don't read as one giant form. */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon,
  action,
  className,
  children,
}) => (
  <section className={cn(wizardClasses.subPanel, 'p-5 sm:p-6', className)}>
    {(title || action) && (
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-border/15 bg-card/70 text-primary">
              {icon}
            </span>
          )}
          <div>
            {title && <h3 className="text-base font-semibold leading-tight">{title}</h3>}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {action}
      </header>
    )}
    {children}
  </section>
);

interface StepIntroProps {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  className?: string;
}

/** Consistent intro block: eyebrow, human headline, one reassurance line. */
export const StepIntro: React.FC<StepIntroProps> = ({
  step,
  totalSteps,
  title,
  description,
  className,
}) => (
  <div className={cn('mb-6 border-b-2 border-border/10 pb-5', className)}>
    <p className={wizardClasses.eyebrow}>
      Step {step} of {totalSteps}
    </p>
    <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>
    {description && (
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">{description}</p>
    )}
  </div>
);

/** Small required / optional marker used consistently across steps. */
export const FieldFlag: React.FC<{ required?: boolean }> = ({ required }) => (
  <span
    className={cn(
      'ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
      required
        ? 'border-primary/40 bg-primary/10 text-primary'
        : 'border-border/20 bg-muted/40 text-muted-foreground',
    )}
  >
    {required ? 'Required' : 'Optional'}
  </span>
);

export interface StepMeta {
  /** Short label used by the stepper */
  label: string;
  /** Human headline for the step intro */
  title: string;
  /** One short reassurance sentence */
  description: string;
}

export const STEP_META: StepMeta[] = [
  {
    label: 'Type',
    title: "Let's build a listing buyers can trust.",
    description: 'Start by telling us what you have and how you want to offer it.',
  },
  {
    label: 'Details',
    title: 'Describe what makes it worth booking.',
    description: 'Specific details win. Your draft saves automatically as you type.',
  },
  {
    label: 'Pricing',
    title: 'Set pricing you feel good about.',
    description: 'We show your estimated payout so there are no surprises later.',
  },
  {
    label: 'Location',
    title: 'Where can people find it?',
    description: 'Your exact address stays private until a booking is confirmed.',
  },
  {
    label: 'Documents',
    title: 'Decide what you need from guests.',
    description: 'Ask only for what protects you — fewer documents means faster bookings.',
  },
  {
    label: 'Media',
    title: 'Show it in its best light.',
    description: 'Great photos are the single biggest driver of inquiries.',
  },
  {
    label: 'Review',
    title: 'One last look before it goes live.',
    description: 'You can review everything here, and edit anytime after publishing.',
  },
];
