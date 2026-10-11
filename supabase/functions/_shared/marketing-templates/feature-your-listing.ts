// ─────────────────────────────────────────────────────────────
// Campaign: "Feature your listing" (2026-09)
//
// Seller-facing conversion email that deep-links straight into the
// EXISTING Featured Boost purchase flow (`boost-featured-30`) for one
// of the seller's own live, not-currently-featured listings.
//
// No new product, no new checkout — the CTA lands on My Listings with
// ?boost=<listing_id>, which auto-opens the existing PromoteListingModal.
// ─────────────────────────────────────────────────────────────
// deno-lint-ignore-file no-explicit-any

import {
  MK,
  FONT,
  esc,
  mkButton,
  marketingShell,
  SITE_URL,
} from "./brand.ts";

export const FEATURE_CAMPAIGN_ID = "2026-09-feature-your-listing";

export const FEATURE_SUBJECT = "Put your Vendibook listing in front of more buyers";
export const FEATURE_PREHEADER =
  "Featured Listings get premium placement, a standout badge, and 30 days of extra visibility.";

export interface CampaignListing {
  id: string;
  title: string;
  cover_image_url: string | null;
  city: string | null;
  state: string | null;
  mode: string | null;
  category: string | null;
  price_sale: number | null;
  price_daily: number | null;
  price_weekly: number | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  food_truck: "Food Truck",
  food_trailer: "Food Trailer",
  ghost_kitchen: "Commercial Kitchen",
  vendor_space: "Vendor Space",
  vendor_lot: "Vendor Lot",
};

function money(n: number): string {
  return `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function priceLabel(l: CampaignListing): string {
  if (l.mode === "sale") return l.price_sale ? money(l.price_sale) : "Listed for sale";
  if (l.price_daily) return `${money(l.price_daily)}/day`;
  if (l.price_weekly) return `${money(l.price_weekly)}/week`;
  return "Available to rent";
}

/**
 * PUBLIC location only — city/state (never street address or precise
 * coordinates). Matches the marketplace's public display rule.
 */
function publicLocation(l: CampaignListing): string {
  return [l.city, l.state].filter(Boolean).join(", ") || "United States";
}

/** Gmail's proxy refuses very large originals — serve through the resizer. */
function emailImage(src: string | null): string {
  const fallback = `${SITE_URL}/placeholder.svg`;
  if (!src) return fallback;
  if (src.includes("/storage/v1/object/public/")) {
    const rendered = src.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return `${rendered}${rendered.includes("?") ? "&" : "?"}width=900&quality=70&resize=contain`;
  }
  return src;
}

export function utmUrl(path: string, content: string): string {
  const url = path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}utm_source=email&utm_medium=campaign&utm_campaign=${FEATURE_CAMPAIGN_ID}&utm_content=${content}`;
}

/** Deep link that auto-opens the existing Boost modal for this listing. */
export function boostDeepLink(listingId: string, content = "primary_cta"): string {
  return utmUrl(`/dashboard/listings?boost=${encodeURIComponent(listingId)}`, content);
}

/**
 * Email reproduction of the live `FeaturedBadge` (gold gradient pill,
 * crown glyph, uppercase "Featured"). Same wording and treatment as the
 * marketplace card badge, expressed in inline CSS with a solid fallback
 * for clients that drop gradients.
 */
function featuredBadge(): string {
  return `<span style="display:inline-block;background:#e8b04b;background-image:linear-gradient(135deg,#f7d488 0%,#e8b04b 42%,#b8801f 100%);color:#2a1a05;border:1px solid #ffe7a8;border-radius:999px;padding:5px 12px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;line-height:1;white-space:nowrap;">&#9819;&nbsp;Featured</span>`;
}

function benefitRow(title: string, body: string): string {
  return `
  <tr><td style="padding:0 0 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="26" valign="top" style="font-family:${FONT};font-size:15px;color:${MK.orangeOnWhite};font-weight:700;line-height:1.5;">&#8226;</td>
        <td style="font-family:${FONT};font-size:15px;color:${MK.text};line-height:1.55;">
          <strong style="font-weight:700;">${esc(title)}</strong><br />
          <span style="color:${MK.textSecondary};font-size:14px;">${esc(body)}</span>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

/** Listing preview card with the exact Featured badge overlaid. */
function previewCard(l: CampaignListing): string {
  const img = emailImage(l.cover_image_url);
  const label = CATEGORY_LABEL[l.category ?? ""] ?? (l.mode === "sale" ? "For sale" : "For rent");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border:1px solid ${MK.border};border-radius:14px;overflow:hidden;background:${MK.surface};">
    <tr><td style="padding:0;">
      <img src="${esc(img)}" alt="${esc(l.title)}" width="552" style="display:block;width:100%;max-width:552px;height:auto;border:0;" />
    </td></tr>
    <tr><td style="padding:16px 18px 18px;">
      <div style="margin:0 0 10px;">${featuredBadge()}</div>
      <div style="font-family:${FONT};font-size:11px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:${MK.textMuted};margin-bottom:6px;">${esc(label)} &middot; ${esc(publicLocation(l))}</div>
      <div style="font-family:${FONT};font-size:17px;font-weight:700;color:${MK.text};line-height:1.35;margin-bottom:4px;">${esc(l.title)}</div>
      <div style="font-family:${FONT};font-size:16px;font-weight:700;color:${MK.orangeOnWhite};">${esc(priceLabel(l))}</div>
    </td></tr>
  </table>`;
}

function secondaryListingRow(l: CampaignListing): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;border:1px solid ${MK.border};border-radius:12px;background:${MK.surfaceMuted};">
    <tr>
      <td style="padding:12px 14px;font-family:${FONT};font-size:14px;color:${MK.text};line-height:1.4;">
        <strong style="font-weight:700;">${esc(l.title)}</strong><br />
        <span style="color:${MK.textMuted};font-size:13px;">${esc(publicLocation(l))}</span>
      </td>
      <td align="right" style="padding:12px 14px;font-family:${FONT};font-size:13px;white-space:nowrap;">
        <a href="${esc(boostDeepLink(l.id, "secondary_listing"))}" style="color:${MK.orangeOnWhite};font-weight:700;text-decoration:none;">Feature this &rarr;</a>
      </td>
    </tr>
  </table>`;
}

export function buildFeatureYourListingHtml(opts: {
  firstName?: string | null;
  primary: CampaignListing | null;
  others?: CampaignListing[];
  unsubscribeUrl: string;
  priceLabel?: string;
}): string {
  const { firstName, primary, others = [], unsubscribeUrl } = opts;
  const price = opts.priceLabel ?? "$30";
  const greeting = firstName && firstName.trim()
    ? `Hi ${esc(firstName.trim().split(/\s+/)[0])},`
    : "Hi there,";

  const ctaUrl = primary
    ? boostDeepLink(primary.id, "primary_cta")
    : utmUrl("/dashboard/listings", "primary_cta");

  const hero = `
  <tr><td style="padding:20px 28px 4px;">
    <p style="font-family:${FONT};font-size:15px;color:${MK.textSecondary};margin:0 0 14px;">${greeting}</p>
    <h1 style="font-family:${FONT};font-size:28px;line-height:1.25;font-weight:800;color:${MK.text};margin:0 0 10px;">Get more eyes on your listing.</h1>
    <p style="font-family:${FONT};font-size:16px;line-height:1.6;color:${MK.textSecondary};margin:0 0 6px;">Your listing is live. Now help it stand out.</p>
    <p style="font-family:${FONT};font-size:15px;line-height:1.6;color:${MK.textSecondary};margin:0;">A Featured Listing is built to increase discovery on Vendibook — premium placement where buyers are already browsing, plus the Featured badge on every card.</p>
  </td></tr>`;

  const preview = primary
    ? `
  <tr><td style="padding:22px 28px 0;">
    <div style="font-family:${FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${MK.orangeOnWhite};margin-bottom:10px;">Here's how your listing will stand out</div>
    ${previewCard(primary)}
  </td></tr>`
    : "";

  const cta = `
  <tr><td align="center" style="padding:6px 28px 4px;">
    ${mkButton("Feature My Listing", ctaUrl)}
    <p style="font-family:${FONT};font-size:13px;color:${MK.textMuted};margin:12px 0 0;">
      <a href="${esc(utmUrl("/dashboard/listings", "view_my_listings"))}" style="color:${MK.textMuted};text-decoration:underline;">View My Listings</a>
    </p>
  </td></tr>`;

  const benefits = `
  <tr><td style="padding:22px 28px 0;">
    <div style="border:1px solid ${MK.border};border-radius:14px;background:${MK.surfaceMuted};padding:20px 20px 8px;">
      <h2 style="font-family:${FONT};font-size:18px;font-weight:700;color:${MK.text};margin:0 0 14px;">What Featured includes</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${benefitRow("Priority placement in discovery", "Featured listings are ordered first across search and category browsing.")}
        ${benefitRow("Homepage Featured rail eligibility", "Your listing becomes eligible for the Featured placement buyers see first.")}
        ${benefitRow("The Featured badge", "The same gold badge shown above appears on your marketplace cards and listing page.")}
        ${benefitRow("30 days of Featured exposure", `One-time ${price} — no subscription, no auto-renew.`)}
      </table>
    </div>
  </td></tr>`;

  const more = others.length
    ? `
  <tr><td style="padding:22px 28px 0;">
    <div style="font-family:${FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${MK.textMuted};margin-bottom:10px;">Your other live listings</div>
    ${others.map(secondaryListingRow).join("")}
  </td></tr>`
    : "";

  const close = `
  <tr><td style="padding:22px 28px 30px;">
    <p style="font-family:${FONT};font-size:13px;line-height:1.6;color:${MK.textMuted};margin:0;">
      Featuring a listing increases its visibility on Vendibook. It does not guarantee a sale, a booking, or any specific result.
      Questions? Just reply to this email.
    </p>
  </td></tr>`;

  return marketingShell({
    title: FEATURE_SUBJECT,
    preheader: FEATURE_PREHEADER,
    bodyRows: `${hero}${preview}${cta}${benefits}${more}${close}`,
    unsubscribeUrl,
    footerNote: "Vendibook is the marketplace for food trucks, trailers, mobile kitchens, and vendor spaces.",
  });
}

export function buildFeatureYourListingText(opts: {
  firstName?: string | null;
  primary: CampaignListing | null;
  unsubscribeUrl: string;
  priceLabel?: string;
}): string {
  const price = opts.priceLabel ?? "$30";
  const name = opts.firstName?.trim()?.split(/\s+/)[0];
  const ctaUrl = opts.primary
    ? boostDeepLink(opts.primary.id, "primary_cta")
    : utmUrl("/dashboard/listings", "primary_cta");
  return [
    name ? `Hi ${name},` : "Hi there,",
    "",
    "Get more eyes on your listing. Your listing is live — now help it stand out.",
    "",
    "A Featured Listing includes:",
    "- Priority placement across search and category browsing",
    "- Eligibility for the homepage Featured placement",
    "- The Featured badge on your marketplace cards and listing page",
    `- 30 days of Featured exposure for a one-time ${price} (no auto-renew)`,
    "",
    `Feature my listing: ${ctaUrl}`,
    "",
    "Featuring increases visibility on Vendibook; it does not guarantee a sale or booking.",
    `Unsubscribe: ${opts.unsubscribeUrl}`,
  ].join("\n");
}
