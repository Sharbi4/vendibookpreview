import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/handoff-terms — Verified Handoff & Condition Evidence Terms
 *
 * Accepted before the first capture step of a handoff, recorded against the
 * order id. "Verified Handoff" describes a documented process only — never an
 * inspection, certification, or guarantee by Vendibook.
 */
const HandoffTerms: React.FC = () => (
  <LegalDocumentLayout
    slug="handoff-terms"
    heading="Verified Handoff & Condition Evidence Terms"
    seoTitle="Verified Handoff & Condition Evidence Terms | Vendibook"
    seoDescription="What the Vendibook handoff record is and is not, what media is captured, who can see it, and how it is used in a dispute."
    related={['payments-terms', 'location-tracking', 'privacy-policy']}
  >
    <Section title="1. Scope and acceptance">
      <p>
        These Terms govern the Vendibook handoff flow and any photo, video, note, or signature
        captured during a delivery, pickup, or condition walk-around. By starting a handoff step you
        accept these Terms on your own behalf and on behalf of any business you act for. They
        supplement the{' '}
        <Link to="/terms" className="underline">Terms of Service</Link>.
      </p>
    </Section>

    <Section title="2. What the handoff flow is — and is not">
      <p>
        A handoff record is a shared record created <em>by the participants</em> — the buyer or
        renter, the seller or host, and any assigned driver. It documents what the participants
        themselves captured and stated at the moment an item changed hands.
      </p>
      <p>
        A handoff record is <strong>not</strong> an inspection, appraisal, certification, valuation,
        survey, safety check, or guarantee by Vendibook. Vendibook does not attend the handoff, does
        not examine the item, and does not verify anything captured or stated during it.
      </p>
    </Section>

    <Section title="3. What “Verified Handoff” means">
      <p>
        “Verified Handoff” describes a <strong>documented process</strong>: that the participants
        completed the handoff steps inside Vendibook and that a record exists. It is not a
        verification of condition, mechanical soundness, roadworthiness, equipment function, mileage
        or hours, title, lien status, registration, permitting, code compliance, insurance, or
        ownership. No badge, label, or timeline entry on Vendibook should be read as a statement that
        Vendibook checked or approved the item.
      </p>
      <p>
        Each party remains fully responsible for its own due diligence, including in-person
        inspection and independent professional evaluation, before completing a transaction.
      </p>
    </Section>

    <Section title="4. What is captured and stored">
      <ul className="list-disc space-y-1 pl-5">
        <li>photos and video you choose to capture or upload during a handoff step;</li>
        <li>notes, exception descriptions, and the outcome you select;</li>
        <li>timestamps and the identity of the account that captured each item;</li>
        <li>signatures, where a step asks for one; and</li>
        <li>
          a location point for a step, only where you granted location permission for that specific
          step — see the{' '}
          <Link to="/legal/location-tracking" className="underline">Location &amp; Delivery Tracking Disclosure</Link>.
        </li>
      </ul>
      <p>Capture only begins after you explicitly start it. Nothing is captured in the background.</p>
    </Section>

    <Section title="5. Who can see handoff media">
      <p>
        Handoff media and metadata are visible to the participants on that transaction — the buyer or
        renter, the seller or host, an assigned driver for the step they performed — and to
        authorized Vendibook administrators for support, safety, fraud prevention, and dispute
        review. Media is stored privately and served only through short-lived, access-checked links.
        It is never placed on a public listing page or a public share link.
      </p>
    </Section>

    <Section title="6. Licence to Vendibook">
      <p>
        You retain ownership of the media you capture. You grant Vendibook a limited, non-exclusive,
        worldwide, royalty-free licence to host, store, reproduce, and display that media solely to:
        maintain the transaction record; operate and support the handoff feature; review and resolve
        a dispute or chargeback; prevent fraud and abuse; and comply with a legal obligation.
      </p>
      <p>
        Vendibook does not use handoff media for marketing, advertising, promotion, model training,
        or any public display, and will not make it public, without your separate written permission.
      </p>
    </Section>

    <Section title="7. What you must not capture or upload">
      <ul className="list-disc space-y-1 pl-5">
        <li>
          people who are not participants in the transaction, and in particular minors, without their
          informed consent (and a parent's or guardian's consent where required);
        </li>
        <li>
          the interior of a private residence, or any private space, beyond what the transaction
          genuinely requires;
        </li>
        <li>
          identity documents, payment card details, account credentials, or other sensitive personal
          information;
        </li>
        <li>content you do not have the rights to upload, or that infringes anyone's rights; and</li>
        <li>content that is unlawful, harassing, threatening, or deliberately misleading.</li>
      </ul>
      <p>
        You are responsible for complying with the recording, photography, and privacy laws that
        apply where the handoff takes place. Vendibook may remove content that violates this section
        and may suspend an account for repeated or serious violations.
      </p>
    </Section>

    <Section title="8. Use in a dispute">
      <p>
        If a dispute is raised on Vendibook, we may review the handoff record — media, notes,
        timestamps, status events, and any location captured with permission — together with
        messages and payment records, and we may share relevant parts of it with the other party so
        they can respond.
      </p>
      <p>
        Any decision Vendibook reaches is a <strong>platform-level decision</strong> about access,
        listing status, records, and any platform policy that applies. It is not a legal
        adjudication of the parties' rights, not binding on any court or payment provider, and not a
        determination of liability. A payment dispute or chargeback is decided by PayPal or the
        card issuer under their own rules. Nothing here limits either party's right to pursue its own
        remedies.
      </p>
    </Section>

    <Section title="9. Retention">
      <p>
        Handoff media and events are retained with the transaction record for as long as we keep that
        record, because they may be needed for a dispute, a chargeback, an accounting or tax
        requirement, or a legal obligation. You may request deletion by writing to
        support@vendibook.com; we will honour the request except where we must keep material for one
        of those reasons, and we will tell you when that applies.
      </p>
    </Section>

    <Section title="10. Pickup and access codes">
      <p>
        Some handoffs use a one-time pickup code or a one-time driver link. These are issued to a
        specific person for a specific transaction, expire, and can be revoked at any time by the
        seller or by Vendibook.
      </p>
      <p>
        Do not share a code or link with anyone who is not the intended recipient, do not attempt to
        guess or reuse a code, and do not use a code to take possession of an item you are not
        entitled to receive. Misuse may result in cancellation of the transaction, suspension of your
        account, and referral to law enforcement. Releasing an item against a code is the seller's or
        driver's decision, not Vendibook's; a valid code is not proof of identity or of entitlement.
      </p>
    </Section>

    <Section title="11. Changes">
      <p>
        We may update these Terms. Material changes are published with a new version number and
        effective date, and you will be asked to accept the new version before your next handoff.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default HandoffTerms;
