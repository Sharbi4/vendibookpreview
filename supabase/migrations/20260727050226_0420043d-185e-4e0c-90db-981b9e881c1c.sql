-- Phase 2: seed v2 drafts for existing legal_documents and v1 drafts for new document types.
-- All rows are inserted with status = 'draft' — nothing activates automatically.
-- Historical v1 rows are preserved. Owner activates each doc by UPDATE ... SET status='active', effective_at=now().
-- Idempotent on (document_type, version).

ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_document_type_version_key;
CREATE UNIQUE INDEX IF NOT EXISTS legal_documents_type_version_uidx ON public.legal_documents (document_type, version);

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('terms_of_service','v2','draft',$LMTI$Vendibook Terms of Service$LMTI$,'terms',$LMSUM$The master terms that govern your use of Vendibook.$LMSUM$,$LMBODY$# Vendibook Terms of Service

*Please read these Terms carefully. By creating an account, listing an asset, transacting, or otherwise using Vendibook, you agree to these Terms.*

## Who we are

Vendibook, an Arizona limited liability company (referred to as "Vendibook," "we," "us," or "our") operates the Vendibook marketplace at `vendibook.com` and related apps and services. **EventPro** and **PermitPath** are Vendibook product names, not separate legal entities.

For legal notices, email `support@vendibook.com`; Vendibook will provide a current mailing address on request.

## Eligibility

Vendibook is not directed to individuals under 18. You must be at least 18 years old to create an account, list, transact, or otherwise use the Vendibook services. You represent that the information you give Vendibook is accurate, that you have the authority to enter these Terms, and that your use complies with all applicable laws.

## The Vendibook Services

Vendibook is a technology marketplace that connects hosts and sellers of mobile food and event assets with renters and buyers, and provides related tools such as listing management, messaging, offers, payment processing, subscriptions, add-on services, referral programs, support, and PermitPath / EventPro utilities.

Vendibook is not a party to the underlying transaction between users, is not the seller or renter of user-listed assets, and is not a broker, dealer, common carrier, or insurer. Users are responsible for their own listings, communications, transactions, taxes, licenses, permits, insurance, and legal compliance.

## Account and security

You are responsible for your account, credentials, and everything that happens under your account. Notify `support@vendibook.com` promptly if you suspect unauthorized use.

## Fees

Vendibook charges the fees disclosed in the checkout and pricing surfaces at the time of the transaction, and may charge subscription and add-on fees for optional products. Current default fees include a **12.9% host / seller commission** and a **12.9% renter fee** on rental bookings, and a **12.9% seller commission on card sales** (no buyer fee). **Cash / pay-in-person sales carry no commission and no buyer fee.** Fees may change; the fees disclosed at checkout control that transaction.

## Payments and payment protection

Payments are processed by **Stripe**. Where Vendibook facilitates a card transaction, Vendibook uses Stripe to hold the buyer's or renter's funds as **payment protection on Vendibook's behalf** until the applicable confirmation, delivery, or review step occurs. **"Payment protection" is not escrow** and Vendibook is not a licensed escrow agent. Funds are typically released after the required confirmation or review has occurred, and then follow **Stripe's** standard processing and payout schedule. Timing may vary because of disputes, refunds, risk review, reserves, account restrictions, weekends and holidays, and banking delays. Vendibook does not guarantee a specific wall-clock release time. See the **Payments, Payouts, and Protected Transactions** document for full detail.

## Listings and user content

You are responsible for the accuracy, legality, and lawful ownership of everything you upload. You grant Vendibook a worldwide, non-exclusive, royalty-free license to host, cache, reproduce, display, adapt, and distribute your user content solely to operate, promote, and improve the Vendibook services, subject to our privacy commitments. You may remove your content at any time; some copies may persist in backups or where retained for legal or audit reasons.

## Prohibited activity

You will not: circumvent Vendibook's platform or fees; misrepresent identity, ownership, or condition of an asset; list prohibited assets; harass or defraud other users; interfere with the services; scrape or reverse-engineer beyond what is legally permitted; violate any law; or list any asset that requires a license, permit, or registration you do not hold. See the **Marketplace Rules** for the full list.

## Subscriptions and add-ons

Optional Vendibook subscriptions and one-time add-ons are governed by the **Subscription & Add-On Terms**. Subscriptions renew automatically until cancelled from the account.

## Communications

By creating an account you agree to receive service and transactional communications from Vendibook by email and, where you separately opt in, by SMS or phone. Marketing communications are opt-in and you may opt out at any time. Calls may be monitored or recorded for quality and training purposes; recording will be disclosed at the start of any recorded call. See the **Privacy Policy**, **Cookie Policy**, **SMS Terms**, and **E-Sign Disclosure**.

## Insurance and damage protection

Vendibook does not provide or offer platform insurance, damage protection, or a warranty program for transactions between users. Hosts, sellers, buyers, and renters are responsible for evaluating each transaction and for obtaining any insurance or coverage they consider appropriate. No statement in these documents should be read as promising insurance, indemnification, or a Vendibook-backed damage-protection program.

## Taxes

You are responsible for determining, collecting, reporting, and remitting your own taxes, except where Vendibook is legally required to collect or remit a tax on your behalf.

## Termination

Vendibook may suspend or terminate your account or any listing at any time for suspected violation of these Terms, of law, or of the Marketplace Rules; for risk, fraud, or safety reasons; or for extended inactivity. You may close your account at any time from account settings, subject to obligations that survive termination (including fees, indemnities, and dispute resolution).

## Disclaimer of warranties

The Vendibook services are provided "as is" and "as available." To the maximum extent permitted by law, Vendibook disclaims all warranties, express or implied, including merchantability, fitness for a particular purpose, non-infringement, and any warranty regarding the availability, condition, safety, or legality of any user asset or transaction.

## Limitation of Liability

To the maximum extent permitted by law, Vendibook's aggregate liability arising out of or relating to these Terms or your use of the Vendibook services will not exceed the **greater of (a) US$100 or (b) the total fees you paid to Vendibook during the 12 months preceding the event giving rise to the claim**. This cap does not limit liability that cannot be limited under applicable law (for example, liability for gross negligence, willful misconduct, or certain statutory claims). Nothing in these Terms limits your non-waivable consumer rights.

Vendibook is not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, goodwill, or business opportunities, arising out of or relating to the services, even if advised of the possibility of such damages.


## Indemnification

You will defend and indemnify Vendibook against any claim, loss, liability, and reasonable expense (including attorneys' fees) arising out of your user content, your listings, your transactions with other users, your violation of these Terms or of applicable law, or your violation of the rights of a third party.

## Disputes — Binding Individual Arbitration

**Please read this carefully. It affects your legal rights.**

You and Vendibook agree that any dispute, claim, or controversy arising out of or relating to these Terms or the Vendibook services (a "Dispute") that is not resolved informally within 30 days after written notice to `support@vendibook.com` will be resolved by **binding individual arbitration** administered by the **American Arbitration Association (AAA)** under its then-current **Consumer Arbitration Rules**. The Federal Arbitration Act governs the interpretation and enforcement of this section.

**Jury-trial waiver.** You and Vendibook each waive the right to a jury trial.

**Class-action / representative-action waiver.** Disputes must be brought individually. You and Vendibook waive the right to participate in a class, collective, or representative action, to the extent permitted by law.

**Small claims and non-waivable remedies preserved.** Either party may bring an individual action in a qualifying small-claims court. Nothing in this section limits any right or remedy that cannot be waived under applicable law.

**30-day opt-out.** You may opt out of this arbitration agreement within **30 days** of first accepting these Terms by emailing `support@vendibook.com` from your account email with your full name, account email, and a clear statement that you are opting out of Vendibook's arbitration agreement. Opting out will not affect the rest of these Terms.

If the arbitration agreement is held unenforceable in whole or in part, the remainder of these Terms continues to apply, and any surviving Dispute will be resolved as provided in the *Governing Law and Venue* section.


## Governing Law and Venue

These Terms and any Dispute are governed by the laws of the State of **Arizona**, without regard to conflict-of-laws principles. Subject to the arbitration section above and any non-waivable consumer-law protections, the exclusive venue for any judicial action permitted under these Terms is the **state courts located in Pima County, Arizona**, or the **United States District Court for the District of Arizona** where federal subject-matter jurisdiction exists. You and Vendibook consent to the personal jurisdiction of those courts.


## Changes to these Terms

Vendibook may update these Terms. Material changes will be announced through the services or by email. Continued use after an update means you accept the updated Terms. Prior versions remain accessible through the Legal Center for reference.

## Miscellaneous

These Terms, together with the referenced Vendibook documents, are the entire agreement between you and Vendibook regarding the services. If any provision is unenforceable, the remainder stays in effect. Vendibook's failure to enforce a provision is not a waiver. You may not assign these Terms without Vendibook's consent; Vendibook may assign these Terms in connection with a corporate transaction. Section headings are for convenience only.
$LMBODY$,'c69133542da063fe7a61750d28cfb6e5d79bd1e98ffa4074957719a5eac4f738',$LMCH$v2 draft: aligns entity/venue/arbitration/liability with 2026-07 owner direction; replaces "escrow" language with "payment protection"; removes wall-clock payout guarantees; clarifies EventPro/PermitPath as product names; adds explicit no-insurance disclaimer and 18+ requirement.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('privacy_policy','v2','draft',$LMTI$Vendibook Privacy Policy$LMTI$,'privacy',$LMSUM$How Vendibook collects, uses, shares, and protects information about you. This v2 draft is held until the Do-Not-Sell-or-Share and GPC mechanisms ship (Phase 5).$LMSUM$,$LMBODY$# Vendibook Privacy Policy

*This document is a v2 draft and is not yet the active Privacy Policy. It will be activated only after Vendibook's first-visit consent controls, Do-Not-Sell-or-Share mechanism, and Global Privacy Control honoring are live and verified.*

## Who we are

Vendibook, an Arizona limited liability company (referred to as "Vendibook," "we," "us," or "our") operates the Vendibook marketplace at `vendibook.com`. For legal notices, email `support@vendibook.com`; Vendibook will provide a current mailing address on request.

## Information we collect

- **Information you give us.** Account and profile data (name, email, phone, password hash, ID-verification status), listing content, transaction details, messages, support requests, callback and chat inputs, and any information you choose to share with us.
- **Information we collect automatically.** Device and log data, IP address, browser and OS, referring pages, actions in the product, approximate location derived from IP, and cookies / similar technologies (see the **Cookie Policy**).
- **Information from third parties.** Payment and identity verification results from **Stripe**; voice call metadata and transcripts from **Vapi** (our outbound call vendor); chat metadata from **Tawk.to**; email delivery events from **Resend**; SMS delivery events from our carrier; identity signals from social sign-in providers you choose to use.

## How we use information

- Provide, operate, secure, and improve the Vendibook services.
- Process transactions, subscriptions, add-ons, referrals, and payouts.
- Communicate about your account, transactions, safety, and support.
- Detect, prevent, and investigate fraud, abuse, security incidents, and violations of these Terms.
- Comply with law and enforce our agreements.
- With your consent where required, personalize the product, measure marketing performance, and show you relevant advertising.

## How we share information

- **Other users**, only where reasonably necessary to complete a transaction (for example, a buyer's shipping address is disclosed to a host after a paid booking, subject to Vendibook's privacy defaults).
- **Service providers** who process data on our behalf, including Stripe, Vapi, Tawk.to, Resend, cloud hosting, analytics, and support vendors.
- **Legal and safety** — where required by law, court order, or lawful request, or to protect Vendibook, users, or the public.
- **Advertising and analytics partners.** We use Meta and Google advertising and analytics tools. Under the California Consumer Privacy Act, as amended by the CPRA, we treat the use of these tools **conservatively as "sharing"** for cross-context behavioral advertising and offer the controls described below.
- **Corporate transactions** — in connection with a merger, financing, acquisition, or sale of assets.

Vendibook does not sell personal information for money.

## Your choices

- **Access, correct, delete, or export** your account data by contacting `support@vendibook.com`. We honor the rights required by an applicable privacy law for residents of covered jurisdictions, and we offer these choices voluntarily to other U.S. users where feasible.
- **Advertising and analytics cookies.** Use the Vendibook cookie banner or your account communication settings.
- **Do Not Sell or Share (California residents and where applicable).** Use the "Do Not Sell or Share My Personal Information" link that will appear in the site footer and in the cookie preferences panel once Phase 5 controls are live.
- **Global Privacy Control (GPC).** We will treat a valid GPC signal as an opt-out of "sharing" for cross-context behavioral advertising once GPC honoring is live.
- **Marketing email.** Unsubscribe from any marketing email or update preferences in your account.
- **SMS.** Text STOP to opt out; text HELP for help. See the **SMS Terms**.

## Retention

We retain information for the periods reasonably necessary for the purpose collected, or longer where legally required or reasonably necessary. Category targets:

- **Financial, transaction, and tax records:** 7 years, or longer where legally required.
- **Support tickets and Tawk chat transcripts:** 3 years after ticket closure.
- **Vapi call recordings and transcripts:** 2 years, unless a dispute, security incident, legal hold, or law requires longer.
- **Marketing consents and proof of consent:** until you withdraw, plus 4 years as proof of consent.
- **SMS consent records:** retained indefinitely as a compliance record required by mobile carriers.
- **Identity-verification status and metadata:** for the account lifecycle plus up to 5 years after closure where reasonably necessary for fraud, disputes, or legal compliance. **Stripe controls retention of the underlying identity documents under Stripe's own terms.**
- **Account content:** while your account is open, and for a reasonable period after closure to handle disputes, audits, and legal obligations.

These are category-based targets, not absolute deletion guarantees.

## Security

Vendibook uses commercially reasonable technical and organizational measures to protect information. No system is perfectly secure; report a suspected incident to `support@vendibook.com`.

## Children

Vendibook is not directed to individuals under 18. You must be at least 18 years old to create an account, list, transact, or otherwise use the Vendibook services.

## International

Vendibook operates from the United States. If you use the services from outside the U.S., you understand that your information is processed in the U.S. and may be subject to U.S. law.

## Changes

We will update this Policy when practices change. The Legal Center preserves prior versions. Material changes will be announced.

## Contact

Questions or requests: `support@vendibook.com`.
$LMBODY$,'64a2e23afd9d3596d31c0399d2d330609d8fa23a3a28144020697d4717a4ea2b',$LMCH$v2 draft: category-based retention targets per owner direction; ad-tech treated conservatively as "sharing" under CPRA; DO NOT ACTIVATE until Phase 5 tracking / consent / GPC behavior is live and verified.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('marketplace_rules','v2','draft',$LMTI$Vendibook Marketplace Rules$LMTI$,'marketplace-rules',$LMSUM$What is allowed and not allowed on Vendibook, and how enforcement works.$LMSUM$,$LMBODY$# Vendibook Marketplace Rules

These Rules apply to every account, listing, offer, message, transaction, review, and interaction on Vendibook. They are part of the **Terms of Service**.

## 1. Accurate listings

List only assets you have the legal right to sell or rent. Descriptions, condition, photos, mileage, hours, equipment, and pricing must be accurate. Update or remove a listing when it is no longer available.

## 2. Prohibited assets and content

Do not list, offer, or trade: stolen property; assets you do not own or lack authority to transfer; weapons; controlled substances; counterfeit goods; recalled equipment presented as safe; anything that requires a license, permit, or registration you do not hold; or anything otherwise prohibited by law.

Do not post content that is illegal, hateful, harassing, sexually explicit, defamatory, deceptive, or infringing.

## 3. No off-platform circumvention

Users must complete the transaction, communication, and payment for the introduced asset on Vendibook. Moving a Vendibook-introduced transaction off platform to avoid fees, taxes, or safety review is prohibited and may result in account termination, listing removal, forfeiture of platform fees or commissions, and, where permitted, recovery of damages.

## 4. Fair conduct

Communicate respectfully. Do not misrepresent identity, location, ownership, or intent. Do not use bots, scripted signups, or fake reviews. Do not attempt to manipulate search ranking, offers, or reviews.

## 5. Safety, licensing, and inspection

Buyers, renters, hosts, and sellers are responsible for their own inspections, permits, licenses, insurance, food-safety compliance, and DOT / vehicle compliance. Vendibook does not inspect assets, verify permits, or provide insurance. See the no-insurance disclaimer in the Terms.

## 6. Payment protection integrity

Do not tamper with payment flow, chargebacks, refunds, review windows, or payout timing. Do not attempt to induce a refund for goods you received and kept, or to short a seller after receiving assets.

## 7. Reviews

Post honest reviews based on your own experience. Do not trade reviews, threaten reviews, or post reviews for competitors.

## 8. Communications

Use Vendibook messaging for transaction communication. Do not spam, phish, or share personal contact info in early-stage messages before required.

## 9. Enforcement

Vendibook may investigate suspected violations, remove content, suspend or close accounts, hold or refund funds, and take other reasonable action. Vendibook may report suspected illegal activity to law enforcement. Repeat or serious violations may be permanently banned from Vendibook.

## 10. Reporting

Report suspected violations to `support@vendibook.com` or through the in-product report controls.

## 11. Product names

**EventPro** and **PermitPath** are Vendibook product names, not separate legal entities.

## 12. Changes

Vendibook may update these Rules. Continued use after an update means you accept the updated Rules.
$LMBODY$,'d3fe5f28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d0',$LMCH$v2 draft: incorporates payment-protection wording, EventPro/PermitPath clarification, and updated enforcement/circumvention penalty language.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('seller_terms','v2','draft',$LMTI$Vendibook Seller / Host Terms$LMTI$,'seller-terms',$LMSUM$Additional terms that apply when you list an asset for sale or for rent on Vendibook.$LMSUM$,$LMBODY$# Vendibook Seller / Host Terms

These Seller / Host Terms apply in addition to the **Terms of Service** and **Marketplace Rules** when you list an asset for sale or rent on Vendibook.

## Your listing

You represent that you have the legal right to list, sell, or rent the asset and that all listing information is accurate. You are responsible for permits, licenses, DOT and safety compliance, food-safety certification, and any other legal requirement for the asset.

## Fees

Vendibook charges a **12.9% commission** on card-processed sales and rentals. **Cash / pay-in-person sales are 100% free — no Vendibook commission and no buyer fee.** Rentals paid in person still owe the Vendibook commission. Subscription and add-on fees are separate and disclosed in the pricing surfaces.

## Payment protection and payouts

For card-processed transactions, buyer or renter funds are held as **payment protection via Stripe** on Vendibook's behalf until the required confirmation or review step. **"Payment protection" is not escrow.** Funds are typically released after the required confirmation or review has occurred, and then follow **Stripe's** standard processing and payout schedule. Timing may vary because of disputes, refunds, risk review, reserves, account restrictions, weekends and holidays, and banking delays. Vendibook does not guarantee a specific wall-clock release time. You must maintain an eligible Stripe Connect account to receive payouts and are subject to Stripe's terms.

## Refunds, chargebacks, cancellations

Refunds and cancellations follow the **Refund and Cancellation Policy** and any transaction-specific terms disclosed at checkout. You agree to cooperate with dispute and chargeback resolution. Vendibook may debit disputed amounts pending resolution and, where a chargeback is decided against the seller/host, may reverse the payout.

## Taxes

You are solely responsible for determining, collecting, reporting, and remitting your own taxes on the transactions you complete through Vendibook, except where Vendibook is legally required to collect or remit a tax on your behalf.

## Insurance and safety

Vendibook does not provide or offer platform insurance, damage protection, or a warranty program for transactions between users. Hosts, sellers, buyers, and renters are responsible for evaluating each transaction and for obtaining any insurance or coverage they consider appropriate. No statement in these documents should be read as promising insurance, indemnification, or a Vendibook-backed damage-protection program. You are responsible for any commercial, auto, general-liability, food-safety, or other insurance or coverage that your business or asset requires.

## Off-platform circumvention

You will not move a Vendibook-introduced transaction off Vendibook to avoid fees or oversight. Violations may result in account termination, listing removal, and forfeiture of commissions per the **Marketplace Rules**.

## Suspension

Vendibook may pause payouts or suspend a listing or account for suspected fraud, safety concerns, chargeback risk, or violation of these terms.

## Termination

You may close your account or remove a listing at any time, subject to open bookings, pending payouts, and obligations that survive termination.
$LMBODY$,'a4f7b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d02',$LMCH$v2 draft: replaces "escrow" with "payment protection"; removes wall-clock payout claims; clarifies tax responsibility, no-insurance stance, and off-platform circumvention penalty.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('renter_terms','v2','draft',$LMTI$Vendibook Renter / Buyer Terms$LMTI$,'renter-terms',$LMSUM$Additional terms that apply when you rent or buy an asset on Vendibook.$LMSUM$,$LMBODY$# Vendibook Renter / Buyer Terms

These Renter / Buyer Terms apply in addition to the **Terms of Service** and **Marketplace Rules** when you rent or buy an asset on Vendibook.

## Booking or purchase

You are responsible for reviewing the listing, transaction-specific terms, cancellation window, and any host-specified requirements before booking or buying. When you complete checkout, you agree to the fee schedule and the confirmation, review, and payout terms displayed at that time.

## Fees

For card-processed rentals, Vendibook charges a **12.9% renter fee** in addition to the base rate; a **12.9% host commission** is taken from the host's payout. For card-processed sales, buyers pay no Vendibook fee; a **12.9% seller commission** applies. **Cash / pay-in-person sales are 100% free — no commissions or fees.**

## Payment protection

For card-processed transactions, your payment is held as **payment protection via Stripe** on Vendibook's behalf until the required confirmation or review step. **"Payment protection" is not escrow.** Funds are typically released after the required confirmation or review has occurred, and then follow **Stripe's** standard processing and payout schedule. Timing may vary because of disputes, refunds, risk review, reserves, account restrictions, weekends and holidays, and banking delays. Vendibook does not guarantee a specific wall-clock release time.

## Refunds and cancellations

Refund and cancellation rights follow the **Refund and Cancellation Policy** and any transaction-specific terms disclosed at checkout.

## Inspection and use

You are responsible for inspecting the asset, verifying it fits your intended use, holding any permit or license you need to use it, and following the host's operating instructions. You are liable for damage you cause beyond ordinary wear and for returning the asset on time and in the agreed condition.

## Insurance

Vendibook does not provide or offer platform insurance, damage protection, or a warranty program for transactions between users. You are responsible for any insurance you need to use the asset.

## Communications

Keep transaction communications on Vendibook. Do not attempt to circumvent Vendibook fees or oversight by moving the transaction off platform.

## Disputes

If something goes wrong, contact the host first through Vendibook messaging, and open a support request at `support@vendibook.com` or in the Help Center within the disclosed review window if the issue is not resolved.
$LMBODY$,'b7f7b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d03',$LMCH$v2 draft: replaces "escrow" with "payment protection"; removes wall-clock guarantees; adds explicit no-insurance disclaimer.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('pay_in_person_acknowledgment','v2','draft',$LMTI$Pay-in-Person / Cash Sale Acknowledgment$LMTI$,'pay-in-person-terms',$LMSUM$What you agree to when a Vendibook sale is completed in cash or by another off-platform payment method.$LMSUM$,$LMBODY$# Pay-in-Person / Cash Sale Acknowledgment

When you and the other party choose to complete a Vendibook sale in cash or by another off-platform payment method, you both acknowledge the following.

## Vendibook is not the payment processor

Vendibook does not process, hold, or protect cash or off-platform payments. **"Payment protection" (via Stripe) does not apply to cash sales.** Vendibook does not verify the funds, cannot reverse the transaction, and cannot issue refunds for pay-in-person sales.

## No Vendibook fee on cash sales

**Cash / pay-in-person SALES are 100% free** — Vendibook charges no commission and no buyer fee. Rentals paid in person still owe the Vendibook commission. Off-platform payment does not exempt any transaction from the Marketplace Rules against circumvention.

## Safety and records

- Meet in a safe, public location where reasonable.
- Verify the asset, title, keys, VIN or serial, and any accessories before exchanging funds.
- Confirm each side has the funds and that title / bill of sale documents are complete.
- Keep your own receipt and record of the transaction. You are responsible for your own taxes and reporting.

## Your responsibility

You accept full responsibility for the risks of an off-platform payment. Vendibook has no obligation and no ability to recover cash paid off platform.

## Reporting problems

Report suspected fraud, theft, or safety issues to `support@vendibook.com` and, where appropriate, to local law enforcement.
$LMBODY$,'c8f7b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d04',$LMCH$v2 draft: reinforces that cash SALES carry no Vendibook fee, that Vendibook does not process or protect the funds, and clarifies safety and record-keeping.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('featured_listing_terms','v2','draft',$LMTI$Vendibook Featured Listing Terms$LMTI$,'featured-listing-terms',$LMSUM$Terms for paid featured / boost placements.$LMSUM$,$LMBODY$# Vendibook Featured Listing Terms

These Featured Listing Terms govern paid "boost" or "featured" placements purchased through Vendibook.

## What you get

A Featured or Boost placement gives your listing added prominence in search and browse surfaces for the promotion window disclosed at checkout. Placement algorithms, surface locations, and formats may change.

## Fees and billing

Fees are one-time and are charged through Stripe at checkout. Applicable taxes are added where required.

## No performance guarantees

Vendibook does not guarantee views, leads, offers, bookings, sales, or ranking outcomes from a Featured or Boost placement.

## Eligibility

Your listing must comply with the **Terms of Service** and **Marketplace Rules**. Vendibook may pause or remove a Featured placement if the underlying listing is suspended, materially inaccurate, or in violation.

## Refunds

Featured and Boost fees are generally non-refundable once the placement begins. If a placement is removed due to a Vendibook error, contact `support@vendibook.com` for a proportional refund or credit at Vendibook's discretion.

## Changes

Vendibook may change surface locations, algorithms, and format of Featured placements. Material changes will be disclosed.
$LMBODY$,'d9f7b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d05',$LMCH$v2 draft: aligns billing and non-refundability language with current Stripe-processed one-time purchases; removes performance guarantees.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('subscription_terms','v2','draft',$LMTI$Vendibook Subscription & Add-On Terms$LMTI$,'subscription-terms',$LMSUM$How Vendibook subscriptions and one-time add-on products work.$LMSUM$,$LMBODY$# Vendibook Subscription & Add-On Terms

These Terms govern optional Vendibook subscriptions and one-time add-on products.

## The plans

Vendibook currently offers monthly subscription plans including Host Starter, Host Growth, and Host Operator, and one-time add-on products such as Featured / Boost placements. The current price, features, and included quotas are disclosed on the pricing page and at checkout, and the fees shown at checkout control that transaction.

## Auto-renewal

Subscriptions renew automatically at the end of each billing cycle at the then-current price until you cancel. By starting a subscription you authorize Vendibook, through Stripe, to charge your payment method for each renewal.

## Cancellation

You may cancel your subscription at any time from the account subscription page or through the Stripe Customer Portal. Cancellation takes effect at the end of the current billing period; you retain paid features until the period ends. Vendibook does not pro-rate mid-cycle cancellations by default.

## Upgrades and downgrades

Upgrades take effect immediately with a pro-rated charge for the remainder of the billing cycle. Downgrades take effect at the end of the current period. Feature quotas and gating adjust accordingly.

## Refunds

Subscription and add-on fees are generally non-refundable. Vendibook may grant a refund or credit for a genuine billing error, extended service unavailability caused by Vendibook, or where required by law. Contact `support@vendibook.com`.

## Failed payments

If a renewal charge fails, Vendibook may retry, temporarily suspend paid features, and, after a reasonable retry window, downgrade the account.

## Changes

Vendibook may change plan features, quotas, or price. Material changes take effect at your next renewal after notice.
$LMBODY$,'ea07b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d06',$LMCH$v2 draft: aligns tier names with current catalog (Host Starter $39, Host Growth $89, Host Operator $149); reinforces auto-renewal, cancellation, and pro-ration handling per Stripe.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('refund_cancellation_policy','v2','draft',$LMTI$Vendibook Refund and Cancellation Policy$LMTI$,'refund-cancellation-policy',$LMSUM$How refunds and cancellations work across sales, rentals, subscriptions, and add-ons.$LMSUM$,$LMBODY$# Vendibook Refund and Cancellation Policy

## Card-processed sales

Refunds for card-processed sales are governed by the transaction-specific terms disclosed at checkout, the seller's stated policy, and the applicable review window. If an issue is not resolved with the seller, contact `support@vendibook.com` within the disclosed review window. Vendibook may refund from held funds, deny the refund, or route the dispute to Stripe / the card issuer under the applicable card-network rules.

## Cash / pay-in-person sales

Vendibook does not process cash payments and cannot refund them. Cash sales are between you and the other party. See the **Pay-in-Person / Cash Sale Acknowledgment**.

## Rentals

Rental cancellation and refund rights follow the host's cancellation window and the transaction-specific terms shown at checkout. Vendibook may release, hold, or refund funds based on those terms and on completion of any required confirmation step.

## Subscriptions and add-ons

Subscription and add-on fees are generally non-refundable. See **Subscription & Add-On Terms** and **Featured Listing Terms** for the narrow exception paths.

## Timing

Funds are typically released after the required confirmation or review has occurred, and then follow **Stripe's** standard processing and payout schedule. Timing may vary because of disputes, refunds, risk review, reserves, account restrictions, weekends and holidays, and banking delays. Vendibook does not guarantee a specific wall-clock release time. Refund timing to your card or bank follows the same Stripe-driven schedule.

## Chargebacks

Filing a chargeback in place of a refund request may delay resolution. Vendibook cooperates with Stripe and the card network to resolve chargebacks and may hold or reverse funds accordingly.

## Contact

`support@vendibook.com`.
$LMBODY$,'fb17b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d07',$LMCH$v2 draft: removes wall-clock guarantees; clarifies dispute and chargeback interaction with Stripe; unifies subscription and add-on refund posture.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('payments_payouts_terms','v1','draft',$LMTI$Vendibook Payments, Payouts, and Protected Transactions$LMTI$,'payments-payouts-terms',$LMSUM$Detailed terms for payment processing, payment protection, and payouts.$LMSUM$,$LMBODY$# Vendibook Payments, Payouts, and Protected Transactions

## Payment processor

All card, ACH, and Affirm payments on Vendibook are processed by **Stripe**. Stripe's own terms and privacy policy apply to Stripe's handling of your payment information. Vendibook does not receive or store your full card number.

## Payment protection

For card-processed transactions, Vendibook uses Stripe to hold buyer / renter funds as **payment protection on Vendibook's behalf** until the applicable confirmation or review step has occurred. **"Payment protection" is not escrow**, and Vendibook is not a licensed escrow agent. Payment protection does not apply to cash / pay-in-person payments.

## Payouts

Hosts and sellers receive payouts through **Stripe Connect** to the bank account they have connected. Funds are typically released after the required confirmation or review has occurred, and then follow **Stripe's** standard processing and payout schedule. Timing may vary because of disputes, refunds, risk review, reserves, account restrictions, weekends and holidays, and banking delays. Vendibook does not guarantee a specific wall-clock release time.

## Reserves and holds

Stripe may impose reserves, holds, or restrictions on a Connect account per Stripe's terms and risk assessment. Vendibook may separately delay a payout where a dispute, chargeback, safety concern, verification issue, or risk signal is under review.

## Chargebacks and disputes

If a buyer opens a card-network dispute, Stripe manages the process under card-network rules. The seller or host agrees to cooperate and provide evidence promptly. Vendibook may debit disputed amounts pending resolution and may reverse a payout if the dispute is decided against the seller or host.

## Refunds

See the **Refund and Cancellation Policy**. Refunds route back to the original payment method on Stripe's timeline.

## Taxes

Sellers and hosts are responsible for their own taxes. Where Vendibook is legally required to collect or remit a tax, Vendibook will do so and will indicate it in the receipt.

## Financing

Some card-processed sales support **Affirm** through Stripe Checkout as an installment financing option. Vendibook is not the lender. Affirm's approval, rates, limits, eligibility, and terms control. See the **Financing Disclosure**.

## No insurance

Vendibook does not provide or offer platform insurance, damage protection, or a warranty program for transactions between users. Hosts, sellers, buyers, and renters are responsible for evaluating each transaction and for obtaining any insurance or coverage they consider appropriate. No statement in these documents should be read as promising insurance, indemnification, or a Vendibook-backed damage-protection program.
$LMBODY$,'0c27b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d08',$LMCH$New v1 draft: canonical explanation of Stripe-processed payments and Vendibook payment protection; no wall-clock guarantees.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('cookie_policy','v1','draft',$LMTI$Vendibook Cookie Policy$LMTI$,'cookie-policy',$LMSUM$How Vendibook uses cookies and similar technologies, and how to control them.$LMSUM$,$LMBODY$# Vendibook Cookie Policy

Vendibook uses cookies and similar technologies (pixels, local storage, SDKs) to run the site, remember your preferences, measure how the product is used, and, where you consent, personalize your experience and measure advertising.

## Categories

- **Strictly necessary.** Required for the site to work — session, security, load balancing, fraud prevention, checkout continuity. Cannot be disabled.
- **Functional.** Remember preferences such as language and dashboard settings.
- **Analytics.** Help us understand how the product is used so we can improve it. Used only where you consent (or where an applicable exception applies).
- **Advertising / sharing.** Meta Pixel, Google Ads, and related cross-context advertising tools. We treat these conservatively as "sharing" under the CPRA and enable them only where you consent and where any Global Privacy Control (GPC) signal is not opting you out.

## Your controls

- Vendibook's cookie preferences panel lets you accept all, accept necessary only, or customize.
- Once the Phase 5 first-visit consent controls are live, the banner will appear on every route before any non-necessary tracker fires.
- We honor a valid **Global Privacy Control (GPC)** browser signal as an opt-out of advertising / sharing.
- Your browser also offers cookie controls.

## Third-party tools

Third parties (for example, Stripe for payments, Meta and Google for advertising, Tawk.to for chat, Google Fonts for typography) set their own cookies subject to their own privacy notices.

## Changes

We update this policy when tools or categories change. Prior versions remain in the Legal Center.
$LMBODY$,'1d37b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d09',$LMCH$New v1 draft: describes necessary, functional, analytics, and advertising cookies; aligns with Phase 5 first-visit consent controls and GPC.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('california_privacy_notice','v1','draft',$LMTI$California Privacy Notice$LMTI$,'california-privacy',$LMSUM$Additional disclosures for California residents. This v2 draft is held until the Do-Not-Sell-or-Share and GPC mechanisms ship (Phase 5).$LMSUM$,$LMBODY$# California Privacy Notice

*This notice is a draft and is not yet the active California Privacy Notice. It will be activated only after Vendibook's Do-Not-Sell-or-Share mechanism and Global Privacy Control honoring are live and verified.*

This notice supplements the **Privacy Policy** for California residents under the California Consumer Privacy Act, as amended by the CPRA. Vendibook offers the rights below to California residents where the law requires and, where feasible, voluntarily to other U.S. users.

## Categories of personal information collected

Identifiers, commercial information (transactions), internet or network activity, geolocation (approximate), professional or account information, and inferences drawn from the above.

## Sources

You, your device, our service providers (Stripe, Vapi, Tawk.to, Resend), and analytics / advertising partners.

## Purposes

Provide and secure the services, complete transactions, communicate with you, prevent fraud and abuse, comply with law, and — where you consent — personalize the product and advertising.

## "Selling" and "sharing"

Vendibook does not sell personal information for money. Vendibook treats the use of Meta and Google advertising and analytics tools **conservatively as "sharing"** for cross-context behavioral advertising. Use the **Do Not Sell or Share My Personal Information** link in the footer or in the cookie preferences panel, or send a valid Global Privacy Control signal, to opt out.

## Retention

See the retention section of the **Privacy Policy** for category-based targets.

## Your rights

Access, delete, correct, know, limit use of sensitive information (where applicable), opt out of sharing for cross-context behavioral advertising, and non-discrimination for exercising a right. Authorized-agent requests accepted with proof of authority.

## How to make a request

Email `support@vendibook.com` with the subject "California Privacy Request" and describe the request. Vendibook may verify your identity before completing the request.
$LMBODY$,'2e47b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d0a',$LMCH$New v1 draft: describes categories, sources, purposes, sharing, retention, and the Do-Not-Sell-or-Share right. DO NOT ACTIVATE until Phase 5 controls are live and verified.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('esign_disclosure','v1','draft',$LMTI$Electronic Records and Signatures Disclosure (E-Sign)$LMTI$,'esign-disclosure',$LMSUM$Your consent to receive records and to sign documents electronically.$LMSUM$,$LMBODY$# Electronic Records and Signatures Disclosure (E-Sign)

By using Vendibook, you agree to receive records and to sign documents electronically under the federal Electronic Signatures in Global and National Commerce Act (E-SIGN) and applicable state law.

## Scope

Electronic delivery and electronic signature apply to your Vendibook account records, transaction records, receipts, contracts and their copies (including rental agreements, bills of sale, and any e-signed documents produced through Vendibook's integrated e-signature workflow), legal notices, tax forms, and privacy and preference confirmations.

## Hardware and software you need

A device with a modern web browser and internet connection, a working email account you can access, and, if applicable, the ability to open and store PDF and Markdown documents.

## Withdrawing consent

You may withdraw consent to electronic delivery at any time by contacting `support@vendibook.com`. If you withdraw consent, Vendibook may be unable to continue providing you certain services electronically, and your account may be closed or limited.

## Paper copies

You may request a paper copy of any record we provided electronically by emailing `support@vendibook.com`. Vendibook currently does not charge a fee for a paper copy; please allow reasonable time for delivery.

## Updates

Update your email or contact information in your account settings to keep electronic delivery working.

## Retention

You should download and retain electronic records you receive. Vendibook also retains records under the retention section of the **Privacy Policy**.
$LMBODY$,'3f57b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d0b',$LMCH$New v1 draft: consolidates ESIGN Act consent scope and paper-copy request procedure into a stable, linkable document.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('sms_terms','v1','draft',$LMTI$Vendibook SMS Terms$LMTI$,'sms-terms',$LMSUM$How Vendibook uses SMS and text messaging, and how to control it.$LMSUM$,$LMBODY$# Vendibook SMS Terms

## When you opt in

You may opt in to Vendibook SMS at signup, in your account communication settings, through the SMS web opt-in page, or in specific product flows (for example, booking or transaction updates). Your consent is recorded with the time, source, and the exact wording you saw.

## What Vendibook may send

Transactional and account messages (bookings, payments, verification codes, support callbacks, dispute updates) and, where you separately opt in, marketing messages. Message frequency varies.

## Rates

Standard message and data rates may apply. Vendibook does not charge for the messages themselves.

## Keywords

- Text **STOP** to opt out of Vendibook SMS. You will receive one confirmation message and no further SMS.
- Text **HELP** for help. You may also visit `/help` or email `support@vendibook.com`.

## Consent records

Vendibook retains SMS consent, opt-out, and delivery records indefinitely as a compliance record required by mobile carriers.

## Carriers

Carriers are not liable for delayed or undelivered messages. Vendibook does not guarantee delivery to any particular carrier.

## Privacy

Phone numbers and SMS-related metadata are handled under the **Privacy Policy**.
$LMBODY$,'4067b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d0c',$LMCH$New v1 draft: canonical DB-backed SMS terms; carrier-required language; STOP / HELP handling; consent retention.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('referral_terms','v1','draft',$LMTI$Vendibook Referral Program Terms$LMTI$,'referral-terms',$LMSUM$How the Vendibook referral program works, including eligibility, rewards, and payment.$LMSUM$,$LMBODY$# Vendibook Referral Program Terms

These Terms govern the Vendibook referral program.

## Who can refer

You must be a Vendibook account holder in good standing, 18 or older, and located where the program is permitted.

## How it works

Share your unique Vendibook referral link. Rewards are earned when a referred person completes a qualifying action, such as listing an asset that publishes, completing a paid rental, or completing a paid purchase, as disclosed in the product at the time of the referral. Amounts, qualifying-action definitions, hold periods, and payout method may change; the current terms displayed in the referral surface control.

## Payment and 1099

Referral rewards are paid to the referrer's connected Stripe account after the applicable hold period. Vendibook may issue an IRS Form 1099 to any U.S. referrer whose total annual rewards exceed $600 or where otherwise legally required. You are responsible for the tax treatment of rewards.

## Prohibited conduct

No self-referrals, no fake accounts, no incentivizing users to sign up for the sole purpose of collecting a reward, no spam, no misrepresentation. Vendibook may reverse rewards, disqualify participants, and close accounts for suspected abuse.

## Availability

The program is void where prohibited or restricted by law. Vendibook may pause, change, or end the program at any time. Rewards that have already vested at that time will still be paid.

## Disputes

Contact `support@vendibook.com`.
$LMBODY$,'5177b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d0d',$LMCH$New v1 draft: reflects the current referral_program_config values and 1099 threshold; adds void-where-prohibited language pending per-state review.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('ai_tools_disclaimer','v1','draft',$LMTI$Vendibook AI Tools and PermitPath Disclaimer$LMTI$,'ai-tools-disclaimer',$LMSUM$Important limitations for Vendibook Spark, PermitPath, and other assisted tools.$LMSUM$,$LMBODY$# Vendibook AI Tools and PermitPath Disclaimer

Vendibook offers automated and assisted tools, including the **Spark** listing writing assistants, **PermitPath** permit and licensing guidance, **EventPro** event planning helpers, and the **Vendi** voice and text concierge. These tools are for informational and convenience purposes only.

## Not professional advice

Vendibook does not provide legal, tax, insurance, financial, health, food-safety, or professional licensing advice. PermitPath output, EventPro output, and Vendi responses may be incomplete, out of date, or wrong for your jurisdiction, asset, or situation. **Always verify permits, licenses, taxes, insurance, and legal requirements with the relevant authority or a qualified professional before acting.**

## Automated content

Content generated by Spark or other AI tools may contain errors and may be similar to output produced for other users. You are responsible for reviewing, correcting, and approving any AI-generated content in your listing, message, or document before it is published or sent.

## Voice and chat

Vendi voice calls may be monitored or recorded for quality and training. Recording is disclosed at the start of the call.

## No liability for reliance

Vendibook is not liable for consequences of relying on AI or PermitPath output. See the limitation of liability in the **Terms of Service**.
$LMBODY$,'6287b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d0e',$LMCH$New v1 draft: covers Spark listing assistants, PermitPath guidance, Vendi voice / chat concierge; disclaims professional advice and permit accuracy.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('financing_disclosure','v1','draft',$LMTI$Vendibook Financing Disclosure$LMTI$,'financing-disclosure',$LMSUM$Information about third-party financing offered through Vendibook checkout.$LMSUM$,$LMBODY$# Vendibook Financing Disclosure

Some card-processed sales on Vendibook support **Affirm** as an installment financing option, made available through **Stripe Checkout**.

## Vendibook is not the lender

Vendibook does not extend credit, does not underwrite loans, and is not a party to your financing agreement. The financing provider is the lender.

## Provider terms control

Approval, credit limits, rates, term length, fees, eligibility, and payment schedules are determined solely by the financing provider based on the provider's own criteria. Provider terms and privacy notices apply to your financing account.

## No other providers currently live

Affirm through Stripe is the only financing option Vendibook currently supports. Vendibook will only list additional providers here after they are actually live in checkout.

## Questions

Direct financing questions to the provider. General questions about a Vendibook transaction may be sent to `support@vendibook.com`.
$LMBODY$,'7397b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d0f',$LMCH$New v1 draft: names Affirm-through-Stripe as the only live provider; makes clear Vendibook is not the lender.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';

INSERT INTO public.legal_documents (document_type, version, status, title, slug, summary, body_markdown, content_hash, change_summary, effective_at, requires_reacceptance)
VALUES ('ip_takedown_policy','v1','draft',$LMTI$Vendibook Intellectual Property and Takedown Policy$LMTI$,'ip-takedown-policy',$LMSUM$How to report content on Vendibook that infringes your intellectual property, and how Vendibook handles reports.$LMSUM$,$LMBODY$# Vendibook Intellectual Property and Takedown Policy

Vendibook respects intellectual property rights. If you believe content on Vendibook infringes your copyright, trademark, or other IP rights, you may report it as described below.

## What to include in a report

Send an email to `support@vendibook.com` with subject "IP Takedown" and include:

1. Your full name, contact email, and phone number.
2. A description of the work or mark you believe is being infringed, and, for copyright, enough detail for Vendibook to locate the original.
3. A link to the specific Vendibook listing, review, message, or URL you are reporting, and enough context for Vendibook to locate it.
4. A statement that you have a good-faith belief the reported use is not authorized by the rights holder, the rights holder's agent, or the law.
5. A statement, under penalty of perjury, that the information in the report is accurate and that you are the rights holder or authorized to act on the rights holder's behalf.
6. Your physical or electronic signature.

## How Vendibook handles reports

Vendibook reviews complete reports and may remove reported content, notify the user who posted it, and, for repeat infringers, suspend or terminate accounts. Vendibook may share the report with the affected user.

## Counter-notice

If your content was removed and you believe removal was mistaken, you may send a counter-notice to `support@vendibook.com` explaining why. Vendibook may forward the counter-notice to the original reporter and may, in Vendibook's discretion, restore the content.

## No safe-harbor claim

Vendibook does not currently claim registration of a DMCA designated agent with the U.S. Copyright Office. This policy describes a good-faith process and does not itself confer or claim any statutory safe harbor.

## Trademark reports

Send trademark reports to the same address with subject "Trademark Report" and include comparable information tailored to the mark and the alleged infringing use.
$LMBODY$,'84a7b28eab8e4a20e7e5c04a1c0f77c1bc8dfe3c1a19b8e8e0b21e5a4d6a1d10',$LMCH$New v1 draft: describes a practical copyright / trademark takedown process without claiming DMCA safe-harbor status.$LMCH$, now(), false)
ON CONFLICT (document_type, version) DO UPDATE SET title=EXCLUDED.title, slug=EXCLUDED.slug, summary=EXCLUDED.summary, body_markdown=EXCLUDED.body_markdown, content_hash=EXCLUDED.content_hash, change_summary=EXCLUDED.change_summary
  WHERE public.legal_documents.status = 'draft';