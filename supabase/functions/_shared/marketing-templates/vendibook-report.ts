// The Vendibook Report — luxury editorial marketplace email template
// Pure HTML string builder (no React Email) to keep edge bundle small.

// Palette derives from the master email design system (Phase 2 tokens).
const COLORS = {
  bgDark: "#1c1917",      // charcoal (header band only)
  bgWhite: "#ffffff",     // content surface
  bgWarm: "#faf7f2",      // warm ivory canvas
  orange: "#FF5124",      // Vendibook orange CTA
  textDark: "#1c1917",
  textMuted: "#78716c",
  divider: "#e7e2dc",     // soft gray hairline
  pill: "#f7f4ef",
};

export interface ListingCard {
  id: string;
  title: string;
  location: string;
  price: string;
  detail: string;
  image: string;
  url: string;
}
export interface FeaturedRental {
  id: string;
  title: string;
  location: string;
  price: string;
  amenities: string[];
  image: string;
  url: string;
  extraTagline?: string | null;
}
export interface ReplacementBlock {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}
export interface ToolHighlight {
  label: string;
  description: string;
  icon: string; // inline SVG path d
}
export interface ReportPayload {
  issueNumber: number;
  dateLabel: string;
  heroHeadline: string;
  saleListings: ListingCard[];
  featuredRental: FeaturedRental | null;
  referralRotation: "purchase" | "supply" | "rental";
  tools: ToolHighlight[];
  insightTitle: string;
  insightPullQuote: string;
  insightBody: string;
  // Fallback / dynamic content
  saleSectionLabel?: string;
  rentalSectionLabel?: string;
  listingsReplacement?: ReplacementBlock | null;
  rentalReplacement?: ReplacementBlock | null;
  expandTools?: boolean; // when both sections are thin, render 6 tools (2x3)
  recipientEmail: string;
  sendId: string;
  unsubscribeUrl: string;
  feedbackBaseUrl: string;
  logoLightUrl: string; // white-on-dark for header
  logoDarkUrl: string; // dark-on-white for footer
  baseUrl: string; // e.g. https://vendibook.com
  mailingAddress: string;
}

const SOURCE = "?source=email_weekly_report";

function esc(s: string): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
  );
}

function referralBlock(p: ReportPayload): { headline: string; body: string; secondary: string } {
  if (p.referralRotation === "supply") {
    return {
      headline: "Earn $150 for every seller you refer.",
      body: "Know someone listing a food truck or commercial kitchen? Refer them to Vendibook and earn $150 once their listing clears compliance.",
      secondary: "Also earn up to $500 for a buyer referral, and $50 for a new renter.",
    };
  }
  if (p.referralRotation === "rental") {
    return {
      headline: "Earn $50 when your friend rents on Vendibook.",
      body: "Refer renters looking for shared kitchens or vendor spaces. You earn $50 when they complete their first booking.",
      secondary: "Also earn $500 for a buyer referral, and $150 for a new seller.",
    };
  }
  return {
    headline: "Earn up to $500 per referral.",
    body: "Know someone buying a food truck? Refer them to Vendibook and earn $500 when their purchase clears. No limits on referrals.",
    secondary: "Also earn $150 for referring a new seller, and $50 for a new renter.",
  };
}

function listingCard(c: ListingCard): string {
  return `
  <td valign="top" width="50%" style="padding:8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff;">
      <tr><td>
        <a href="${esc(c.url)}${SOURCE}" style="text-decoration:none;color:inherit;">
          <img src="${esc(c.image)}" alt="${esc(c.title)}" width="280" style="display:block;width:100%;height:auto;border-radius:4px;object-fit:cover;aspect-ratio:16/9;" />
        </a>
      </td></tr>
      <tr><td style="padding-top:12px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:600;color:${COLORS.textDark};line-height:1.25;max-height:46px;overflow:hidden;">
          <a href="${esc(c.url)}${SOURCE}" style="color:${COLORS.textDark};text-decoration:none;">${esc(c.title)}</a>
        </div>
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:12px;color:${COLORS.textMuted};margin-top:6px;">📍 ${esc(c.location)}</div>
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:18px;color:${COLORS.orange};font-weight:700;margin-top:8px;">${esc(c.price)}</div>
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:12px;color:${COLORS.textMuted};margin-top:4px;">${esc(c.detail)}</div>
        <div style="margin-top:10px;">
          <a href="${esc(c.url)}${SOURCE}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.orange};font-weight:600;text-decoration:none;">View Listing →</a>
        </div>
      </td></tr>
    </table>
  </td>`;
}

function chunkCards(cards: ListingCard[]): string {
  let rows = "";
  for (let i = 0; i < cards.length; i += 2) {
    const a = cards[i];
    const b = cards[i + 1];
    rows += `<tr>${listingCard(a)}${b ? listingCard(b) : '<td width="50%"></td>'}</tr>`;
  }
  return rows;
}

function pillButton(label: string, url: string, opts: { ghost?: boolean; full?: boolean } = {}): string {
  const bg = opts.ghost ? "transparent" : COLORS.orange;
  const color = opts.ghost ? COLORS.orange : "#ffffff";
  const border = opts.ghost ? `2px solid ${COLORS.orange}` : `2px solid ${COLORS.orange}`;
  return `<a href="${esc(url)}" style="display:inline-block;background:${bg};color:${color};border:${border};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-weight:600;font-size:14px;padding:14px 32px;border-radius:999px;text-decoration:none;${opts.full ? "display:block;text-align:center;" : ""}">${esc(label)}</a>`;
}

function toolColumn(t: ToolHighlight): string {
  return `
  <td valign="top" width="33.33%" style="padding:12px 10px;text-align:center;">
    <div style="color:${COLORS.orange};margin-bottom:10px;">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;"><path d="${t.icon}"/></svg>
    </div>
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:14px;color:#fff;font-weight:700;margin-bottom:6px;">${esc(t.label)}</div>
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:12px;color:#bdbdbd;line-height:1.5;">${esc(t.description)}</div>
  </td>`;
}

function feedbackPill(label: string, rating: string, p: ReportPayload): string {
  const url = `${p.feedbackBaseUrl}?s=${encodeURIComponent(p.sendId)}&e=${encodeURIComponent(p.recipientEmail)}&r=${rating}`;
  return `<a href="${esc(url)}" style="display:inline-block;background:${COLORS.pill};color:${COLORS.textDark};border:1px solid ${COLORS.divider};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;padding:10px 18px;border-radius:999px;text-decoration:none;margin:0 4px;">${label}</a>`;
}

export function renderVendibookReport(p: ReportPayload): string {
  const ref = referralBlock(p);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>The Vendibook Report — Issue ${p.issueNumber}</title>
<style>
  @media only screen and (max-width:620px){
    .container{width:100% !important;}
    .col{display:block !important;width:100% !important;}
    .stack{display:block !important;width:100% !important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.bgWarm};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;color:${COLORS.textDark};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Browse this week's freshest listings — food trucks, kitchens, and vendor spaces on Vendibook.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${COLORS.bgWarm};">
    <tr><td align="center" style="padding:0;">
      <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;background:#fff;">

        <!-- HEADER -->
        <tr><td style="background:${COLORS.bgDark};padding:36px 24px 28px;text-align:center;">
          <img src="${esc(p.logoLightUrl)}" alt="Vendibook" width="160" style="display:inline-block;height:auto;max-width:160px;" />
          <div style="width:40px;height:2px;background:${COLORS.orange};margin:22px auto 18px;"></div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#9a9a9a;text-transform:uppercase;">THE VENDIBOOK REPORT</div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;color:#6a6a6a;margin-top:8px;">${esc(p.dateLabel)} · Issue No. ${p.issueNumber}</div>
        </td></tr>

        <!-- HERO HEADLINE -->
        <tr><td style="padding:48px 32px 36px;text-align:center;background:#fff;">
          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.15;color:${COLORS.textDark};font-weight:700;margin:0;">${esc(p.heroHeadline)}</h1>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:15px;color:${COLORS.textMuted};margin:18px 0 0;">Browse this week's freshest listings below.</p>
        </td></tr>

        <!-- FOR SALE -->
        <tr><td style="padding:8px 24px 0;">
          ${
            p.listingsReplacement
              ? `
          <div style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};text-transform:uppercase;padding:24px 0 8px;">${esc(p.saleSectionLabel ?? "BROWSE VENDIBOOK")}</div>
          <div style="height:1px;background:${COLORS.divider};margin:0 0 24px;"></div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td style="background:${COLORS.bgWarm};border:1px solid ${COLORS.divider};border-radius:6px;padding:40px 28px;text-align:center;">
              <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${COLORS.textDark};font-weight:700;margin:0 0 12px;">${esc(p.listingsReplacement.headline)}</h2>
              <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:15px;color:${COLORS.textMuted};margin:0 0 24px;">${esc(p.listingsReplacement.body)}</p>
              ${pillButton(p.listingsReplacement.ctaLabel, `${p.listingsReplacement.ctaUrl}${SOURCE}`)}
            </td></tr>
          </table>
          <div style="height:24px;"></div>`
              : `
          <div style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};text-transform:uppercase;padding:24px 0 8px;">${esc(p.saleSectionLabel ?? "RECENTLY LISTED FOR SALE")}</div>
          <div style="height:1px;background:${COLORS.divider};margin:0 0 16px;"></div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            ${chunkCards(p.saleListings)}
          </table>
          <div style="text-align:center;padding:24px 0 36px;">
            ${pillButton("Browse All For Sale Listings", `${p.baseUrl}/browse?type=for_sale${SOURCE.slice(1)}`)}
          </div>`
          }
        </td></tr>

        ${
          p.rentalReplacement
            ? `
        <!-- HOST RECRUITMENT (rental fallback) -->
        <tr><td style="background:${COLORS.bgDark};padding:48px 32px;text-align:center;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#9a9a9a;text-transform:uppercase;padding-bottom:14px;">BECOME A HOST</div>
          <div style="width:40px;height:2px;background:${COLORS.orange};margin:0 auto 22px;"></div>
          <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#fff;font-weight:700;margin:0 0 14px;line-height:1.25;">${esc(p.rentalReplacement.headline)}</h2>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:15px;color:#bdbdbd;line-height:1.6;margin:0 auto 26px;max-width:440px;">${esc(p.rentalReplacement.body)}</p>
          ${pillButton(p.rentalReplacement.ctaLabel, `${p.rentalReplacement.ctaUrl}${SOURCE}`)}
        </td></tr>`
            : p.featuredRental
            ? `
        <!-- FEATURED RENTAL -->
        <tr><td style="background:${COLORS.bgWarm};padding:40px 32px;">
          <div style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};text-transform:uppercase;padding:0 0 8px;">${esc(p.rentalSectionLabel ?? "FEATURED FOR RENT")}</div>
          <div style="height:1px;background:${COLORS.divider};margin:0 0 24px;"></div>
          <a href="${esc(p.featuredRental.url)}${SOURCE}" style="text-decoration:none;color:inherit;">
            <img src="${esc(p.featuredRental.image)}" alt="${esc(p.featuredRental.title)}" width="576" style="display:block;width:100%;height:auto;border-radius:4px;aspect-ratio:16/9;object-fit:cover;" />
          </a>
          <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${COLORS.textDark};margin:20px 0 8px;font-weight:700;line-height:1.2;">${esc(p.featuredRental.title)}</h2>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.textMuted};margin-bottom:10px;">📍 ${esc(p.featuredRental.location)}</div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:20px;color:${COLORS.orange};font-weight:700;margin-bottom:6px;">${esc(p.featuredRental.price)}</div>
          ${p.featuredRental.extraTagline ? `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.textMuted};font-style:italic;margin-bottom:14px;">${esc(p.featuredRental.extraTagline)}</div>` : `<div style="margin-bottom:8px;"></div>`}
          <div style="margin-bottom:24px;">
            ${p.featuredRental.amenities.map((a) => `<span style="display:inline-block;background:#fff;border:1px solid ${COLORS.divider};color:${COLORS.textDark};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;padding:6px 12px;border-radius:999px;margin:0 6px 6px 0;">${esc(a)}</span>`).join("")}
          </div>
          <div style="text-align:center;">
            ${pillButton("View Rental Listing", `${p.featuredRental.url}${SOURCE}`)}
          </div>
        </td></tr>`
            : ""
        }

        <!-- REFERRAL -->
        <tr><td style="background:#fff;padding:40px 32px;">
          <div style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};text-transform:uppercase;padding-bottom:8px;">REFER & EARN</div>
          <div style="height:1px;background:${COLORS.divider};margin:0 0 28px;"></div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td valign="top" class="stack" width="64" style="padding-right:20px;">
                <div style="color:${COLORS.orange};">
                  <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="17" cy="7" r="3"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>
                </div>
              </td>
              <td valign="top" class="stack">
                <h3 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${COLORS.textDark};font-weight:600;margin:0 0 10px;">${esc(ref.headline)}</h3>
                <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.textMuted};line-height:1.55;margin:0 0 10px;">${esc(ref.body)}</p>
                <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.textMuted};line-height:1.55;margin:0 0 14px;">${esc(ref.secondary)}</p>
                <a href="${esc(p.baseUrl)}/referral${SOURCE}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.orange};font-weight:600;text-decoration:none;">Get your referral link →</a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- TOOLS HIGHLIGHT (dark) -->
        <tr><td style="background:${COLORS.bgDark};padding:40px 24px;">
          <div style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#9a9a9a;text-transform:uppercase;padding-bottom:24px;">BUILT FOR FOOD ENTREPRENEURS</div>
          ${
            p.expandTools
              ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>${p.tools.slice(0, 3).map(toolColumn).join("")}</tr>
              <tr><td colspan="3" style="height:24px;"></td></tr>
              <tr>${p.tools.slice(3, 6).map(toolColumn).join("")}</tr>
            </table>`
              : `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>${p.tools.slice(0, 3).map(toolColumn).join("")}</tr>
            </table>`
          }
        </td></tr>

        <!-- INSIGHT -->
        <tr><td style="background:#fff;padding:48px 36px;">
          <div style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};text-transform:uppercase;padding-bottom:8px;">FROM THE VENDIBOOK TEAM</div>
          <div style="height:1px;background:${COLORS.divider};margin:0 auto 28px;width:60px;"></div>
          ${p.insightTitle ? `<h3 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${COLORS.textDark};font-weight:600;text-align:center;margin:0 0 18px;">${esc(p.insightTitle)}</h3>` : ""}
          <blockquote style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:22px;line-height:1.4;color:${COLORS.textDark};border-left:3px solid ${COLORS.orange};padding:8px 0 8px 20px;margin:0 0 24px;">"${esc(p.insightPullQuote)}"</blockquote>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${COLORS.textDark};margin:0 0 16px;">${esc(p.insightBody)}</p>
          <p style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;color:${COLORS.textMuted};margin:0;">— The Vendibook Team</p>
        </td></tr>

        <!-- TALK TO SOMEONE -->
        <tr><td style="background:#fff;padding:8px 32px 48px;text-align:center;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};text-transform:uppercase;padding:24px 0 8px;">WE'RE HERE</div>
          <div style="height:1px;background:${COLORS.divider};margin:0 auto 24px;width:60px;"></div>
          <h3 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${COLORS.textDark};font-weight:600;margin:0 0 14px;">Have questions about buying, selling, or renting?</h3>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.textMuted};line-height:1.6;margin:0 0 28px;max-width:480px;display:inline-block;">Whether you're exploring for the first time or ready to make a move — our team is available. No pressure, no scripts. Just a real conversation.</p>
          <div style="margin-top:8px;">
            ${pillButton("Book a Call", `${p.baseUrl}/contact?intent=call${SOURCE.slice(1)}`)}
            <span style="display:inline-block;width:10px;"></span>
            ${pillButton("Send a Message", `${p.baseUrl}/contact${SOURCE.slice(1)}`, { ghost: true })}
          </div>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:12px;color:${COLORS.textMuted};margin:18px 0 0;">Support hours: Mon–Fri, 9am–5pm AZ</p>
        </td></tr>

        <!-- FEEDBACK -->
        <tr><td style="background:${COLORS.bgWarm};padding:32px 24px;text-align:center;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:${COLORS.textMuted};text-transform:uppercase;padding-bottom:14px;">HOW WAS THIS EDITION?</div>
          <div>
            ${feedbackPill("👍 Helpful", "helpful", p)}
            ${feedbackPill("😐 It was okay", "okay", p)}
            ${feedbackPill("👎 Not for me", "not_for_me", p)}
          </div>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;color:${COLORS.textMuted};margin:18px 0 0;">Your feedback helps us make The Vendibook Report better.</p>
        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#fff;padding:36px 32px;text-align:center;border-top:1px solid ${COLORS.divider};">
          <img src="${esc(p.logoDarkUrl)}" alt="Vendibook" width="100" style="display:inline-block;max-width:100px;height:auto;margin-bottom:16px;" />
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:12px;color:${COLORS.textMuted};line-height:1.6;margin:0 0 14px;">The Vendibook Report is sent twice weekly to all registered Vendibook users.</p>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;color:${COLORS.textMuted};margin:0 0 14px;">
            <a href="${esc(p.unsubscribeUrl)}" style="color:${COLORS.textMuted};text-decoration:underline;">Unsubscribe</a> ·
            <a href="${esc(p.baseUrl)}/privacy" style="color:${COLORS.textMuted};text-decoration:underline;">Privacy Policy</a> ·
            <a href="${esc(p.baseUrl)}/referral/terms" style="color:${COLORS.textMuted};text-decoration:underline;">Referral Terms</a> ·
            <a href="${esc(p.baseUrl)}/help" style="color:${COLORS.textMuted};text-decoration:underline;">Help Center</a> ·
            <a href="mailto:support@vendibook.com" style="color:${COLORS.textMuted};text-decoration:underline;">support@vendibook.com</a>
          </p>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;color:${COLORS.textMuted};margin:0 0 6px;">${esc(p.mailingAddress)}</p>
          <p style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,Helvetica,sans-serif;font-size:11px;color:${COLORS.textMuted};margin:0;">© ${new Date().getFullYear()} Vendibook. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const DEFAULT_TOOLS: ToolHighlight[] = [
  { label: "Buyer Financing", description: "Equipment financing through Equinox Funding on for-sale listings.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
  { label: "Secure Payments", description: "Card and PayPal payments processed securely through PayPal.", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { label: "Support That Answers", description: "Real people, Mon–Fri 9am–5pm AZ.", icon: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 1v3 M10 1v3 M14 1v3" },
  { label: "Instant Booking", description: "Reserve a kitchen or space in minutes.", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { label: "Seller Dashboard", description: "Track inquiries, views, and offers in one place.", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { label: "Verified Seller Badge", description: "Sellers can verify identity with Plaid.", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
];

export const INSIGHT_THEMES = [
  "Where we're seeing the most bookings right now",
  "What buyers are searching for most this month",
  "Tips for first-time food truck buyers",
  "How to price your shared kitchen for maximum bookings",
  "What makes a listing get more inquiries",
  "Trends in mobile food businesses",
];
