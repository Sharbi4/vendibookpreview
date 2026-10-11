// "Rent it while you sell it" campaign from Brad (Customer Success). Sent
// through Resend by send-rent-while-you-sell on the same marketing shell,
// sign-off and safety note as the seller concierge email.
//   rent_while_you_sell — a sale truck/trailer with views but no offers: turn
//                         it into a linked rental (/listings/:id/rent-it-out)
//   monthly_rate        — a live rental with no monthly rate: one short ask
import { MK, FONT, esc, mkButton, marketingShell, SITE_URL } from "./brand.ts";
import { SIGN_OFF } from "./seller-concierge.ts";

// Rental checkout runs on Vendibook checkout only, so no payment brands here.
const RENTAL_SAFETY_NOTE =
  "Stay safe: renters book and pay only through Vendibook checkout. Never accept wire transfers, gift cards or 'shipper' payments, and never share verification codes.";

export const RENT_WHILE_YOU_SELL_CAMPAIGN_ID = "2026-10-rent-while-you-sell";

export type RentCampaignVariant = "rent_while_you_sell" | "monthly_rate";

export interface RentCampaignData {
  firstName: string | null;
  variant: RentCampaignVariant;
  listingId: string;
  listingTitle: string;
  /** "truck" | "trailer" | "kitchen", used in copy. */
  unitWord: string;
  /** monthly_rate: the rates the listing already has. */
  dailyRate?: number | null;
  weeklyRate?: number | null;
  /** monthly_rate: live monthly rates of comparable rentals (2+ listings). */
  monthlyComps?: { min: number; max: number } | null;
  unsubscribeUrl: string;
}

const utm = (content: string, variant: RentCampaignVariant) =>
  `utm_source=email&utm_medium=campaign&utm_campaign=${RENT_WHILE_YOU_SELL_CAMPAIGN_ID}&utm_content=${variant}_${content}`;

export const rentItOutUrl = (d: Pick<RentCampaignData, "listingId" | "variant">) =>
  `${SITE_URL}/listings/${encodeURIComponent(d.listingId)}/rent-it-out?${utm("rent_cta", d.variant)}`;
export const monthlyRateEditUrl = (d: Pick<RentCampaignData, "listingId" | "variant">) =>
  `${SITE_URL}/edit-listing/${encodeURIComponent(d.listingId)}?${utm("edit_cta", d.variant)}`;

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

export function rentCampaignSubject(d: Pick<RentCampaignData, "variant" | "unitWord">): string {
  return d.variant === "monthly_rate"
    ? `Quick one: add a monthly rate to your ${d.unitWord}`
    : `Your ${d.unitWord} is getting views. Rent it while you sell it?`;
}

function ratesLine(d: RentCampaignData): string {
  const parts = [
    d.dailyRate ? `${money(d.dailyRate)}/day` : null,
    d.weeklyRate ? `${money(d.weeklyRate)}/week` : null,
  ].filter(Boolean);
  return parts.length ? ` It's listed at ${parts.join(" and ")}, but` : " It";
}

/** Paragraphs in order, as plain text (HTML escapes and bolds the title). */
function paragraphs(d: RentCampaignData): { lead: string; bullets: string[]; after: string[] } {
  if (d.variant === "monthly_rate") {
    return {
      lead: `Quick one about your listing "${d.listingTitle}".${ratesLine(d)} has no monthly rate yet.`,
      bullets: [],
      after: [
        `Many renters want a ${d.unitWord} for a month or a whole season, and without a monthly rate they can't see what that would cost. A monthly booking is steady income from one renter.`,
        ...(d.monthlyComps
          ? [`For reference, comparable ${d.unitWord}s on Vendibook list at ${money(d.monthlyComps.min)}–${money(d.monthlyComps.max)} a month.`]
          : []),
        "It takes a minute to add.",
      ],
    };
  }
  // Owner rule 2026-10-06: never tell a seller their view count.
  return {
    lead: `Your listing "${d.listingTitle}" has been getting attention on Vendibook, but no offers yet. Renters are looking too, and there are only a handful of ${d.unitWord}s for rent on Vendibook. So here's an idea: rent it while you sell it.`,
    bullets: [
      "Earn rental income, including steady monthly income from one renter.",
      "Keep it listed for sale. Your sale listing stays exactly as it is.",
      "A renter who has used it for a month could become your buyer.",
    ],
    after: [
      "Setup takes about 5 minutes. We copy your photos, description and specs into a rental listing, and you set the rates (we suggest including a monthly rate), the deposit and the documents you need from renters. Nothing goes live until you publish it.",
      "Not interested? No action needed. Your sale listing doesn't change.",
    ],
  };
}

export function buildRentCampaignHtml(d: RentCampaignData): string {
  const p = `font-family:${FONT};font-size:15px;line-height:1.6;color:${MK.text};margin:0 0 14px;`;
  const small = `font-family:${FONT};font-size:13px;line-height:1.6;color:${MK.textMuted};margin:0 0 8px;`;
  const hi = d.firstName ? `Hi ${esc(d.firstName)},` : "Hi there,";
  const { lead, bullets, after } = paragraphs(d);
  const title = esc(d.listingTitle);
  const leadHtml = esc(lead).replace(`&quot;${title}&quot;`, `<strong>${title}</strong>`);
  const cta = d.variant === "monthly_rate"
    ? mkButton("Add a monthly rate", monthlyRateEditUrl(d))
    : mkButton("Rent it out", rentItOutUrl(d));
  const bodyRows = `
<tr><td style="padding:16px 28px 8px;">
  <p style="${p}">${hi}</p>
  <p style="${p}">${leadHtml}</p>
  ${bullets.length ? `<ul style="${p}padding-left:20px;">${bullets.map((b) => `<li style="margin:0 0 8px;">${esc(b)}</li>`).join("")}</ul>` : ""}
  ${after.map((t) => `<p style="${p}">${esc(t)}</p>`).join("\n  ")}
  <p style="margin:20px 0 24px;">${cta}</p>
  <p style="${p}">Reply to this email if you have any questions. A real person reads every reply.</p>
  <p style="${small}">${esc(RENTAL_SAFETY_NOTE)}</p>
  <p style="${p}">${SIGN_OFF.map(esc).join("<br/>")}</p>
</td></tr>`;
  return marketingShell({
    title: rentCampaignSubject(d),
    preheader: d.variant === "monthly_rate"
      ? "Renters booking for a month can't see a price yet."
      : "Earn rental income and keep it listed for sale.",
    bodyRows,
    unsubscribeUrl: d.unsubscribeUrl,
  });
}

export function buildRentCampaignText(d: RentCampaignData): string {
  const { lead, bullets, after } = paragraphs(d);
  return [
    d.firstName ? `Hi ${d.firstName},` : "Hi there,",
    "",
    lead,
    ...(bullets.length ? ["", ...bullets.map((b) => `- ${b}`)] : []),
    ...after.flatMap((t) => ["", t]),
    "",
    d.variant === "monthly_rate"
      ? `Add a monthly rate: ${monthlyRateEditUrl(d)}`
      : `Rent it out: ${rentItOutUrl(d)}`,
    "",
    "Reply to this email if you have any questions. A real person reads every reply.",
    "",
    RENTAL_SAFETY_NOTE,
    "",
    ...SIGN_OFF,
    "",
    `Unsubscribe: ${d.unsubscribeUrl}`,
  ].join("\n");
}
