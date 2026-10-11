/**
 * Rental branch: the terms a renter needs before booking. Category-aware —
 * static spaces never see mileage or towing questions.
 */

import type { SpecField } from './readiness';

export interface RentalTermsGroup {
  key: string;
  title: string;
  blurb: string;
  /** Categories this group applies to. Empty = all. */
  categories?: string[];
  fields: SpecField[];
}

const MOBILE = ['food_truck', 'food_trailer'];
const TOWED = ['food_trailer'];
const DRIVEN = ['food_truck'];

export const RENTAL_TERMS_GROUPS: RentalTermsGroup[] = [
  {
    key: 'rates',
    title: 'Rates and rental period',
    blurb: 'What it costs and how long a renter can keep it.',
    fields: [
      { key: 'daily_rate', label: 'Daily rate', type: 'number', unit: '$' },
      { key: 'weekly_rate', label: 'Weekly rate', type: 'number', unit: '$' },
      { key: 'monthly_rate', label: 'Monthly rate', type: 'number', unit: '$' },
      { key: 'min_period', label: 'Minimum rental period', type: 'text', placeholder: 'e.g. 1 day' },
      { key: 'max_period', label: 'Maximum rental period', type: 'text', placeholder: 'e.g. 3 months' },
      { key: 'availability_notes', label: 'Availability notes', type: 'textarea', help: 'Blocked dates are managed on your availability calendar.' },
    ],
  },
  {
    key: 'fees',
    title: 'Deposits and fees',
    blurb: 'Renters want the full cost up front, not at pickup.',
    fields: [
      { key: 'security_deposit', label: 'Security deposit', type: 'number', unit: '$' },
      { key: 'cleaning_fee', label: 'Cleaning fee', type: 'number', unit: '$' },
      { key: 'delivery_fee', label: 'Delivery fee', type: 'number', unit: '$' },
      { key: 'setup_fee', label: 'Setup fee', type: 'number', unit: '$' },
    ],
  },
  {
    key: 'usage_allowances',
    title: 'Mileage and generator allowances',
    blurb: 'Set the included usage so overage never becomes a dispute.',
    categories: MOBILE,
    fields: [
      { key: 'mileage_allowance', label: 'Mileage allowance', type: 'text', placeholder: 'e.g. 100 miles per day' },
      { key: 'mileage_excess_charge', label: 'Excess mileage charge', type: 'text', placeholder: 'e.g. $0.75 per mile' },
      { key: 'generator_hours_allowance', label: 'Generator hour allowance', type: 'text' },
      { key: 'generator_excess_charge', label: 'Excess generator hour charge', type: 'text' },
    ],
  },
  {
    key: 'consumables',
    title: 'Fuel, propane and cleaning',
    blurb: 'Who refills and who cleans.',
    fields: [
      { key: 'fuel_responsibility', label: 'Fuel responsibility', type: 'select', options: ['Renter refills', 'Included', 'Return as received', 'Not applicable'] },
      { key: 'propane_responsibility', label: 'Propane responsibility', type: 'select', options: ['Renter refills', 'Included', 'Return as received', 'Not applicable'] },
      { key: 'cleaning_expectations', label: 'Cleaning expectations', type: 'textarea' },
    ],
  },
  {
    key: 'handoff',
    title: 'Pickup and return',
    blurb: 'Times and late fees prevent end-of-rental confusion.',
    fields: [
      { key: 'pickup_time', label: 'Pickup time', type: 'text', placeholder: 'e.g. 8:00 AM' },
      { key: 'return_time', label: 'Return time', type: 'text', placeholder: 'e.g. 6:00 PM' },
      { key: 'late_fee', label: 'Late return fee', type: 'text' },
      { key: 'delivery_available', label: 'Delivery available', type: 'boolean' },
    ],
  },
  {
    key: 'operators',
    title: 'Who may drive or tow',
    blurb: 'Licensing and towing requirements for the renter.',
    categories: MOBILE,
    fields: [
      { key: 'driver_requirements', label: 'Driver requirements', type: 'textarea' },
      { key: 'tow_vehicle_requirements', label: 'Tow vehicle requirements', type: 'textarea' },
      { key: 'min_driver_age', label: 'Minimum driver age', type: 'number' },
    ],
  },
  {
    key: 'rules',
    title: 'Insurance and use rules',
    blurb: 'What is required and what is off limits.',
    fields: [
      { key: 'insurance_requirements', label: 'Insurance requirements', type: 'textarea' },
      { key: 'permitted_uses', label: 'Permitted uses', type: 'textarea' },
      { key: 'prohibited_uses', label: 'Prohibited uses', type: 'textarea' },
      { key: 'cooking_allowed', label: 'Food may be cooked on board', type: 'boolean' },
      { key: 'signage_modifications', label: 'Signage or wrap modifications allowed', type: 'select', options: ['Not allowed', 'Removable signage only', 'Allowed with approval'] },
    ],
  },
  {
    key: 'protection',
    title: 'Cancellation and inspection',
    blurb: 'Photo evidence at checkout and return protects both sides.',
    fields: [
      { key: 'cancellation_policy', label: 'Cancellation policy', type: 'textarea' },
      { key: 'checkout_inspection', label: 'Checkout inspection required', type: 'boolean' },
      { key: 'return_inspection', label: 'Return damage inspection required', type: 'boolean' },
      { key: 'photos_required', label: 'Before and after photos required', type: 'boolean' },
    ],
  },
];

export const rentalGroupsForCategory = (category?: string | null): RentalTermsGroup[] =>
  RENTAL_TERMS_GROUPS.filter(
    (g) => !g.categories || (category ? g.categories.includes(category) : true),
  ).map((g) => ({
    ...g,
    fields: g.fields.filter((f) => {
      if (f.key === 'tow_vehicle_requirements') return !category || TOWED.includes(category);
      if (f.key === 'driver_requirements') return !category || DRIVEN.includes(category);
      return true;
    }),
  }));
