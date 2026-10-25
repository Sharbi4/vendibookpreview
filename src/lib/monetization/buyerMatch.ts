/**
 * BuyerMatch copy, shared by the Pricing page, the dashboard and the membership page.
 * Describes only what the service does in code: team review, research of public
 * buying intent, permission-based outreach, verified activity and tracked links.
 * Vendibook is never the broker, agent or party to the sale and never holds funds.
 */
export const BUYERMATCH_BENEFITS = [
  { title: 'We look for your next buyer or renter', body: 'Our team researches buyers and renters looking for equipment or space like yours, guided by your location, budget and listing details.' },
  { title: 'Contact only with permission', body: 'No buyer or renter is messaged until outreach is approved and documented. Each attempt is logged with where and when it happened.' },
  { title: 'Every count is a real record', body: 'Prospects found, contacted and replied are counted from verified records only. Replies go to your Vendibook messages.' },
  { title: 'Also included', body: 'Featured Boost credits, priority visibility, PricePilot and PermitPath Plus. Separately purchased services stay separate.' },
] as const;

export const BUYERMATCH_DISCLOSURE = 'A search starts after team review and depends on capacity. No matches, leads, sales or bookings are guaranteed.';
