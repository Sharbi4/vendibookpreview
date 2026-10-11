ALTER TABLE public.legal_acceptances
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.legal_documents(id),
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS security_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS legal_acceptances_document_id_idx ON public.legal_acceptances(document_id);
CREATE INDEX IF NOT EXISTS legal_acceptances_context_idx ON public.legal_acceptances(user_id, related_entity_type, related_entity_id, document_slug, document_version);

WITH docs(document_type, version, status, title, slug, summary, body_markdown, change_summary) AS (
VALUES
('sale_buyer_terms','2026-09-18','active','Vendibook Purchase Agreement','purchase-agreement','The transaction-specific terms between a buyer and seller using Vendibook for a sale.', $md$
# Vendibook Purchase Agreement

Effective September 18, 2026. This version is frozen when accepted. Vendibook LC recommends review by qualified legal counsel.

## 1. Definitions
**Buyer** is the person purchasing the Asset. **Seller** is the person offering it. **Asset** is the food truck, trailer, mobile kitchen, equipment, or other property identified in the listing and order snapshot. **Transaction Record** is the listing snapshot, agreed price, fulfillment selection, messages, agreement records, payment metadata, handoff records, and related support or dispute history stored for the order.

## 2. Marketplace role
Vendibook LC provides marketplace, communication, agreement, payment-integration, fulfillment-record, and support tools. Vendibook is not the Buyer, Seller, dealer, lender, insurer, carrier, title company, inspection service, or guarantor of the Asset or transaction. Vendibook does not promise that a listing, seller, title, condition, delivery, financing decision, refund, or outcome is verified or guaranteed.

## 3. Transaction-specific terms
The listing and checkout show the Asset, Seller, agreed price, taxes or fees displayed for the order, payment method, and selected pickup, seller-delivery, or freight arrangement. Those details and the frozen listing/order snapshot are part of this Agreement. Seller-written warranties apply only when they appear expressly in that snapshot or a signed writing; otherwise no additional warranty is created by Vendibook.

## 4. Seller authority and disclosures
The Seller represents that the Seller has authority to offer and transfer the Asset and will disclose known material defects, liens, title limitations, ownership issues, or other facts that would materially affect the transaction. The Seller remains responsible for the accuracy and legality of the listing and transfer documents.

## 5. Buyer due diligence
The Buyer is responsible for evaluating suitability, condition, dimensions, equipment, permits, and value before completing the handoff. A live video walkthrough may be scheduled, but it is optional unless the transaction record states otherwise and is not an inspection or guarantee. Where applicable, the Buyer should independently inspect the Asset and review title, VIN, serial numbers, ownership documents, lien releases, and transfer requirements before acceptance.

## 6. Payment and financing
Online payment is processed through PayPal under PayPal's terms and privacy practices. Vendibook does not store the Buyer's full card number. Available funding methods are determined by PayPal. Financing is offered only by independent third parties when the Buyer chooses to apply; Vendibook is not a lender and does not decide approval, rates, or terms.

PayPal Purchase Protection applies only to eligible transactions; PayPal's current U.S. terms exclude vehicles. Review PayPal's current terms before purchasing a food truck or trailer.

## 7. Electronic records and signatures
The parties agree to use electronic records and signatures for this transaction. Checkout acceptance does not replace any later two-party bill of sale or other document required for the transaction. Each accepted version and content hash is retained with the Transaction Record.

## 8. Pickup, delivery, freight, and handoff
The selected fulfillment method controls the next-step workflow. Pickup timing and location must be coordinated by the parties. Seller delivery is performed or arranged by the Seller unless the order says otherwise. Freight coordination, charges, carrier terms, and tracking apply only as shown in the order. A separately required freight payment will be identified before it is charged.

Location and GPS information is informational. It does not by itself prove legal delivery, title transfer, condition, acceptance, or authorization for money movement. Live location appears only when an authorized seller or driver starts Delivery Mode and grants location permission.

## 9. Inspection and acceptance at handoff
The Buyer should inspect the Asset at handoff and promptly document any material issue in the order record. Photos, video, messages, delivery checkpoints, signatures, and handoff confirmations may be used as transaction evidence, but no single signal automatically decides a legal dispute.

## 10. Cancellations, refunds, cases, and chargebacks
Cancellations and refunds follow the listing snapshot, Payments Terms, signed documents, PayPal rules, and applicable law. Either party may open a Vendibook case within the available reporting window. An open case may pause applicable internal review deadlines and prevents seller payment review from completing until an administrator resolves the case. Opening a Vendibook case does not extend any PayPal or card-issuer deadline. A buyer cannot pursue both a PayPal claim and a card chargeback for the same transaction where PayPal's rules prohibit simultaneous remedies.

## 11. Taxes, title, registration, permits, and compliance
The parties are responsible for taxes, title and registration, licenses, permits, inspections, health and fire requirements, and other legal obligations assigned to them by law. Vendibook's checkout or records do not replace government filings or professional advice.

## 12. Communications and records
Keep material communications, agreed changes, and fulfillment details in Vendibook so they remain connected to the Transaction Record. Support may review transaction records as needed to operate the service, address fraud or security, and mediate a case.

## 13. Privacy and device permissions
The Checkout Privacy & Electronic Consent and Privacy Policy describe data handling. Camera and microphone access is requested only for an active video walkthrough. Video calls are not recorded by default. Any future recording requires separate explicit disclosure and consent. Location permission is requested only when a location-dependent feature is actively used.

## 14. Platform limitations
Vendibook provides the marketplace workflow as available and does not guarantee uninterrupted service, seller performance, Asset condition, title, delivery, financing, PayPal eligibility, or a particular dispute result. Rights that cannot legally be limited remain unaffected.

## 15. Support and incorporated terms
This Agreement incorporates the frozen Transaction Record and the then-current Terms of Service, Payments Terms, Privacy Policy, Financing Disclosure when applicable, Handoff Terms, and Location Tracking Disclosure. Support: support@vendibook.com or /support.
$md$, 'New transaction-specific sale agreement for embedded PayPal checkout'),
('rental_transaction_terms','2026-09-18','active','Vendibook Rental Agreement','rental-agreement','The transaction-specific terms between a renter and host using Vendibook for a booking.', $md$
# Vendibook Rental Agreement

Effective September 18, 2026. This version is frozen when accepted. Vendibook LC recommends review by qualified legal counsel.

## 1. Definitions
**Renter** is the person requesting or making the booking. **Host** is the person offering the Rental Asset. **Rental Asset** is the truck, trailer, kitchen, vendor space, equipment, or location identified in the listing. **Rental Period** is the selected date and time range. **Booking Record** is the frozen listing and booking snapshot, rates, fees, deposit if shown, requirements, messages, agreements, payment metadata, fulfillment, check-in, return, support, and dispute records.

## 2. Marketplace role
Vendibook LC provides marketplace, booking, communication, agreement, payment-integration, fulfillment-record, and support tools. Vendibook is not the Host, Renter, landlord, carrier, insurer, lender, inspection service, or guarantor. Vendibook does not promise availability, condition, permits, insurance, access, delivery, refunds, or party performance.

## 3. Booking-specific terms
The listing and checkout show the Rental Asset, Rental Period, applicable rate, displayed service fee, delivery charge, taxes, and security deposit only when the booking actually includes them. The selected details and frozen Booking Record form part of this Agreement. Host rules, cancellation terms, access instructions, and return instructions apply only when shown in the listing, booking, or a later signed record.

## 4. Host responsibilities
The Host represents that the Host has authority to offer the Rental Asset, will provide accurate material information, will disclose known material limitations, and will make the Rental Asset or location available as accepted in the Booking Record. The Host remains responsible for lawful operation of the listing and any obligations assigned to the Host by law.

## 5. Renter eligibility and information
The Renter must provide accurate identity, contact, business, intended-use, and compliance information requested for the listing. The Renter may not transfer the booking or allow unauthorized use contrary to the Host's rules.

## 6. Lawful use, permits, and compliance
The Renter must use the Rental Asset lawfully and follow applicable permits, licenses, food-service, health, fire, building, parking, zoning, and code requirements. The checkout does not represent that any permit or approval is included.

## 7. Insurance and required documents
Insurance is not included unless the Booking Record expressly states that it is. The Renter must answer insurance questions accurately and provide only documents the Host requires at the stated stage. Required documents may be reviewed by the Host or Vendibook for the booking workflow but are not a guarantee of coverage or validity.

## 8. Condition, check-in, care, damage, and loss
The parties should document condition at check-in and check-out. The Renter must use reasonable care, follow operating and towing instructions, and report damage, loss, or a material issue promptly. Responsibility for damage, loss, cleaning, late return, or other charges depends on the Booking Record, evidence, signed terms, and applicable law; Vendibook does not determine liability merely from a GPS point or status update.

## 9. Payment, deposit, and host acceptance
PayPal processes online payment under PayPal's terms and privacy practices. Vendibook does not store the Renter's full card number. Available methods are determined by PayPal. A booking is confirmed immediately only when the checkout identifies it as Instant Book and server records show payment complete. Otherwise, payment may be recorded while the request awaits Host acceptance. Deposit handling applies only when a deposit appears in the Booking Record.

## 10. Cancellation, refund, and no-show
Cancellation, refund, late-arrival, and no-show results follow the frozen listing policy, Booking Record, Payments Terms, PayPal rules, and applicable law. Do not assume a refund unless the applicable record provides one or an authorized administrator or payment provider confirms it.

## 11. Pickup, delivery, on-site access, and return
Pickup, seller delivery, or on-site access appears according to the actual listing. Delivery location is shown only when delivery applies. Live location becomes available only after the Host or assigned driver starts Delivery Mode and permits location access. Static kitchens and vendor spaces do not use a delivery timeline. Return or retrieval rules apply only when the Host has specified them in the listing or Booking Record.

## 12. Disputes and evidence
Either party may report a problem through the booking or order record. Messages, listing snapshots, documents, check-in/check-out media, delivery checkpoints, agreement records, and consent records may be linked as evidence. An administrator may request information and record an outcome. No single status, location point, or upload automatically decides a legal dispute.

## 13. Communications, privacy, and device permissions
Keep material booking communications in Vendibook. The Checkout Privacy & Electronic Consent and Privacy Policy govern transaction data. Location, camera, and microphone permissions are feature-specific and not bundled into this Agreement. Video calls are not recorded by default; any future recording requires separate explicit disclosure and consent.

## 14. Platform limitations and support
Vendibook does not guarantee the Rental Asset, Host, Renter, insurance, permits, access, condition, delivery, or outcome. This Agreement incorporates the frozen Booking Record and then-current Terms of Service, Payments Terms, Privacy Policy, and relevant Handoff or Location terms. Support: support@vendibook.com or /support.
$md$, 'New transaction-specific rental agreement for embedded PayPal checkout'),
('checkout_privacy_electronic_consent','2026-09-18','active','Checkout Privacy & Electronic Consent','checkout-privacy-consent','How transaction data and electronic records are used during sale and rental checkout.', $md$
# Checkout Privacy & Electronic Consent

Effective September 18, 2026. This version is frozen when accepted. Vendibook LC recommends review by qualified legal counsel.

## 1. Transaction information
Vendibook uses account and contact information, listing or booking details, messages, price, fee and payment metadata, fulfillment or delivery details, agreement and consent records, dispute and support data, and reasonable device or security metadata needed to operate, secure, document, and support the transaction.

## 2. Payment and financing providers
PayPal receives and processes payment information under PayPal's own terms and privacy practices. Vendibook does not store full card numbers. Independent financing providers receive information only when a user chooses to apply with that provider; Vendibook is not the lender.

## 3. Feature-specific permissions
Delivery location or GPS is collected only while a location-dependent feature is actively used and permission is granted. Camera and microphone access is requested only for a live video walkthrough. Video calls are not recorded by default. Any future recording requires a separate explicit disclosure and consent before recording begins.

## 4. Service providers and retention
Service providers may process information to provide hosting, payment, communications, documents, mapping, delivery, fraud prevention, analytics, and support functions. Transaction records are retained as reasonably needed for operations, accounting, legal, security, and dispute obligations, consistent with the Privacy Policy.

## 5. Privacy rights
The Privacy Policy at /privacy explains access, correction, deletion, and other rights and how to submit a request. Some transaction records may need to be retained when required for legal, accounting, fraud-prevention, or dispute purposes.

## 6. Electronic records and signatures
You consent to receive, review, accept, and sign transaction agreements, notices, receipts, and records electronically. You may print or download documents from the legal page, checkout reader, order record, or browser. Electronic acceptance has the same intended effect as a handwritten signature to the extent allowed by law.

## 7. System requirements
You need a current web browser, internet access, an email address, and a device capable of displaying web pages and PDF files. Keep your email address current. Contact support@vendibook.com if you cannot access a record electronically.

## 8. Withdrawing electronic-delivery consent
Where legally applicable, you may contact support@vendibook.com to withdraw consent for future electronic delivery. Withdrawal may prevent completion of future online transactions and may require another legally available delivery method. Withdrawal does not retroactively invalidate an agreement or record already completed.

## 9. Separate choices
Marketing email, promotional SMS, GPS, camera, microphone, and recording consent are not included in this checkout consent. Marketing and promotional SMS choices remain separate and are not a condition of purchase. Transactional notices may be sent when operationally necessary for the service or required by law, consistent with existing communication preferences and applicable law.

## 10. Frozen acceptance record
Vendibook records the accepted document identifier, version, content hash, timestamp, checkout surface, related listing or booking context, route, locale, user agent, and reasonable security metadata. If the active document changes in a way that requires reacceptance, checkout requires acceptance of the new version.
$md$, 'New checkout-specific privacy and electronic-record consent')
)
INSERT INTO public.legal_documents (
  document_type, version, status, title, slug, summary, body_markdown,
  content_hash, change_summary, effective_at, requires_reacceptance
)
SELECT document_type, version, status, title, slug, summary, body_markdown,
       encode(digest(body_markdown, 'sha256'), 'hex'), change_summary,
       '2026-09-18T00:00:00Z'::timestamptz, true
FROM docs
ON CONFLICT (document_type, version) DO NOTHING;