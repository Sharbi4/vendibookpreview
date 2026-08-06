/**
 * Single registry of plain-language field help used across the listing wizard.
 * One entry per term — never duplicate a tooltip inline in a component.
 */
export const FIELD_HELP = {
  kitchenBuildYear: {
    label: 'Kitchen build year',
    text: 'The year the interior kitchen was installed or converted. This may be different from the vehicle or trailer model year.',
  },
  modelYear: {
    label: 'Model year',
    text: 'The manufacturer model year of the vehicle or trailer chassis itself.',
  },
  operationalStatus: {
    label: 'Operational status',
    text: 'Tell buyers whether the unit currently works as intended and what repairs or local approvals may still be needed.',
  },
  condition: {
    label: 'Condition',
    text: 'Your honest overall assessment. Buyers compare this against your photos and disclosures, so understating problems leads to cancelled deals.',
  },
  titleStatus: {
    label: 'Title status',
    text: 'The legal ownership document for a titled asset. A clean title has no damage history; salvage or rebuilt titles mean the unit was previously declared a total loss.',
  },
  lien: {
    label: 'Lien',
    text: 'A lien means a lender still has a legal claim on the asset. It can usually still be sold, but the loan must be paid off before ownership transfers.',
  },
  turnkey: {
    label: 'Turnkey',
    text: 'Turnkey means a buyer could begin operating with little or no additional work, beyond their own local permits and licensing.',
  },
  asIs: {
    label: 'As-is',
    text: 'As-is means the buyer accepts the equipment in its current condition, with no warranty from you after the sale.',
  },
  generatorWattage: {
    label: 'Generator wattage',
    text: 'The continuous output your onboard generator can supply. Higher wattage supports more simultaneous equipment.',
  },
  shorePower: {
    label: 'Shore power',
    text: 'An external electrical hookup that powers the unit from a building or pedestal instead of the onboard generator.',
  },
  freshGrayWater: {
    label: 'Fresh and gray water',
    text: 'Fresh water is the clean supply tank; gray water is the waste tank. Many health departments require the gray tank to be larger than the fresh tank.',
  },
  fireSuppression: {
    label: 'Fire suppression',
    text: 'The hood-mounted system that automatically discharges over the cooking line. Most jurisdictions require a current inspection tag.',
  },
  knownIssues: {
    label: 'Known issues',
    text: 'Anything currently broken, worn or non-compliant that you are aware of. Disclosing issues up front protects you and reduces cancelled deals.',
  },
  itemsIncluded: {
    label: 'Items included',
    text: 'The equipment and accessories a buyer receives for the advertised price. Be specific about anything you plan to keep.',
  },
  cityStateZip: {
    label: 'City, state and ZIP',
    text: 'Only the general city, state and ZIP appear publicly. Your complete street address stays private until a transaction is confirmed.',
  },
  vendibookDelivery: {
    label: 'VendiBook Delivery',
    text: 'For eligible listings, VendiBook can arrange freight transport. Eligibility, timing and cost are quoted per booking — nothing is guaranteed until a quote is confirmed.',
  },
  priceNegotiable: {
    label: 'Price negotiable',
    text: 'Shows buyers you are open to reasonable offers. Your asking price still appears as the headline number.',
  },
  minimumOffer: {
    label: 'Private minimum offer',
    text: 'A private floor used to filter offers. Buyers never see this amount.',
  },
  sellerDelivery: {
    label: 'Seller delivery',
    text: 'You transport the equipment yourself within a radius you choose, for a fee you set.',
  },
} as const;

export type FieldHelpKey = keyof typeof FIELD_HELP;
