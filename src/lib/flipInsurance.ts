// Public partner configuration. No insurance purchase or verification happens here.
export const FLIP_INSURANCE = {
  enabled: true,
  partnerUrl: 'https://app.fliprogram.com/events/16206',
  ownerUrl: 'https://app.fliprogram.com/events/16206',
  logoUrl: '/partners/flip-logo.png',
  resources: [
    { title: 'Food truck permits & licenses', description: 'Plan the questions to ask before you start operating.', url: 'https://www.fliprogram.com/blog/permits-and-licenses-required-for-a-food-truck-business' },
    { title: 'Equipment & supplies guide', description: 'Build a practical checklist for your mobile kitchen.', url: 'https://www.fliprogram.com/blog/food-truck-equipment-and-supplies-guide' },
    { title: 'Policies, certificates & coverage', description: 'Find answers directly from FLIP.', url: 'https://www.fliprogram.com/faq' },
  ],
} as const;
