import { Link } from 'react-router-dom';
import { Check, ArrowRight, CreditCard, Shield, Truck, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface OnboardingChecklistProps {
  isStripeConnected: boolean;
  isIdentityVerified: boolean;
  hasPublishedListing: boolean;
  hasFirstBooking: boolean;
  onConnectStripe?: () => void;
}

interface Step {
  id: string;
  label: string;
  icon: typeof Truck;
  done: boolean;
  href?: string;
  onClick?: () => void;
}

/**
 * Host activation progress card. Auto-hides once all 4 steps are done
 * to avoid cluttering experienced hosts.
 */
export const OnboardingChecklist = ({
  isStripeConnected,
  isIdentityVerified,
  hasPublishedListing,
  hasFirstBooking,
  onConnectStripe,
}: OnboardingChecklistProps) => {
  const steps: Step[] = [
    {
      id: 'stripe',
      label: 'Connect payouts',
      icon: CreditCard,
      done: isStripeConnected,
      onClick: !isStripeConnected ? onConnectStripe : undefined,
    },
    {
      id: 'verify',
      label: 'Verify identity',
      icon: Shield,
      done: isIdentityVerified,
      href: '/verify-identity',
    },
    {
      id: 'listing',
      label: 'Publish first listing',
      icon: Truck,
      done: hasPublishedListing,
      href: '/list?start=true',
    },
    {
      id: 'booking',
      label: 'Get first booking',
      icon: Calendar,
      done: hasFirstBooking,
      href: '/host/listings',
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const percent = Math.round((completed / total) * 100);

  // Hide once fully complete
  if (completed === total) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Get set up</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completed} of {total} steps complete
          </p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">
          {percent}%
        </span>
      </div>

      <Progress value={percent} className="h-1.5 mb-4" />

      <ul className="space-y-1">
        {steps.map((step) => {
          const Icon = step.icon;
          const content = (
            <div
              className={cn(
                'flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg transition-colors',
                !step.done && 'hover:bg-muted/50 cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'shrink-0 w-7 h-7 rounded-full flex items-center justify-center',
                  step.done
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span
                className={cn(
                  'flex-1 text-sm',
                  step.done
                    ? 'text-muted-foreground line-through'
                    : 'text-foreground font-medium'
                )}
              >
                {step.label}
              </span>
              {!step.done && (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
            </div>
          );

          if (step.done) return <li key={step.id}>{content}</li>;
          if (step.href) {
            return (
              <li key={step.id}>
                <Link to={step.href}>{content}</Link>
              </li>
            );
          }
          return (
            <li key={step.id}>
              <button type="button" onClick={step.onClick} className="w-full text-left">
                {content}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default OnboardingChecklist;
