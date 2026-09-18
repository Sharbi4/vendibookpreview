import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/financing-disclosure — Financing & Pay-Over-Time Disclosure
 *
 * Linked from every financing banner and CTA. Vendibook is never described as
 * a lender, broker, or credit intermediary, and no rate or term is advertised.
 */
const FinancingDisclosure: React.FC = () => (
  <LegalDocumentLayout
    slug="financing-disclosure"
    heading="Financing & Pay-Over-Time Disclosure"
    seoTitle="Financing & Pay-Over-Time Disclosure | Vendibook"
    seoDescription="Financing shown on Vendibook is offered by independent third-party providers, subject to their approval. Vendibook is not a lender or broker."
    related={['payments-terms', 'terms-of-service']}
  >
    <Section title="1. Vendibook is not a lender">
      <p>
        Vendibook is not a bank, lender, credit union, finance company, loan broker, credit
        intermediary, or credit services organisation. Vendibook does not originate, underwrite,
        approve, decline, fund, purchase, or service any loan, lease, line of credit, or
        pay-over-time plan, and does not make any credit decision about you.
      </p>
    </Section>

    <Section title="2. Who provides the financing">
      <p>
        Any financing or pay-over-time option shown on Vendibook — including options presented under
        a provider's name and logo — is offered by an <strong>independent third-party provider</strong>{' '}
        under that provider's own application, agreement, terms, and privacy policy. Your credit
        relationship, if one is formed, is with that provider and not with Vendibook.
      </p>
      <p>
        Following a financing link may take you to the provider's own site or application flow. What
        you submit there is handled by the provider under its terms and privacy policy, not ours.
      </p>
    </Section>

    <Section title="3. Approval is not guaranteed">
      <p>
        All financing is subject to the provider's approval and eligibility criteria. Rates, fees,
        amounts, terms, down payment, collateral requirements, and availability are set by the
        provider, vary by applicant and by state, and may not be available for every item, every
        business, or every transaction on Vendibook.
      </p>
      <p>
        Approval is not guaranteed. Applying may involve a credit inquiry, which can affect your
        credit. Estimated payment figures shown anywhere on Vendibook, if any, are illustrative only
        and are not an offer, a quote, or a prediction of what a provider will offer you.
      </p>
    </Section>

    <Section title="4. Not an offer of credit">
      <p>
        Nothing on Vendibook is an offer or a commitment to lend, an advertisement of specific credit
        terms, or an invitation to apply on particular terms. Vendibook does not state an annual
        percentage rate, finance charge, payment amount, term, or down payment for any credit
        product, and nothing on the platform should be read as triggering or satisfying disclosure
        requirements that apply to a creditor or a credit advertisement.
      </p>
    </Section>

    <Section title="5. How Vendibook is compensated">
      <p>
        Vendibook does not receive interest, finance charges, or any share of the cost of credit you
        pay to a provider. Vendibook may receive a referral, marketing, or partnership fee from a
        financing provider for introductions made through the platform. Such a fee is paid by the
        provider, is not added to your cost of credit by Vendibook, and does not influence whether a
        provider approves you. Where a specific arrangement exists with a named provider, we will
        disclose it on the surface where that provider appears.
      </p>
    </Section>

    <Section title="6. Equal credit opportunity">
      <p>
        Financing providers on Vendibook are expected to comply with the Equal Credit Opportunity Act
        and Regulation B, which prohibit creditors from discriminating against an applicant on the
        basis of race, colour, religion, national origin, sex, marital status, age (provided the
        applicant has the capacity to contract), because all or part of the applicant's income
        derives from a public assistance programme, or because the applicant has in good faith
        exercised a right under the Consumer Credit Protection Act.
      </p>
      <p>
        If you believe a provider has discriminated against you, raise it with that provider and with
        the relevant regulator. Vendibook is not the creditor and cannot review a credit decision.
      </p>
    </Section>

    <Section title="7. Where to take questions">
      <p>
        All questions about an application, an approval or decline, the terms of an agreement,
        payments, payoff, hardship, collections, credit reporting, or a dispute about a financing
        account must go directly to the provider. Vendibook cannot access, change, pause, or resolve
        anything on a provider's account, and cannot speak for a provider.
      </p>
      <p>
        Questions about a Vendibook listing, order, fee, or payout — as distinct from the financing
        itself — go to support@vendibook.com or (725) 755-9598, Monday–Friday, 9am–5pm Arizona time.
        See also the{' '}
        <Link to="/legal/payments-terms" className="underline">Payments, Fees, Refunds &amp; Payouts Terms</Link>.
      </p>
    </Section>

    <Section title="8. Nothing here is advice">
      <p>
        This Disclosure is information about Vendibook's role. It is not legal, tax, credit, or
        financial advice. Consider your own circumstances and seek professional advice before taking
        on credit for a business purchase.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default FinancingDisclosure;
