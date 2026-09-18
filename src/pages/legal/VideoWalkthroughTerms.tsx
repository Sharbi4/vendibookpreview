import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { WALKTHROUGH_TERMS_VERSION } from '@/lib/walkthroughConsent';

/**
 * /legal/video-walkthrough-terms
 *
 * Operative walkthrough terms presented at the pre-join consent gate. The
 * version string here must match WALKTHROUGH_TERMS_VERSION, which is what we
 * store on each consent record.
 */
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

const VideoWalkthroughTerms: React.FC = () => (
  <>
    <SEO
      title="Video Walkthrough Terms of Use | Vendibook"
      description="Terms that apply to live video walkthroughs scheduled and held inside Vendibook."
      canonical="https://vendibook.com/legal/video-walkthrough-terms"
    />
    <main className="mx-auto max-w-3xl px-4 py-12 space-y-8 text-foreground">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Vendibook Video Walkthrough Terms of Use</h1>
        <p className="text-sm text-muted-foreground">
          Version {WALKTHROUGH_TERMS_VERSION} · Effective September 18, 2026
        </p>
      </header>

      <Section title="1. Scope and acceptance">
        <p>
          These Video Walkthrough Terms of Use (“Walkthrough Terms”) govern your participation in a
          live video walkthrough hosted inside Vendibook. By ticking the acceptance boxes on the
          pre-join screen and entering a meeting room, you agree to these Walkthrough Terms on your
          own behalf and on behalf of any business you are acting for. If you do not agree, do not
          join the meeting room.
        </p>
        <p>
          “Vendibook”, “we”, and “us” mean Vendibook and its operating entity. “Participant” means
          any person who enters a walkthrough meeting room. “Walkthrough” means a scheduled, private
          live audio-video meeting between a buyer or renter and a seller or host, held through the
          Vendibook platform.
        </p>
      </Section>

      <Section title="2. What a walkthrough is — and is not">
        <p>
          A walkthrough is a conversation. It is not an inspection, appraisal, certification,
          survey, or professional evaluation. Vendibook does not attend, supervise, verify, or
          guarantee anything shown, said, or promised during a walkthrough.
        </p>
        <p>
          Completing a walkthrough does not confirm the condition, mechanical soundness, roadworthiness,
          equipment function, title, lien status, insurance, permitting, licensing, code compliance,
          or ownership of any vehicle, trailer, kitchen, equipment, or space. You remain responsible
          for your own due diligence — including in-person inspection, independent professional
          evaluation, and verification of title and documents — before you buy, rent, or pay.
        </p>
      </Section>

      <Section title="3. Eligibility and accounts">
        <p>
          You must have a Vendibook account in good standing, be at least 18 years old, and be a
          buyer, renter, seller, or host associated with the listing in question (or an authorized
          representative of one). Meeting rooms open only to the two participants on the scheduled
          walkthrough. You may not share access, invite additional attendees without the other
          participant’s agreement, or join on behalf of someone whose account has been suspended.
        </p>
      </Section>

      <Section title="4. Participant conduct">
        <p>
          Be present, on time, and respectful. The following are prohibited and may result in
          removal from the meeting, cancellation of the walkthrough, and suspension or termination
          of your Vendibook account: harassment, threats, intimidation, or abusive language;
          discriminatory conduct, including conduct prohibited by fair housing and public
          accommodation laws; sexual content or nudity; impersonation or misrepresentation of
          identity, authority, or ownership; display of illegal content or activity; and attempts to
          disrupt, overload, reverse engineer, or circumvent the meeting service.
        </p>
        <p>
          Do not solicit participants to move the transaction off Vendibook in order to avoid
          marketplace records, protections, or fees. Off-platform chat, offers, and payments cannot
          be verified by us and are not covered by our dispute records.
        </p>
      </Section>

      <Section title="5. Monitoring and recording">
        <p>
          Walkthroughs may be monitored or recorded by Vendibook for safety, quality, fraud
          prevention, and dispute resolution. Consent to this is required before you can enter a
          meeting room. If you do not consent, do not join; you may message the other party and
          arrange the walkthrough another way.
        </p>
        <p>
          Not every walkthrough is monitored or recorded, and Vendibook does not promise that a
          recording of any particular walkthrough exists, was captured completely, or will be made
          available to you. Where a recording exists, access is limited to authorized Vendibook
          personnel investigating a report, safety concern, or transaction dispute, to our service
          providers acting under contract, and to disclosures required by law or legal process.
          Recordings are retained no longer than needed for those purposes and are never sold or
          used for advertising.
        </p>
        <p>
          Participants may not record, screen-capture, live-stream, or redistribute a walkthrough
          themselves without the express consent of every participant and any consent required by
          applicable law. See section 5A on state recording law.
        </p>
      </Section>

      <Section title="5A. State recording law">
        <p>
          Recording laws vary by state. Some states require only one party to a conversation to
          consent. Other states require every participant to consent before audio is recorded.
        </p>
        <p>
          If you record a walkthrough yourself — on your phone, with screen capture, or with any
          other tool — you are responsible for your own compliance with the law that applies to you
          and to the other participant. Vendibook LC does not provide legal advice and does not
          determine which state's law applies to your call. If you are unsure, ask the other
          participant on the call, out loud, before you record.
        </p>
        <p>
          The same rules apply to photos and video captured at an in-person handoff. See the{' '}
          <Link to="/legal/handoff-terms" className="underline">
            Verified Handoff and Condition Evidence Terms
          </Link>
          .
        </p>
      </Section>

      <Section title="6. Camera, microphone, and device permissions">
        <p>
          Joining a walkthrough requires you to grant camera and microphone access in your browser.
          You can revoke those permissions at any time in your browser or device settings, which
          will prevent you from joining until you grant them again. Vendibook does not require device
          location to browse, message, or check out; location is requested only where a specific step
          depends on it, such as an in-person pickup or delivery handoff. See the{' '}
          <Link to="/legal/device-permissions-privacy" className="underline">
            Device Permissions &amp; Privacy Notice
          </Link>{' '}
          for details on what is collected and retained.
        </p>
      </Section>

      <Section title="7. Scheduling, no-shows, and cancellations">
        <p>
          Join opens shortly before the scheduled start time and closes after the meeting window
          ends. Times shown reflect the seller’s or host’s published availability and time zone.
          Please cancel or reschedule in advance if plans change. Repeated no-shows or last-minute
          cancellations may limit your ability to schedule future walkthroughs.
        </p>
      </Section>

      <Section title="8. Service availability">
        <p>
          Walkthroughs depend on third-party real-time video infrastructure, your device, and your
          network connection. The service is provided “as is” and “as available”, and Vendibook does
          not guarantee uninterrupted, error-free, or defect-free meetings. If a call fails or
          quality is poor, your scheduled walkthrough, your listing, and any related transaction
          remain intact and the walkthrough can be rescheduled.
        </p>
      </Section>

      <Section title="9. No agency; no endorsement">
        <p>
          Vendibook is a marketplace. We are not a party to, agent for, broker of, or guarantor of
          any transaction discussed during a walkthrough, and nothing said in a walkthrough creates
          an obligation for Vendibook. Statements made by a participant are that participant’s own.
        </p>
      </Section>

      <Section title="10. Disclaimers and limitation of liability">
        <p>
          To the fullest extent permitted by law, Vendibook disclaims all warranties relating to
          walkthroughs, whether express or implied, including implied warranties of merchantability,
          fitness for a particular purpose, and non-infringement. Vendibook is not liable for
          indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost
          profits, lost data, or losses arising from statements, conduct, or omissions of another
          participant. Nothing in these Walkthrough Terms limits liability that cannot be limited
          under applicable law. Any additional limits and exclusions in the{' '}
          <Link to="/terms" className="underline">Terms of Service</Link> also apply.
        </p>
      </Section>

      <Section title="11. Reporting a problem">
        <p>
          If a participant behaves inappropriately, misrepresents a listing, or makes you feel
          unsafe, end the meeting and report it to{' '}
          <a href="mailto:support@vendibook.com" className="underline">support@vendibook.com</a> or
          call (725) 755-9598, Monday through Friday, 9am–5pm Arizona time. Include the listing and
          the scheduled meeting time so we can locate the record.
        </p>
      </Section>

      <Section title="12. Changes to these terms">
        <p>
          We may update these Walkthrough Terms. Each version carries a version identifier, and the
          version you accepted is stored with your consent record. Material changes require fresh
          acceptance at the pre-join screen before your next walkthrough.
        </p>
      </Section>

      <Section title="13. Relationship to other agreements">
        <p>
          These Walkthrough Terms supplement, and do not replace, the Vendibook{' '}
          <Link to="/terms" className="underline">Terms of Service</Link> and{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>, which also govern
          governing law, dispute resolution, and account termination. Where they conflict on a given
          point, the Terms of Service control except as to matters specific to walkthroughs, which
          these Walkthrough Terms control.
        </p>
      </Section>
    </main>
  </>
);

export default VideoWalkthroughTerms;
