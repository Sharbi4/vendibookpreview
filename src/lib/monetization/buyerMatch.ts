/**
 * BuyerMatch copy, shared by the Pricing page, the dashboard and the membership page.
 * Describes only what the service does in code: team review, research of public
 * buying intent, permission-based outreach, verified activity and tracked links.
 * Vendibook is never the broker, agent or party to the sale and never holds funds.
 */
export const BUYERMATCH_BENEFITS = [
  { title: 'Someone looks for your buyer', body: 'Our team searches for people posting that they want a food truck, trailer or cart like yours, using the area and budget you set.' },
  { title: 'Contact only with permission', body: 'No buyer is messaged until outreach is approved and documented. Each attempt is logged with where and when it happened.' },
  { title: 'Every count is a real record', body: 'Buyers found, contacted and replied are counted from verified records only. Replies go to your Vendibook messages.' },
  { title: 'Your Pro tools stay included', body: 'Featured Boost credits, priority visibility, PricePilot and PermitPath Plus. Separately purchased services stay separate.' },
] as const;

export const BUYERMATCH_DISCLOSURE = 'A search starts after team review and depends on capacity. No buyer, offer or sale is guaranteed. Any sale is between you and the buyer.';
