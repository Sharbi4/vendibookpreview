import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type { ConciergeConfig } from '@/lib/concierge/api';

interface ConciergeTermsProps {
  config: ConciergeConfig;
  accepted: boolean;
  onAcceptedChange: (v: boolean) => void;
}

/**
 * Concise Concierge Service Terms shown before any charge. The acceptance
 * checkbox is never preselected and the agreement version, timestamp, IP and
 * user agent are recorded server-side when the order is created.
 */
const ConciergeTerms = ({ config, accepted, onAcceptedChange }: ConciergeTermsProps) => {
  const [open, setOpen] = useState(false);

  const points: Array<[string, string]> = [
    ['When work begins', 'Work starts after payment and a complete intake — not at purchase.'],
    [
      'Turnaround',
      `Our ${config.turnaround_business_days} business day estimate starts once your intake is complete. It is an estimate, not a deadline.`,
    ],
    [
      'Cancellation and refunds',
      'Cancel before we deliver your draft for a full refund. After the draft is delivered the fee has been earned and is non-refundable.',
    ],
    [
      'Revisions',
      `${config.included_revisions} revision is included. A revision changes the listing we drafted; a different item or a second listing is a new order.`,
    ],
    [
      'Your responsibility',
      'You confirm the information, photos and documents you give us are accurate and yours to share. We list what you tell us.',
    ],
    [
      'No guarantees',
      'This is a listing preparation service. We do not guarantee views, offers, a price, financing, a sale, or a timeline.',
    ],
    [
      'Abandoned orders',
      'If we cannot reach you for 60 days after requesting information, the order may be closed and the fee treated as earned.',
    ],
    ['Approval', 'Nothing publishes until you review and approve the draft yourself.'],
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">Concierge Service Terms</h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-primary underline underline-offset-2"
        >
          {open ? 'Hide' : 'Read'}
        </button>
      </div>

      {open && (
        <dl className="mt-4 space-y-3">
          {points.map(([term, detail]) => (
            <div key={term}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {term}
              </dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-foreground/90">{detail}</dd>
            </div>
          ))}
        </dl>
      )}

      {!open && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Work begins after payment and a complete intake. {config.included_revisions} revision
          included. Refundable until your draft is delivered. Nothing publishes without your
          approval. No results are guaranteed.
        </p>
      )}

      <div className="mt-4 flex items-start gap-3 border-t border-border/60 pt-4">
        <Checkbox
          id="concierge-terms"
          checked={accepted}
          onCheckedChange={(c) => onAcceptedChange(c === true)}
        />
        <label htmlFor="concierge-terms" className="cursor-pointer text-sm text-foreground">
          I have read and agree to the Concierge Service Terms ({config.terms_version}).
        </label>
      </div>
    </div>
  );
};

export default ConciergeTerms;
