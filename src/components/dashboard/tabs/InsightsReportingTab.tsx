import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, LineChart, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ListingInsightsPanel } from '../ListingInsightsPanel';

type SubView = 'insights' | 'reporting';

/**
 * Single merged tab replacing separate Insights + Reporting entries.
 * Reporting is a heavier route — we deep-link into it rather than duplicating.
 */
const InsightsReportingTab = () => {
  const [view, setView] = useState<SubView>('insights');

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insights & Reporting</h1>
          <p className="text-sm text-muted-foreground mt-1">Performance signals and revenue reports in one place.</p>
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden">
          {[
            { id: 'insights' as const, label: 'Insights', icon: BarChart3 },
            { id: 'reporting' as const, label: 'Reporting', icon: LineChart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 text-sm px-4 py-2 transition-colors',
                view === id ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {view === 'insights' ? (
        <ListingInsightsPanel />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h3 className="text-base font-medium text-foreground">Full revenue reporting</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Detailed monthly reports, payouts, and exports live on the reporting page.
            </p>
          </div>
          <Button asChild>
            <Link to="/host/reporting">Open reporting <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
      )}
    </div>
  );
};

export default InsightsReportingTab;
