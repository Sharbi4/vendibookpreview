// Filters listing_views rows down to real buyer views so seller-facing
// counts (digests, insights) aren't inflated.
//
// Excluded:
//  - bot/crawler user agents;
//  - known scraper agents. On 2026-10-05 the Chrome/119 agent below was 3,700
//    of 4,843 "human" view sessions in 30 days: one view per session, never
//    logged in, around the clock. docs/growth/liquidity-scorecard.sql detects
//    these generically; add new offenders here;
//  - the seller viewing their own listing.

export const BOT_UA_RE = /(bot|crawl|spider|headless|facebookexternalhit|meta-external|python|curl|lighthouse)/i

export const KNOWN_SCRAPER_UAS = new Set<string>([
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
])

export interface ListingViewRow {
  listing_id: string
  viewer_id?: string | null
  user_agent?: string | null
}

export function isRealListingView(row: ListingViewRow, hostId: string): boolean {
  const ua = row.user_agent || ''
  if (BOT_UA_RE.test(ua)) return false
  if (KNOWN_SCRAPER_UAS.has(ua)) return false
  if (row.viewer_id && row.viewer_id === hostId) return false
  return true
}
