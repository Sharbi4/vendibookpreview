/**
 * AgreedTermsPanel — read-only block that renders the immutable
 * transaction_terms snapshot a sale row agreed to at checkout.
 *
 * Used in dispute-resolution + refund UIs so admin and both parties see
 * the SAME numbers, cancellation copy, and acknowledgements the buyer
 * signed off on — never re-derived from live listing pricing.
 *
 * The snapshot key naming is unfortunately mixed:
 *   - client-side buildTerms writes `amountCents`
 *   - server-side create-cash-sale writes `amount_cents`
 * Both variants are normalized here so the component works regardless
 * of which path created the row.
 */
import { FileText, ShieldCheck, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSaleTerms, type AgreedTermsRow } from '@/hooks/useSaleTerms';

interface Props {
  saleId: string | null | undefined;
  termsId: string | null | undefined;
  /** Compact rendering for cards; default false = full panel with headings */
  compact?: boolean;
}

interface NormalizedLine {
  label: string;
  amountCents: number;
  kind: string;
  hint?: string;
}

const formatCents = (cents: number | null | undefined): string => {
  const n = Number(cents ?? 0) / 100;
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const normalizeLines = (terms: AgreedTermsRow): NormalizedLine[] => {
  const raw = (terms.snapshot?.pricing?.lines ?? []) as any[];
  return raw
    .map((l) => ({
      label: String(l?.label ?? ''),
      amountCents: Number(l?.amountCents ?? l?.amount_cents ?? 0),
      kind: String(l?.kind ?? 'base'),
      hint: l?.hint ? String(l.hint) : undefined,
    }))
    .filter((l) => l.label);
};

const AgreedTermsPanel = ({ saleId, termsId, compact = false }: Props) => {
  const { data: terms, isLoading, isError } = useSaleTerms(saleId, termsId);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    );
  }

  if (isError || !terms) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground flex items-start gap-2">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          Agreed terms snapshot unavailable for this sale. The
          transaction pre-dates the immutable terms ledger.
        </span>
      </div>
    );
  }

  const lines = normalizeLines(terms);
  const totalCents =
    Number(terms.total_cents ?? terms.snapshot?.pricing?.totalCents ?? terms.snapshot?.pricing?.total_cents ?? 0);
  const cancellation: string | null =
    terms.snapshot?.policies?.cancellation ?? null;
  const acknowledgements: string[] = Array.isArray(
    terms.snapshot?.policies?.acknowledgements,
  )
    ? (terms.snapshot.policies.acknowledgements as string[])
    : [];
  const paymentMethod = terms.payment_method ?? terms.snapshot?.payment_method ?? null;
  const termsVersion = terms.terms_version ?? terms.snapshot?.termsVersion ?? terms.snapshot?.version ?? null;

  return (
    <div className={`rounded-lg border border-border/60 bg-card p-4 ${compact ? 'space-y-2' : 'space-y-3'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>
            What buyer and seller agreed to
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {paymentMethod && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {paymentMethod.replace(/_/g, ' ')}
            </Badge>
          )}
          {termsVersion && (
            <Badge variant="secondary" className="text-[10px]">
              Terms {termsVersion}
            </Badge>
          )}
        </div>
      </div>

      {lines.length > 0 ? (
        <table className="w-full text-sm">
          <tbody>
            {lines.map((l, i) => (
              <tr
                key={i}
                className={l.kind === 'total' ? 'font-semibold border-t border-border/60' : ''}
              >
                <td className="py-1 text-muted-foreground">
                  {l.label}
                  {l.hint && !compact && (
                    <div className="text-xs text-muted-foreground/80 mt-0.5">{l.hint}</div>
                  )}
                </td>
                <td className="py-1 text-right tabular-nums">{formatCents(l.amountCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-sm text-muted-foreground flex justify-between">
          <span>Total agreed</span>
          <span className="tabular-nums font-medium text-foreground">{formatCents(totalCents)}</span>
        </div>
      )}

      {cancellation && !compact && (
        <div className="text-xs text-muted-foreground border-t border-border/60 pt-2">
          <div className="font-medium text-foreground mb-0.5">Cancellation policy</div>
          <div>{cancellation}</div>
        </div>
      )}

      {acknowledgements.length > 0 && !compact && (
        <div className="text-xs text-muted-foreground">
          <div className="font-medium text-foreground mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acknowledgements
          </div>
          <ul className="list-disc pl-4 space-y-0.5">
            {acknowledgements.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {terms.acknowledged_at && !compact && (
        <div className="text-[11px] text-muted-foreground/80 border-t border-border/60 pt-2">
          Acknowledged at{' '}
          {new Date(terms.acknowledged_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
          {terms.resolvedVia === 'sale_transaction_id' && (
            <span className="ml-2 italic">· legacy lookup</span>
          )}
        </div>
      )}
    </div>
  );
};

export default AgreedTermsPanel;
