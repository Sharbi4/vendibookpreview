// Seller email: "buyers are viewing your listing, here's what would get them
// to reach out." Sent through Resend by send-listing-fix-nudges.
// Owner rule 2026-10-06: never tell a seller their view count. `views` is
// kept in the data for the sender's audience filter only.
import { MK, FONT, esc, mkButton, marketingShell, SITE_URL } from "./brand.ts";
import type { ListingFix } from "../listingFixes.ts";

export const LISTING_FIX_CAMPAIGN_ID = "2026-10-listing-fix-nudge";

export interface ListingFixNudgeData {
  firstName: string | null;
  listingId: string;
  listingTitle: string;
  views: number;
  fixes: ListingFix[];
  unsubscribeUrl: string;
}

export const listingFixSubject = (_d?: Pick<ListingFixNudgeData, "views">) =>
  "Buyers are viewing your listing. Here's how to get them to reach out";

export function editListingUrl(listingId: string): string {
  return `${SITE_URL}/edit-listing/${encodeURIComponent(listingId)}?utm_source=email&utm_medium=campaign&utm_campaign=${LISTING_FIX_CAMPAIGN_ID}&utm_content=edit_cta`;
}

const SAFETY_NOTE =
  "Stay safe: take payment only through Vendibook checkout (Square or PayPal). Never accept wire transfers, gift cards or 'shipper' payments, and never share verification codes.";

export function buildListingFixNudgeHtml(d: ListingFixNudgeData): string {
  const p = `font-family:${FONT};font-size:15px;line-height:1.6;color:${MK.text};margin:0 0 14px;`;
  const hi = d.firstName ? `Hi ${esc(d.firstName)},` : "Hi there,";
  const items = d.fixes
    .map((f) => `<li style="margin:0 0 8px;">${esc(f.text)}</li>`)
    .join("");
  const bodyRows = `
<tr><td style="padding:16px 28px 8px;">
  <p style="${p}">${hi}</p>
  <p style="${p}">Your listing <strong>${esc(d.listingTitle)}</strong> has been getting buyer visits on Vendibook, but no messages yet.</p>
  <p style="${p}">${d.fixes.length === 1 ? "One change" : "A couple of changes"} usually turn${d.fixes.length === 1 ? "s" : ""} those visits into conversations:</p>
  <ul style="${p}padding-left:20px;">${items}</ul>
  <p style="margin:20px 0 24px;">${mkButton("Update my listing", editListingUrl(d.listingId))}</p>
  <p style="font-family:${FONT};font-size:13px;line-height:1.6;color:${MK.textMuted};margin:0 0 8px;">${esc(SAFETY_NOTE)}</p>
  <p style="${p}">Vendibook Concierge</p>
</td></tr>`;
  return marketingShell({
    title: listingFixSubject(d),
    preheader: "Buyers are looking. Here's what they still need to see.",
    bodyRows,
    unsubscribeUrl: d.unsubscribeUrl,
  });
}

export function buildListingFixNudgeText(d: ListingFixNudgeData): string {
  return [
    d.firstName ? `Hi ${d.firstName},` : "Hi there,",
    "",
    `Your listing "${d.listingTitle}" has been getting buyer visits on Vendibook, but no messages yet.`,
    "",
    "What usually turns those visits into conversations:",
    ...d.fixes.map((f) => `- ${f.text}`),
    "",
    `Update it here: ${editListingUrl(d.listingId)}`,
    "",
    SAFETY_NOTE,
    "",
    "Vendibook Concierge",
    "",
    `Unsubscribe: ${d.unsubscribeUrl}`,
  ].join("\n");
}
