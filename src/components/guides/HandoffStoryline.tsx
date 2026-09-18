import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarClock,
  CameraIcon,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileSignature,
  Handshake,
  KeyRound,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  Search,
  Truck,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HandoffContext, HandoffFulfillment, HandoffMode } from '@/hooks/useHandoffContext';

type Milestone = {
  key: string;
  icon: typeof Search;
  title: string;
  body: string;
  note?: string;
  link?: { label: string; href: string };
};

const INSPECTION_LINK = { label: 'Jump to the inspection checklist', href: '#match-the-listing' };
const CONDITION_LINK = { label: 'Jump to condition documentation', href: '#document-condition' };

const saleIntro: Milestone[] = [
  { key: 'explore', icon: Search, title: 'Explore & ask questions', body: 'Review the listing, seller details, equipment, pricing, and disclosures. Keep important questions in Vendibook Messages.' },
  { key: 'walkthrough', icon: Video, title: 'Optional video walkthrough', body: 'Schedule a live video walkthrough when available to see the equipment, ask the seller to demonstrate key systems, and get a closer look before you commit.', note: 'Video walkthroughs are a convenience and do not replace an independent inspection.' },
  { key: 'terms', icon: ClipboardList, title: 'Review & accept checkout terms', body: 'Review the transaction details, Vendibook Purchase Agreement, privacy/electronic consent, and the fulfillment plan before payment.' },
  { key: 'pay', icon: CreditCard, title: 'Pay through PayPal', body: 'Complete the available PayPal checkout option shown for your transaction. Vendibook records the order and keeps the transaction details connected.' },
  { key: 'sign', icon: FileSignature, title: 'Sign the transaction document', body: "When the Purchase & Sale Agreement is ready, the buyer and seller review and sign it electronically through Vendibook's SignNow experience.", note: 'Signing documents the transaction; it does not replace a title certificate, DMV form, lien release, notarization, or other document required by law.' },
];

const rentalIntro = (onSite: boolean): Milestone[] => [
  onSite
    ? { key: 'review', icon: MapPin, title: 'Review the space & dates', body: 'Confirm the booking period, included amenities, host rules, and access requirements.' }
    : { key: 'review', icon: ClipboardList, title: 'Review the listing & dates', body: 'Confirm the rental period, included equipment, host rules, and pickup requirements.' },
  {
    key: 'walkthrough',
    icon: Video,
    title: onSite ? 'Optional video walkthrough / tour' : 'Optional video walkthrough',
    body: 'When available, use a live walkthrough to see the rental asset or space and ask questions before booking.',
    note: 'Video walkthroughs are a convenience and do not replace an in-person visit.',
  },
  { key: 'requirements', icon: ClipboardCheck, title: 'Complete booking requirements', body: 'Provide any business information, insurance answers, or required documents that apply to this listing.' },
  { key: 'terms', icon: ClipboardList, title: 'Review & accept checkout terms', body: 'Review the booking details, Rental Agreement terms, privacy/electronic consent, and cancellation terms.' },
  { key: 'pay', icon: CreditCard, title: 'Pay / submit booking', body: 'Complete the payment or booking action shown for this rental. Some bookings may still require host acceptance.' },
  { key: 'sign', icon: FileSignature, title: 'Sign the rental document', body: "When the rental agreement is ready, the renter and host review and sign it electronically through Vendibook's SignNow experience." },
];

function buildStoryline(mode: HandoffMode, fulfillment: HandoffFulfillment, ctx?: HandoffContext | null): Milestone[] {
  if (mode === 'sale') {
    if (fulfillment === 'delivery') {
      return [
        ...saleIntro,
        { key: 'prepare-delivery', icon: Package, title: 'Seller prepares delivery', body: 'The seller arranges the agreed delivery and shares timing details in the order and Messages.' },
        { key: 'track', icon: Truck, title: 'Track delivery when active', body: 'Live location appears only after the seller or assigned driver starts Delivery Mode and location sharing is active.' },
        { key: 'inspect', icon: ClipboardCheck, title: 'Receive, inspect & document', body: 'Compare the asset with the listing, inspect the equipment, review the relevant documents, and document condition on arrival.', link: INSPECTION_LINK },
        { key: 'complete', icon: Handshake, title: 'Complete the handoff', body: 'Use the order page to complete any remaining confirmations, documents, and transfer details.' },
      ];
    }
    if (fulfillment === 'freight') {
      const freightNote =
        ctx?.real && ctx.freightIncluded === true
          ? 'Freight is included in this order total.'
          : ctx?.real && ctx.freightIncluded === false
            ? ctx.freightPaid
              ? 'Freight for this order is paid separately and has been paid.'
              : 'Freight for this order is arranged and paid separately.'
            : undefined;
      return [
        ...saleIntro,
        { key: 'freight-coordination', icon: Package, title: 'Freight coordination', body: 'Vendibook and the seller coordinate the freight arrangement for this order.', note: freightNote },
        { key: 'carrier', icon: Truck, title: 'Carrier / pickup handoff', body: 'The equipment is released to the carrier or collected at the agreed origin.' },
        { key: 'track', icon: MapPin, title: 'Track shipment when available', body: 'Shipment updates appear when available. Freight movement is not live GPS tracking.' },
        { key: 'inspect', icon: ClipboardCheck, title: 'Delivery, inspection & documentation', body: 'Inspect the equipment on arrival, compare it with the listing, and document condition before signing anything for the carrier.', link: INSPECTION_LINK },
        { key: 'complete', icon: Handshake, title: 'Complete remaining order steps', body: 'Use the order page to complete any remaining confirmations, documents, and transfer details.' },
      ];
    }
    return [
      ...saleIntro,
      { key: 'plan', icon: MessageSquare, title: 'Plan the meetup', body: 'Use Vendibook Messages to agree on the pickup time and exact handoff location.' },
      { key: 'inspect', icon: ClipboardCheck, title: 'Meet, inspect & document', body: 'Compare the asset with the listing, inspect the equipment, review the relevant documents, and document condition before completing the handoff.', link: INSPECTION_LINK },
      { key: 'complete', icon: Handshake, title: 'Complete the handoff', body: 'Use the order page to complete any remaining confirmations, documents, and transfer details.' },
    ];
  }

  if (fulfillment === 'on_site') {
    return [
      ...rentalIntro(true),
      { key: 'access', icon: KeyRound, title: 'Review access instructions', body: 'Check arrival details, access requirements, and any site rules shared for your booking.' },
      { key: 'arrive', icon: MapPin, title: 'Arrive & check in', body: 'Arrive within your booked window and complete any check-in the host requires.' },
      { key: 'period', icon: CalendarClock, title: 'Booking period', body: 'Follow the agreed booking terms and keep material communication in Vendibook.' },
      { key: 'checkout', icon: CheckCircle2, title: 'Check out', body: 'Leave the space as agreed and complete the check-out shown in the booking.', link: CONDITION_LINK },
    ];
  }

  if (fulfillment === 'delivery') {
    return [
      ...rentalIntro(false),
      { key: 'prepare-delivery', icon: Package, title: 'Host prepares delivery', body: 'The host arranges the agreed delivery and shares timing details in the booking and Messages.' },
      { key: 'track', icon: Truck, title: 'Track delivery when active', body: 'Live location appears only after the host or assigned driver starts Delivery Mode and location sharing is active.' },
      { key: 'checkin', icon: CameraIcon, title: 'Check in & document condition', body: 'Review and document the rental condition before the rental period begins.', link: CONDITION_LINK },
      { key: 'period', icon: CalendarClock, title: 'Rental period', body: 'Follow the agreed booking terms and keep material communication in Vendibook.' },
      { key: 'return', icon: PackageCheck, title: 'Return / retrieval', body: 'Follow the return or retrieval instructions shown in the booking and document condition at the end.' },
    ];
  }

  return [
    ...rentalIntro(false),
    { key: 'plan', icon: MessageSquare, title: 'Coordinate pickup', body: 'Agree on the pickup time and handoff details in Vendibook Messages.' },
    { key: 'checkin', icon: CameraIcon, title: 'Check in & document condition', body: "Review and document the rental asset's condition before the rental period begins.", link: CONDITION_LINK },
    { key: 'period', icon: CalendarClock, title: 'Use the rental', body: 'Follow the agreed booking terms and keep material communication in Vendibook.' },
    { key: 'return', icon: PackageCheck, title: 'Return / check out', body: 'Follow the return or retrieval instructions shown in the booking and document condition at check-out.' },
  ];
}

const FULFILLMENT_LABEL: Record<HandoffFulfillment, string> = {
  pickup: 'Local pickup',
  delivery: 'Seller delivery',
  freight: 'Freight',
  on_site: 'On-site',
};

const OPTIONS: { value: HandoffFulfillment; mode: HandoffMode; label: string }[] = [
  { value: 'pickup', mode: 'sale', label: 'Pickup' },
  { value: 'delivery', mode: 'sale', label: 'Seller delivery' },
  { value: 'freight', mode: 'sale', label: 'Freight' },
  { value: 'on_site', mode: 'rental', label: 'On-site rental' },
];

type Props = {
  context: HandoffContext | null;
  safeReturn: string | null;
};

export default function HandoffStoryline({ context, safeReturn }: Props) {
  const [choice, setChoice] = useState<{ mode: HandoffMode; fulfillment: HandoffFulfillment }>({ mode: 'sale', fulfillment: 'pickup' });
  const [open, setOpen] = useState(true);

  const mode = context?.mode ?? choice.mode;
  const fulfillment = context?.fulfillment ?? choice.fulfillment;
  const milestones = buildStoryline(mode, fulfillment, context);
  const modeLabel = mode === 'sale' ? 'Sale' : 'Rental';
  const badge = context ? `${modeLabel} · ${FULFILLMENT_LABEL[fulfillment]}` : 'Typical Vendibook handoff';
  const currentKey = context?.real ? context.currentStage : undefined;
  const currentIndex = currentKey ? milestones.findIndex((m) => m.key === currentKey) : -1;

  return (
    <section className="handoff-story" aria-labelledby="handoff-story-title">
      <div className="handoff-story-head">
        <div>
          <p className="handoff-eyebrow">How the handoff works</p>
          <h2 id="handoff-story-title">Know what happens before, during, and after the meetup.</h2>
          <p className="handoff-lede">
            Your exact path depends on whether you're picking up, receiving seller delivery, using freight, or completing a rental.
            Vendibook keeps the walkthrough, agreements, payment, messages, and handoff connected.
          </p>
        </div>
        <span className="handoff-badge">{badge}</span>
      </div>

      {!context && (
        <div className="handoff-selector" role="group" aria-label="See a different handoff path">
          <span>See the path for:</span>
          {OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={choice.fulfillment === opt.value}
              className={choice.fulfillment === opt.value ? 'is-active' : undefined}
              onClick={() => setChoice({ mode: opt.mode, fulfillment: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <button type="button" className="handoff-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? 'Hide the handoff story' : 'Show the handoff story'}
      </button>

      {open && (
        <ol className="handoff-track">
          {milestones.map((m, index) => {
            const Icon = m.icon;
            const isCurrent = index === currentIndex;
            const isDone = currentIndex > -1 && index < currentIndex;
            return (
              <li key={m.key} className={isCurrent ? 'is-current' : isDone ? 'is-done' : undefined} aria-current={isCurrent ? 'step' : undefined}>
                <span className="handoff-dot"><Icon aria-hidden /></span>
                <div>
                  <h3>{m.title}{isCurrent ? <em> · You're here</em> : null}</h3>
                  <p>{m.body}</p>
                  {m.note ? <small>{m.note}</small> : null}
                  {m.link ? <a href={m.link.href}>{m.link.label}</a> : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="handoff-actions">
        {context?.listingId ? (
          <Button asChild size="sm" variant="outline">
            <Link to={`/listing/${context.listingId}`}><Video aria-hidden /> Video walkthrough</Link>
          </Button>
        ) : null}
        {context?.real && context.agreementReady && !context.agreementSigned && safeReturn ? (
          <Button asChild size="sm" variant="outline">
            <Link to={safeReturn}><FileSignature aria-hidden /> Sign agreement</Link>
          </Button>
        ) : null}
        {context?.real ? (
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard/messages"><MessageSquare aria-hidden /> {mode === 'sale' ? 'Message the seller' : 'Message the host'}</Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <a href="#match-the-listing"><ClipboardCheck aria-hidden /> Inspection checklist</a>
        </Button>
        {safeReturn ? (
          <Button asChild size="sm" variant="ghost">
            <Link to={safeReturn}><ArrowLeft aria-hidden /> {mode === 'sale' ? 'Back to order' : 'Back to booking'}</Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}
