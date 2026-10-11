import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/handoff-terms — what "Verified Handoff" does and, more importantly,
 * does not mean. Accepted before handoff evidence capture; enforced
 * server-side in `handoff-ops`.
 */
const HandoffTerms: React.FC = () => (
  <LegalDocumentLayout
    slug="handoff-terms"
    heading="Verified Handoff and Condition Evidence Terms"
    seoTitle="Verified Handoff and Condition Evidence Terms | Vendibook"
    seoDescription="What Verified Handoff means on Vendibook, what it does not mean, how handoff photos and video are stored and used, and how to capture responsibly."
    related={['payments-terms', 'location-tracking', 'video-walkthrough-terms', 'privacy-policy']}
  >
    <Section title="1. What “Verified Handoff” means">
      <p>
        "Verified Handoff" means only that the participants completed a defined set of steps inside
        Vendibook — confirming identity of the parties to the transaction, capturing photos or video
        at the time of handoff, and marking the handoff complete. It is not an inspection, appraisal,
        certification, or warranty by Vendibook LC. It says nothing about the condition, mechanical
        soundness, roadworthiness, equipment function, title, lien status, insurance, permitting,
        licensing, or code compliance of anything handed over. Vendibook LC is not present at the
        handoff, does not review the media you capture at the time you capture it, and does not
        verify that what was handed over matches what was listed.
      </p>
    </Section>

    <Section title="2. Who can capture, and who can see it">
      <p>
        Both parties may capture photos and video. Media is saved to the transaction and is visible
        to the participants in that transaction, to authorised Vendibook LC support, and — where a
        dispute is opened — to PayPal and to any party legally entitled to it.
      </p>
    </Section>

    <Section title="3. Capture responsibly">
      <p>
        Do not record bystanders who are not part of the transaction. Do not capture inside a private
        residence without permission. Audio recording is regulated differently from state to state,
        and in some states every person present must consent before audio is recorded. You are
        responsible for your own compliance with the law where you are standing.
      </p>
    </Section>

    <Section title="4. Retention">
      <p>
        Handoff media and delivery checkpoints are retained as transaction evidence for a defined
        period, and longer where a dispute, claim, or legal hold is open. Media is stored privately
        and is served through short-lived links, not permanent public URLs.
      </p>
    </Section>

    <Section title="5. How evidence may be used">
      <p>
        Evidence captured at handoff may be used by either party in a PayPal dispute, and by
        Vendibook LC to investigate a report of fraud or misrepresentation.
      </p>
    </Section>

    <Section title="6. What completing a handoff does not do">
      <p>
        Completing a handoff does not waive the buyer's rights against the seller, and does not create
        any obligation of Vendibook LC. Payment, refunds, and disputes are governed by the{' '}
        <Link to="/legal/payments-terms" className="underline">
          Payments, Fees, Refunds and Disputes
        </Link>{' '}
        terms.
      </p>
    </Section>

    <Section title="7. Location at handoff">
      <p>
        If a participant confirms a pickup or handoff with location sharing on, that is covered by the{' '}
        <Link to="/legal/location-tracking" className="underline">
          Location and Delivery Tracking Disclosure
        </Link>
        .
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default HandoffTerms;
