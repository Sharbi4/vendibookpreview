import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/location-tracking — Location & Delivery Tracking Disclosure
 *
 * Accepted by a driver before live location sharing can begin. The version is
 * read from the registry and written to `legal_acceptances`; the tracking-start
 * edge function refuses to start without a current-version acceptance row.
 */
const LocationTracking: React.FC = () => (
  <LegalDocumentLayout
    slug="location-tracking"
    heading="Location & Delivery Tracking Disclosure"
    seoTitle="Location & Delivery Tracking Disclosure | Vendibook"
    seoDescription="When Vendibook collects location during a delivery, exactly what is collected, who can see it, how long it is kept, and how to stop it."
    related={['handoff-terms', 'privacy-policy', 'device-permissions-privacy']}
  >
    <Section title="1. Scope">
      <p>
        This Disclosure explains how Vendibook collects and shares device location in connection with
        a delivery or an in-person handoff. It applies to the person performing the delivery (a
        seller, an assigned driver, or a person using a one-time driver link), to the buyer or renter
        receiving the item, and to anyone confirming a pickup or handoff. It supplements, and does
        not replace, the{' '}
        <Link to="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </Section>

    <Section title="2. What triggers location collection">
      <p>Vendibook collects device location in only two situations:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>An active delivery.</strong> A driver opens Delivery Mode for a specific order,
          accepts this Disclosure, grants browser location permission, and explicitly taps
          <em> Start delivery</em>. Nothing is collected before that tap.
        </li>
        <li>
          <strong>Confirming a pickup or handoff.</strong> Where a handoff step asks a participant to
          confirm where the item changed hands, a single point may be captured for that step, and
          only if the participant grants permission for it.
        </li>
      </ul>
      <p>
        Vendibook does <strong>not</strong> collect device location for browsing, search, saving a
        listing, messaging, scheduling, checkout, or payment. Declining location does not prevent you
        from buying, selling, renting, or using the rest of the platform.
      </p>
    </Section>

    <Section title="3. What is collected">
      <p>During an active delivery, the following may be collected from the driver's device:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>current latitude and longitude;</li>
        <li>the accuracy radius reported by the device;</li>
        <li>heading and speed, where the device reports them;</li>
        <li>the timestamp of the reading; and</li>
        <li>
          sparse checkpoints — a small number of widely spaced points retained as transaction
          evidence rather than a continuous movement trail.
        </li>
      </ul>
      <p>
        Vendibook does not collect contacts, photos, call logs, browsing history, or any location
        outside an active delivery or a permitted handoff step.
      </p>
    </Section>

    <Section title="4. Accuracy and reliability — important limits">
      <p>
        Location is approximate. It depends on the device, its hardware, the operating system, the
        mobile network, and satellite conditions. Readings may be delayed, coarse, out of order, or
        unavailable for long stretches — particularly when the driver's phone locks, the browser is
        put in the background, battery-saving is active, or signal is poor.
      </p>
      <p>
        Vendibook makes no representation that tracking is continuous, real-time, complete, or
        accurate. <strong>Do not rely on tracking for any safety-critical decision</strong>, and do
        not treat a displayed position, distance, or arrival estimate as a promise about where a
        vehicle or a person actually is.
      </p>
    </Section>

    <Section title="5. Who can see it">
      <p>Live position for an order is visible only to:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>the buyer or renter on that order;</li>
        <li>the seller or host on that order;</li>
        <li>the driver assigned to that delivery; and</li>
        <li>authorized Vendibook administrators, for support, safety, fraud prevention, and disputes.</li>
      </ul>
      <p>
        Location is never shown on a public listing page, never included in a public or shareable
        link, never sold, and never used for advertising or profiling. Access is enforced by
        server-side authorization rules, not by hiding elements in a browser.
      </p>
    </Section>

    <Section title="6. When sharing starts and stops">
      <p>
        Sharing begins only when the driver taps <em>Start delivery</em>. It stops automatically —
        without any further action — when the delivery is marked delivered, marked arrived and then
        ended, cancelled, or when the session expires or a one-time driver link is revoked. A driver
        may also pause sharing at any time from Delivery Mode, and stop it entirely with a single tap
        on the persistent tracking banner.
      </p>
      <p>No location is collected between deliveries, and none is collected after a delivery closes.</p>
    </Section>

    <Section title="7. Retention">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Live position.</strong> Only the most recent point is stored on the delivery
          record. Each new reading replaces the previous one, and the live point is cleared when
          tracking ends.
        </li>
        <li>
          <strong>Checkpoint evidence.</strong> Widely spaced checkpoints and delivery status events
          (started, arrived, delivered, ended) are retained with the transaction record for as long
          as we keep that transaction record, because they may be needed for a dispute, a chargeback,
          a tax or accounting requirement, or a legal obligation.
        </li>
      </ul>
    </Section>

    <Section title="8. Revoking permission during a delivery">
      <p>
        A driver may revoke location permission at any time in the browser or operating system, or
        by tapping stop in Delivery Mode. When permission is revoked, position updates simply stop;
        the delivery itself is not cancelled and the order is not changed. The buyer's view will show
        that live tracking is no longer available rather than a stale position presented as current.
        The driver remains responsible for completing or cancelling the delivery through the normal
        order flow.
      </p>
    </Section>

    <Section title="9. Buyer choices">
      <p>
        A buyer or renter is never required to share their own device location to receive a delivery.
        A buyer who does not want to see live tracking can simply not open the tracking view, and can
        ask us to stop sending delivery status notifications by writing to
        support@vendibook.com. Turning off the buyer's view does not change the driver's obligations
        or the order.
      </p>
    </Section>

    <Section title="10. Driver obligations">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Do not interact with a phone or any device while operating a vehicle. Start, pause, and
          complete steps only when safely stopped.
        </li>
        <li>
          Comply with all traffic laws and, where applicable, all commercial motor vehicle, towing,
          licensing, weight, permit, and insurance requirements.
        </li>
        <li>
          Share location only for the delivery you are actually performing, and only while you are
          performing it.
        </li>
      </ul>
      <p>
        Vendibook does not employ, dispatch, supervise, train, route, schedule, or insure any driver,
        and does not verify any driver's licensing, registration, qualifications, or insurance. A
        driver is an independent party arranged between the buyer and the seller. Vendibook is not a
        carrier, broker, freight forwarder, or party to any transport arrangement.
      </p>
    </Section>

    <Section title="11. Access and deletion">
      <p>
        You may request a copy of the location records associated with your deliveries, or ask us to
        delete them, by writing to support@vendibook.com from the email on your account. We will
        respond as described in the{' '}
        <Link to="/privacy" className="underline">Privacy Policy</Link>. We may retain checkpoint
        evidence and status events where we need them for an open dispute, a chargeback, fraud
        prevention, or a legal or tax obligation, and we will tell you when that applies.
      </p>
    </Section>

    <Section title="12. Changes">
      <p>
        If we materially change how location is collected, used, or shared, we will publish an
        updated version of this Disclosure with a new version number and effective date, and drivers
        will be asked to accept the new version before starting their next delivery.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default LocationTracking;
