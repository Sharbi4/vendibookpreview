import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import vendibookLogo from '@/assets/vendibook-logo.svg';

export interface CheckoutChromeStep {
  step: number;
  label: string;
  short: string;
}

interface CheckoutChromeProps {
  steps: CheckoutChromeStep[];
  currentStep: number;
  onExit?: () => void;
  exitHref?: string;
  exitLabel?: string;
  children: ReactNode;
}

/**
 * Full-screen immersive checkout shell. Replaces the site header/footer
 * with a Vendibook logo, a "Secured & Protected" trust badge, and a
 * labeled progress bar with checkmarks for completed steps. Sits on the
 * app background so the wizard content owns the visual hierarchy.
 */
const CheckoutChrome = ({
  steps,
  currentStep,
  onExit,
  exitHref,
  exitLabel = 'Back',
  children,
}: CheckoutChromeProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top chrome — sticky */}
      <header
        role="banner"
        className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md"
      >
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{exitLabel}</span>
            </button>
          ) : exitHref ? (
            <Link
              to={exitHref}
              className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{exitLabel}</span>
            </Link>
          ) : null}

          <Link to="/" className="flex items-center gap-2 mx-auto sm:mx-0">
            <img src={vendibookLogo} alt="Vendibook" className="h-6 w-auto" />
          </Link>

          <div className="ml-auto hidden sm:flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">
              Secured & Protected
            </span>
            <span className="h-3 w-px bg-border/70" aria-hidden />
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="container max-w-6xl mx-auto px-4 pb-3">
          <ol
            role="list"
            aria-label="Checkout progress"
            className="flex items-center gap-1.5 sm:gap-3"
          >
            {steps.map((s, i) => {
              const isDone = s.step < currentStep;
              const isActive = s.step === currentStep;
              const isLast = i === steps.length - 1;
              return (
                <li
                  key={s.step}
                  className="flex-1 flex items-center gap-1.5 sm:gap-3 min-w-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        'flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-semibold shrink-0 transition-colors',
                        isDone && 'bg-primary text-primary-foreground',
                        isActive && 'bg-primary/15 text-primary border border-primary',
                        !isDone && !isActive && 'bg-muted text-muted-foreground border border-border',
                      )}
                    >
                      {isDone ? <Check className="h-3.5 w-3.5" /> : s.step}
                    </div>
                    <span
                      className={cn(
                        'text-[11px] sm:text-xs font-medium truncate',
                        isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      <span className="hidden sm:inline">{s.label}</span>
                      <span className="sm:hidden">{s.short}</span>
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={cn(
                        'flex-1 h-px transition-colors',
                        isDone ? 'bg-primary' : 'bg-border/60',
                      )}
                      aria-hidden
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <main className="flex-1 py-6">{children}</main>
    </div>
  );
};

export default CheckoutChrome;
