import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/recording-consent — Recording & Monitoring Notice
 *
 * The referenceable home of the monitoring/recording disclosure that previously
 * lived only inside the walkthrough terms. Copy must always say a session "may
 * be" monitored or recorded — never that a given session was.
 */
const RecordingConsent: React.FC = () => (
  <LegalDocumentLayout
    slug="recording-consent"
    heading="Recording & Monitoring Notice"
    seoTitle="Recording & Monitoring Notice | Vendibook"
    seoDescription="When a Vendibook video walkthrough may be monitored or recorded, who can access it, how long it is kept, and your responsibilities under state recording law."
    related={['video-walkthrough-terms', 'device-permissions-privacy', 'privacy-policy']}
  >
    <Section title="1. Scope">
      <p>
        This Notice applies to live video walkthroughs held inside Vendibook and to any audio or
        video session that Vendibook hosts between users. It is referenced by the{' '}
        <Link to="/legal/video-walkthrough-terms" className="underline">Video Walkthrough Terms of Use</Link>{' '}
        and by the pre-join consent screen.
      </p>
    </Section>

    <Section title="2. Sessions may be monitored or recorded">
      <p>
        A walkthrough <strong>may be monitored or recorded</strong> by Vendibook for safety, quality,
        fraud prevention, and dispute resolution. Monitoring means a session may be joined or
        reviewed by authorized personnel; recording means audio, video, or both may be captured and
        stored.
      </p>
    </Section>

    <Section title="3. Consent is required before you enter">
      <p>
        You must accept this Notice, together with the Walkthrough Terms and the Device Permissions
        &amp; Privacy Notice, before you can enter a meeting room. Your acceptance is stored with the
        time and the version of each document you accepted. If you do not consent, do not join —
        arrange a phone call, an in-person visit, or an exchange of photos instead.
      </p>
    </Section>

    <Section title="4. Not every session is captured">
      <p>
        Vendibook does <strong>not</strong> promise that any particular session was monitored or
        recorded, that a recording of a given session exists, that it is complete, or that it
        captured any specific moment, statement, or defect. Capture depends on the feature being
        enabled, on the provider, and on network and device conditions. Never rely on the existence
        of a recording as evidence you intend to use later — document what matters to you in writing
        through Vendibook messages as well.
      </p>
    </Section>

    <Section title="5. Who can access a recording">
      <p>Where a recording exists, access is limited to:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>authorized Vendibook personnel with a specific support, safety, fraud, or dispute reason;</li>
        <li>contracted service providers that host or process the session under confidentiality obligations and on our instructions; and</li>
        <li>disclosures required by law, legal process, or to protect the rights or safety of any person.</li>
      </ul>
      <p>
        Recordings are never sold, never used for advertising or marketing, and are not made public.
      </p>
    </Section>

    <Section title="6. Retention">
      <p>
        Where a recording exists, it is retained only as long as needed for the purpose it was
        captured for, and then deleted on a routine schedule — except where it is subject to an open
        support case, dispute, chargeback, investigation, or legal hold, in which case it is retained
        until that matter closes. You may ask what exists for your own sessions, and request
        deletion, by writing to support@vendibook.com; we will tell you if we must keep something and
        why.
      </p>
    </Section>

    <Section title="7. You may not record without consent">
      <p>
        Participants may not record, screen-capture, photograph the screen, live-stream, broadcast,
        transcribe for publication, or redistribute a session, in whole or in part, without the
        express consent of every participant. Consent to Vendibook's own monitoring is not consent
        for another participant to record you.
      </p>
      <p>
        Do not post a session or any part of it publicly. Doing so may violate these terms, the
        privacy of other participants, and applicable law, and may result in suspension of your
        account.
      </p>
    </Section>

    <Section title="8. State recording laws vary — your compliance is yours">
      <p>
        Laws governing the recording of conversations differ from state to state and country to
        country. Some jurisdictions require the consent of only one party to a conversation; others —
        sometimes called “all-party” or “two-party” consent states — require the consent of every
        participant, and recording without it can carry civil and criminal penalties. Which law
        applies can depend on where each participant is physically located, which may differ from
        where either of you lives or does business.
      </p>
      <p>
        <strong>Each participant is responsible for their own compliance</strong> with the recording
        and privacy laws that apply to them. If you are unsure whether you may record, ask the other
        participant and get their agreement in writing through Vendibook messages first, or do not
        record.
      </p>
      <p>
        This Notice is general information about how Vendibook operates. It is not legal advice, and
        it does not tell you what the law requires of you in your situation. Consult a qualified
        attorney if you need that answer.
      </p>
    </Section>

    <Section title="9. Changes">
      <p>
        Material changes to this Notice are published with a new version number and effective date,
        and participants are asked to accept the new version before their next session.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default RecordingConsent;
