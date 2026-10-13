/**
 * Vendibook marketplace terms, shown as tabs at /terms (owner request 2026-10-13).
 *
 * Original drafting for Vendibook's actual process: request-to-buy with a 14-day
 * seller decision, manually issued invoices, payment protection (the seller's
 * payout is released only after the handoff steps), the 8.7% seller fee, sales
 * tax with exemption certificates, and Square card payments for rentals.
 *
 * Wording guardrails (see src/lib/legal/versions.ts): never describe Vendibook
 * as holding, escrowing or safekeeping funds, as a bank, lender, insurer, broker,
 * agent or party to a sale, and never promise an inspection, a recorded
 * walkthrough or a condition warranty. Payment protection is a platform policy.
 */
import { FEE_CONFIG } from '../../../supabase/functions/_shared/feeConfig';

export const TERMS_ENTITY = 'Vendibook LC';
export const TERMS_GOVERNING_STATE = 'Arizona';
export const TERMS_VENUE = 'Pima County, Arizona';
export const TERMS_LEGAL_EMAIL = 'legal@vendibook.com';
export const TERMS_SUPPORT_EMAIL = 'support@vendibook.com';
export const TERMS_PRIVACY_EMAIL = 'privacy@vendibook.com';
export const MARKETPLACE_TERMS_VERSION = '2026-10-13';
export const MARKETPLACE_TERMS_EFFECTIVE = 'October 13, 2026';

const SALE_FEE = `${FEE_CONFIG.saleSellerFeePct}%`;
const RENTER_FEE = `${FEE_CONFIG.rentalRenterFeePct}%`;
const HOST_FEE = `${FEE_CONFIG.rentalHostFeePct}%`;

export type TermsBlock = string | { list: string[] } | { caps: string };
export type TermsSection = { id: string; title: string; blocks: TermsBlock[] };
export type TermsTab = {
  id: 'site-usage' | 'buyer' | 'seller' | 'rental' | 'guarantee' | 'abandonment' | 'privacy';
  label: string;
  title: string;
  intro: string[];
  keyPoints?: string[];
  sections: TermsSection[];
};

const s = (id: string, title: string, ...blocks: TermsBlock[]): TermsSection => ({ id, title, blocks });
const list = (...items: string[]) => ({ list: items });
const caps = (text: string) => ({ caps: text });

const SITE_USAGE: TermsTab = {
  id: 'site-usage',
  label: 'Site Usage Terms',
  title: 'Site Usage Terms and Conditions',
  intro: [
    `Vendibook is an online marketplace where businesses and individuals buy, sell and rent food trucks, food trailers, commercial kitchens, vendor spaces and related equipment. These Site Usage Terms and Conditions (the "Site Terms") are a contract between you and ${TERMS_ENTITY} ("Vendibook", "we", "us" or "our"). They govern your use of vendibook.com, our apps, messages, tools and related services (together, the "Services"), whether or not you create an account.`,
    'By using the Services or creating an account, you confirm that you have read and agree to these Site Terms and to the Buyer, Seller, Rental, Vendibook Guarantee and Abandonment terms on this page that apply to what you do on Vendibook, and you acknowledge our Privacy Policy. If you do not agree, do not use the Services.',
    'PLEASE READ SECTION 17 CAREFULLY. IT REQUIRES MOST DISPUTES WITH VENDIBOOK TO BE RESOLVED BY INDIVIDUAL BINDING ARBITRATION AND WAIVES JURY TRIALS AND CLASS ACTIONS, UNLESS YOU OPT OUT AS DESCRIBED THERE.',
  ],
  sections: [
    s('su-1', '1. Who can use Vendibook',
      'You must be at least 18 years old and able to form a binding contract. The Services are built for business use, including people starting a food business. If you use Vendibook for a company or other organization, "you" includes that organization, and you confirm that you are authorized to bind it to these terms.',
      'You may not use the Services if we previously suspended or removed you, if you are located in a country subject to comprehensive U.S. sanctions, or if you are on a U.S. government restricted-party list.'),
    s('su-2', '2. Your account and verification',
      'Keep your profile accurate and current, keep your password private, and tell us right away at ' + TERMS_SUPPORT_EMAIL + ' if you think someone else has used your account. You are responsible for activity on your account. One person or business may not operate multiple accounts to get around a limit, a review or a suspension.',
      'To protect members from scams, we require phone verification, and in some cases identity verification, before you can start a conversation, make an offer, request a purchase or book a rental. We may ask for more information at any time and may limit features until verification is complete. Sellers and hosts are never blocked from answering buyers about their own listings.',
      'We send service notices, transaction updates and legal notices to the email address on your account. You can turn off marketing messages in your settings, but not messages about your transactions or your account.'),
    s('su-3', '3. How the marketplace works',
      'Listings are created by sellers and hosts, not by Vendibook. A sale or rental agreement is formed directly between the buyer or renter and the seller or host. Vendibook provides the marketplace and the tools around the transaction: listings, messaging, purchase requests and offers, invoices, checkout, sales tax, signed agreements, video walkthroughs, handoff records, payment protection and support. Vendibook is not the seller, buyer, owner, broker, dealer or agent of any party, and does not take title to equipment.',
      'Vendibook also sells its own products, such as Vendibook Pro, BuyerMatch AI outreach, listing boosts and listing services. Those purchases are between you and Vendibook and are covered by these Site Terms and the terms shown at checkout.'),
    s('su-4', '4. Rules for using the Services',
      'You agree not to, and not to help anyone else to:',
      list(
        'post false, misleading or stolen listings, photos or information, or list equipment you do not own or have no right to sell or rent;',
        'move a transaction that started on Vendibook off the platform to avoid fees, payment protection or safety checks, or ask a member to pay by cash, wire, gift card, payment app or any method outside Vendibook checkout or a Vendibook invoice;',
        'post or send phone numbers, email addresses or links meant to take members off Vendibook (we remove contact details from listings automatically);',
        'make offers or purchase requests on your own listings, use a second account or another person to raise interest or price, or coordinate with other buyers to hold prices down;',
        'harass, threaten, discriminate against or defraud any person;',
        'use bots, scrapers, crawlers or other automated tools to access, copy or collect data from the Services, or bypass any rate limit or access control;',
        'copy, reverse engineer, decompile or build a competing product from the Services, including our pricing, search and matching tools;',
        'interfere with, probe or attack the security or operation of the Services, or upload malware;',
        'impersonate anyone, misstate your business, or share your login with others;',
        'list or transact in anything illegal, recalled, stolen, or subject to a lien you have not disclosed;',
        'use the Services in a way that breaks any law, including food safety, licensing, consumer protection, tax, export control and sanctions laws.',
      )),
    s('su-5', '5. Messaging, safety reviews and enforcement',
      'To keep members safe, we automatically review messages, offers and listings for scam patterns, requests to pay off-platform and contact details. We may delay, hide or limit a message, place a hold on an account, remove content or cancel a transaction while we review it. We do this to protect the marketplace; it does not make us responsible for what members say or do.'),
    s('su-6', '6. Marketplace data',
      'Listing details, prices, offers, sold results and other marketplace information shown on Vendibook ("Marketplace Data") may be used only to help you buy, sell or rent on Vendibook. You may not copy, store, publish, sell, feed into pricing tools or datasets, or otherwise commercialize Marketplace Data without our written permission. Your own transaction records, invoices, agreements and receipts are yours to download and keep.'),
    s('su-7', '7. Your content',
      'You keep ownership of the photos, videos, descriptions, messages and other content you submit ("Your Content"). You give Vendibook a worldwide, non-exclusive, royalty-free, transferable and sublicensable license to host, store, copy, resize, edit for format, display, distribute and promote Your Content to operate, improve and market the Services, including showing your listings to buyers through BuyerMatch, search engines, partner sites and advertising. We may keep Your Content as a transaction record and use it as evidence in a dispute even after you delete it. We may use data about how the Services are used, in de-identified or aggregated form, for any business purpose.',
      'You confirm that you have the rights needed to grant this license, that Your Content is accurate, and that it does not infringe anyone’s rights. You are responsible for Your Content.'),
    s('su-8', '8. Vendibook’s property and your feedback',
      'The Services, including the software, design, Marketplace Data, the Vendibook name and logo, and all related intellectual property, belong to Vendibook or its licensors. Except for the limited right to use the Services under these terms, no rights are granted to you. If you send us ideas or feedback, we may use them freely without any obligation to you.'),
    s('su-9', '9. Fees, payments and taxes',
      'Fees are shown before you commit to a purchase, rental, listing upgrade or subscription, and the amount shown at that point is the amount that applies. Current marketplace fees are described in the Buyer, Seller and Rental tabs. We may change fees for future transactions by updating the pricing shown on Vendibook.',
      'Payments are processed by third-party providers. Rental bookings and Vendibook products are paid by card through Square. Equipment purchases are paid through a Vendibook invoice using the payment methods listed on the invoice. By paying, you also agree to the provider’s terms. Vendibook does not accept cash for any transaction.',
      'Where the law requires it, Vendibook calculates, collects and remits sales tax on marketplace transactions and on its own products. Tax is added to the price shown. Buyers with a valid exemption or resale certificate can upload it in their account; it applies to their purchases in that state from the time it is uploaded, and we may review or revoke it.'),
    s('su-10', '10. Third-party services',
      'The Services connect to services we do not control, including payment providers (Square and PayPal), electronic signature (SignNow), financing (Equinox Funding and its funding providers), carriers, insurers and map, email and messaging providers. Their terms and privacy policies apply to your use of them, and Vendibook is not responsible for their acts, availability or decisions, including any financing approval or denial. Vendibook is not a lender.'),
    s('su-11', '11. Privacy and security',
      'Our Privacy Policy explains what we collect, how we use and share it, and your choices. We use administrative, technical and physical safeguards designed to protect your information, but no system is perfectly secure, and you share information at your own risk.'),
    s('su-12', '12. Suspension and closing accounts',
      'We may suspend or close an account, remove or hide a listing, limit features, or cancel a transaction at any time if we reasonably believe there has been fraud, misrepresentation, payment abuse, a safety risk, a legal requirement, or a breach of these terms. You may close your account at any time from your settings. Closing an account does not cancel obligations from transactions already agreed, paid or delivered, and the sections of these terms that by their nature should survive will survive.'),
    s('su-13', '13. Changes to the Services and to these terms',
      'We may change, add or remove features at any time. We may update these terms by posting the new version on this page with a new effective date. For material changes we will also notify you by email or in the app. Changes apply going forward and do not change a transaction already agreed. If a step on Vendibook requires you to accept a specific version, you must accept the new version before continuing past that step. If you do not agree to a change, stop using the Services and close your account.'),
    s('su-14', '14. Disclaimers',
      caps('THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." TO THE FULLEST EXTENT PERMITTED BY LAW, VENDIBOOK DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. VENDIBOOK DOES NOT INSPECT, TEST, CERTIFY OR WARRANT ANY EQUIPMENT, VEHICLE, KITCHEN OR SPACE, ITS CONDITION, TITLE, LIEN STATUS, PERMITS OR CODE COMPLIANCE, OR ANY MEMBER’S IDENTITY, STATEMENTS OR ABILITY TO COMPLETE A TRANSACTION. BADGES, RANKINGS AND VERIFICATION MARKS DESCRIBE A CHECK WE RAN AT A POINT IN TIME AND ARE NOT AN ENDORSEMENT. WE DO NOT PROMISE THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE OR SECURE.'),
      'Some jurisdictions do not allow certain warranty exclusions, so some of these exclusions may not apply to you.'),
    s('su-15', '15. Limitation of liability',
      caps('TO THE FULLEST EXTENT PERMITTED BY LAW, VENDIBOOK AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, BUSINESS, GOODWILL OR DATA, ARISING FROM THE SERVICES, ANY LISTING, ANY TRANSACTION OR ANY MEMBER’S CONDUCT, EVEN IF ADVISED OF THE POSSIBILITY. VENDIBOOK’S TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICES IS LIMITED TO THE GREATER OF (A) THE FEES YOU PAID TO VENDIBOOK IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM AND (B) ONE HUNDRED U.S. DOLLARS. FOR A CLAIM ABOUT A PAYMENT-PROTECTED PURCHASE, VENDIBOOK’S LIABILITY IS LIMITED AS DESCRIBED IN THE VENDIBOOK GUARANTEE.'),
      'These limits apply to any theory of liability and do not limit liability that cannot be limited by law.'),
    s('su-16', '16. Indemnity',
      'You will defend, indemnify and hold harmless Vendibook and its owners, officers, employees, contractors and agents from claims, losses, liabilities, costs and expenses (including reasonable attorneys’ fees) arising from your use of the Services, Your Content, your listings and transactions, your breach of these terms, your violation of any law or third-party right, or any personal injury or property damage connected with equipment you sell, buy, rent, inspect, transport or operate. We may take control of the defense of any claim at our cost, and you will cooperate. You may not settle a claim that affects Vendibook without our written consent.'),
    s('su-17', '17. Disputes, arbitration and class action waiver',
      'Disputes between members. Buyers, sellers, renters and hosts resolve disputes with each other directly, using the Vendibook Guarantee and support tools where they apply. Vendibook may help but is not required to.',
      `Disputes with Vendibook. Please contact ${TERMS_LEGAL_EMAIL} first; most concerns can be resolved quickly. If we cannot resolve a dispute within 30 days, you and Vendibook agree that any claim arising from or relating to these terms or the Services will be resolved by final and binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, before a single arbitrator, seated in ${TERMS_VENUE}, with hearings by video where the arbitrator allows. Either party may instead bring an individual claim in small claims court, and either party may ask a court for an injunction to stop misuse of its intellectual property or the Services.`,
      caps('CLAIMS MUST BE BROUGHT ONLY IN AN INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS, COLLECTIVE, CONSOLIDATED OR REPRESENTATIVE PROCEEDING. YOU AND VENDIBOOK EACH WAIVE THE RIGHT TO A JURY TRIAL.'),
      `Opting out. You may opt out of arbitration within 30 days after you first accept these terms by emailing ${TERMS_LEGAL_EMAIL} with your name, account email and a statement that you opt out of arbitration. If you opt out, or if arbitration is found unenforceable, claims will be decided by the state or federal courts located in ${TERMS_VENUE}, without a jury, and the class action waiver still applies to the fullest extent allowed by law.`,
      'Time limit. Any claim against Vendibook must be filed within one year after it arose, or it is permanently barred, unless the law requires a longer period.'),
    s('su-18', '18. Governing law',
      `These terms are governed by the laws of the State of ${TERMS_GOVERNING_STATE} and applicable U.S. federal law, including the Federal Arbitration Act, without regard to conflict-of-law rules. The United Nations Convention on Contracts for the International Sale of Goods does not apply.`),
    s('su-19', '19. General terms',
      'These terms, together with the other tabs on this page, the documents listed in our Legal Center, and any terms you accept at checkout or in a signed purchase or rental agreement made through Vendibook, are the entire agreement between you and Vendibook about the Services. If terms conflict, the order of priority is: a written agreement signed through Vendibook for a specific transaction; then the Buyer, Seller, Rental, Vendibook Guarantee and Abandonment terms; then these Site Terms.',
      'You may not assign these terms without our written consent; we may assign them, including in a merger, acquisition or sale of assets. If any provision is unenforceable, the rest remains in effect. Our failure to enforce a provision is not a waiver. Neither party is liable for delays caused by events beyond its reasonable control. You consent to receive agreements, notices and records electronically. The English version of these terms controls.'),
    s('su-20', '20. Copyright and intellectual property complaints',
      `If you believe content on Vendibook infringes your copyright or other intellectual property, email ${TERMS_LEGAL_EMAIL} with: your physical or electronic signature; a description of the work you say is infringed; the link to the content on Vendibook; your name, address, phone and email; a statement that you believe in good faith the use is not authorized by the owner, its agent or the law; and a statement, under penalty of perjury, that your notice is accurate and that you are the owner or authorized to act for the owner. We remove infringing content where appropriate and close the accounts of repeat infringers. Knowingly false notices can lead to liability for damages.`),
    s('su-21', '21. Contact',
      `Legal notices: ${TERMS_LEGAL_EMAIL}. Help with an account or transaction: ${TERMS_SUPPORT_EMAIL}. Privacy requests: ${TERMS_PRIVACY_EMAIL}. California residents may also contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs, 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834, phone (800) 952-5210.`),
  ],
};

const BUYER: TermsTab = {
  id: 'buyer',
  label: 'Buyer Terms',
  title: 'Buyer Terms and Conditions',
  intro: [
    'These Buyer Terms and Conditions apply when you request to buy, make an offer on, pay for or pick up equipment listed for sale on Vendibook. They add to the Site Usage Terms. The sale contract is between you and the seller; Vendibook runs the marketplace, the invoice and the payment-protection steps around it.',
  ],
  keyPoints: [
    'A purchase request does not charge you. The seller has up to 14 days to approve or decline; requests without an answer are canceled automatically.',
    'Once the seller approves your request, or you accept a seller’s revised terms and the seller approves, you are committed to buy at the agreed price, subject to the invoice.',
    'Vendibook does not add a buyer platform fee to equipment purchases. Your invoice shows the agreed price, delivery or shipping, and sales tax.',
    'Pay your invoice by its due date, using the payment methods on the invoice. Cash and payments outside Vendibook are not accepted.',
    'Sales tax is collected based on where the equipment is delivered or picked up. Upload an exemption or resale certificate before your invoice if you qualify.',
    'Payment protection: the seller’s payout is released only after you confirm the handoff, both of you sign the purchase agreement and the walkthrough video is saved.',
    'Inspect before you confirm the handoff. Report a problem through Vendibook before confirming, as described in the Vendibook Guarantee.',
    'Arrange pickup within 10 business days after the seller marks the equipment ready. Storage fees and abandonment rules apply after that.',
    'Equipment is sold as is, where is, unless the seller gives you a written warranty. Vendibook does not inspect or warrant equipment.',
  ],
  sections: [
    s('b-1', '1. Acceptance',
      'You accept these Buyer Terms when you check the acknowledgment box to send a purchase request or make an offer, or when you pay an invoice. If you do not accept them, you may not buy through Vendibook.'),
    s('b-2', '2. Ways to buy',
      'Request to buy. You send a request for the listed equipment at the listed price and fulfillment option. Sending a request does not charge you and does not reserve the equipment. The seller may approve, decline or propose revised terms. Revised terms only apply if you accept them. If the seller does not answer within 14 days, the request is canceled and you are notified. You may cancel your request at any time before the seller approves it.',
      'Make an offer. On listings that accept offers, you can offer a different price. An offer stays open for 48 hours unless the seller accepts, declines or counters it first. A counteroffer stays open for 48 hours. When a price is agreed, the purchase continues as a purchase request at that price. Offers may not be made on your own listing or through another account.',
      'Binding purchase. When the seller approves your request (including any revised terms you accepted), a binding agreement to buy and sell the equipment on those terms is formed between you and the seller (a "Binding Purchase"). The listing is then reserved for you while Vendibook prepares your invoice.',
      'Buying with financing. If you plan to pay with financing, say so in your messages before the seller approves. If your financing provider declines before your invoice is due and you tell us in writing, we will cancel the purchase without treating it as a default. Financing is offered by independent providers; Vendibook is not a lender and does not guarantee approval or terms.'),
    s('b-3', '3. Inspection and condition',
      'Equipment on Vendibook is often used and may have defects. Read the full listing, review every photo, ask questions in Vendibook messages, and request a live video walkthrough or an in-person inspection before you request to buy. Descriptions, photos, hours, mileage and specifications come from the seller. Vendibook does not inspect, test or certify equipment.',
      'Unless the seller gives you a written warranty in the listing or the signed purchase agreement, equipment is sold AS IS, WHERE IS, with all faults, and neither the seller nor Vendibook makes any warranty, including merchantability or fitness for a particular purpose. The Vendibook Guarantee describes the payment protection that applies to purchases paid through Vendibook.'),
    s('b-4', '4. Price, fees and taxes',
      'Your price is the price agreed with the seller. Vendibook does not charge buyers a platform fee on equipment purchases. Delivery, freight and other charges shown in the listing or agreed with the seller appear on your invoice. When a seller covers Vendibook Freight, your invoice shows free shipping.',
      'Vendibook calculates and collects sales tax on your purchase where required, using the combined state and average local rate for the delivery or pickup location, and shows it on your invoice. You are responsible for any registration, titling, use or other taxes and government fees that are not collected on the invoice.',
      'Tax exemptions. If your purchase is exempt from sales tax (for example, you are buying for resale or rental, or you are a qualifying nonprofit or government buyer), upload a valid certificate for the delivery or pickup state using the "Tax exempt?" button before your invoice is issued. A certificate applies from the time it is uploaded. If you paid tax and then provide a valid certificate within 30 days after paying, we will refund the tax we have not yet sent to the state; after that, you will need to ask the state for a refund. You are responsible for, and will reimburse Vendibook for, any tax, interest and penalties that result from an invalid, expired or misused certificate.'),
    s('b-5', '5. Invoices and payment',
      'After the seller approves, Vendibook sends your itemized invoice by email and shows it in your dashboard with a Pay Invoice button. The invoice is issued for the sale on the seller’s behalf and shows the seller as the legal seller. Pay the full amount by the due date on the invoice (usually 7 days after it is issued) using the methods it lists. Payments must come from you or your business; we do not accept payments from unrelated third parties unless we approve them in advance in writing. Vendibook never asks you to pay a seller directly or by gift card, wire to a personal account or payment app.'),
    s('b-6', '6. Payment protection and handoff',
      'Purchases paid through a Vendibook invoice are covered by payment protection under the Vendibook Guarantee. When your payment is received, the sale moves to Sale Pending. The seller’s payout is released only after all of these are done in Vendibook: (a) you confirm the handoff, (b) you and the seller sign the purchase agreement, and (c) the walkthrough video of the equipment is saved. Confirming the handoff tells us the equipment matched what you agreed to buy, so inspect it first.'),
    s('b-7', '7. Pickup, delivery and risk of loss',
      'Unless the listing or your agreement includes delivery or Vendibook Freight, you are responsible for picking up and transporting the equipment, including loading, permits, escorts and any special handling. Coordinate pickup through Vendibook messages. Remove the equipment within 10 business days after the seller marks it ready for pickup; after that, the storage and abandonment rules in the Abandonment Policy apply.',
      'Risk of loss passes to you when you or your carrier take custody of the equipment. Arrange insurance from that point. Transport damage claims are between you and your carrier, or are handled under the freight provider’s terms when you use Vendibook Freight.'),
    s('b-8', '8. Title, liens and documents',
      'The seller must transfer clear title and any registration documents at handoff, along with a signed purchase agreement and bill of sale through Vendibook. You are responsible for titling and registering the equipment in your name and paying related fees. If the seller cannot deliver clear title, the sale may be canceled and your protected payment refunded as described in the Vendibook Guarantee.'),
    s('b-9', '9. If you do not pay',
      'If you do not pay the full invoice by its due date, Vendibook may cancel the Binding Purchase, release the listing to other buyers, suspend your ability to request purchases or make offers, require prepayment or a deposit for future purchases, or close your account. Repeatedly requesting purchases without paying is a breach of these terms.'),
    s('b-10', '10. Compliance',
      'You are responsible for the licenses, permits, health department approvals, fire safety inspections, commissary agreements and insurance needed to operate the equipment where you will use it. Diesel trucks and engines operated in California may be subject to California Air Resources Board emissions rules, including retrofit or replacement requirements; check before you buy. You must comply with U.S. export control and sanctions laws and may not export, resell or transfer equipment in violation of them.'),
    s('b-11', '11. Responsibility and release',
      'Vendibook’s responsibility for a purchase is limited to the payment-protection steps in the Vendibook Guarantee and the limits in the Site Usage Terms. If you have a dispute with a seller, you release Vendibook and its owners, officers, employees and agents from claims and damages arising from that dispute, except claims about how Vendibook handled payment protection. If you are a California resident, you waive California Civil Code section 1542, which says: "A general release does not extend to claims that the creditor or releasing party does not know or suspect to exist in his or her favor at the time of executing the release and that, if known by him or her, would have materially affected his or her settlement with the debtor or released party."'),
    s('b-12', '12. Privacy of seller information',
      'When your purchase is confirmed, we share the seller’s name and the details needed to complete the handoff with you, and yours with the seller. Use that information only to complete the transaction, the handoff and any legal or tax obligations.'),
  ],
};

const SELLER: TermsTab = {
  id: 'seller',
  label: 'Seller Terms',
  title: 'Seller Terms and Conditions',
  intro: [
    'These Seller Terms and Conditions apply when you list equipment for sale on Vendibook, respond to buyers, approve a purchase, receive a payout or use seller tools such as Vendibook Pro, BuyerMatch AI and listing boosts. They add to the Site Usage Terms. You are the legal seller of your equipment; Vendibook provides the marketplace, invoice and payment-protection steps.',
  ],
  keyPoints: [
    `Vendibook’s seller platform fee is ${SALE_FEE} of the equipment price, deducted from your payout. It also applies to sales financed through Equinox Funding.`,
    'Approve or decline each purchase request within 14 days. Approving creates a binding commitment to sell at the accepted terms.',
    'Vendibook issues the buyer’s invoice for your sale and handles sales tax collection where required.',
    'Your payout is released after the buyer confirms the handoff, both of you sign the purchase agreement and the walkthrough video is saved.',
    'List only equipment you own or are authorized to sell, describe it accurately with real photos of the actual unit, and disclose liens and known defects.',
    'Make the equipment available for pickup within 5 business days after the buyer’s payment is received.',
    'Never take a Vendibook buyer off the platform, and never make offers on your own listings.',
  ],
  sections: [
    s('s-1', '1. Acceptance',
      'You accept these Seller Terms when you publish a listing for sale or approve a purchase request. If you are listing for a business, you confirm you are authorized to sell its equipment.'),
    s('s-2', '2. Listing standards',
      'Each listing must describe one specific unit (or a clearly defined package) and must be accurate and complete, including:',
      list(
        'real, current photos of the actual equipment, not stock images or photos of a different unit;',
        'year, make, model, VIN or serial number where one exists, mileage or hours, and the condition you select;',
        'every material defect you know about, prior accidents, salvage, rebuilt or flood history, and any liens;',
        'what is and is not included (appliances, generators, propane tanks, hoods and fire suppression, smallwares, wraps, permits);',
        'the location where the equipment can be inspected and picked up, and the fulfillment options you offer;',
        'the price you are actually willing to accept.',
      ),
      'Do not include phone numbers, email addresses or links in a listing; we remove them automatically so buyers contact you through Vendibook. We may edit a listing’s format or category, ask for more information, verify details, hide or remove a listing, or cancel a sale we believe is suspicious, inaccurate or unlawful.'),
    s('s-3', '3. Your promises about the equipment',
      'For each listing and each sale, you represent and warrant that:',
      list(
        'you own the equipment, or are authorized by the owner to sell it, and will transfer good title free of all liens, security interests, taxes and other claims except those disclosed in the listing and cleared before handoff;',
        'the description, photos, mileage and hour readings and specifications are accurate and the odometer and hour meters have not been altered;',
        'the equipment is not stolen, counterfeit, recalled without repair, or obtained by fraud, and has not been modified in a way that violates law, including tampering with emissions controls;',
        'you are not insolvent and no proceeding exists that would stop you from selling;',
        'any device, point-of-sale system or computer included with the equipment has been wiped of personal and payment data;',
        'the equipment was not sourced from a sanctioned country and you are not on any U.S. restricted-party list;',
        'you will deliver the equipment in the condition shown in the listing and the walkthrough, with keys, title, manuals and included items.',
      )),
    s('s-4', '4. Responding to buyers',
      'Respond to messages promptly. Approve or decline each purchase request within 14 days; Vendibook reminds you and cancels requests that are not answered in time. You may propose revised terms, which apply only if the buyer accepts. Offers and counteroffers stay open for 48 hours.',
      'Approving a request creates a binding commitment to sell the equipment to that buyer at the accepted terms. Do not approve a request unless the equipment is available and you are ready to complete the sale. While a sale is approved or pending payment, the listing is reserved and other buyers cannot request it.',
      'You may not make offers or purchase requests on your own listings, directly or through anyone else. For 12 months after a buyer first contacts you through Vendibook, you agree not to sell or rent that equipment to that buyer outside Vendibook.'),
    s('s-5', '5. Fees',
      `Vendibook’s seller platform fee for equipment sales is ${SALE_FEE} of the equipment price. It is not charged on sales tax, or on delivery or shipping charges passed through to the buyer. The fee is deducted from your payout and also applies when the buyer finances the purchase through Equinox Funding. Optional products such as Vendibook Pro, BuyerMatch AI outreach, listing boosts and listing services are priced at checkout and are separate from the platform fee. A boost or outreach campaign increases visibility; it does not guarantee a sale. Rental host fees are described in the Rental tab.`),
    s('s-6', '6. Invoices, payment and payout',
      'When you approve a purchase, you authorize Vendibook to issue an itemized invoice to the buyer for your sale, showing you as the legal seller, and to collect the buyer’s payment and applicable sales tax through Vendibook’s payment providers. Do not invoice the buyer separately or accept payment outside Vendibook.',
      'Your payout is the equipment price, less the seller platform fee and any amounts you owe Vendibook. Payment protection applies: the payout is released only after the buyer confirms the handoff, you and the buyer sign the purchase agreement, and the walkthrough video is saved in Vendibook. We aim to release payouts within 3 business days after those steps are complete. Payouts are made only to an account in your name or your business’s name that you have verified with us. We may delay a payout while a claim under the Vendibook Guarantee, a chargeback or a fraud review is open, and we may deduct amounts you owe Vendibook from any payout.'),
    s('s-7', '7. Handoff',
      'After the buyer’s payment is received, make the equipment available for pickup or delivery within 5 business days and coordinate the handoff through Vendibook messages. At handoff, you must: provide the equipment in the condition shown; provide the title, registration, keys, manuals and included items; record or take part in the video walkthrough in Vendibook; and sign the purchase agreement and bill of sale through Vendibook. Close and secure propane and fuel systems, remove food, grease and hazardous materials, and give the buyer reasonable access for loading.'),
    s('s-8', '8. Title and liens',
      'You must pay off and release any lien before or at handoff and provide proof of release. Vendibook may delay the payout until clear title and lien releases are provided. If you cannot deliver clear title, Vendibook may cancel the sale and refund the buyer’s protected payment.'),
    s('s-9', '9. Taxes and tax reporting',
      'Where Vendibook is required to collect and remit sales tax as a marketplace facilitator, it does so on your sales, and you should not collect sales tax separately on those sales. You remain responsible for your income taxes and any other taxes on your sales. We may be required to collect your legal name, tax identification number and other information, verify it, and report your sales to tax authorities, including on Form 1099-K. We may hold payouts until required tax information is provided.'),
    s('s-10', '10. Risk of loss and insurance',
      'You remain responsible for loss of or damage to the equipment until the buyer or the buyer’s carrier takes custody. Keep the equipment insured for its fair value until then.'),
    s('s-11', '11. Cancellation and seller default',
      'If you cancel after approving a purchase, fail to make the equipment available on time, misrepresent the equipment, or cannot deliver clear title, Vendibook may cancel the sale, refund the buyer’s protected payment, remove your listings, suspend your selling privileges and recover from you any costs Vendibook incurred for the canceled sale, such as freight that was booked.'),
    s('s-12', '12. Use of your name and listings',
      'You allow Vendibook to display your name or business name, logo and listings, and to promote your listings on Vendibook, in search engines, partner marketplaces, advertising, email and BuyerMatch outreach to prospective buyers.'),
    s('s-13', '13. Indemnity',
      'In addition to the indemnity in the Site Usage Terms, you will defend, indemnify and hold harmless Vendibook from claims, losses and costs arising from a breach of your promises in section 3, any lien, tax or title defect in your equipment, hazardous materials or contamination associated with it, or your acts or omissions in a sale or handoff.'),
    s('s-14', '14. Ending these terms',
      'You may stop selling at any time by removing your listings, but you must complete any sale you have already approved. Vendibook may end your selling privileges under the Site Usage Terms. Provisions about fees owed, payouts, taxes, promises, indemnity and liability survive.'),
  ],
};

const RENTAL: TermsTab = {
  id: 'rental',
  label: 'Rental Terms',
  title: 'Rental Terms for Renters and Hosts',
  intro: [
    'These Rental Terms apply to bookings of food trucks, trailers, kitchens, vendor spaces and equipment for rent on Vendibook. They add to the Site Usage Terms. The rental agreement is between the renter and the host.',
  ],
  keyPoints: [
    'Rentals are paid by card through Square at checkout. Vendibook never asks renters to pay a host directly.',
    `Renters pay a ${RENTER_FEE} Vendibook service fee on the rental subtotal; hosts pay a ${HOST_FEE} host fee, or the reduced rate included in their Vendibook Pro plan.`,
    'Sales tax is added where required. A refundable security deposit may be charged as shown in the listing.',
    'The host’s cancellation policy and rental rules shown in the listing apply.',
    'Check the unit in and out through Vendibook, including photos or a walkthrough, and report damage within 48 hours after return.',
  ],
  sections: [
    s('r-1', '1. Booking',
      'A renter sends a booking request for specific dates or hours. A booking is confirmed when the host accepts it (or immediately for instant-book listings) and payment is completed. Renters must be phone-verified to book. Hosts must respond to booking requests promptly and may decline any request.'),
    s('r-2', '2. Payment, fees, taxes and deposits',
      `Payment is taken by card through Square at checkout, either on the host’s connected Square account or on Vendibook’s account, as shown at checkout. A booking is paid only when Square confirms the payment. The renter pays the rental price, the ${RENTER_FEE} Vendibook service fee, applicable sales tax and any security deposit. The host fee (${HOST_FEE}, or the reduced rate in the host’s Vendibook Pro plan) is deducted from the host’s proceeds. Campus Partner codes and other credits apply only as described when they are entered.`,
      'Security deposits are refunded after the rental under the listing’s terms, less amounts for documented damage, cleaning, late return, fuel or other charges the renter is responsible for under the rental agreement.'),
    s('r-3', '3. Cancellations',
      'The cancellation policy shown in the listing at the time of booking applies. Vendibook’s service fee may be non-refundable as described in the Payments, Fees, Refunds and Payouts Terms. If a host cancels a confirmed booking, the renter is refunded in full, and the host may be charged for costs Vendibook incurs and lose access to bookings.'),
    s('r-4', '4. Renter responsibilities',
      list(
        'Use the unit only for lawful food service and only as the host allows, with all required licenses, permits, health approvals, commissary agreements and insurance.',
        'Allow only qualified, licensed people to drive or operate the unit, and follow the host’s instructions for propane, generators, fire suppression and equipment.',
        'Return the unit on time, clean and in the same condition as received, normal wear excepted, with the agreed fuel and propane levels.',
        'Pay for damage, loss, theft, fines, tolls, tickets and towing during the rental, and report any accident or damage to the host and Vendibook immediately.',
        'Not sublet, move the unit outside the agreed area, or keep it past the end of the booking without the host’s agreement in Vendibook.',
      )),
    s('r-5', '5. Host responsibilities',
      list(
        'Provide a safe, clean, roadworthy unit that matches the listing, with working equipment and current inspections, registration and any required fire suppression service.',
        'Disclose rules, restrictions, mileage limits and required insurance in the listing before booking.',
        'Carry insurance appropriate for renting the unit to others.',
        'Hand over and receive the unit at the agreed times and record its condition in Vendibook at check-in and check-out.',
      )),
    s('r-6', '6. Condition records and damage claims',
      'Both parties should document condition at handoff and return through Vendibook with photos or a video walkthrough. Hosts must report damage or missing items within 48 hours after return, with evidence, through Vendibook. Vendibook may help resolve the claim and may apply the security deposit as the rental agreement allows. Claims above the deposit are between the renter and host and their insurers.'),
    s('r-7', '7. Late and unreturned units',
      'Late returns may be charged at the listing’s rate for each extra day or hour. A unit not returned within 24 hours after the booking ends, without the host’s agreement, may be reported to law enforcement, and the renter is responsible for recovery costs.'),
    s('r-8', '8. Vendibook’s role',
      'Vendibook does not own, inspect, insure or operate rental units and is not a party to the rental agreement. The disclaimers, limits of liability and dispute terms in the Site Usage Terms apply to rentals.'),
  ],
};

const GUARANTEE: TermsTab = {
  id: 'guarantee',
  label: 'Vendibook Guarantee',
  title: 'Vendibook Guarantee: Payment Protection Policy',
  intro: [
    'The Vendibook Guarantee is our payment-protection policy for equipment purchases paid through a Vendibook invoice. It explains when a seller’s payout is released, how to report a problem before that happens, and what Vendibook can do. It is a platform policy. It is not insurance, a warranty on the equipment, a financial guarantee or an escrow arrangement.',
  ],
  keyPoints: [
    'The seller’s payout is released only after the buyer confirms the handoff, both parties sign the purchase agreement and the walkthrough video is saved.',
    'Inspect the equipment before you confirm the handoff. If something is wrong, report it in Vendibook instead of confirming.',
    'Report a problem within 3 business days after pickup or delivery, and before you use, modify or resell the equipment.',
    'Vendibook decides how the protected payment is handled: release to the seller, a full or partial refund, or an agreed price adjustment.',
  ],
  sections: [
    s('g-1', '1. What is covered',
      'Purchases of equipment listed on Vendibook, agreed through a Vendibook purchase request or offer, and paid in full through a Vendibook invoice. Cash sales, payments made outside Vendibook, rentals and Vendibook’s own products are not covered by this policy.'),
    s('g-2', '2. How payment protection works',
      list(
        'You request to buy and the seller approves within 14 days.',
        'You pay the itemized Vendibook invoice by its due date. The sale moves to Sale Pending.',
        'You and the seller complete the handoff: you inspect the equipment, the walkthrough video is saved in Vendibook, and you both sign the purchase agreement and bill of sale.',
        'You confirm the handoff. Vendibook then releases the seller’s payout.',
      )),
    s('g-3', '3. Problems you can report',
      'Before you confirm the handoff, you can open a protection claim if:',
      list(
        'the seller does not make the equipment available within 5 business days after your payment is received, or stops responding;',
        'the equipment is materially different from the listing, the signed agreement or the walkthrough, for example a different unit, a different year or model, or major included items missing;',
        'the equipment has a material defect that the seller knew about and did not disclose;',
        'the seller cannot transfer clear title, or there is an undisclosed lien;',
        'the seller is not who they claimed to be.',
      )),
    s('g-4', '4. What is not covered',
      list(
        'Conditions disclosed in the listing, visible in its photos, or shown in the walkthrough video.',
        'Normal wear for the equipment’s age, cosmetic issues that do not affect operation, and consumables such as tires, batteries, filters, belts, hoses and fluids.',
        'Problems that could only be found by disassembly, diagnostic equipment, load testing or extended operation, unless the seller knew of them and did not disclose them.',
        'Damage or changes after you or your carrier take custody, including transport damage, which is a claim against the carrier.',
        'Changing your mind, or financing, permit or health department outcomes.',
        'Purchases where payment was made outside Vendibook.',
      )),
    s('g-5', '5. How to make a claim',
      'Open a claim from your order in Vendibook, or email ' + TERMS_SUPPORT_EMAIL + ', within 3 business days after pickup or delivery and before you confirm the handoff. Include photos or video and a description of the problem. While the claim is open:',
      list(
        'do not use the equipment commercially, rent it out, modify it, repair it, disassemble it or resell it;',
        'keep it available for review by the seller or a person Vendibook designates;',
        'respond to requests for information within 2 business days.',
      ),
      'You may move, load and briefly run the equipment to check its condition. Claims opened after you confirm the handoff, after you modify or resell the equipment, or more than 3 business days after pickup or delivery are not eligible.'),
    s('g-6', '6. Outcomes',
      'Vendibook reviews the listing, messages, walkthrough video, signed documents and evidence from both parties, and decides how the protected payment is handled. Possible outcomes are: release of the payout to the seller; a full refund to the buyer after the equipment is made available for return to the seller; or a partial refund or price adjustment that both parties accept. When a full refund is due because the equipment was not as described, the seller is responsible for the cost of taking it back. Refunds are paid to the original payment method.',
      'The amount Vendibook can refund is limited to the payment you made through Vendibook that has not yet been released to the seller. Vendibook’s decision settles how the protected payment is handled. It does not limit any legal claim you and the seller may have against each other.'),
    s('g-7', '7. After the payout is released',
      'Once the handoff is confirmed and the payout released, the sale is complete. Any later issue is between the buyer and seller under their signed agreement and the law, and Vendibook may help but is not required to.'),
  ],
};

const ABANDONMENT: TermsTab = {
  id: 'abandonment',
  label: 'Abandonment Policy',
  title: 'Abandonment Policy',
  intro: [
    'This policy explains what happens when a buyer does not pick up equipment they have paid for. It applies to equipment sold through Vendibook unless the signed purchase agreement sets different pickup terms.',
  ],
  sections: [
    s('a-1', '1. Pickup window',
      'The buyer must remove the equipment within 10 business days after the seller marks it ready for pickup in Vendibook.'),
    s('a-2', '2. Storage fees',
      'From the 11th business day, the seller may charge storage of up to $25 per day, up to a total of $1,500, unless the listing stated a lower amount. Storage must be requested through Vendibook and is paid by the buyer before pickup.'),
    s('a-3', '3. Abandoned equipment',
      'If the buyer has not removed the equipment within 60 days after it was marked ready, and has not arranged a new date with the seller in Vendibook, Vendibook may treat the equipment as abandoned. Vendibook will send the buyer written notice to the email on their account at least 10 days before doing so. After that notice period, the handoff may be treated as confirmed, the seller’s payout released, and the seller may move, store, sell or otherwise dispose of the equipment as permitted by law, after deducting storage, moving and sale costs from any proceeds owed to the buyer.'),
    s('a-4', '4. Rentals',
      'Rental units must be returned at the end of the booking. Unreturned rental units are covered by section 7 of the Rental Terms, not by this policy.'),
  ],
};

const PRIVACY: TermsTab = {
  id: 'privacy',
  label: 'Privacy Notice',
  title: 'Privacy Notice',
  intro: [
    'Our full Privacy Policy explains what personal information we collect, how we use and share it, how long we keep it, and the choices and rights you have. Key points:',
  ],
  keyPoints: [
    'We collect account, verification, listing, message, transaction, payment, tax, location and device information to run the marketplace, prevent fraud and comply with law.',
    'Card and bank details are handled by our payment providers (Square and PayPal); Vendibook does not store full card numbers.',
    'We share information with the other party to your transaction as needed to complete it, and with service providers such as payment, signature, financing, email, SMS and hosting providers.',
    'Messages and listings are reviewed automatically for safety. Walkthrough and handoff media are kept as transaction records.',
    `You can ask to access, correct or delete your information by emailing ${TERMS_PRIVACY_EMAIL}. California residents have additional rights described in our California Privacy Notice.`,
  ],
  sections: [],
};

export const MARKETPLACE_TERMS_TABS: TermsTab[] = [SITE_USAGE, BUYER, SELLER, RENTAL, GUARANTEE, ABANDONMENT, PRIVACY];
