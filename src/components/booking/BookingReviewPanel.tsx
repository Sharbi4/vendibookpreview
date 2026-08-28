import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CalendarDays,
  Clock,
  FileCheck,
  Info,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Truck,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/commissions';
import { cn } from '@/lib/utils';

/**
 * Premium review surface — the last read-only look before payment.
 *
 * Every number here is presentational only. Fees, tax and totals are computed
 * upstream and re-locked server-side at order creation; the security deposit is
 * shown explicitly as NOT part of today's charge unless the host collects it
 * through Vendibook.
 */

export interface ReviewPriceLine {
  label: string;
  /** Formatted value; pass a string for "Calculating…" style states. */
  value: string;
  hint?: string;
  muted?: boolean;
}

export interface BookingReviewPanelProps {
  /** Rate description, e.g. "$450 × 3 days" */
  rateLabel: string;
  subtotal: number;
  deliveryFee?: number;
  serviceFee: number;
  serviceFeeHint?: string;
  taxLine: ReviewPriceLine | null;
  totalToday: number;
  /** Null when the host does not collect a deposit. */
  depositAmount: number | null;
  depositChargedToday?: boolean;

  bookingMode: 'instant' | 'request';
  dateLabel: string;
  durationLabel: string;
  timeLabel?: string | null;
  slotName?: string | null;

  fulfillment: string;
  fulfillmentDetail?: string | null;
  handoffFacts?: Array<{ label: string; value: string }>;

  documents: {
    required: number;
    satisfied: number;
    onFile: boolean;
  } | null;

  disclosures: {
    attestedAt: string | null;
    documentVersion: string | null;
    identityStatus: string | null;
    insuranceAnswer: 'yes' | 'no' | 'unsure' | null;
  } | null;

  cancellationPolicy: React.ReactNode;
  listingId?: string;

  message: string;
  onMessageChange: (value: string) => void;
}

const Section = ({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: React.ElementType;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-[0_1px_2px_rgba(24,20,16,0.04)]">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Row = ({
  label,
  value,
  hint,
  muted,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  muted?: boolean;
  strong?: boolean;
}) => (
  <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
    <span className={cn('text-muted-foreground', strong && 'font-semibold text-foreground')}>
      {label}
      {hint && <span className="block text-xs text-muted-foreground/80">{hint}</span>}
    </span>
    <span
      className={cn(
        'shrink-0 text-right font-medium tabular-nums',
        muted && 'text-muted-foreground font-normal',
        strong && 'text-base font-semibold',
      )}
    >
      {value}
    </span>
  </div>
);

export function BookingReviewPanel({
  rateLabel,
  subtotal,
  deliveryFee = 0,
  serviceFee,
  serviceFeeHint,
  taxLine,
  totalToday,
  depositAmount,
  depositChargedToday = false,
  bookingMode,
  dateLabel,
  durationLabel,
  timeLabel,
  slotName,
  fulfillment,
  fulfillmentDetail,
  handoffFacts = [],
  documents,
  disclosures,
  cancellationPolicy,
  listingId,
  message,
  onMessageChange,
}: BookingReviewPanelProps) {
  const docsComplete =
    !documents || documents.onFile || documents.satisfied >= documents.required;

  return (
    <div className="space-y-4">
      {/* Booking mode */}
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border p-4',
          bookingMode === 'instant'
            ? 'border-primary/30 bg-primary/5'
            : 'border-border/70 bg-muted/30',
        )}
      >
        {bookingMode === 'instant' ? (
          <Zap className="mt-0.5 h-4 w-4 text-primary" />
        ) : (
          <Clock className="mt-0.5 h-4 w-4 text-muted-foreground" />
        )}
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">
            {bookingMode === 'instant' ? 'Instant booking' : 'Request to book'}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {bookingMode === 'instant'
              ? 'Your dates are confirmed as soon as the payment completes.'
              : 'Your payment is processed and your dates are held. If the host declines or does not respond, Vendibook refunds your original payment method.'}
          </p>
        </div>
      </div>

      {/* Reservation */}
      <Section icon={CalendarDays} title="Your reservation">
        <div className="divide-y divide-border/60">
          {slotName && <Row label="Space" value={slotName} />}
          <Row label="Dates" value={dateLabel} />
          {timeLabel && <Row label="Time" value={timeLabel} />}
          <Row label="Duration" value={durationLabel} />
        </div>
      </Section>

      {/* Price breakdown */}
      <Section icon={Info} title="Price breakdown">
        <div className="divide-y divide-border/60">
          <Row label={rateLabel} value={formatCurrency(subtotal - deliveryFee)} />
          {deliveryFee > 0 && <Row label="Delivery fee" value={formatCurrency(deliveryFee)} />}
          <Row
            label="Vendibook service fee"
            hint={serviceFeeHint ?? 'Covers payment processing, support and platform costs.'}
            value={formatCurrency(serviceFee)}
          />
          {taxLine && (
            <Row
              label={taxLine.label}
              hint={taxLine.hint}
              muted={taxLine.muted}
              value={taxLine.value}
            />
          )}
          <div className="pt-2">
            <Row label="Total due today" value={formatCurrency(totalToday)} strong />
          </div>
        </div>

        {/* Security deposit — explicitly outside today's charge unless collected */}
        {depositAmount ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Security deposit</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {depositChargedToday
                    ? 'Collected with this payment and refundable after the rental, per the host’s terms.'
                    : 'Not charged today. The host handles this deposit directly with you, and it is not included in the total above.'}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(depositAmount)}
                </span>
                <Badge variant="secondary" className="mt-1 block text-[10px]">
                  {depositChargedToday ? 'Included' : 'Not charged today'}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            This host does not collect a security deposit through Vendibook.
          </p>
        )}
      </Section>

      {/* Fulfillment & handoff */}
      <Section icon={Truck} title="Fulfillment & handoff">
        <div className="divide-y divide-border/60">
          <Row label="Method" value={<span className="capitalize">{fulfillment.replace('_', ' ')}</span>} />
          {fulfillmentDetail && (
            <Row
              label={fulfillment === 'delivery' ? 'Delivery address' : 'Location'}
              value={<span className="max-w-[16rem] break-words">{fulfillmentDetail}</span>}
            />
          )}
          {handoffFacts.map((f) => (
            <Row key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
        {handoffFacts.length === 0 && (
          <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            The host will confirm exact handoff details after your booking is accepted.
          </p>
        )}
      </Section>

      {/* Documents */}
      {documents && documents.required > 0 && (
        <Section
          icon={FileCheck}
          title="Required documents"
          action={
            <Badge variant={docsComplete ? 'secondary' : 'outline'} className="text-[10px]">
              {documents.onFile
                ? 'On file'
                : `${documents.satisfied} of ${documents.required} ready`}
            </Badge>
          }
        >
          <p className="text-xs leading-relaxed text-muted-foreground">
            {docsComplete
              ? 'Your documents are attached to this request. The host reviews them before approving.'
              : 'Some documents are still missing. You can submit now, but the host may not approve until they are provided.'}
          </p>
        </Section>
      )}

      {/* Disclosures & consents */}
      <Section icon={ShieldCheck} title="Disclosures & consents">
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          {disclosures?.attestedAt ? (
            <p className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                Terms accepted {new Date(disclosures.attestedAt).toLocaleString()}
                {disclosures.documentVersion ? ` · version ${disclosures.documentVersion}` : ''} —
                recorded on your account.
              </span>
            </p>
          ) : (
            <p>Your agreement is recorded on the previous step before payment.</p>
          )}
          {disclosures?.identityStatus && disclosures.identityStatus !== 'not_available' && (
            <p>
              Identity check:{' '}
              <span className="font-medium text-foreground">
                {disclosures.identityStatus === 'verified'
                  ? 'verified'
                  : disclosures.identityStatus === 'pending_review'
                    ? 'under review'
                    : disclosures.identityStatus.replace('_', ' ')}
              </span>
            </p>
          )}
          {disclosures?.insuranceAnswer && (
            <p>
              Commercial general liability insurance:{' '}
              <span className="font-medium text-foreground">
                {disclosures.insuranceAnswer === 'yes'
                  ? 'yes'
                  : disclosures.insuranceAnswer === 'no'
                    ? 'no'
                    : 'not sure'}
              </span>
            </p>
          )}
        </div>
      </Section>

      {/* Cancellation policy */}
      <Section
        icon={Clock}
        title="Cancellation policy"
        action={
          listingId ? (
            <Link
              to={`/listing/${listingId}#terms`}
              className="text-xs underline underline-offset-4 text-muted-foreground"
            >
              Rental terms
            </Link>
          ) : undefined
        }
      >
        <div className="text-xs leading-relaxed text-muted-foreground">{cancellationPolicy}</div>
      </Section>

      {/* Message to host */}
      <Section icon={MessageSquare} title="Message to the host">
        <Label htmlFor="review-message" className="sr-only">
          Message to the host
        </Label>
        <Textarea
          id="review-message"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          rows={3}
          placeholder="Tell them about your event or how you'll use this rental…"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Sent with your request. Keep contact details in Vendibook messaging until the booking is
          confirmed.
        </p>
      </Section>
    </div>
  );
}

export default BookingReviewPanel;
