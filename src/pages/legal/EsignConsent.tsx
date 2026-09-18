import React from 'react';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/** /legal/esign — E-SIGN consent, accepted once per account and versioned. */
const EsignConsent: React.FC = () => (
  <LegalDocumentLayout
    slug="esign"
    heading="Electronic Records and Signatures Consent"
    seoTitle="Electronic Records and Signatures Consent | Vendibook"
    seoDescription="Your consent to receive Vendibook agreements, disclosures, and transaction records electronically, what you need to read them, and how to withdraw consent."
    related={['terms-of-service', 'privacy-policy', 'payments-terms']}
  >
    <Section title="1. Your consent">
      <p>
        You agree that Vendibook LC may give you agreements, disclosures, notices, receipts, and
        transaction records electronically — on the website, in the app, or by email — instead of on
        paper. You also agree that your electronic acceptance, such as ticking a box or clicking a
        button that says you agree, is your signature and has the same effect as signing on paper.
      </p>
    </Section>

    <Section title="2. What you need">
      <p>
        To read and keep these records you need a device with an up-to-date web browser, an internet
        connection, a working email address you can access, and enough storage or a printer to save
        or print a copy. If you can read this page and receive email from us, you meet these
        requirements.
      </p>
    </Section>

    <Section title="3. Withdrawing your consent">
      <p>
        You may withdraw this consent at any time by emailing support@vendibook.com from the address
        on your account. Withdrawal takes effect once we process it and does not undo records already
        delivered electronically. Because Vendibook is an online marketplace, withdrawing consent
        means you can no longer buy, sell, rent, or list through the platform, and we may close your
        account.
      </p>
    </Section>

    <Section title="4. Paper copies">
      <p>
        You can request a paper copy of any agreement or record we have given you electronically by
        emailing support@vendibook.com. We do not charge for this.
      </p>
    </Section>

    <Section title="5. Keeping your contact details current">
      <p>
        Keep your email address and phone number up to date in your account settings. Notices sent to
        the address on your account are treated as delivered. If your email stops working, update it
        before you transact.
      </p>
    </Section>

    <Section title="6. Scope">
      <p>
        This consent covers your Vendibook account and everything you do through it, including
        listings, bookings, purchases, payment onboarding, walkthroughs, handoff records, and
        deliveries. It stays in effect until you withdraw it.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default EsignConsent;
