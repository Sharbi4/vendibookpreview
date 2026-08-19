/**
 * Shared "Learn more" overlay for pricing plans and add-ons.
 *
 * Presentation only — every price/cadence value is passed in from the live
 * monetization catalog and the primary CTA is the caller's existing checkout
 * action. No billing or entitlement logic lives here.
 */
import * as React from 'react';
import { Check } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface PlanDetailsDialogProps {
  /** Product / plan name. */
  title: string;
  /** Dynamic price + cadence, e.g. "$79/month" or "$49 · 30 days". */
  priceLabel: string;
  /** One or two sentences. */
  summary: string;
  /** Bullet list of what the buyer actually gets. */
  included: string[];
  /** Short "who it's best for" line. */
  bestFor: string;
  /** Billing type / cadence line, e.g. "Recurring monthly · cancel anytime". */
  billing: string;
  /** Limits and fine print. */
  finePrint?: string[];
  /** Status chip shown instead of price emphasis, e.g. "Included with Vendibook Pro". */
  statusLabel?: string | null;
  /** The caller's existing primary CTA, rendered at the bottom. */
  footer?: React.ReactNode;
  /** Trigger label — defaults to "Learn more". */
  triggerLabel?: string;
  className?: string;
}

export function PlanDetailsDialog({
  title,
  priceLabel,
  summary,
  included,
  bestFor,
  billing,
  finePrint,
  statusLabel,
  footer,
  triggerLabel = 'Learn more',
  className,
}: PlanDetailsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`text-[13px] font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline ${className ?? ''}`}
        >
          {triggerLabel}
        </button>
      </DialogTrigger>

      <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(24,20,16,0.35)] backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className="fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 border duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sale-light max-h-[88vh] max-w-lg overflow-y-auto rounded-3xl border-[rgba(24,20,16,0.09)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_1px_2px_rgba(24,20,16,0.05),0_40px_80px_-40px_rgba(24,20,16,0.45)] backdrop-blur-2xl sm:p-8"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-[20px] font-semibold tracking-tight text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-relaxed text-muted-foreground">
            {summary}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[rgba(24,20,16,0.1)] bg-[rgba(24,20,16,0.03)] px-3 py-1.5 text-[13px] font-medium text-foreground">
            {priceLabel}
          </span>
          {statusLabel ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--brand-ember)/0.3)] bg-[hsl(var(--brand-ember)/0.08)] px-3 py-1.5 text-[12.5px] font-medium text-foreground">
              <Check className="h-3.5 w-3.5 text-[hsl(var(--brand-ember))]" />
              {statusLabel}
            </span>
          ) : null}
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            What&rsquo;s included
          </p>
          <ul className="mt-3 space-y-2.5">
            {included.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 text-[13.5px] leading-relaxed text-foreground/85"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--brand-ember))]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-2xl bg-[rgba(24,20,16,0.028)] p-4">
          <div>
            <p className="text-[12px] font-medium text-foreground">Best for</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{bestFor}</p>
          </div>
          <div>
            <p className="text-[12px] font-medium text-foreground">Billing</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{billing}</p>
          </div>
        </div>

        {finePrint?.length ? (
          <ul className="space-y-1.5">
            {finePrint.map((line) => (
              <li key={line} className="text-[12.5px] leading-relaxed text-muted-foreground">
                {line}
              </li>
            ))}
          </ul>
        ) : null}

        {footer ? <div className="pt-1">{footer}</div> : null}

        <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </Dialog>
  );
}

export default PlanDetailsDialog;