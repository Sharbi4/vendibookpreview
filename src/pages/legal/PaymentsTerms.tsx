import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/payments-terms — Payments, Fees, Refunds & Payouts Terms
 *
 * Copy guardrails: never imply custody of funds; "payment protection" is a platform policy,
 * not insurance and not a financial guarantee. Vendibook is not a bank, lender,
 * money transmitter, broker, dealer, agent, insurer, or a party to the sale.
 */
const PaymentsTerms: React.FC = () => (
  <LegalDocumentLayout
    slug="payments-terms"
    heading="Payments, Fees, Refunds & Payouts Terms"
    seoTitle="Payments, Fees, Refunds & Payouts Terms | Vendibook"
    seoDescription="How Vendibook checkout, platform fees, payment protection, refunds, chargebacks, and seller payouts work. Payments are processed by PayPal."
    related={['terms-of-service', 'handoff-terms', 'financing-disclosure', 'privacy-policy']}
  >
    <Section title="1. Scope">
      <p>
        These Terms apply whenever you pay, receive payment, or are charged a fee on Vendibook. They
        form part of the{' '}
        <Link to="/terms" className="underline">Terms of Service</Link>. Capitalised terms not
        defined here have the meaning given there.
      </p>
    </Section>

    <Section title="2. Vendibook's role">
      <p>
        Vendibook operates a marketplace. The contract for any sale or rental is <strong>between the
        buyer or renter and the seller or host</strong>. Vendibook is not a party to that contract.
      </p>
      <p>
        Vendibook is not a bank, lender, money transmitter, payment institution, broker, dealer,
        agent, fiduciary, auctioneer, carrier, or insurer, and does not act on behalf of either party
        in a transaction. Vendibook does not take title to, possess, inspect, or warrant any item
        listed on the platform.
      </p>
    </Section>

    <Section title="3. Payment processing">
      <p>
        Card and wallet payments on Vendibook are processed by <strong>PayPal</strong>. Your use of
        checkout is also subject to PayPal's own user agreement and privacy statement, which you must
        accept directly with PayPal. Vendibook does not hold, custody, or control user funds, and
        does not operate a customer account or balance on your behalf.
      </p>
      <p>
        PayPal may decline, hold, review, reverse, or limit a payment under its own rules. Where that
        happens, Vendibook will show you the outcome and, where possible, a way to retry — but
        Vendibook cannot override a payment provider's decision.
      </p>
    </Section>

    <Section title="4. “Payment protection” — what it means and what it does not">
      <p>
        “Payment protection” on Vendibook means a set of <strong>platform policies</strong>: online
        payments run through PayPal rather than being handed over in cash; the transaction, its
        amounts, and its status are recorded on the platform; messages, handoff records, and delivery
        events are preserved; and Vendibook will review that record and apply its policies if a
        dispute is raised.
      </p>
      <p>Payment protection is <strong>not</strong>:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>insurance or a warranty of any kind;</li>
        <li>a guarantee that you will receive a refund, a replacement, or any payment;</li>
        <li>a guarantee of an item's condition, title, authenticity, or fitness for any purpose;</li>
        <li>a custodial or trust arrangement — Vendibook does not hold your money; or</li>
        <li>a substitute for PayPal's own buyer or seller protection programmes, which are governed solely by PayPal.</li>
      </ul>
      <p>
        Payment protection does not apply to pay-in-person or cash transactions, or to anything
        arranged or paid for outside Vendibook.
      </p>
    </Section>

    <Section title="5. Platform fees">
      <p>
        Vendibook charges platform fees for facilitating a transaction. The applicable fee, and how
        it is split between the parties, is shown before you commit — at checkout for a buyer or
        renter, and in the listing and payout views for a seller or host. Fees are calculated on the
        transaction amount shown at that point and are charged when the payment is captured or, for a
        subscription or add-on, when that product is purchased or renews.
      </p>
      <p>
        Platform fees are non-refundable except where these Terms, a published Vendibook policy, or
        applicable law requires otherwise — for example, where an order is cancelled before capture,
        or where Vendibook refunds the transaction in full under its own policy.
      </p>
    </Section>

    <Section title="6. What is shown at checkout">
      <p>
        Checkout shows the item or rental price, any freight or delivery charge, any applicable
        platform fee, and an estimated tax amount where estimation is possible. Totals are
        server-calculated; the amount you authorise is the amount shown on the final review step.
      </p>
      <p>
        <strong>Tax amounts shown are estimates</strong> until finalised, and may change. Vendibook
        is not a tax adviser and does not determine, collect, or remit sales, use, excise,
        registration, titling, or property tax on a vehicle, trailer, or unit on behalf of the
        parties unless expressly stated for that transaction. Responsibility for determining,
        reporting, collecting, and paying all applicable taxes, and for any registration or titling
        obligation, sits with the buyer and the seller — not with Vendibook. Get your own advice.
      </p>
    </Section>

    <Section title="7. Seller onboarding and payout eligibility">
      <p>
        To receive money from a Vendibook transaction, a seller or host must be a business, must
        maintain an eligible PayPal business account in good standing, and must complete any
        identity, business verification, or know-your-customer steps that PayPal requires. Those
        requirements are imposed and assessed by PayPal, not by Vendibook, and Vendibook cannot
        waive, accelerate, or appeal them.
      </p>
      <p>
        Payouts are reviewed and released by Vendibook administrators after the applicable
        confirmation, delivery, or review step. Vendibook does not guarantee a specific wall-clock
        release time. Timing may vary because of dispute review, refunds, risk review, account
        restrictions imposed by a payment provider, weekends and holidays, and banking delays.
      </p>
      <p>
        Vendibook may withhold, delay, reduce, or reverse a payout where there is suspected fraud or
        misrepresentation, an open dispute or chargeback, a refund owed to a buyer, a violation of
        the Terms of Service or a Vendibook policy, a legal or regulatory requirement, or a payment
        provider instruction. Where we do this, we will tell the seller the reason unless we are
        prohibited from doing so.
      </p>
    </Section>

    <Section title="8. Refunds and cancellations">
      <p>
        A refund may be initiated by the seller or host, or by Vendibook where a published policy
        applies. A buyer or renter requests a refund through the order page or by contacting support;
        the request goes to the seller first, and to Vendibook if it is not resolved.
      </p>
      <p>Order of operations for a refund:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>the refund is recorded against the order on Vendibook;</li>
        <li>the reversal is submitted to PayPal, which returns the funds to the original payment method;</li>
        <li>any payout that has not yet been released is adjusted, and any payout already released may be recovered from future proceeds or invoiced to the seller; and</li>
        <li>platform fees are returned only to the extent section 5 provides.</li>
      </ul>
      <p>
        Timing of the funds arriving back with the payer is controlled by PayPal and the payer's bank
        or card issuer, not by Vendibook.
      </p>
    </Section>

    <Section title="9. Chargebacks and disputes">
      <p>
        If a buyer raises a chargeback or a claim with PayPal or a card issuer, that process is
        governed entirely by those parties. Both the buyer and the seller must cooperate promptly and
        in good faith with any request for information from Vendibook or from the payment provider,
        including handoff records, delivery evidence, and messages.
      </p>
      <p>
        Where a chargeback results in funds being taken back, the seller is responsible for the
        amount reversed and any associated fee, and Vendibook may recover it from future proceeds.
        Vendibook may pause payouts on an account with an open dispute. Opening a chargeback for a
        transaction you in fact received, or to avoid platform fees, is a violation of the Terms of
        Service.
      </p>
    </Section>

    <Section title="10. Prohibited transactions and off-platform payment">
      <p>
        You must not use Vendibook to process a payment that is not for a genuine listed transaction,
        to test or launder funds, to sell anything you may not lawfully sell, or to circumvent
        platform fees.
      </p>
      <p>
        <strong>Moving a payment off Vendibook removes your payment protection.</strong> There is no
        Vendibook transaction record, no dispute record, no handoff evidence tied to a payment, and
        no ability for Vendibook to review or assist. Requests to pay by wire, gift card, cash app
        transfer, or cryptocurrency outside the platform are a common fraud pattern. Keep messages,
        offers, and payments on Vendibook.
      </p>
    </Section>

    <Section title="11. Title, registration, delivery, and risk of loss">
      <p>
        Title, ownership, registration, lien release, keys, documents, and possession pass between
        the buyer and the seller under their own agreement and under applicable law. Vendibook is not
        a party to that transfer, does not hold or convey title, and does not verify title, lien
        status, or registration.
      </p>
      <p>
        Unless the parties agree otherwise in writing, risk of loss passes on physical delivery or
        pickup of the item. Transport, whether arranged through a freight partner, performed by the
        seller, or performed by a driver the parties arrange, is between the parties and the
        transport provider. Vendibook does not employ, supervise, or insure any driver or carrier.
      </p>
    </Section>

    <Section title="12. Financing">
      <p>
        Where a pay-over-time or financing option is shown, it is offered by an independent
        third-party provider and is subject to that provider's approval. Vendibook is not a lender or
        credit intermediary. See the{' '}
        <Link to="/legal/financing-disclosure" className="underline">Financing &amp; Pay-Over-Time Disclosure</Link>.
      </p>
    </Section>

    <Section title="13. Changes">
      <p>
        We may update these Terms. Material changes are published with a new version number and
        effective date, and apply to transactions started after that date.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default PaymentsTerms;
