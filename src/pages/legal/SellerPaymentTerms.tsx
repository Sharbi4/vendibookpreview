import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/seller-payment-terms — accepted by a seller before Vendibook LC
 * generates their PayPal partner referral link. Enforced server-side in
 * `paypal-seller-onboarding`.
 */
const SellerPaymentTerms: React.FC = () => (
  <LegalDocumentLayout
    slug="seller-payment-terms"
    heading="Seller Payment Terms"
    seoTitle="Seller Payment Terms | Vendibook"
    seoDescription="What a seller agrees to when connecting a PayPal Business account to Vendibook: onboarding, permissions, commission, refunds, disputes, and disconnecting."
    related={['payments-terms', 'esign', 'terms-of-service', 'privacy-policy']}
  >
    <Section title="1. Scope">
      <p>
        These terms apply to you as a seller or host who accepts payment on Vendibook. They are an
        addendum to the{' '}
        <Link to="/legal/payments-terms" className="underline">Payments, Fees, Refunds and Disputes</Link>{' '}
        terms and to the <Link to="/terms" className="underline">Terms of Service</Link>. You accept
        them before we create your PayPal onboarding link.
      </p>
    </Section>

    <Section title="2. You must onboard with PayPal">
      <p>
        To accept payments you must onboard with PayPal through Vendibook and maintain a PayPal
        Business account in good standing. A PayPal Business account includes a sole proprietorship
        in your own legal name; Vendibook LC does not require you to form an LLC or registered
        company. PayPal performs the identity verification, may request a tax ID such as a sole
        proprietor&apos;s Social Security number, and decides whether you are eligible, what your limits
        are, and when your funds are available.
      </p>
    </Section>

    <Section title="3. What you authorise us to do">
      <p>
        By onboarding you grant Vendibook LC permission to act on your behalf for defined payment
        operations:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Creating and updating orders that name you as payee.</li>
        <li>Applying the disclosed platform commission.</li>
        <li>Issuing refunds you initiate.</li>
        <li>Attaching shipment tracking to your orders.</li>
        <li>Reading your account's payment status and capabilities.</li>
      </ul>
      <p>
        You are entering into a direct agreement with PayPal and are bound by PayPal's own terms. We
        do not act beyond the permissions listed above.
      </p>
    </Section>

    <Section title="4. When you can start accepting payments">
      <p>
        You cannot accept payments until PayPal confirms three things: your primary email address is
        confirmed, your account can receive payments, and the permissions you granted are in place.
        We will show you your status. Until all three are true, PayPal checkout will not render on
        your listings and we will tell you why.
      </p>
    </Section>

    <Section title="5. Disconnecting">
      <p>
        You may disconnect your PayPal account from Vendibook at any time from your dashboard.
        Disconnecting stops us from offering PayPal payment on your listings and stops new orders. It
        does not cancel orders already placed, does not reverse completed payments, and does not
        release you from obligations to buyers who have already paid.
      </p>
    </Section>

    <Section title="6. You are the merchant of record">
      <p>
        You are the merchant of record for your own transactions. You are responsible for describing
        your listing accurately, delivering what you sold, handling your own refunds, responding to
        your own disputes, and complying with the law that applies to your business — including
        title, lien, licensing, permitting, tax, and safety requirements.
      </p>
    </Section>

    <Section title="7. Platform commission">
      <p>
        Vendibook LC charges a platform commission on transactions it facilitates. It is disclosed to
        you before you publish and is deducted by PayPal at the time of payment. In your PayPal
        records it appears as "Partner commissions". The commission is the same regardless of which
        payment method your buyer selects. Full detail, including how refunds affect the commission,
        is in the{' '}
        <Link to="/legal/payments-terms" className="underline">Payments, Fees, Refunds and Disputes</Link>{' '}
        terms.
      </p>
    </Section>

    <Section title="8. Card data">
      <p>
        Card data never touches Vendibook LC's systems. Card fields at checkout are rendered and
        processed by PayPal.
      </p>
    </Section>

    <Section title="9. PayPal processing rates">
      <p>
        Pay Later and other funding sources may carry different processing rates set by PayPal.
        PayPal charges those processing costs to you as the seller and merchant of record, not to
        Vendibook LC. Review PayPal&apos;s current merchant pricing before accepting payments.
      </p>
    </Section>

    <Section title="10. Payment logging">
      <p>
        We log payment API requests and responses for debugging and dispute support for a limited
        retention period. We do not log card numbers or full payment credentials.
      </p>
    </Section>

    <Section title="11. Suspension">
      <p>
        We may pause payment acceptance on your listings if PayPal reports that your account can no
        longer receive payments, if your permissions are revoked, or if we are investigating a report
        of fraud or misrepresentation on your account.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default SellerPaymentTerms;
