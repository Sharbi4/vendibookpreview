/**
 * GA4 reads event parameters named source / medium / campaign / term /
 * content (and their campaign_* forms) as traffic-source overrides. Our own
 * UI events pass `source: 'search_page' | 'listing_price_line' | ...`, which
 * re-attributed sessions to internal buttons (GA4 showed "search_page / (not
 * set)" and "listing_price_line / (not set)" as top sources). Every gtag
 * 'event' call goes through this so those keys are sent as ui_* instead.
 */
const RESERVED_TRAFFIC_KEYS: Record<string, string> = {
  source: 'ui_source',
  medium: 'ui_medium',
  campaign: 'ui_campaign',
  term: 'ui_term',
  content: 'ui_content',
  campaign_id: 'ui_campaign_id',
  campaign_source: 'ui_campaign_source',
  campaign_medium: 'ui_campaign_medium',
  campaign_name: 'ui_campaign_name',
  campaign_term: 'ui_campaign_term',
  campaign_content: 'ui_campaign_content',
};

export function toGa4EventParams<T extends Record<string, unknown>>(params: T | undefined | null): Record<string, unknown> {
  if (!params) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    out[RESERVED_TRAFFIC_KEYS[key] ?? key] = value;
  }
  return out;
}
