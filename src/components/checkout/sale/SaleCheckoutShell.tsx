import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SaleCheckoutStep {
  id: string;
  label: string;
}

interface SaleCheckoutShellProps {
  steps: SaleCheckoutStep[];
  currentIndex: number;
  exitHref: string;
  exitLabel?: string;
  /** Right-hand column (desktop only). Sticks under the header. */
  aside?: ReactNode;
  children: ReactNode;
}

/**
 * Light "gallery" checkout chrome that matches the redesigned for-sale
 * listing page: warm off-white canvas, white cards, charcoal text.
 * Everything inside inherits the `.sale-light` token scope.
 */
const SaleCheckoutShell = ({
  steps,
  currentIndex,
  exitHref,
  exitLabel = 'Back to listing',
  aside,
  children,
}: SaleCheckoutShellProps) => (
  <div className="sale-light min-h-dvh bg-[radial-gradient(1100px_520px_at_50%_-8%,hsl(var(--primary)/0.06),transparent_70%)]">
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-4">
          <Link
            to={exitHref}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg -ml-1 px-1 py-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{exitLabel}</span>
          </Link>

          <SaleStepper steps={steps} currentIndex={currentIndex} />

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Secure
          </span>
        </div>
      </div>
    </header>

    <main className="container max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="mb-8 sm:mb-10 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Vendibook checkout
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
          Complete your purchase
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          A few short steps — delivery, details, then payment. Nothing is charged until you confirm.
        </p>
      </div>
      <div className={cn('grid gap-8 lg:gap-12', aside ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : '')}>
        <div className="min-w-0 space-y-6">{children}</div>
        {aside ? (
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-4">{aside}</div>
          </aside>
        ) : null}
      </div>
    </main>
  </div>
);


const SaleStepper = ({ steps, currentIndex }: { steps: SaleCheckoutStep[]; currentIndex: number }) => (
  <ol className="flex items-center gap-2 sm:gap-3" aria-label="Checkout progress">
    {steps.map((s, i) => {
      const done = i < currentIndex;
      const active = i === currentIndex;
      return (
        <li key={s.id} className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-current={active ? 'step' : undefined}
              className={cn(
                'h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold transition-colors',
                done && 'bg-primary/12 text-primary ring-1 ring-primary/25',
                active && 'bg-primary text-primary-foreground',
                !done && !active && 'bg-muted text-muted-foreground ring-1 ring-border',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-xs font-medium whitespace-nowrap',
                active ? 'text-foreground' : 'text-muted-foreground',
                active ? 'inline' : 'hidden md:inline',
              )}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 ? (
            <span className={cn('h-px w-4 sm:w-8 rounded-full', done ? 'bg-primary/40' : 'bg-border')} />
          ) : null}
        </li>
      );
    })}
  </ol>
);

export default SaleCheckoutShell;
