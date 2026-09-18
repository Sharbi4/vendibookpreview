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

export interface TemplateSpec {
  kind: TemplateKind;
  version: string;
  documentName: string;
  roles: [string, string];
  build(): { pdf: Uint8Array; fields: SignNowFieldDef[] };
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

function buildRentalAgreement(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Rental Agreement', version: SPEC_VERSIONS.rental_agreement });
  const fc = new FieldCollector();

  header(doc, fc, 'Vendibook Rental Agreement', 'Prepared from the Vendibook booking record. Not attorney-approved; parties should obtain independent advice.', 'Host', [
    'Agreement version',
    'Booking reference',
    'Host name',
    'Renter name',
    'Listing title',
    'Listing type',
    'Rental start',
    'Rental end',
    'Duration',
    'Rate',
    'Service fees',
    'Delivery fee',
    'Security deposit',
    'Total',
    'Fulfillment or access mode',
  ]);

  doc.heading('1. Parties and definitions');
  doc.bullets([
    '"Host" is the party offering the Rental Asset through the Vendibook listing identified above.',
    '"Renter" is the party booking the Rental Asset.',
    '"Rental Asset" is the vehicle, trailer, commercial kitchen, vendor space, or other property described in Section 2.',
    '"Rental Period" is the booked window shown in the transaction summary.',
    '"Booking Record" is the frozen booking stored by Vendibook, including dates, rate, fees, deposit, and fulfillment selection.',
    '"Check-in" and "Check-out" are the condition records created at the start and end of the Rental Period.',
  ]);

  doc.heading('2. Rental asset or space');
  fc.add('asset_details', 'Host', 'text', doc.blockField('Rental asset details recorded in the listing', 64), 'Asset details', false);
  fc.add('asset_location', 'Host', 'text', doc.summaryField('Location or service area'), 'Location', false);

  doc.heading('3. Booking terms');
  fc.add('booking_terms', 'Host', 'text', doc.blockField('Dates, rate, fees, deposit, add-ons, and access method from the booking record', 78), 'Booking terms', false);
  fc.add('host_rules', 'Host', 'text', doc.blockField('Listing-specific host rules', 64), 'Host rules', false);
  fc.add('cancellation_policy', 'Host', 'text', doc.blockField('Cancellation terms frozen with this booking', 60), 'Cancellation policy', false);

  doc.heading('4. Host representations');
  doc.bullets([
    'Host has the authority to rent the Rental Asset.',
    'The listing is materially accurate and not intentionally misleading.',
    'Material limitations known to Host have been disclosed.',
    'Host will provide the access, space, or equipment agreed in the booking record.',
  ]);

  doc.heading('5. Renter eligibility and authorized users');
  doc.bullets([
    'Renter has the legal capacity to enter this agreement.',
    'Identity, contact, business, and intended-use information provided by Renter is accurate.',
    'Only authorized operators or users identified to Host may use the Rental Asset where the listing requires it.',
    'Renter may not assign or sublease the booking without Host\u2019s written consent.',
  ]);

  doc.heading('6. Permitted use');
  doc.bullets([
    'The Rental Asset may be used only for the lawful purpose agreed between the parties.',
    'Listing-specific restrictions recorded above apply to this booking.',
    'Unlawful or reckless use is prohibited.',
    'Alterations require Host\u2019s prior written consent.',
    'Where the Rental Asset is a vehicle or trailer, it may be operated or towed only by persons legally qualified to do so.',
  ]);

  doc.heading('7. Licenses, permits, health, fire, and code obligations');
  doc.paragraph('Permit, health, fire, and code obligations depend on the jurisdiction and the agreed use. Renter is responsible for the obligations assigned to Renter unless the booking record expressly says otherwise. No permit or license is included with this booking unless the listing expressly says it is.');
  fc.add('permit_allocation', 'Host', 'text', doc.blockField('Permit or license allocation recorded for this booking', 56), 'Permit allocation', false);

  doc.heading('8. Insurance');
  fc.add('insurance_terms', 'Host', 'text', doc.blockField('Insurance requirement and status from the booking and listing', 64), 'Insurance', false);
  doc.paragraph('Insurance documents or attestations collected through Vendibook are records provided by the parties. They are not a Vendibook guarantee that coverage exists, is current, or applies to a given loss.');

  doc.heading('9. Condition and check-in');
  doc.paragraph('Pre-existing condition should be documented at check-in, including photos where the listing or booking requires them. Renter has the opportunity to note discrepancies in the check-in condition report before use begins.');

  doc.heading('10. Care, damage, and loss');
  doc.bullets([
    'Renter will take reasonable care of the Rental Asset.',
    'Ordinary wear and tear is distinguished from damage.',
    'Damage or loss should be documented with photos and written notes.',
    'No charge amount is imposed by this form. Responsibility is determined by the booking terms, the evidence, applicable law, and the Vendibook dispute process.',
  ]);

  doc.heading('11. Vehicle and trailer terms (when the rental asset is mobile equipment)');
  doc.bullets([
    'Only licensed and legally qualified drivers or towing operators may operate the Rental Asset.',
    'Operation while impaired, or reckless operation, is prohibited.',
    'Mileage, hour, fuel, charging, and towing limits apply only where the listing or booking records them; any such terms appear below.',
    'Accidents, theft, and mechanical incidents must be reported promptly to Host and Vendibook.',
  ]);
  fc.add('vehicle_terms', 'Host', 'text', doc.blockField('Mileage, fuel, charging, or towing terms recorded for this listing', 56), 'Vehicle terms', false);

  doc.heading('12. Kitchen and vendor-space terms (when the rental asset is a fixed space)');
  doc.bullets([
    'Access hours and facility rules recorded in the listing apply.',
    'Cleaning and sanitation obligations apply as recorded in the listing.',
    'Renter is responsible for food-safety compliance applicable to Renter\u2019s operation.',
    'Shared equipment and shared access rules recorded in the listing apply.',
  ]);
  fc.add('space_terms', 'Host', 'text', doc.blockField('Access, cleaning, and facility terms recorded for this listing', 56), 'Space terms', false);

  doc.heading('13. Payment');
  doc.paragraph('The amount due is the amount recorded in the booking record. Where payment is processed online, PayPal processes it under PayPal\u2019s own terms. This agreement does not create an escrow arrangement and does not promise payment protection for this booking.');

  doc.heading('14. Cancellation, refunds, and no-show');
  doc.paragraph('Cancellation, refund, and no-show handling follows the policy frozen with this booking and the Vendibook Payments Terms. No penalty is created by this form.');

  doc.heading('15. Pickup, delivery, and access');
  fc.add('fulfillment_details', 'Host', 'text', doc.blockField('Pickup, delivery, or access details for this booking', 70), 'Fulfillment details', false);
  doc.paragraph('Live location tracking is available only while Delivery Mode is active and the participant has granted permission.');

  doc.heading('16. Rental period, return, and check-out');
  fc.add('return_terms', 'Host', 'text', doc.blockField('Return time, location, and instructions recorded for this booking', 64), 'Return terms', false);
  doc.paragraph('Fuel, cleaning, and mileage requirements apply only where they are recorded in the listing or booking. Condition should be documented at check-out.');

  doc.heading('17. Incidents');
  doc.paragraph('Renter will promptly notify Host and Vendibook of any accident, theft, injury, damage, mechanical failure, code or safety incident, or other material issue involving the Rental Asset.');

  doc.heading('18. Disputes and evidence');
  doc.paragraph('Messages, the booking snapshot, this signed agreement, condition reports, photos, tracking events, and support records may be used as evidence. No single location point or uploaded file automatically determines liability.');

  doc.heading('19. Electronic records and signatures');
  doc.bullets(ESIGN);

  doc.heading('20. Platform role and limitations');
  doc.bullets(PLATFORM_ROLE);

  doc.heading('21. Signatures');
  signatureBlock(doc, fc, 'Renter', 'Host');

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

function conditionChecklist(doc: PdfDoc, fc: FieldCollector, role: string, prefix: string) {
  doc.heading('Condition checklist');
  doc.paragraph('Complete only the sections that apply to this rental asset. Sections that do not apply may be left blank.');
  doc.paragraph('Mobile equipment (food truck, trailer, or towed unit): exterior, tires and wheels, lights, hitch or coupler, interior, kitchen equipment, water and plumbing, electrical or generator, refrigeration, and the visible status of any fire-suppression equipment.');
  fc.add(`${prefix}_vehicle_checklist`, role, 'text', doc.blockField('Mobile equipment condition notes', 78), 'Mobile equipment notes', false);
  doc.paragraph('Fixed kitchen or vendor space: access condition, utilities, included equipment, cleanliness, storage and access areas, and visible pre-existing damage.');
  fc.add(`${prefix}_space_checklist`, role, 'text', doc.blockField('Fixed space condition notes', 78), 'Fixed space notes', false);
  doc.paragraph('This is a condition record created by the parties. It is not a professional safety, mechanical, or code inspection.');
}

function buildRentalCheckin(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Rental Check-in Condition Report', version: SPEC_VERSIONS.rental_checkin_condition_report });
  const fc = new FieldCollector();

  header(doc, fc, 'Rental Check-in Condition Report', 'Completed at the start of the rental period. Not attorney-approved.', 'Host', [
    'Booking reference',
    'Listing title',
    'Renter name',
    'Host name',
    'Check-in date and time',
    'Location or access mode',
  ]);

  doc.heading('1. Starting record');
  fc.add('checkin_existing_damage', 'Renter', 'text', doc.blockField('Existing damage and condition notes at check-in', 70), 'Existing damage', false);
  fc.add('checkin_cleanliness', 'Renter', 'text', doc.summaryField('Cleanliness at check-in'), 'Cleanliness', false);
  fc.add('checkin_keys', 'Host', 'text', doc.summaryField('Keys or access devices provided'), 'Keys and access', false);
  fc.add('checkin_meters', 'Host', 'text', doc.summaryField('Fuel, charge, mileage, or hours (only if applicable)'), 'Meters', false);
  fc.add('checkin_included_equipment', 'Host', 'text', doc.blockField('Included equipment at check-in', 56), 'Included equipment', false);
  fc.add('checkin_known_issues', 'Host', 'text', doc.blockField('Known non-working items disclosed at check-in', 56), 'Known issues', false);
  fc.add('checkin_photo_references', 'Renter', 'text', doc.blockField('Photo references', 44), 'Photo references', false);

  conditionChecklist(doc, fc, 'Renter', 'checkin');
  signatureBlock(doc, fc, 'Renter', 'Host');
  return { pdf: doc.build(), fields: fc.fields };
}

function buildRentalCheckout(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Rental Check-out Condition Report', version: SPEC_VERSIONS.rental_checkout_condition_report });
  const fc = new FieldCollector();

  header(doc, fc, 'Rental Check-out Condition Report', 'Completed at return or end of access. Not attorney-approved.', 'Host', [
    'Booking reference',
    'Listing title',
    'Renter name',
    'Host name',
    'Return date and time',
    'Return location or access mode',
  ]);

  doc.heading('1. Return record');
  fc.add('checkout_keys_returned', 'Host', 'text', doc.summaryField('Keys or access devices returned'), 'Keys returned', false);
  fc.add('checkout_meters', 'Host', 'text', doc.summaryField('Ending fuel, charge, mileage, or hours (only if applicable)'), 'Ending meters', false);
  fc.add('checkout_new_damage', 'Host', 'text', doc.blockField('New damage or issues reported at return', 70), 'New damage', false);
  fc.add('checkout_cleaning_notes', 'Host', 'text', doc.blockField('Cleaning and condition notes', 56), 'Cleaning notes', false);
  fc.add('checkout_incident_references', 'Host', 'text', doc.blockField('Incident references recorded during the rental', 44), 'Incident references', false);
  fc.add('checkout_photo_references', 'Renter', 'text', doc.blockField('Photo references', 44), 'Photo references', false);

  conditionChecklist(doc, fc, 'Renter', 'checkout');

  doc.heading('2. Party comments');
  fc.add('checkout_host_comments', 'Host', 'text', doc.blockField('Host comments', 56), 'Host comments', false);
  fc.add('checkout_renter_comments', 'Renter', 'text', doc.blockField('Renter comments', 56), 'Renter comments', false);
  fc.add('checkout_unresolved', 'Host', 'text', doc.summaryField('Unresolved issue at check-out (yes / no)'), 'Unresolved issue', false);
  doc.paragraph('No charge is imposed by this form. Any claim follows the booking terms, the evidence, applicable law, and the Vendibook dispute process.');

  signatureBlock(doc, fc, 'Renter', 'Host');
  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */
/* F. Transaction amendment                                            */
/* ------------------------------------------------------------------ */

function buildAmendment(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Transaction Amendment', version: SPEC_VERSIONS.transaction_amendment });
  const fc = new FieldCollector();

  header(doc, fc, 'Vendibook Transaction Amendment', 'Used only when the parties formally change a material term after signing. Not attorney-approved.', 'Party A', [
    'Amendment version',
    'Order or booking reference',
    'Original agreement reference',
    'Original agreement date',
    'First party',
    'Second party',
    'Effective date of this amendment',
  ]);

  doc.heading('1. Term being changed');
  fc.add('original_term', 'Party A', 'text', doc.blockField('Exact original term', 78), 'Original term', false);
  fc.add('replacement_term', 'Party A', 'text', doc.blockField('Exact replacement or new term', 78), 'Replacement term', false);
  fc.add('amendment_reason', 'Party A', 'text', doc.blockField('Reason or notes', 56), 'Reason', false);

  doc.heading('2. Effect of this amendment');
  doc.bullets([
    'This amendment changes only the term identified above.',
    'All other provisions of the original signed agreement remain in effect.',
    'The original signed agreement is not altered or replaced by this amendment; both documents are read together.',
  ]);

  doc.heading('3. Electronic records and signatures');
  doc.bullets(ESIGN);

  signatureBlock(doc, fc, 'Party A', 'Party B');
  return { pdf: doc.build(), fields: fc.fields };
}

/* ------------------------------------------------------------------ */
/* G. Delivery handoff acknowledgment                                  */
/* ------------------------------------------------------------------ */

function buildDeliveryHandoff(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Delivery Handoff Acknowledgment', version: SPEC_VERSIONS.delivery_handoff_acknowledgment });
  const fc = new FieldCollector();

  header(doc, fc, 'Delivery Handoff Acknowledgment', 'Signed when the seller or host personally delivers the asset. Not attorney-approved.', 'Provider', [
    'Order or booking reference',
    'Listing title',
    'Delivering party',
    'Receiving party',
    'Delivery date and time',
    'Delivery address or area',
  ]);

  doc.heading('1. Delivery record');
  fc.add('delivery_items', 'Provider', 'text', doc.blockField('Items, keys, and documents delivered', 56), 'Delivered items', false);
  fc.add('delivery_condition', 'Recipient', 'text', doc.blockField('Condition observed at delivery', 70), 'Condition at delivery', false);
  fc.add('delivery_exceptions', 'Recipient', 'text', doc.blockField('Exceptions or discrepancies noted by the receiving party', 56), 'Exceptions', false);
  fc.add('delivery_photo_references', 'Provider', 'text', doc.blockField('Photo references', 44), 'Photo references', false);

  doc.heading('2. Acknowledgments');
  doc.bullets([
    'The delivery described above took place and the receiving party took possession.',
    'Condition was reviewed to the extent indicated in this document.',
    'Any exceptions noted above remain part of the transaction record.',
    'This acknowledgment does not by itself transfer legal title or ownership registration.',
    'This acknowledgment does not waive rights that cannot be waived under applicable law.',
    'Location or tracking data alone is not a substitute for this signed record.',
  ]);

  signatureBlock(doc, fc, 'Recipient', 'Provider');
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
  rental_agreement: '2026-09-18',
  sale_handoff_condition_acknowledgment: '2026-09-18-A',
  rental_checkin_condition_report: '2026-09-18',
  rental_checkout_condition_report: '2026-09-18',
  transaction_amendment: '2026-09-18',
  delivery_handoff_acknowledgment: '2026-09-18',
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
    roles: ['Host', 'Renter'],
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
    roles: ['Host', 'Renter'],
    build: buildRentalCheckin,
  },
  rental_checkout_condition_report: {
    kind: 'rental_checkout_condition_report',
    version: SPEC_VERSIONS.rental_checkout_condition_report,
    documentName: 'Vendibook Rental Check-out Condition Report',
    roles: ['Host', 'Renter'],
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
    roles: ['Recipient', 'Provider'],
    build: buildDeliveryHandoff,
  },
};

export function getTemplateSpec(kind: TemplateKind): TemplateSpec {
  const spec = (TEMPLATE_SPECS as Record<string, TemplateSpec | undefined>)[kind];
  if (!spec) throw new Error(`no template spec for kind: ${kind}`);
  return spec;
}
