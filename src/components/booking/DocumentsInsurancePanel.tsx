import { FileCheck, ShieldCheck, Clock, AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { EvaluatedRequirement, RequirementEvaluation } from '@/lib/documents/requirements';

const STATUS_META: Record<
  EvaluatedRequirement['status'],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  not_submitted: { label: 'Not submitted', icon: CircleDashed, className: 'bg-muted text-muted-foreground border-border' },
  submitted: { label: 'Submitted', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  under_review: { label: 'Under review', icon: Clock, className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Needs attention', icon: AlertTriangle, className: 'bg-red-50 text-red-700 border-red-200' },
  waived: { label: 'Waived by host', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function InsuranceDetails({ item }: { item: EvaluatedRequirement }) {
  const ins = item.insurance;
  if (!ins) return null;
  const lines: string[] = [];
  if (ins.minimum_general_liability) {
    lines.push(`Minimum general liability $${Number(ins.minimum_general_liability).toLocaleString()}`);
  }
  if (ins.additional_insured_required) lines.push('Host listed as additional insured');
  if (ins.coi_required) lines.push('Certificate of insurance (COI) required');
  if (ins.must_span_booking_dates) lines.push('Coverage must span your booking dates');
  if (ins.instructions) lines.push(String(ins.instructions));
  if (!lines.length) return null;

  return (
    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
      {lines.map((l) => (
        <li key={l} className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renter-facing "Documents & insurance" section. Renders nothing at all when
 * the host configured no requirements — no empty compliance UI, no friction.
 */
export function DocumentsInsurancePanel({
  evaluation,
  className,
  heading = 'Documents & insurance',
}: {
  evaluation: RequirementEvaluation;
  className?: string;
  heading?: string;
}) {
  if (!evaluation.hasRequirements) return null;

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-5', className)}>
      <div className="flex items-center gap-2">
        <FileCheck className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">{heading}</h3>
        {evaluation.outstandingRequiredCount > 0 && (
          <Badge variant="outline" className="ml-auto border-amber-200 bg-amber-50 text-amber-700">
            {evaluation.outstandingRequiredCount} outstanding
          </Badge>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        These are this host's requirements for the rental.
      </p>

      <div className="mt-4 space-y-3">
        {evaluation.items.map((item) => {
          const meta = STATUS_META[item.status];
          const Icon = meta.icon;
          return (
            <div
              key={item.requirement.id}
              className="rounded-xl border border-border/70 bg-background/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {item.label}
                    {!item.requirement.is_required && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
                    )}
                  </p>
                  {(item.requirement.instructions || item.requirement.description) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.requirement.instructions || item.requirement.description}
                    </p>
                  )}
                  <InsuranceDetails item={item} />
                  {item.status === 'rejected' && item.upload?.rejection_reason && (
                    <p className="mt-2 text-xs text-red-600">{item.upload.rejection_reason}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant="outline" className={cn('gap-1 text-xs', meta.className)}>
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{item.dueLabel}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {evaluation.bookingBlockers.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {evaluation.bookingBlockers.length === 1
              ? `${evaluation.bookingBlockers[0].label} is due before this booking can be confirmed.`
              : `${evaluation.bookingBlockers.length} documents are due before this booking can be confirmed.`}
          </span>
        </div>
      )}
    </section>
  );
}

export default DocumentsInsurancePanel;
