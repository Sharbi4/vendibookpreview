import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '@/components/SEO';
import { WALKTHROUGH_TERMS_VERSION } from '@/lib/walkthroughConsent';

/**
 * /legal/video-walkthrough-terms
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
        <p className="text-sm text-muted-foreground">Version {WALKTHROUGH_TERMS_VERSION}</p>
      </header>

      <Section title="What a video walkthrough is">
        <p>
          A Vendibook video walkthrough is a scheduled, private live video meeting between a buyer or
          renter and a seller or host, held inside Vendibook. It is intended to help you see a food
          truck, trailer, mobile kitchen, or vendor space and ask questions before you transact.
        </p>
      </Section>

      <Section title="No verification of condition, title, or ownership">
        <p>
          A video walkthrough is a conversation, not an inspection, appraisal, or certification.
          Vendibook does not attend, verify, or guarantee anything shown during a walkthrough, and a
          completed walkthrough does not confirm the condition, mechanical soundness, title, lien
          status, permitting, or ownership of any item or space.
        </p>
        <p>
          You are responsible for your own due diligence, including in-person inspection,
          professional evaluation, and document verification, before you buy, rent, or pay.
        </p>
      </Section>

      <Section title="Your conduct">
        <p>
          Be present, on time, and respectful. Harassment, threats, discriminatory conduct, sexual
          content, nudity, impersonation, and sharing illegal content are prohibited and may result
          in removal from Vendibook. Do not attempt to move the meeting off Vendibook in order to
          avoid marketplace protections or fees.
        </p>
      </Section>

      <Section title="Recording">
        <p>
          Vendibook does not record or transcribe walkthroughs. If recording is ever offered, it will
          require a separate, clearly disclosed opt-in before any recording begins. Participants may
          not record, screen-capture, or redistribute a walkthrough without the express consent of
          every participant and any applicable legal permission.
        </p>
      </Section>

      <Section title="Camera, microphone, and device permissions">
        <p>
          Joining a walkthrough requires camera and microphone access in your browser. Vendibook does
          not require device location for ordinary browsing, messaging, or checkout. Location is
          requested only where a specific step depends on it, such as an in-person pickup or handoff
          verification. See the{' '}
          <Link to="/legal/device-permissions-privacy" className="underline">
            Device Permissions &amp; Privacy Notice
          </Link>
          .
        </p>
      </Section>

      <Section title="Scheduling, no-shows, and cancellations">
        <p>
          Join opens shortly before the scheduled start and closes after the meeting window ends.
          Please cancel or reschedule in advance if plans change. Repeated no-shows may limit your
          ability to schedule future walkthroughs.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          Video walkthroughs depend on third-party video infrastructure and your network. Vendibook
          does not guarantee uninterrupted availability. If a call fails, your scheduled walkthrough
          and your transaction remain intact and can be rescheduled.
        </p>
      </Section>

      <Section title="Other terms">
        <p>
          These terms supplement, and do not replace, the Vendibook{' '}
          <Link to="/terms" className="underline">Terms of Service</Link> and{' '}
          <Link to="/privacy" className="underline">Privacy Policy</Link>. Where they conflict, the
          Terms of Service control.
        </p>
      </Section>
    </main>
  </>
);

export default VideoWalkthroughTerms;
