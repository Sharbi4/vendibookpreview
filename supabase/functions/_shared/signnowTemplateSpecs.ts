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
    `By signing below, each party confirms they have reviewed this document, that the transaction details shown are the details they agreed to, and that they are signing on their own behalf or with authority to bind the entity named.`,
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

function buildPurchaseSaleAgreement(): { pdf: Uint8Array; fields: SignNowFieldDef[] } {
  const doc = new PdfDoc({ title: 'Purchase & Sale Agreement', version: SPEC_VERSIONS.purchase_sale_agreement });
  const fc = new FieldCollector();

  header(doc, fc, 'Vendibook Purchase & Sale Agreement', 'Prepared from the Vendibook order record. Not attorney-approved; parties should obtain independent advice.', 'Seller', [
    'Agreement version',
    'Order reference',
    'Effective date',
    'Listing title',
    'Asset category',
    'Seller name',
    'Buyer name',
    'Purchase price',
    'Taxes collected',
    'Delivery or freight charge',
    'Total transaction amount',
    'Fulfillment method',
    'Transaction area',
  ]);

  doc.heading('1. Parties and definitions');
  doc.bullets([
    '"Seller" is the party offering the Asset for sale through the Vendibook listing identified above.',
    '"Buyer" is the party purchasing the Asset through the Vendibook order identified above.',
    '"Asset" is the equipment, vehicle, trailer, or other property described in Section 2 and in the listing snapshot attached to the order.',
    '"Listing" is the Vendibook listing as it existed when the order was created.',
    '"Transaction Record" is the frozen order record stored by Vendibook, including agreed price, fees, taxes, fulfillment selection, and accepted offer where one applies.',
    '"Handoff" is the pickup, delivery, or freight release event through which possession of the Asset passes to Buyer.',
  ]);

  doc.heading('2. Asset description');
  doc.paragraph('The following details come from the listing and transaction record. Fields left blank were not provided and are not represented by either party or by Vendibook.');
  for (const label of ['Year', 'Make', 'Model', 'Identifying number (VIN or serial), if recorded', 'Category', 'Dimensions, if recorded', 'Mileage or hours, if recorded']) {
    const name = 'asset_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    fc.add(name, 'Seller', 'text', doc.summaryField(label), label, false);
  }
  fc.add('asset_included_equipment', 'Seller', 'text', doc.blockField('Included equipment and add-ons recorded for this transaction', 64), 'Included equipment', false);

  doc.heading('3. Purchase price and transaction terms');
  doc.paragraph('The amounts below are taken from the frozen transaction record at the time this document was generated. Where Buyer and Seller agreed a negotiated offer, the accepted offer amount is the agreed asset price.');
  fc.add('price_breakdown', 'Seller', 'text', doc.blockField('Agreed price, accepted offer, add-ons, delivery or freight, tax, and total', 78), 'Price breakdown', false);
  doc.paragraph('Where payment is processed online, PayPal processes the payment. PayPal is a payment processor. PayPal is not an escrow agent for this transaction, and this agreement does not create an escrow arrangement.');
  fc.add('financing_note', 'Seller', 'text', doc.summaryField('Financing provider, if Buyer applied through one'), 'Financing', false);

  doc.heading('4. Seller representations');
  doc.paragraph('Seller represents, to the best of Seller\u2019s knowledge and subject to applicable law, that:');
  doc.bullets([
    'Seller has the authority to sell and transfer the Asset.',
    'The listing information is materially accurate and is not intentionally misleading.',
    'Material defects or damage known to Seller have been disclosed in the listing, in messages, or in the disclosure field below.',
    'Material liens or encumbrances known to Seller that would prevent lawful transfer have been disclosed.',
    'The Asset is not, to Seller\u2019s knowledge, stolen, counterfeit, or otherwise prohibited property.',
    'Seller will provide the transfer documents Seller is legally obligated to provide or has agreed in the transaction record to provide.',
  ]);
  doc.paragraph('Vendibook does not independently verify these representations.');
  fc.add('seller_disclosures', 'Seller', 'text', doc.blockField('Seller disclosures for this transaction', 64), 'Seller disclosures', false);

  doc.heading('5. Buyer due diligence');
  doc.paragraph('Buyer acknowledges having had the opportunity to:');
  doc.bullets([
    'review the listing, photos, and specifications;',
    'ask Seller questions through Vendibook messages;',
    'schedule an optional live video walkthrough where the Seller offers one;',
    'obtain an independent mechanical or professional inspection at Buyer\u2019s expense;',
    'inspect identifying numbers and ownership or title documentation where applicable;',
    'research permit, licensing, and registration requirements for Buyer\u2019s intended use.',
  ]);
  doc.paragraph('A Vendibook video walkthrough, a profile badge, a connected PayPal account, or a Vendibook listing review is not a professional inspection, appraisal, title opinion, or guarantee of condition or ownership.');

  doc.heading('6. Condition and warranties');
  doc.paragraph('Condition is established by the listing snapshot, any written disclosures in the transaction record, and the handoff record created by the parties. The clause below reflects what the parties actually selected in this transaction. Where a written warranty was offered by Seller, its actual terms appear below. Rights that cannot be waived under applicable law are not waived by this document.');
  fc.add('condition_clause', 'Seller', 'text', doc.blockField('Condition and warranty terms for this transaction', 78), 'Condition clause', false);

  doc.heading('7. Title, ownership, and liens');
  fc.add('title_status', 'Seller', 'text', doc.summaryField('Recorded title or ownership status, if stored'), 'Title status', false);
  doc.bullets([
    'Seller will provide the ownership transfer documentation Seller is legally obligated or has agreed to provide.',
    'Buyer is responsible for completing any government registration or titling steps that apply to Buyer.',
    'Vendibook is not a title company, department of motor vehicles, or legal advisor.',
    'A signed Vendibook agreement does not replace a state title certificate, lien release, notarized form, or government filing where one is separately required.',
  ]);

  doc.heading('8. Payment');
  doc.bullets([
    'Eligible online payments are processed by PayPal under PayPal\u2019s own terms.',
    'PayPal controls the payment credentials and the funding sources shown at checkout.',
    'Vendibook does not store full card numbers.',
    'Payment disputes and chargebacks raised with PayPal are handled under PayPal\u2019s rules.',
    'PayPal Purchase Protection applies only to eligible transactions. PayPal\u2019s current U.S. terms exclude vehicles. Buyers should review PayPal\u2019s current terms before purchasing a food truck or trailer.',
  ]);

  doc.heading('9. Financing');
  doc.bullets([
    'Any financing is provided by a third-party provider, not by Vendibook.',
    'Approval, rates, fees, and terms are controlled by that provider.',
    'A financing approval is not a verification of the Asset\u2019s condition, ownership, title, or value.',
  ]);

  doc.heading('10. Fulfillment and handoff');
  doc.paragraph('The fulfillment terms actually selected for this order appear below.');
  fc.add('fulfillment_details', 'Seller', 'text', doc.blockField('Fulfillment details for this order', 78), 'Fulfillment details', false);
  doc.bullets([
    'For pickup, the parties coordinate the exact handoff location and timing through Vendibook, and Buyer should inspect the Asset at handoff.',
    'For seller delivery, live location may be available only while Delivery Mode is active and permitted by the driver. Location data does not by itself prove legal acceptance or transfer of ownership.',
    'For freight, any carrier arrangement is described in the transaction record and the carrier\u2019s own terms may apply. Vendibook is not the carrier unless a specific Vendibook freight service is expressly documented for this order.',
  ]);

  doc.heading('11. Inspection and handoff record');
  doc.bullets([
    'Buyer should inspect the Asset at handoff where reasonably possible.',
    'Material discrepancies should be documented promptly, in writing, through Vendibook.',
    'Photos, messages, and condition records may be used as transaction evidence.',
    'Signing a handoff acknowledgment does not waive rights that cannot be waived under applicable law.',
  ]);

  doc.heading('12. Cancellation, refunds, and disputes');
  doc.paragraph('Cancellation and refund handling follows the policy frozen with this order and the Vendibook Payments Terms. This agreement does not promise an automatic refund. Disputes or chargebacks raised with PayPal are decided by PayPal under PayPal\u2019s rules.');

  doc.heading('13. Taxes, registration, permits, and compliance');
  doc.paragraph('Taxes, registration obligations, permits, and operating compliance are allocated according to applicable law and the actual terms of this transaction. Vendibook does not provide tax, legal, or regulatory advice.');

  doc.heading('14. Electronic records and signatures');
  doc.bullets(ESIGN);

  doc.heading('15. Communications and records');
  doc.paragraph('The parties should keep material messages and changes inside Vendibook. Transaction records may be retained for operations, dispute handling, fraud prevention, and legal or accounting requirements.');

  doc.heading('16. Platform role and limitations');
  doc.bullets(PLATFORM_ROLE);

  doc.heading('17. Incorporated documents');
  doc.bullets([
    'The frozen order and transaction record for this purchase.',
    'The Vendibook Terms of Service, Payments Terms, Privacy Policy, and Marketplace Rules in effect for this order.',
    'Any signed Vendibook transaction amendment for this order.',
    'Any signed handoff or condition acknowledgment for this order.',
  ]);

  doc.heading('18. Signatures');
  signatureBlock(doc, fc, 'Buyer', 'Seller');

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

  header(doc, fc, 'Sale Handoff & Condition Acknowledgment', 'Signed by Buyer and Seller at or near handoff. Not attorney-approved.', 'Seller', [
    'Order reference',
    'Listing title',
    'Buyer name',
    'Seller name',
    'Handoff date and time',
    'Fulfillment type',
    'Handoff location',
    'Identifying number (VIN or serial), if recorded',
    'Odometer or hours at handoff, if applicable',
  ]);

  doc.heading('1. Items transferred');
  fc.add('keys_and_documents', 'Seller', 'text', doc.blockField('Keys, remotes, manuals, and documents transferred', 56), 'Keys and documents', false);
  fc.add('title_documents', 'Seller', 'text', doc.blockField('Ownership or title documents presented or transferred', 56), 'Title documents', false);
  fc.add('included_equipment', 'Seller', 'text', doc.blockField('Included equipment checklist from the order record', 64), 'Included equipment', false);

  doc.heading('2. Condition review');
  doc.paragraph('This is a record of what the parties observed at handoff. It is not a professional mechanical, structural, or safety inspection, and it is not an appraisal or a title opinion.');
  fc.add('buyer_discrepancies', 'Buyer', 'text', doc.blockField('Discrepancies or concerns reported by Buyer', 70), 'Buyer discrepancies', false);
  fc.add('seller_comments', 'Seller', 'text', doc.blockField('Seller comments', 56), 'Seller comments', false);
  fc.add('photo_references', 'Seller', 'text', doc.blockField('Photo or condition-record references', 44), 'Photo references', false);

  doc.heading('3. Acknowledgments');
  doc.bullets([
    'The parties met, or the delivery described above occurred.',
    'The Asset was reviewed to the extent indicated in this document.',
    'Any discrepancies listed above remain part of the transaction record.',
    'This acknowledgment does not by itself transfer legal title or ownership registration.',
    'This acknowledgment does not waive rights that cannot be waived under applicable law.',
    'Status updates or location data alone are not a substitute for this signed record.',
  ]);

  signatureBlock(doc, fc, 'Buyer', 'Seller');
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
  purchase_sale_agreement: '2026-09-18',
  rental_agreement: '2026-09-18',
  sale_handoff_condition_acknowledgment: '2026-09-18',
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
