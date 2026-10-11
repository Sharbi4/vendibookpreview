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
import { Link } from 'react-router-dom';

export type TimelineMode = 'sale' | 'rental';
export type TimelineFulfillment = 'pickup' | 'delivery' | 'vendibook_freight' | 'on_site';

type Step = { icon: typeof Receipt; title: string; body: string; guide?: { label: string; href: string } };

const SALE: Record<TimelineFulfillment, Step[]> = {
  pickup: [
    { icon: Receipt, title: 'Payment confirmed', body: 'Once PayPal confirms your payment, the order appears in your Vendibook account.' },
    { icon: CalendarClock, title: 'Plan the meetup', body: 'Message the seller in Vendibook to agree on a pickup time and the exact handoff location.' },
    { icon: ClipboardCheck, title: 'Meet, inspect & document', body: 'Review the equipment in person, compare it with the listing, and document the condition before completing the handoff.', guide: { label: 'Open the Meetup & Inspection Guide', href: '/guides/meetup-inspection' } },
    { icon: FileCheck2, title: 'Complete the handoff', body: 'Follow the order page for any remaining documents, confirmations, or transfer details.' },
  ],
  delivery: [
    { icon: Receipt, title: 'Payment confirmed', body: 'PayPal confirms the payment and your order appears in your account.' },
    { icon: Truck, title: 'Seller prepares delivery', body: 'The seller coordinates the delivery details through your order.' },
    { icon: MapPinned, title: 'Track delivery', body: 'Live location appears only after the seller or assigned driver starts Delivery Mode.' },
    { icon: PackageCheck, title: 'Receive and inspect', body: 'Check the equipment on arrival before accepting the handoff.' },
    { icon: FileCheck2, title: 'Complete the handoff', body: 'Follow the order page for any remaining documents or confirmations.' },
  ],
  vendibook_freight: [
    { icon: Receipt, title: 'Payment confirmed', body: 'PayPal confirms the payment and your order appears in your account.' },
    { icon: Truck, title: 'Freight coordination', body: 'Freight details are added to the order as they are confirmed.' },
    { icon: KeyRound, title: 'Pickup or carrier handoff', body: 'Follow the confirmed handoff instructions shown on the order.' },
    { icon: MapPinned, title: 'Track shipment when available', body: 'Carrier milestones appear only when tracking information is available.' },
    { icon: PackageCheck, title: 'Delivery & handoff', body: 'Inspect the equipment on delivery and record any material issue on the order.' },
  ],
  on_site: [
    { icon: Receipt, title: 'Payment confirmed', body: 'PayPal confirms the payment and your order appears in your account.' },
    { icon: CalendarClock, title: 'Coordinate access', body: 'Arrange timing and access details with the seller.' },
    { icon: FileCheck2, title: 'Complete remaining order steps', body: 'Finish documents and confirm the handoff on the order.' },
  ],
};

const RENTAL: Record<TimelineFulfillment, Step[]> = {
  pickup: [
    { icon: Receipt, title: 'Booking submitted or confirmed', body: 'Your real booking status stays visible in your Vendibook account.' },
    { icon: CalendarClock, title: 'Coordinate pickup', body: 'Use Vendibook Messages to confirm the pickup details with the host.' },
    { icon: KeyRound, title: 'Check in & document condition', body: 'Review and document the rental condition before use.', guide: { label: 'Condition check-in guide', href: '/guides/meetup-inspection#document-condition' } },
    { icon: ClipboardCheck, title: 'Use the rental', body: 'Follow the listing terms, host rules, and confirmed booking period.' },
    { icon: PackageCheck, title: 'Return or check out', body: 'Follow the return instructions and complete any remaining booking steps.' },
  ],
  delivery: [
    { icon: Receipt, title: 'Booking submitted or confirmed', body: 'Your real booking status stays visible in your Vendibook account.' },
    { icon: Truck, title: 'Host prepares delivery', body: 'The host schedules the delivery and shares timing on the booking.' },
    { icon: MapPinned, title: 'Track delivery when active', body: 'Live location appears only after the host or assigned driver starts Delivery Mode.' },
    { icon: KeyRound, title: 'Check-in', body: 'Check the condition on arrival before the rental period starts.' },
    { icon: ClipboardCheck, title: 'Rental period', body: 'Use the asset as agreed in the listing and host rules.' },
    { icon: PackageCheck, title: 'Return or retrieval', body: 'Follow the return or retrieval arrangement shown on the booking.' },
  ],
  vendibook_freight: [
    { icon: Receipt, title: 'Booking submitted or confirmed', body: 'Your real booking status stays visible on the booking.' },
    { icon: Truck, title: 'Transport is arranged', body: 'Transport details are added to the booking as they are confirmed.' },
    { icon: KeyRound, title: 'Check-in', body: 'Check the condition on arrival before the rental period starts.' },
    { icon: PackageCheck, title: 'Return', body: 'Follow the return arrangement shown on the booking.' },
  ],
  on_site: [
    { icon: Receipt, title: 'Booking submitted or confirmed', body: 'Your real booking status stays visible in your Vendibook account.' },
    { icon: FileCheck2, title: 'Review access requirements', body: 'Access instructions and required documents stay with the booking.' },
    { icon: KeyRound, title: 'Arrive or check in', body: 'Follow the host’s confirmed access and check-in instructions.' },
    { icon: ClipboardCheck, title: 'Booking period', body: 'Use the space for the dates and hours you booked.' },
    { icon: PackageCheck, title: 'Complete check out', body: 'Leave the space as required and complete any remaining booking steps.' },
  ],
};

interface PostPaymentTimelineProps {
  mode?: TimelineMode;
  fulfillment?: TimelineFulfillment;
  title?: string;
  className?: string;
}

/**
 * Adaptive "what happens next" timeline. Steps describe the real workflow for
 * the selected fulfillment method only — no custodial-funds, protection, or
 * release language, and no delivery tracking promise for on-site bookings.
 */
const PostPaymentTimeline = ({
  mode = 'sale',
  fulfillment = 'pickup',
  title = 'What happens next',
  className,
}: PostPaymentTimelineProps) => {
  const steps = (mode === 'rental' ? RENTAL : SALE)[fulfillment] ?? SALE.pickup;
  const guideContext = `mode=${mode}&fulfillment=${fulfillment === 'vendibook_freight' ? 'freight' : fulfillment}`;
  const withContext = (href: string) => {
    const [path, hash] = href.split('#');
    return `${path}${path.includes('?') ? '&' : '?'}${guideContext}${hash ? `#${hash}` : ''}`;
  };

  return (
    <section
      aria-label={title}
      className={`checkout-story ${className ?? ''}`}
    >
      <header className="checkout-story-head">
        <h3>{title}</h3>
        <p>A clear path from payment to handoff.</p>
      </header>
      <ol className="checkout-story-list">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isLast = i === steps.length - 1;
          return (
            <li key={s.title}>
              <div className="checkout-story-track">
                <div className="checkout-story-icon">
                  <Icon aria-hidden />
                </div>
                {!isLast && <div className="checkout-story-line" />}
              </div>
              <div className="checkout-story-copy">
                <h4>{s.title}</h4>
                <p>{s.body}</p>
                {s.guide ? <Link to={s.guide.href.startsWith('/guides/meetup-inspection') ? withContext(s.guide.href) : s.guide.href}>{s.guide.label} →</Link> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="checkout-story-support">
        Questions? <Link to="/help">Contact Vendibook Support</Link>
      </p>
    </section>
  );
};

export default PostPaymentTimeline;
