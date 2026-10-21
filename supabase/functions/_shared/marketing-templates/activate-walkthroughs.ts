import { MK, FONT, esc, mkButton, marketingShell, SITE_URL, mailingAddress } from './brand.ts';

export const WALKTHROUGH_CAMPAIGN_ID = '2026-10-activate-video-walkthroughs';
export const WALKTHROUGH_SUBJECT = 'Activate live walkthroughs on your listing.';
export const WALKTHROUGH_PREHEADER = 'Turn on video walkthroughs and let buyers and renters book a time with you.';
export const WALKTHROUGH_HERO = `${SITE_URL}/images/email/walkthrough-phone-2026-10.png`;
export const WALKTHROUGH_SHORT = 'https://www.youtube.com/shorts/CuMMcINEezs';
export const WALKTHROUGH_SETUP = `${SITE_URL}/dashboard/account/scheduling?utm_source=email&utm_medium=campaign&utm_campaign=${WALKTHROUGH_CAMPAIGN_ID}`;

export type WalkthroughCampaignData = { firstName?: string | null; unsubscribeUrl: string };

export function buildWalkthroughCampaignHtml(d: WalkthroughCampaignData): string {
  const p = `font-family:${FONT};font-size:16px;line-height:1.65;color:${MK.textSecondary};margin:0 0 18px;`;
  const small = `font-family:${FONT};font-size:12px;line-height:1.6;color:${MK.textMuted};margin:0;`;
  const steps = [
    ['Set your hours', 'Open Dashboard → Account → Scheduling. Turn on video walkthroughs, choose your timezone, and add the days and times you’re available. Save your settings.'],
    ['Let them book', 'Interested buyers and renters can choose an available time from your published listings. You receive the booking by email and in your dashboard, including Messages → Walkthrough requests.'],
    ['Show it live', 'Open the walkthrough at the scheduled time on a phone or computer. Show the layout, equipment and condition, answer questions, and help them decide whether it fits their business.'],
  ];
  const bodyRows = `
<tr><td style="padding:32px 32px 28px;">
  <p style="${small}border-top:1px solid ${MK.border};padding-top:20px;font-weight:600;letter-spacing:1.8px;color:${MK.orangeOnWhite};text-transform:uppercase;margin-bottom:22px;">Listing tools &nbsp; / &nbsp; Live walkthroughs</p>
  <h1 style="font-family:${FONT};font-size:34px;font-weight:600;line-height:1.22;letter-spacing:-0.8px;color:${MK.text};margin:0 0 22px;">Activate live walkthroughs<br/>on your listing.</h1>
  <p style="${p}">${d.firstName ? `Hi ${esc(d.firstName)}, ` : ''}Enable live video walkthroughs so buyers and renters can schedule a time to view your listing with you. Show the space, answer questions, and help them decide if it fits their business.</p>
  ${mkButton('Activate live walkthroughs', WALKTHROUGH_SETUP)}
</td></tr>
<tr><td style="padding:0 20px;"><a href="${esc(WALKTHROUGH_SETUP)}"><img src="${WALKTHROUGH_HERO}" alt="Activate walkthroughs: a host shows a food truck kitchen to a buyer on a phone video call" width="560" border="0" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:12px;" /></a></td></tr>
<tr><td style="padding:10px 32px 4px;"><p style="${small}">A closer look before the visit. &nbsp;·&nbsp; Illustrative video call.</p></td></tr>
<tr><td style="padding:32px 32px 12px;">
  <p style="${small}font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:${MK.orangeOnWhite};margin-bottom:10px;">Getting started</p>
  <h2 style="font-family:${FONT};font-size:25px;font-weight:600;line-height:1.3;letter-spacing:-0.4px;color:${MK.text};margin:0 0 18px;">Your listing. Your schedule.</h2>
  <p style="${p}">For sale or for rent, give people a way to meet you and see what you’re offering before they travel. You control your available times, meeting length, advance notice and blocked dates.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps.map(([title, body], i) => `<tr><td width="38" valign="top" style="padding:22px 14px 22px 0;border-top:1px solid ${MK.border};font-family:${FONT};font-size:13px;line-height:26px;font-weight:600;color:${MK.orangeOnWhite};">0${i + 1}</td><td style="padding:22px 0;border-top:1px solid ${MK.border};"><h3 style="font-family:${FONT};font-size:17px;font-weight:600;line-height:1.5;color:${MK.text};margin:0 0 7px;">${title}</h3><p style="${p}font-size:14px;margin:0;">${body}</p></td></tr>`).join('')}</table>
</td></tr>
<tr><td style="padding:12px 32px 32px;">
  ${mkButton('Set my walkthrough hours', WALKTHROUGH_SETUP, { ghost: true })}
  <p style="${small}margin-top:18px;">Walkthroughs are recorded, with consent requested before joining. A video walkthrough helps people learn about a listing; it does not replace an in-person inspection or the separate purchase or rental agreement.</p>
</td></tr>
<tr><td style="padding:0 20px 28px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${MK.surfaceMuted}" style="background:${MK.surfaceMuted};border:1px solid ${MK.border};border-radius:12px;"><tr>
    <td width="100" valign="top" style="padding:24px 0 24px 20px;"><a href="${WALKTHROUGH_SHORT}"><img src="https://i.ytimg.com/vi/CuMMcINEezs/oardefault.jpg" alt="Watch the Vendibook buying journey Short" width="80" border="0" style="display:block;width:80px;height:auto;border:0;border-radius:8px;" /></a></td>
    <td valign="middle" style="padding:24px 20px 24px 16px;">
      <p style="${small}font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">The buying journey</p>
      <h2 style="font-family:${FONT};font-size:19px;font-weight:600;line-height:1.35;color:${MK.text};margin:0 0 10px;">From purchase to handoff.</h2>
      <p style="${p}font-size:13px;margin-bottom:12px;">Selling? See what happens after a purchase in our short overview.</p>
      <a href="${WALKTHROUGH_SHORT}" style="font-family:${FONT};font-size:13px;line-height:1.6;color:${MK.orangeOnWhite};font-weight:600;text-decoration:underline;">Watch on YouTube &#8599;</a>
    </td>
  </tr></table>
</td></tr><tr><td style="padding:26px 28px;"><p style="${p}margin:0;">Questions about getting set up? Reply to this email. We’re happy to help.<br/><br/><strong>The Vendibook team</strong></p></td></tr>`;
  return marketingShell({ title: WALKTHROUGH_SUBJECT, preheader: WALKTHROUGH_PREHEADER, bodyRows, unsubscribeUrl: d.unsubscribeUrl, footerNote: 'You’re receiving this product update because you have an active listing on Vendibook.' });
}

export function buildWalkthroughCampaignText(d: WalkthroughCampaignData): string {
  return `${d.firstName ? `Hi ${d.firstName},\n\n` : ''}Activate live walkthroughs on your listing.

Turn on video walkthroughs and let buyers and renters book a time with you. Show your layout, equipment and condition, answer questions, and help people decide whether it fits their business before they travel.

1. Open Dashboard → Account → Scheduling. Turn on video walkthroughs, choose your timezone, add your available days and hours, and save.
2. People book an available time from your published listings. You receive the booking by email and in your dashboard, including Messages → Walkthrough requests.
3. Open the walkthrough at the scheduled time on your phone or computer and show it live.

Activate live walkthroughs: ${WALKTHROUGH_SETUP}

You control your available hours, meeting length, advance notice and blocked dates. Walkthroughs are recorded, with consent requested before joining. They do not replace an in-person inspection or a separate purchase or rental agreement.

Selling? Watch our Short about what happens after a purchase, from invoice to handoff: ${WALKTHROUGH_SHORT}

Questions? Reply to this email.
The Vendibook team

${mailingAddress()}
You’re receiving this product update because you have an active listing on Vendibook.
Unsubscribe: ${d.unsubscribeUrl}`;
}
