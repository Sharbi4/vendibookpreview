BEGIN;
SELECT pg_advisory_xact_lock(hashtext('vendibook-seller-terms-v3'));
UPDATE public.legal_documents SET status='retired' WHERE document_type='seller_terms' AND status='active' AND version <> 'v3';
INSERT INTO public.legal_documents (id,document_type,version,effective_at,status,title,summary,body_markdown,content_hash,change_summary,slug,requires_reacceptance)
SELECT gen_random_uuid(),'seller_terms','v3',now(),'active','Vendibook Seller Terms',
'Seller obligations, sale fees, payment methods, fulfillment, and transaction records.',
$terms$# Vendibook Seller Terms

**Effective September 24, 2026 · Version v3**

These Seller Terms govern your use of Vendibook to offer equipment for sale. “You” means the seller and, when you act for a business, the business you are authorized to represent. “Vendibook” means the marketplace operator identified in the [Terms of Service](/terms). By affirmatively accepting these Seller Terms in the publishing or transaction process, you agree to them.

## 1. Scope and marketplace role

These Seller Terms supplement the Terms of Service, Marketplace Rules, Privacy Policy, and the transaction-specific agreement you accept. They apply to sales; rental listings remain subject to the applicable host and renter terms.

Vendibook provides listing, communication, transaction-record, and related coordination tools. Unless expressly identified as the seller in a separate written agreement, Vendibook does not own, sell, manufacture, inspect, certify, or warrant listed equipment. The sale is between you and the buyer. A listing, verification indicator, payment connection, financing link, or walkthrough does not establish equipment condition, clear title, regulatory approval, or fitness for a buyer’s intended use.

For seller fees and payment methods, these Seller Terms control over inconsistent general descriptions on the platform. A buyer-seller agreement may specify the asset, price, inspection, fulfillment, and transfer obligations, but cannot change Vendibook’s fees or bind Vendibook without its written agreement. Mandatory law and non-waivable rights remain controlling.

## 2. Eligibility, authority, and account information

You must be legally able to enter the sale and have authority to act for the asset owner. Provide accurate account and business information and keep contact details current. Where reasonably necessary for compliance, fraud prevention, or payment processing, you may be asked to provide identity, business, ownership, or tax documentation through designated secure channels.

You must not impersonate Vendibook staff, another seller, a lender, or a payment provider. Protect your login credentials and promptly report suspected unauthorized activity. Do not request passwords, verification codes, or card details through marketplace messages.

## 3. Ownership, liens, and transfer documents

List only assets you own or are specifically authorized to sell. Disclose material ownership restrictions, liens, financing balances, title issues, salvage or rebuilt status, and other interests that could affect transfer. Do not represent that an asset has clear title unless that is accurate.

Before payment and transfer, agree with the buyer in writing on any lien payoff, lender release, title delivery, bill of sale, registration, odometer statement, or other required documentation. Provide the documents and signatures you are legally required to provide. Do not transfer an asset in violation of a lender’s rights or applicable law.

## 4. Accurate listings and disclosures

Your listing must accurately describe the actual asset and included equipment. Use photos and other content you have the right to publish. Identify known material defects, damage, repairs, nonworking equipment, missing components, and limitations that could reasonably affect the purchase decision.

State the price, what is included, and any separately agreed delivery or other charges clearly before the buyer commits. Do not introduce undisclosed mandatory charges after acceptance. Update or remove listings promptly when availability, condition, price, or ownership changes.

Claims concerning permits, inspections, certifications, roadworthiness, operating capacity, revenue, or regulatory compliance must be accurate and supportable. Approval in one location does not establish approval elsewhere. The buyer remains responsible for checking intended-use requirements; this does not excuse inaccurate or omitted seller disclosures.

## 5. Offers and the purchase process

An inquiry, walkthrough request, or payment-method selection is not proof of a completed purchase. Use the transaction record to document the accepted asset, price, included items, contingencies, fulfillment method, and timing.

Where the platform requires seller approval, the seller approves the purchase request first. The buyer then reviews the final transaction details and completes the applicable payment step. Do not treat seller approval, a buyer’s payment approval screen, a screenshot, or a pending payment as verified receipt of funds.

Changes to material deal terms must be agreed by both parties before completion. If terms change after an online payment order was prepared, follow the platform’s updated checkout process rather than collecting an unexplained additional amount.

## 6. Pay in Person sales — no transaction commission

**Vendibook charges no transaction commission and no buyer transaction fee on a sale completed using the supported Pay in Person option.** The buyer pays you directly through the method you and the buyer agree upon outside Vendibook’s online payment processing.

**Example: on a $36,000 Pay in Person sale, Vendibook’s transaction commission is $0.**

Optional subscriptions, featured listings, boosts, financing, freight, insurance, or other separately selected services have their own disclosed prices and terms. Those charges are not a Pay in Person sale commission. A bank, payment service, lender, or other third party may charge its own fees.

Vendibook does not collect, hold, settle, or refund the purchase funds for a Pay in Person sale. Confirm payment independently and securely before releasing the asset. Record payment and handoff truthfully in the transaction. The supported Pay in Person option is permitted and is not, by itself, fee circumvention.

## 7. Online payments and seller commission

When enabled and available for the listing, online marketplace payments are processed through PayPal. You must satisfy the payment provider’s onboarding and account requirements before receiving online payments.

The standard Vendibook seller transaction commission for an online sale is **12.9%**, subject to any different rate expressly disclosed and accepted for that transaction. Review the displayed commission, payment-provider charges, and seller proceeds before accepting the transaction. Do not assume that optional service fees or payment-provider fees are included in the commission.

Payment-provider agreements govern processing, account restrictions, funding-method availability, disputes, reserves, and applicable provider charges. Approval of a payment method is not successful capture. A payment is complete only when the provider’s completed payment is verified through the platform’s payment process.

Sandbox or test transactions are demonstrations and are not real purchases or evidence of payment. Never release a real asset based on a test payment.

## 8. Payment availability, refunds, and payment disputes

Follow the payment and fulfillment status shown in the transaction and the provider account. Availability of funds may depend on processing, account review, restrictions, disputes, reserves, or other applicable provider requirements. Vendibook does not promise a fixed payout date or represent its service as escrow.

Cooperate with legitimate refund requests, provider disputes, and support investigations. Supply accurate records, including the listing, agreed terms, payment record, inspection disclosures, signed documents, and delivery or pickup evidence. Do not fabricate evidence or mark an uncompleted handoff as complete.

Cancellation and refund rights are determined by applicable law, the agreed transaction terms, and applicable payment-provider rules. A “final sale” statement or an “as is” clause does not eliminate rights that cannot legally be waived. Do not issue an off-platform refund for an online payment without coordinating the payment record, so a duplicate refund is not created.

These terms do not themselves authorize a new charge to an unrelated stored payment method. Any collection, deduction, or reversal must have an applicable contractual or legal basis.

## 9. Pickup, seller delivery, and freight

Agree on the fulfillment method, location, schedule, charges, loading responsibilities, required access, and transfer documents before handoff. Identify who arranges transport and who is responsible for transport insurance and carrier claims. Delivery estimates are not guarantees unless expressly agreed as such.

For pickup, provide reasonable access at the agreed time and allow the agreed inspection. For seller delivery, deliver the agreed asset and included items to the agreed location. For third-party freight, comply with the carrier’s requirements and retain pickup and delivery records.

Responsibility for title and risk of loss follows the applicable law and your written sale or transport agreement. Do not assume a platform tracking status alone transfers title or allocates all transit risk.

## 10. Walkthroughs, inspection, and signatures

Participate in any agreed video walkthrough, inspection, and handoff process. Clearly show the actual equipment and disclose known material issues. A walkthrough is a documentation and communication tool, not a substitute for a qualified independent inspection.

Obtain required consent before recording people or sharing recordings. Use the platform’s designated process where available. Protect personal information, access codes, and unrelated private material.

Review the bill of sale and purchase agreement before signing. Correct errors through the appropriate process and obtain all required signatures. Do not sign for another party without authority. An incomplete document-generation or signature step does not prove that title has transferred or that either party’s legal obligations have been satisfied.

## 11. Taxes, permits, and regulatory responsibilities

You are responsible for obligations applicable to you as a seller, including required licenses, dealer requirements, disclosures, taxes, and transfer filings, except to the extent the marketplace is legally required to perform a particular function. Do not collect a tax twice when it has already been collected for the transaction.

Do not promise that a truck, trailer, kitchen installation, or permit can operate or transfer in the buyer’s jurisdiction without verifying the claim. Assist the buyer with accurate records you possess, while making clear any limits on your knowledge.

## 12. Insurance, financing, and other third-party services

Evaluate the insurance appropriate to your equipment, business, transport, and transaction. Vendibook does not automatically insure a listing or sale. Insurance options accessed through FLIP or another provider are purchased separately and remain subject to the provider’s eligibility and policy terms. Another participant’s insurance does not automatically protect you or your asset.

Financing is provided by third-party providers, subject to their approval and terms. A financing inquiry or preliminary approval is not payment. Freight, insurance, financing, and other third-party services remain subject to their separate agreements.

## 13. Communications, privacy, and records

Use marketplace communications to preserve material deal terms and respond reasonably to legitimate buyer or support inquiries. Use buyer information only for the transaction, necessary follow-up, or another lawful purpose with appropriate permission. Do not sell contact information or send unsolicited marketing merely because someone inquired about a listing.

Keep copies of your transaction records. Vendibook may retain records for support, fraud prevention, legal compliance, and dispute handling in accordance with its Privacy Policy. Do not publish a buyer’s identity documents or private insurance or financial information.

Electronic acceptance and signature processes are subject to the applicable electronic-record disclosures and law. Review and retain the documents you accept; contact support if you cannot access them.

## 14. Prohibited conduct and enforcement

Do not post fraudulent, stolen, unlawful, or materially misleading listings; manipulate transaction status; create false reviews; demand undisclosed payments; harass users; or use deceptive links to obtain financial or account information.

Vendibook may restrict or remove listings, communications, or account access in accordance with its Terms of Service and applicable law when necessary to address violations, fraud, or safety concerns. Payment-account actions remain subject to the payment provider’s authority and rules. Report suspected impersonation or spam through platform support.

## 15. Responsibility and disputes

You remain responsible for your own representations, assets, performance, and breaches of your agreement with the buyer. Vendibook support may help organize communications and records, but does not guarantee a settlement, payment recovery, or a particular outcome.

Any applicable limitations of platform liability, indemnification obligations, governing law, and dispute-resolution provisions are those in the Terms of Service you validly accepted, subject to applicable law. These Seller Terms do not create a separate arbitration agreement or waive non-waivable consumer or statutory rights.

## 16. Listing removal, account closure, and updates

Removing a listing or closing an account does not cancel an existing sale agreement, erase a valid refund or tax obligation, or eliminate responsibilities that by their nature survive completion. Resolve outstanding transactions through the applicable process.

This version applies prospectively when accepted. It does not rewrite a prior acceptance record or retroactively change an already agreed transaction. Material updates will be identified through the platform’s versioned acceptance process where required.

## 17. Contact

For questions about these Seller Terms, fees, or a transaction, contact **support@vendibook.com** through the [Help Center](/help) or [Contact page](/contact). Include the listing or transaction reference, but do not send passwords or full payment-card information.
$terms$,encode(extensions.digest($terms$# Vendibook Seller Terms

**Effective September 24, 2026 · Version v3**

These Seller Terms govern your use of Vendibook to offer equipment for sale. “You” means the seller and, when you act for a business, the business you are authorized to represent. “Vendibook” means the marketplace operator identified in the [Terms of Service](/terms). By affirmatively accepting these Seller Terms in the publishing or transaction process, you agree to them.

## 1. Scope and marketplace role

These Seller Terms supplement the Terms of Service, Marketplace Rules, Privacy Policy, and the transaction-specific agreement you accept. They apply to sales; rental listings remain subject to the applicable host and renter terms.

Vendibook provides listing, communication, transaction-record, and related coordination tools. Unless expressly identified as the seller in a separate written agreement, Vendibook does not own, sell, manufacture, inspect, certify, or warrant listed equipment. The sale is between you and the buyer. A listing, verification indicator, payment connection, financing link, or walkthrough does not establish equipment condition, clear title, regulatory approval, or fitness for a buyer’s intended use.

For seller fees and payment methods, these Seller Terms control over inconsistent general descriptions on the platform. A buyer-seller agreement may specify the asset, price, inspection, fulfillment, and transfer obligations, but cannot change Vendibook’s fees or bind Vendibook without its written agreement. Mandatory law and non-waivable rights remain controlling.

## 2. Eligibility, authority, and account information

You must be legally able to enter the sale and have authority to act for the asset owner. Provide accurate account and business information and keep contact details current. Where reasonably necessary for compliance, fraud prevention, or payment processing, you may be asked to provide identity, business, ownership, or tax documentation through designated secure channels.

You must not impersonate Vendibook staff, another seller, a lender, or a payment provider. Protect your login credentials and promptly report suspected unauthorized activity. Do not request passwords, verification codes, or card details through marketplace messages.

## 3. Ownership, liens, and transfer documents

List only assets you own or are specifically authorized to sell. Disclose material ownership restrictions, liens, financing balances, title issues, salvage or rebuilt status, and other interests that could affect transfer. Do not represent that an asset has clear title unless that is accurate.

Before payment and transfer, agree with the buyer in writing on any lien payoff, lender release, title delivery, bill of sale, registration, odometer statement, or other required documentation. Provide the documents and signatures you are legally required to provide. Do not transfer an asset in violation of a lender’s rights or applicable law.

## 4. Accurate listings and disclosures

Your listing must accurately describe the actual asset and included equipment. Use photos and other content you have the right to publish. Identify known material defects, damage, repairs, nonworking equipment, missing components, and limitations that could reasonably affect the purchase decision.

State the price, what is included, and any separately agreed delivery or other charges clearly before the buyer commits. Do not introduce undisclosed mandatory charges after acceptance. Update or remove listings promptly when availability, condition, price, or ownership changes.

Claims concerning permits, inspections, certifications, roadworthiness, operating capacity, revenue, or regulatory compliance must be accurate and supportable. Approval in one location does not establish approval elsewhere. The buyer remains responsible for checking intended-use requirements; this does not excuse inaccurate or omitted seller disclosures.

## 5. Offers and the purchase process

An inquiry, walkthrough request, or payment-method selection is not proof of a completed purchase. Use the transaction record to document the accepted asset, price, included items, contingencies, fulfillment method, and timing.

Where the platform requires seller approval, the seller approves the purchase request first. The buyer then reviews the final transaction details and completes the applicable payment step. Do not treat seller approval, a buyer’s payment approval screen, a screenshot, or a pending payment as verified receipt of funds.

Changes to material deal terms must be agreed by both parties before completion. If terms change after an online payment order was prepared, follow the platform’s updated checkout process rather than collecting an unexplained additional amount.

## 6. Pay in Person sales — no transaction commission

**Vendibook charges no transaction commission and no buyer transaction fee on a sale completed using the supported Pay in Person option.** The buyer pays you directly through the method you and the buyer agree upon outside Vendibook’s online payment processing.

**Example: on a $36,000 Pay in Person sale, Vendibook’s transaction commission is $0.**

Optional subscriptions, featured listings, boosts, financing, freight, insurance, or other separately selected services have their own disclosed prices and terms. Those charges are not a Pay in Person sale commission. A bank, payment service, lender, or other third party may charge its own fees.

Vendibook does not collect, hold, settle, or refund the purchase funds for a Pay in Person sale. Confirm payment independently and securely before releasing the asset. Record payment and handoff truthfully in the transaction. The supported Pay in Person option is permitted and is not, by itself, fee circumvention.

## 7. Online payments and seller commission

When enabled and available for the listing, online marketplace payments are processed through PayPal. You must satisfy the payment provider’s onboarding and account requirements before receiving online payments.

The standard Vendibook seller transaction commission for an online sale is **12.9%**, subject to any different rate expressly disclosed and accepted for that transaction. Review the displayed commission, payment-provider charges, and seller proceeds before accepting the transaction. Do not assume that optional service fees or payment-provider fees are included in the commission.

Payment-provider agreements govern processing, account restrictions, funding-method availability, disputes, reserves, and applicable provider charges. Approval of a payment method is not successful capture. A payment is complete only when the provider’s completed payment is verified through the platform’s payment process.

Sandbox or test transactions are demonstrations and are not real purchases or evidence of payment. Never release a real asset based on a test payment.

## 8. Payment availability, refunds, and payment disputes

Follow the payment and fulfillment status shown in the transaction and the provider account. Availability of funds may depend on processing, account review, restrictions, disputes, reserves, or other applicable provider requirements. Vendibook does not promise a fixed payout date or represent its service as escrow.

Cooperate with legitimate refund requests, provider disputes, and support investigations. Supply accurate records, including the listing, agreed terms, payment record, inspection disclosures, signed documents, and delivery or pickup evidence. Do not fabricate evidence or mark an uncompleted handoff as complete.

Cancellation and refund rights are determined by applicable law, the agreed transaction terms, and applicable payment-provider rules. A “final sale” statement or an “as is” clause does not eliminate rights that cannot legally be waived. Do not issue an off-platform refund for an online payment without coordinating the payment record, so a duplicate refund is not created.

These terms do not themselves authorize a new charge to an unrelated stored payment method. Any collection, deduction, or reversal must have an applicable contractual or legal basis.

## 9. Pickup, seller delivery, and freight

Agree on the fulfillment method, location, schedule, charges, loading responsibilities, required access, and transfer documents before handoff. Identify who arranges transport and who is responsible for transport insurance and carrier claims. Delivery estimates are not guarantees unless expressly agreed as such.

For pickup, provide reasonable access at the agreed time and allow the agreed inspection. For seller delivery, deliver the agreed asset and included items to the agreed location. For third-party freight, comply with the carrier’s requirements and retain pickup and delivery records.

Responsibility for title and risk of loss follows the applicable law and your written sale or transport agreement. Do not assume a platform tracking status alone transfers title or allocates all transit risk.

## 10. Walkthroughs, inspection, and signatures

Participate in any agreed video walkthrough, inspection, and handoff process. Clearly show the actual equipment and disclose known material issues. A walkthrough is a documentation and communication tool, not a substitute for a qualified independent inspection.

Obtain required consent before recording people or sharing recordings. Use the platform’s designated process where available. Protect personal information, access codes, and unrelated private material.

Review the bill of sale and purchase agreement before signing. Correct errors through the appropriate process and obtain all required signatures. Do not sign for another party without authority. An incomplete document-generation or signature step does not prove that title has transferred or that either party’s legal obligations have been satisfied.

## 11. Taxes, permits, and regulatory responsibilities

You are responsible for obligations applicable to you as a seller, including required licenses, dealer requirements, disclosures, taxes, and transfer filings, except to the extent the marketplace is legally required to perform a particular function. Do not collect a tax twice when it has already been collected for the transaction.

Do not promise that a truck, trailer, kitchen installation, or permit can operate or transfer in the buyer’s jurisdiction without verifying the claim. Assist the buyer with accurate records you possess, while making clear any limits on your knowledge.

## 12. Insurance, financing, and other third-party services

Evaluate the insurance appropriate to your equipment, business, transport, and transaction. Vendibook does not automatically insure a listing or sale. Insurance options accessed through FLIP or another provider are purchased separately and remain subject to the provider’s eligibility and policy terms. Another participant’s insurance does not automatically protect you or your asset.

Financing is provided by third-party providers, subject to their approval and terms. A financing inquiry or preliminary approval is not payment. Freight, insurance, financing, and other third-party services remain subject to their separate agreements.

## 13. Communications, privacy, and records

Use marketplace communications to preserve material deal terms and respond reasonably to legitimate buyer or support inquiries. Use buyer information only for the transaction, necessary follow-up, or another lawful purpose with appropriate permission. Do not sell contact information or send unsolicited marketing merely because someone inquired about a listing.

Keep copies of your transaction records. Vendibook may retain records for support, fraud prevention, legal compliance, and dispute handling in accordance with its Privacy Policy. Do not publish a buyer’s identity documents or private insurance or financial information.

Electronic acceptance and signature processes are subject to the applicable electronic-record disclosures and law. Review and retain the documents you accept; contact support if you cannot access them.

## 14. Prohibited conduct and enforcement

Do not post fraudulent, stolen, unlawful, or materially misleading listings; manipulate transaction status; create false reviews; demand undisclosed payments; harass users; or use deceptive links to obtain financial or account information.

Vendibook may restrict or remove listings, communications, or account access in accordance with its Terms of Service and applicable law when necessary to address violations, fraud, or safety concerns. Payment-account actions remain subject to the payment provider’s authority and rules. Report suspected impersonation or spam through platform support.

## 15. Responsibility and disputes

You remain responsible for your own representations, assets, performance, and breaches of your agreement with the buyer. Vendibook support may help organize communications and records, but does not guarantee a settlement, payment recovery, or a particular outcome.

Any applicable limitations of platform liability, indemnification obligations, governing law, and dispute-resolution provisions are those in the Terms of Service you validly accepted, subject to applicable law. These Seller Terms do not create a separate arbitration agreement or waive non-waivable consumer or statutory rights.

## 16. Listing removal, account closure, and updates

Removing a listing or closing an account does not cancel an existing sale agreement, erase a valid refund or tax obligation, or eliminate responsibilities that by their nature survive completion. Resolve outstanding transactions through the applicable process.

This version applies prospectively when accepted. It does not rewrite a prior acceptance record or retroactively change an already agreed transaction. Material updates will be identified through the platform’s versioned acceptance process where required.

## 17. Contact

For questions about these Seller Terms, fees, or a transaction, contact **support@vendibook.com** through the [Help Center](/help) or [Contact page](/contact). Include the listing or transaction reference, but do not send passwords or full payment-card information.
$terms$,'sha256'),'hex'),
'Replaces placeholder Seller Terms; clarifies zero-commission Pay in Person sales, online payments, title, disclosures, and handoff obligations.','seller-terms',true
WHERE NOT EXISTS (SELECT 1 FROM public.legal_documents WHERE document_type='seller_terms' AND version='v3');
COMMIT;