import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { DEVICE_PRIVACY_VERSION } from '@/lib/walkthroughConsent';

/**
 * /legal/device-permissions-privacy
 *
 * Operative device-permissions notice presented at the pre-join consent gate.
 * The version string here must match DEVICE_PRIVACY_VERSION, which is stored
 * on each consent record.
 */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const DevicePermissionsPrivacy: React.FC = () => (
  <>
    <SEO
      title="Device Permissions & Privacy Notice | Vendibook"
      description="How Vendibook uses camera, microphone, and device location permissions, when each is required, and what is retained."
      canonical="https://vendibook.com/legal/device-permissions-privacy"
    />
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8 text-foreground">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Device Permissions &amp; Privacy Notice</h1>
        <p className="text-sm text-muted-foreground">
          Version {DEVICE_PRIVACY_VERSION} · Effective September 18, 2026
        </p>
        <p className="text-sm text-muted-foreground">
          This notice explains exactly when Vendibook asks for your camera, microphone, or location,
          what happens to that data, and how long we keep it. It supplements our{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </header>

      <Section title="1. You can use Vendibook without device permissions">
        <p>
          Browsing listings, searching, saving favorites, messaging a seller or host, viewing listing
          details, requesting a booking, and completing an ordinary purchase or rental payment do not
          require camera, microphone, or location access. We never require a device permission as a
          condition of paying.
        </p>
      </Section>

      <Section title="2. Camera and microphone">
        <p>
          <strong>Live video walkthroughs.</strong> Camera and microphone access is required to enter
          a walkthrough meeting room, and only for the duration of that meeting. Audio and video are
          transmitted in real time between the two participants through our real-time video
          infrastructure provider, acting as our service provider under contract. A walkthrough may
          be monitored or recorded as described in section 4.
        </p>
        <p>
          <strong>Handoff and condition capture.</strong> With your permission, the camera and
          microphone may also be used when you deliberately capture photos or video during a delivery
          handoff or condition walkthrough. Media you capture in that flow is saved to the
          transaction as evidence and is visible to the participants of that transaction, to
          authorized Vendibook support staff, and where required by law. It is stored in a private
          location and is not publicly accessible.
        </p>
        <p>
          Vendibook does not access your camera or microphone in the background, outside an active
          walkthrough or a capture step you started.
        </p>
      </Section>

      <Section title="3. Device location">
        <p>
          Location is never requested for browsing, messaging, or payment. It is requested only where
          a specific step depends on it — principally live delivery tracking, where an assigned
          driver explicitly starts a delivery and shares location with that buyer only while the
          delivery is active, and in-person pickup or handoff confirmation.
        </p>
        <p>
          In short: location is shared only while a delivery is active, only with that order's
          participants, and it stops automatically when the delivery ends. Where a step requires
          location, you cannot complete that step without granting permission or using an approved
          alternative such as a pickup code.
        </p>
        <p>
          The <Link to="/legal/location-tracking" className="underline">Location and Delivery
          Tracking Disclosure</Link> is the operative document for delivery location. It is the single
          source of truth for what is collected, who can see it, when it stops, and how long
          checkpoints are kept. If anything in this summary differs from that disclosure, that
          disclosure controls.
        </p>
        <p>
          For everything else — shipping, delivery quotes, taxes — we use the address you enter and
          validate as part of the transaction.
        </p>
      </Section>

      <Section title="4. Monitoring and recording of walkthroughs">
        <p>
          Video walkthroughs may be monitored or recorded by Vendibook for safety, quality, fraud
          prevention, and dispute resolution. Before entering a meeting room you must tick a box
          confirming you understand and consent to this. Your consent is stored with your account,
          the walkthrough, the versions of the documents you accepted, and the time.
        </p>
        <p>
          Not every walkthrough is monitored or recorded, and we do not promise that any particular
          walkthrough was captured. Where audio or video is captured, access is limited to authorized
          Vendibook personnel reviewing a report, safety concern, or transaction dispute, to service
          providers acting under contract, and to disclosures required by law or legal process. It is
          kept no longer than needed for those purposes and is never sold or used for advertising.
        </p>
        <p>
          If you do not want to be monitored or recorded, do not join the meeting room. You can
          message the other party and arrange the walkthrough another way.
        </p>
      </Section>

      <Section title="5. What we store when you consent">
        <p>
          When you accept the walkthrough terms and this notice, we write an audit record containing:
          your account identifier, the walkthrough identifier, the document versions accepted, the
          time of acceptance, the application surface you accepted from, and whether camera,
          microphone, and (where required) location permission were granted at that moment.
        </p>
        <p>
          That consent record does not contain camera or microphone streams, a transcript, or a
          history of your location. Consent records are kept for as long as needed to evidence
          agreement and resolve disputes, consistent with our{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="6. Who can see this data">
        <p>
          Walkthrough and handoff data is restricted to the participants of the relevant walkthrough
          or transaction, authorized Vendibook personnel, and service providers acting on our
          instructions (including our video infrastructure provider and our cloud hosting provider).
          Live location for an active delivery is visible only to that order’s buyer, the seller, the
          assigned driver, and administrators. None of it is exposed on public listing pages or
          through shareable public links.
        </p>
      </Section>

      <Section title="7. Your choices and controls">
        <p>
          You can revoke camera, microphone, or location permission at any time in your browser or
          device settings. Revoking camera or microphone means you will not be able to join a live
          walkthrough until you grant it again; revoking location ends live delivery sharing.
          Declining any permission never blocks browsing, messaging, or checkout.
        </p>
        <p>
          To request access to, correction of, or deletion of data associated with your account,
          contact{' '}
          <a href="mailto:support@vendibook.com" className="underline">support@vendibook.com</a>.
          Some records, such as transaction and consent records, may be retained where we have a
          legal or dispute-resolution need.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          Vendibook is intended for business use by adults. We do not knowingly request device
          permissions from, or collect device data about, anyone under 18.
        </p>
      </Section>

      <Section title="9. Changes to this notice">
        <p>
          We may update this notice. Each version carries a version identifier, and the version you
          acknowledged is stored with your consent record. Material changes require fresh
          acknowledgement at the pre-join screen before your next walkthrough.
        </p>
      </Section>

      <Section title="10. Related documents">
        <p>
          This notice supplements the Vendibook{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>,{' '}
          <Link to="/terms" className="underline">Terms of Service</Link>, and the{' '}
          <Link to="/legal/video-walkthrough-terms" className="underline">
            Video Walkthrough Terms of Use
          </Link>
          . Questions: <a href="mailto:support@vendibook.com" className="underline">support@vendibook.com</a>{' '}
          or (725) 755-9598, Monday–Friday, 9am–5pm Arizona time.
        </p>
      </Section>
    </main>
  </>
);

export default DevicePermissionsPrivacy;
