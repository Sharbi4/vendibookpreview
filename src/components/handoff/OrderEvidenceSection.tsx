import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useHandoffContext } from '@/hooks/useHandoff';
import EvidenceTimeline from './EvidenceTimeline';

interface Props {
  saleTransactionId?: string | null;
  bookingId?: string | null;
}

/** "Evidence & Handoff" panel shown on the order / transaction detail page. */
export default function OrderEvidenceSection({ saleTransactionId, bookingId }: Props) {
  const { data, isLoading } = useHandoffContext(saleTransactionId ?? null, bookingId ?? null);
  if (!saleTransactionId && !bookingId) return null;

  const completed = !!data?.handoff_sessions?.some((h) => h.status === 'completed');
  const href = saleTransactionId ? `/handoff/sale/${saleTransactionId}` : `/handoff/booking/${bookingId}`;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Evidence &amp; Handoff
        </h2>
        <Button asChild size="sm" variant="outline">
          <Link to={href}>
            {completed ? 'View handoff record' : 'Open handoff'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        Fulfillment and handoff were documented through Vendibook.
      </p>

      <div className="mt-4">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <EvidenceTimeline events={data?.evidence ?? []} verified={completed} />
        )}
      </div>
    </Card>
  );
}
