import React from 'react';
import { Link } from 'react-router-dom';
import LegalDocumentLayout, { Section } from '@/components/legal/LegalDocumentLayout';

/**
 * /legal/payments-terms — Payments, Fees, Refunds and Disputes
 *
 * Copy guardrails (do not regress):
 *  - The legal entity is "Vendibook LC" in the parties, disclaimer, and
 *    liability sentences.
 *  - Never state or imply that Vendibook LC holds, controls, or takes custody
 *    of user funds, or holds funds in trust. Never use custodial framing.
 *  - "Payment protection" is PayPal's own program and is always attributed to
 *    PayPal. Vendibook LC never guarantees, insures, or backstops a sale.
 *  - No surcharge language: the commission is identical regardless of the
 *    payment method the buyer selects.
 */
const PaymentsTerms: React.FC = () => (
  <LegalDocumentLayout
    slug="payments-terms"
    heading="Payments, Fees, Refunds and Disputes"
    seoTitle="Payments, Fees, Refunds and Disputes | Vendibook"
    seoDescription="How payments work on Vendibook: PayPal processes payments directly to the seller, how the platform commission works, refunds, disputes, taxes, and prohibited transactions."
    related={['terms-of-service', 'seller-payment-terms', 'handoff-terms', 'financing-disclosure', 'privacy-policy']}
  >
    <Section title="1. Scope">
      <p>
        These terms apply whenever you pay, receive payment, or are charged a fee on Vendibook. They
        are part of the <Link to="/terms" className="underline">Terms of Service</Link>.
      </p>
    </Section>

    <Section title="2. Vendibook LC's role">
      <p>
        Vendibook LC operates a marketplace. We are a technology platform that connects buyers,
        renters, sellers, and hosts of mobile food assets. We are not a bank, money transmitter,
        payment processor, lender, credit broker, dealer, auctioneer, freight carrier, inspector, or
        insurer, and we are not a party to any transaction between a buyer and a seller. Every sale,
        rental, and booking is a contract between those two parties, and each of them — not
        Vendibook LC — is responsible for performing it.
      </p>
    </Section>

    <Section title="3. How money moves">
      <p>
        Payments on Vendibook are processed by PayPal through PayPal Complete Payments. When a buyer
        pays, funds move from the buyer's selected funding source directly into the seller's own
        PayPal account. Vendibook LC does not hold, control, or take custody of those funds at any
        point, does not hold funds in trust or on behalf of either party, and cannot release,
        withhold, freeze, or redirect a seller's proceeds. The only money Vendibook LC receives from
        a transaction is its own platform commission, which PayPal settles to Vendibook LC
        separately. If you have a question about the timing or availability of your proceeds, that
        question is between you and PayPal.
      </p>
    </Section>

    <Section title="4. Platform commission">
      <p>
        Vendibook LC charges a platform commission on transactions it facilitates. The commission and
        any applicable service fee are disclosed before you publish a listing and again before a
        buyer completes payment. The commission is calculated on the transaction total and is
        deducted at the time of payment by PayPal. In your PayPal transaction details it appears as
        "Partner commissions". The commission is the same regardless of which payment method the
        buyer selects, and no additional charge is applied for choosing any particular payment
        method.
      </p>
    </Section>

    <Section title="5. What appears on a buyer's statement">
      <p>
        The charge for your purchase is made through PayPal on behalf of the seller. It may appear on
        your card or bank statement with a PayPal prefix followed by the seller's own descriptor —
        for example "PAYPAL *" and then the seller's business name.
      </p>
      <p>
        The name that shows is the seller's business name, which is not necessarily the title of the
        listing you bought from. Before you open a dispute because you do not recognise a charge,
        check the order in your Vendibook account or message the seller. Opening a dispute over a
        charge you simply did not recognise delays everyone.
      </p>
    </Section>

    <Section title="6. Refunds">
      <p>
        A refund is issued by the seller, either from their Vendibook dashboard or from their PayPal
        account. Vendibook LC cannot issue a refund out of its own funds and cannot compel a seller
        to refund. A refund can only be completed if the seller's PayPal account has sufficient
        available balance or funding; if it does not, the refund will fail and the seller must add
        funds to complete it. Where a transaction is refunded in full before the item is delivered,
        picked up, or the rental period begins, Vendibook LC's platform commission is refunded with
        it. Where a transaction is refunded after that point, or refunded only in part, the platform
        commission is retained, because the service it pays for has already been delivered.
      </p>
    </Section>

    <Section title="7. Disputes and chargebacks">
      <p>
        A buyer may open a dispute or a chargeback directly with PayPal or with their card issuer.
        That process is governed by PayPal's rules and the issuer's rules, not by ours, and we cannot
        decide its outcome.
      </p>
      <p>
        Eligible transactions may qualify for PayPal's own purchase protection under PayPal's terms.
        That is PayPal's program. It is not a Vendibook LC guarantee, and Vendibook LC does not
        insure or backstop any transaction.
      </p>
      <p>
        <strong>Do not assume PayPal purchase protection applies to a Vendibook purchase.</strong> Under
        PayPal's published rules that program excludes vehicles, which includes food trucks and towed
        trailers; businesses sold as a going concern; items that are wholly or partly custom-made,
        which covers most custom build-outs; items bought for resale; and industrial machinery used in
        manufacturing. It also excludes "item not received" claims where the buyer collected the item
        in person, which covers every local pickup. Where a surviving claim is decided in a buyer's
        favour, PayPal may require the buyer to return the item at the buyer's own expense. For most of
        what is listed on Vendibook, the Vendibook case process described in section 7A is the practical
        remedy.
      </p>
      <p>
        A buyer who pays by card may have broader chargeback rights through their card issuer. A buyer
        cannot pursue both a PayPal claim and a card chargeback for the same transaction; choosing one
        forecloses the other. Vendibook LC does not advise which route to take.
      </p>
    </Section>

    <Section title="7A. The Vendibook case process">
      <p>
        Either party to an order may open a Vendibook case from the order page, from the time payment is
        taken until the reporting window for that order closes. A case captures the issue type, a written
        description, and any photo or video evidence. The other party is notified immediately with a
        response deadline, and both parties and Vendibook LC share a single case thread. Statements in a
        case are append-only: once written, neither party can alter or delete them.
      </p>
      <p>
        <strong>While a case is open, no seller payment may be sent on that order.</strong> Opening a case
        before disbursement freezes the disbursement trigger immediately. If Vendibook LC cannot determine
        the case status of an order, no payment is released.
      </p>
      <p>
        Freezing also pauses the payment-condition countdown for that order. The time remaining when the
        case opened is preserved and resumes when the case closes without a refund. Both parties can see
        that the countdown is paused and why.
      </p>
      <p>
        Only a Vendibook LC administrator may resolve a frozen order. An administrator may request
        information from either side and records one outcome: resolved between the parties, refunded in
        full, refunded in part, released to the seller, or closed with no action. Every outcome is recorded
        with the administrator, the reason, and the time it was made, and every state change on a frozen
        order is written to an append-only financial audit record.
      </p>
      <p>
        PayPal requires a buyer to attempt resolution with the seller before filing a claim, and opening a
        Vendibook case satisfies that step. <strong>Opening or continuing a Vendibook case does not extend,
        pause, or replace any deadline that PayPal or a card issuer sets.</strong> A buyer who wants to
        preserve a PayPal or issuer remedy must observe those deadlines independently.
      </p>
      <p>
        At a seller's request, or where we are required to, Vendibook LC may provide transaction
        records to PayPal. Those records can include walkthrough consent records, handoff photos and
        video, delivery checkpoints, message history, and listing history.
      </p>
      <p>
        Sellers are responsible for the outcome of a dispute on their own transaction, including any
        chargeback amount and any fee charged by PayPal or the issuer.
      </p>
    </Section>

    <Section title="8. Taxes, freight, and estimates">
      <p>
        Amounts shown at checkout for freight, delivery, and sales or use tax are estimates
        calculated from the information entered for the transaction. Final amounts can change based
        on the actual delivery address, vehicle class, route, and applicable law. Responsibility for
        collecting and remitting transaction tax is allocated between Vendibook LC and the seller in
        accordance with applicable marketplace facilitator law. Sellers remain responsible for their
        own income tax, business licensing, and any tax not covered by that allocation. PayPal, as
        the payment settlement entity, is responsible for issuing any applicable Form 1099-K to
        sellers. Vendibook LC does not provide tax or legal advice.
      </p>
    </Section>

    <Section title="9. Prohibited and restricted transactions">
      <p>You may not use Vendibook to do any of the following:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Sell a vehicle or trailer you do not hold clear title to, or have no authority to sell.</li>
        <li>Sell an asset that carries a lien you have not disclosed.</li>
        <li>
          Misrepresent permitting, licensing, inspection status, or code compliance of a unit or its
          equipment.
        </li>
        <li>Sell a unit with an undisclosed salvage, flood, or rebuilt title.</li>
        <li>
          Represent propane, fire suppression, or generator equipment as certified, tagged, or
          inspected when it is not.
        </li>
        <li>
          Solicit another party off-platform in order to avoid marketplace records, protections, or
          fees.
        </li>
      </ul>
      <p>
        We may remove a listing, cancel a transaction, or suspend an account for any of the above.
      </p>
    </Section>

    <Section title="10. Off-platform payment">
      <p>
        If you pay a seller outside Vendibook, we have no record of the payment, no ability to help
        you dispute it, and no visibility into what was agreed. Off-platform payment is at your own
        risk.
      </p>
    </Section>

    <Section title="11. Payment authorisation and authority">
      <p>
        By paying, you confirm you are authorised to use the funding source you selected. If you are
        paying for a business, you confirm you are authorised to bind that business to the purchase.
        All amounts on Vendibook are in United States dollars (USD).
      </p>
    </Section>

    <Section title="12. Failed and declined payments">
      <p>
        A payment can be declined or left unsettled by PayPal, your bank, or your card issuer. When
        that happens we show you what happened and, where it is possible, a way to try again. A
        transaction is only complete when PayPal confirms the payment. Nothing shown in the Vendibook
        interface before that confirmation means a payment succeeded.
      </p>
    </Section>

    <Section title="13. Payment abuse">
      <p>
        We may suspend or close an account that files dishonest disputes, attempts to reverse a
        payment for an item it received and kept, structures transactions to avoid the commission, or
        uses the platform to test stolen payment credentials.
      </p>
    </Section>

    <Section title="14. Used equipment is sold as is">
      <p>
        Unless the seller gives you a written warranty, used trucks, trailers, and equipment sold on
        Vendibook are sold as is, with all faults. Vendibook LC does not inspect, test, certify, or
        warrant any unit, and makes no representation about its condition, mechanical soundness,
        roadworthiness, or fitness for any purpose. Inspect before you buy.
      </p>
    </Section>

    <Section title="15. Relationship to the Terms of Service">
      <p>
        Governing law, dispute resolution between you and Vendibook LC, limitation of liability,
        indemnification, suspension, and termination are set out in the{' '}
        <Link to="/terms" className="underline">Terms of Service</Link>, which these terms form part
        of. Sellers should also read the{' '}
        <Link to="/legal/seller-payment-terms" className="underline">Seller Payment Terms</Link>.
      </p>
    </Section>
  </LegalDocumentLayout>
);

export default PaymentsTerms;
