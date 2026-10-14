export interface CampaignEvent {
  id: string; campaign_id: string; event_type: string; occurred_at: string;
  source: string; verification_status: string; outcome?: string; next_step?: string; feedback?: string;
}
export const EVENT_LABELS: Record<string, string> = {
  platform_researched: 'Platform researched', buyer_opportunity_identified: 'Buyer opportunity identified',
  outreach_proposed: 'Outreach awaiting approval', outreach_approved: 'Outreach approved',
  outreach_sent: 'Outreach sent', delivery_confirmed: 'Delivery confirmed',
  buyer_response_received: 'Buyer response received', inquiry_qualified: 'Inquiry qualified',
  follow_up_recommended: 'Follow-up recommended',
};
export const CAMPAIGN_STATUS: Record<string, string> = {
  pending_activation: 'Pending review', approved: 'Approved', researching: 'Active',
  paused: 'Paused', completed: 'Completed', rejected: 'Rejected',
};
export function campaignMetrics(events: CampaignEvent[]) {
  const unique = [...new Map(events.map(e => [e.id, e])).values()];
  const count = (type: string) => unique.filter(e => e.event_type === type && e.verification_status === 'verified').length;
  return {
    platforms: new Set(unique.filter(e => e.event_type === 'platform_researched' && e.verification_status === 'verified').map(e => e.source)).size,
    outreach: count('outreach_sent'), delivered: count('delivery_confirmed'), responses: count('buyer_response_received'),
    qualified: count('inquiry_qualified'), pending: unique.filter(e => e.event_type === 'outreach_proposed').length,
  };
}
export function listingRecommendations(listing: Record<string, unknown>) {
  const notes: string[] = [];
  if (!listing.cover_image_url) notes.push('Add a clear exterior cover photo.');
  if (!Array.isArray(listing.image_urls) || listing.image_urls.length < 4) notes.push('Add interior and equipment photos so buyers can inspect the setup.');
  if (String(listing.description ?? '').trim().length < 150) notes.push('Expand the description with condition, dimensions and operating history.');
  if (!String(listing.included_items ?? '').trim()) notes.push('Specify which equipment is included in the asking price.');
  if (!listing.price_sale) notes.push('Confirm an asking price before campaign review.');
  return notes;
}

/* ---------- Typed shapes read by the BuyerMatch dashboard (RLS: seller's own rows) ---------- */
export interface BuyerMatchConfig {
  is_admin: boolean; entitled: boolean; submissions_enabled: boolean;
  fulfillment_enabled: boolean; max_campaigns: number;
}
export interface BuyerMatchListing {
  id: string; title: string; cover_image_url?: string | null; price_sale?: number | string | null;
  city?: string | null; state?: string | null; description?: string | null;
  image_urls?: string[] | null; included_items?: string | null;
}
export interface BuyerMatchCampaign {
  id: string; listing_id: string; status: string; created_at: string; activated_at?: string | null;
  geography?: string; buyer_criteria?: string;
  listing_snapshot: BuyerMatchListing & Record<string, unknown>;
}
export interface BuyerMatchLink { id: string; campaign_id: string; listing_id: string; source: string; token: string; created_at: string }
export interface BuyerMatchReport { id: string; campaign_id: string; summary: string; published_at: string }
export interface BuyerMatchData {
  config: BuyerMatchConfig; campaigns: BuyerMatchCampaign[]; reports: BuyerMatchReport[];
  listings: BuyerMatchListing[]; events: CampaignEvent[]; links: BuyerMatchLink[];
}

/** Minimum photo set buyers ask for: exterior, serving window, kitchen line, equipment plates. */
export const MIN_LISTING_PHOTOS = 4;

export interface NextStep { label: string; detail: string; to?: string; action?: 'start_buyermatch' }
interface SignalInput { views30: number | null; saves: number | null; offersWaiting: number | null; conversations: number | null }

/**
 * One concrete next step for a sale listing, from the seller's own listing fields and
 * real activity counts. Never infers buyer intent that was not recorded.
 */
export function listingNextStep(listing: BuyerMatchListing, signals: SignalInput | undefined, opts: { entitled: boolean; inCampaign: boolean }): NextStep {
  const edit = `/dashboard/listings/${listing.id}/edit`;
  const waiting = signals?.offersWaiting ?? 0;
  if (waiting > 0) return { label: waiting === 1 ? 'Answer the offer' : `Answer ${waiting} offers`, detail: 'A buyer is waiting on your accept, counter or decline. Unanswered offers expire.', to: '/dashboard/offers' };
  const photos = Array.isArray(listing.image_urls) ? listing.image_urls.length : 0;
  if (photos < MIN_LISTING_PHOTOS) return { label: 'Add photos', detail: `${photos} of ${MIN_LISTING_PHOTOS} photos. Buyers look for the exterior, serving window, kitchen line and equipment plates.`, to: edit };
  if (String(listing.description ?? '').trim().length < 150) return { label: 'Finish the description', detail: 'Add condition, dimensions, miles or hours, and what was recently serviced.', to: edit };
  if (!String(listing.included_items ?? '').trim()) return { label: 'List the included equipment', detail: 'Name the fryer, flat-top, fridge, generator and anything else that conveys with the sale.', to: edit };
  if ((signals?.views30 ?? 0) >= 20 && signals?.saves === 0 && waiting === 0) return { label: 'Check your asking price', detail: `${signals?.views30} views and no saves in 30 days. Run your asking price through PricePilot.`, to: '/tools/pricepilot' };
  if (opts.entitled && !opts.inCampaign) return { label: 'Start a buyer search', detail: 'Send this listing to the BuyerMatch team. Nothing is sent to buyers until outreach is approved.', action: 'start_buyermatch' };
  return { label: 'View your listing', detail: 'Your listing has the photos and details buyers ask for.', to: `/listing/${listing.id}` };
}
