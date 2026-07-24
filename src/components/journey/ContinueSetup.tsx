import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResumeItem {
  id: string;
  title: string;
  /** Short user-friendly step name, e.g. "Add photos". */
  nextStep: string;
  /** Optional friendly time string, e.g. "Saved 2 hours ago". */
  savedAt?: string;
  href: string;
  /** Higher = more important. Sorted desc. */
  priority?: number;
  /** Optional friendly progress %, 0–100. */
  progress?: number;
}

interface Props {
  items: ResumeItem[];
  /** Cap to prevent overwhelming the dashboard. Default 3. */
  limit?: number;
  className?: string;
  heading?: string;
}

/**
 * Save-and-resume dashboard surface. Shows incomplete workflows in priority order
 * with reassuring "still here" copy, matching the Satin Lux palette.
 */
export function ContinueSetup({
  items,
  limit = 3,
  className,
  heading = 'Continue setup',
}: Props) {
  const sorted = [...items]
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, limit);

  if (sorted.length === 0) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-4 md:p-5',
        className,
      )}
      aria-label={heading}
    >
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/12 text-primary">
            <Save className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h2 className="text-sm font-semibold text-foreground">{heading}</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">
          Progress saved automatically
        </span>
      </header>

      <ul className="space-y-2">
        {sorted.map((item) => (
          <li key={item.id}>
            <Link
              to={item.href}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 hover:bg-background/70 hover:border-border transition-colors px-3.5 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {item.title}
                  </span>
                  {item.savedAt && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Clock3 className="h-3 w-3" aria-hidden />
                      {item.savedAt}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  Next: <span className="text-foreground/80">{item.nextStep}</span>
                </p>
                {typeof item.progress === 'number' && (
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden" aria-hidden>
                    <div
                      className="h-full bg-primary transition-[width]"
                      style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }}
                    />
                  </div>
                )}
              </div>
              <ArrowRight
                className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default ContinueSetup;
