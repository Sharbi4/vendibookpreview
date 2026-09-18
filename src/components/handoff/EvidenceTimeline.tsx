import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EvidenceEvent } from '@/hooks/useHandoff';

const statusTone = (status?: string | null) => {
  if (!status) return 'bg-muted text-muted-foreground border-border';
  if (['completed', 'accepted', 'synced', 'verified', 'delivered'].includes(status))
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  if (['issue_reported', 'failed', 'cancelled', 'revoked'].includes(status))
    return 'bg-destructive/10 text-destructive border-destructive/30';
  if (['accepted_with_exceptions', 'not_configured', 'pending'].includes(status))
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30';
  return 'bg-foreground/5 text-foreground/70 border-border';
};

interface Props {
  events: EvidenceEvent[];
  verified?: boolean;
}

export default function EvidenceTimeline({ events, verified }: Props) {
  if (!events.length) {
    return (
      <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        No fulfillment or handoff evidence has been recorded for this transaction yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {verified && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-medium">Vendibook Verified Handoff</p>
            <p className="text-sm text-muted-foreground">
              Fulfillment and handoff were documented through Vendibook.
            </p>
          </div>
        </div>
      )}

      <ol className="relative space-y-4 border-l border-border pl-5">
        {events.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full border border-border bg-background" />
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium leading-tight">{e.title}</p>
              {e.status && (
                <Badge variant="outline" className={statusTone(e.status)}>
                  {e.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            {e.detail && <p className="mt-1 text-sm text-muted-foreground">{e.detail}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(e.occurred_at).toLocaleString()}
              {e.actor_role ? ` · ${e.actor_role}` : ''}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
