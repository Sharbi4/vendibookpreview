import {
  CalendarClock,
  ClipboardCheck,
  FileCheck2,
  KeyRound,
  MapPinned,
  PackageCheck,
  Receipt,
  Truck,
} from 'lucide-react';

export type TimelineMode = 'sale' | 'rental';
export type TimelineFulfillment = 'pickup' | 'delivery' | 'vendibook_freight' | 'on_site';

type Step = { icon: typeof Receipt; title: string; body: string };

const SALE: Record<TimelineFulfillment, Step[]> = {
  pickup: [
    { icon: Receipt, title: 'Payment confirmed', body: 'PayPal confirms the payment and your order appears in your account.' },
    { icon: CalendarClock, title: 'Coordinate pickup', body: 'Agree on a time and place with the seller in your order messages.' },
    { icon: ClipboardCheck, title: 'Inspect at handoff', body: 'Look the equipment over before you accept it and note anything on the order.' },
    { icon: FileCheck2, title: 'Complete remaining order steps', body: 'Finish documents, handoff confirmation, and any remaining transfer paperwork.' },
  ],
  delivery: [
    { icon: Receipt, title: 'Payment confirmed', body: 'PayPal confirms the payment and your order appears in your account.' },
    { icon: Truck, title: 'Seller prepares delivery', body: 'The seller schedules the delivery and shares timing in your order.' },
    { icon: MapPinned, title: 'Live tracking', body: 'A live map appears only once the seller or driver starts Delivery Mode.' },
    { icon: PackageCheck, title: 'Receive and inspect', body: 'Check the equipment on arrival before accepting the handoff.' },
    { icon: FileCheck2, title: 'Complete handoff', body: 'Confirm the handoff so the order record is complete.' },
  ],
  vendibook_freight: [
    { icon: Receipt, title: 'Payment confirmed', body: 'PayPal confirms the payment and your order appears in your account.' },
    { icon: Truck, title: 'Freight is arranged', body: 'Freight coordination and carrier details are added to the order as they are confirmed.' },
    { icon: MapPinned, title: 'Carrier status', body: 'Carrier milestones appear on the order when the carrier reports them.' },
    { icon: PackageCheck, title: 'Receive and inspect', body: 'Inspect on delivery and record any issue on the order right away.' },
  ],
  on_site: [
    { icon: Receipt, title: 'Payment confirmed', body: 'PayPal confirms the payment and your order appears in your account.' },
    { icon: CalendarClock, title: 'Coordinate access', body: 'Arrange timing and access details with the seller.' },
    { icon: FileCheck2, title: 'Complete remaining order steps', body: 'Finish documents and confirm the handoff on the order.' },
  ],
};

const RENTAL: Record<TimelineFulfillment, Step[]> = {
  pickup: [
    { icon: Receipt, title: 'Payment and booking status', body: 'Your payment and booking status stay visible on the booking.' },
    { icon: CalendarClock, title: 'Host confirmation', body: 'If the listing is not instant book, the host reviews the request.' },
    { icon: FileCheck2, title: 'Required documents', body: 'Anything the host requires is tracked on the booking.' },
    { icon: KeyRound, title: 'Pickup and check-in', body: 'Meet the host, check the condition, and start the rental.' },
    { icon: ClipboardCheck, title: 'Rental period', body: 'Use the asset as agreed in the listing and host rules.' },
    { icon: PackageCheck, title: 'Return', body: 'Return as described on the booking and confirm completion.' },
  ],
  delivery: [
    { icon: Receipt, title: 'Payment and booking status', body: 'Your payment and booking status stay visible on the booking.' },
    { icon: Truck, title: 'Host prepares delivery', body: 'The host schedules the delivery and shares timing on the booking.' },
    { icon: MapPinned, title: 'Live tracking', body: 'A live map appears only once the host or driver starts Delivery Mode.' },
    { icon: KeyRound, title: 'Check-in', body: 'Check the condition on arrival before the rental period starts.' },
    { icon: ClipboardCheck, title: 'Rental period', body: 'Use the asset as agreed in the listing and host rules.' },
    { icon: PackageCheck, title: 'Return or retrieval', body: 'Follow the return or retrieval arrangement shown on the booking.' },
  ],
  vendibook_freight: [
    { icon: Receipt, title: 'Payment and booking status', body: 'Your payment and booking status stay visible on the booking.' },
    { icon: Truck, title: 'Transport is arranged', body: 'Transport details are added to the booking as they are confirmed.' },
    { icon: KeyRound, title: 'Check-in', body: 'Check the condition on arrival before the rental period starts.' },
    { icon: PackageCheck, title: 'Return', body: 'Follow the return arrangement shown on the booking.' },
  ],
  on_site: [
    { icon: Receipt, title: 'Payment and booking status', body: 'Your payment and booking status stay visible on the booking.' },
    { icon: FileCheck2, title: 'Access and documents', body: 'Access instructions and any required documents are tracked on the booking.' },
    { icon: KeyRound, title: 'Arrival and check-in', body: 'Arrive at the space and check in as the host describes.' },
    { icon: ClipboardCheck, title: 'Booking period', body: 'Use the space for the dates and hours you booked.' },
    { icon: PackageCheck, title: 'Completion', body: 'Leave the space as required and the booking is marked complete.' },
  ],
};

interface PostPaymentTimelineProps {
  mode?: TimelineMode;
  fulfillment?: TimelineFulfillment;
  title?: string;
}

/**
 * Adaptive "what happens next" timeline. Steps describe the real workflow for
 * the selected fulfillment method only — no custodial-funds, protection, or
 * release language, and no delivery tracking promise for on-site bookings.
 */
const PostPaymentTimeline = ({
  mode = 'sale',
  fulfillment = 'pickup',
  title = 'What happens after payment',
}: PostPaymentTimelineProps) => {
  const steps = (mode === 'rental' ? RENTAL : SALE)[fulfillment] ?? SALE.pickup;

  return (
    <section
      aria-label={title}
      className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-sm p-5"
    >
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <ol className="space-y-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isLast = i === steps.length - 1;
          return (
            <li key={s.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-foreground/70" />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border/60 mt-1" />}
              </div>
              <div className={isLast ? '' : 'pb-1'}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-muted-foreground mt-4 pt-4 border-t border-border/60">
        Questions?{' '}
        <a href="/help" className="text-primary hover:underline font-medium">
          Contact us
        </a>{' '}
        — support Mon–Fri, 9am–5pm AZ.
      </p>
    </section>
  );
};

export default PostPaymentTimeline;
