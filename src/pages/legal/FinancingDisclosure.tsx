import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/** /legal/financing-disclosure — third-party financing and pay-over-time. */
const FinancingDisclosure: React.FC = () => (
  <LegalDocumentLayout
    slug="financing-disclosure"
    heading="Financing and Pay-Over-Time Disclosure"
    seoTitle="Financing and Pay-Over-Time Disclosure | Vendibook"
    seoDescription="Financing and pay-over-time options shown on Vendibook are offered by third-party providers under their own terms. Vendibook LC is not a lender and approval is not guaranteed."
    related={['payments-terms', 'terms-of-service', 'privacy-policy']}
  >
    <Section title="1. Vendibook LC is not a lender">
      <p>
        Vendibook LC is not a lender, a credit broker, or a credit repair organization, and does not
        originate, underwrite, approve, service, or guarantee any loan or payment plan. Financing and
        pay-over-time options shown on Vendibook are offered by third-party providers under their own
        terms, rates, and eligibility requirements. Approval is not guaranteed. Any rate, term, or
        monthly amount shown on Vendibook is an illustration only and is not an offer of credit. Your
        agreement for financing is with the provider, not with Vendibook LC, and your obligation to
        the seller for the purchase is separate from your obligation to the provider.
      </p>
    </Section>

    <Section title="2. Read the provider's terms">
      <p>
        Before you accept any financing or pay-over-time offer, read the provider's terms, including
        the rate, the total amount payable, the payment schedule, late fees, and what happens if you
        miss a payment. Those terms control, not anything shown on a Vendibook page.
      </p>
    </Section>

    <Section title="3. Compensation">
      <p>
        Vendibook LC may receive compensation from a financing partner when a buyer applies for or
        completes financing through a link on Vendibook. That compensation does not change the terms
        you are offered by the provider, and it does not make Vendibook LC a party to your financing
        agreement.
      </p>
    </Section>

    <Section title="4. Availability">
      <p>
        Financing options depend on the provider, the buyer, the amount, and the item. An option
        shown on one listing may not be available on another, and an option may disappear before you
        complete checkout. Vendibook LC does not control provider availability or decisions.
      </p>
    </Section>

    <Section title="5. Disputes with a provider">
      <p>
        A dispute about your financing agreement is between you and the provider. A dispute about the
        item you bought is between you and the seller, and is covered by the{' '}
        <Link to="/legal/payments-terms" className="underline">
          Payments, Fees, Refunds and Disputes
        </Link>{' '}
        terms.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default FinancingDisclosure;
