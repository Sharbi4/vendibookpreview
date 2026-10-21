import { MK, FONT, esc, mkButton, marketingShell, SITE_URL, mailingAddress } from './brand.ts';

export const WALKTHROUGH_CAMPAIGN_ID = '2026-10-activate-video-walkthroughs';
export const WALKTHROUGH_SUBJECT = 'Let them see your listing. Live.';
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
<tr><td style="padding:26px 28px 22px;">
  <p style="${small}font-weight:700;letter-spacing:2px;color:${MK.orangeOnWhite};text-transform:uppercase;margin-bottom:12px;">A closer look. A real conversation.</p>
  <h1 style="font-family:${FONT};font-size:36px;line-height:1.15;letter-spacing:-1px;color:${MK.text};margin:0 0 18px;">Let them see your listing.<br/>Live.</h1>
  <p style="${p}">${d.firstName ? `Hi ${esc(d.firstName)}, ` : ''}Your photos start the conversation. A live walkthrough lets someone see the details, ask questions, and picture their business in your space.</p>
  ${mkButton('Activate video walkthroughs', WALKTHROUGH_SETUP)}
</td></tr>
<tr><td><a href="${esc(WALKTHROUGH_SETUP)}"><img src="${WALKTHROUGH_HERO}" alt="Activate walkthroughs: a host shows a food truck kitchen to a buyer on a phone video call" width="600" height="400" border="0" style="display:block;width:100%;max-width:600px;height:auto;border:0;" /></a></td></tr>
<tr><td style="padding:7px 28px 0;"><p style="${small}">Illustrative video call.</p></td></tr>
<tr><td style="padding:26px 28px 12px;">
  <h2 style="font-family:${FONT};font-size:24px;line-height:1.3;color:${MK.text};margin:0 0 14px;">Your listing. Your available hours.</h2>
  <p style="${p}">For sale or for rent, give people a way to meet you and see what you’re offering before they travel. You control your available times, meeting length, advance notice and blocked dates.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps.map(([title, body], i) => `<tr><td width="36" valign="top" style="padding:12px 12px 18px 0;font-family:${FONT};font-size:20px;font-weight:700;color:${MK.orangeOnWhite};">0${i + 1}</td><td style="padding:12px 0 18px;border-bottom:1px solid ${MK.border};"><h3 style="font-family:${FONT};font-size:17px;line-height:1.4;color:${MK.text};margin:0 0 6px;">${title}</h3><p style="${p}margin:0;">${body}</p></td></tr>`).join('')}</table>
</td></tr>
<tr><td style="padding:12px 28px 28px;">
  ${mkButton('Set my walkthrough hours', WALKTHROUGH_SETUP)}
  <p style="${small}margin-top:18px;">Walkthroughs are recorded, with consent requested before joining. A video walkthrough helps people learn about a listing; it does not replace an in-person inspection or the separate purchase or rental agreement.</p>
</td></tr>
<tr><td bgcolor="${MK.surfaceMuted}" style="background-color:${MK.surfaceMuted};padding:28px;">
  <p style="${small}font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:10px;">Also on Vendibook</p>
  <h2 style="font-family:${FONT};font-size:23px;line-height:1.3;color:${MK.text};margin:0 0 12px;">See the buying journey.</h2>
  <p style="${p}">Selling? Watch our short overview of what happens after a purchase, from invoice to handoff.</p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><a href="${WALKTHROUGH_SHORT}"><img src="https://i.ytimg.com/vi/CuMMcINEezs/oardefault.jpg" alt="Watch the Vendibook YouTube Short about the buying journey" width="225" height="400" border="0" style="display:block;width:225px;max-width:100%;height:auto;border:0;border-radius:14px;" /></a></td></tr></table>
  <p style="text-align:center;${p}margin:18px 0 0;"><a href="${WALKTHROUGH_SHORT}" style="color:${MK.orangeOnWhite};font-weight:700;text-decoration:underline;">▶ Watch the Short on YouTube</a></p>
</td></tr>
<tr><td style="padding:26px 28px;"><p style="${p}margin:0;">Questions about getting set up? Reply to this email. We’re happy to help.<br/><br/><strong>The Vendibook team</strong></p></td></tr>`;
  return marketingShell({ title: WALKTHROUGH_SUBJECT, preheader: WALKTHROUGH_PREHEADER, bodyRows, unsubscribeUrl: d.unsubscribeUrl, footerNote: 'You’re receiving this product update because you have an active listing on Vendibook.' });
}

export function buildWalkthroughCampaignText(d: WalkthroughCampaignData): string {
  return `${d.firstName ? `Hi ${d.firstName},\n\n` : ''}Let them see your listing. Live.

Turn on video walkthroughs and let buyers and renters book a time with you. Show your layout, equipment and condition, answer questions, and help people decide whether it fits their business before they travel.

1. Open Dashboard → Account → Scheduling. Turn on video walkthroughs, choose your timezone, add your available days and hours, and save.
2. People book an available time from your published listings. You receive the booking by email and in your dashboard, including Messages → Walkthrough requests.
3. Open the walkthrough at the scheduled time on your phone or computer and show it live.

Activate video walkthroughs: ${WALKTHROUGH_SETUP}

You control your available hours, meeting length, advance notice and blocked dates. Walkthroughs are recorded, with consent requested before joining. They do not replace an in-person inspection or a separate purchase or rental agreement.

Selling? Watch our Short about what happens after a purchase, from invoice to handoff: ${WALKTHROUGH_SHORT}

Questions? Reply to this email.
The Vendibook team

${mailingAddress()}
You’re receiving this product update because you have an active listing on Vendibook.
Unsubscribe: ${d.unsubscribeUrl}`;
}
