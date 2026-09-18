/**
 * Vendibook SignNow template package.
 *
 * Each spec builds a professional multi-page PDF master template plus the
 * SignNow field definitions that go with it. Templates are content-versioned:
 * changing the text of a spec REQUIRES bumping its `version`, because an
 * already-provisioned template is never overwritten (see signnowTemplates.ts).
 *
 * INTERNAL LEGAL NOTE — NOT LEGAL ADVICE:
 * These templates were drafted as operational marketplace documents. They are
 * not attorney-approved and have not been reviewed by counsel. Qualified legal
 * counsel must review and approve every template in this file before Vendibook
 * relies on it as a production legal form, and before it is used in any
 * jurisdiction with specific consumer, vehicle-sale, rental, or e-sign rules.
 * Nothing here should be read as a claim of legal sufficiency.
 */

import { PdfDoc, toSignNowBox, type FieldBox } from './pdfDoc.ts';

export type TemplateKind =
  | 'purchase_sale_agreement'
  | 'rental_agreement'
  | 'sale_handoff_condition_acknowledgment'
  | 'rental_checkin_condition_report'
  | 'rental_checkout_condition_report'
  | 'transaction_amendment'
  | 'delivery_handoff_acknowledgment'
  // Legacy kinds, kept so historical rows and their templates keep resolving.
  | 'bill_of_sale';

export interface SignNowFieldDef {
  type: 'text' | 'signature';
  name: string;
  role: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  required: boolean;
  label: string;
}

/**
 * Conditional rendering axis. A rental document renders vehicle/trailer
 * clauses for mobile assets and on-site facility clauses for kitchens, lots
 * and vendor spaces. Each variant is its own content version, so a SignNow
 * template exists per (kind, variant) and nothing irrelevant is ever shown.
 */
export type AssetVariant = 'mobile' | 'space' | 'general';

export const VARIANT_KINDS: TemplateKind[] = [
  'rental_agreement',
  'rental_checkin_condition_report',
  'rental_checkout_condition_report',
];

export function supportsVariants(kind: TemplateKind): boolean {
  return VARIANT_KINDS.includes(kind);
}

/** Content version for a (kind, variant) pair. */
export function variantVersion(kind: TemplateKind, variant: AssetVariant = 'general'): string {
  const base = SPEC_VERSIONS[kind] ?? '1';
  if (!supportsVariants(kind) || variant === 'general') return base;
  return `${base}-${variant}`;
}

export interface TemplateSpec {
  kind: TemplateKind;
  version: string;
  documentName: string;
  roles: [string, string];
  build(variant?: AssetVariant): { pdf: Uint8Array; fields: SignNowFieldDef[] };
}

/** Collects field boxes while a document is being laid out. */
class FieldCollector {
  readonly fields: SignNowFieldDef[] = [];
  add(name: string, role: string, type: 'text' | 'signature', box: FieldBox, label: string, required = false) {
    const b = toSignNowBox(box);
    this.fields.push({ type, name, role, page: b.page, x: b.x, y: b.y, w: b.w, h: b.h, required, label });
  }
}

const PLATFORM_ROLE = [
  'Vendibook operates an online marketplace and transaction workflow. Vendibook is not the owner, seller, dealer, manufacturer, lender, insurer, appraiser, inspector, title agency, freight carrier, or legal advisor for this transaction unless a specific Vendibook service is separately and expressly documented.',
  'Vendibook does not guarantee the identity of any party, the accuracy of any listing, the condition or legal status of any asset, the performance of any party, the availability of financing, the outcome of any delivery, or the outcome of any dispute.',
  'Nothing in this agreement waives any right that cannot be waived under applicable law.',
];

const ESIGN = [
  'The parties consent to review and sign this document electronically. The parties intend an electronic signature to have the same effect as a handwritten signature to the extent permitted by applicable law.',
  'A completed copy is saved to each party\u2019s Vendibook account after all required signatures are collected.',
  'Government, title, registration, lien, or notarial forms that are separately required by law are not replaced by this document and must be completed separately where they apply.',
];

function signatureBlock(doc: PdfDoc, fc: FieldCollector, roleA: string, roleB: string) {
  doc.heading('Signatures');
  doc.paragraph(
    'By signing below, each party confirms they have reviewed this document, that the transaction details shown are the details they agreed to, and that they are signing on their own behalf or with authority to bind the entity named.',
  );
  doc.paragraph(
    'Each party consents to review and sign this document electronically, and intends an electronic signature to have the same effect as a handwritten signature to the extent permitted by applicable law.',
  );
  for (const role of [roleA, roleB]) {
    const key = role.toLowerCase().replace(/\s+/g, '_');
    doc.spacer(4);
    fc.add(`${key}_printed_name`, role, 'text', doc.fieldBox(`${role} printed name`, { column: 0 }), `${role} printed name`, true);
    fc.add(`${key}_entity_name`, role, 'text', doc.fieldBox(`${role} business or entity name (if signing for an entity)`, { column: 1 }), `${role} entity`, false);
    fc.add(`${key}_title`, role, 'text', doc.fieldBox(`${role} authorized representative title (optional)`, { column: 0 }), `${role} title`, false);
    fc.add(`${key}_signature`, role, 'signature', doc.fieldBox(`${role} signature`, { column: 1, height: 34 }), `${role} signature`, true);
    fc.add(`${key}_signed_date`, role, 'text', doc.fieldBox(`${role} date signed`, { width: 200 }), `${role} date`, true);
  }
}

function header(doc: PdfDoc, fc: FieldCollector, title: string, subtitle: string, role: string, rows: string[]) {
  doc.documentTitle(title, subtitle);
  doc.heading('Transaction summary');
  for (const label of rows) {
    const name = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    fc.add(name, role, 'text', doc.summaryField(label), label, false);
  }
}

/* ------------------------------------------------------------------ */
/* A. Purchase & Sale Agreement                                        */
/* ------------------------------------------------------------------ */

function ph(doc: PdfDoc, fc: FieldCollector, role: string, name: string, label: string) {
  fc.add(name, role, 'text', doc.summaryField(label), label, false);
}

/** Renders literal checkbox lines without a bullet marker. */
function checkboxes(doc: PdfDoc, items: string[]) {
  for (const item of items) doc.paragraph(item);
  doc.spacer(2);
}

/** Signature block for the executed contract documents (Buyer / Seller). */
function contractSignatureBlock(doc: PdfDoc, fc: FieldCollector, roleA: string, roleB: string) {
  for (const role of [roleA, roleB]) {
    const key = role.toLowerCase().replace(/\s+/g, '_');
    doc.heading(role.toUpperCase());
    fc.add(`${key}_printed_name`, role, 'text', doc.fieldBox('Printed name', { column: 0 }), `${role} printed name`, true);
    fc.add(`${key}_entity_name`, role, 'text', doc.fieldBox('Business/entity, if applicable', { column: 1 }), `${role} entity`, false);
    fc.add(`${key}_title`, role, 'text', doc.fieldBox('Authorized representative title, if applicable', { column: 0 }), `${role} title`, false);
    fc.add(`${key}_signature`, role, 'signature', doc.fieldBox('Signature', { column: 1, height: 34 }), `${role} signature`, true);
    fc.add(`${key}_signed_date`, role, 'text', doc.fieldBox('Date/time signed', { width: 220 }), `${role} date signed`, true);
  }
}

function buildPurchaseSaleAgreement(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Purchase & Sale Agreement', version: SPEC_VERSIONS.purchase_sale_agreement });
  const fc = new FieldCollector();
  const S = 'Seller';

  doc.documentTitle(
    'Vendibook Purchase & Sale Agreement',
    `Version ${SPEC_VERSIONS.purchase_sale_agreement}. Production-intended draft; requires qualified legal counsel review before final legal reliance.`,
  );

  doc.paragraph('This Vendibook Purchase & Sale Agreement ("Agreement") is entered into by the buyer identified in the Transaction Record ("Buyer") and the seller identified in the Transaction Record ("Seller") in connection with the sale of the food truck, food trailer, concession trailer, mobile food unit, equipment package, or other asset identified in the Transaction Record ("Asset").');
  doc.paragraph('This Agreement is generated through Vendibook LC ("Vendibook"), an online marketplace and transaction-workflow platform. Vendibook provides technology and marketplace services that may include listings, communications, electronic agreements, payment integrations, video walkthrough scheduling, transaction records, delivery-status tools, and other marketplace features. Unless Vendibook expressly agrees otherwise in a separate written agreement for a specific service, Vendibook is not the Buyer, Seller, manufacturer, dealer, broker, lender, insurer, appraiser, mechanic, inspector, title agency, motor carrier, legal representative, fiduciary, or guarantor of either party.');
  doc.paragraph('This Agreement supplements the Vendibook Terms of Service, Payments Terms, Privacy Policy, Marketplace Rules, the frozen transaction-specific order record, and any written amendment or handoff acknowledgment later signed by the parties. The transaction-specific terms shown in the frozen Transaction Record control over conflicting general marketplace language to the extent permitted by applicable law.');

  doc.heading('1. DEFINITIONS');
  doc.paragraph('For purposes of this Agreement:');
  doc.bullets([
    '"Asset" means the food truck, trailer, mobile unit, equipment, or other property identified in the Transaction Record.',
    '"Buyer" means the person or legal entity identified as the buyer in the Transaction Record.',
    '"Seller" means the person or legal entity identified as the seller in the Transaction Record.',
    '"Listing Snapshot" means the stored version of the listing information associated with this transaction, including the description, photos, equipment information, condition disclosures, price information, and other listing content preserved by Vendibook for the transaction.',
    '"Transaction Record" means the stored Vendibook record associated with this purchase, which may include the Listing Snapshot, accepted offer or agreed price, fees, taxes if any, fulfillment method, payment information, messages, agreements, amendments, delivery or pickup events, condition documentation, and transaction-status history.',
    '"Handoff" means the physical transfer of possession of the Asset from Seller to Buyer, whether through pickup, seller delivery, freight delivery, or another agreed method.',
    '"Written Transaction Term" means a transaction-specific term preserved in the Vendibook order record, signed agreement, signed amendment, or other written record expressly accepted by both parties.',
  ]);

  doc.heading('2. ASSET AND TRANSACTION IDENTIFICATION');
  doc.paragraph('The Asset and transaction are identified by the following transaction-specific information, prefilled from the frozen Transaction Record when available:');
  ph(doc, fc, S, 'transaction_reference', 'Transaction reference');
  ph(doc, fc, S, 'listing_title', 'Listing title');
  ph(doc, fc, S, 'asset_category', 'Asset category');
  ph(doc, fc, S, 'asset_year', 'Year');
  ph(doc, fc, S, 'asset_make', 'Make');
  ph(doc, fc, S, 'asset_model', 'Model');
  ph(doc, fc, S, 'asset_identifier', 'VIN / serial / identifying number, if captured');
  ph(doc, fc, S, 'asset_mileage', 'Mileage or odometer, if captured');
  ph(doc, fc, S, 'seller_name', 'Seller');
  ph(doc, fc, S, 'buyer_name', 'Buyer');
  ph(doc, fc, S, 'seller_business_name', 'Seller business/entity, if applicable');
  ph(doc, fc, S, 'buyer_business_name', 'Buyer business/entity, if applicable');
  ph(doc, fc, S, 'listing_city_state', 'Listing city/state');
  ph(doc, fc, S, 'fulfillment_method', 'Fulfillment method');
  ph(doc, fc, S, 'asset_price', 'Agreed asset price');
  ph(doc, fc, S, 'selected_addons', 'Selected add-ons, if any');
  ph(doc, fc, S, 'delivery_or_freight_amount', 'Delivery or freight charge included, if any');
  ph(doc, fc, S, 'tax_amount', 'Taxes collected through the transaction, if any');
  ph(doc, fc, S, 'other_charges', 'Other disclosed transaction charges, if any');
  ph(doc, fc, S, 'transaction_total', 'Total transaction amount');
  doc.paragraph('A field that is not applicable or was not captured is omitted or identified as "Not provided" rather than populated with estimated or invented information.');

  doc.heading('3. AGREEMENT TO BUY AND SELL');
  doc.paragraph('Subject to the terms of this Agreement, Seller agrees to sell and transfer the Asset to Buyer, and Buyer agrees to purchase the Asset from Seller, for the price and on the terms reflected in the Transaction Record.');
  doc.paragraph('The parties acknowledge that the transaction may involve separate legal or administrative steps outside Vendibook, including title reassignment, registration, lien-release documentation, governmental forms, permit transfers, tax filings, notarization, or other state or local requirements. This Agreement documents the commercial transaction between Buyer and Seller but does not replace any government-issued title certificate, registration document, lien release, notarized form, agency filing, or other document required by applicable law.');

  doc.heading('4. PURCHASE PRICE AND PAYMENT TERMS');
  doc.paragraph('The agreed purchase price and transaction total are the amounts shown in the frozen Transaction Record.');
  doc.paragraph('Where online payment is offered, payment may be processed through PayPal. Buyer authorizes the payment amount presented in final checkout and acknowledges that PayPal controls the payment credentials, eligible funding methods, authorization process, Pay Later eligibility, and other PayPal-specific payment terms.');
  doc.paragraph('Vendibook does not store Buyer\u2019s full payment-card number.');
  doc.paragraph('PayPal Purchase Protection applies only to eligible transactions. PayPal\u2019s current U.S. terms exclude vehicles. Buyer should review PayPal\u2019s current terms before purchasing a food truck, motor vehicle, or trailer that may fall within PayPal\u2019s vehicle exclusions.');
  doc.paragraph('If Buyer uses third-party financing, financing is provided by the third-party financing provider under that provider\u2019s own underwriting, approval, rates, fees, repayment terms, security-interest requirements, and other conditions. Vendibook is not a lender and does not determine financing approval, interest rates, repayment terms, or lender requirements. Financing approval does not constitute a mechanical inspection, title verification, valuation, appraisal, or endorsement of the Asset.');
  ph(doc, fc, S, 'payment_and_financing_notes', 'Payment and financing details recorded for this transaction');

  doc.heading('5. SELLER REPRESENTATIONS');
  doc.paragraph('Seller represents to Buyer, to the best of Seller\u2019s knowledge and subject to applicable law, that:');
  doc.bullets([
    '(a) Seller has the legal authority to offer the Asset for sale and enter into this Agreement;',
    '(b) Seller has not knowingly provided materially false or intentionally misleading information in the Listing Snapshot or transaction communications;',
    '(c) Seller has disclosed known material defects, damage, operational limitations, or other material condition issues that Seller knows would be important to a reasonable buyer\u2019s decision, to the extent such disclosure is required by law or promised in the Listing Snapshot;',
    '(d) Seller has disclosed any known material lien, security interest, ownership dispute, or other encumbrance that Seller knows would prevent or materially interfere with lawful transfer of the Asset;',
    '(e) Seller is not knowingly selling stolen, counterfeit, unlawfully possessed, or prohibited property;',
    '(f) Seller will provide the ownership, transfer, keys, manuals, lien-release, bill-of-sale, title, registration, or other documents that Seller expressly agreed to provide in the Transaction Record or that Seller is legally required to provide; and',
    '(g) any express written warranty offered by Seller is limited to the exact warranty language preserved in the Transaction Record or a signed amendment.',
  ]);
  doc.paragraph('Vendibook does not independently verify Seller\u2019s ownership, authority, representations, lien status, title status, condition disclosures, or warranty statements merely because the Asset is listed on Vendibook or because Seller has a profile, payment connection, badge, or other marketplace status.');
  fc.add('seller_disclosures', S, 'text', doc.blockField('Seller disclosures recorded for this transaction', 64), 'Seller disclosures', false);

  doc.heading('6. BUYER DUE DILIGENCE');
  doc.paragraph('Buyer acknowledges that purchasing a food truck, trailer, mobile kitchen, concession unit, or related equipment may involve substantial financial, mechanical, title, regulatory, and operational considerations.');
  doc.paragraph('Before completing the Handoff, Buyer should use reasonable diligence appropriate to the Asset and the purchase price. Depending on the Asset, that diligence may include:');
  doc.bullets([
    '(a) reviewing the Listing Snapshot and transaction-specific disclosures;',
    '(b) asking Seller material questions through Vendibook Messages;',
    '(c) requesting photographs, service records, ownership documents, title information, VIN or serial-number information, or other relevant documentation;',
    '(d) scheduling an optional live video walkthrough where available;',
    '(e) asking Seller to demonstrate equipment or systems when practical and safe;',
    '(f) arranging an independent inspection by a qualified mechanic, mobile-food-equipment professional, trailer inspector, electrician, plumber, fire-suppression professional, or other qualified professional where appropriate;',
    '(g) independently reviewing title, VIN, serial number, lien-release, ownership, or registration information where applicable;',
    '(h) investigating local health, fire, zoning, commissary, business-license, vehicle-registration, food-safety, or other regulatory requirements applicable to Buyer\u2019s intended use; and',
    '(i) obtaining legal, tax, title, mechanical, or regulatory advice where appropriate.',
  ]);
  doc.paragraph('Buyer understands that a Vendibook video walkthrough, listing review, seller profile, payment connection, identity-related signal, marketplace badge, transaction record, or other Vendibook feature is not a substitute for Buyer\u2019s own due diligence and does not constitute a professional inspection, mechanical certification, appraisal, title opinion, legal opinion, or guarantee.');

  doc.heading('7. CONDITION OF ASSET; WARRANTIES');
  doc.paragraph('The parties agree that the condition of the Asset is reflected by the Listing Snapshot, written Seller disclosures, transaction communications, any independent inspection obtained by Buyer, and any handoff or condition record created for the transaction.');
  doc.paragraph('If Seller has expressly stated in the Transaction Record that the Asset is sold "as is," that term applies only to the extent permitted by law and only as reflected in the frozen transaction documents.');
  doc.paragraph('If Seller has expressly provided a written warranty, the warranty applies only according to its written terms.');
  doc.paragraph('Vendibook does not provide a warranty regarding the Asset and does not guarantee that the Asset is merchantable, fit for a particular purpose, mechanically sound, code-compliant, roadworthy, towable, financeable, insurable, licensable, or suitable for Buyer\u2019s intended business.');
  doc.paragraph('Nothing in this Agreement is intended to waive a right or remedy that applicable law does not permit the parties to waive.');
  fc.add('condition_clause', S, 'text', doc.blockField('Condition and warranty terms recorded for this transaction', 70), 'Condition clause', false);

  doc.heading('8. TITLE, OWNERSHIP, LIENS, AND TRANSFER DOCUMENTS');
  doc.paragraph('Where the Asset is a titled vehicle, trailer, or other titled property, Seller remains responsible for providing the title or transfer documentation Seller is legally required or has agreed to provide.');
  doc.paragraph('Buyer remains responsible for completing registration, title-transfer, tax, inspection, licensing, or agency filing requirements assigned to Buyer by applicable law.');
  doc.paragraph('If a lien or security interest exists, the parties must follow the applicable payoff, release, or transfer process required by the lienholder and applicable law.');
  doc.paragraph('Vendibook is not a title company, lien-search provider, DMV, registration agency, legal advisor, or governmental authority. Vendibook does not guarantee that title is valid, marketable, free of liens, or transferable.');
  doc.paragraph('A signed Vendibook Purchase & Sale Agreement or Handoff Acknowledgment does not by itself constitute a state-issued certificate of title, lien release, registration, notarized title assignment, or governmental transfer filing.');
  ph(doc, fc, S, 'title_status', 'Recorded title or ownership status, if captured');

  doc.heading('9. INCLUDED EQUIPMENT AND EXCLUDED PROPERTY');
  doc.paragraph('The Asset includes only the equipment, fixtures, accessories, documents, keys, parts, and other property identified as included in the Listing Snapshot, Transaction Record, or a signed amendment.');
  fc.add('included_equipment', S, 'text', doc.blockField('Included equipment, if captured', 64), 'Included equipment', false);
  fc.add('excluded_property', S, 'text', doc.blockField('Excluded property, if captured', 48), 'Excluded property', false);
  doc.paragraph('If the parties agree after checkout to add or remove material equipment or other property, the change should be documented in a signed Transaction Amendment rather than relying solely on an informal verbal understanding.');

  doc.heading('10. FULFILLMENT AND HANDOFF');
  doc.paragraph('The selected fulfillment method for this transaction is recorded in the transaction summary above and detailed below.');
  fc.add('fulfillment_details', S, 'text', doc.blockField('Fulfillment details recorded for this transaction', 70), 'Fulfillment details', false);
  doc.heading('10.1 Pickup');
  doc.paragraph('If the transaction uses pickup, Buyer and Seller will coordinate the pickup date, time, and exact Handoff location through Vendibook or another written transaction record. Buyer should inspect the Asset at or before Handoff when reasonably possible.');
  doc.heading('10.2 Seller Delivery');
  doc.paragraph('If Seller or an assigned delivery person delivers the Asset, Buyer must provide an accurate delivery address and reasonable access instructions.');
  doc.paragraph('If Vendibook live location tracking is available for the transaction, the Buyer may see location updates only after the authorized seller or delivery person starts Delivery Mode and grants the required device location permission. GPS information is informational and does not by itself prove legal delivery, legal acceptance, title transfer, condition, or authorization for money movement.');
  doc.heading('10.3 Freight');
  doc.paragraph('If freight is used, freight terms depend on the actual transaction record, carrier arrangement, and any separate carrier or freight-provider agreement.');
  doc.paragraph('Vendibook does not become the motor carrier merely because freight options, freight coordination, quotes, records, or tracking information appear in the platform, unless Vendibook expressly agrees otherwise in a separate written contract.');
  doc.paragraph('Carrier pickup, transport, tracking, liability, claims, delivery windows, and other freight terms may be governed by the carrier\u2019s own terms.');
  doc.paragraph('The transaction record indicates whether a freight amount is included in this purchase or is separately payable. No freight cost, carrier, delivery date, route, or ETA should be assumed unless actually recorded.');

  doc.heading('11. INSPECTION AT HANDOFF');
  doc.paragraph('Buyer should inspect the Asset at Handoff to the extent reasonably practical.');
  doc.paragraph('Buyer should compare the Asset to the Listing Snapshot and agreed included equipment, and should review any documents, keys, identifying numbers, or other transaction items that are part of the Handoff.');
  doc.paragraph('If Buyer discovers a material discrepancy, damage, missing item, or other issue, Buyer should document the issue promptly with photographs, video where appropriate, and written messages in the transaction record before marking the Handoff complete.');
  doc.paragraph('A Handoff acknowledgment or in-app delivery status is evidence of transaction events but does not automatically waive a party\u2019s non-waivable rights or independently determine the legal outcome of a later dispute.');

  doc.heading('12. RISK OF LOSS AND LEGAL TITLE');
  doc.paragraph('The time at which risk of loss or legal title transfers may depend on applicable law, the type of Asset, delivery method, title documentation, carrier terms, and written transaction terms.');
  doc.paragraph('This Agreement does not attempt to override a mandatory legal rule governing risk of loss, certificate-of-title transfer, secured liens, or registration.');
  doc.paragraph('The parties should obtain legal advice if they require certainty regarding the precise legal moment of title or risk-of-loss transfer.');

  doc.heading('13. CANCELLATION, REFUNDS, PAYMENT DISPUTES, AND CHARGEBACKS');
  doc.paragraph('Cancellation and refund rights depend on the transaction status, the frozen transaction-specific cancellation terms, the Vendibook Payments Terms, the payment provider\u2019s rules, signed amendments if any, and applicable law.');
  doc.paragraph('A request to cancel does not automatically entitle either party to a refund.');
  doc.paragraph('A refund, if authorized, must be processed through the applicable authorized payment workflow.');
  doc.paragraph('PayPal claims, disputes, funding-source disputes, and chargebacks are governed by PayPal and, where applicable, the buyer\u2019s bank or card issuer.');
  doc.paragraph('The existence of a Vendibook support case does not extend an external payment-provider deadline unless the payment provider itself provides otherwise.');
  doc.paragraph('The parties should not attempt to pursue duplicative remedies where the applicable payment-provider rules prohibit doing so.');
  fc.add('cancellation_terms', S, 'text', doc.blockField('Cancellation terms frozen with this transaction', 56), 'Cancellation terms', false);

  doc.heading('14. TAXES, REGISTRATION, LICENSES, AND REGULATORY COMPLIANCE');
  doc.paragraph('Buyer and Seller are responsible for taxes, registration, title fees, permit requirements, inspections, licenses, health requirements, fire requirements, zoning obligations, food-safety rules, commissary requirements, and other legal or regulatory obligations allocated to them by applicable law or expressly allocated in the Transaction Record.');
  doc.paragraph('Vendibook may provide general marketplace information but does not provide legal, tax, title, permitting, or regulatory advice.');

  doc.heading('15. ELECTRONIC RECORDS AND ELECTRONIC SIGNATURES');
  doc.paragraph('Buyer and Seller consent to use electronic records and electronic signatures for this transaction.');
  doc.paragraph('The parties intend an electronic signature executed through Vendibook\u2019s SignNow integration to have the same legal effect as a handwritten signature to the extent permitted by applicable law.');
  doc.paragraph('Each party may access or request a copy of the completed signed document.');
  doc.paragraph('The parties understand that additional paper or electronic documents may still be required by a government agency, lienholder, title office, lender, insurer, carrier, or other third party.');

  doc.heading('16. COMMUNICATIONS AND TRANSACTION RECORDS');
  doc.paragraph('The parties should keep material transaction communications, agreed changes, disclosures, pickup or delivery details, and material condition issues in Vendibook Messages or another written record linked to the transaction.');
  doc.paragraph('Vendibook may retain transaction records, agreement versions, acceptance records, payment metadata, communication records, support records, fulfillment events, and signed documents as reasonably necessary to operate the marketplace, maintain accounting and legal records, address fraud and security, resolve disputes, and comply with applicable obligations, consistent with the Vendibook Privacy Policy.');

  doc.heading('17. PRIVACY AND DEVICE PERMISSIONS');
  doc.paragraph('The Vendibook Privacy Policy and Checkout Privacy & Electronic Consent describe how transaction data is handled.');
  doc.paragraph('Camera and microphone access may be requested when a user chooses to participate in a video walkthrough.');
  doc.paragraph('A video walkthrough is not recorded by default. If Vendibook later offers call recording, separate disclosure and consent must be obtained before recording begins.');
  doc.paragraph('Device location may be requested for features that genuinely require location, such as active delivery tracking. Location sharing does not begin merely because a user enters checkout.');
  doc.paragraph('Marketing email or promotional SMS consent is separate from this Agreement.');

  doc.heading('18. PLATFORM ROLE AND LIMITATIONS');
  doc.paragraph('Vendibook provides marketplace and transaction-workflow technology.');
  doc.paragraph('Vendibook is not the owner, seller, dealer, manufacturer, lender, insurer, appraiser, inspector, title agency, freight carrier, or legal advisor for this transaction unless a specific Vendibook service is separately and expressly documented.');
  doc.paragraph('Vendibook does not independently guarantee or warrant:');
  doc.bullets([
    '(a) the identity, honesty, financial condition, authority, or performance of Buyer or Seller;',
    '(b) the accuracy or completeness of a listing;',
    '(c) ownership or title;',
    '(d) absence of liens;',
    '(e) mechanical, structural, electrical, plumbing, fire-safety, food-safety, or regulatory condition;',
    '(f) the Asset\u2019s value;',
    '(g) suitability for Buyer\u2019s intended use;',
    '(h) financing approval;',
    '(i) insurance eligibility;',
    '(j) delivery or freight performance; or',
    '(k) the outcome of a dispute.',
  ]);
  doc.paragraph('The general limitations of liability, indemnity provisions, and other platform provisions in the Vendibook Terms of Service remain applicable to the extent enforceable.');
  doc.paragraph('Nothing in this Agreement limits a legal right that applicable law does not permit to be limited.');

  doc.heading('19. AMENDMENTS');
  doc.paragraph('A material change to the agreed purchase price, included Asset, included equipment, Seller warranty, fulfillment obligation, or another material transaction term after this Agreement is signed should be documented in a separate written Transaction Amendment signed by both Buyer and Seller.');
  doc.paragraph('A later Transaction Amendment changes only the terms expressly identified in the amendment. All other terms of this Agreement remain in effect unless the amendment expressly states otherwise.');

  doc.heading('20. ENTIRE TRANSACTION RECORD');
  doc.paragraph('This Agreement, together with the frozen Transaction Record, incorporated Vendibook terms, written Seller warranty if any, and any later signed Transaction Amendment or Handoff Acknowledgment, represents the written marketplace transaction record between Buyer and Seller concerning the subject matter reflected in those records.');
  doc.paragraph('This clause does not prevent a party from relying on a legal right or obligation that cannot lawfully be excluded.');

  doc.heading('21. SUPPORT');
  doc.paragraph('Vendibook support may be contacted at support@vendibook.com.');
  doc.paragraph('Support can assist with platform records and marketplace workflows but cannot provide legal advice, mechanical inspection services, title opinions, or tax advice.');

  doc.heading('22. ACKNOWLEDGMENT AND SIGNATURES');
  doc.paragraph('By signing below, Buyer and Seller acknowledge that they have had the opportunity to review this Agreement and the transaction-specific information incorporated into it.');
  contractSignatureBlock(doc, fc, 'Buyer', 'Seller');
  doc.paragraph('END OF VENDIBOOK PURCHASE & SALE AGREEMENT');

  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */
/* B. Rental Agreement                                                 */
/* ------------------------------------------------------------------ */

function buildRentalAgreement(variant: AssetVariant = 'general'): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const version = variantVersion('rental_agreement', variant);
  const doc = new PdfDoc({ title: 'Rental Agreement', version });
  const fc = new FieldCollector();
  const R = 'Renter';
  const H = 'Host';
  const mobile = variant !== 'space';
  const space = variant !== 'mobile';

  doc.documentTitle(
    'Vendibook Rental Agreement',
    `Version ${version}. Production-intended draft; requires qualified legal counsel review before final legal reliance.`,
  );

  doc.paragraph('This Vendibook Rental Agreement ("Agreement") is entered into by the host identified in the Booking Record ("Host") and the renter identified in the Booking Record ("Renter") in connection with the temporary rental, use, access, or occupancy of the food truck, food trailer, concession trailer, mobile food unit, commercial kitchen, shared kitchen, vendor space, lot, equipment, or other rental asset identified in the Booking Record ("Rental Asset").');
  doc.paragraph('This Agreement is generated through Vendibook LC ("Vendibook"), an online marketplace and transaction-workflow platform. Vendibook provides technology and marketplace services that may include listings, bookings, messaging, electronic agreements, payment integrations, video walkthrough scheduling, document collection, condition records, delivery-status tools, and support workflows.');
  doc.paragraph('Unless Vendibook expressly agrees otherwise in a separate written agreement for a specific service, Vendibook is not the Host, Renter, owner, landlord, property manager, employer, insurer, lender, mechanic, inspector, carrier, permit authority, health department, fire authority, or guarantor of either party.');
  doc.paragraph('This Agreement supplements the Vendibook Terms of Service, Payments Terms, Privacy Policy, Marketplace Rules, any applicable Renter or Host Terms, the frozen Booking Record, the listing-specific cancellation policy, any signed condition report, and any signed Transaction Amendment.');

  doc.heading('1. DEFINITIONS');
  doc.paragraph('"Booking Record" means the frozen Vendibook record associated with this rental, which may include the Listing Snapshot, rental dates and times, pricing, fees, deposit if any, fulfillment or access method, host rules, required documents, insurance requirements, payment information, messages, signed agreements, condition records, and booking-status history.');
  doc.paragraph('"Check-in" means the time at which Renter receives possession of, access to, or authorized use of the Rental Asset.');
  doc.paragraph('"Check-out" means the time at which Renter returns possession of the Rental Asset, returns keys or access devices, vacates an on-site space, or otherwise completes the agreed rental use.');
  doc.paragraph('"Host" means the person or entity identified as the host in the Booking Record.');
  doc.paragraph('"Listing Snapshot" means the stored version of the listing associated with this Booking Record.');
  doc.paragraph('"Rental Asset" means the vehicle, trailer, mobile unit, kitchen, vendor space, equipment, or other property identified in the Booking Record.');
  doc.paragraph('"Rental Period" means the booking dates and times stated in the Booking Record.');
  doc.paragraph('"Renter" means the person or entity identified as the renter in the Booking Record.');
  doc.paragraph('"Written Booking Term" means a term preserved in the Booking Record, signed Agreement, signed Transaction Amendment, or other written record expressly accepted by both parties.');

  doc.heading('2. BOOKING SUMMARY');
  doc.paragraph('The transaction-specific information below must be prefilled from the frozen Booking Record:');
  ph(doc, fc, H, 'booking_reference', 'Booking reference');
  ph(doc, fc, H, 'listing_title', 'Listing title');
  ph(doc, fc, H, 'asset_category', 'Rental Asset category');
  ph(doc, fc, H, 'host_name', 'Host');
  ph(doc, fc, H, 'renter_name', 'Renter');
  ph(doc, fc, H, 'host_business_name', 'Host business/entity, if applicable');
  ph(doc, fc, H, 'renter_business_name', 'Renter business/entity, if applicable');
  ph(doc, fc, H, 'rental_start', 'Rental start date/time');
  ph(doc, fc, H, 'rental_end', 'Rental end date/time');
  ph(doc, fc, H, 'rental_duration', 'Rental duration');
  ph(doc, fc, H, 'base_rental_amount', 'Base rental amount');
  ph(doc, fc, H, 'service_fee', 'Service fee, if applicable');
  ph(doc, fc, H, 'delivery_fee', 'Delivery fee, if applicable');
  ph(doc, fc, H, 'security_deposit', 'Security deposit, only if actually applicable');
  ph(doc, fc, H, 'tax_amount', 'Taxes collected through the booking, if any');
  ph(doc, fc, H, 'other_charges', 'Other disclosed charges, if any');
  ph(doc, fc, H, 'booking_total', 'Total booking amount');
  ph(doc, fc, H, 'fulfillment_method', 'Fulfillment/access method');
  ph(doc, fc, H, 'listing_city_state', 'Listing city/state');
  doc.paragraph('A field that is not applicable or was not captured must be omitted or identified as "Not provided" rather than populated with an estimate or invented term.');

  doc.heading('3. GRANT OF TEMPORARY USE');
  doc.paragraph('Subject to this Agreement and the Booking Record, Host grants Renter the temporary right to possess, access, or use the Rental Asset during the Rental Period.');
  doc.paragraph('Renter receives no ownership interest in the Rental Asset.');
  doc.paragraph('Renter may not sell, pledge, encumber, sublease, assign, transfer, lend, or otherwise provide possession or access to another person except to an authorized user or operator permitted by the Booking Record and applicable law.');

  doc.heading('4. HOST REPRESENTATIONS AND RESPONSIBILITIES');
  doc.paragraph("Host represents, to the best of Host's knowledge and subject to applicable law, that:");
  doc.bullets([
    '(a) Host has authority to offer the Rental Asset for the booked use;',
    '(b) the Listing Snapshot is not knowingly materially false or intentionally misleading;',
    '(c) known material operational limitations, access limitations, or condition issues that would materially affect the booked use have been disclosed to the extent required by law or promised in the listing;',
    '(d) Host will make the Rental Asset available according to the accepted Booking Record, subject to circumstances allowed by the applicable cancellation policy or law;',
    '(e) Host will provide keys, access instructions, equipment, utilities, documents, or other items expressly promised in the Booking Record; and',
    '(f) Host will not knowingly require Renter to use the Rental Asset in an unlawful manner.',
  ]);
  doc.paragraph("Vendibook does not independently verify Host's authority, ownership, listing accuracy, equipment condition, insurance, permits, access rights, or legal compliance merely because the listing appears on Vendibook.");

  doc.heading('5. RENTER ELIGIBILITY AND ACCURATE INFORMATION');
  doc.paragraph('Renter represents that Renter has legal capacity to enter into this Agreement and has provided materially accurate account, identity, contact, business, intended-use, insurance, and compliance information requested for the booking.');
  doc.paragraph('If the Rental Asset may be driven, towed, operated, or used only by legally qualified persons, Renter must ensure that only persons who meet applicable legal requirements and any written Host requirements operate or control the Rental Asset.');
  doc.paragraph('Renter may not permit an unauthorized person to use, tow, drive, occupy, or access the Rental Asset in violation of the Booking Record, this Agreement, or applicable law.');

  doc.heading('6. PERMITTED USE');
  doc.paragraph('Renter may use the Rental Asset only for the lawful purpose reasonably contemplated by the Listing Snapshot and Booking Record.');
  doc.paragraph('Renter must follow any written, lawful, transaction-specific Host rules preserved in the Booking Record.');
  doc.paragraph('Renter may not:');
  doc.bullets([
    '(a) use the Rental Asset for unlawful activity;',
    '(b) intentionally or recklessly damage the Rental Asset;',
    "(c) make a material alteration without Host's written permission;",
    '(d) remove material equipment or fixtures not intended to be removed;',
    '(e) sublease or transfer the booking without authorization;',
    '(f) operate or tow a vehicle or trailer while impaired or in a manner prohibited by law;',
    '(g) exceed an expressly stated occupancy, towing, load, access, location, mileage, hour, or use restriction preserved in the Booking Record; or',
    "(h) use the Rental Asset in a way that materially violates a permit, health, fire, building, zoning, parking, food-safety, or other legal requirement applicable to Renter's activity.",
  ]);
  doc.paragraph('No unstated restriction should be inserted into the final agreement.');

  doc.heading('7. LICENSES, PERMITS, HEALTH, FIRE, ZONING, AND REGULATORY COMPLIANCE');
  doc.paragraph('Renter is responsible for obtaining and maintaining licenses, permits, approvals, certifications, food-safety credentials, fire approvals, event permissions, commissary agreements, parking permissions, sales-tax registrations, business licenses, or other approvals assigned to Renter by applicable law or expressly assigned to Renter in the Booking Record.');
  doc.paragraph('Host is responsible for obligations assigned to Host by applicable law or expressly assumed by Host in the Booking Record.');
  doc.paragraph("A Vendibook listing does not represent that a particular jurisdiction will approve Renter's intended use.");
  doc.paragraph('Vendibook does not provide legal, tax, licensing, zoning, fire, health, permitting, or regulatory advice.');

  doc.heading('8. REQUIRED DOCUMENTS');
  doc.paragraph('If the Listing Snapshot or Booking Record requires Renter to provide documents, the required documents are:');
  fc.add('required_documents', H, 'text', doc.blockField('Required documents from the frozen booking record', 70), 'Required documents', false);
  doc.paragraph('Renter agrees to provide required documents by the applicable deadline shown in the Booking Record.');
  doc.paragraph('Host or Vendibook may review submitted documents for the marketplace workflow, but document submission or review is not a guarantee that a document is valid, sufficient, current, or legally adequate.');
  doc.paragraph('If no document requirement applies, this section states "No additional booking documents were required by the listing at the time of booking."');

  doc.heading('9. INSURANCE');
  fc.add('insurance_requirement', H, 'text', doc.blockField('Applicable insurance requirement from the frozen booking/listing', 56), 'Insurance requirement', false);
  fc.add('insurance_status', R, 'text', doc.summaryField('Renter insurance response/status, if captured'), 'Insurance status', false);
  doc.paragraph('Insurance is not included merely because the transaction occurs on Vendibook.');
  doc.paragraph('If the booking requires insurance, Renter must maintain the required coverage for the period and use stated in the Booking Record.');
  doc.paragraph("Host remains responsible for insurance obligations assigned to Host by law or the Host's own agreements.");
  doc.paragraph('Any certificate of insurance, declaration, policy information, attestation, or upload is evidence provided by the user and is not a guarantee by Vendibook that coverage is valid, adequate, collectible, or applicable to a particular claim.');

  doc.heading('10. PAYMENT');
  doc.paragraph("Where online payment is available, PayPal may process the booking payment under PayPal's applicable terms and privacy practices.");
  doc.paragraph('Renter authorizes the amount shown in the final Booking Record.');
  doc.paragraph("Vendibook does not store Renter's full card number.");
  doc.paragraph('Any PayPal funding method, card eligibility, Pay Later option, authorization, or payment-provider dispute is governed by PayPal and any applicable funding-source provider.');
  doc.paragraph('Vendibook is not an escrow company and does not provide a blanket payment-protection guarantee.');
  doc.paragraph('If a booking remains subject to Host acceptance after payment or authorization, the booking status displayed in Vendibook controls whether the booking is pending or confirmed.');

  doc.heading('11. SECURITY DEPOSIT, IF APPLICABLE');
  doc.paragraph('A security deposit applies only if the frozen Booking Record expressly shows one.');
  ph(doc, fc, H, 'security_deposit_amount', 'Security deposit amount, if applicable');
  doc.paragraph('If no security deposit is shown in the Booking Record, no security deposit term is inserted.');
  doc.paragraph('Any deduction, charge, dispute, refund, or release involving a deposit must follow the Booking Record, applicable Vendibook terms, evidence, payment-provider rules, and applicable law.');
  doc.paragraph('This Agreement does not authorize an automatic damage charge merely because damage is alleged.');

  doc.heading('12. CONDITION AT CHECK-IN');
  doc.paragraph('Renter should inspect the Rental Asset at Check-in to the extent reasonably practical.');
  doc.paragraph('The parties should document pre-existing damage, wear, missing items, equipment condition, keys/access devices, mileage/hours/fuel if applicable, and other material conditions in the Rental Check-in Condition Report.');
  doc.paragraph('Renter should promptly document any material discrepancy between the Rental Asset and the Booking Record.');
  doc.paragraph('A Check-in Condition Report is a transaction record and not a professional mechanical, safety, fire, electrical, plumbing, code, or regulatory inspection.');

  doc.heading('13. CARE OF RENTAL ASSET');
  doc.paragraph('During the Rental Period, Renter must exercise reasonable care over the Rental Asset and use it in a manner consistent with the Booking Record, ordinary intended use, manufacturer instructions known to Renter, and applicable law.');
  doc.paragraph('Renter must take reasonable steps to prevent avoidable damage, theft, loss, misuse, unauthorized access, and unsafe operation.');
  doc.paragraph('Renter must promptly notify Host through Vendibook or another documented channel of a material malfunction, accident, theft, fire, injury, major equipment failure, significant leak, electrical issue, safety event, or other incident affecting the Rental Asset.');
  doc.paragraph('Renter should stop using equipment when continued use would be unsafe or would reasonably be expected to cause additional material damage.');

  doc.heading('14. DAMAGE, LOSS, AND RESPONSIBILITY');
  doc.paragraph('Responsibility for damage, loss, theft, cleaning, missing property, unauthorized use, excess mileage, excess hours, fuel, late return, or other charges depends on:');
  doc.bullets([
    '(a) the frozen Booking Record;',
    '(b) any written Host rules incorporated into the booking;',
    '(c) the Check-in and Check-out Condition Reports;',
    '(d) photographs, messages, incident records, and other evidence;',
    '(e) applicable payment-provider rules;',
    '(f) applicable insurance; and',
    '(g) applicable law.',
  ]);
  doc.paragraph('Vendibook does not determine liability solely from a Host allegation, a Renter denial, a GPS location, an automated status, or a single photograph.');
  doc.paragraph('No fixed damage amount, cleaning charge, late fee, mileage fee, fuel charge, or other penalty may be inserted into this Agreement unless the amount or calculation method was actually disclosed in the frozen Booking Record or a signed amendment.');

  if (mobile) {
    doc.heading('15. VEHICLE AND TRAILER TERMS');
    doc.paragraph('This section applies only when the Rental Asset is a motor vehicle, trailer, towable mobile unit, or other mobile equipment.');
    doc.paragraph('Renter must ensure that any driver or towing operator has the license, qualifications, tow vehicle, hitch, brake controller, insurance, and other legal capability required for the actual Asset and route.');
    doc.paragraph('Renter must not knowingly permit operation while impaired.');
    doc.paragraph('Any mileage limit applies only if the frozen Booking Record contains a mileage limit.');
    ph(doc, fc, H, 'mileage_limit', 'Mileage limit, if applicable');
    doc.paragraph('Any included operating hours or hour-meter terms apply only if actually stated.');
    ph(doc, fc, H, 'included_hours', 'Included hours, if applicable');
    doc.paragraph('Fuel, charging, generator-fuel, propane, or return-level requirements apply only if expressly stated.');
    ph(doc, fc, H, 'fuel_requirement', 'Fuel/charge requirement, if applicable');
    doc.paragraph('Renter must report any collision, towing incident, roadside failure, impound, theft, or material mechanical issue promptly.');
    doc.paragraph('Nothing in Vendibook constitutes a professional determination that a tow vehicle, hitch, trailer, truck, or route is mechanically or legally suitable.');
  }

  if (space) {
    doc.heading(mobile ? '16. COMMERCIAL KITCHEN / VENDOR SPACE TERMS' : '15. COMMERCIAL KITCHEN / VENDOR SPACE TERMS');
    doc.paragraph('This section applies only when the Rental Asset is a commercial kitchen, shared kitchen, commissary, vendor space, lot, or other on-site location.');
    ph(doc, fc, H, 'access_hours', 'Authorized access hours');
    fc.add('access_instructions', H, 'text', doc.blockField('Access instructions', 56), 'Access instructions', false);
    fc.add('included_space_equipment', H, 'text', doc.blockField('Included utilities/equipment', 56), 'Included utilities/equipment', false);
    doc.paragraph('Renter must comply with lawful facility rules preserved in the Booking Record.');
    doc.paragraph('Renter is responsible for food handling, sanitation, employee conduct, product storage, waste disposal, and other operational obligations assigned to Renter by law or the Booking Record.');
    doc.paragraph('A cleaning obligation or cleaning charge applies only if expressly disclosed.');
    doc.paragraph('Renter may not access areas outside the booked/authorized space without permission.');
  }

  const n = (base: number) => String(base - (mobile ? 0 : 1) - (space ? 0 : 1));

  doc.heading(`${n(17)}. PICKUP, HOST DELIVERY, OR ON-SITE ACCESS`);
  ph(doc, fc, H, 'fulfillment_method_detail', 'Fulfillment/access method');
  doc.heading('Pickup');
  doc.paragraph('If pickup applies, the parties will coordinate the pickup time and Handoff details. Renter should document condition at Check-in.');
  doc.heading('Host Delivery');
  doc.paragraph('If Host delivery applies, Renter must provide accurate delivery and access information.');
  doc.paragraph('Live location tracking may appear only after Host or an assigned delivery person starts Delivery Mode and grants location permission.');
  doc.paragraph('GPS information is informational and does not alone establish legal delivery, condition, acceptance, liability, or payment entitlement.');
  doc.heading('On-site Access');
  doc.paragraph('If the Rental Asset is a kitchen, vendor space, lot, or other on-site location, Host must provide the access information promised in the Booking Record. Renter must comply with lawful access hours and facility rules.');

  doc.heading(`${n(18)}. CANCELLATION, REFUNDS, AND NO-SHOWS`);
  doc.paragraph('The cancellation and refund policy preserved with the Booking Record controls, subject to applicable law and payment-provider rules.');
  fc.add('cancellation_policy', H, 'text', doc.blockField('Frozen cancellation policy', 70), 'Cancellation policy', false);
  doc.paragraph('Renter acknowledges that cancellation timing may affect refund eligibility.');
  doc.paragraph('Host acknowledges that Host cancellation may trigger remedies stated in the applicable Vendibook terms.');
  doc.paragraph('A request for cancellation does not itself guarantee a refund.');
  doc.paragraph('No-show, late-arrival, shortened-use, or early-return consequences apply only as provided by the Booking Record, applicable policy, or law.');

  doc.heading(`${n(19)}. RENTAL PERIOD, RETURN, AND CHECK-OUT`);
  doc.paragraph('Renter must return, surrender, or complete use of the Rental Asset by the agreed end date/time unless the parties execute an approved extension or amendment.');
  ph(doc, fc, H, 'return_datetime', 'Return date/time');
  fc.add('return_instructions', H, 'text', doc.blockField('Return location/instructions, if applicable', 56), 'Return instructions', false);
  doc.paragraph('At Check-out, the parties should document:');
  doc.bullets([
    '(a) condition;',
    '(b) returned keys/access devices;',
    '(c) included equipment;',
    '(d) mileage/hours/fuel only if applicable;',
    '(e) newly observed damage or missing items;',
    '(f) unresolved incidents or maintenance concerns; and',
    '(g) other material return conditions.',
  ]);
  doc.paragraph('The Check-out Condition Report does not itself authorize an automatic financial charge.');

  doc.heading(`${n(20)}. LATE RETURN OR OVERSTAY`);
  doc.paragraph('A late-return fee, overstay fee, extra-day rate, extra-hour rate, or other charge applies only if the amount or calculation method is expressly contained in the frozen Booking Record or a signed amendment and is permitted by applicable law.');
  doc.paragraph('If no such term exists, this Agreement does not invent one.');

  doc.heading(`${n(21)}. INCIDENTS AND EMERGENCIES`);
  doc.paragraph('Renter must promptly notify Host of a serious incident involving the Rental Asset.');
  doc.paragraph('If an emergency threatens health or safety, Renter should first contact the appropriate emergency service or authority as circumstances require.');
  doc.paragraph('A party should document relevant incident information in Vendibook after immediate safety concerns have been addressed.');
  doc.paragraph('Vendibook support is not an emergency service.');

  doc.heading(`${n(22)}. DISPUTES AND EVIDENCE`);
  doc.paragraph('If a material dispute arises, the parties should preserve relevant evidence.');
  doc.paragraph('Potential evidence may include:');
  doc.bullets([
    'the frozen Booking Record;',
    'Listing Snapshot;',
    'messages;',
    'signed agreements;',
    'signed amendments;',
    'Check-in Condition Report;',
    'Check-out Condition Report;',
    'photographs and video;',
    'incident reports;',
    'required-document submissions;',
    'payment records;',
    'location/delivery events where applicable;',
    'support records; and',
    'other relevant transaction evidence.',
  ]);
  doc.paragraph('No single status, photograph, GPS point, automated event, or upload automatically determines legal liability.');
  doc.paragraph("PayPal disputes or chargebacks remain subject to PayPal and the applicable funding provider's rules.");

  doc.heading(`${n(23)}. ELECTRONIC RECORDS AND SIGNATURES`);
  doc.paragraph('Host and Renter consent to electronic records and electronic signatures for this booking.');
  doc.paragraph("The parties intend electronic signatures executed through Vendibook's SignNow integration to have the same legal effect as handwritten signatures to the extent permitted by law.");
  doc.paragraph('Each party may access or request a copy of the completed document.');
  doc.paragraph('Additional governmental, insurance, permit, facility, or third-party forms may still be required.');

  doc.heading(`${n(24)}. PRIVACY AND DEVICE PERMISSIONS`);
  doc.paragraph("Vendibook's Privacy Policy and Checkout Privacy & Electronic Consent govern transaction data handling.");
  doc.paragraph('Camera and microphone access may be requested for an optional video walkthrough or virtual tour.');
  doc.paragraph('Video calls are not recorded by default. Any future recording requires separate disclosure and consent before recording begins.');
  doc.paragraph('Location may be requested only for features that actually need location, such as active delivery tracking.');
  doc.paragraph('Marketing email and promotional SMS consent are not bundled into this Rental Agreement.');

  doc.heading(`${n(25)}. PLATFORM ROLE AND LIMITATIONS`);
  doc.paragraph('Vendibook provides marketplace and transaction-workflow technology.');
  doc.paragraph('Vendibook does not guarantee:');
  doc.bullets([
    '(a) Host or Renter identity, conduct, or performance;',
    '(b) listing accuracy;',
    '(c) condition or safety;',
    '(d) permits or regulatory approval;',
    '(e) insurance validity or coverage;',
    '(f) uninterrupted access;',
    '(g) mechanical reliability;',
    '(h) delivery performance;',
    '(i) profitability or business results;',
    '(j) suitability for a specific event, menu, operation, or jurisdiction; or',
    '(k) the outcome of a dispute.',
  ]);
  doc.paragraph('The Vendibook Terms of Service remain applicable to the extent enforceable.');
  doc.paragraph('Nothing in this Agreement limits a right that applicable law does not permit to be limited.');

  doc.heading(`${n(26)}. AMENDMENTS`);
  doc.paragraph('A material change to dates, rental period, price, deposit, fulfillment obligation, access terms, included equipment, or another material booking term after signing should be documented through a written Transaction Amendment signed by Host and Renter.');
  doc.paragraph('A Transaction Amendment changes only the expressly identified terms.');

  doc.heading(`${n(27)}. ENTIRE BOOKING RECORD`);
  doc.paragraph('This Agreement, together with the frozen Booking Record, incorporated Vendibook terms, listing-specific rules, applicable cancellation policy, signed condition reports, and signed amendments, represents the written marketplace booking record concerning the subject matter reflected in those records.');
  doc.paragraph('This clause does not exclude rights that cannot lawfully be excluded.');

  doc.heading(`${n(28)}. SUPPORT`);
  doc.paragraph('Vendibook support may be contacted at support@vendibook.com.');
  doc.paragraph('Vendibook support can assist with marketplace workflows and records but cannot provide legal, insurance, mechanical, tax, regulatory, or emergency advice.');

  doc.heading(`${n(29)}. ACKNOWLEDGMENT AND SIGNATURES`);
  doc.paragraph('By signing below, Host and Renter acknowledge that they had the opportunity to review this Agreement and the transaction-specific Booking Record incorporated into it.');
  contractSignatureBlock(doc, fc, R, H);
  doc.paragraph('END OF VENDIBOOK RENTAL AGREEMENT');

  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */
/* C. Sale handoff & condition acknowledgment                          */
/* ------------------------------------------------------------------ */

function buildSaleHandoff(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Sale Handoff & Condition Acknowledgment', version: SPEC_VERSIONS.sale_handoff_condition_acknowledgment });
  const fc = new FieldCollector();
  const S = 'Seller';
  const B = 'Buyer';

  doc.documentTitle(
    'Sale Handoff & Condition Acknowledgment',
    `Version ${SPEC_VERSIONS.sale_handoff_condition_acknowledgment}. Production-intended draft; requires qualified legal counsel review before final legal reliance.`,
  );

  doc.paragraph('This Sale Handoff & Condition Acknowledgment ("Handoff Acknowledgment") documents the physical Handoff of the Asset identified below between the Buyer and Seller.');
  doc.paragraph('This document supplements, but does not replace, the Vendibook Purchase & Sale Agreement, any applicable title or registration documents, lien-release documents, governmental forms, carrier records, or other legally required transfer documentation.');

  ph(doc, fc, S, 'transaction_reference', 'Transaction reference');
  ph(doc, fc, S, 'listing_title', 'Asset');
  ph(doc, fc, S, 'buyer_name', 'Buyer');
  ph(doc, fc, S, 'seller_name', 'Seller');
  ph(doc, fc, S, 'handoff_datetime', 'Handoff date/time');
  ph(doc, fc, S, 'fulfillment_method', 'Fulfillment method');
  ph(doc, fc, S, 'handoff_location', 'Handoff location/area');
  ph(doc, fc, S, 'asset_identifier', 'VIN / serial / identifying number, if captured');
  ph(doc, fc, S, 'handoff_mileage', 'Odometer/mileage at Handoff, if applicable and captured');

  doc.heading('1. PURPOSE OF THIS ACKNOWLEDGMENT');
  doc.paragraph('The purpose of this Handoff Acknowledgment is to create a written record of:');
  doc.bullets([
    '(a) the physical Handoff event;',
    '(b) the condition observations documented at Handoff;',
    '(c) the keys, records, equipment, and documents exchanged;',
    '(d) any discrepancy, damage, missing item, or unresolved issue identified by either party; and',
    '(e) any follow-up item the parties agree to complete after Handoff.',
  ]);
  doc.paragraph('This is a transaction record. It is not a professional mechanical inspection, title opinion, appraisal, governmental transfer form, or warranty.');

  doc.heading('2. ASSET IDENTITY CONFIRMATION');
  doc.paragraph('The parties should compare identifying information available at Handoff with the Transaction Record.');
  ph(doc, fc, S, 'asset_title_description', 'Asset title/description');
  ph(doc, fc, S, 'asset_year_make_model', 'Year/make/model, if applicable');
  ph(doc, fc, S, 'asset_identifier_confirm', 'VIN/serial/identifier, if applicable');
  doc.paragraph('Buyer acknowledgment:');
  checkboxes(doc, [
    '[ ] The identifying information I reviewed appears consistent with the transaction record.',
    '[ ] A discrepancy is noted below.',
    '[ ] Not applicable / not available for this Asset.',
  ]);
  fc.add('identifier_discrepancy_notes', B, 'text', doc.blockField('Discrepancy notes', 48), 'Identifier discrepancy notes', false);

  doc.heading('3. INCLUDED EQUIPMENT');
  doc.paragraph('The following equipment or property was identified as included in the transaction:');
  fc.add('included_equipment_checklist', S, 'text', doc.blockField('Included equipment checklist from the transaction record', 64), 'Included equipment checklist', false);
  doc.paragraph('Buyer acknowledgment:');
  checkboxes(doc, [
    '[ ] Included items were reviewed and no material missing item was noted.',
    '[ ] Missing or materially different items are listed below.',
    '[ ] Buyer did not complete a full included-equipment review at Handoff.',
  ]);
  fc.add('equipment_discrepancy_notes', B, 'text', doc.blockField('Missing/different equipment notes', 48), 'Equipment discrepancy notes', false);

  doc.heading('4. CONDITION REVIEW');
  doc.paragraph('Buyer had the opportunity to conduct a visual inspection at Handoff to the extent reasonably practical.');
  doc.paragraph('Condition areas may include, where applicable:');
  const conditionRows: [string, string][] = [
    ['condition_exterior', 'Exterior/body/frame'],
    ['condition_tires', 'Tires/wheels/axles'],
    ['condition_cab', 'Cab/driver controls'],
    ['condition_interior', 'Interior walls/floors/ceiling'],
    ['condition_cooking', 'Cooking equipment'],
    ['condition_refrigeration', 'Refrigeration/freezers'],
    ['condition_electrical', 'Electrical/shore power'],
    ['condition_generator', 'Generator'],
    ['condition_plumbing', 'Plumbing/water system'],
    ['condition_fuel', 'Propane/fuel system'],
    ['condition_hood_fire', 'Hood/ventilation/fire-suppression visible condition'],
    ['condition_other', 'Other observed condition'],
  ];
  for (const [name, label] of conditionRows) ph(doc, fc, B, name, label);
  doc.paragraph('This condition record reflects only what the parties actually observed or documented. It does not certify roadworthiness, mechanical condition, code compliance, title status, or fitness for a particular purpose.');

  doc.heading('5. DOCUMENTS AND KEYS EXCHANGED');
  doc.paragraph('The parties should identify what was physically or electronically provided at Handoff.');
  checkboxes(doc, [
    '[ ] Keys',
    '[ ] Title or ownership document, where applicable',
    '[ ] Bill of sale / purchase agreement copy',
    '[ ] Lien release, if applicable and provided',
    '[ ] Registration record, if applicable and provided',
    '[ ] Equipment manuals',
    '[ ] Service records',
    '[ ] Warranty documentation, if any',
  ]);
  fc.add('other_documents_transferred', S, 'text', doc.blockField('Other documents or items exchanged', 44), 'Other documents transferred', false);
  fc.add('documents_followup', S, 'text', doc.blockField('Documents not yet provided / follow-up required', 48), 'Documents follow-up', false);
  doc.paragraph('Checking a box confirms only that a document or item was presented or exchanged. Vendibook does not independently determine whether a title, lien release, registration, identification document, or other record is legally valid or sufficient.');

  doc.heading('6. PHOTOS AND OTHER CONDITION EVIDENCE');
  fc.add('handoff_media_reference', S, 'text', doc.blockField('Photos/video associated with the Handoff record', 44), 'Handoff media reference', false);
  doc.paragraph('Buyer and Seller understand that photos, video, messages, GPS events, and other records may help document the transaction but no single item automatically determines legal ownership, liability, condition, or the outcome of a dispute.');

  doc.heading('7. MATERIAL DISCREPANCIES OR UNRESOLVED ISSUES');
  fc.add('buyer_handoff_notes', B, 'text', doc.blockField('Buyer notes', 56), 'Buyer notes', false);
  fc.add('seller_handoff_notes', S, 'text', doc.blockField('Seller notes', 56), 'Seller notes', false);
  fc.add('handoff_followup_items', S, 'text', doc.blockField('Agreed follow-up items, if any', 48), 'Follow-up items', false);
  doc.paragraph('Nothing in this section requires a party to mark the transaction complete if the party believes a material issue remains unresolved.');

  doc.heading('8. HANDOFF STATUS');
  doc.paragraph('Buyer:');
  checkboxes(doc, [
    '[ ] I received physical possession of the Asset.',
    '[ ] I did not receive physical possession of the Asset.',
    '[ ] Possession is being transferred through a carrier/freight process and final receipt remains pending.',
  ]);
  doc.paragraph('Seller:');
  checkboxes(doc, [
    '[ ] I transferred physical possession of the Asset to Buyer or Buyer\u2019s authorized recipient.',
    '[ ] I did not transfer physical possession of the Asset.',
    '[ ] I transferred the Asset to the agreed carrier/freight provider and final Buyer receipt remains pending.',
  ]);

  doc.heading('9. IMPORTANT LEGAL LIMITATIONS');
  doc.paragraph('This Handoff Acknowledgment:');
  doc.bullets([
    '(a) does not itself transfer a government-issued certificate of title;',
    '(b) does not replace a lien release, registration filing, notarized title assignment, DMV form, or other legally required transfer document;',
    '(c) does not establish that the Asset has passed a professional inspection;',
    '(d) does not automatically waive a claim or right that applicable law does not permit a party to waive;',
    '(e) does not cause or authorize payment movement merely because the document is signed; and',
    '(f) does not make Vendibook the owner, seller, dealer, title agency, insurer, carrier, appraiser, inspector, or guarantor of the Asset.',
  ]);

  doc.heading('10. ACKNOWLEDGMENT');
  doc.paragraph('By signing below, Buyer and Seller confirm that this Handoff Acknowledgment accurately reflects the Handoff observations and items they chose to record at the time of signing, subject to any written discrepancies and follow-up items stated above.');
  doc.paragraph('The parties consent to review and sign this document electronically, and intend an electronic signature to have the same legal effect as a handwritten signature to the extent permitted by applicable law.');
  contractSignatureBlock(doc, fc, 'Buyer', 'Seller');
  doc.paragraph('END OF SALE HANDOFF & CONDITION ACKNOWLEDGMENT');

  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */
/* D/E. Rental check-in and check-out condition reports                */
/* ------------------------------------------------------------------ */

/** Printed name / signature / date block used by the condition reports. */
function reportSignatureBlock(doc: PdfDoc, fc: FieldCollector, roleA: string, roleB: string) {
  for (const role of [roleA, roleB]) {
    const key = role.toLowerCase().replace(/\s+/g, '_');
    doc.heading(role.toUpperCase());
    fc.add(`${key}_printed_name`, role, 'text', doc.fieldBox('Printed name', { column: 0 }), `${role} printed name`, true);
    fc.add(`${key}_signature`, role, 'signature', doc.fieldBox('Signature', { column: 1, height: 34 }), `${role} signature`, true);
    fc.add(`${key}_signed_date`, role, 'text', doc.fieldBox('Date/time', { width: 220 }), `${role} date signed`, true);
  }
}

function buildRentalCheckin(variant: AssetVariant = 'general'): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const version = variantVersion('rental_checkin_condition_report', variant);
  const doc = new PdfDoc({ title: 'Rental Check-in Condition Report', version });
  const fc = new FieldCollector();
  const R = 'Renter';
  const H = 'Host';
  const mobile = variant !== 'space';
  const space = variant !== 'mobile';

  doc.documentTitle(
    'Rental Check-in Condition Report',
    `Version ${version}. Production-intended draft; requires qualified legal counsel review before final legal reliance.`,
  );
  doc.paragraph('This Rental Check-in Condition Report ("Check-in Report") documents the observed condition of the Rental Asset at the beginning of the Rental Period.');

  ph(doc, fc, H, 'booking_reference', 'Booking reference');
  ph(doc, fc, H, 'listing_title', 'Rental Asset');
  ph(doc, fc, H, 'host_name', 'Host');
  ph(doc, fc, H, 'renter_name', 'Renter');
  ph(doc, fc, H, 'checkin_datetime', 'Check-in date/time');
  ph(doc, fc, H, 'fulfillment_method', 'Fulfillment/access method');
  ph(doc, fc, H, 'checkin_location', 'Check-in location/area');
  doc.paragraph('This Check-in Report supplements the Vendibook Rental Agreement. It is not a professional mechanical, safety, title, fire, health, electrical, plumbing, structural, or regulatory inspection.');

  doc.heading('1. PURPOSE');
  doc.paragraph('The parties use this Check-in Report to document:');
  doc.bullets([
    '(a) visible pre-existing condition;',
    '(b) included equipment and accessories;',
    '(c) keys or access devices delivered;',
    '(d) mileage, hours, fuel, or charge only when applicable;',
    '(e) known non-working items disclosed at Check-in;',
    '(f) photographs or other condition evidence; and',
    '(g) any issue that should be included in the Booking Record before Renter begins use.',
  ]);

  doc.heading('2. GENERAL CONDITION');
  ph(doc, fc, R, 'checkin_overall_condition', 'Overall visible condition');
  ph(doc, fc, R, 'checkin_cleanliness', 'Cleanliness at Check-in');
  fc.add('checkin_existing_damage', R, 'text', doc.blockField('Known pre-existing damage/wear', 56), 'Pre-existing damage', false);
  fc.add('checkin_nonworking_items', H, 'text', doc.blockField('Known non-working equipment/items', 56), 'Non-working items', false);
  fc.add('checkin_host_disclosures', H, 'text', doc.blockField('Other Host disclosures at Check-in', 56), 'Host disclosures', false);
  fc.add('checkin_renter_comments', R, 'text', doc.blockField('Renter comments', 56), 'Renter comments', false);

  doc.heading('3. KEYS / ACCESS DEVICES');
  doc.paragraph('Items provided:');
  fc.add('checkin_keys_access_items', H, 'text', doc.blockField('Keys and access devices provided', 56), 'Keys/access items', false);
  doc.paragraph('Examples may include vehicle keys, trailer keys, padlock keys, kitchen access card, gate code, entry code, equipment key, or other access device only when actually applicable.');

  doc.heading('4. INCLUDED EQUIPMENT');
  doc.paragraph('Included equipment/items confirmed at Check-in:');
  fc.add('checkin_included_equipment', H, 'text', doc.blockField('Included equipment confirmed', 56), 'Included equipment', false);
  doc.paragraph('Missing or disputed items:');
  fc.add('checkin_missing_equipment', R, 'text', doc.blockField('Missing or disputed items', 56), 'Missing items', false);

  if (mobile) {
    doc.heading('5. VEHICLE / TRAILER CONDITION');
    ph(doc, fc, H, 'asset_identifier', 'Asset identifier/VIN/serial, if captured');
    ph(doc, fc, H, 'checkin_mileage', 'Odometer/mileage, if applicable');
    ph(doc, fc, H, 'checkin_hours', 'Hour meter, if applicable');
    ph(doc, fc, H, 'checkin_fuel_charge', 'Fuel/charge level, if applicable');
    ph(doc, fc, R, 'checkin_exterior', 'Exterior/body/frame');
    ph(doc, fc, R, 'checkin_tires', 'Tires/wheels/axles');
    ph(doc, fc, R, 'checkin_lights', 'Lights/signals');
    ph(doc, fc, R, 'checkin_towing', 'Hitch/coupler/safety chains/jack, if applicable');
    ph(doc, fc, R, 'checkin_cab', 'Cab/interior controls, if applicable');
    ph(doc, fc, R, 'checkin_interior', 'Interior walls/floor/ceiling');
    ph(doc, fc, R, 'checkin_visible_leaks', 'Visible leaks or damage');
    doc.paragraph('These observations do not certify mechanical soundness or roadworthiness.');

    doc.heading('6. KITCHEN / FOOD-SERVICE SYSTEMS');
    ph(doc, fc, R, 'checkin_cooking', 'Cooking equipment');
    ph(doc, fc, R, 'checkin_refrigeration', 'Refrigeration/freezers');
    ph(doc, fc, R, 'checkin_hood', 'Hood/ventilation');
    ph(doc, fc, R, 'checkin_fire_system', 'Fire-suppression visible condition/tag, if captured');
    ph(doc, fc, R, 'checkin_sinks', 'Sinks');
    ph(doc, fc, R, 'checkin_water', 'Fresh/waste water');
    ph(doc, fc, R, 'checkin_plumbing', 'Plumbing/pumps');
    ph(doc, fc, R, 'checkin_electrical', 'Electrical/outlets/panel');
    ph(doc, fc, R, 'checkin_generator', 'Generator');
    ph(doc, fc, R, 'checkin_shore_power', 'Shore power');
    ph(doc, fc, R, 'checkin_propane', 'Propane/fuel system visible condition');
    ph(doc, fc, R, 'checkin_hot_water', 'Hot water');
    doc.paragraph('This Report records only observed condition. It is not a professional safety, fire, code, electrical, plumbing, gas, or health inspection.');
  }

  if (space) {
    doc.heading(mobile ? '7. STATIC KITCHEN / VENDOR SPACE CONDITION' : '5. KITCHEN / VENDOR SPACE CONDITION');
    ph(doc, fc, R, 'checkin_access_condition', 'Access condition');
    ph(doc, fc, R, 'checkin_utilities', 'Utilities available as listed');
    ph(doc, fc, R, 'checkin_shared_equipment', 'Included shared equipment');
    ph(doc, fc, R, 'checkin_space_damage', 'Visible pre-existing damage');
    ph(doc, fc, R, 'checkin_storage', 'Storage/access areas included');
    fc.add('checkin_space_notes', R, 'text', doc.blockField('Other space notes', 56), 'Space notes', false);
    if (!mobile) {
      doc.paragraph('This Report records only observed condition. It is not a professional safety, fire, code, electrical, plumbing, gas, or health inspection.');
    }
  }

  const n = (base: number) => String(base - (mobile ? 0 : 2) - (space ? 0 : 1));

  doc.heading(`${n(8)}. PHOTOS / CONDITION MEDIA`);
  fc.add('checkin_media_reference', R, 'text', doc.blockField('Condition photos/video linked to this report', 44), 'Media reference', false);
  doc.paragraph('The parties should use contemporaneous photos where practical.');
  doc.paragraph('A photo or video is evidence of what it depicts but does not by itself determine legal liability.');

  doc.heading(`${n(9)}. CONDITION DISCREPANCIES`);
  doc.paragraph('Renter:');
  checkboxes(doc, [
    '[ ] I observed no material discrepancy beyond what is written in this Check-in Report.',
    '[ ] I observed the following material discrepancy or concern:',
  ]);
  fc.add('checkin_discrepancy', R, 'text', doc.blockField('Material discrepancy or concern', 56), 'Discrepancy', false);
  fc.add('checkin_host_response', H, 'text', doc.blockField('Host response/comments', 56), 'Host response', false);

  doc.heading(`${n(10)}. ACKNOWLEDGMENT`);
  doc.paragraph('By signing, the parties acknowledge only that this Report reflects the condition observations and items they chose to document at Check-in.');
  doc.paragraph('Signing this Report does not waive non-waivable legal rights and does not make Vendibook an inspector, insurer, guarantor, or owner of the Rental Asset.');
  doc.paragraph('The parties consent to review and sign this document electronically, and intend an electronic signature to have the same legal effect as a handwritten signature to the extent permitted by applicable law.');
  reportSignatureBlock(doc, fc, R, H);
  doc.paragraph('END OF RENTAL CHECK-IN CONDITION REPORT');

  return { pdf: doc.build(), fields: fc.fields };
}

function buildRentalCheckout(variant: AssetVariant = 'general'): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const version = variantVersion('rental_checkout_condition_report', variant);
  const doc = new PdfDoc({ title: 'Rental Check-out Condition Report', version });
  const fc = new FieldCollector();
  const R = 'Renter';
  const H = 'Host';
  const mobile = variant !== 'space';
  const space = variant !== 'mobile';

  doc.documentTitle(
    'Rental Check-out / Return Condition Report',
    `Version ${version}. Production-intended draft; requires qualified legal counsel review before final legal reliance.`,
  );
  doc.paragraph('This Rental Check-out / Return Condition Report ("Check-out Report") documents the observed condition and return status of the Rental Asset at the end of the Rental Period.');

  ph(doc, fc, H, 'booking_reference', 'Booking reference');
  ph(doc, fc, H, 'listing_title', 'Rental Asset');
  ph(doc, fc, H, 'host_name', 'Host');
  ph(doc, fc, H, 'renter_name', 'Renter');
  ph(doc, fc, H, 'checkout_datetime', 'Check-out/return date/time');
  ph(doc, fc, H, 'return_method', 'Return/retrieval method');
  ph(doc, fc, H, 'return_location', 'Return location/area');
  doc.paragraph('This Report supplements the Vendibook Rental Agreement and the Check-in Report.');

  doc.heading('1. RETURN STATUS');
  checkboxes(doc, [
    '[ ] Rental Asset returned to Host.',
    '[ ] Host retrieved Rental Asset.',
    '[ ] Renter vacated/completed use of on-site kitchen or vendor space.',
    '[ ] Return is incomplete or disputed as described below.',
  ]);
  fc.add('return_status_notes', H, 'text', doc.blockField('Return-status notes', 56), 'Return-status notes', false);

  doc.heading('2. KEYS / ACCESS ITEMS RETURNED');
  fc.add('returned_keys_access', H, 'text', doc.blockField('Keys/access items returned', 56), 'Keys returned', false);
  ph(doc, fc, H, 'missing_keys_access', 'Missing access items, if any');

  doc.heading('3. GENERAL CONDITION AT RETURN');
  ph(doc, fc, H, 'checkout_overall_condition', 'Overall visible condition');
  ph(doc, fc, H, 'checkout_cleanliness', 'Cleanliness');
  fc.add('checkout_new_damage', H, 'text', doc.blockField('New visible damage or issue reported', 56), 'New damage', false);
  fc.add('checkout_preexisting_reference', H, 'text', doc.blockField('Pre-existing condition from Check-in relevant to comparison', 56), 'Pre-existing reference', false);
  fc.add('checkout_renter_comments', R, 'text', doc.blockField('Renter comments', 56), 'Renter comments', false);
  fc.add('checkout_host_comments', H, 'text', doc.blockField('Host comments', 56), 'Host comments', false);

  if (mobile) {
    doc.heading('4. VEHICLE / TRAILER RETURN DATA');
    ph(doc, fc, H, 'checkout_mileage', 'Ending odometer/mileage, if applicable');
    ph(doc, fc, H, 'checkout_hours', 'Ending hours, if applicable');
    ph(doc, fc, H, 'checkout_fuel_charge', 'Ending fuel/charge, if applicable');
    ph(doc, fc, H, 'checkout_exterior', 'Exterior/body/frame');
    ph(doc, fc, H, 'checkout_tires', 'Tires/wheels/axles');
    ph(doc, fc, H, 'checkout_interior', 'Interior/cab');
    ph(doc, fc, H, 'checkout_towing', 'Towing components, if applicable');
    fc.add('checkout_vehicle_notes', H, 'text', doc.blockField('Other vehicle/trailer notes', 56), 'Vehicle notes', false);

    doc.heading('5. KITCHEN / FOOD-SERVICE RETURN CONDITION');
    ph(doc, fc, H, 'checkout_cooking', 'Cooking equipment');
    ph(doc, fc, H, 'checkout_refrigeration', 'Refrigeration/freezer condition');
    ph(doc, fc, H, 'checkout_plumbing', 'Sinks/plumbing');
    ph(doc, fc, H, 'checkout_electrical', 'Electrical/generator');
    ph(doc, fc, H, 'checkout_hood', 'Hood/ventilation');
    ph(doc, fc, H, 'checkout_water', 'Water tanks/system');
    fc.add('checkout_kitchen_notes', H, 'text', doc.blockField('Other kitchen notes', 56), 'Kitchen notes', false);
  }

  if (space) {
    doc.heading(mobile ? '6. STATIC SPACE CHECK-OUT' : '4. KITCHEN / VENDOR SPACE CHECK-OUT');
    ph(doc, fc, H, 'space_vacated_status', 'Space vacated');
    ph(doc, fc, H, 'checkout_space_equipment', 'Utilities/equipment condition');
    ph(doc, fc, H, 'checkout_space_cleanliness', 'Cleaning condition');
    ph(doc, fc, H, 'checkout_space_damage', 'Visible new damage');
    ph(doc, fc, H, 'checkout_space_access', 'Access devices returned/deactivated');
    fc.add('checkout_space_notes', H, 'text', doc.blockField('Other notes', 56), 'Space notes', false);
  }

  const n = (base: number) => String(base - (mobile ? 0 : 2) - (space ? 0 : 1));

  doc.heading(`${n(7)}. INCLUDED EQUIPMENT RETURN`);
  doc.paragraph('Included equipment/items expected at return:');
  fc.add('expected_return_equipment', H, 'text', doc.blockField('Expected equipment at return', 56), 'Expected equipment', false);
  doc.paragraph('Missing or disputed items:');
  fc.add('missing_return_equipment', H, 'text', doc.blockField('Missing or disputed items', 56), 'Missing items', false);

  doc.heading(`${n(8)}. PHOTOS / MEDIA`);
  fc.add('checkout_media_reference', H, 'text', doc.blockField('Check-out photos/video linked to this Report', 44), 'Media reference', false);

  doc.heading(`${n(9)}. INCIDENTS / UNRESOLVED ISSUES`);
  fc.add('rental_incident_reference', H, 'text', doc.blockField('Incidents previously reported during the rental', 44), 'Incident reference', false);
  fc.add('checkout_issue', H, 'text', doc.blockField('New issue identified at Check-out', 44), 'New issue', false);
  fc.add('checkout_unresolved_issue', H, 'text', doc.blockField('Unresolved issue requiring follow-up', 44), 'Unresolved issue', false);

  doc.heading(`${n(10)}. FINANCIAL EFFECT`);
  doc.paragraph('This Check-out Report does not itself impose a damage fee, cleaning charge, mileage fee, late-return fee, replacement charge, deposit deduction, or other financial liability.');
  doc.paragraph('Any proposed charge, refund, deduction, or dispute must be supported by the Booking Record, signed terms, evidence, applicable insurance/payment-provider rules, and applicable law.');

  doc.heading(`${n(11)}. ACKNOWLEDGMENT`);
  doc.paragraph('By signing, each party acknowledges that this Report reflects the return/check-out observations and issues that party chose to document.');
  doc.paragraph('A party may sign while noting a disagreement or unresolved issue.');
  doc.paragraph('Signing does not mean that a party admits liability unless the Report expressly states and the party affirmatively agrees to that admission.');
  doc.paragraph('The parties consent to review and sign this document electronically, and intend an electronic signature to have the same legal effect as a handwritten signature to the extent permitted by applicable law.');
  reportSignatureBlock(doc, fc, R, H);
  doc.paragraph('END OF RENTAL CHECK-OUT / RETURN CONDITION REPORT');

  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */
/* F. Transaction amendment                                            */
/* ------------------------------------------------------------------ */

function buildAmendment(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const version = SPEC_VERSIONS.transaction_amendment;
  const doc = new PdfDoc({ title: 'Transaction Amendment', version });
  const fc = new FieldCollector();
  const A = 'Party A';
  const B = 'Party B';

  doc.documentTitle(
    'Vendibook Transaction Amendment',
    `Version ${version}. Production-intended draft; requires qualified legal counsel review before final legal reliance.`,
  );
  doc.paragraph('This Vendibook Transaction Amendment ("Amendment") modifies the identified term or terms of the previously executed Vendibook Purchase & Sale Agreement or Vendibook Rental Agreement.');
  doc.paragraph('This Amendment must be used only when the parties intentionally agree to modify a material written transaction or booking term after the original agreement was executed.');

  ph(doc, fc, A, 'transaction_reference', 'Original transaction/booking reference');
  ph(doc, fc, A, 'original_agreement_type', 'Original agreement type');
  ph(doc, fc, A, 'original_agreement_version', 'Original agreement version');
  ph(doc, fc, A, 'original_agreement_date', 'Original agreement date');
  ph(doc, fc, A, 'party_a_name', 'Party A');
  ph(doc, fc, A, 'party_b_name', 'Party B');
  ph(doc, fc, A, 'party_a_role', 'Party A role in this transaction');
  ph(doc, fc, A, 'party_b_role', 'Party B role in this transaction');

  doc.heading('1. PURPOSE');
  doc.paragraph('The parties agree to modify only the term or terms expressly stated in this Amendment.');
  doc.paragraph('Except as expressly modified below, the original signed agreement and incorporated transaction/booking record remain unchanged.');

  doc.heading('2. TERM BEING MODIFIED');
  doc.paragraph('Original term:');
  fc.add('original_term_text', A, 'text', doc.blockField('Original term', 78), 'Original term', false);
  doc.paragraph('Replacement / amended term:');
  fc.add('amended_term_text', A, 'text', doc.blockField('Replacement / amended term', 78), 'Amended term', false);
  ph(doc, fc, A, 'amendment_effective_at', 'Effective date/time of amendment');
  doc.paragraph('Reason or context, if provided:');
  fc.add('amendment_reason', A, 'text', doc.blockField('Reason or context', 56), 'Reason', false);

  doc.heading('3. FINANCIAL CHANGE, IF ANY');
  ph(doc, fc, A, 'original_amount', 'Original amount affected, if applicable');
  ph(doc, fc, A, 'amended_amount', 'New amount, if applicable');
  ph(doc, fc, A, 'amount_difference', 'Net change, if applicable');
  doc.paragraph('If no financial term changes, this section states: "No transaction amount is modified by this Amendment."');
  doc.paragraph('A signed Amendment does not itself process, refund, capture, authorize, or move payment. Any resulting payment action must occur through the applicable Vendibook/PayPal payment workflow.');

  doc.heading('4. FULFILLMENT OR DATE CHANGE, IF ANY');
  fc.add('original_fulfillment_or_date', A, 'text', doc.blockField('Original fulfillment/date term', 56), 'Original fulfillment/date', false);
  fc.add('amended_fulfillment_or_date', A, 'text', doc.blockField('Amended fulfillment/date term', 56), 'Amended fulfillment/date', false);
  doc.paragraph('If not applicable, this section is left blank.');

  doc.heading('5. EQUIPMENT / ASSET / ACCESS CHANGE, IF ANY');
  fc.add('original_asset_term', A, 'text', doc.blockField('Original included item/access term', 56), 'Original asset term', false);
  fc.add('amended_asset_term', A, 'text', doc.blockField('Amended item/access term', 56), 'Amended asset term', false);
  doc.paragraph('If not applicable, this section is left blank.');

  doc.heading('6. NO OTHER MODIFICATION');
  doc.paragraph('All provisions of the original signed agreement not expressly modified by this Amendment remain in effect.');
  doc.paragraph('This Amendment does not silently replace or overwrite the original signed agreement.');
  doc.paragraph('The original signed agreement and this signed Amendment must both remain available in the transaction record.');

  doc.heading('7. ELECTRONIC SIGNATURE');
  doc.paragraph('The parties consent to sign this Amendment electronically.');
  reportSignatureBlock(doc, fc, A, B);
  doc.paragraph('END OF VENDIBOOK TRANSACTION AMENDMENT');

  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */
/* G. Delivery handoff acknowledgment                                  */
/* ------------------------------------------------------------------ */

function buildDeliveryHandoff(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const version = SPEC_VERSIONS.delivery_handoff_acknowledgment;
  const doc = new PdfDoc({ title: 'Delivery Handoff Acknowledgment', version });
  const fc = new FieldCollector();
  const RECV = 'Receiving Party';
  const DELV = 'Delivering Party';

  doc.documentTitle(
    'Delivery Handoff Acknowledgment',
    `Version ${version}. Production-intended draft; requires qualified legal counsel review before final legal reliance.`,
  );
  doc.paragraph('This Delivery Handoff Acknowledgment records the physical delivery of the transaction or rental asset identified below.');
  doc.paragraph('Use this document only when an actual seller/host delivery workflow calls for a signed receipt or condition acknowledgment. It is not generated merely because a transaction has a delivery address.');

  ph(doc, fc, DELV, 'transaction_reference', 'Transaction/booking reference');
  ph(doc, fc, DELV, 'listing_title', 'Asset/listing');
  ph(doc, fc, DELV, 'delivering_party_name', 'Delivering party');
  ph(doc, fc, DELV, 'receiving_party_name', 'Receiving party');
  ph(doc, fc, DELV, 'delivery_datetime', 'Delivery date/time');
  ph(doc, fc, DELV, 'delivery_location', 'Delivery address/area');
  ph(doc, fc, DELV, 'delivery_type', 'Delivery type');

  doc.heading('1. DELIVERY EVENT');
  doc.paragraph('Receiving party:');
  checkboxes(doc, [
    '[ ] I received physical possession/access.',
    '[ ] Delivery occurred but a material issue is noted below.',
    '[ ] Delivery was attempted but not completed.',
    '[ ] Other:',
  ]);
  ph(doc, fc, RECV, 'delivery_status_other', 'Other delivery status');
  fc.add('delivery_notes', RECV, 'text', doc.blockField('Delivery notes', 56), 'Delivery notes', false);

  doc.heading('2. CONDITION AT DELIVERY');
  ph(doc, fc, RECV, 'delivery_condition', 'Observed exterior/overall condition');
  ph(doc, fc, RECV, 'delivery_discrepancy', 'Visible damage or discrepancy');
  ph(doc, fc, RECV, 'delivery_equipment_status', 'Included equipment/items reviewed');
  ph(doc, fc, DELV, 'delivery_documents_keys', 'Documents/keys delivered');
  ph(doc, fc, DELV, 'delivery_media_reference', 'Media reference');

  doc.heading('3. LOCATION TRACKING');
  doc.paragraph('If Vendibook Delivery Mode was used, location events may be part of the order record.');
  doc.paragraph('GPS information is informational only.');
  doc.paragraph('A GPS point does not by itself establish legal delivery, legal acceptance, title transfer, fault, condition, or entitlement to payment.');

  doc.heading('4. UNRESOLVED ISSUE');
  fc.add('delivery_unresolved_issue', RECV, 'text', doc.blockField('Unresolved issue, if any', 56), 'Unresolved issue', false);
  fc.add('delivery_followup', RECV, 'text', doc.blockField('Required follow-up, if any', 56), 'Follow-up', false);
  doc.paragraph('The receiving party is not required to mark the transaction or booking complete merely to continue the app if a material issue remains unresolved.');

  doc.heading('5. LEGAL EFFECT');
  doc.paragraph('This Acknowledgment documents the delivery event and observed condition.');
  doc.paragraph('It does not:');
  doc.bullets([
    '(a) replace a Purchase & Sale Agreement or Rental Agreement;',
    '(b) replace a title transfer, bill of sale, lien release, registration, carrier document, or other legally required form;',
    '(c) waive a right that cannot lawfully be waived;',
    '(d) independently impose a damage charge; or',
    '(e) independently authorize movement or release of funds.',
  ]);

  doc.paragraph('The parties consent to review and sign this document electronically, and intend an electronic signature to have the same legal effect as a handwritten signature to the extent permitted by applicable law.');
  reportSignatureBlock(doc, fc, RECV, DELV);
  doc.paragraph('END OF DELIVERY HANDOFF ACKNOWLEDGMENT');

  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */

/**
 * Content versions. BUMP the version whenever the text or fields of a spec
 * change — a new version provisions a new SignNow template and leaves every
 * previously generated document pointing at the template it was built from.
 */
export const SPEC_VERSIONS: Record<TemplateKind, string> = {
  purchase_sale_agreement: '2026-09-18-A',
  rental_agreement: '2026-09-18-A',
  sale_handoff_condition_acknowledgment: '2026-09-18-A',
  rental_checkin_condition_report: '2026-09-18-A',
  rental_checkout_condition_report: '2026-09-18-A',
  transaction_amendment: '2026-09-18-A',
  delivery_handoff_acknowledgment: '2026-09-18-A',
  bill_of_sale: '1',
};

export const TEMPLATE_SPECS: Record<Exclude<TemplateKind, 'bill_of_sale'>, TemplateSpec> = {
  purchase_sale_agreement: {
    kind: 'purchase_sale_agreement',
    version: SPEC_VERSIONS.purchase_sale_agreement,
    documentName: 'Vendibook Purchase & Sale Agreement',
    roles: ['Buyer', 'Seller'],
    build: buildPurchaseSaleAgreement,
  },
  rental_agreement: {
    kind: 'rental_agreement',
    version: SPEC_VERSIONS.rental_agreement,
    documentName: 'Vendibook Rental Agreement',
    roles: ['Renter', 'Host'],
    build: buildRentalAgreement,
  },
  sale_handoff_condition_acknowledgment: {
    kind: 'sale_handoff_condition_acknowledgment',
    version: SPEC_VERSIONS.sale_handoff_condition_acknowledgment,
    documentName: 'Vendibook Sale Handoff & Condition Acknowledgment',
    roles: ['Buyer', 'Seller'],
    build: buildSaleHandoff,
  },
  rental_checkin_condition_report: {
    kind: 'rental_checkin_condition_report',
    version: SPEC_VERSIONS.rental_checkin_condition_report,
    documentName: 'Vendibook Rental Check-in Condition Report',
    roles: ['Renter', 'Host'],
    build: buildRentalCheckin,
  },
  rental_checkout_condition_report: {
    kind: 'rental_checkout_condition_report',
    version: SPEC_VERSIONS.rental_checkout_condition_report,
    documentName: 'Vendibook Rental Check-out Condition Report',
    roles: ['Renter', 'Host'],
    build: buildRentalCheckout,
  },
  transaction_amendment: {
    kind: 'transaction_amendment',
    version: SPEC_VERSIONS.transaction_amendment,
    documentName: 'Vendibook Transaction Amendment',
    roles: ['Party A', 'Party B'],
    build: buildAmendment,
  },
  delivery_handoff_acknowledgment: {
    kind: 'delivery_handoff_acknowledgment',
    version: SPEC_VERSIONS.delivery_handoff_acknowledgment,
    documentName: 'Vendibook Delivery Handoff Acknowledgment',
    roles: ['Receiving Party', 'Delivering Party'],
    build: buildDeliveryHandoff,
  },
};

export function getTemplateSpec(kind: TemplateKind): TemplateSpec {
  const spec = (TEMPLATE_SPECS as Record<string, TemplateSpec | undefined>)[kind];
  if (!spec) throw new Error(`no template spec for kind: ${kind}`);
  return spec;
}
