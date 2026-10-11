import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/location-tracking — operative document for delivery location sharing.
 * `DevicePermissionsPrivacy` keeps a short summary and links here.
 */
const LocationTracking: React.FC = () => (
  <LegalDocumentLayout
    slug="location-tracking"
    heading="Location and Delivery Tracking Disclosure"
    seoTitle="Location and Delivery Tracking Disclosure | Vendibook"
    seoDescription="Vendibook does not track you. Location is shared only when someone starts an active delivery, only while it is active, and only with that order's participants."
    related={['device-permissions-privacy', 'handoff-terms', 'privacy-policy', 'terms-of-service']}
  >
    <Section title="In one sentence">
      <p>
        <strong>
          Vendibook does not track you. Location sharing happens only when a person with an active
          delivery deliberately starts it, and only for as long as that delivery is active.
        </strong>
      </p>
    </Section>

    <Section title="1. When location is collected">
      <p>
        Location is collected only when an assigned driver starts a specific delivery, or when a
        participant confirms an in-person pickup or handoff.
      </p>
      <p>
        It is never collected for browsing, searching, messaging, or paying. It is never collected in
        the background. It is never collected when the app is closed or when the delivery is not
        active.
      </p>
    </Section>

    <Section title="2. What is collected">
      <p>
        While a delivery is active we collect the device's current coordinates, the accuracy reported
        by the device, and a timestamp. We also keep a sparse set of route checkpoints, which are
        retained as transaction evidence for that order.
      </p>
    </Section>

    <Section title="3. Who can see it">
      <p>
        That order's buyer, the seller, the assigned driver, and authorised Vendibook LC
        administrators. Nobody else. It is never shown on a public listing page and never exposed
        through a shareable public link.
      </p>
    </Section>

    <Section title="4. When it stops">
      <p>
        Sharing stops automatically when the delivery is marked delivered, cancelled, or ended, and
        immediately when the driver stops sharing or revokes permission in device settings.
      </p>
      <p>
        Live position is not retained after the delivery closes. The retained checkpoints are kept
        only as transaction evidence for that order.
      </p>
    </Section>

    <Section title="5. Driver consent">
      <p>
        A driver must affirmatively consent before their first tracked delivery. That consent is
        recorded with a version and a timestamp.
      </p>
      <p>
        Sharing location is the driver's own choice on the driver's own device. Vendibook LC does not
        attach a tracking device to any vehicle and does not track a vehicle that is not in an active
        delivery.
      </p>
    </Section>

    <Section title="6. Not an emergency or safety service">
      <p>
        Live tracking and estimated arrival times are conveniences, not guarantees. Do not rely on
        Vendibook for emergency, roadside, dispatch, or safety services.
      </p>
    </Section>

    <Section title="7. No sale, no advertising, no profiling">
      <p>
        Location data is never sold, never used for advertising, and never used to build a profile of
        a person's movements.
      </p>
    </Section>

    <Section title="8. Your controls">
      <p>
        You can revoke location permission in your device settings at any time. Revoking ends live
        sharing and may prevent you from completing the delivery confirmation step. Declining
        location never blocks browsing, messaging, or checkout.
      </p>
    </Section>

    <Section title="9. Retention and deletion">
      <p>
        Delivery checkpoints are retained with the transaction record as evidence, and longer where a
        dispute, claim, or legal hold is open. To ask what we hold for an order, or to request
        deletion where the law gives you that right, email support@vendibook.com.
      </p>
    </Section>

    <Section title="10. Changes to this disclosure">
      <p>
        This disclosure is versioned. The version and effective date are shown at the top of this
        page. If we materially change how location is collected, used, or shared, we will publish a
        new version and ask affected drivers to accept it again before their next tracked delivery.
        Related:{' '}
        <Link to="/legal/device-permissions-privacy" className="underline">
          Device Permissions &amp; Privacy Notice
        </Link>
        .
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default LocationTracking;
