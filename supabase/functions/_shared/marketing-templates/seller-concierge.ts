// Seller concierge email from Brad (Customer Success). Sent through Resend by
// send-seller-concierge. Same marketing shell, fixes and safety note as the
// listing-fix nudge so sellers see one consistent Vendibook voice.
import { MK, FONT, esc, mkButton, marketingShell, SITE_URL } from "./brand.ts";
import type { ListingFix } from "../listingFixes.ts";

export const SELLER_CONCIERGE_CAMPAIGN_ID = "2026-10-seller-concierge";

export type ConciergeVariant = "welcome" | "featured" | "optimize" | "share" | "fix_title" | "rescue" | "polish";

/** Hand-written concierge review of one listing (admin-supplied, "polish" variant). */
export interface PolishItem {
  listingId: string;
  currentTitle: string;
  suggestedTitle: string | null;
  asks: string[];
}

/** Missed-offer rescue: an offer expired before the seller responded. */
export interface RescueDetails {
  offerAmount: number;
  askingPrice: number;
  offerDateLabel: string; // e.g. "September 11"
  /** Older rescues ask "still for sale?" instead of "open to talking?". */
  stale: boolean;
}

export interface SellerConciergeData {
  firstName: string | null;
  listingId: string;
  listingTitle: string;
  variant: ConciergeVariant;
  fixes: ListingFix[];
  /** Formatted end date of a complimentary feature, e.g. "October 19". */
  featuredUntil?: string | null;
  needsProfilePhoto: boolean;
  rescue?: RescueDetails | null;
  /** "polish" variant: one block per listing, in order. */
  polish?: PolishItem[] | null;
  /** "polish" variant: mention the free 14-day feature (subject to review). */
  featuredTrialOffer?: boolean;
  unsubscribeUrl: string;
}

export const SIGN_OFF = ["Brad", "Customer Success, Vendibook"];

export const SAFETY_NOTE =
  "Stay safe: take payment only through Vendibook checkout (Square or PayPal). Never accept wire transfers, gift cards or 'shipper' payments, and never share verification codes.";

const REFERRAL_NOTE =
  "Know another owner who's selling a truck, trailer or kitchen? Refer them to Vendibook. You may earn $150 once they complete their first transaction within 90 days, after our team reviews it.";

const utm = (content: string, variant: ConciergeVariant) =>
  `utm_source=email&utm_medium=campaign&utm_campaign=${SELLER_CONCIERGE_CAMPAIGN_ID}&utm_content=${variant}_${content}`;

export const conciergeEditUrl = (d: Pick<SellerConciergeData, "listingId" | "variant">) =>
  `${SITE_URL}/edit-listing/${encodeURIComponent(d.listingId)}?${utm("edit_cta", d.variant)}`;
export const conciergeListingUrl = (d: Pick<SellerConciergeData, "listingId" | "variant">) =>
  `${SITE_URL}/listing/${encodeURIComponent(d.listingId)}?${utm("listing", d.variant)}`;
const FEATURED_TRIAL_NOTE =
  "We feature a few strong new listings free for 14 days. Once these updates are in, reply to this email and I'll check whether yours qualify.";

const editUrlFor = (listingId: string, variant: ConciergeVariant) =>
  `${SITE_URL}/edit-listing/${encodeURIComponent(listingId)}?${utm("edit_cta", variant)}`;

const referralUrl = (variant: ConciergeVariant) => `${SITE_URL}/referral?${utm("referral", variant)}`;
const accountUrl = (variant: ConciergeVariant) => `${SITE_URL}/account?${utm("profile", variant)}`;

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function sellerConciergeSubject(d: Pick<SellerConciergeData, "variant" | "listingTitle" | "rescue" | "polish">): string {
  if (d.variant === "polish") {
    return (d.polish?.length ?? 0) > 1
      ? "A few quick changes to help your listings get booked and sold"
      : "A few quick changes to help your listing stand out";
  }
  if (d.variant === "rescue" && d.rescue) {
    return d.rescue.stale ? "Is your food trailer still for sale?" : `A buyer offered ${money(d.rescue.offerAmount)} for your listing`;
  }
  if (d.variant === "welcome") return `Welcome to Vendibook. Your ${d.listingTitle} is live`;
  if (d.variant === "fix_title") return "One quick fix so buyers can find your listing";
  if (d.variant === "featured") return `Your ${d.listingTitle} is featured free for 14 days`;
  if (d.variant === "share") return `Your ${d.listingTitle} looks great. Want us to share it?`;
  return `A few changes to get more buyers messaging about your ${d.listingTitle}`;
}

function intro(d: SellerConciergeData): string {
  if (d.variant === "rescue" && d.rescue) {
    const r = d.rescue;
    return r.stale
      ? `Back in ${esc(r.offerDateLabel)} a buyer offered <strong>${money(r.offerAmount)}</strong> for your listing, which is priced at ${money(r.askingPrice)}. The offer expired with no response recorded. Is it still for sale? Reply "yes" and I'll help you update the listing, or reply "sold" and I'll take it down.`
      : `On ${esc(r.offerDateLabel)} a buyer offered <strong>${money(r.offerAmount)}</strong> for your listing, which is priced at ${money(r.askingPrice)}. The offer expired with no response recorded. If you're still selling, reply to this email and I'll let the buyer know you're open to talking. If it's sold, reply "sold" and I'll take it down.`;
  }
  if (d.variant === "polish") {
    const n = d.polish?.length ?? 0;
    // Neutral: polish goes to new and established sellers alike.
    return n > 1
      ? `Thanks for listing with Vendibook. I went through your ${n} listings, and a few quick changes will help buyers and renters find them and reach out:`
      : `Thanks for listing with Vendibook. I went through your listing, and a few quick changes will help buyers find it and reach out:`;
  }
  if (d.variant === "welcome") {
    return `Welcome to Vendibook, and thanks for listing your <strong>${esc(d.listingTitle)}</strong>. It's live, and buyers can find it now. A few quick additions will help it stand out:`;
  }
  if (d.variant === "fix_title") {
    return `Your listing's title currently reads <strong>"${esc(d.listingTitle)}"</strong>. Buyers search by title, so a clear one like "2021 16ft Concession Trailer, Fully Equipped" helps the right people find it. It takes a minute to change.`;
  }
  if (d.variant === "featured") {
    return `Good news: buyers are already looking at your <strong>${esc(d.listingTitle)}</strong>, so we've featured it on Vendibook for free for 14 days${d.featuredUntil ? `, through ${esc(d.featuredUntil)}` : ""}. Featured listings show at the top of the homepage and search.`;
  }
  if (d.variant === "share") {
    return `Thanks for putting the work in. Your <strong>${esc(d.listingTitle)}</strong> is one of the strongest listings on Vendibook.`;
  }
  return `I went through your listing <strong>${esc(d.listingTitle)}</strong>. A few changes usually turn visits into buyer messages:`;
}

function introText(d: SellerConciergeData): string {
  return intro(d).replace(/<\/?strong>/g, "").replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
}

export function buildSellerConciergeHtml(d: SellerConciergeData): string {
  const p = `font-family:${FONT};font-size:15px;line-height:1.6;color:${MK.text};margin:0 0 14px;`;
  const small = `font-family:${FONT};font-size:13px;line-height:1.6;color:${MK.textMuted};margin:0 0 8px;`;
  const hi = d.firstName ? `Hi ${esc(d.firstName)},` : "Hi there,";
  const items = d.fixes.map((f) => `<li style="margin:0 0 8px;">${esc(f.text)}</li>`).join("");
  const fixesBlock = d.fixes.length
    ? `${d.variant === "featured" ? `<p style="${p}">These changes will turn that extra attention into messages:</p>` : ""}<ul style="${p}padding-left:20px;">${items}</ul>`
    : "";
  const polishBlock = d.variant === "polish"
    ? (d.polish ?? []).map((it) => `
  <p style="${p}margin-top:22px;"><strong>${esc(it.currentTitle)}</strong></p>
  ${it.suggestedTitle ? `<p style="${p}">Suggested title: <strong>${esc(it.suggestedTitle)}</strong></p>` : ""}
  ${it.asks.length ? `<ul style="${p}padding-left:20px;">${it.asks.map((a) => `<li style="margin:0 0 8px;">${esc(a)}</li>`).join("")}</ul>` : ""}
  <p style="margin:0 0 18px;">${mkButton("Edit this listing", editUrlFor(it.listingId, d.variant))}</p>`).join("") +
      (d.featuredTrialOffer ? `<p style="${p}">${esc(FEATURED_TRIAL_NOTE)}</p>` : "")
    : "";
  const shareBlock = d.variant === "share"
    ? `<p style="${p}">If you post it on Instagram or Facebook, tag <strong>@vendibook</strong> and we'll reshare it. Adding your listing link to your bio helps buyers find it too.</p>`
    : "";
  const profileBlock = d.variant === "rescue" || d.variant === "fix_title"
    ? ""
    : d.needsProfilePhoto
    ? `<p style="${p}">Also add a photo and a short bio to <a href="${esc(accountUrl(d.variant))}" style="color:${MK.text};">your profile</a>. Buyers check who they're dealing with before they message.</p>`
    : `<p style="${p}">Also add a short bio to <a href="${esc(accountUrl(d.variant))}" style="color:${MK.text};">your profile</a>. Buyers like to know who they're buying from.</p>`;
  const cta = d.variant === "polish"
    ? ""
    : d.variant === "share"
    ? mkButton("View my listing", conciergeListingUrl(d))
    : mkButton(d.variant === "fix_title" ? "Edit my title" : "Update my listing", conciergeEditUrl(d));
  const bodyRows = `
<tr><td style="padding:16px 28px 8px;">
  <p style="${p}">${hi}</p>
  <p style="${p}">${intro(d)}</p>
  ${fixesBlock}
  ${polishBlock}
  ${shareBlock}
  ${profileBlock}
  ${cta ? `<p style="margin:20px 0 24px;">${cta}</p>` : ""}
  <p style="${p}">Reply to this email if you have any questions. A real person reads every reply.</p>
  <p style="${small}">${esc(REFERRAL_NOTE)} <a href="${esc(referralUrl(d.variant))}" style="color:${MK.textMuted};">See the referral terms</a>.</p>
  <p style="${small}">${esc(SAFETY_NOTE)}</p>
  <p style="${p}">${SIGN_OFF.map(esc).join("<br/>")}</p>
</td></tr>`;
  return marketingShell({
    title: sellerConciergeSubject(d),
    preheader: d.variant === "rescue"
      ? "A buyer made an offer on your listing."
      : d.variant === "fix_title"
      ? "One quick change to your listing."
      : d.variant === "welcome"
      ? "Your listing is live. Here's how to make it stand out."
      : d.variant === "featured"
      ? "Your listing is featured free for 14 days."
      : d.variant === "polish"
      ? "A few quick changes to help your listings stand out."
      : d.variant === "share" ? "Tag @vendibook and we'll reshare it." : "Small changes that get buyers to reach out.",
    bodyRows,
    unsubscribeUrl: d.unsubscribeUrl,
  });
}

export function buildSellerConciergeText(d: SellerConciergeData): string {
  return [
    d.firstName ? `Hi ${d.firstName},` : "Hi there,",
    "",
    introText(d),
    ...(d.fixes.length
      ? ["", ...(d.variant === "featured" ? ["These changes will turn that extra attention into messages:"] : []), ...d.fixes.map((f) => `- ${f.text}`)]
      : []),
    ...(d.variant === "polish"
      ? (d.polish ?? []).flatMap((it) => [
        "",
        it.currentTitle,
        ...(it.suggestedTitle ? [`Suggested title: ${it.suggestedTitle}`] : []),
        ...it.asks.map((a) => `- ${a}`),
        `Edit this listing: ${editUrlFor(it.listingId, d.variant)}`,
      ]).concat(d.featuredTrialOffer ? ["", FEATURED_TRIAL_NOTE] : [])
      : []),
    ...(d.variant === "share"
      ? ["", "If you post it on Instagram or Facebook, tag @vendibook and we'll reshare it."]
      : []),
    ...(d.variant === "rescue" || d.variant === "fix_title"
      ? []
      : ["", d.needsProfilePhoto
        ? `Also add a photo and a short bio to your profile: ${accountUrl(d.variant)}`
        : `Also add a short bio to your profile: ${accountUrl(d.variant)}`]),
    ...(d.variant === "polish" ? [] : [
      "",
      d.variant === "share"
        ? `View your listing: ${conciergeListingUrl(d)}`
        : `Update your listing: ${conciergeEditUrl(d)}`,
    ]),
    "",
    "Reply to this email if you have any questions. A real person reads every reply.",
    "",
    `${REFERRAL_NOTE} ${referralUrl(d.variant)}`,
    "",
    SAFETY_NOTE,
    "",
    ...SIGN_OFF,
    "",
    `Unsubscribe: ${d.unsubscribeUrl}`,
  ].join("\n");
}
