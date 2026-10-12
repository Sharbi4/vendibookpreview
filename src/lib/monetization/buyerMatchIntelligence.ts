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