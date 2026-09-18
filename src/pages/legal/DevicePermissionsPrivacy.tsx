import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { DEVICE_PRIVACY_VERSION } from '@/lib/walkthroughConsent';

/**
 * /legal/device-permissions-privacy
 *
 * PLACEHOLDER PRODUCT COPY — REQUIRES LEGAL REVIEW BEFORE PRODUCTION.
 * This text has not been reviewed or approved by an attorney.
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
      description="How Vendibook uses camera, microphone, and device location permissions, and when each is required."
      canonical="https://vendibook.com/legal/device-permissions-privacy"
    />
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8 text-foreground">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Device Permissions &amp; Privacy Notice</h1>
        <p className="text-sm text-muted-foreground">Version {DEVICE_PRIVACY_VERSION}</p>
      </header>

      <Section title="You can use Vendibook without device permissions">
        <p>
          Browsing listings, saving favorites, messaging sellers, viewing listing details, and
          completing an ordinary purchase or booking do not require camera, microphone, or location
          access.
        </p>
      </Section>

      <Section title="Camera and microphone">
        <p>
          Camera and microphone are required only to join a live video walkthrough, and only for the
          duration of that call. Audio and video are streamed live between participants through our
          video infrastructure provider. Vendibook does not record or transcribe walkthroughs, and no
          call media is stored in your Vendibook account.
        </p>
        <p>
          Camera and microphone may also be used, with your permission, when you choose to capture
          photos or video during a handoff or condition walkthrough. In that case the media you
          deliberately capture is saved to the transaction as evidence and is visible to the
          transaction participants and Vendibook support.
        </p>
      </Section>

      <Section title="Device location">
        <p>
          Vendibook does not request precise device location for browsing or for a normal payment.
          Location is requested only where a specific step depends on it, such as confirming an
          in-person pickup or delivery handoff. Where a step requires it, you cannot complete that
          step without granting permission or using an approved alternative, such as a pickup code.
        </p>
        <p>
          For everything else, Vendibook uses the address you provide and validate as part of the
          transaction.
        </p>
      </Section>

      <Section title="What we keep when you consent">
        <p>
          When you accept the walkthrough terms and this notice, we store an audit record containing
          your account, the walkthrough, the version of the documents you accepted, the time, the
          page you accepted on, and whether camera, microphone, and (when required) location
          permission were granted. We do not store camera or microphone streams or a history of your
          location as part of that record.
        </p>
      </Section>

      <Section title="Recording">
        <p>
          Recording is off. If Vendibook ever offers recorded walkthroughs, it will require a
          separate opt-in with disclosure of how the recording is used and how long it is kept.
        </p>
      </Section>

      <Section title="Changing your mind">
        <p>
          You can revoke camera, microphone, or location permission at any time in your browser or
          device settings. Revoking camera or microphone means you will not be able to join a live
          walkthrough until you grant it again.
        </p>
      </Section>

      <Section title="Other terms">
        <p>
          This notice supplements the Vendibook{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>,{' '}
          <Link to="/terms" className="underline">Terms of Service</Link>, and the{' '}
          <Link to="/legal/video-walkthrough-terms" className="underline">
            Video Walkthrough Terms of Use
          </Link>
          .
        </p>
      </Section>
    </main>
  </>
);

export default DevicePermissionsPrivacy;
